// Regression tests for "sounds stop after round 4-5".
//
// A full workout is simulated end to end: the real timer engine produces
// snapshots, the real cue tracker turns them into sound requests, and the real
// audio engine plays them on a fake AudioContext that behaves like WebKit /
// Android WebView: it can be suspended or interrupted by the OS, `onended`
// does not fire while suspended, and `resume()` without a user gesture can
// fail or never settle.

import assert from 'node:assert/strict'
import test from 'node:test'
import { createWorkoutEngine } from '../workoutEngine.js'
import { createWorkoutAudioEngine, STALE_CUE_MS } from './audioEngine.js'
import { SOUND_IDS } from './soundBank.js'
import { createCueTracker } from './workoutCues.js'

// ---------------------------------------------------------------- fake audio

class FakeNode {
  constructor(ctx, kind) {
    this.ctx = ctx
    this.kind = kind
    this.outputs = new Set()
    ctx.nodes.add(this)
  }
  connect(node) {
    this.outputs.add(node)
    return node
  }
  disconnect() {
    this.outputs.clear()
  }
}

class FakeParam {
  constructor(value = 0) {
    this.value = value
  }
}

class FakeSource extends FakeNode {
  constructor(ctx) {
    super(ctx, 'source')
    this.buffer = null
    this.onended = null
    this.started = false
    this.stopped = false
  }
  start() {
    if (this.started) throw new Error('InvalidStateError: start called twice')
    this.started = true
    this.endsAt = this.ctx.clock.now + this.buffer.duration * 1000
    this.ctx.playing.add(this)
    this.ctx.startLog.push({ at: this.ctx.clock.now, state: this.ctx.state, id: this.buffer.id })
  }
  stop() {
    this.stopped = true
    this.ctx.playing.delete(this)
  }
}

class FakeAudioContext {
  constructor(clock, { resumeBehaviour = 'ok' } = {}) {
    this.clock = clock
    this.state = 'running'
    this.resumeBehaviour = resumeBehaviour // 'ok' | 'reject' | 'hang'
    this.listeners = []
    this.nodes = new Set()
    this.playing = new Set()
    this.startLog = []
    this.destination = new FakeNode(this, 'destination')
    clock.contexts.push(this)
  }
  addEventListener(type, fn) {
    if (type === 'statechange') this.listeners.push(fn)
  }
  setState(state) {
    this.state = state
    for (const fn of this.listeners) fn()
  }
  resume() {
    if (this.state === 'closed') return Promise.reject(new Error('closed'))
    if (this.clock.gesture || this.resumeBehaviour === 'ok') {
      this.setState('running')
      return Promise.resolve()
    }
    if (this.resumeBehaviour === 'hang') return new Promise(() => {})
    return Promise.reject(new Error('NotAllowedError: needs a user gesture'))
  }
  close() {
    this.setState('closed')
    return Promise.resolve()
  }
  createBuffer(channels, length, sampleRate) {
    const data = new Float32Array(length)
    return { duration: length / sampleRate, getChannelData: () => data }
  }
  createBufferSource() {
    return new FakeSource(this)
  }
  createGain() {
    const node = new FakeNode(this, 'gain')
    node.gain = new FakeParam(1)
    return node
  }
  createDynamicsCompressor() {
    const node = new FakeNode(this, 'compressor')
    for (const k of ['threshold', 'knee', 'ratio', 'attack', 'release']) node[k] = new FakeParam()
    return node
  }
  decodeAudioData() {
    return Promise.resolve(this.createBuffer(1, 22050, 44100))
  }
  // Fire onended for finished sounds — only while running, like browsers.
  advance() {
    if (this.state !== 'running') return
    for (const src of [...this.playing]) {
      if (this.clock.now >= src.endsAt) {
        this.playing.delete(src)
        src.onended?.()
      }
    }
  }
  liveVoiceGains(limiter) {
    let count = 0
    for (const n of this.nodes) if (n.kind === 'gain' && n.outputs.has(limiter)) count += 1
    return count
  }
}

function makeClock() {
  return { now: 1_000_000, gesture: false, contexts: [] }
}

const flush = async () => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve()
}

function makeAudio(clock, contextOptions) {
  const engine = createWorkoutAudioEngine({
    createContext: () => new FakeAudioContext(clock, contextOptions),
    loadWarningBuffer: async (ctx) => ctx.createBuffer(1, 22050, 44100),
    now: () => clock.now,
  })
  // Tag buffers with their sound id so the start log is readable.
  const prime = engine.primeBuffers.bind(engine)
  engine.primeBuffers = async () => {
    await prime()
    for (const [id, buffer] of engine.buffers) buffer.id = id
  }
  return engine
}

async function tap(clock, audio) {
  clock.gesture = true
  const result = audio.handleUserGesture()
  clock.gesture = false
  await result
  await flush()
}

// Runs a workout through timer -> cues -> audio. `events` lets a test break
// audio (OS suspension) or tap the screen at given workout times.
async function simulate({ rounds, roundDurationSec = 30, restDurationSec = 30, contextOptions, events = [] }) {
  const clock = makeClock()
  const audio = makeAudio(clock, contextOptions)
  await tap(clock, audio) // START WORKOUT tap

  const timer = createWorkoutEngine({ rounds, roundDurationSec, restDurationSec }, clock.now)
  const tracker = createCueTracker()
  const requested = []
  const start = clock.now
  const pending = [...events].sort((a, b) => a.at - b.at)

  for (let guard = 0; guard < 1_000_000; guard += 1) {
    while (pending.length && clock.now - start >= pending[0].at) {
      await pending.shift().run({ clock, audio, timer })
    }
    const snap = timer.tick(clock.now)
    for (const cue of tracker.next(snap)) {
      if (cue.exclusive) audio.stopAll()
      requested.push({ ...cue, at: clock.now - start, round: snap.round, phase: snap.phase })
      audio.play(cue.id, { key: cue.key })
    }
    await flush()
    for (const ctx of clock.contexts) ctx.advance()
    if (snap.status === 'complete') break
    clock.now += 50
  }
  // let the final sound finish
  clock.now += 5_000
  for (const ctx of clock.contexts) ctx.advance()
  await flush()
  const started = clock.contexts.flatMap((ctx) => ctx.startLog)
  return { clock, audio, requested, started }
}

function expectedCueCount({ rounds, roundDurationSec = 30, restDurationSec = 30 }) {
  const ticks = (sec) => Math.min(5, sec) + (sec > 10 ? 1 : 0) // 5..1 + 10s warning
  const intro = 4 // 3, 2, 1, GO
  const work = rounds * ticks(roundDurationSec)
  const transitions = (rounds - 1) * (1 + (restDurationSec > 0 ? ticks(restDurationSec) + 1 : 0))
  return intro + work + transitions + 1 // + workout complete
}

// ------------------------------------------------------------------- tests

for (const rounds of [1, 5, 10]) {
  test(`${rounds} round(s): every cue plays, nothing dropped, no node leak`, async () => {
    const { audio, requested, started, clock } = await simulate({ rounds })
    assert.equal(requested.length, expectedCueCount({ rounds }))
    assert.equal(started.length, requested.length, 'every requested cue started a sound')
    assert.ok(started.every((s) => s.state === 'running'))
    assert.equal(audio.stats.dropped, 0)
    assert.equal(audio.stats.stale, 0)
    const [ctx] = clock.contexts
    assert.ok(ctx.liveVoiceGains(audio.limiter) <= 1, 'finished voices are disconnected')
    assert.equal(clock.contexts.length, 1, 'one AudioContext for the whole workout')
    // The last round still gets its countdown and the completion sound.
    const last = requested.filter((c) => c.round === rounds && c.phase === 'work').map((c) => c.id)
    assert.deepEqual(last, [SOUND_IDS.WARN, ...Array(5).fill(SOUND_IDS.TICK)])
    assert.equal(requested.at(-1).id, SOUND_IDS.COMPLETE)
  })
}

test('cues land on the right second of each round (rounds 1, 5 and 10)', async () => {
  const rounds = 10
  const { requested } = await simulate({ rounds })
  for (const round of [1, 5, 10]) {
    const endKey = round === rounds ? 'workout-complete' : `work-end-${round}`
    const end = requested.find((c) => c.key === endKey).at
    const work = requested.filter((c) => c.round === round && c.phase === 'work')
    // WARN at 10s left, then ticks at 5, 4, 3, 2, 1s left; the bell at 0.
    const secondsLeft = work.map((c) => Math.round((end - c.at) / 1000))
    assert.deepEqual(secondsLeft, [10, 5, 4, 3, 2, 1], `round ${round}`)
    for (const c of work) {
      const exact = (end - c.at) / 1000
      assert.ok(Math.abs(exact - Math.round(exact)) <= 0.05, `round ${round} cue within one frame`)
    }
  }
})

test('OS suspends audio in round 4 (screen lock / call): user is told, a tap restores rounds 5-10', async () => {
  let needsGestureSeen = false
  const breakAt = 4.2 * 61_000 // inside round 4
  const { audio, requested, started } = await simulate({
    rounds: 10,
    contextOptions: { resumeBehaviour: 'reject' },
    events: [
      { at: breakAt, run: ({ clock }) => clock.contexts.at(-1).setState('interrupted') },
      {
        at: breakAt + 20_000,
        run: ({ audio }) => {
          needsGestureSeen = audio.status().needsGesture
        },
      },
      { at: breakAt + 25_000, run: ({ clock, audio }) => tap(clock, audio) },
    ],
  })
  assert.equal(needsGestureSeen, true, 'UI is asked to show "tap to turn sound back on"')
  assert.equal(audio.status().needsGesture, false)
  assert.ok(audio.stats.rebuilt >= 1, 'interrupted context is rebuilt from the tap')
  const afterTap = requested.filter((c) => c.at > breakAt + 25_000)
  const startedAfter = started.filter((s) => s.state === 'running').length
  assert.ok(afterTap.length > 40)
  // Every cue after the tap (rounds 5-10) actually starts a sound.
  const lateRequests = requested.filter((c) => c.round >= 5)
  const lateStarts = started.slice(-lateRequests.length)
  assert.equal(lateStarts.length, lateRequests.length)
  assert.ok(startedAfter > 0)
})

test('resume() that never settles (iOS without a gesture) does not block later recovery', async () => {
  const clock = makeClock()
  const audio = makeAudio(clock, { resumeBehaviour: 'hang' })
  await tap(clock, audio)
  clock.contexts[0].setState('suspended')
  audio.play(SOUND_IDS.TICK, { key: 'a' }) // starts a resume() that hangs forever
  await flush()
  assert.equal(clock.contexts[0].startLog.length, 0)
  clock.now += STALE_CUE_MS + 300 // the user notices a moment later and taps
  await tap(clock, audio)
  clock.now += 200
  audio.play(SOUND_IDS.TICK, { key: 'b' })
  assert.equal(clock.contexts.at(-1).state, 'running')
  assert.equal(clock.contexts.at(-1).startLog.length, 1)
})

test('a sound cut off by suspension cannot block lower-priority cues forever', async () => {
  const clock = makeClock()
  const audio = makeAudio(clock)
  await tap(clock, audio)
  audio.play(SOUND_IDS.BELL, { key: 'bell' })
  // Context suspends mid-bell: onended will never fire for it.
  const ctx = clock.contexts[0]
  ctx.state = 'suspended' // silent change (no statechange), the worst case
  ctx.state = 'running'
  clock.now += 3_000
  assert.equal(audio.play(SOUND_IDS.TICK, { key: 't1' }), true, 'expired voice slot is released')
  assert.equal(audio.stats.dropped, 0)
})

test('cues requested while audio is locked do not burst out later', async () => {
  const clock = makeClock()
  const audio = makeAudio(clock, { resumeBehaviour: 'reject' })
  await tap(clock, audio)
  clock.contexts[0].setState('interrupted')
  await flush()
  for (let i = 0; i < 5; i += 1) {
    audio.play(SOUND_IDS.TICK, { key: `t${i}` })
    clock.now += 1_000
    await flush()
  }
  clock.now += STALE_CUE_MS + 100
  await tap(clock, audio)
  const ctx = clock.contexts.at(-1)
  assert.equal(ctx.startLog.length, 0, 'stale countdown ticks are not replayed after recovery')
})

test('pause and resume never disable audio', async () => {
  const { started, requested } = await simulate({
    rounds: 5,
    events: [
      { at: 70_000, run: ({ clock, timer }) => timer.pause(clock.now) },
      { at: 190_000, run: ({ clock, timer, audio }) => (timer.resume(clock.now), tap(clock, audio)) },
    ],
  })
  assert.equal(started.length, requested.length)
  assert.equal(requested.at(-1).id, SOUND_IDS.COMPLETE)
})

test('sound off: nothing plays; turning it back on resumes the next cue', async () => {
  const clock = makeClock()
  const audio = makeAudio(clock)
  await tap(clock, audio)
  audio.setEnabled(false)
  assert.equal(audio.play(SOUND_IDS.TICK, { key: 'x' }), false)
  audio.setEnabled(true)
  clock.now += 200
  assert.equal(audio.play(SOUND_IDS.TICK, { key: 'y' }), true)
})

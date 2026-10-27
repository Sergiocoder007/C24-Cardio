import assert from 'node:assert/strict'
import test from 'node:test'
import { ANNOUNCE_MS, INTRO_MS, createWorkoutEngine } from './workoutEngine.js'

const T0 = 1_000_000

function expectedEndMs({ rounds, roundDurationSec, restDurationSec }) {
  const transition = restDurationSec > 0 ? restDurationSec * 1000 + ANNOUNCE_MS : ANNOUNCE_MS
  return INTRO_MS + rounds * roundDurationSec * 1000 + (rounds - 1) * transition
}

// Steps the engine like the app's 60fps loop and records every phase change.
function run(config, { stepMs = 16, pauses = [] } = {}) {
  const engine = createWorkoutEngine(config, T0)
  const log = []
  let last = ''
  let now = T0
  const limit = T0 + expectedEndMs(config) + 60_000
  while (now < limit) {
    for (const p of pauses) {
      if (now - T0 === p.at) engine.pause(now)
      if (now - T0 === p.at + p.ms) engine.resume(now)
    }
    const s = engine.tick(now)
    const tag = `${s.phase}:${s.round}`
    if (tag !== last) {
      log.push({ tag, at: now - T0 })
      last = tag
    }
    if (s.status === 'complete') return { engine, log, snapshot: s, endedAt: engine.state.completedAt - T0 }
    now += stepMs
  }
  throw new Error('workout never completed')
}

for (const rounds of [1, 5, 10]) {
  test(`${rounds} round(s) with rest: correct phases, round count and total time`, () => {
    const config = { rounds, roundDurationSec: 30, restDurationSec: 30 }
    const { log, snapshot, endedAt } = run(config)
    const works = log.filter((e) => e.tag.startsWith('work:'))
    const rests = log.filter((e) => e.tag.startsWith('rest:'))
    assert.deepEqual(works.map((e) => e.tag), Array.from({ length: rounds }, (_, i) => `work:${i + 1}`))
    assert.equal(rests.length, rounds - 1)
    assert.equal(snapshot.status, 'complete')
    assert.equal(snapshot.progress, 1)
    // completion is stamped on the exact scheduled boundary: no drift
    assert.equal(endedAt, expectedEndMs(config))
  })
}

test('no-rest workouts go straight work -> next round announce -> work', () => {
  const { log } = run({ rounds: 3, roundDurationSec: 5, restDurationSec: 0 })
  assert.deepEqual(
    log.map((e) => e.tag),
    ['intro:1', 'work:1', 'announce:2', 'work:2', 'announce:3', 'work:3', 'complete:3'],
  )
})

test('a long pause shifts the end time by exactly the paused duration', () => {
  const config = { rounds: 2, roundDurationSec: 30, restDurationSec: 30 }
  const pauses = [{ at: 10_000, ms: 45_000 }]
  const { endedAt } = run(config, { stepMs: 50, pauses })
  assert.equal(endedAt, expectedEndMs(config) + 45_000)
})

test('pause freezes the clock; resume continues from the same remaining time', () => {
  const engine = createWorkoutEngine({ rounds: 1, roundDurationSec: 60, restDurationSec: 0 }, T0)
  const start = T0 + INTRO_MS
  engine.tick(start + 20_000)
  engine.pause(start + 20_000)
  const frozen = engine.snapshot(start + 300_000)
  assert.equal(frozen.remainingMs, 40_000)
  assert.equal(frozen.paused, true)
  engine.resume(start + 300_000)
  assert.equal(engine.snapshot(start + 310_000).remainingMs, 30_000)
})

test('stop dialog: keep going resumes, end workout stops without completing', () => {
  const engine = createWorkoutEngine({ rounds: 3, roundDurationSec: 30, restDurationSec: 0 }, T0)
  const t = T0 + INTRO_MS + 5_000
  engine.tick(t)
  assert.equal(engine.requestStop(t), true)
  assert.equal(engine.snapshot(t + 9_000).confirmStop, true)
  assert.equal(engine.snapshot(t + 9_000).remainingMs, 25_000)
  assert.equal(engine.resume(t), false, 'resume is blocked while the dialog is open')
  engine.cancelStop(t + 9_000)
  assert.equal(engine.snapshot(t + 10_000).remainingMs, 24_000)
  engine.requestStop(t + 10_000)
  engine.confirmEnd()
  assert.equal(engine.state.status, 'stopped')
  assert.equal(engine.state.completedAt, null)
})

test('returning from background replays missed phases without drift', () => {
  const config = { rounds: 4, roundDurationSec: 30, restDurationSec: 30 }
  const engine = createWorkoutEngine(config, T0)
  engine.tick(T0 + 1_000)
  // App suspended for 2.5 minutes, then one tick on return.
  const s = engine.tick(T0 + 1_000 + 150_000)
  const elapsed = 151_000 - INTRO_MS // 147.75s after GO
  // work 30 | rest 30 + announce 0.9 => 60.9s per cycle; 2 cycles = 121.8s
  assert.equal(s.phase, 'work')
  assert.equal(s.round, 3)
  assert.equal(s.remainingMs, 30_000 - Math.round(elapsed - 121_800))
})

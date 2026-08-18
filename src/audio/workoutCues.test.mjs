import assert from 'node:assert/strict'
import test from 'node:test'
import { SAMPLE_RATE, SOUND_BANK, SOUND_IDS } from './soundBank.js'
import { WARNING_TONE_DURATION_SEC } from './warningToneAsset.js'
import { liveClockCue, resolveWorkoutCues } from './workoutCues.js'

function base(overrides = {}) {
  return {
    status: 'running',
    phase: 'work',
    round: 1,
    remainingMs: 60000,
    elapsedMs: 0,
    paused: false,
    display: null,
    confirmStop: false,
    sawRunning: true,
    ...overrides,
  }
}

function ids(cues) {
  return cues.map((cue) => cue.id)
}

function walkPhase(phase, durationMs, round = 1) {
  const played = []
  let prev = base({
    phase,
    round,
    remainingMs: durationMs + 50,
    elapsedMs: 0,
  })
  for (let remainingMs = durationMs; remainingMs >= 0; remainingMs -= 50) {
    const next = base({
      phase,
      round,
      remainingMs,
      elapsedMs: durationMs - remainingMs,
    })
    played.push(...resolveWorkoutCues(prev, next))
    prev = next
  }
  return played
}

test('60s work is warning tone, five ticks, then no extra sound at 0 while still in work', () => {
  const played = walkPhase('work', 60000)
  assert.deepEqual(
    played.map((cue) => `${cue.id}:${cue.key}`),
    [
      'warn:work-1-warn',
      'tick:work-1-5',
      'tick:work-1-4',
      'tick:work-1-3',
      'tick:work-1-2',
      'tick:work-1-1',
    ],
  )
})

test('30s rest uses the same warning then five ticks pattern', () => {
  const played = walkPhase('rest', 30000)
  assert.deepEqual(
    played.map((cue) => `${cue.id}:${cue.key}`),
    [
      'warn:rest-1-warn',
      'tick:rest-1-5',
      'tick:rest-1-4',
      'tick:rest-1-3',
      'tick:rest-1-2',
      'tick:rest-1-1',
    ],
  )
})

test('work 0 plays one big beep, not a tick, and rest start is silent', () => {
  const end = resolveWorkoutCues(
    base({ phase: 'work', remainingMs: 40, elapsedMs: 59960 }),
    base({ phase: 'rest', remainingMs: 30000, elapsedMs: 20 }),
  )
  assert.deepEqual(ids(end), [SOUND_IDS.BELL])
  assert.equal(end[0].key, 'work-end-1')
  assert.equal(end[0].exclusive, true)
})

test('rest 0 plays one next-round beep and does not also start-bell the next work', () => {
  const restEnd = resolveWorkoutCues(
    base({ phase: 'rest', remainingMs: 30, elapsedMs: 29970 }),
    base({ phase: 'announce', round: 2, remainingMs: 900, elapsedMs: 10 }),
  )
  assert.deepEqual(ids(restEnd), [SOUND_IDS.BELL])
  assert.equal(restEnd[0].key, 'rest-end-1')

  const nextWork = resolveWorkoutCues(
    base({ phase: 'announce', round: 2, remainingMs: 20, elapsedMs: 880 }),
    base({ phase: 'work', round: 2, remainingMs: 60000, elapsedMs: 10 }),
  )
  assert.deepEqual(nextWork, [])
})

test('rest of 8 seconds skips 10s warning and only ticks 5-1', () => {
  const played = walkPhase('rest', 8000)
  assert.deepEqual(
    played.map((cue) => cue.key),
    ['rest-1-5', 'rest-1-4', 'rest-1-3', 'rest-1-2', 'rest-1-1'],
  )
})

test('rest of 3 seconds after the work-end beep only ticks 2 then 1', () => {
  const start = resolveWorkoutCues(
    base({ phase: 'work', remainingMs: 20, elapsedMs: 59980 }),
    base({ phase: 'rest', remainingMs: 3000, elapsedMs: 10 }),
  )
  assert.deepEqual(ids(start), [SOUND_IDS.BELL])

  const played = []
  let prev = base({ phase: 'rest', remainingMs: 3000, elapsedMs: 10 })
  for (let remainingMs = 3000; remainingMs >= 0; remainingMs -= 50) {
    const next = base({ phase: 'rest', remainingMs, elapsedMs: 3010 - remainingMs })
    played.push(...resolveWorkoutCues(prev, next))
    prev = next
  }
  assert.deepEqual(
    played.map((cue) => cue.key),
    ['rest-1-2', 'rest-1-1'],
  )
})

test('final work 0 plays only workout complete', () => {
  const done = resolveWorkoutCues(
    base({ phase: 'work', remainingMs: 20, elapsedMs: 59980 }),
    base({ status: 'complete', phase: 'complete', remainingMs: 0, elapsedMs: 0 }),
  )
  assert.deepEqual(ids(done), [SOUND_IDS.COMPLETE])
  assert.deepEqual(
    resolveWorkoutCues(
      base({ status: 'complete', phase: 'complete' }),
      base({ status: 'complete', phase: 'complete' }),
    ),
    [],
  )
})

test('paused and catch-up do not burst missed cues', () => {
  assert.deepEqual(
    resolveWorkoutCues(base({ remainingMs: 4500, paused: true }), base({ remainingMs: 4500, paused: true })),
    [],
  )
  assert.deepEqual(
    resolveWorkoutCues(base({ remainingMs: 40000, elapsedMs: 20000 }), base({ remainingMs: 8000, elapsedMs: 52000 })),
    [],
  )
  assert.deepEqual(
    ids(resolveWorkoutCues(base({ remainingMs: 40000, elapsedMs: 20000 }), base({ remainingMs: 4200, elapsedMs: 55800 }))),
    [SOUND_IDS.TICK],
  )
})

test('intro is 3-2-1 ticks then a strong GO', () => {
  assert.deepEqual(ids(resolveWorkoutCues(base({ phase: 'intro', display: 'READY' }), base({ phase: 'intro', display: '3' }))), [SOUND_IDS.TICK])
  assert.deepEqual(ids(resolveWorkoutCues(base({ phase: 'intro', display: '1' }), base({ phase: 'intro', display: 'GO' }))), [SOUND_IDS.BELL])
})

test('sound lengths match warning / tick / long beep hierarchy', () => {
  const seconds = (id) => SOUND_BANK[id]().length / SAMPLE_RATE
  assert.ok(WARNING_TONE_DURATION_SEC >= 0.3)
  assert.ok(WARNING_TONE_DURATION_SEC <= 0.7)
  assert.ok(seconds(SOUND_IDS.TICK) < 0.2)
  assert.ok(seconds(SOUND_IDS.BELL) >= 1.1)
  assert.ok(seconds(SOUND_IDS.COMPLETE) > seconds(SOUND_IDS.BELL))
  assert.equal(liveClockCue(base({ remainingMs: 9500, elapsedMs: 50500 }))?.id, SOUND_IDS.WARN)
  assert.equal(liveClockCue(base({ remainingMs: 8200, elapsedMs: 51800 })), null)
  assert.equal(liveClockCue(base({ remainingMs: 4700, elapsedMs: 55300 }))?.mark, '5')
})

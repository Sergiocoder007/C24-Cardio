import assert from 'node:assert/strict'
import test from 'node:test'
import { createCueTracker } from './audio/workoutCues.js'
import { activeElapsedMs, buildCueSchedule, buildTimeline, nativePlan } from './workoutPlan.js'
import { createWorkoutEngine, INTRO_MS } from './workoutEngine.js'

const T0 = 5_000_000

// What the in-app engine actually plays, sampled every `step` ms.
function simulate(config, step = 10) {
  const engine = createWorkoutEngine(config, T0)
  const tracker = createCueTracker()
  const out = []
  for (let now = T0; ; now += step) {
    const snap = engine.tick(now)
    for (const cue of tracker.next(snap)) out.push({ at: now - T0, id: cue.id, key: cue.key })
    if (snap.status === 'complete') return out
  }
}

const configs = [
  { rounds: 1, roundDurationSec: 30, restDurationSec: 30 },
  { rounds: 5, roundDurationSec: 30, restDurationSec: 30 },
  { rounds: 10, roundDurationSec: 30, restDurationSec: 30 },
  { rounds: 3, roundDurationSec: 180, restDurationSec: 60 },
  { rounds: 4, roundDurationSec: 60, restDurationSec: 0 },
  { rounds: 3, roundDurationSec: 5, restDurationSec: 5 },
  { rounds: 2, roundDurationSec: 10, restDurationSec: 15 },
  { rounds: 2, roundDurationSec: 15, restDurationSec: 10 },
]

for (const config of configs) {
  const label = `${config.rounds}x${config.roundDurationSec}s rest ${config.restDurationSec}s`
  test(`plan matches the in-app engine exactly: ${label}`, () => {
    const played = simulate(config)
    const { cues } = buildCueSchedule(config)
    assert.deepEqual(cues.map((c) => c.key), played.map((c) => c.key), 'same cues in the same order')
    assert.deepEqual(cues.map((c) => c.id), played.map((c) => c.id), 'same sounds')
    for (let i = 0; i < cues.length; i += 1) {
      assert.ok(Math.abs(cues[i].at - played[i].at) <= 10, `${cues[i].key}: plan ${cues[i].at} vs engine ${played[i].at}`)
    }
  })
}

test('timeline totals match the engine completion time', () => {
  const config = { rounds: 10, roundDurationSec: 30, restDurationSec: 30 }
  const { totalMs, phases } = buildTimeline(config)
  const engine = createWorkoutEngine(config, T0)
  engine.tick(T0 + totalMs + 1)
  assert.equal(engine.state.completedAt - T0, totalMs)
  assert.equal(phases[0].durationMs, INTRO_MS)
  assert.equal(phases.filter((p) => p.phase === 'work').length, 10)
})

test('native payload is plain JSON with sound ids', () => {
  const plan = nativePlan({ rounds: 2, roundDurationSec: 30, restDurationSec: 30 })
  assert.deepEqual(JSON.parse(JSON.stringify(plan)), plan)
  assert.ok(plan.cues.every((c) => typeof c.at === 'number' && ['tick', 'warn', 'bell', 'complete'].includes(c.sound)))
  assert.equal(plan.cues.at(-1).sound, 'complete')
})

test('hand-off position: active elapsed time from a timer snapshot', () => {
  const config = { rounds: 3, roundDurationSec: 30, restDurationSec: 30 }
  const { phases } = buildTimeline(config)
  const engine = createWorkoutEngine(config, T0)
  // 50s in: intro 4.45s + work 30s, then 15.55s into rest of round 1
  assert.equal(activeElapsedMs(phases, engine.tick(T0 + 50_000)), 50_000)
  // pausing 2 minutes does not advance active time
  engine.pause(T0 + 50_000)
  assert.equal(activeElapsedMs(phases, engine.snapshot(T0 + 170_000)), 50_000)
  engine.resume(T0 + 170_000)
  assert.equal(activeElapsedMs(phases, engine.tick(T0 + 180_000)), 60_000)
  assert.equal(activeElapsedMs(phases, { status: 'stopped' }), null)
})

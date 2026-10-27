import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCueSchedule } from '../workoutPlan.js'
import { COMBOS, LEVELS, MOVES, PACES } from './combos.js'
import { buildComboSchedule, estimateSpeechMs } from './schedule.js'

const plan = buildCueSchedule({ rounds: 3, roundDurationSec: 180, restDurationSec: 60 })

test('every combo uses known moves and fits at least the slowest pace', () => {
  for (const style of Object.keys(COMBOS)) {
    for (const level of LEVELS) {
      assert.equal(COMBOS[style][level].length, 12, `${style} ${level}`)
      for (const combo of COMBOS[style][level]) {
        for (const move of combo) assert.ok(MOVES[move], `${move} in ${style}/${level}`)
        assert.ok(estimateSpeechMs(combo) <= 12_000 - 600, combo.join(' '))
      }
    }
  }
})

test('3-minute round at 8s pace gives about 20 calls per round', () => {
  const calls = buildComboSchedule(plan, { style: 'boxing', level: 'beginner', paceSec: 8, seed: 7 })
  const perRound = [1, 2, 3].map((r) => calls.filter((c) => c.round === r).length)
  for (const n of perRound) assert.ok(n >= 18 && n <= 22, `got ${n}`)
})

for (const style of ['boxing', 'muaythai', 'mixed']) {
  for (const level of LEVELS) {
    for (const paceSec of PACES) {
      test(`${style}/${level}/${paceSec}s: calls stay inside work rounds and clear of every beep`, () => {
        const calls = buildComboSchedule(plan, { style, level, paceSec, seed: 42 })
        assert.ok(calls.length > 0)
        const work = plan.phases.filter((p) => p.phase === 'work')
        for (const call of calls) {
          const phase = work.find((p) => call.at >= p.startMs && call.endAt <= p.startMs + p.durationMs)
          assert.ok(phase, `call at ${call.at} is inside a work round`)
          for (const cue of plan.cues) {
            const clear = call.endAt + 300 <= cue.at || call.at >= cue.at + 250
            assert.ok(clear, `${call.display} at ${call.at} clashes with ${cue.key} at ${cue.at}`)
          }
        }
        // calls never overlap each other, and never repeat back to back
        for (let i = 1; i < calls.length; i += 1) {
          assert.ok(calls[i].at >= calls[i - 1].endAt)
          assert.notEqual(calls[i].display, calls[i - 1].display)
        }
      })
    }
  }
}

test('the same seed gives the same plan; a new workout gets a new order', () => {
  const a = buildComboSchedule(plan, { style: 'mixed', level: 'advanced', paceSec: 12, seed: 99 })
  const b = buildComboSchedule(plan, { style: 'mixed', level: 'advanced', paceSec: 12, seed: 99 })
  const c = buildComboSchedule(plan, { style: 'mixed', level: 'advanced', paceSec: 12, seed: 100 })
  assert.deepEqual(a, b)
  assert.notDeepEqual(a.map((x) => x.display), c.map((x) => x.display))
})

test('short 15s rounds: calls fit around the 10-second warning and final ticks', () => {
  const short = buildCueSchedule({ rounds: 2, roundDurationSec: 15, restDurationSec: 10 })
  const calls = buildComboSchedule(short, { style: 'boxing', level: 'beginner', paceSec: 5, seed: 3 })
  assert.ok(calls.length >= 2)
  for (const call of calls) {
    const warn = short.cues.find((c) => c.key === `work-${call.round}-warn`)
    const clearOfWarn = call.endAt + 300 <= warn.at || call.at >= warn.at + 650
    assert.ok(clearOfWarn, `${call.display} at ${call.at} overlaps the warning at ${warn.at}`)
  }
})

test('spoken text and display text', () => {
  const [call] = buildComboSchedule(plan, { style: 'boxing', level: 'beginner', paceSec: 12, seed: 1 })
  assert.match(call.text, /^[A-Z][a-z]+( [a-z]+)?(, [A-Z][a-z]+( [a-z]+)?)*$/)
  assert.match(call.display, /^[A-Z ]+( · [A-Z ]+)*$/)
})

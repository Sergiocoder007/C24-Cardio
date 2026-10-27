import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCueSchedule } from '../workoutPlan.js'
import { COMBOS, LEVELS, MOVES, PACES } from './combos.js'
import { BEEP_GAP_MS, buildComboSchedule, estimateSpeechMs, throwMs } from './schedule.js'

const SOUND_MS = { tick: 250, warn: 650, bell: 1450, complete: 3000 }

const plan = buildCueSchedule({ rounds: 3, roundDurationSec: 180, restDurationSec: 60 })

test('every combo uses known moves and can be called and thrown at the 8s and 12s pace', () => {
  for (const style of Object.keys(COMBOS)) {
    for (const level of LEVELS) {
      assert.equal(COMBOS[style][level].length, 12, `${style} ${level}`)
      for (const combo of COMBOS[style][level]) {
        for (const move of combo) assert.ok(MOVES[move], `${move} in ${style}/${level}`)
        assert.ok(estimateSpeechMs(combo) + throwMs(combo) <= 8_000, combo.join(' '))
      }
    }
  }
})

test('at the fastest 5s pace every level still has plenty of usable combos', () => {
  for (const style of Object.keys(COMBOS)) {
    for (const level of LEVELS) {
      const usable = COMBOS[style][level].filter((m) => estimateSpeechMs(m) + throwMs(m) <= 5_000)
      assert.ok(usable.length >= 8, `${style}/${level}: only ${usable.length} usable at 5s`)
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
            const clear = call.endAt + BEEP_GAP_MS <= cue.at || call.at >= cue.at + SOUND_MS[cue.id] + BEEP_GAP_MS
            assert.ok(clear, `${call.display} at ${call.at} clashes with ${cue.key} at ${cue.at}`)
          }
        }
        // each call leaves time to throw it before the next call, and never repeats back to back
        for (let i = 1; i < calls.length; i += 1) {
          assert.ok(calls[i].at >= calls[i - 1].endAt + throwMs(calls[i - 1].moves))
          assert.notEqual(calls[i].display, calls[i - 1].display)
        }
        // no call lands in rest, intro or the "next round" announcement
        for (const call of calls) {
          const inOther = plan.phases.some((p) => p.phase !== 'work' && call.at < p.startMs + p.durationMs && call.endAt > p.startMs)
          assert.ok(!inOther)
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
  assert.ok(calls.length >= 1)
  for (const call of calls) {
    const warn = short.cues.find((c) => c.key === `work-${call.round}-warn`)
    const clearOfWarn = call.endAt + BEEP_GAP_MS <= warn.at || call.at >= warn.at + 650 + BEEP_GAP_MS
    assert.ok(clearOfWarn, `${call.display} at ${call.at} overlaps the warning at ${warn.at}`)
  }
})

test('spoken text and display text for every call', () => {
  const calls = ['boxing', 'muaythai'].flatMap((style) =>
    LEVELS.flatMap((level) => buildComboSchedule(plan, { style, level, paceSec: 12, seed: 5 })),
  )
  assert.ok(calls.length > 50)
  for (const call of calls) {
    assert.match(call.text, /^[A-Z][a-z]+( [a-z]+)*(, [A-Z][a-z]+( [a-z]+)*)*$/, call.text)
    assert.match(call.display, /^[A-Z]+( [A-Z]+)*( · [A-Z]+( [A-Z]+)*)*$/, call.display)
    assert.ok(!/body jab|body hook/i.test(call.text), 'uses "to body" terminology')
  }
})

test('no two kicks or knees off the same leg back to back', () => {
  const LEAD = new Set(['teep', 'switch-kick', 'switch-knee', 'check'])
  const REAR = new Set(['rear-teep', 'low-kick', 'body-kick', 'head-kick', 'knee'])
  const leg = (id) => (LEAD.has(id) ? 'lead' : REAR.has(id) ? 'rear' : null)
  for (const style of Object.keys(COMBOS)) {
    for (const level of LEVELS) {
      for (const combo of COMBOS[style][level]) {
        for (let i = 1; i < combo.length; i += 1) {
          const a = leg(combo[i - 1])
          const b = leg(combo[i])
          assert.ok(!(a && a === b), `${style}/${level}: ${combo.join(' ')} uses the ${a} leg twice in a row`)
        }
      }
    }
  }
})

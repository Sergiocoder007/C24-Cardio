// Places combo calls inside each work round so they never overlap a beep,
// the 10-second warning, a bell, or a rest period.
import { combosFor, displayText, spokenText } from './combos.js'
import { SOUND_IDS } from '../audio/soundBank.js'

// How long each sound occupies (ms), including a little air around it.
const SOUND_MS = {
  [SOUND_IDS.TICK]: 250,
  [SOUND_IDS.WARN]: 650,
  [SOUND_IDS.BELL]: 1450,
  [SOUND_IDS.COMPLETE]: 3000,
}
const GAP_MS = 300 // silence kept between a call and any beep
const FIRST_CALL_MS = 2500 // after the round starts (lets the bell finish)

// Rough spoken length at the app's speech rate.
export function estimateSpeechMs(moves) {
  const words = moves.reduce((n, id) => n + id.split('-').length, 0)
  return 350 + words * 380 + (moves.length - 1) * 140
}

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function busyWindows(cues) {
  return cues.map((c) => [c.at - GAP_MS, c.at + (SOUND_MS[c.id] ?? 500) + GAP_MS])
}

function overlaps(start, end, windows) {
  return windows.some(([a, b]) => start < b && end > a)
}

/**
 * @param {{phases, cues}} plan  from buildCueSchedule()
 * @param {{style, level, paceSec, seed}} training
 * @returns {{at, endAt, moves, text, display, round}[]}
 */
export function buildComboSchedule(plan, { style, level, paceSec, seed = 1 }) {
  const pool = combosFor(style, level)
  if (!pool.length) return []
  const random = mulberry32(seed)
  const windows = busyWindows(plan.cues)
  const paceMs = paceSec * 1000
  const calls = []
  let last = -1

  for (const phase of plan.phases) {
    if (phase.phase !== 'work') continue
    const end = phase.startMs + phase.durationMs
    for (let at = phase.startMs + FIRST_CALL_MS; at < end; at += paceMs) {
      // Combos short enough to finish well before the next call.
      const fits = pool
        .map((moves, index) => ({ moves, index, ms: estimateSpeechMs(moves) }))
        .filter((o) => o.ms <= paceMs - 600 && o.index !== last)
        .filter((o) => at + o.ms <= end && !overlaps(at, at + o.ms, windows))
      if (!fits.length) continue
      const pick = fits[Math.floor(random() * fits.length)]
      last = pick.index
      calls.push({
        at,
        endAt: at + pick.ms,
        moves: pick.moves,
        text: spokenText(pick.moves),
        display: displayText(pick.moves),
        round: phase.round,
      })
    }
  }
  return calls
}

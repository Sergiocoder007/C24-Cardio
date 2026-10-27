// Places combo calls inside each work round so they never overlap a beep,
// the 10-second warning, a bell, or a rest period.
import { MOVES, combosFor, displayText } from './combos.js'
import { SOUND_IDS } from '../audio/soundBank.js'

// How long each sound occupies (ms), including a little air around it.
const SOUND_MS = {
  [SOUND_IDS.TICK]: 250,
  [SOUND_IDS.WARN]: 650,
  [SOUND_IDS.BELL]: 1450,
  [SOUND_IDS.COMPLETE]: 3000,
}
export const BEEP_GAP_MS = 500 // silence between a call and any beep, warning or bell
export const AFTER_CALL_MS = 1200 // minimum time to throw a combo before the next call
const THROW_MS_PER_MOVE = 300 // longer combos get more time to throw

// Time the athlete needs after the call to actually throw the combo.
export function throwMs(moves) {
  return Math.max(AFTER_CALL_MS, moves.length * THROW_MS_PER_MOVE)
}
const FIRST_CALL_MS = 2500 // after the round starts (lets the bell finish)

// Syllables in a spoken phrase (vowel groups; "y" counts after a consonant).
export function syllables(text) {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
    .reduce((n, word) => n + Math.max(1, (word.match(/[aeiou]+|(?<=[^aeiou])y/g) ?? []).length), 0)
}

// Conservative spoken length at the app's speech rate (1.15x): about 230 ms
// per syllable plus a short pause at each comma.
// At the 8 s and 12 s paces each move is spoken separately with a clear pause
// ("Jab … cross … hook"); at 5 s the combo is spoken as one quick phrase so
// longer combos still fit.
export const PAUSED_MIN_PACE_SEC = 8

export function usesPauses(paceSec) {
  return paceSec >= PAUSED_MIN_PACE_SEC
}

export function estimateSpeechMs(moves, paused = false) {
  const syl = moves.reduce((n, id) => n + syllables(MOVES[id].say), 0)
  if (paused) return 350 + syl * 250 + (moves.length - 1) * 450
  return 350 + syl * 230 + (moves.length - 1) * 230
}

// Moves joined with ';' are spoken one by one with a pause (the Android
// service and the browser voice split on ';'); ',' keeps one quick phrase.
export function callText(moves, paused) {
  return moves.map((id) => MOVES[id].say).join(paused ? '; ' : ', ')
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
  return cues.map((c) => [c.at - BEEP_GAP_MS, c.at + (SOUND_MS[c.id] ?? 500) + BEEP_GAP_MS])
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
      // Only combos that can be said clearly and still leave time to throw them
      // before the next call; otherwise this slot is skipped.
      const fits = pool
        .map((moves, index) => ({ moves, index, ms: estimateSpeechMs(moves, usesPauses(paceSec)) }))
        .filter((o) => o.ms + throwMs(o.moves) <= paceMs && o.index !== last)
        .filter((o) => at + o.ms <= end && !overlaps(at, at + o.ms, windows))
      if (!fits.length) continue
      const pick = fits[Math.floor(random() * fits.length)]
      last = pick.index
      calls.push({
        at,
        endAt: at + pick.ms,
        moves: pick.moves,
        text: callText(pick.moves, usesPauses(paceSec)),
        display: displayText(pick.moves),
        round: phase.round,
      })
    }
  }
  return calls
}

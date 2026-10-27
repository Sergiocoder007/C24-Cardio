// The whole workout computed up front: every phase and every sound cue, as
// offsets in "active" milliseconds (time the workout has been running, pauses
// excluded). The Android background service plays from this plan while the
// screen is locked; workoutPlan.test.mjs proves it matches exactly what the
// in-app engine (workoutEngine + workoutCues) plays.

import { SOUND_IDS } from './audio/soundBank.js'
import { ANNOUNCE_MS, INTRO_BEATS, INTRO_MS } from './workoutEngine.js'

const TICK_MARKS = [5, 4, 3, 2, 1]
const WARN_MS = 10_000

export function buildTimeline({ rounds, roundDurationSec, restDurationSec }) {
  const phases = []
  let at = 0
  const push = (phase, round, durationMs) => {
    phases.push({ phase, round, startMs: at, durationMs })
    at += durationMs
  }
  push('intro', 1, INTRO_MS)
  for (let round = 1; round <= rounds; round += 1) {
    push('work', round, roundDurationSec * 1000)
    if (round < rounds) {
      if (restDurationSec > 0) push('rest', round, restDurationSec * 1000)
      push('announce', round + 1, ANNOUNCE_MS)
    }
  }
  return { phases, totalMs: at }
}

function countdownCues(p, { opening }) {
  const cues = []
  const end = p.startMs + p.durationMs
  const key = (mark) => `${p.phase}-${p.round}-${mark}`
  if (p.durationMs > WARN_MS) cues.push({ at: end - WARN_MS, id: SOUND_IDS.WARN, key: key('warn') })
  if (opening) {
    // A phase that starts inside the 5..1 window opens with its current tick.
    const sec = Math.ceil(p.durationMs / 1000)
    if (p.durationMs <= 5000 && sec >= 1) cues.push({ at: p.startMs, id: SOUND_IDS.TICK, key: key(String(sec)) })
  }
  for (const mark of TICK_MARKS) {
    if (mark * 1000 < p.durationMs) cues.push({ at: end - mark * 1000, id: SOUND_IDS.TICK, key: key(String(mark)) })
  }
  return cues
}

export function buildCueSchedule(config) {
  const { phases, totalMs } = buildTimeline(config)
  const cues = []
  let introAt = 0
  for (const beat of INTRO_BEATS) {
    if (['3', '2', '1'].includes(beat.display)) cues.push({ at: introAt, id: SOUND_IDS.TICK, key: `intro-${beat.display}` })
    if (beat.display === 'GO') cues.push({ at: introAt, id: SOUND_IDS.BELL, key: 'intro-go', exclusive: true })
    introAt += beat.ms
  }
  for (let i = 0; i < phases.length; i += 1) {
    const p = phases[i]
    const prev = phases[i - 1]
    if (p.phase === 'work' || p.phase === 'rest') {
      // A phase that begins with an end-of-phase bell does not also play its opening tick.
      const bellAtStart = prev && (prev.phase === 'work' || prev.phase === 'rest')
      cues.push(...countdownCues(p, { opening: !bellAtStart }))
    }
    const end = p.startMs + p.durationMs
    if (p.phase === 'work') {
      const last = p.round >= config.rounds
      cues.push(
        last
          ? { at: end, id: SOUND_IDS.COMPLETE, key: 'workout-complete', exclusive: true }
          : { at: end, id: SOUND_IDS.BELL, key: `work-end-${p.round}`, exclusive: true },
      )
    }
    if (p.phase === 'rest') cues.push({ at: end, id: SOUND_IDS.BELL, key: `rest-end-${p.round}`, exclusive: true })
  }
  cues.sort((a, b) => a.at - b.at)
  return { phases, totalMs, cues }
}

// Payload for the native Android service (plain JSON).
export function nativePlan(config, extras = {}) {
  const { phases, totalMs, cues } = buildCueSchedule(config)
  return {
    rounds: config.rounds,
    totalMs,
    phases: phases.map(({ phase, round, startMs, durationMs }) => ({ phase, round, startMs, durationMs })),
    cues: cues.map(({ at, id }) => ({ at, sound: id })),
    speech: extras.speech ?? [],
  }
}

// Active (pause-excluded) milliseconds since the workout started, derived from
// the timer snapshot and the plan's timeline.
export function activeElapsedMs(phases, snapshot) {
  if (!snapshot || snapshot.status !== 'running') return null
  const phase = phases.find((p) => p.phase === snapshot.phase && p.round === snapshot.round)
  if (!phase) return null
  return phase.startMs + Math.max(0, Math.min(snapshot.elapsedMs, phase.durationMs))
}

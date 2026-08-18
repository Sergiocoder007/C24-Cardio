import { SOUND_IDS } from './soundBank.js'

const TICK_MARKS = [5, 4, 3, 2, 1]
const CATCH_UP_MS = 1100
const PHASE_START_MS = 400

function cue(id, key, exclusive = false) {
  return { id, key, exclusive }
}

function crossed(prevMs, nextMs, gateMs) {
  return prevMs > gateMs && nextMs <= gateMs
}

function jumped(prevMs, nextMs) {
  return prevMs - nextMs > CATCH_UP_MS
}

function phaseDuration(state) {
  return Math.max(0, state.remainingMs + state.elapsedMs)
}

function warnAllowed(state) {
  return phaseDuration(state) > 10000
}

export function liveClockCue(state) {
  const remainingMs = state.remainingMs
  if (remainingMs <= 0) return null
  if (remainingMs > 10000) return null
  if (remainingMs > 5000) {
    if (warnAllowed(state) && remainingMs > 9000) {
      return { id: SOUND_IDS.WARN, mark: 'warn' }
    }
    return null
  }
  const sec = Math.max(1, Math.ceil(remainingMs / 1000))
  if (!TICK_MARKS.includes(sec)) return null
  return { id: SOUND_IDS.TICK, mark: String(sec) }
}

function clockKey(state, mark) {
  return `${state.phase}-${state.round}-${mark}`
}

function timedCue(prevRemainingMs, next) {
  if (jumped(prevRemainingMs, next.remainingMs)) {
    const current = liveClockCue(next)
    if (!current) return null
    return cue(current.id, clockKey(next, current.mark))
  }

  if (warnAllowed(next) && crossed(prevRemainingMs, next.remainingMs, 10000)) {
    return cue(SOUND_IDS.WARN, clockKey(next, 'warn'))
  }

  for (const mark of TICK_MARKS) {
    if (crossed(prevRemainingMs, next.remainingMs, mark * 1000)) {
      return cue(SOUND_IDS.TICK, clockKey(next, String(mark)))
    }
  }

  return null
}

function introCue(display) {
  if (display === '3' || display === '2' || display === '1') {
    return cue(SOUND_IDS.TICK, `intro-${display}`)
  }
  if (display === 'GO') return cue(SOUND_IDS.BELL, 'intro-go', true)
  return null
}

function phaseEndCue(prev, next) {
  if (next.status === 'complete') {
    return next.sawRunning ? cue(SOUND_IDS.COMPLETE, 'workout-complete', true) : null
  }

  if (next.elapsedMs >= PHASE_START_MS) {
    const late = liveClockCue(next)
    if (!late) return null
    return cue(late.id, clockKey(next, late.mark))
  }

  if (prev.phase === 'work' && (next.phase === 'rest' || next.phase === 'announce')) {
    return cue(SOUND_IDS.BELL, `work-end-${prev.round}`, true)
  }
  if (prev.phase === 'rest' && (next.phase === 'announce' || next.phase === 'work')) {
    return cue(SOUND_IDS.BELL, `rest-end-${prev.round}`, true)
  }
  return null
}

export function resolveWorkoutCues(prev, next) {
  if (!next || next.status === 'stopped' || next.confirmStop) return []

  if (next.status === 'complete') {
    if (prev.status === 'complete') return []
    const done = phaseEndCue(prev, next)
    return done ? [done] : []
  }

  if (next.status !== 'running' || next.paused) return []

  if (prev.phase !== next.phase || prev.status !== next.status) {
    if (next.phase === 'intro') {
      const intro = introCue(next.display)
      return intro ? [intro] : []
    }

    const ended = phaseEndCue(prev, next)
    if (ended) return [ended]

    if ((next.phase === 'work' || next.phase === 'rest') && next.elapsedMs < PHASE_START_MS) {
      const opening = liveClockCue(next)
      if (opening) return [cue(opening.id, clockKey(next, opening.mark))]
    }
    return []
  }

  if (next.phase === 'intro' && next.display && next.display !== prev.display) {
    const intro = introCue(next.display)
    return intro ? [intro] : []
  }

  if (next.phase === 'work' || next.phase === 'rest') {
    const event = timedCue(prev.remainingMs, next)
    return event ? [event] : []
  }

  return []
}

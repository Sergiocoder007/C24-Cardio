// Workout timer state machine. Pure: every method takes the current time, so
// whole workouts can be simulated in tests. useWorkoutTimer drives it with
// requestAnimationFrame / setInterval in the app.
//
// Phases: intro (READY 3 2 1 GO) -> work -> [rest] -> announce -> work ... -> complete
// Timing is derived from absolute timestamps (phaseEndsAt), so throttled or
// suspended timers never drift: catchUp() replays any phases that ended while
// the app was not running.

export const INTRO_BEATS = [
  { label: 'READY', display: 'READY', ms: 800 },
  { label: 'READY', display: '3', ms: 1000 },
  { label: 'READY', display: '2', ms: 1000 },
  { label: 'READY', display: '1', ms: 1000 },
  { label: 'GO', display: 'GO', ms: 650 },
]

export const INTRO_MS = INTRO_BEATS.reduce((sum, beat) => sum + beat.ms, 0)
export const ANNOUNCE_MS = 900
const MAX_CATCH_UP_PHASES = 1000

export function introBeatAt(elapsedMs) {
  let cursor = 0
  for (const beat of INTRO_BEATS) {
    cursor += beat.ms
    if (elapsedMs < cursor) return beat
  }
  return INTRO_BEATS[INTRO_BEATS.length - 1]
}

export function phaseDuration(phase, config) {
  if (phase === 'intro') return INTRO_MS
  if (phase === 'work') return config.roundDurationSec * 1000
  if (phase === 'rest') return config.restDurationSec * 1000
  if (phase === 'announce') return ANNOUNCE_MS
  return 0
}

export function createWorkoutEngine(config, startAt) {
  const totalWorkMs = Math.max(1, config.rounds * config.roundDurationSec * 1000)
  const e = {
    status: 'running',
    phase: 'intro',
    round: 1,
    paused: false,
    confirmStop: false,
    wasPausedBeforeStop: false,
    phaseStartedAt: startAt,
    phaseEndsAt: startAt + INTRO_MS,
    remainingOnPause: 0,
    completedWorkMs: 0,
    completedAt: null,
  }

  function enter(phase, round, at) {
    e.phase = phase
    e.round = round
    e.phaseStartedAt = at
    e.phaseEndsAt = at + phaseDuration(phase, config)
  }

  function completePhase(endedAt) {
    if (e.phase === 'intro') return enter('work', 1, endedAt)
    if (e.phase === 'work') {
      e.completedWorkMs += config.roundDurationSec * 1000
      if (e.round >= config.rounds) {
        e.phase = 'complete'
        e.status = 'complete'
        e.completedAt = endedAt
        return undefined
      }
      if (config.restDurationSec > 0) return enter('rest', e.round, endedAt)
      return enter('announce', e.round + 1, endedAt)
    }
    if (e.phase === 'rest') return enter('announce', e.round + 1, endedAt)
    if (e.phase === 'announce') return enter('work', e.round, endedAt)
    return undefined
  }

  function catchUp(now) {
    if (e.paused || e.status !== 'running') return
    let guard = 0
    while (e.status === 'running' && now >= e.phaseEndsAt && guard < MAX_CATCH_UP_PHASES) {
      completePhase(e.phaseEndsAt)
      guard += 1
    }
  }

  function freeze(now) {
    e.paused = true
    e.remainingOnPause = Math.max(0, e.phaseEndsAt - now)
  }

  function unfreeze(now) {
    e.paused = false
    e.phaseEndsAt = now + e.remainingOnPause
    e.phaseStartedAt = e.phaseEndsAt - phaseDuration(e.phase, config)
  }

  function workProgress(now) {
    if (e.status === 'complete') return 1
    let workMs = e.completedWorkMs
    if (e.phase === 'work') {
      const roundMs = phaseDuration('work', config)
      const elapsed = e.paused ? roundMs - e.remainingOnPause : now - e.phaseStartedAt
      workMs += Math.min(Math.max(0, elapsed), roundMs)
    }
    return Math.min(1, Math.max(0, workMs / totalWorkMs))
  }

  return {
    config,
    totalWorkMs,
    startedAt: startAt,
    get state() {
      return e
    },
    tick(now) {
      catchUp(now)
      return this.snapshot(now)
    },
    snapshot(now) {
      const remainingMs = e.paused ? e.remainingOnPause : Math.max(0, e.phaseEndsAt - now)
      const elapsedMs = e.paused
        ? phaseDuration(e.phase, config) - e.remainingOnPause
        : Math.max(0, now - e.phaseStartedAt)
      return {
        status: e.status,
        phase: e.phase,
        round: e.round,
        remainingMs: e.status === 'running' ? remainingMs : 0,
        elapsedMs: e.status === 'running' ? elapsedMs : 0,
        paused: e.paused,
        confirmStop: e.confirmStop,
        progress: workProgress(now),
        completedAt: e.completedAt,
        beat: e.phase === 'intro' ? introBeatAt(elapsedMs) : null,
      }
    },
    pause(now) {
      if (e.status !== 'running' || e.paused) return false
      catchUp(now)
      if (e.status !== 'running') return false
      freeze(now)
      return true
    },
    resume(now) {
      if (e.status !== 'running' || !e.paused || e.confirmStop) return false
      unfreeze(now)
      return true
    },
    requestStop(now) {
      if (e.status !== 'running' || e.confirmStop) return false
      e.wasPausedBeforeStop = e.paused
      if (!e.paused) {
        catchUp(now)
        if (e.status !== 'running') return false
        freeze(now)
      }
      e.confirmStop = true
      return true
    },
    cancelStop(now) {
      if (!e.confirmStop) return false
      e.confirmStop = false
      if (!e.wasPausedBeforeStop && e.status === 'running') unfreeze(now)
      return true
    },
    confirmEnd() {
      if (e.status !== 'running') return false
      e.status = 'stopped'
      e.phase = 'stopped'
      e.paused = true
      e.confirmStop = false
      return true
    },
  }
}

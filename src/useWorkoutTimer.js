import { useEffect, useMemo, useRef, useState } from 'react'
import { workRevealProgress } from './reveal.js'

export const INTRO_BEATS = [
  { label: 'READY', display: 'READY', ms: 800 },
  { label: 'READY', display: '3', ms: 1000 },
  { label: 'READY', display: '2', ms: 1000 },
  { label: 'READY', display: '1', ms: 1000 },
  { label: 'GO', display: 'GO', ms: 650 },
]

export const INTRO_MS = INTRO_BEATS.reduce((sum, beat) => sum + beat.ms, 0)
export const ANNOUNCE_MS = 900

function introBeatAt(elapsedMs) {
  let cursor = 0
  for (const beat of INTRO_BEATS) {
    cursor += beat.ms
    if (elapsedMs < cursor) return beat
  }
  return INTRO_BEATS[INTRO_BEATS.length - 1]
}

function phaseDuration(phase, config) {
  if (phase === 'intro') return INTRO_MS
  if (phase === 'work') return config.roundDurationSec * 1000
  if (phase === 'rest') return config.restDurationSec * 1000
  if (phase === 'announce') return ANNOUNCE_MS
  return 0
}

export function useWorkoutTimer(config) {
  const [snapshot, setSnapshot] = useState(() => ({
    status: 'running',
    phase: 'intro',
    round: 1,
    remainingMs: INTRO_MS,
    elapsedMs: 0,
    reveal: 0,
    confirmStop: false,
    paused: false,
    cue: 'intro',
  }))
  const engineRef = useRef(null)

  const totalWorkMs = useMemo(
    () => Math.max(1, config.rounds * config.roundDurationSec * 1000),
    [config.rounds, config.roundDurationSec],
  )

  useEffect(() => {
    const engine = {
      paused: false,
      confirmStop: false,
      phase: 'intro',
      round: 1,
      phaseStartedAt: Date.now(),
      phaseEndsAt: Date.now() + INTRO_MS,
      remainingOnPause: 0,
      completedWorkMs: 0,
      frozenReveal: 0,
      status: 'running',
      cue: 'intro',
      raf: 0,
      interval: 0,
      alive: true,
    }

    function revealNow(now) {
      const workElapsedMs =
        engine.phase === 'work'
          ? engine.paused
            ? phaseDuration('work', config) - engine.remainingOnPause
            : now - engine.phaseStartedAt
          : 0

      return workRevealProgress({
        status: engine.status,
        phase: engine.phase,
        completedWorkMs: engine.completedWorkMs,
        workElapsedMs,
        roundDurationMs: phaseDuration('work', config),
        totalWorkMs,
        frozenReveal: engine.frozenReveal,
      })
    }

    function publish(now = Date.now()) {
      if (!engine.alive) return
      const remainingMs = engine.paused
        ? engine.remainingOnPause
        : Math.max(0, engine.phaseEndsAt - now)
      const elapsedMs = engine.paused
        ? phaseDuration(engine.phase, config) - engine.remainingOnPause
        : Math.max(0, now - engine.phaseStartedAt)
      setSnapshot({
        status: engine.status,
        phase: engine.phase,
        round: engine.round,
        remainingMs,
        elapsedMs,
        reveal: revealNow(now),
        confirmStop: engine.confirmStop,
        cue: engine.cue,
        paused: engine.paused,
        beat: engine.phase === 'intro' ? introBeatAt(elapsedMs) : null,
      })
    }

    function enter(phase, round, startAt) {
      engine.phase = phase
      engine.round = round
      engine.phaseStartedAt = startAt
      engine.phaseEndsAt = startAt + phaseDuration(phase, config)
      engine.cue = phase
    }

    function completePhase(endedAt) {
      if (engine.phase === 'intro') {
        enter('work', 1, endedAt)
        return
      }
      if (engine.phase === 'work') {
        engine.completedWorkMs += config.roundDurationSec * 1000
        if (engine.round >= config.rounds) {
          engine.phase = 'complete'
          engine.status = 'complete'
          engine.frozenReveal = 1
          engine.cue = 'complete'
          return
        }
        if (config.restDurationSec > 0) {
          enter('rest', engine.round, endedAt)
        } else {
          enter('announce', engine.round + 1, endedAt)
        }
        return
      }
      if (engine.phase === 'rest') {
        enter('announce', engine.round + 1, endedAt)
        return
      }
      if (engine.phase === 'announce') {
        enter('work', engine.round, endedAt)
      }
    }

    function catchUp(now) {
      if (engine.paused || engine.status !== 'running') return
      let guard = 0
      while (
        engine.status === 'running' &&
        now >= engine.phaseEndsAt &&
        guard < 200
      ) {
        completePhase(engine.phaseEndsAt)
        guard += 1
      }
    }

    function tick() {
      if (!engine.alive) return
      const now = Date.now()
      catchUp(now)
      publish(now)
    }

    function loop() {
      tick()
      if (engine.alive && engine.status === 'running' && !engine.paused) {
        engine.raf = requestAnimationFrame(loop)
      }
    }

    function onVisibility() {
      tick()
      if (document.visibilityState === 'visible' && engine.status === 'running' && !engine.paused) {
        cancelAnimationFrame(engine.raf)
        engine.raf = requestAnimationFrame(loop)
      }
    }

    engine.interval = window.setInterval(tick, 250)
    document.addEventListener('visibilitychange', onVisibility)
    engine.raf = requestAnimationFrame(loop)
    publish()

    engineRef.current = {
      pause() {
        if (engine.status !== 'running' || engine.paused) return
        const now = Date.now()
        catchUp(now)
        engine.paused = true
        engine.remainingOnPause = Math.max(0, engine.phaseEndsAt - now)
        engine.cue = 'pause'
        cancelAnimationFrame(engine.raf)
        publish(now)
      },
      resume() {
        if (engine.status !== 'running' || !engine.paused) return
        const now = Date.now()
        engine.paused = false
        engine.phaseEndsAt = now + engine.remainingOnPause
        engine.phaseStartedAt = engine.phaseEndsAt - phaseDuration(engine.phase, config)
        engine.cue = engine.phase
        engine.raf = requestAnimationFrame(loop)
        publish(now)
      },
      requestStop() {
        if (engine.status !== 'running') return
        engine.wasPausedBeforeStop = engine.paused
        if (!engine.paused) {
          const now = Date.now()
          catchUp(now)
          engine.paused = true
          engine.remainingOnPause = Math.max(0, engine.phaseEndsAt - now)
          cancelAnimationFrame(engine.raf)
        }
        engine.confirmStop = true
        engine.cue = 'pause'
        publish()
      },
      cancelStop() {
        engine.confirmStop = false
        if (!engine.wasPausedBeforeStop && engine.status === 'running') {
          const now = Date.now()
          engine.paused = false
          engine.phaseEndsAt = now + engine.remainingOnPause
          engine.phaseStartedAt = engine.phaseEndsAt - phaseDuration(engine.phase, config)
          engine.cue = engine.phase
          engine.raf = requestAnimationFrame(loop)
          publish(now)
          return
        }
        publish()
      },
      confirmEnd() {
        if (engine.status !== 'running') return
        const now = Date.now()
        catchUp(now)
        engine.frozenReveal = revealNow(now)
        engine.status = 'stopped'
        engine.paused = true
        engine.confirmStop = false
        engine.phase = 'stopped'
        engine.cue = 'stopped'
        cancelAnimationFrame(engine.raf)
        publish(now)
      },
    }

    return () => {
      engine.alive = false
      cancelAnimationFrame(engine.raf)
      window.clearInterval(engine.interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [config, totalWorkMs])

  return {
    ...snapshot,
    totalWorkMs,
    pause: () => engineRef.current?.pause(),
    resume: () => engineRef.current?.resume(),
    requestStop: () => engineRef.current?.requestStop(),
    cancelStop: () => engineRef.current?.cancelStop(),
    confirmEnd: () => engineRef.current?.confirmEnd(),
  }
}

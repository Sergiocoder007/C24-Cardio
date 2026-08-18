import { useEffect, useRef } from 'react'
import { resolveWorkoutCues } from './workoutCues.js'
import { playWorkoutSound, setWorkoutAudioEnabled, stopWorkoutSounds } from './workoutAudio.js'

function snapshotOf(timer, sawRunning) {
  return {
    status: timer.status,
    phase: timer.phase,
    round: timer.round,
    remainingMs: timer.remainingMs,
    elapsedMs: timer.elapsedMs,
    paused: timer.paused,
    display: timer.beat?.display ?? null,
    confirmStop: timer.confirmStop,
    sawRunning,
  }
}

export function useWorkoutSounds(timer, soundOn) {
  const last = useRef({
    status: 'running',
    phase: null,
    round: 1,
    remainingMs: Number.POSITIVE_INFINITY,
    elapsedMs: 0,
    paused: false,
    display: null,
    confirmStop: false,
    sawRunning: false,
  })
  const fired = useRef(new Set())
  const sawRunning = useRef(false)

  useEffect(() => {
    setWorkoutAudioEnabled(soundOn)
    if (!soundOn) stopWorkoutSounds()
  }, [soundOn])

  useEffect(() => {
    if (timer.status === 'stopped' || timer.confirmStop) {
      stopWorkoutSounds()
    }
    if (timer.status === 'running') sawRunning.current = true

    const next = snapshotOf(timer, sawRunning.current)
    const cues = resolveWorkoutCues(last.current, next)

    for (const item of cues) {
      if (fired.current.has(item.key)) continue
      fired.current.add(item.key)
      if (!soundOn) continue
      if (item.exclusive) stopWorkoutSounds()
      playWorkoutSound(item.id, { key: item.key })
    }

    last.current = next
    return undefined
  }, [
    soundOn,
    timer.beat?.display,
    timer.confirmStop,
    timer.elapsedMs,
    timer.paused,
    timer.phase,
    timer.remainingMs,
    timer.round,
    timer.status,
  ])
}

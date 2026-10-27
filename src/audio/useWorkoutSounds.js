import { useEffect, useRef, useState } from 'react'
import { createCueTracker } from './workoutCues.js'
import {
  playWorkoutSound,
  resumeWorkoutAudioQuietly,
  setWorkoutAudioEnabled,
  stopWorkoutSounds,
  unlockWorkoutAudio,
  workoutAudio,
} from './workoutAudio.js'

const GESTURE_EVENTS = ['pointerup', 'touchend', 'keydown']

// Plays the workout's sound cues and keeps audio alive for the whole session.
// Returns { needsTap } — true when the system has taken audio away and only a
// tap can bring it back (shown as a banner on the workout screen).
export function useWorkoutSounds(timer, soundOn) {
  const tracker = useRef(null)
  if (!tracker.current) tracker.current = createCueTracker()
  const [audio, setAudio] = useState(() => workoutAudio.status())

  useEffect(() => workoutAudio.subscribe(setAudio), [])

  useEffect(() => {
    setWorkoutAudioEnabled(soundOn)
    if (!soundOn) stopWorkoutSounds()
  }, [soundOn])

  // Any tap on the screen during a workout is a chance to recover audio that
  // the OS suspended (screen lock, phone call, Siri, another app's audio).
  useEffect(() => {
    if (!soundOn) return undefined
    const onGesture = () => {
      void unlockWorkoutAudio()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void resumeWorkoutAudioQuietly()
    }
    for (const type of GESTURE_EVENTS) document.addEventListener(type, onGesture, true)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onVisible)
    return () => {
      for (const type of GESTURE_EVENTS) document.removeEventListener(type, onGesture, true)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onVisible)
    }
  }, [soundOn])

  useEffect(() => {
    if (timer.status === 'stopped' || timer.confirmStop) stopWorkoutSounds()
    const cues = tracker.current.next(timer)
    if (!soundOn) return
    for (const item of cues) {
      if (item.exclusive) stopWorkoutSounds()
      playWorkoutSound(item.id, { key: item.key })
    }
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

  useEffect(() => () => stopWorkoutSounds(), [])

  return { needsTap: soundOn && audio.needsGesture }
}

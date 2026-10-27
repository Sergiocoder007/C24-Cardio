import { useEffect, useMemo, useRef, useState } from 'react'
import { activeElapsedMs, nativePlan } from '../workoutPlan.js'
import { WorkoutTimer, nativeTimerAvailable } from './workoutTimer.js'

// Hands the running workout to the Android background service, which plays the
// sounds (screen locked or not) and shows the lock-screen notification.
// Returns { active }: while active, the in-app audio engine stays silent so
// sounds never play twice. If the service cannot start, active stays false and
// the in-app engine keeps playing exactly as before.
export function useBackgroundTimer(timer, session, soundOn, extras) {
  const [active, setActive] = useState(false)
  const timerRef = useRef(timer)
  timerRef.current = timer
  const soundRef = useRef(soundOn)
  soundRef.current = soundOn
  const plan = useMemo(() => nativePlan(session, extras), [session, extras])

  // Start once per workout.
  useEffect(() => {
    if (!nativeTimerAvailable()) return undefined
    let cancelled = false
    const begin = async () => {
      const t = timerRef.current
      const elapsedMs = activeElapsedMs(plan.phases, t)
      if (elapsedMs == null) return
      // Silence the in-app engine first so no cue can play twice during the
      // hand-off; if the service fails to start, the in-app engine takes over.
      setActive(true)
      try {
        await WorkoutTimer.start({ plan, elapsedMs, muted: !soundRef.current })
        if (cancelled) return
        if (timerRef.current.paused) await WorkoutTimer.pause()
      } catch {
        if (!cancelled) setActive(false) // in-app audio continues
      }
    }
    void begin()
    // Ask once for notification permission (Android 13+). The timer and
    // sounds work without it; only the lock-screen notification is hidden.
    WorkoutTimer.checkPermissions()
      .then((p) => {
        if (p.notifications === 'prompt' || p.notifications === 'prompt-with-rationale') {
          return WorkoutTimer.requestPermissions({ permissions: ['notifications'] })
        }
        return undefined
      })
      .catch(() => {})
    return () => {
      cancelled = true
      void WorkoutTimer.stop().catch(() => {})
      setActive(false)
    }
  }, [plan])

  // Notification buttons -> app timer.
  useEffect(() => {
    if (!nativeTimerAvailable()) return undefined
    let handle = null
    let removed = false
    WorkoutTimer.addListener('action', (event) => {
      const t = timerRef.current
      if (event.action === 'pause') t.pause(event.at)
      else if (event.action === 'resume') t.resume(event.at)
      else if (event.action === 'stop') t.confirmEnd()
    })
      .then((h) => {
        if (removed) void h.remove()
        else handle = h
      })
      .catch(() => {})
    return () => {
      removed = true
      void handle?.remove()
    }
  }, [])

  // App timer -> background service.
  useEffect(() => {
    if (!active) return
    if (timer.status === 'stopped') {
      void WorkoutTimer.stop().catch(() => {})
      setActive(false)
      return
    }
    if (timer.status !== 'running') return // on completion the service finishes on its own
    if (timer.paused) void WorkoutTimer.pause().catch(() => {})
    else void WorkoutTimer.resume().catch(() => {})
  }, [active, timer.paused, timer.status])

  useEffect(() => {
    if (active) void WorkoutTimer.setMuted({ muted: !soundOn }).catch(() => {})
  }, [active, soundOn])

  // Back from the background: if the system ended the service, restart it in sync.
  useEffect(() => {
    if (!active) return undefined
    let timeout = 0
    const check = async () => {
      // Runs after the timer has re-rendered with its caught-up state.
      const t = timerRef.current
      if (t.status !== 'running') return
      try {
        const state = await WorkoutTimer.getState()
        if (state.running) return
        const elapsedMs = activeElapsedMs(plan.phases, timerRef.current)
        if (elapsedMs == null || elapsedMs >= plan.totalMs - 1000) return
        await WorkoutTimer.start({ plan, elapsedMs, muted: !soundRef.current })
        if (timerRef.current.paused) await WorkoutTimer.pause()
      } catch {
        setActive(false)
      }
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      window.clearTimeout(timeout)
      timeout = window.setTimeout(() => void check(), 400)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(timeout)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [active, plan])

  return { active }
}

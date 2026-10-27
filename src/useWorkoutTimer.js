import { useEffect, useRef, useState } from 'react'
import { createWorkoutEngine } from './workoutEngine.js'

export { ANNOUNCE_MS, INTRO_BEATS, INTRO_MS } from './workoutEngine.js'

const TICK_MS = 250

export function useWorkoutTimer(config) {
  const engineRef = useRef(null)
  const [snapshot, setSnapshot] = useState(() => {
    const engine = createWorkoutEngine(config, Date.now())
    engineRef.current = engine
    return engine.snapshot(Date.now())
  })

  useEffect(() => {
    // StrictMode mounts effects twice in development; start a fresh engine
    // unless the one created during the first render is still pristine.
    let engine = engineRef.current
    if (!engine || engine.config !== config) {
      engine = createWorkoutEngine(config, Date.now())
      engineRef.current = engine
    }
    let alive = true
    let raf = 0

    const publish = () => {
      if (alive) setSnapshot(engine.snapshot(Date.now()))
    }

    const running = () => engine.state.status === 'running' && !engine.state.paused

    const tick = () => {
      if (!alive || !running()) return
      setSnapshot(engine.tick(Date.now()))
    }

    const loop = () => {
      tick()
      if (alive && running()) raf = requestAnimationFrame(loop)
    }

    const start = () => {
      cancelAnimationFrame(raf)
      if (running()) raf = requestAnimationFrame(loop)
    }

    const onVisibility = () => {
      tick()
      if (document.visibilityState === 'visible') start()
    }

    const interval = window.setInterval(tick, TICK_MS)
    document.addEventListener('visibilitychange', onVisibility)
    start()
    publish()

    // Each control takes an optional timestamp so actions made from the
    // lock-screen notification apply at the moment they were tapped.
    engine.controls = {
      pause(at = Date.now()) {
        if (engine.pause(at)) {
          cancelAnimationFrame(raf)
          publish()
        }
      },
      resume(at = Date.now()) {
        if (engine.resume(at)) {
          start()
          publish()
        }
      },
      requestStop(at = Date.now()) {
        if (engine.requestStop(at)) {
          cancelAnimationFrame(raf)
          publish()
        }
      },
      cancelStop(at = Date.now()) {
        if (engine.cancelStop(at)) {
          start()
          publish()
        }
      },
      confirmEnd() {
        if (engine.confirmEnd()) {
          cancelAnimationFrame(raf)
          publish()
        }
      },
    }

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [config])

  const controls = () => engineRef.current?.controls
  return {
    ...snapshot,
    totalWorkMs: engineRef.current?.totalWorkMs ?? 0,
    startedAt: engineRef.current?.startedAt ?? 0,
    pause: (at) => controls()?.pause(typeof at === 'number' ? at : undefined),
    resume: (at) => controls()?.resume(typeof at === 'number' ? at : undefined),
    requestStop: () => controls()?.requestStop(),
    cancelStop: () => controls()?.cancelStop(),
    confirmEnd: () => controls()?.confirmEnd(),
  }
}

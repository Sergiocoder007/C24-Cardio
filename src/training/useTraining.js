import { useEffect, useMemo, useRef } from 'react'
import { activeElapsedMs, buildCueSchedule } from '../workoutPlan.js'
import { buildComboSchedule } from './schedule.js'
import { speakCall, stopSpeaking } from './voice.js'

const LATE_LIMIT_MS = 1200 // a call this late is skipped, not spoken out of time
const SHOW_AFTER_MS = 1500 // keep the combo on screen a moment after it is spoken

// The combo plan for this workout (empty in Sparring mode). `speech` is what
// the Android background service speaks.
export function useComboPlan(session) {
  const plan = useMemo(() => buildCueSchedule(session), [session])
  const calls = useMemo(
    () => (session.training ? buildComboSchedule(plan, session.training) : []),
    [plan, session.training],
  )
  const extras = useMemo(() => ({ speech: calls.map((c) => ({ at: c.at, text: c.text })) }), [calls])
  return { plan, calls, extras }
}

// The combo to show right now, and in-app speech when `speak` is true (web,
// iOS, or Android when the background service is not running).
export function useTrainingVoice({ plan, calls }, timer, speak) {
  const active = activeElapsedMs(plan.phases, timer)
  const current =
    active == null ? null : (calls.find((c) => active >= c.at && active < c.endAt + SHOW_AFTER_MS) ?? null)

  const spoken = useRef(new Set())
  useEffect(() => {
    if (active == null || timer.paused) return
    for (const call of calls) {
      if (call.at > active) break
      if (spoken.current.has(call.at)) continue
      spoken.current.add(call.at)
      if (speak && active - call.at <= LATE_LIMIT_MS) void speakCall(call)
    }
  }, [active, calls, speak, timer.paused])

  useEffect(() => {
    if (timer.paused || timer.status !== 'running' || !speak) stopSpeaking()
  }, [timer.paused, timer.status, speak])

  useEffect(() => () => stopSpeaking(), [])

  return current
}

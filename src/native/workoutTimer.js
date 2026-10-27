import { Capacitor, registerPlugin } from '@capacitor/core'

// Native Android background timer (plugins/workout-timer). On the web and on
// iOS this is unavailable and the in-app audio engine is used instead.
export const WorkoutTimer = registerPlugin('WorkoutTimer')

export function nativeTimerAvailable() {
  try {
    return Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('WorkoutTimer')
  } catch {
    return false
  }
}

export { activeElapsedMs } from '../workoutPlan.js'

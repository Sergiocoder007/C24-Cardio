import { Capacitor } from '@capacitor/core'
import { KeepAwake } from '@capawesome/capacitor-keep-awake'
import { useEffect } from 'react'

// Keeps the screen on while a workout is running. Without this the phone
// auto-locks mid-session, the OS suspends the app's audio, and timer sounds
// stop (the "sound stops after round 4-5" report).
// Native: @capawesome/capacitor-keep-awake. Web: Screen Wake Lock API.

const native = () => Capacitor.isNativePlatform()
let sentinel = null

async function acquire() {
  if (native()) {
    try {
      await KeepAwake.keepAwake()
      return true
    } catch {
      // plugin missing from this native build; fall back to the web API
    }
  }
  try {
    if (!navigator.wakeLock || document.visibilityState !== 'visible') return false
    if (sentinel && !sentinel.released) return true
    sentinel = await navigator.wakeLock.request('screen')
    return true
  } catch {
    return false
  }
}

async function release() {
  if (native()) {
    try {
      await KeepAwake.allowSleep()
    } catch {
      // ignore
    }
  }
  try {
    await sentinel?.release()
  } catch {
    // ignore
  }
  sentinel = null
}

export function useKeepAwake(active) {
  useEffect(() => {
    if (!active) return undefined
    void acquire()
    // Browsers drop the wake lock whenever the page is hidden.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void release()
    }
  }, [active])
}

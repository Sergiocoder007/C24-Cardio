import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { unlockWorkoutAudio } from './audio'
import { computeStats, createSession, loadHistory, saveHistory } from './history.js'
import { ProgressScreen } from './ProgressScreen'
import { loadSettings, saveSettings } from './settings.js'
import { SetupScreen } from './SetupScreen'
import { DEFAULT_SETUP } from './workout'
import { WorkoutScreen } from './WorkoutScreen'
import './App.css'

const storage = (() => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
})()

// Re-render at midnight-ish so "today" and the streak roll over.
function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    const onVisible = () => document.visibilityState === 'visible' && setNow(Date.now())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs])
  return now
}

// Android hardware back button.
function useBackButton(handler) {
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return undefined
    let listener = null
    let cancelled = false
    CapacitorApp.addListener('backButton', handler)
      .then((l) => {
        if (cancelled) void l.remove()
        else listener = l
      })
      .catch(() => {})
    return () => {
      cancelled = true
      void listener?.remove()
    }
  }, [handler])
}

function App() {
  const [screen, setScreen] = useState('setup')
  const [settings, setSettings] = useState(() => loadSettings(storage))
  const [history, setHistory] = useState(() => loadHistory(storage))
  const [session, setSession] = useState(null)
  const [backRequest, setBackRequest] = useState(0)
  const now = useNow()

  const stats = useMemo(() => computeStats(history, now), [history, now])

  useEffect(() => saveSettings(storage, settings), [settings])

  const handleBack = useCallback(() => {
    if (screen === 'workout') setBackRequest((n) => n + 1)
    else if (screen === 'progress') setScreen('setup')
    else void CapacitorApp.minimizeApp().catch(() => {})
  }, [screen])
  useBackButton(handleBack)

  const setSoundOn = (soundOn) => {
    if (soundOn) void unlockWorkoutAudio()
    setSettings((s) => ({ ...s, soundOn }))
  }

  const startWorkout = () => {
    // Must run inside the tap so iOS/Android allow audio to start.
    void unlockWorkoutAudio()
    const { rounds, roundDurationSec, restDurationSec } = settings.setup
    setSession({ rounds, roundDurationSec, restDurationSec })
    setScreen('workout')
  }

  const completeWorkout = useCallback(
    (finishedAt) => {
      setHistory((list) => {
        const next = [...list, createSession({ ...session, finishedAt })]
        saveHistory(storage, next)
        return next
      })
    },
    [session],
  )

  const exitWorkout = useCallback(() => setScreen('setup'), [])

  if (typeof window !== 'undefined' && /^\/privacy-policy\/?$/.test(window.location.pathname)) {
    window.location.replace('/privacy-policy/index.html')
    return null
  }

  if (screen === 'workout' && session) {
    return (
      <WorkoutScreen
        session={session}
        soundOn={settings.soundOn}
        onSoundChange={setSoundOn}
        onComplete={completeWorkout}
        onExit={exitWorkout}
        stats={stats}
        backRequest={backRequest}
      />
    )
  }

  if (screen === 'progress') {
    return <ProgressScreen stats={stats} onBack={() => setScreen('setup')} />
  }

  return (
    <SetupScreen
      setup={settings.setup}
      onChange={(setup) => setSettings((s) => ({ ...s, setup }))}
      stats={stats}
      onStart={startWorkout}
      onReset={() => setSettings((s) => ({ ...s, setup: { ...DEFAULT_SETUP } }))}
      onOpenProgress={() => setScreen('progress')}
    />
  )
}

export default App

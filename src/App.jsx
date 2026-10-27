import { App as CapacitorApp } from '@capacitor/app'
import { ChallengeCardScreen, CompletedChallengeScreen, CreateChallengeScreen, OpenChallengeScreen } from './ChallengeScreen'
import { challengeSession, decodeChallenge, payloadFromUrl } from './challenge/challenge.js'
import { findChallenge, loadChallenges, markChallengeCompleted, saveChallenges, upsertChallenge } from './challenge/store.js'
import { Capacitor } from '@capacitor/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { unlockWorkoutAudio } from './audio'
import { computeStats, createSession, loadHistory, saveHistory } from './history.js'
import { ProgressScreen } from './ProgressScreen'
import { loadSettings, saveSettings } from './settings.js'
import { SetupScreen } from './SetupScreen'
import { DEFAULT_SETUP } from './workout'
import { primeSpeech } from './training/voice.js'
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

// Challenge links: the web app reads its own address; the Android app gets
// the link it was opened with (cold start) and links opened while running.
function useIncomingChallenge(onPayload) {
  useEffect(() => {
    const payload = typeof window !== 'undefined' ? payloadFromUrl(window.location.href) : null
    if (payload) {
      onPayload(payload)
      window.history.replaceState(null, '', import.meta.env.BASE_URL ?? '/')
    }
    if (!Capacitor.isNativePlatform()) return undefined
    let listener = null
    let cancelled = false
    CapacitorApp.getLaunchUrl()
      .then((r) => {
        const p = payloadFromUrl(r?.url)
        if (p && !cancelled) onPayload(p)
      })
      .catch(() => {})
    CapacitorApp.addListener('appUrlOpen', (event) => {
      const p = payloadFromUrl(event.url)
      if (p) onPayload(p)
    })
      .then((l) => {
        if (cancelled) void l.remove()
        else listener = l
      })
      .catch(() => {})
    return () => {
      cancelled = true
      void listener?.remove()
    }
  }, [onPayload])
}

function App() {
  const [screen, setScreen] = useState('setup')
  const [settings, setSettings] = useState(() => loadSettings(storage))
  const [history, setHistory] = useState(() => loadHistory(storage))
  const [session, setSession] = useState(null)
  const [backRequest, setBackRequest] = useState(0)
  const [challenges, setChallenges] = useState(() => loadChallenges(storage))
  // { payload, completedAt? } for the challenge screens
  const [challengeView, setChallengeView] = useState(null)
  const now = useNow()

  const stats = useMemo(() => computeStats(history, now), [history, now])

  useEffect(() => saveSettings(storage, settings), [settings])

  const handleBack = useCallback(() => {
    if (screen === 'workout') setBackRequest((n) => n + 1)
    else if (screen !== 'setup') setScreen('setup')
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
    const t = settings.training
    const training =
      t.mode === 'training'
        ? { style: t.style, level: t.level, paceSec: t.paceSec, seed: Date.now() % 2147483647 }
        : null
    if (training) primeSpeech()
    setSession({ rounds, roundDurationSec, restDurationSec, training })
    setScreen('workout')
  }

  const updateChallenges = useCallback((fn) => {
    setChallenges((list) => {
      const next = fn(list)
      saveChallenges(storage, next)
      return next
    })
  }, [])

  const openIncoming = useCallback(
    (payload) => {
      if (decodeChallenge(payload).ok) updateChallenges((list) => upsertChallenge(list, payload, 'received'))
      setChallengeView({ payload })
      // A link that arrives mid-workout waits until the workout ends.
      setScreen((s) => (s === 'workout' ? s : 'challenge-open'))
    },
    [updateChallenges],
  )
  useIncomingChallenge(openIncoming)

  const startChallenge = (payload) => {
    const decoded = decodeChallenge(payload)
    if (!decoded.ok) return
    void unlockWorkoutAudio()
    primeSpeech()
    updateChallenges((list) => upsertChallenge(list, payload, 'received'))
    setSession(challengeSession(decoded.challenge, payload, Date.now() % 2147483647))
    setScreen('workout')
  }

  const completeWorkout = useCallback(
    (finishedAt) => {
      setHistory((list) => {
        const next = [...list, createSession({ ...session, finishedAt, mode: session.training ? 'training' : 'sparring' })]
        saveHistory(storage, next)
        return next
      })
      if (session.challenge) {
        updateChallenges((list) => markChallengeCompleted(list, session.challenge, finishedAt))
        setChallengeView({ payload: session.challenge, completedAt: new Date(finishedAt).toISOString() })
      }
    },
    [session, updateChallenges],
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
        onShareChallenge={session.challenge ? () => setScreen('challenge-done') : null}
      />
    )
  }

  const toSetup = () => setScreen('setup')
  if (screen === 'challenge-create') {
    return (
      <CreateChallengeScreen
        setup={settings.setup}
        training={settings.training}
        onBack={toSetup}
        onCreated={(payload) => {
          updateChallenges((list) => upsertChallenge(list, payload, 'created'))
          setChallengeView({ payload })
          setScreen('challenge-card')
        }}
      />
    )
  }
  if (screen === 'challenge-card' && challengeView) {
    return <ChallengeCardScreen payload={challengeView.payload} onStart={() => startChallenge(challengeView.payload)} onBack={toSetup} />
  }
  if (screen === 'challenge-open' && challengeView) {
    return (
      <OpenChallengeScreen
        payload={challengeView.payload}
        entry={findChallenge(challenges, challengeView.payload)}
        onAccept={() => startChallenge(challengeView.payload)}
        onShareCompleted={(completedAt) => {
          setChallengeView({ payload: challengeView.payload, completedAt })
          setScreen('challenge-done')
        }}
        onBack={toSetup}
      />
    )
  }
  if (screen === 'challenge-done' && challengeView?.completedAt) {
    return <CompletedChallengeScreen payload={challengeView.payload} completedAt={challengeView.completedAt} onBack={toSetup} />
  }

  if (screen === 'progress') {
    return <ProgressScreen stats={stats} onBack={() => setScreen('setup')} />
  }

  return (
    <SetupScreen
      setup={settings.setup}
      onChange={(setup) => setSettings((s) => ({ ...s, setup }))}
      training={settings.training}
      onTrainingChange={(training) => setSettings((s) => ({ ...s, training }))}
      stats={stats}
      onStart={startWorkout}
      onReset={() => setSettings((s) => ({ ...s, setup: { ...DEFAULT_SETUP } }))}
      onOpenProgress={() => setScreen('progress')}
      onCreateChallenge={() => setScreen('challenge-create')}
    />
  )
}

export default App

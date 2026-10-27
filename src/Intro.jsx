import { useCallback, useEffect, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import logoUrl from './assets/brand/c24-logo.png'
import { payloadFromUrl } from './challenge/challenge.js'
import './Intro.css'

const SHOW_MS = 1750
const FADE_MS = 450

// Quick "WELCOME, CHAMP" intro shown once per app start (not when returning
// from the background). Tap to skip. Skipped when a challenge link opened the app.
export function Intro() {
  const [visible, setVisible] = useState(() => typeof window === 'undefined' || !payloadFromUrl(window.location.href))
  const [leaving, setLeaving] = useState(false)
  const hide = useCallback(() => {
    setLeaving(true)
    window.setTimeout(() => setVisible(false), FADE_MS)
  }, [])

  useEffect(() => {
    if (!visible) return undefined
    const t = window.setTimeout(hide, SHOW_MS)
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.getLaunchUrl()
        .then((r) => {
          if (payloadFromUrl(r?.url)) setVisible(false)
        })
        .catch(() => {})
    }
    return () => window.clearTimeout(t)
    // Runs once, on app start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!visible) return null
  return (
    <div className={`intro${leaving ? ' is-leaving' : ''}`} onClick={hide} aria-hidden="true">
      <div className="intro-mark">
        <span className="intro-ring" />
        <span className="intro-ring is-second" />
        <img className="intro-logo" src={logoUrl} alt="" />
        <p className="intro-text">WELCOME, CHAMP</p>
      </div>
    </div>
  )
}

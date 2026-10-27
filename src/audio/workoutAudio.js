// Browser adapter for the workout audio engine (see audioEngine.js).
import warningToneUrl from '../assets/warning-10s.wav?url'
import { createWorkoutAudioEngine } from './audioEngine.js'
import { generateWarningToneSamples, WARNING_TONE_SAMPLE_RATE } from './warningToneAsset.js'

function logAudioError(action, error) {
  // Kept in production builds: these are rare and are the only trace when a
  // device silences the app. Inspect via `window.__c24Audio.diagnostics()`.
  console.warn(`[c24-audio] ${action} failed`, error)
}

function setPlaybackAudioSession() {
  try {
    const session = typeof navigator !== 'undefined' ? navigator.audioSession : null
    if (session && session.type !== 'playback') session.type = 'playback'
  } catch (error) {
    logAudioError('audioSession', error)
  }
}

function createContext() {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  try {
    return new Ctor()
  } catch (error) {
    logAudioError('create-context', error)
    return null
  }
}

async function loadWarningBuffer(ctx, pcmToBuffer) {
  try {
    const response = await fetch(warningToneUrl)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.arrayBuffer()
    return await ctx.decodeAudioData(data.slice(0))
  } catch (error) {
    logAudioError('warning-tone-fetch', error)
    return pcmToBuffer(ctx, generateWarningToneSamples(), WARNING_TONE_SAMPLE_RATE)
  }
}

export const workoutAudio = createWorkoutAudioEngine({
  createContext,
  loadWarningBuffer,
  log: logAudioError,
  setPlaybackSession: setPlaybackAudioSession,
})

if (typeof window !== 'undefined') {
  window.__c24Audio = { diagnostics: () => workoutAudio.diagnostics() }
}

export function unlockWorkoutAudio() {
  return workoutAudio.handleUserGesture()
}

export function setWorkoutAudioEnabled(enabled) {
  workoutAudio.setEnabled(enabled)
}

export function stopWorkoutSounds() {
  workoutAudio.stopAll()
}

export function playWorkoutSound(id, options) {
  workoutAudio.play(id, options)
}

export function resumeWorkoutAudioQuietly() {
  // No gesture available (e.g. app returned to foreground). Works where the
  // platform allows it; otherwise the engine flags needsGesture.
  if (!workoutAudio.enabled) return Promise.resolve(false)
  return workoutAudio.unlock()
}

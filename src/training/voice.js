// Speaks combo calls in the web app (web, iOS, and Android fallback).
// On Android with the background service, the service speaks instead.
//
// Recorded voice (ElevenLabs): put one file per move in public/voice/ named by
// move id (e.g. public/voice/hook-body.mp3) and list them in
// public/voice/manifest.json (start from manifest.example.json, which is
// generated from the move list). When every move of a
// combo has a clip, the clips are played back to back; otherwise the device's
// built-in speech is used.

import { workoutAudio } from '../audio/workoutAudio.js'

// Pause between clips: clear at the 8 s / 12 s paces (';'), short at 5 s.
const CLIP_GAP_MS = { paused: 350, quick: 120 }
let manifest = null
let manifestLoading = null
const decoded = new Map()

function loadManifest() {
  if (manifest) return Promise.resolve(manifest)
  if (!manifestLoading) {
    manifestLoading = fetch('./voice/manifest.json')
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((m) => {
        manifest = m && typeof m === 'object' ? m : {}
        return manifest
      })
  }
  return manifestLoading
}

export function preloadVoice() {
  void loadManifest()
}

async function clipBuffer(ctx, file) {
  if (decoded.has(file)) return decoded.get(file)
  const res = await fetch(`./voice/${file}`)
  const buffer = await ctx.decodeAudioData(await res.arrayBuffer())
  decoded.set(file, buffer)
  return buffer
}

async function playClips(moves, gapMs) {
  const ctx = workoutAudio.ctx
  if (!ctx || ctx.state !== 'running' || !manifest) return false
  if (!moves.every((m) => manifest[m])) return false
  try {
    const buffers = await Promise.all(moves.map((m) => clipBuffer(ctx, manifest[m])))
    let when = ctx.currentTime + 0.02
    for (const buffer of buffers) {
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.connect(workoutAudio.limiter ?? ctx.destination)
      src.start(when)
      when += buffer.duration + gapMs / 1000
    }
    return true
  } catch {
    return false
  }
}

function speakWithDevice(text) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
  if (!synth) return false
  try {
    synth.cancel()
    // ';' separates moves that get a clear pause (one utterance each).
    for (const move of text.split(/;\s*/)) {
      const u = new SpeechSynthesisUtterance(move)
      u.lang = 'en-US'
      u.rate = 1
      u.volume = 1
      synth.speak(u)
    }
    return true
  } catch {
    return false
  }
}

export async function speakCall(call) {
  if (await playClips(call.moves, call.text.includes(';') ? CLIP_GAP_MS.paused : CLIP_GAP_MS.quick)) return
  speakWithDevice(call.text)
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel()
  } catch {
    // ignore
  }
}

// iOS only allows speech after a tap; call this from the Start button.
export function primeSpeech() {
  preloadVoice()
  try {
    const synth = window.speechSynthesis
    if (!synth) return
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    synth.speak(u)
  } catch {
    // ignore
  }
}

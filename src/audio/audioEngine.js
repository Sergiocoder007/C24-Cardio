// Platform-independent workout audio engine.
//
// Everything that touches the browser (AudioContext constructor, asset loading,
// navigator.audioSession, the clock) is injected so the engine can be exercised
// in Node regression tests with a fake AudioContext.
//
// Lifecycle rules this engine enforces (each one maps to a defect found in the
// original implementation — see AUDIT.md, section C):
//   1. Only one unlock/resume attempt is in flight at a time. While audio is
//      locked, only the most recent cue is remembered, and it is dropped if it
//      is stale when audio comes back — no bursts of old beeps.
//   2. The "currently playing" slot expires by wall clock even if `onended`
//      never fires (it does not fire while a context is suspended), so a stuck
//      high-priority sound can no longer silence every lower-priority cue.
//   3. Finished voices are disconnected from the graph.
//   4. Context state changes are observed. When the OS suspends or interrupts
//      audio and it cannot be resumed without a user gesture, the engine
//      reports `needsGesture` so the UI can ask for a tap.
//   5. `handleUserGesture()` must be called from a real user gesture. It
//      resumes the context, or rebuilds it if resuming has already failed or
//      the context was closed/interrupted.

import { MASTER_GAIN_CAP, SAMPLE_RATE, SOUND_BANK, SOUND_IDS, SOUND_LEVELS, SOUND_PRIORITY } from './soundBank.js'

export const STALE_CUE_MS = 700
export const DEBOUNCE_MS = 150
export const VOICE_SLACK_MS = 80
const MAX_EVENTS = 40

function needsResume(ctx) {
  return ctx.state === 'suspended' || ctx.state === 'interrupted'
}

function pcmToBuffer(ctx, pcm, sampleRate = SAMPLE_RATE) {
  const buffer = ctx.createBuffer(1, pcm.length, sampleRate)
  buffer.getChannelData(0).set(pcm)
  return buffer
}

function safeDisconnect(node) {
  try {
    node?.disconnect()
  } catch {
    // already disconnected
  }
}

export function createWorkoutAudioEngine({
  createContext,
  loadWarningBuffer = null,
  now = () => Date.now(),
  log = () => {},
  setPlaybackSession = () => {},
} = {}) {
  return new WorkoutAudioEngine({ createContext, loadWarningBuffer, now, log, setPlaybackSession })
}

export class WorkoutAudioEngine {
  constructor({ createContext, loadWarningBuffer, now, log, setPlaybackSession }) {
    this.createContextImpl = createContext
    this.loadWarningBuffer = loadWarningBuffer
    this.now = now
    this.log = log
    this.setPlaybackSession = setPlaybackSession

    this.enabled = true
    this.ctx = null
    this.master = null
    this.limiter = null
    this.buffers = new Map()
    this.voice = null // { id, source, gain, endsAt }
    this.lastPlay = { key: null, at: 0 }
    this.pending = null // most recent cue requested while locked
    this.unlocking = null
    this.resumeFailed = false
    this.needsGesture = false
    this.generation = 0
    this.listeners = new Set()
    this.events = []
    this.stats = { played: 0, dropped: 0, stale: 0, rebuilt: 0, startErrors: 0 }
  }

  // ---- observation -------------------------------------------------------

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  status() {
    return {
      enabled: this.enabled,
      state: this.ctx?.state ?? 'none',
      needsGesture: this.enabled && this.needsGesture,
    }
  }

  emit() {
    const snapshot = this.status()
    for (const listener of this.listeners) {
      try {
        listener(snapshot)
      } catch (error) {
        this.log('listener', error)
      }
    }
  }

  record(type, detail) {
    this.events.push({ at: this.now(), type, detail })
    if (this.events.length > MAX_EVENTS) this.events.shift()
  }

  diagnostics() {
    return { ...this.status(), stats: { ...this.stats }, events: [...this.events] }
  }

  setNeedsGesture(value) {
    if (this.needsGesture === value) return
    this.needsGesture = value
    this.record('needs-gesture', value)
    this.emit()
  }

  // ---- context lifecycle -------------------------------------------------

  buildContext() {
    const ctx = this.createContextImpl()
    if (!ctx) return false
    this.generation += 1
    const generation = this.generation
    this.ctx = ctx
    this.buffers = new Map()
    this.voice = null

    this.limiter = ctx.createDynamicsCompressor()
    this.limiter.threshold.value = -8
    this.limiter.knee.value = 6
    this.limiter.ratio.value = 6
    this.limiter.attack.value = 0.003
    this.limiter.release.value = 0.16
    this.master = ctx.createGain()
    this.master.gain.value = MASTER_GAIN_CAP
    this.limiter.connect(this.master)
    this.master.connect(ctx.destination)

    ctx.addEventListener?.('statechange', () => {
      if (generation !== this.generation) return
      this.onStateChange()
    })
    this.record('context-created', ctx.state)
    return true
  }

  onStateChange() {
    const state = this.ctx?.state
    this.record('statechange', state)
    if (state === 'running') {
      this.setPlaybackSession()
      this.resumeFailed = false
      this.setNeedsGesture(false)
      return
    }
    // The OS (or the browser) took audio away mid-workout. The voice slot can
    // no longer be trusted because `onended` will not fire while suspended.
    this.releaseVoice()
    if (state === 'closed') {
      this.setNeedsGesture(this.enabled)
      return
    }
    if (this.enabled && needsResume(this.ctx)) {
      // Try once without a gesture (works on Android/desktop after a focus
      // change). If it does not come back, the UI will ask for a tap.
      void this.unlock()
    }
  }

  teardownContext() {
    const old = this.ctx
    this.releaseVoice()
    this.ctx = null
    this.limiter = null
    this.master = null
    this.buffers = new Map()
    this.unlocking = null
    if (old && old.state !== 'closed') {
      try {
        void Promise.resolve(old.close?.()).catch(() => {})
      } catch {
        // ignore
      }
    }
  }

  resumeContext() {
    const ctx = this.ctx
    if (!ctx) return Promise.resolve(false)
    if (!needsResume(ctx)) return Promise.resolve(ctx.state === 'running')
    let attempt
    try {
      attempt = ctx.resume()
    } catch (error) {
      this.log('resume', error)
      return Promise.resolve(false)
    }
    return Promise.resolve(attempt)
      .then(() => ctx === this.ctx && ctx.state === 'running')
      .catch((error) => {
        this.log('resume', error)
        return false
      })
  }

  // Ensures a running context with primed buffers. Concurrent callers share a
  // single attempt.
  unlock() {
    if (this.unlocking) return this.unlocking
    this.setPlaybackSession()
    if (!this.ctx || this.ctx.state === 'closed') {
      if (!this.buildContext()) return Promise.resolve(false)
    }
    // ctx.resume() is invoked synchronously here so that when unlock() is
    // called from a gesture handler, the resume happens inside the gesture.
    const resumed = this.resumeContext()
    const generation = this.generation
    const attempt = resumed
      .then(async (ok) => {
        if (generation !== this.generation) return false
        if (!ok) {
          this.resumeFailed = true
          this.record('resume-failed', this.ctx?.state)
          this.setNeedsGesture(this.enabled)
          return false
        }
        await this.primeBuffers()
        const running = this.ctx?.state === 'running'
        if (running) {
          this.resumeFailed = false
          this.setNeedsGesture(false)
        }
        return running
      })
      .finally(() => {
        if (this.unlocking === attempt) this.unlocking = null
      })
    this.unlocking = attempt
    return attempt.then((ok) => {
      if (ok) this.flushPending()
      return ok
    })
  }

  // Call from a user gesture (tap/click/key). Recovers from OS suspension or
  // interruption; rebuilds the context when resuming is not enough.
  handleUserGesture() {
    if (!this.enabled) return Promise.resolve(false)
    const ctx = this.ctx
    if (ctx && ctx.state === 'running' && this.buffers.size > 0) return Promise.resolve(true)
    const mustRebuild = ctx && (ctx.state === 'closed' || ctx.state === 'interrupted' || this.resumeFailed)
    if (mustRebuild) {
      this.record('rebuild', ctx.state)
      this.stats.rebuilt += 1
      this.teardownContext()
    }
    // A stuck in-flight attempt (e.g. a resume() promise that never settles
    // without a gesture) must not block this gesture-backed attempt.
    this.unlocking = null
    return this.unlock()
  }

  async primeBuffers() {
    const ctx = this.ctx
    if (!ctx) return
    for (const [id, build] of Object.entries(SOUND_BANK)) {
      if (!this.buffers.has(id)) this.buffers.set(id, pcmToBuffer(ctx, build()))
    }
    if (this.buffers.has(SOUND_IDS.WARN) || !this.loadWarningBuffer) return
    try {
      const buffer = await this.loadWarningBuffer(ctx, pcmToBuffer)
      if (ctx === this.ctx && buffer) this.buffers.set(SOUND_IDS.WARN, buffer)
    } catch (error) {
      this.log('warning-tone', error)
    }
  }

  // ---- playback ----------------------------------------------------------

  setEnabled(enabled) {
    this.enabled = enabled
    if (!enabled) {
      this.stopAll()
      this.pending = null
    }
    this.emit()
  }

  releaseVoice() {
    const voice = this.voice
    if (!voice) return
    this.voice = null
    voice.source.onended = null
    try {
      voice.source.stop()
    } catch {
      // already stopped
    }
    safeDisconnect(voice.source)
    safeDisconnect(voice.gain)
  }

  stopAll() {
    this.releaseVoice()
  }

  isReady(id) {
    return Boolean(this.ctx && this.ctx.state === 'running' && this.buffers.has(id) && this.limiter)
  }

  play(id, { key = id } = {}) {
    if (!this.enabled || !id) return false
    const at = this.now()
    if (this.lastPlay.key === key && at - this.lastPlay.at < DEBOUNCE_MS) return false

    if (!this.isReady(id)) {
      // Remember only the latest request; replay it only if still fresh.
      this.pending = { id, key, at }
      void this.unlock()
      return false
    }
    return this.startVoice(id, key, at)
  }

  flushPending() {
    const pending = this.pending
    this.pending = null
    if (!pending || !this.enabled) return
    if (this.now() - pending.at > STALE_CUE_MS) {
      this.stats.stale += 1
      this.record('stale-cue', pending.key)
      return
    }
    if (this.isReady(pending.id)) this.startVoice(pending.id, pending.key, pending.at)
  }

  startVoice(id, key, at) {
    this.setPlaybackSession()
    const current = this.voice
    if (current) {
      const expired = at >= current.endsAt
      const rank = SOUND_PRIORITY[id] ?? 0
      const currentRank = SOUND_PRIORITY[current.id] ?? 0
      if (!expired && rank < currentRank) {
        this.stats.dropped += 1
        return false
      }
      this.releaseVoice()
    }

    const buffer = this.buffers.get(id)
    const source = this.ctx.createBufferSource()
    const gain = this.ctx.createGain()
    gain.gain.value = Math.min(1, SOUND_LEVELS[id] ?? 0.5)
    source.buffer = buffer
    source.connect(gain)
    gain.connect(this.limiter)

    const voice = {
      id,
      source,
      gain,
      endsAt: at + Math.ceil((buffer.duration ?? 0) * 1000) + VOICE_SLACK_MS,
    }
    source.onended = () => {
      safeDisconnect(source)
      safeDisconnect(gain)
      if (this.voice === voice) this.voice = null
    }
    this.voice = voice
    this.lastPlay = { key, at }
    try {
      source.start()
      this.stats.played += 1
      return true
    } catch (error) {
      this.stats.startErrors += 1
      this.log('start', error)
      this.record('start-error', String(error?.message ?? error))
      if (this.voice === voice) this.voice = null
      safeDisconnect(source)
      safeDisconnect(gain)
      return false
    }
  }
}

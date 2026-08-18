import { MASTER_GAIN_CAP, SAMPLE_RATE, SOUND_BANK, SOUND_IDS, SOUND_LEVELS, SOUND_PRIORITY } from './soundBank'
import warningToneUrl from '../assets/warning-10s.wav?url'
import { generateWarningToneSamples, WARNING_TONE_SAMPLE_RATE } from './warningToneAsset.js'

function createContext() {
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  return new Ctor()
}

function pcmToBuffer(ctx, pcm, sampleRate = SAMPLE_RATE) {
  const buffer = ctx.createBuffer(1, pcm.length, sampleRate)
  buffer.getChannelData(0).set(pcm)
  return buffer
}

class WorkoutAudio {
  constructor() {
    this.enabled = true
    this.ctx = null
    this.buffers = new Map()
    this.current = null
    this.currentId = null
    this.master = null
    this.limiter = null
    this.lastPlay = { id: null, at: 0, key: null }
  }

  setEnabled(enabled) {
    this.enabled = enabled
    if (!enabled) this.stopAll()
  }

  connectGraph() {
    this.limiter = this.ctx.createDynamicsCompressor()
    this.limiter.threshold.value = -8
    this.limiter.knee.value = 6
    this.limiter.ratio.value = 6
    this.limiter.attack.value = 0.003
    this.limiter.release.value = 0.16
    this.master = this.ctx.createGain()
    this.master.gain.value = MASTER_GAIN_CAP
    this.limiter.connect(this.master)
    this.master.connect(this.ctx.destination)
  }

  async unlock() {
    if (!this.ctx) {
      this.ctx = createContext()
      if (!this.ctx) return false
      this.connectGraph()
    }
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume()
      } catch {
        return false
      }
    }
    await this.primeBuffers()
    return this.ctx.state === 'running'
  }

  async primeBuffers() {
    if (!this.ctx) return
    for (const [id, build] of Object.entries(SOUND_BANK)) {
      if (!this.buffers.has(id)) this.buffers.set(id, pcmToBuffer(this.ctx, build()))
    }
    if (this.buffers.has(SOUND_IDS.WARN)) return
    try {
      const response = await fetch(warningToneUrl)
      const data = await response.arrayBuffer()
      const decoded = await this.ctx.decodeAudioData(data.slice(0))
      this.buffers.set(SOUND_IDS.WARN, decoded)
    } catch {
      this.buffers.set(
        SOUND_IDS.WARN,
        pcmToBuffer(this.ctx, generateWarningToneSamples(), WARNING_TONE_SAMPLE_RATE),
      )
    }
  }

  stop() {
    if (!this.current) return
    try {
      this.current.onended = null
      this.current.stop()
    } catch {
      // already stopped
    }
    this.current = null
    this.currentId = null
  }

  stopAll() {
    this.stop()
  }

  play(id, { key = id } = {}) {
    if (!this.enabled || !id) return
    const now = Date.now()
    if (this.lastPlay.key === key && now - this.lastPlay.at < 150) return

    if (!this.ctx || this.ctx.state === 'suspended' || !this.buffers.has(id)) {
      void this.unlock().then((ok) => {
        if (ok) this.play(id, { key })
      })
      return
    }

    if (this.current) {
      const currentRank = SOUND_PRIORITY[this.currentId] ?? 0
      const nextRank = SOUND_PRIORITY[id] ?? 0
      if (nextRank < currentRank) return
      this.stop()
    }

    const buffer = this.buffers.get(id)
    if (!buffer || !this.limiter) return

    const source = this.ctx.createBufferSource()
    const voice = this.ctx.createGain()
    voice.gain.value = Math.min(1, SOUND_LEVELS[id] ?? 0.5)
    source.buffer = buffer
    source.connect(voice)
    voice.connect(this.limiter)
    source.onended = () => {
      if (this.current === source) {
        this.current = null
        this.currentId = null
      }
    }
    this.current = source
    this.currentId = id
    this.lastPlay = { id, at: Date.now(), key }
    try {
      source.start()
    } catch {
      this.current = null
      this.currentId = null
    }
  }
}

export const workoutAudio = new WorkoutAudio()

export function unlockWorkoutAudio() {
  return workoutAudio.unlock()
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

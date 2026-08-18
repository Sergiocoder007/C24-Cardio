const RATE = 22050
export const SAMPLE_RATE = RATE
export const MASTER_GAIN_CAP = 0.84

function clamp(value) {
  return Math.max(-1, Math.min(1, value))
}

function tone(freq, seconds, { gain = 0.5, decay = 8, type = 'sine' } = {}) {
  const n = Math.floor(RATE * seconds)
  const samples = new Float32Array(n)
  for (let i = 0; i < n; i += 1) {
    const t = i / RATE
    const env = Math.exp(-decay * t) * (1 - i / n)
    const phase = 2 * Math.PI * freq * t
    const wave =
      type === 'square'
        ? Math.sign(Math.sin(phase) || 1)
        : type === 'triangle'
          ? (2 / Math.PI) * Math.asin(Math.sin(phase))
          : Math.sin(phase)
    samples[i] = clamp(wave * gain * env)
  }
  return samples
}

function mix(parts) {
  const length = Math.max(...parts.map((part) => part.length))
  const samples = new Float32Array(length)
  for (const part of parts) {
    for (let i = 0; i < part.length; i += 1) samples[i] += part[i]
  }
  for (let i = 0; i < length; i += 1) samples[i] = clamp(samples[i])
  return samples
}

function concat(parts, gapMs = 0) {
  const gap = Math.floor((gapMs / 1000) * RATE)
  const length = parts.reduce((sum, part) => sum + part.length, 0) + gap * Math.max(0, parts.length - 1)
  const samples = new Float32Array(length)
  let offset = 0
  parts.forEach((part, index) => {
    samples.set(part, offset)
    offset += part.length
    if (index < parts.length - 1) offset += gap
  })
  return samples
}

function tick() {
  return mix([
    tone(1480, 0.13, { gain: 0.98, decay: 16, type: 'square' }),
    tone(2960, 0.09, { gain: 0.42, decay: 20 }),
    tone(740, 0.11, { gain: 0.5, decay: 18 }),
  ])
}

function roundBeep() {
  return mix([
    tone(880, 1.35, { gain: 1, decay: 1.35 }),
    tone(1760, 1.15, { gain: 0.62, decay: 1.7 }),
    tone(440, 1.25, { gain: 0.7, decay: 1.45, type: 'triangle' }),
    tone(220, 0.18, { gain: 0.8, decay: 14, type: 'square' }),
  ])
}

function victory() {
  return concat(
    [
      mix([
        tone(392, 0.7, { gain: 0.85, decay: 2.2, type: 'triangle' }),
        tone(784, 0.65, { gain: 0.7, decay: 2.4 }),
      ]),
      mix([
        tone(523, 0.75, { gain: 0.9, decay: 2 }),
        tone(1046, 0.7, { gain: 0.55, decay: 2.3 }),
      ]),
      mix([
        tone(659, 1.15, { gain: 1, decay: 1.7 }),
        tone(988, 1.1, { gain: 0.62, decay: 1.9 }),
        tone(1319, 1.0, { gain: 0.38, decay: 2.2 }),
        tone(330, 1.2, { gain: 0.55, decay: 1.8, type: 'triangle' }),
      ]),
    ],
    90,
  )
}

export const SOUND_IDS = {
  WARN: 'warn',
  TICK: 'tick',
  BELL: 'bell',
  COMPLETE: 'complete',
}

export const SOUND_LEVELS = {
  [SOUND_IDS.COMPLETE]: 1,
  [SOUND_IDS.BELL]: 1,
  [SOUND_IDS.WARN]: 0.96,
  [SOUND_IDS.TICK]: 0.78,
}

export const SOUND_BANK = {
  [SOUND_IDS.TICK]: tick,
  [SOUND_IDS.BELL]: roundBeep,
  [SOUND_IDS.COMPLETE]: victory,
}

export const SOUND_PRIORITY = {
  [SOUND_IDS.TICK]: 5,
  [SOUND_IDS.WARN]: 6,
  [SOUND_IDS.BELL]: 8,
  [SOUND_IDS.COMPLETE]: 10,
}

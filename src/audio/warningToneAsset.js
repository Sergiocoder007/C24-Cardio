const SAMPLE_RATE = 44100
const DURATION = 0.5

export function generateWarningToneSamples() {
  const n = Math.floor(SAMPLE_RATE * DURATION)
  const samples = new Float32Array(n)
  const modes = [
    { f: 1043, a: 1, d: 5.8 },
    { f: 1568, a: 0.74, d: 6.9 },
    { f: 2095, a: 0.5, d: 8.4 },
    { f: 3130, a: 0.3, d: 10.5 },
    { f: 4186, a: 0.16, d: 13 },
    { f: 522, a: 0.38, d: 5.2 },
  ]

  for (let i = 0; i < n; i += 1) {
    const t = i / SAMPLE_RATE
    const attack = t < 0.0025 ? t / 0.0025 : 1
    const finish = Math.max(0, 1 - t / DURATION) ** 1.35
    let value = 0
    for (const mode of modes) {
      value += mode.a * Math.sin(2 * Math.PI * mode.f * t) * Math.exp(-mode.d * t)
    }
    if (t < 0.0035) {
      const strike = 1 - t / 0.0035
      value +=
        Math.sin(2 * Math.PI * 6200 * t) * 0.32 * strike +
        Math.sin(2 * Math.PI * 9100 * t) * 0.18 * strike
    }
    samples[i] = value * attack * finish
  }

  let peak = 0
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample))
  const gain = peak > 0 ? 0.97 / peak : 1
  for (let i = 0; i < n; i += 1) samples[i] *= gain
  return samples
}

export function createWarningToneWavBuffer() {
  const samples = generateWarningToneSamples()
  const dataBytes = samples.length * 2
  const bytes = new Uint8Array(44 + dataBytes)
  const view = new DataView(bytes.buffer)
  const ascii = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) bytes[offset + i] = text.charCodeAt(i)
  }

  ascii(0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  ascii(36, 'data')
  view.setUint32(40, dataBytes, true)

  for (let i = 0; i < samples.length; i += 1) {
    const clipped = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, Math.round(clipped * 32767), true)
  }

  return bytes.buffer
}

export const WARNING_TONE_DURATION_SEC = DURATION
export const WARNING_TONE_SAMPLE_RATE = SAMPLE_RATE

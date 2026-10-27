// Renders the app's synthesized workout sounds to WAV files for the native
// Android service, so locked-screen sounds are identical to in-app sounds.
// Usage: node scripts/generate-native-sounds.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MASTER_GAIN_CAP, SAMPLE_RATE, SOUND_BANK, SOUND_IDS, SOUND_LEVELS } from '../src/audio/soundBank.js'
import { generateWarningToneSamples, WARNING_TONE_SAMPLE_RATE } from '../src/audio/warningToneAsset.js'

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'plugins', 'workout-timer', 'android', 'src', 'main', 'res', 'raw')
mkdirSync(out, { recursive: true })

function wav(samples, rate, gain) {
  const bytes = new Uint8Array(44 + samples.length * 2)
  const view = new DataView(bytes.buffer)
  const ascii = (o, s) => [...s].forEach((c, i) => (bytes[o + i] = c.charCodeAt(0)))
  ascii(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); ascii(8, 'WAVE')
  ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  ascii(36, 'data'); view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i += 1) {
    const v = Math.max(-1, Math.min(1, samples[i] * gain))
    view.setInt16(44 + i * 2, Math.round(v * 32767), true)
  }
  return bytes
}

const sounds = {
  [SOUND_IDS.TICK]: [SOUND_BANK[SOUND_IDS.TICK](), SAMPLE_RATE],
  [SOUND_IDS.BELL]: [SOUND_BANK[SOUND_IDS.BELL](), SAMPLE_RATE],
  [SOUND_IDS.COMPLETE]: [SOUND_BANK[SOUND_IDS.COMPLETE](), SAMPLE_RATE],
  [SOUND_IDS.WARN]: [generateWarningToneSamples(), WARNING_TONE_SAMPLE_RATE],
}

for (const [id, [samples, rate]] of Object.entries(sounds)) {
  const gain = Math.min(1, SOUND_LEVELS[id] ?? 0.5) * MASTER_GAIN_CAP
  const file = join(out, `c24_${id}.wav`)
  writeFileSync(file, wav(samples, rate, gain))
  console.log(`wrote ${file} (${samples.length} samples @ ${rate} Hz)`)
}

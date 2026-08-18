import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createWarningToneWavBuffer } from '../src/audio/warningToneAsset.js'

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'warning-10s.wav')
writeFileSync(out, Buffer.from(createWarningToneWavBuffer()))
console.log(`wrote ${out}`)

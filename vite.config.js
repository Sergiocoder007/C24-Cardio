import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { createWarningToneWavBuffer } from './src/audio/warningToneAsset.js'

const warningPath = fileURLToPath(new URL('./src/assets/warning-10s.wav', import.meta.url))
writeFileSync(warningPath, Buffer.from(createWarningToneWavBuffer()))

export default defineConfig({
  // GitHub Pages serves the web app under /C24-Cardio/; the Android app uses /.
  base: process.env.PAGES_BASE || '/',
  plugins: [react()],
})

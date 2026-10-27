// Writes COMBOS.md (review document) from src/training/combos.js.
// Usage: node scripts/combos-doc.mjs
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { COMBOS, LEVELS, MOVES } from '../src/training/combos.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const STYLE_NAMES = { boxing: 'Boxing', muaythai: 'Muay Thai' }
const LEVEL_NOTES = {
  beginner: '1–3 moves. Basic punches, simple kicks and knees.',
  intermediate: '3–4 moves. Adds body shots, defence (slip, roll, block, check) and switch techniques.',
  advanced: '4–6 moves. Longer chains mixing punches, kicks, elbows, defence and footwork.',
}
const say = (combo) => combo.map((id) => MOVES[id].say).join(', ')

let md = `# C24 Cardio — Training mode combo library (proposed)

**Status: proposed, waiting for review.** Edit, delete or add combos and send the list back;
nothing here is final.

- 12 combos per style per level (72 total). "Both" mixes the Boxing and Muay Thai lists.
- Orthodox stance: *hook* = lead hook, *rear hook* = right hook, *uppercut* = lead uppercut.
- During a work round a combo is called every 5, 8 or 12 seconds (your choice). Combos too long to
  say within the chosen pace are skipped at that pace, and no call overlaps a beep, the 10-second
  warning, a bell, or rest.

`
for (const style of Object.keys(COMBOS)) {
  md += `## ${STYLE_NAMES[style]}\n\n`
  for (const level of LEVELS) {
    md += `### ${level[0].toUpperCase() + level.slice(1)}\n\n${LEVEL_NOTES[level]}\n\n`
    COMBOS[style][level].forEach((combo, i) => {
      md += `${i + 1}. ${say(combo)}\n`
    })
    md += '\n'
  }
}

md += `## Voice clips for ElevenLabs (later)

One clip per move, same voice and settings for all. Export MP3, trim silence at both ends, and
name each file exactly as below. They go in \`public/voice/\` with a \`manifest.json\`
(see \`src/training/voice.js\`).

| File | Say |
| --- | --- |
`
for (const [id, m] of Object.entries(MOVES)) md += `| \`${id}.mp3\` | ${m.say} |\n`

writeFileSync(join(root, 'COMBOS.md'), md)
console.log(`wrote COMBOS.md (${Object.keys(MOVES).length} moves)`)

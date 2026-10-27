// Writes COMBOS.md (review document) and public/voice/manifest.example.json
// from src/training/combos.js, so the list, the on-screen text and the voice
// clip names always match.
// Usage: node scripts/combos-doc.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { COMBOS, LEVELS, MOVES, PACES } from '../src/training/combos.js'
import { estimateSpeechMs, throwMs } from '../src/training/schedule.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const STYLE_NAMES = { boxing: 'Boxing', muaythai: 'Muay Thai' }
const LEVEL_NAMES = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }
const LEVEL_NOTES = {
  boxing: {
    beginner: '1–3 moves: jab, cross, lead hook, one uppercut, one body shot.',
    intermediate: '3–4 moves: body-to-head combinations, both uppercuts, slip, roll and block.',
    advanced: '4–6 moves: longer chains that alternate hands, with defence and footwork.',
  },
  muaythai: {
    beginner: '1–3 moves: punches, teeps, rear-leg kicks and the rear knee. No elbows, clinch or switch techniques.',
    intermediate: '3–4 moves: switch kicks and knees, elbows, checks and the clinch.',
    advanced: '4–6 moves: kicks to all three levels, elbows into knees, alternating sides.',
  },
}
const say = (combo) => combo.map((id) => MOVES[id].say).join(', ')

let md = `# C24 Cardio — Training mode combo library

**Status: revised, awaiting final approval.** The structure is unchanged: Boxing and Muay Thai,
Beginner / Intermediate / Advanced, 12 combos each (72 total). "Both" mixes the two lists.

## Terminology

Orthodox stance. The same words are used for the spoken call, the on-screen text and the voice
clip file name.

| Call | Meaning |
| --- | --- |
| Jab / Cross | Lead / rear straight |
| Double jab | Two jabs |
| Hook / Rear hook | Lead hook, unless "rear" is said |
| Lead uppercut / Rear uppercut | Uppercuts always name the side |
| Jab to body / Hook to body | The same punch aimed at the body |
| Overhand | Rear overhand |
| Teep / Rear teep | Lead push kick, unless "rear" is said |
| Low kick / Body kick / Head kick | Rear-leg roundhouse kick at that level |
| Switch kick | Lead-leg roundhouse after a quick stance switch |
| Knee / Switch knee | Rear knee / lead knee after a switch |
| Lead elbow / Rear elbow | Elbows always name the side |
| Check | Lift the lead shin to block a kick |
| Slip / Roll / Block | Head movement and guard |
| Pivot / Step back | Footwork to reset the angle or distance |
| Clinch | Tie up before knees |

## What changed since the first draft

- **Clearer calls:** "Body jab" is now "Jab to body", "Body hook" is now "Hook to body", and every
  uppercut and elbow names its side ("Lead uppercut", "Rear elbow"). "Jab, Jab" is now "Double jab".
- **Muay Thai Beginner kept simple:** elbows, the double knee and the switch kick moved out to
  Intermediate. Replacements: Jab, Low kick · Low kick, Cross · Jab, Hook, Body kick ·
  Double jab, Low kick.
- **Kick set-ups:** a rear-leg kick straight after a cross means kicking off the same side that just
  punched, so those combos now set the kick up with a hook (Jab, Hook, Low kick · Double jab, Hook,
  Low kick · Cross, Hook, Head kick) or follow the cross with a lead-leg switch kick.
- **Natural flow:** body shots now go body-then-head (Hook to body, Hook, Cross); rolls are answered
  with a counter (Jab, Cross, Roll, Hook); Advanced clinch work ends with a teep to make space.
- **Advanced stays challenging, not cluttered:** no more than 6 moves, and never two kicks or knees
  off the same leg back to back (two teeps changed to rear teeps for this).

## How calls are timed

- A call only starts if the full call is spoken **and** there is time to throw it before the next
  call: at least 1.2 s, or 0.3 s per strike for longer combos.
- No call overlaps a countdown beep, the 10-second warning, a bell, rest, the intro or the "next
  round" announcement (0.5 s of silence is kept either side of every beep). If nothing fits, the
  slot is skipped.
- The same combo is never called twice in a row.

`
// Which combos are skipped at each pace, computed from the scheduler itself.
md += '### Combos skipped at each pace\n\n'
let any = false
for (const pace of PACES) {
  const skipped = []
  for (const style of Object.keys(COMBOS)) {
    for (const level of LEVELS) {
      for (const combo of COMBOS[style][level]) {
        if (estimateSpeechMs(combo, pace >= 8) + throwMs(combo) > pace * 1000) {
          skipped.push(`${STYLE_NAMES[style]} ${LEVEL_NAMES[level]}: ${say(combo)}`)
        }
      }
    }
  }
  if (skipped.length) {
    any = true
    md += `**Every ${pace} s:** ${skipped.length} combo${skipped.length === 1 ? '' : 's'} too long to call and throw, skipped at this pace:\n\n`
    for (const s of skipped) md += `- ${s}\n`
    md += '\n'
  } else {
    md += `**Every ${pace} s:** all 72 combos fit.\n\n`
  }
}
if (!any) md += 'All combos fit at every pace.\n\n'

for (const style of Object.keys(COMBOS)) {
  md += `## ${STYLE_NAMES[style]}\n\n`
  for (const level of LEVELS) {
    md += `### ${LEVEL_NAMES[level]}\n\n${LEVEL_NOTES[style][level]}\n\n`
    COMBOS[style][level].forEach((combo, i) => {
      md += `${i + 1}. ${say(combo)}\n`
    })
    md += '\n'
  }
}

md += `## Voice clips for ElevenLabs

One clip per move, the same voice and settings for all. Export MP3, trim silence at both ends, and
name each file exactly as below. They go in \`public/voice/\` together with \`manifest.json\`
(copy \`public/voice/manifest.example.json\`, which is generated from this list).

| File | Say |
| --- | --- |
`
for (const [id, m] of Object.entries(MOVES)) md += `| \`${id}.mp3\` | ${m.say} |\n`

writeFileSync(join(root, 'COMBOS.md'), md)

// Clip manifest template, generated from the same move list so file names never drift.
const manifest = Object.fromEntries(Object.keys(MOVES).map((id) => [id, `${id}.mp3`]))
mkdirSync(join(root, 'public', 'voice'), { recursive: true })
writeFileSync(join(root, 'public', 'voice', 'manifest.example.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`wrote COMBOS.md and public/voice/manifest.example.json (${Object.keys(MOVES).length} moves)`)

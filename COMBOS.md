# C24 Cardio — Training mode combo library

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
  call: at least 1.2 s, or 0.3 s per strike for longer combos. At 8 s and 12 s each move is
  called separately with a short pause; at 5 s the combo is one quick phrase.
- No call overlaps a countdown beep, the 10-second warning, a bell, rest, the intro or the "next
  round" announcement (0.5 s of silence is kept either side of every beep). If nothing fits, the
  slot is skipped.
- The same combo is never called twice in a row.

### Combos longer than the pace

**Every 5 s:** 25 combos longer than the pace; the next call waits until they are thrown:

- Boxing Intermediate: Jab, Cross, Lead uppercut, Cross
- Boxing Advanced: Jab, Cross, Hook, Roll, Hook, Cross
- Boxing Advanced: Slip, Slip, Cross, Hook, Rear uppercut
- Boxing Advanced: Jab, Hook to body, Hook, Cross, Pivot
- Boxing Advanced: Double jab, Overhand, Hook, Rear uppercut
- Boxing Advanced: Jab, Cross, Lead uppercut, Rear hook, Step back
- Boxing Advanced: Hook, Rear uppercut, Hook, Cross
- Boxing Advanced: Jab to body, Cross, Hook to body, Hook, Cross
- Boxing Advanced: Jab, Cross, Roll, Cross, Hook, Cross
- Boxing Advanced: Slip, Rear uppercut, Hook, Cross, Roll
- Boxing Advanced: Double jab, Cross, Hook, Rear uppercut, Hook
- Boxing Advanced: Block, Cross, Hook, Cross, Pivot
- Boxing Advanced: Overhand, Hook to body, Hook, Rear uppercut
- Muay Thai Advanced: Jab, Cross, Hook, Low kick, Hook, Head kick
- Muay Thai Advanced: Rear teep, Switch kick, Cross, Hook, Low kick
- Muay Thai Advanced: Double jab, Cross, Switch knee, Rear elbow
- Muay Thai Advanced: Check, Cross, Hook, Body kick, Teep
- Muay Thai Advanced: Jab, Cross, Lead elbow, Rear elbow, Knee
- Muay Thai Advanced: Low kick, Hook, Cross, Switch kick
- Muay Thai Advanced: Clinch, Knee, Switch knee, Lead elbow, Teep
- Muay Thai Advanced: Jab, Switch kick, Cross, Hook, Head kick
- Muay Thai Advanced: Rear teep, Jab, Cross, Hook, Body kick
- Muay Thai Advanced: Hook, Cross, Hook, Low kick, Cross
- Muay Thai Advanced: Slip, Cross, Lead elbow, Knee, Teep
- Muay Thai Advanced: Jab, Cross, Hook, Cross, Switch kick, Rear teep

**Every 8 s:** 4 combos longer than the pace; the next call waits until they are thrown:

- Boxing Advanced: Jab, Cross, Hook, Roll, Hook, Cross
- Boxing Advanced: Jab, Cross, Roll, Cross, Hook, Cross
- Muay Thai Advanced: Jab, Cross, Hook, Low kick, Hook, Head kick
- Muay Thai Advanced: Jab, Cross, Hook, Cross, Switch kick, Rear teep

**Every 12 s:** all 72 combos fit.

## Boxing

### Beginner

1–3 moves: jab, cross, lead hook, one uppercut, one body shot.

1. Jab
2. Double jab
3. Jab, Cross
4. Double jab, Cross
5. Jab, Cross, Hook
6. Cross, Hook, Cross
7. Jab, Rear uppercut
8. Jab, Cross, Jab
9. Hook, Cross
10. Jab, Jab to body
11. Cross, Hook
12. Jab, Cross, Lead uppercut

### Intermediate

3–4 moves: body-to-head combinations, both uppercuts, slip, roll and block.

1. Jab, Cross, Hook, Cross
2. Jab, Hook to body, Hook
3. Double jab, Cross, Hook
4. Slip, Cross, Hook, Cross
5. Jab, Cross, Roll, Hook
6. Rear uppercut, Hook, Cross
7. Jab, Cross, Lead uppercut, Cross
8. Jab to body, Jab, Cross
9. Hook to body, Hook, Cross
10. Jab, Rear uppercut, Hook
11. Cross, Hook, Rear uppercut
12. Jab, Cross, Block, Cross

### Advanced

4–6 moves: longer chains that alternate hands, with defence and footwork.

1. Jab, Cross, Hook, Roll, Hook, Cross
2. Slip, Slip, Cross, Hook, Rear uppercut
3. Jab, Hook to body, Hook, Cross, Pivot
4. Double jab, Overhand, Hook, Rear uppercut
5. Jab, Cross, Lead uppercut, Rear hook, Step back
6. Hook, Rear uppercut, Hook, Cross
7. Jab to body, Cross, Hook to body, Hook, Cross
8. Jab, Cross, Roll, Cross, Hook, Cross
9. Slip, Rear uppercut, Hook, Cross, Roll
10. Double jab, Cross, Hook, Rear uppercut, Hook
11. Block, Cross, Hook, Cross, Pivot
12. Overhand, Hook to body, Hook, Rear uppercut

## Muay Thai

### Beginner

1–3 moves: punches, teeps, rear-leg kicks and the rear knee. No elbows, clinch or switch techniques.

1. Teep
2. Jab, Teep
3. Jab, Hook, Low kick
4. Cross, Hook, Low kick
5. Jab, Body kick
6. Jab, Low kick
7. Low kick, Cross
8. Jab, Cross, Knee
9. Teep, Cross
10. Hook, Body kick
11. Jab, Hook, Body kick
12. Double jab, Low kick

### Intermediate

3–4 moves: switch kicks and knees, elbows, checks and the clinch.

1. Jab, Cross, Hook, Low kick
2. Teep, Cross, Hook, Body kick
3. Jab, Switch kick, Cross
4. Check, Cross, Hook
5. Lead elbow, Rear elbow, Knee
6. Jab, Cross, Switch knee
7. Double jab, Hook, Low kick
8. Cross, Hook, Head kick
9. Clinch, Knee, Switch knee
10. Rear teep, Jab, Cross, Hook
11. Jab, Hook, Low kick, Cross
12. Cross, Lead elbow, Knee

### Advanced

4–6 moves: kicks to all three levels, elbows into knees, alternating sides.

1. Jab, Cross, Hook, Low kick, Hook, Head kick
2. Rear teep, Switch kick, Cross, Hook, Low kick
3. Double jab, Cross, Switch knee, Rear elbow
4. Check, Cross, Hook, Body kick, Teep
5. Jab, Cross, Lead elbow, Rear elbow, Knee
6. Low kick, Hook, Cross, Switch kick
7. Clinch, Knee, Switch knee, Lead elbow, Teep
8. Jab, Switch kick, Cross, Hook, Head kick
9. Rear teep, Jab, Cross, Hook, Body kick
10. Hook, Cross, Hook, Low kick, Cross
11. Slip, Cross, Lead elbow, Knee, Teep
12. Jab, Cross, Hook, Cross, Switch kick, Rear teep

## Voice clips for ElevenLabs

One clip per move, the same voice and settings for all. Export MP3, trim silence at both ends, and
name each file exactly as below. They go in `public/voice/` together with `manifest.json`
(copy `public/voice/manifest.example.json`, which is generated from this list).

| File | Say |
| --- | --- |
| `jab.mp3` | Jab |
| `double-jab.mp3` | Double jab |
| `cross.mp3` | Cross |
| `hook.mp3` | Hook |
| `rear-hook.mp3` | Rear hook |
| `lead-uppercut.mp3` | Lead uppercut |
| `rear-uppercut.mp3` | Rear uppercut |
| `jab-body.mp3` | Jab to body |
| `hook-body.mp3` | Hook to body |
| `overhand.mp3` | Overhand |
| `slip.mp3` | Slip |
| `roll.mp3` | Roll |
| `block.mp3` | Block |
| `pivot.mp3` | Pivot |
| `step-back.mp3` | Step back |
| `teep.mp3` | Teep |
| `rear-teep.mp3` | Rear teep |
| `low-kick.mp3` | Low kick |
| `body-kick.mp3` | Body kick |
| `head-kick.mp3` | Head kick |
| `switch-kick.mp3` | Switch kick |
| `knee.mp3` | Knee |
| `switch-knee.mp3` | Switch knee |
| `lead-elbow.mp3` | Lead elbow |
| `rear-elbow.mp3` | Rear elbow |
| `check.mp3` | Check |
| `clinch.mp3` | Clinch |

# C24 Cardio — Training mode combo library (proposed)

**Status: proposed, waiting for review.** Edit, delete or add combos and send the list back;
nothing here is final.

- 12 combos per style per level (72 total). "Both" mixes the Boxing and Muay Thai lists.
- Orthodox stance: *hook* = lead hook, *rear hook* = right hook, *uppercut* = lead uppercut.
- During a work round a combo is called every 5, 8 or 12 seconds (your choice). Combos too long to
  say within the chosen pace are skipped at that pace, and no call overlaps a beep, the 10-second
  warning, a bell, or rest.

## Boxing

### Beginner

1–3 moves. Basic punches, simple kicks and knees.

1. Jab
2. Double jab
3. Jab, Cross
4. Double jab, Cross
5. Jab, Cross, Hook
6. Cross, Hook, Cross
7. Jab, Uppercut
8. Jab, Cross, Jab
9. Hook, Cross
10. Jab, Body jab
11. Cross, Hook
12. Jab, Cross, Uppercut

### Intermediate

3–4 moves. Adds body shots, defence (slip, roll, block, check) and switch techniques.

1. Jab, Cross, Hook, Cross
2. Jab, Body hook, Hook
3. Double jab, Cross, Hook
4. Slip, Cross, Hook, Cross
5. Jab, Cross, Roll, Cross
6. Uppercut, Hook, Cross
7. Jab, Cross, Uppercut, Hook
8. Body jab, Jab, Cross
9. Hook, Body hook, Cross
10. Jab, Rear uppercut, Hook
11. Cross, Hook, Rear uppercut
12. Jab, Cross, Block, Cross

### Advanced

4–6 moves. Longer chains mixing punches, kicks, elbows, defence and footwork.

1. Jab, Cross, Hook, Roll, Hook, Cross
2. Slip, Slip, Cross, Hook, Uppercut
3. Jab, Body hook, Hook, Cross, Pivot
4. Double jab, Overhand, Hook, Uppercut
5. Jab, Cross, Uppercut, Rear hook, Step back
6. Hook, Rear uppercut, Hook, Cross
7. Body jab, Cross, Hook, Body hook, Hook
8. Jab, Cross, Roll, Cross, Hook, Cross
9. Slip, Uppercut, Hook, Cross, Roll
10. Jab, Jab, Cross, Hook, Rear uppercut, Hook
11. Block, Cross, Hook, Cross, Pivot
12. Overhand, Hook, Body hook, Uppercut

## Muay Thai

### Beginner

1–3 moves. Basic punches, simple kicks and knees.

1. Teep
2. Jab, Teep
3. Jab, Cross, Low kick
4. Cross, Hook, Low kick
5. Jab, Body kick
6. Knee, Knee
7. Low kick, Low kick
8. Jab, Cross, Knee
9. Teep, Cross
10. Hook, Body kick
11. Jab, Elbow
12. Cross, Switch kick

### Intermediate

3–4 moves. Adds body shots, defence (slip, roll, block, check) and switch techniques.

1. Jab, Cross, Hook, Low kick
2. Teep, Cross, Body kick
3. Jab, Switch kick
4. Check, Cross, Body kick
5. Elbow, Rear elbow, Knee
6. Jab, Cross, Switch knee
7. Double jab, Cross, Low kick
8. Hook, Cross, Head kick
9. Clinch, Knee, Knee, Elbow
10. Rear teep, Jab, Cross, Hook
11. Jab, Hook, Low kick, Cross
12. Cross, Elbow, Knee

### Advanced

4–6 moves. Longer chains mixing punches, kicks, elbows, defence and footwork.

1. Jab, Cross, Hook, Low kick, Cross, Head kick
2. Teep, Switch kick, Cross, Hook, Low kick
3. Double jab, Cross, Switch knee, Elbow
4. Check, Hook, Cross, Body kick, Teep
5. Jab, Cross, Elbow, Rear elbow, Knee
6. Low kick, Cross, Hook, Switch kick
7. Clinch, Knee, Switch knee, Elbow, Teep
8. Jab, Switch kick, Cross, Hook, Head kick
9. Rear teep, Cross, Hook, Body kick, Step back
10. Hook, Cross, Low kick, Low kick, Cross
11. Slip, Cross, Elbow, Knee, Teep
12. Jab, Cross, Hook, Cross, Switch kick, Teep

## Voice clips for ElevenLabs (later)

One clip per move, same voice and settings for all. Export MP3, trim silence at both ends, and
name each file exactly as below. They go in `public/voice/` with a `manifest.json`
(see `src/training/voice.js`).

| File | Say |
| --- | --- |
| `jab.mp3` | Jab |
| `double-jab.mp3` | Double jab |
| `cross.mp3` | Cross |
| `hook.mp3` | Hook |
| `rear-hook.mp3` | Rear hook |
| `uppercut.mp3` | Uppercut |
| `rear-uppercut.mp3` | Rear uppercut |
| `body-jab.mp3` | Body jab |
| `body-hook.mp3` | Body hook |
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
| `elbow.mp3` | Elbow |
| `rear-elbow.mp3` | Rear elbow |
| `check.mp3` | Check |
| `clinch.mp3` | Clinch |

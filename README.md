# C24 Cardio

Round timer for combat conditioning: rounds, work and rest, sound cues, and on-device
history with progress and streaks. React + Vite web app, wrapped with Capacitor for
iOS and Android.

## Develop

Requires Node.js 22+.

```bash
npm install
npm run dev      # web app at http://localhost:5173
npm test         # timer, history/streak and audio regression tests
npm run lint
npm run build    # production build in dist/
```

## Project layout

| Path | What it does |
| --- | --- |
| `src/workoutEngine.js` | Pure timer state machine (intro → work → rest → next round → complete) |
| `src/useWorkoutTimer.js` | Drives the engine with requestAnimationFrame |
| `src/audio/audioEngine.js` | Web Audio engine: playback, priorities, OS-suspension recovery |
| `src/audio/workoutCues.js` | Decides which sound plays when (10s warning, 5–1 ticks, bells) |
| `src/history.js` | Saved workouts, totals, best day, records, streaks |
| `src/keepAwake.js` | Keeps the screen on during a workout |
| `src/SetupScreen.jsx`, `WorkoutScreen.jsx`, `ProgressScreen.jsx` | Screens |
| `assets/` | Source images for app icons and splash screens |

## Android

First time (needs Android Studio):

```bash
bash scripts/android-setup.sh
```

This installs packages, runs the tests, creates `android/` (app id `com.c24cardio.app`),
generates icons and splash screens, and builds a debug APK. Commit the generated
`android/` folder afterwards.

After code changes: `npm run android:sync`, then build or run from Android Studio
(`npm run android:open`).

### Release build for Google Play

1. In Android Studio: **Build › Generate Signed App Bundle / APK › Android App Bundle**.
2. Create an **upload key** when prompted. Store the keystore and passwords in a password
   manager and back them up. Never commit them (`.gitignore` blocks common key files).
3. Upload the `.aab` to Play Console and enable **Play App Signing**.
4. Bump `versionCode` in `android/app/build.gradle` for every upload.

## Device test checklist (before each release)

Run on a physical phone with the screen auto-lock set to 30 seconds:

- [ ] 10 rounds × 30 s with 30 s rest: every 10 s warning, 5–1 tick and bell plays in every round
- [ ] Screen stays on for the whole workout
- [ ] Pause for 2 minutes, resume: sounds continue
- [ ] Take a call (or trigger Siri) mid-round: a "tap to turn sound back on" banner appears; one tap restores sound
- [ ] Music from another app keeps playing alongside the beeps
- [ ] Sound off / on mid-workout
- [ ] Android back button mid-workout shows "End workout?"; on Progress it returns to setup
- [ ] Completed workout appears in Your Training, streak and Progress; a stopped workout does not
- [ ] History survives closing and reopening the app

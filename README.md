# C24 Cardio

Round timer for combat conditioning: rounds, work and rest, sound cues, and on-device
history with progress and streaks. Two modes: **Sparring** (timer only) and **Training**
(spoken Boxing / Muay Thai combinations each round). On Android a foreground service keeps
the timer, sounds and calls running with the screen locked and shows a lock-screen countdown. React + Vite web app, wrapped with Capacitor for
iOS and Android.

## Develop

Requires Node.js 22+.

```bash
npm install
npm run dev      # web app at http://localhost:5173
npm test         # timer, plan, history/streak, audio and combo-scheduler tests
node scripts/combos-doc.mjs   # regenerate COMBOS.md and the voice clip manifest
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
| `src/workoutPlan.js` | Precomputes every phase and sound cue (shared with the Android service) |
| `src/training/` | Combo library, call scheduler (no overlap with beeps/bells/rest) and voice |
| `src/native/` | Bridge to the Android background timer (`useBackgroundTimer.js`) |
| `plugins/workout-timer/` | Local Capacitor plugin: foreground service, notification, sounds, speech (Java) |
| `src/SetupScreen.jsx`, `WorkoutScreen.jsx`, `ProgressScreen.jsx` | Screens |
| `assets/` | Source images for app icons and splash screens |

## Android

### Cloud build (no Android Studio needed)

Every push to `orange-rebuild` runs `.github/workflows/android-debug.yml` on GitHub
Actions: tests, lint, production build, then a debug APK. Get it from the repo's
**Releases** page (private draft "C24 Cardio debug build (orange-rebuild)") or from the
run's **Artifacts** in the Actions tab. You can also start it from Actions › Android
debug APK › Run workflow.

Debug builds are signed with a throwaway debug key kept in the GitHub Actions cache (never in
the repo), so a newer APK installs over the previous one and keeps workout history. If the
cache expires (7 days without a build) a new key is made, and the phone needs one uninstall
before the next install (this clears local history). Install with
`bash ~/Downloads/c24-cardio-apk/install-c24.sh`. See `ANDROID_BACKGROUND.md` for the Play
Console foreground-service declaration.

### Local build

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

The full Android checklist (background, spoken combos, notifications, completion) is in
`DEVICE_TEST.md`. Quick regression pass on a physical phone with the screen auto-lock set to 30 seconds:

- [ ] 10 rounds × 30 s with 30 s rest: every 10 s warning, 5–1 tick and bell plays in every round
- [ ] Screen stays on for the whole workout
- [ ] Pause for 2 minutes, resume: sounds continue
- [ ] Take a call (or trigger Siri) mid-round: a "tap to turn sound back on" banner appears; one tap restores sound
- [ ] Music from another app keeps playing alongside the beeps
- [ ] Sound off / on mid-workout
- [ ] Android back button mid-workout shows "End workout?"; on Progress it returns to setup
- [ ] Completed workout appears in Your Training, streak and Progress; a stopped workout does not
- [ ] History survives closing and reopening the app

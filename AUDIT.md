# C24 Cardio — Audit, Audio Fix and Android Readiness

Branch `orange-rebuild` (from `main` @ cb328f2). Date: 27 Oct 2026. `main` is untouched.

## A. Repository overview

- **Repo:** `Sergiocoder007/C24-Cardio`. Only branch before this work: `main` (4 commits, last push 8 Sep 2026).
- **Stack:** React 19 + Vite 8, plain JavaScript, Oxlint, Node's built-in test runner. No backend.
- **Native wrapper:** Capacitor, per both privacy policies. Neither an `ios/` nor an `android/` project was ever committed.
- **Important finding:** the App Store build (orange/black theme, lion logo, history, streaks, Progress screen) is **not in this repo or anywhere on GitHub**. `main` holds an older gold/black version with a UFC-fighter picker and artwork reveal. The App Store code most likely exists only on the laptop that built it. This branch rebuilds the orange version from its five App Store screenshots.
- **Architecture (this branch):**
  - `workoutEngine.js`: pure timer state machine.
  - `useWorkoutTimer.js`: React driver for the engine.
  - `audio/workoutCues.js`: decides when each sound plays.
  - `audio/audioEngine.js`: Web Audio playback and recovery.
  - `history.js`: on-device records and streaks.
  - Three screens: Setup, Workout, Progress.

## B. Findings

### Confirmed defects (on `main`)

| # | Severity | Defect | Where | Status |
| --- | --- | --- | --- | --- |
| 1 | Critical | Sounds stop for the rest of the workout once the OS suspends or interrupts audio. There is no recovery path. | `src/audio/workoutAudio.js` `play()` / `unlock()`; `App.jsx` (only Start and the sound toggle unlock audio) | Fixed |
| 2 | High | The screen is never kept awake. Auto-lock mid-workout suspends the web view and audio, the most likely trigger of #1. | no wake lock anywhere | Fixed |
| 3 | High | A sound cut off by suspension keeps the "playing" slot (`onended` never fires). Every lower-priority cue (ticks, warnings) is then dropped. | `workoutAudio.js` priority check | Fixed |
| 4 | Medium | While audio is locked, every cue schedules its own `unlock()`. When audio returns they all replay at once as a burst of stale beeps. | `workoutAudio.js` `play()` | Fixed |
| 5 | Medium | Finished voice nodes are never disconnected from the audio graph. | `workoutAudio.js` | Fixed |
| 6 | High (build) | `.npmrc` points npm's cache at `D:/npm-cache`. Installs break on macOS, Linux and CI. | `.npmrc` | Fixed (removed) |
| 7 | High (release) | `viewport-fit=cover` is missing, so `env(safe-area-inset-*)` is ignored. Content sits under the status and navigation bars, which Android 15+ forces with edge-to-edge. | `index.html` | Fixed |
| 8 | High (release) | No Android back-button handling. Back mid-workout would close the app and lose the session. | — | Fixed |
| 9 | Medium | The in-app privacy policy didn't match the app (fighter image hosts, "nothing stored"). | `public/privacy-policy/index.html` | Fixed for this branch |
| 10 | Low | The 250 ms timer interval kept re-rendering while paused or finished. | `useWorkoutTimer.js` | Fixed |

### Suspected or needs a device

- **iOS `navigator.audioSession.type = 'playback'`** may interrupt the user's music app. That also makes C24's own audio get interrupted when the user resumes their music. Verify with Spotify playing (see checklist). If confirmed, switch to `'transient'` or `'ambient'` (the latter respects the silent switch, which is a product decision).
- **History in `localStorage`:** iOS can purge WKWebView storage under storage pressure. `@capacitor/preferences` would be more durable if users report lost history.
- **Real UFC fighter names and photos on `main`:** a Google Play intellectual-property and impersonation policy risk. Not an issue on this branch, which removes them.

## C. Audio investigation

**Root cause (established):** once the OS moves the `AudioContext` to `suspended` or `interrupted`, the original engine retries only `ctx.resume()` with no user gesture. iOS refuses that. No tap on the workout screen ever retries (Pause, Resume and Stop don't touch audio), so every remaining cue fails silently. A sound cut off mid-play can additionally block all lower-priority cues (defect #3).

**Evidence:** `src/audio/audioEngine.test.mjs` simulates whole workouts through the real timer, cue logic and audio engine on a fake `AudioContext` that behaves like WebKit. Running the same "interrupted in round 4" scenario against the **original** `main` code: 60 of 60 cues play before the interruption and **0 of the remaining 77 play** (rounds 4–10). The context stays `interrupted` to the end.

**Why rounds 4–5:** with default 3-minute rounds and 1-minute rest, round 4–5 is 12–20 minutes in. That matches screen auto-lock or Low-Power-Mode timing, which defect #2 makes certain to happen. Calls, Siri and other apps' audio cause the same failure.

**Fix:**
- keep the screen awake during a running workout
- any tap during a workout recovers audio, rebuilding an interrupted context
- a banner asks for a tap when the phone has paused sound
- the voice slot expires by wall clock, and finished voices are disconnected
- a single in-flight unlock; stale cues are dropped, never burst out
- production builds now log audio failures, readable at `window.__c24Audio.diagnostics()`

**Tests (pass):** 1, 5 and 10 rounds with rest (every cue plays, none dropped, no node leak). Cue timing is within one frame for rounds 1, 5 and 10. Also covered: suspension in round 4 followed by a tap restoring rounds 5–10, a hung `resume()`, a stuck voice, no stale bursts, pause/resume, and the sound toggle.

**Remaining uncertainty:** the fake context models documented browser behaviour, not a specific device. Confirm on a physical iPhone and Android phone using the README checklist.

## D. Android readiness

- **Build status:** **builds in the cloud.** `.github/workflows/android-debug.yml` runs tests, lint and the production build, then builds a debug APK on GitHub Actions for every push to `orange-rebuild`.
- **Prepared:**
  - Capacitor 8 dependencies (minSdk 24, **targetSdk 36**, which Play requires for new apps after 31 Aug 2026).
  - `capacitor.config.json` with the published app id `com.c24cardio.app`.
  - Back button handling, keep-awake plugin, bundled Oswald font, icon and splash sources in `assets/`.
  - `scripts/android-setup.sh`: creates `android/`, generates icons, sets the version and builds a debug APK.
- **Release blockers:**
  1. Run the setup script and commit `android/`.
  2. Device test (checklist).
  3. Create an upload key in Android Studio and enable Play App Signing.
  4. Play Console listing, Data safety form and content rating.
  5. A support email for the store listing (none exists in the project).
- **Data safety answers (for this branch):** no data collected or shared. Workout history stays on the device and is never transmitted.

## E. Feature recommendations

| Priority | Feature | Why | Effort | Risk |
| --- | --- | --- | --- | --- |
| P2 | Haptic tick on the last 3 seconds and round end | Usable with sound off or in a loud gym | S (`@capacitor/haptics`) | Low |
| P2 | Durable storage via `@capacitor/preferences` | Protects streaks from iOS storage purges | S | Low |
| P2 | Voice callouts ("Round 3", "10 seconds") | Hands-free cues | M | Medium (audio focus) |
| P3 | Background or locked-screen cues via local notifications | Timer cues with the phone locked | M–L | Medium |
| P3 | Saved workout presets | Faster start for repeat sessions | S | Low |

Already present, so not proposed: custom rounds, work and rest durations, sound toggle, history, progress, streaks.

## F. Changes made (branch `orange-rebuild`)

1. `330d278` Extract the timer into a pure, testable engine, with tests.
2. `80a6566` Fix sounds stopping mid-session: audio engine, keep-awake, tap recovery, tests.
3. `b4ae7ae` Rebuild the orange UI: setup, workout, progress, history and streaks; remove the fighter feature.
4. `89827fc` Capacitor 8 config and dependencies; remove the Windows `.npmrc`; add a test script.
5. `50eb7c7` Update the privacy policy for the rebuilt app.
6. `fc615ec` Android setup script, icon and splash sources, README.

## G. Verification results

| Check | Result |
| --- | --- |
| `npm test` (35 tests: timer engine 8, history and streaks 7, end-to-end audio 10, cue rules 10) | **Passed** |
| Legacy reproduction (original audio code, round-4 interruption) | **Bug reproduced:** 0/77 cues after the interruption |
| JavaScript bundle (Bun) of the app | **Passed** |
| Android debug build (GitHub Actions, run 40500159627) | **Passed**: `com.c24cardio.app` 1.1.0 (build 2), minSdk 24, targetSdk 36; APK in a private draft release |
| `npm install`, `npm test`, `oxlint`, `vite build` in CI | **Passed**: lint 0 errors, 1 intentional hook-dependency warning |
| Physical iPhone / Android device | **Not run** |
| Visual match to the App Store screenshots | Confirmed by the owner from the preview |

## H. Remaining work

- Run `scripts/android-setup.sh`, then fix any Vite, Oxlint or Gradle issues it reports.
- Device checklist on iPhone and Android, especially music playing alongside, a call mid-round, and the lock screen.
- Rebuild iOS from this branch (`npx cap add ios`, then copy over the existing bundle id and signing in Xcode) so both stores ship the same code with the audio fix.
- Decide whether `c24cardio.fit` should be redeployed from this branch.

## I. Next steps to Google Play

1. On a Mac with Android Studio: `git checkout orange-rebuild && bash scripts/android-setup.sh`.
2. Install the debug APK (`adb install -r …`) and run the README device checklist.
3. Commit the generated `android/` folder and open a pull request from `orange-rebuild` to `main`.
4. In Android Studio: **Generate Signed App Bundle**, create and back up an upload key, then build the `.aab`.
5. In Play Console: create the app (`com.c24cardio.app`), upload to **Internal testing**, complete Data safety ("no data collected"), content rating, store listing and a support email. For the privacy policy URL, use `https://c24cardio.fit/privacy-policy/`, but redeploy the site from this branch first: the live site still serves the old policy.
6. Promote to production after testing on at least one real device.

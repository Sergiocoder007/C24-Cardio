# Android background timer — how it works and what Google Play needs

## What it does

When a workout starts on Android, the app hands the whole workout plan (every phase, beep and
combo call, computed by `src/workoutPlan.js` and `src/training/schedule.js`) to a foreground
service in `plugins/workout-timer`. The service:

- plays the beeps, bells and combo calls on time with the screen locked or another app in front
- shows a notification, also on the lock screen, with the round, phase, a live countdown, and
  **Pause/Resume** and **Stop** buttons
- holds a partial wake lock only while a workout is running (released on pause and at the end),
  so the CPU can't fall asleep between beeps
- ends itself after the workout completes, when Stop is tapped, or when the app is swiped away

While the service runs, the in-app audio engine stays silent so nothing plays twice. If the service
can't start, the in-app engine plays exactly as before. The web app and iOS don't use the service.

## Permissions (added by the plugin's manifest)

| Permission | Why | User prompt |
| --- | --- | --- |
| `FOREGROUND_SERVICE` | Run the workout timer as a foreground service | No |
| `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | Required for the `mediaPlayback` type (Android 14+) | No |
| `POST_NOTIFICATIONS` | Show the lock-screen timer notification (Android 13+) | Yes, once, at the first workout. If declined, the timer and sounds still work but the notification is hidden. |
| `WAKE_LOCK` | Keep the CPU awake between beeps during a workout | No |
| `INTERNET` | Standard Capacitor web view permission (already present) | No |

No exact-alarm, battery-optimization-exemption, or "display over other apps" permission is used.

## Google Play Console: foreground service declaration

Apps targeting Android 14+ must declare each foreground service type on **App content ›
Foreground service permissions**. Fill it in as follows:

- **Foreground service type:** Media playback
- **Use case:** Media playback (audio)
- **Description:** "C24 Cardio is a round timer for boxing and Muay Thai workouts. When the user
  starts a workout, the app plays timer audio (round start and end bells, a 10-second warning,
  countdown beeps, and, in Training mode, spoken combinations) for the whole workout, including
  when the screen is locked or the user switches to another app. A notification shows the current
  round and remaining time with Pause and Stop controls. The service runs only while a workout
  the user started is in progress, and stops when it finishes or the user stops it."
- **User impact if deferred or interrupted:** "Timer sounds would stop mid-workout, so the user
  would miss round changes and rest periods and could not train with the phone locked."
- **Video:** a short screen recording showing: open the app › tap Start Workout › lock the phone
  (sounds continue) › the lock-screen notification with countdown › tap Pause and Resume › Stop.
  Upload as an unlisted YouTube video or a Drive link and paste the link.

Also update the **Data safety** form: no change (the service collects and sends no data).

## Battery restrictions

- A user-started `mediaPlayback` foreground service is allowed to run with the screen off and is
  not subject to the Android 15 time limits that apply to `dataSync` and `mediaProcessing`.
- Some manufacturers (notably Xiaomi, Samsung, OnePlus, Oppo and Vivo) add their own aggressive
  battery savers that can still stop background apps. If a tester reports sounds stopping with
  the screen locked on one of these phones, check Settings › Battery › C24 Cardio and set it to
  "Unrestricted" / "No restrictions". The app doesn't request this automatically, because Play
  only allows that request for a narrow set of app types.

## Verification status

| Check | Status |
| --- | --- |
| Plan matches the in-app engine cue-for-cue (8 workout shapes) | Passed (unit tests) |
| Native timing class (order, pause, hand-off, late cues, titles) | Passed (JUnit, locally and in CI) |
| APK builds; manifest declares the service, type and permissions; plugin registered | Passed (CI) |
| Lock-screen notification, countdown, buttons | **Not yet verified on a device** |
| Sounds with the screen locked and in other apps | **Not yet verified on a device** |
| Combo speech with the screen locked (Android text-to-speech) | **Not yet verified on a device** |

## Device test checklist

1. 10 rounds × 30 s, 30 s rest, Sparring mode. Allow notifications.
2. Lock with the power button in round 1. Every warning, tick and bell plays through round 10.
3. The lock screen shows "ROUND x/10 · WORK" with a counting-down timer. Pause, wait 30 s,
   Resume: the countdown and sounds continue from where they paused.
4. Unlock and open the app: the screen matches the notification.
5. Switch to Spotify or YouTube mid-round: beeps play over the music; the notification shows the
   countdown.
6. Notification **Stop**: the workout ends and isn't saved.
7. Training mode, Boxing, Beginner, 8 s: combos are spoken during work only, never over a beep,
   with the screen locked too.
8. Deny notifications on a fresh install: sounds still play with the screen locked.

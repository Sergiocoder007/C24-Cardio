# C24 Cardio — physical-device test checklist

Build under test: `c24-cardio-debug-ed0fdbf.apk` (in `~/Downloads/c24-cardio-apk/`, installed
with `bash ~/Downloads/c24-cardio-apk/install-c24.sh`). This build has the first combo draft; the
revised combo list (COMBOS.md) ships in the next build after approval.

**Before you start**
- [ ] Phone volume up, Do Not Disturb off, battery above 30%.
- [ ] Settings › Display › Screen timeout set to 30 seconds (so auto-lock happens during tests).
- [ ] Note the phone model and Android version: ______________________

Write **Pass** or **Fail + what happened** next to each item. For any failure, note the round and
roughly the second it happened.

## 1. Completion notification stays after the final round

Setup: Sparring, 2 rounds × 30 sec, 30 sec rest.

- [ ] 1.1 Start, lock the phone, wait until the end. The victory sound plays.
- [ ] 1.2 The lock screen shows **WORKOUT COMPLETE · 2 rounds done · Good work.**
- [ ] 1.3 Wait 2 minutes: the notification is **still there**.
- [ ] 1.4 It has no Pause/Stop buttons and makes no sound or vibration.
- [ ] 1.5 Unlock, open the app, tap **Done**: the notification is still in the shade.
- [ ] 1.6 Swipe it away: it disappears. (Repeat 1.1 and tap it instead: the app opens and the notification clears.)
- [ ] 1.7 Start a new workout: the old completion notification is replaced by the live timer.

## 2. Training mode with the screen on

Setup: Training, Boxing, Beginner, every 8 sec, 3 rounds × 1 min, 30 sec rest. Keep the app open.

- [ ] 2.1 The first combo is spoken about 2–3 s into round 1, after the GO bell finishes.
- [ ] 2.2 The same combo is shown under the clock while it is spoken, then fades.
- [ ] 2.3 Roughly one combo every 8 s; never the same combo twice in a row.
- [ ] 2.4 No combo during the 10-second warning, the 5-4-3-2-1 ticks, or the end-of-round bell.
- [ ] 2.5 No combo during rest ("BREATHE" shows) or the "ROUND 2" announcement.
- [ ] 2.6 Each combo is spoken once only (no echo or double voice).
- [ ] 2.7 Repeat with **every 5 sec, Advanced**: calls are short enough to understand, with no overlaps.
- [ ] 2.8 Repeat with **Muay Thai** and with **Both**: kicks, knees and elbows are spoken clearly.

## 3. Training mode with the screen off

Same setup as 2 (Boxing, Beginner, 8 sec).

- [ ] 3.1 Lock with the power button during round 1. Combos keep being spoken with the screen off.
- [ ] 3.2 Beeps, the 10-second warning and bells keep playing in rounds 2 and 3.
- [ ] 3.3 Combos still never overlap a beep, warning, bell or rest (listen through one full round).
- [ ] 3.4 Unlock mid-round: the clock, round and current combo match what you just heard.
- [ ] 3.5 Let auto-lock (30 s timeout) happen instead of the power button: no change in sound.

## 4. Pause and Stop from the notification

Setup: Sparring, 5 rounds × 30 sec, 30 sec rest. Lock the phone in round 1.

- [ ] 4.1 Lock screen shows **ROUND 1/5 · WORK** with a countdown and **PAUSE** and **STOP** buttons.
- [ ] 4.2 Tap **PAUSE**: sound stops at once; the notification shows **PAUSED · 0:xx left** and **RESUME**.
- [ ] 4.3 Wait 30 s, tap **RESUME**: the countdown continues from the same time; beeps resume on time.
- [ ] 4.4 Pause from the notification, then open the app: the app also shows **PAUSED** at the same time left.
- [ ] 4.5 Resume in the app: the notification switches back to a running countdown.
- [ ] 4.6 In Training mode, pause during a combo: the voice stops; no combo plays while paused.
- [ ] 4.7 Tap **STOP** on the notification: sound stops, the notification disappears, and when you open
      the app the workout is over and **not** added to Your Training.

## 5. Switching apps and coming back

Setup: Training, Boxing, Intermediate, 8 sec, 3 rounds × 1 min, 30 sec rest. Play music in
Spotify or YouTube Music first.

- [ ] 5.1 Start the workout, then switch to Spotify: beeps and combos continue over the music
      (the music dips briefly while a combo is spoken).
- [ ] 5.2 Pull down the shade: the live countdown is there.
- [ ] 5.3 Switch to WhatsApp and to the home screen for a full round: no missed bells.
- [ ] 5.4 Return to C24 Cardio: the screen shows the correct round, phase and time left within a second.
- [ ] 5.5 After returning, no sound plays twice (each beep and combo is heard once).
- [ ] 5.6 Press the Android **back** button mid-workout: **End workout?** appears; **Keep going** continues.
- [ ] 5.7 Swipe the app away from Recents mid-workout: the timer and notification stop.

## 6. Permissions and regressions

- [ ] 6.1 Fresh install, **deny** notifications: sounds still continue with the screen locked (no notification shown).
- [ ] 6.2 Sparring mode, 10 rounds × 30 sec, screen locked the whole time: every round complete with all sounds (the original round 4–5 bug).
- [ ] 6.3 Sound OFF in the app: nothing plays, screen on or off; Sound ON brings it back.
- [ ] 6.4 Completed workouts appear in Your Training, the streak and Progress; stopped ones do not.

If anything fails on a Samsung, Xiaomi, OnePlus, Oppo or Vivo phone, check Settings › Battery ›
C24 Cardio › set to "Unrestricted", and note whether that fixed it.

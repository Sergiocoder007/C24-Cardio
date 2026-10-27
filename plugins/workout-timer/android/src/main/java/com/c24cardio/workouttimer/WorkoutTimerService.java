package com.c24cardio.workouttimer;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.SoundPool;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.ServiceCompat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Foreground service that keeps a running workout alive while the screen is
 * locked or another app is in front: it plays the planned sounds and speech on
 * time and shows a lock-screen notification with a live countdown and
 * Pause/Resume and Stop buttons.
 *
 * Type mediaPlayback: the user starts the workout and the app plays audio in
 * the background, which is the declared use case.
 */
public class WorkoutTimerService extends Service {

    public static final String ACTION_START = "com.c24cardio.workouttimer.START";
    public static final String ACTION_PAUSE = "com.c24cardio.workouttimer.PAUSE";
    public static final String ACTION_RESUME = "com.c24cardio.workouttimer.RESUME";
    public static final String ACTION_STOP = "com.c24cardio.workouttimer.STOP";
    public static final String ACTION_MUTE = "com.c24cardio.workouttimer.MUTE";

    static final String EXTRA_PLAN = "plan";
    static final String EXTRA_ELAPSED = "elapsedMs";
    static final String EXTRA_MUTED = "muted";
    static final String EXTRA_FROM_USER_BUTTON = "fromNotification";

    private static final String TAG = "C24WorkoutTimer";
    private static final String CHANNEL_ID = "c24_workout_timer";
    private static final int NOTIFICATION_ID = 2424;
    private static final long LATE_LIMIT_MS = 1500;
    private static final long FINISH_LINGER_MS = 3500;

    /** Receives notification-button actions so the app UI stays in sync. */
    public interface Listener {
        void onTimerAction(String action, long activeMs, long atWallMs);
    }

    static volatile Listener listener;
    private static volatile WorkoutTimerService running;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable loop = this::onTick;

    private WorkoutClock clock;
    private SoundPool soundPool;
    private final Map<String, Integer> soundIds = new HashMap<>();
    private final Set<Integer> loaded = new HashSet<>();
    private int lastStream = 0;
    private boolean muted = false;
    private int lastPhaseIndex = -1;
    private boolean finishing = false;
    private PowerManager.WakeLock wakeLock;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private AudioManager audioManager;
    private AudioFocusRequest speechFocus;

    // ---------------------------------------------------------------- static API

    static boolean isRunning() {
        return running != null;
    }

    static Bundle state() {
        Bundle b = new Bundle();
        WorkoutTimerService s = running;
        long now = SystemClock.elapsedRealtime();
        b.putBoolean("running", s != null && s.clock != null && !s.finishing);
        b.putBoolean("paused", s != null && s.clock != null && s.clock.isPaused());
        b.putLong("activeMs", s != null && s.clock != null ? s.clock.activeMs(now) : 0);
        return b;
    }

    // ---------------------------------------------------------------- lifecycle

    @Override
    public void onCreate() {
        super.onCreate();
        running = this;
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        createChannel();
        AudioAttributes attrs = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        soundPool = new SoundPool.Builder().setMaxStreams(3).setAudioAttributes(attrs).build();
        soundPool.setOnLoadCompleteListener((pool, id, status) -> {
            if (status == 0) loaded.add(id);
        });
        soundIds.put("tick", soundPool.load(this, R.raw.c24_tick, 1));
        soundIds.put("warn", soundPool.load(this, R.raw.c24_warn, 1));
        soundIds.put("bell", soundPool.load(this, R.raw.c24_bell, 1));
        soundIds.put("complete", soundPool.load(this, R.raw.c24_complete, 1));
        loadVoiceClips();
    }

    /** Recorded move calls (res/raw/c24v_<move>.mp3) with their lengths. */
    private final Map<String, int[]> voiceClips = new HashMap<>();
    private int voiceToken = 0;

    private void loadVoiceClips() {
        for (java.lang.reflect.Field f : R.raw.class.getFields()) {
            String name = f.getName();
            if (!name.startsWith("c24v_")) continue;
            try {
                int res = f.getInt(null);
                int ms = 800;
                try (android.content.res.AssetFileDescriptor afd = getResources().openRawResourceFd(res)) {
                    android.media.MediaMetadataRetriever mmr = new android.media.MediaMetadataRetriever();
                    try {
                        mmr.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                        String d = mmr.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_DURATION);
                        if (d != null) ms = Integer.parseInt(d);
                    } finally {
                        mmr.release();
                    }
                }
                voiceClips.put(name, new int[] { soundPool.load(this, res, 1), ms });
            } catch (Exception e) {
                Log.w(TAG, "Voice clip not loaded: " + name, e);
            }
        }
    }

    /** Plays recorded clips back to back; returns false if any move has no loaded clip. */
    private boolean playClips(String[] moves, long gapMs) {
        int[][] clips = new int[moves.length][];
        for (int i = 0; i < moves.length; i++) {
            clips[i] = voiceClips.get("c24v_" + moves[i].trim().toLowerCase(Locale.US).replace(' ', '_'));
            if (clips[i] == null || !loaded.contains(clips[i][0])) return false;
        }
        final int token = ++voiceToken;
        requestSpeechFocus();
        long at = 0;
        for (int[] clip : clips) {
            handler.postDelayed(() -> {
                if (token == voiceToken && !muted) soundPool.play(clip[0], 1f, 1f, 1, 0, 1f);
            }, at);
            at += clip[1] + gapMs;
        }
        handler.postDelayed(() -> {
            if (token == voiceToken) abandonSpeechFocus();
        }, at);
        return true;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (action == null) {
            // Restarted by the system without a plan: nothing to resume.
            stopEverything();
            return START_NOT_STICKY;
        }
        long now = SystemClock.elapsedRealtime();
        boolean fromButton = intent.getBooleanExtra(EXTRA_FROM_USER_BUTTON, false);
        switch (action) {
            case ACTION_START:
                handleStart(intent, now);
                break;
            case ACTION_PAUSE:
                if (clock != null && !clock.isPaused()) {
                    clock.pause(now);
                    stopSound();
                    afterStateChange(now);
                    if (fromButton) notifyListener("pause", now);
                }
                break;
            case ACTION_RESUME:
                if (clock != null && clock.isPaused()) {
                    clock.resume(now);
                    afterStateChange(now);
                    if (fromButton) notifyListener("resume", now);
                }
                break;
            case ACTION_MUTE:
                muted = intent.getBooleanExtra(EXTRA_MUTED, false);
                if (muted) stopSound();
                break;
            case ACTION_STOP:
                if (finishing) {
                    // Workout already completed: keep the completion notice.
                    finishWorkout();
                    break;
                }
                if (fromButton) notifyListener("stop", now);
                stopEverything();
                break;
            default:
                break;
        }
        // A stale notification button with no workout running: shut down quietly.
        if (clock == null && !ACTION_START.equals(action)) stopSelf();
        return START_NOT_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // The app was swiped away: its workout screen is gone, so end the session.
        stopEverything();
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        releaseWakeLock();
        if (soundPool != null) soundPool.release();
        if (tts != null) tts.shutdown();
        abandonSpeechFocus();
        running = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // ---------------------------------------------------------------- commands

    private void handleStart(Intent intent, long now) {
        // Android requires startForeground() promptly after startForegroundService(),
        // even if the plan turns out to be invalid, so enter the foreground first.
        if (!enterForeground(now)) return;
        List<String> speech = new ArrayList<>();
        try {
            clock = parsePlan(new JSONObject(intent.getStringExtra(EXTRA_PLAN)), speech);
        } catch (Exception e) {
            Log.e(TAG, "Invalid workout plan", e);
            stopEverything();
            return;
        }
        finishing = false;
        lastPhaseIndex = -1;
        muted = intent.getBooleanExtra(EXTRA_MUTED, false);
        clock.start(now, intent.getLongExtra(EXTRA_ELAPSED, 0));
        updateNotification(now);
        acquireWakeLock(clock.totalMs() - clock.activeMs(now) + 60_000);
        if (!speech.isEmpty()) initSpeech();
        schedule(now);
    }

    private boolean enterForeground(long now) {
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0;
        try {
            ServiceCompat.startForeground(this, NOTIFICATION_ID, buildNotification(now), type);
            return true;
        } catch (Exception e) {
            // e.g. ForegroundServiceStartNotAllowedException; the app falls back to in-app audio.
            Log.e(TAG, "Could not enter the foreground", e);
            stopSelf();
            return false;
        }
    }

    private void afterStateChange(long now) {
        handler.removeCallbacks(loop);
        updateNotification(now);
        if (clock.isPaused()) {
            releaseWakeLock(); // nothing to time while paused
        } else {
            acquireWakeLock(clock.totalMs() - clock.activeMs(now) + 60_000);
            schedule(now);
        }
    }

    // ---------------------------------------------------------------- timing loop

    private void schedule(long now) {
        handler.removeCallbacks(loop);
        long delay = clock.msUntilNextEvent(now);
        if (delay >= 0) handler.postDelayed(loop, Math.max(5, Math.min(delay, 1000)));
    }

    private void onTick() {
        if (clock == null || finishing) return;
        long now = SystemClock.elapsedRealtime();
        for (WorkoutClock.Cue cue : clock.takeDue(now, LATE_LIMIT_MS)) {
            if (cue.sound != null) playSound(cue.sound);
            else if (cue.speech != null) speak(cue.speech);
        }
        int phase = clock.phaseIndex(now);
        if (phase != lastPhaseIndex || clock.isComplete(now)) updateNotification(now);
        if (clock.isComplete(now)) {
            finishing = true;
            // Let the victory sound finish, then leave a completion notice behind.
            handler.postDelayed(this::finishWorkout, FINISH_LINGER_MS);
            return;
        }
        schedule(now);
    }

    // ---------------------------------------------------------------- audio

    private void playSound(String id) {
        if (muted) return;
        Integer sid = soundIds.get(id);
        if (sid == null || !loaded.contains(sid)) {
            Log.w(TAG, "Sound not ready: " + id);
            return;
        }
        boolean exclusive = "bell".equals(id) || "complete".equals(id);
        if (exclusive && lastStream != 0) soundPool.stop(lastStream);
        lastStream = soundPool.play(sid, 1f, 1f, exclusive ? 2 : 1, 0, 1f);
    }

    private void stopSound() {
        voiceToken++;
        if (lastStream != 0) soundPool.stop(lastStream);
        if (tts != null) tts.stop();
    }

    private void initSpeech() {
        if (tts != null) return;
        tts = new TextToSpeech(this, status -> {
            if (status != TextToSpeech.SUCCESS) return;
            // US English first; fall back to UK, any English, then the phone's language.
            ttsReady = false;
            for (Locale locale : new Locale[] { Locale.US, Locale.UK, Locale.ENGLISH, Locale.getDefault() }) {
                int result = tts.setLanguage(locale);
                if (result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED) {
                    ttsReady = true;
                    break;
                }
            }
            if (!ttsReady) Log.w(TAG, "No usable text-to-speech voice; combos are shown but not spoken");
            tts.setSpeechRate(1.0f);
            tts.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build());
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override
                public void onStart(String utteranceId) {}

                @Override
                public void onDone(String utteranceId) {
                    if (utteranceId != null && utteranceId.endsWith("-last")) abandonSpeechFocus();
                }

                @Override
                public void onError(String utteranceId) {
                    abandonSpeechFocus();
                }
            });
        });
    }

    /** Pause between moves when the combo text separates them with ';' (8 s and 12 s paces). */
    private static final long MOVE_GAP_MS = 350;
    /** Gap between recorded clips at the quick 5 s pace. */
    private static final long QUICK_GAP_MS = 120;

    private void speak(String text) {
        if (muted) return;
        boolean paused = text.contains(";");
        if (playClips(text.split("\\s*[;,]\\s*"), paused ? MOVE_GAP_MS : QUICK_GAP_MS)) return;
        if (tts == null || !ttsReady) return;
        requestSpeechFocus();
        String id = "c24-" + SystemClock.elapsedRealtime();
        String[] moves = text.split(";\\s*");
        for (int i = 0; i < moves.length; i++) {
            int mode = i == 0 ? TextToSpeech.QUEUE_FLUSH : TextToSpeech.QUEUE_ADD;
            if (i > 0) tts.playSilentUtterance(MOVE_GAP_MS, TextToSpeech.QUEUE_ADD, id + "-gap" + i);
            tts.speak(moves[i], mode, null, id + "-" + i + (i == moves.length - 1 ? "-last" : ""));
        }
    }

    /** Briefly lowers other apps' music while a combo is spoken. */
    private void requestSpeechFocus() {
        if (audioManager == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        speechFocus = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
            .setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build())
            .build();
        audioManager.requestAudioFocus(speechFocus);
    }

    private void abandonSpeechFocus() {
        if (audioManager != null && speechFocus != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioManager.abandonAudioFocusRequest(speechFocus);
        }
        speechFocus = null;
    }

    // ---------------------------------------------------------------- notification

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Workout timer", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Shows the running workout on the lock screen with pause and stop.");
        channel.setShowBadge(false);
        channel.setSound(null, null);
        channel.enableVibration(false);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) nm.createNotificationChannel(channel);
    }

    private PendingIntent serviceIntent(String action, int requestCode) {
        Intent i = new Intent(this, WorkoutTimerService.class).setAction(action).putExtra(EXTRA_FROM_USER_BUTTON, true);
        return PendingIntent.getService(this, requestCode, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private PendingIntent openAppIntent() {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launch == null) launch = new Intent();
        launch.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        return PendingIntent.getActivity(this, 1, launch, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private Notification buildNotification(long now) {
        boolean complete = clock != null && clock.isComplete(now);
        boolean paused = clock != null && clock.isPaused();
        long remaining = clock != null ? clock.phaseRemainingMs(now) : 0;
        String title = clock != null ? clock.title(now) : "C24 CARDIO";

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_c24_timer)
            .setColor(0xFFFF6A00)
            .setContentTitle(title)
            .setContentIntent(openAppIntent())
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setOngoing(!complete);

        if (complete) {
            b.setContentText("Good work. Tap to open C24 Cardio.").setShowWhen(false);
        } else if (paused) {
            b.setContentText("PAUSED · " + WorkoutClock.formatClock(remaining) + " left")
                .setUsesChronometer(false)
                .setShowWhen(false)
                .addAction(0, "RESUME", serviceIntent(ACTION_RESUME, 11))
                .addAction(0, "STOP", serviceIntent(ACTION_STOP, 12));
        } else {
            // The system counts down on its own, accurate even while the app sleeps.
            b.setContentText("C24 Cardio")
                .setWhen(System.currentTimeMillis() + remaining)
                .setShowWhen(true)
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .addAction(0, "PAUSE", serviceIntent(ACTION_PAUSE, 10))
                .addAction(0, "STOP", serviceIntent(ACTION_STOP, 12));
        }
        return b.build();
    }

    private void updateNotification(long now) {
        if (clock == null) return;
        lastPhaseIndex = clock.phaseIndex(now);
        try {
            NotificationManagerCompat.from(this).notify(NOTIFICATION_ID, buildNotification(now));
        } catch (SecurityException e) {
            // Notifications not allowed; the service (and sounds) keep running.
        }
    }

    // ---------------------------------------------------------------- helpers

    private void notifyListener(String action, long now) {
        Listener l = listener;
        if (l != null && clock != null) l.onTimerAction(action, clock.activeMs(now), System.currentTimeMillis());
    }

    private void acquireWakeLock(long timeoutMs) {
        if (wakeLock == null) {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm == null) return;
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "C24Cardio:WorkoutTimer");
            wakeLock.setReferenceCounted(false);
        }
        wakeLock.acquire(Math.max(60_000, timeoutMs));
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
    }

    /**
     * Ends the service after a completed workout but keeps a "WORKOUT COMPLETE"
     * notification that stays until the user swipes it away or taps it.
     */
    private void finishWorkout() {
        int rounds = clock != null ? clock.rounds() : 0;
        handler.removeCallbacksAndMessages(null);
        clock = null;
        releaseWakeLock();
        // Detach keeps the notification on screen after the service stops.
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_DETACH);
        Notification done = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_c24_timer)
            .setColor(0xFFFF6A00)
            .setContentTitle("WORKOUT COMPLETE")
            .setContentText((rounds == 1 ? "1 round" : rounds + " rounds") + " done \u00B7 Good work.")
            .setContentIntent(openAppIntent())
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(false)
            .setAutoCancel(true)
            .setSilent(true)
            .setShowWhen(true)
            .setWhen(System.currentTimeMillis())
            .build();
        try {
            NotificationManagerCompat.from(this).notify(NOTIFICATION_ID, done);
        } catch (SecurityException e) {
            // Notifications not allowed; nothing to show.
        }
        stopSelf();
    }

    private void stopEverything() {
        handler.removeCallbacksAndMessages(null);
        clock = null;
        releaseWakeLock();
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    static WorkoutClock parsePlan(JSONObject plan, List<String> speechOut) throws JSONException {
        int rounds = plan.getInt("rounds");
        long total = plan.getLong("totalMs");
        List<WorkoutClock.Phase> phases = new ArrayList<>();
        JSONArray ps = plan.getJSONArray("phases");
        for (int i = 0; i < ps.length(); i++) {
            JSONObject p = ps.getJSONObject(i);
            phases.add(new WorkoutClock.Phase(p.getString("phase"), p.getInt("round"), p.getLong("startMs"), p.getLong("durationMs")));
        }
        List<WorkoutClock.Cue> cues = new ArrayList<>();
        JSONArray cs = plan.getJSONArray("cues");
        for (int i = 0; i < cs.length(); i++) {
            JSONObject c = cs.getJSONObject(i);
            cues.add(new WorkoutClock.Cue(c.getLong("at"), c.getString("sound"), null));
        }
        JSONArray sp = plan.optJSONArray("speech");
        if (sp != null) {
            for (int i = 0; i < sp.length(); i++) {
                JSONObject s = sp.getJSONObject(i);
                String text = s.getString("text");
                cues.add(new WorkoutClock.Cue(s.getLong("at"), null, text));
                speechOut.add(text);
            }
        }
        return new WorkoutClock(rounds, total, phases, cues);
    }
}

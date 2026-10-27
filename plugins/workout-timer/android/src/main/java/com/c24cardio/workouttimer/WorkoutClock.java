package com.c24cardio.workouttimer;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Pure timing logic for a workout running in the background service.
 *
 * Times passed in are from a monotonic clock (SystemClock.elapsedRealtime in
 * the service). "Active" time is the time the workout has been running, with
 * pauses excluded; the plan's phases and cues are expressed in active time.
 * No Android classes are used, so this is unit-tested on the JVM.
 */
public final class WorkoutClock {

    public static final class Phase {
        public final String name;
        public final int round;
        public final long startMs;
        public final long durationMs;

        public Phase(String name, int round, long startMs, long durationMs) {
            this.name = name;
            this.round = round;
            this.startMs = startMs;
            this.durationMs = durationMs;
        }

        public long endMs() {
            return startMs + durationMs;
        }
    }

    /** A sound (by id) or a spoken phrase to play at an active-time offset. */
    public static final class Cue {
        public final long at;
        public final String sound;
        public final String speech;

        public Cue(long at, String sound, String speech) {
            this.at = at;
            this.sound = sound;
            this.speech = speech;
        }
    }

    private final int rounds;
    private final long totalMs;
    private final List<Phase> phases;
    private final List<Cue> cues;

    private long origin;
    private long pausedAt = -1;
    private int nextCue = 0;
    private int skipped = 0;

    public WorkoutClock(int rounds, long totalMs, List<Phase> phases, List<Cue> cues) {
        this.rounds = rounds;
        this.totalMs = totalMs;
        this.phases = new ArrayList<>(phases);
        this.cues = new ArrayList<>(cues);
        Collections.sort(this.cues, (a, b) -> Long.compare(a.at, b.at));
    }

    /** Starts (or re-syncs) so that the workout has already run for elapsedMs. */
    public void start(long now, long elapsedMs) {
        origin = now - Math.max(0, elapsedMs);
        pausedAt = -1;
        long active = activeMs(now);
        nextCue = 0;
        while (nextCue < cues.size() && cues.get(nextCue).at < active) nextCue++;
    }

    public void pause(long now) {
        if (pausedAt < 0) pausedAt = now;
    }

    public void resume(long now) {
        if (pausedAt >= 0) {
            origin += now - pausedAt;
            pausedAt = -1;
        }
    }

    public boolean isPaused() {
        return pausedAt >= 0;
    }

    public long activeMs(long now) {
        long t = (pausedAt >= 0 ? pausedAt : now) - origin;
        return Math.max(0, Math.min(t, totalMs));
    }

    public boolean isComplete(long now) {
        return activeMs(now) >= totalMs;
    }

    /**
     * Cues that are due now, in order. Cues more than lateLimitMs overdue (for
     * example after the process was frozen) are dropped instead of played in a
     * burst.
     */
    public List<Cue> takeDue(long now, long lateLimitMs) {
        List<Cue> due = new ArrayList<>();
        if (pausedAt >= 0) return due;
        long active = activeMs(now);
        while (nextCue < cues.size() && cues.get(nextCue).at <= active) {
            Cue cue = cues.get(nextCue++);
            if (active - cue.at <= lateLimitMs) due.add(cue);
            else skipped++;
        }
        return due;
    }

    /** Milliseconds until the next cue or phase change, or -1 when paused or finished. */
    public long msUntilNextEvent(long now) {
        if (pausedAt >= 0 || isComplete(now)) return -1;
        long active = activeMs(now);
        long next = Long.MAX_VALUE;
        if (nextCue < cues.size()) next = cues.get(nextCue).at - active;
        Phase phase = currentPhase(now);
        if (phase != null) next = Math.min(next, phase.endMs() - active);
        next = Math.min(next, totalMs - active);
        return Math.max(0, next);
    }

    public int phaseIndex(long now) {
        long active = activeMs(now);
        for (int i = 0; i < phases.size(); i++) {
            if (active < phases.get(i).endMs()) return i;
        }
        return phases.size() - 1;
    }

    public Phase currentPhase(long now) {
        if (phases.isEmpty()) return null;
        return phases.get(phaseIndex(now));
    }

    public long phaseRemainingMs(long now) {
        Phase phase = currentPhase(now);
        if (phase == null) return 0;
        return Math.max(0, phase.endMs() - activeMs(now));
    }

    public int rounds() {
        return rounds;
    }

    public long totalMs() {
        return totalMs;
    }

    public int skippedCues() {
        return skipped;
    }

    /** Notification title for the current phase, for example "ROUND 3/10 · WORK". */
    public String title(long now) {
        if (isComplete(now)) return "WORKOUT COMPLETE";
        Phase phase = currentPhase(now);
        if (phase == null) return "C24 CARDIO";
        String label;
        switch (phase.name) {
            case "intro":
                label = "GET READY";
                break;
            case "work":
                label = "WORK";
                break;
            case "rest":
                label = "REST";
                break;
            case "announce":
                label = "NEXT ROUND";
                break;
            default:
                label = phase.name.toUpperCase();
        }
        return "ROUND " + Math.min(phase.round, rounds) + "/" + rounds + " · " + label;
    }

    public static String formatClock(long ms) {
        long total = (long) Math.ceil(Math.max(0, ms) / 1000.0);
        return (total / 60) + ":" + String.format(java.util.Locale.US, "%02d", total % 60);
    }
}

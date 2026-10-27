package com.c24cardio.workouttimer;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.Test;

public class WorkoutClockTest {

    // 2 rounds x 30s, 30s rest: intro 4450 | work 30000 | rest 30000 | announce 900 | work 30000
    private static WorkoutClock sample() {
        List<WorkoutClock.Phase> phases = Arrays.asList(
            new WorkoutClock.Phase("intro", 1, 0, 4450),
            new WorkoutClock.Phase("work", 1, 4450, 30000),
            new WorkoutClock.Phase("rest", 1, 34450, 30000),
            new WorkoutClock.Phase("announce", 2, 64450, 900),
            new WorkoutClock.Phase("work", 2, 65350, 30000)
        );
        List<WorkoutClock.Cue> cues = Arrays.asList(
            new WorkoutClock.Cue(800, "tick", null),
            new WorkoutClock.Cue(3800, "bell", null),
            new WorkoutClock.Cue(24450, "warn", null),
            new WorkoutClock.Cue(34450, "bell", null),
            new WorkoutClock.Cue(70000, null, "Jab, cross"),
            new WorkoutClock.Cue(95350, "complete", null)
        );
        return new WorkoutClock(2, 95350, phases, cues);
    }

    private static List<String> drain(WorkoutClock c, long from, long to, long step) {
        List<String> played = new ArrayList<>();
        for (long t = from; t <= to; t += step) {
            for (WorkoutClock.Cue cue : c.takeDue(t, 1500)) played.add(cue.sound != null ? cue.sound : "say:" + cue.speech);
        }
        return played;
    }

    @Test
    public void playsEveryCueOnceInOrder() {
        WorkoutClock c = sample();
        c.start(1000, 0);
        assertEquals(
            Arrays.asList("tick", "bell", "warn", "bell", "say:Jab, cross", "complete"),
            drain(c, 1000, 1000 + 96000, 50));
        assertTrue(c.isComplete(1000 + 96000));
    }

    @Test
    public void pauseHoldsTimeAndDelaysCues() {
        WorkoutClock c = sample();
        c.start(0, 0);
        assertEquals(Arrays.asList("tick"), drain(c, 0, 1000, 50));
        c.pause(1000);
        assertTrue(c.isPaused());
        assertEquals(1000, c.activeMs(600_000));
        assertTrue(c.takeDue(600_000, 1500).isEmpty());
        assertEquals(-1, c.msUntilNextEvent(600_000));
        c.resume(600_000);
        assertEquals(1000, c.activeMs(600_000));
        // GO bell is due 2.8s of active time later
        assertEquals(2800, c.msUntilNextEvent(600_000));
        assertEquals(Arrays.asList("bell"), drain(c, 600_000, 602_800, 50));
    }

    @Test
    public void startingMidWorkoutSkipsPastCues() {
        WorkoutClock c = sample();
        c.start(10_000, 30_000); // app handed over 30s in
        assertEquals(Arrays.asList("bell", "say:Jab, cross", "complete"), drain(c, 10_000, 80_000, 50));
    }

    @Test
    public void cuesFarOverdueAreDroppedNotBurst() {
        WorkoutClock c = sample();
        c.start(0, 0);
        // process frozen for 40 seconds, then wakes up
        List<WorkoutClock.Cue> due = c.takeDue(40_000, 1500);
        assertTrue(due.isEmpty());
        assertEquals(4, c.skippedCues());
    }

    @Test
    public void phaseTitleAndRemaining() {
        WorkoutClock c = sample();
        c.start(0, 0);
        assertEquals("ROUND 1/2 · GET READY", c.title(100));
        assertEquals("ROUND 1/2 · WORK", c.title(5000));
        assertEquals(29450, c.phaseRemainingMs(5000));
        assertEquals("ROUND 1/2 · REST", c.title(40_000));
        assertEquals("ROUND 2/2 · NEXT ROUND", c.title(64_500));
        assertEquals("ROUND 2/2 · WORK", c.title(66_000));
        assertEquals("WORKOUT COMPLETE", c.title(95_350));
        assertFalse(c.isComplete(95_349));
    }

    @Test
    public void formatClock() {
        assertEquals("1:30", WorkoutClock.formatClock(90_000));
        assertEquals("0:01", WorkoutClock.formatClock(1));
        assertEquals("0:00", WorkoutClock.formatClock(0));
        assertEquals("3:00", WorkoutClock.formatClock(179_001));
    }
}

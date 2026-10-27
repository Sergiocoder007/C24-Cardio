package com.c24cardio.workouttimer;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

/**
 * JavaScript bridge for the background workout timer.
 *
 * start({ plan, elapsedMs, muted }), pause(), resume(), stop(), setMuted({ muted }),
 * getState(). Emits "action" events ({ action: pause|resume|stop, activeMs, at })
 * when the user taps the notification buttons; events are retained until the
 * web app is listening, so taps made while the app is in the background are
 * not lost.
 */
@CapacitorPlugin(
    name = "WorkoutTimer",
    permissions = { @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications") }
)
public class WorkoutTimerPlugin extends Plugin implements WorkoutTimerService.Listener {

    @Override
    public void load() {
        WorkoutTimerService.listener = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (WorkoutTimerService.listener == this) WorkoutTimerService.listener = null;
        super.handleOnDestroy();
    }

    @PluginMethod
    public void start(PluginCall call) {
        JSObject plan = call.getObject("plan");
        if (plan == null) {
            call.reject("plan is required");
            return;
        }
        Context ctx = getContext();
        Intent intent = new Intent(ctx, WorkoutTimerService.class)
            .setAction(WorkoutTimerService.ACTION_START)
            .putExtra(WorkoutTimerService.EXTRA_PLAN, plan.toString())
            .putExtra(WorkoutTimerService.EXTRA_ELAPSED, call.getLong("elapsedMs", 0L))
            .putExtra(WorkoutTimerService.EXTRA_MUTED, call.getBoolean("muted", false));
        try {
            ContextCompat.startForegroundService(ctx, intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not start the background timer", e);
        }
    }

    @PluginMethod
    public void pause(PluginCall call) {
        send(WorkoutTimerService.ACTION_PAUSE, null);
        call.resolve();
    }

    @PluginMethod
    public void resume(PluginCall call) {
        send(WorkoutTimerService.ACTION_RESUME, null);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        send(WorkoutTimerService.ACTION_STOP, null);
        call.resolve();
    }

    @PluginMethod
    public void setMuted(PluginCall call) {
        Intent extra = new Intent().putExtra(WorkoutTimerService.EXTRA_MUTED, call.getBoolean("muted", false));
        send(WorkoutTimerService.ACTION_MUTE, extra);
        call.resolve();
    }

    @PluginMethod
    public void getState(PluginCall call) {
        Bundle b = WorkoutTimerService.state();
        JSObject out = new JSObject();
        out.put("running", b.getBoolean("running"));
        out.put("paused", b.getBoolean("paused"));
        out.put("activeMs", b.getLong("activeMs"));
        call.resolve(out);
    }

    /** Commands to an already running service; ignored when none is running. */
    private void send(String action, Intent extras) {
        if (!WorkoutTimerService.isRunning()) return;
        Intent intent = new Intent(getContext(), WorkoutTimerService.class).setAction(action);
        if (extras != null && extras.getExtras() != null) intent.putExtras(extras.getExtras());
        try {
            getContext().startService(intent);
        } catch (Exception ignored) {
            // service no longer running
        }
    }

    @Override
    public void onTimerAction(String action, long activeMs, long atWallMs) {
        JSObject data = new JSObject();
        data.put("action", action);
        data.put("activeMs", activeMs);
        data.put("at", atWallMs);
        notifyListeners("action", data, true);
    }
}

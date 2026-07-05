package com.melofy.app;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Timer;
import java.util.TimerTask;

@CapacitorPlugin(name = "NativePlayer")
public class NativePlayerPlugin extends Plugin {

    private Timer progressTimer;
    private static NativePlayerPlugin instance;

    public static NativePlayerPlugin getInstance() {
        return instance;
    }

    @Override
    public void load() {
        super.load();
        instance = this;
        startProgressTimer();
    }

    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");
        String trackId = call.getString("trackId");
        Double timeInSeconds = call.getDouble("time");
        int timeMs = timeInSeconds != null ? (int) (timeInSeconds * 1000) : -1;

        MusicService service = MusicService.getInstance();

        if (service != null && url != null) {
            service.playUrl(url, trackId, timeMs);
            call.resolve();
        } else if (service != null) {
            service.resumePlayback();
            call.resolve();
        } else {
            call.reject("MusicService is not running");
        }
    }

    /**
     * Pre-arm the next track (or clear it when url is null/missing) so the
     * service can auto-advance natively without the WebView.
     */
    @PluginMethod
    public void setNext(PluginCall call) {
        MusicService service = MusicService.getInstance();
        if (service == null) {
            call.reject("MusicService is not running");
            return;
        }
        String url = call.getString("url");
        String trackId = call.getString("trackId");
        service.setNext(url, trackId);
        call.resolve();
    }

    /**
     * Snapshot of native playback state. JS calls this on startup / app-resume
     * to reconcile its store after the renderer was frozen or killed (during
     * which the service may have auto-advanced one or more tracks).
     */
    @PluginMethod
    public void getState(PluginCall call) {
        MusicService service = MusicService.getInstance();
        JSObject ret = new JSObject();
        if (service != null) {
            ret.put("trackId", service.getCurrentTrackId());
            ret.put("currentTime", service.getCurrentPosition() / 1000.0);
            ret.put("duration", service.getDuration() / 1000.0);
            ret.put("isPlaying", service.isPlaying());
        } else {
            ret.put("trackId", (String) null);
            ret.put("currentTime", 0);
            ret.put("duration", 0);
            ret.put("isPlaying", false);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void pause(PluginCall call) {
        MusicService service = MusicService.getInstance();
        if (service != null) {
            service.pausePlayback();
            call.resolve();
        } else {
            call.reject("MusicService is not running");
        }
    }

    @PluginMethod
    public void seekTo(PluginCall call) {
        Double timeInSeconds = call.getDouble("time");
        if (timeInSeconds == null) {
            call.reject("Must provide time in seconds");
            return;
        }

        MusicService service = MusicService.getInstance();
        if (service != null) {
            service.seekTo((int) (timeInSeconds * 1000));
            call.resolve();
        } else {
            call.reject("MusicService is not running");
        }
    }

    private void startProgressTimer() {
        if (progressTimer != null) {
            progressTimer.cancel();
        }
        progressTimer = new Timer();
        progressTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                MusicService service = MusicService.getInstance();
                if (service != null && service.isPlaying()) {
                    JSObject ret = new JSObject();
                    ret.put("currentTime", service.getCurrentPosition() / 1000.0);
                    ret.put("duration", service.getDuration() / 1000.0);
                    notifyListeners("timeupdate", ret);
                }
            }
        }, 0, 500); // Update every 500ms
    }

    public void notifyEnded() {
        notifyListeners("ended", new JSObject());
    }

    public void notifyAdvanced(String trackId) {
        JSObject ret = new JSObject();
        ret.put("trackId", trackId);
        notifyListeners("advanced", ret);
    }

    public void notifyBuffering(boolean isBuffering) {
        JSObject ret = new JSObject();
        ret.put("isBuffering", isBuffering);
        notifyListeners("buffering", ret);
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        if (progressTimer != null) {
            progressTimer.cancel();
            progressTimer = null;
        }
        if (instance == this) {
            instance = null;
        }
    }
}

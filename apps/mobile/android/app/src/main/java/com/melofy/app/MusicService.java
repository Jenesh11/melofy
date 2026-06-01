package com.melofy.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * MusicService — Foreground Service for background audio playback.
 *
 * Keeps the Capacitor WebView process alive when:
 *   - The screen turns off
 *   - The user switches to another app
 *   - The user goes to the home screen
 *
 * (Does not request AudioFocus, allowing Chromium to manage it natively).
 *
 * Android 14+ requires foregroundServiceType="mediaPlayback" (declared in
 * AndroidManifest.xml) to start this as a foreground service.
 */
public class MusicService extends Service {

    private static final String CHANNEL_ID = "melofy_audio_channel";
    private static final int    NOTIF_ID   = 1001;

    // WakeLock — prevents CPU from sleeping while audio is active
    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;

    private static MusicService instance;
    private MediaPlayer mediaPlayer;
    private String currentUrl;
    private int pendingSeekMs = -1;

    public static MusicService getInstance() {
        return instance;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        createNotificationChannel();
        acquireWakeLock();
        setupMediaPlayer();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = buildForegroundNotification();
        startForeground(NOTIF_ID, notification);



        // START_STICKY: if the OS kills this service, restart it automatically
        // (the WebView / audio element will resume from the React store state).
        return START_STICKY;
    }

    /**
     * Called when the user swipes the app away from the Recents screen.
     * Restart the service so audio can resume if the app is re-opened,
     * and stop gracefully if the user explicitly removed the app.
     */
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        // Restart the service via an alarm-like intent after a short delay.
        Intent restartIntent = new Intent(getApplicationContext(), MusicService.class);
        restartIntent.setPackage(getPackageName());
        startService(restartIntent);
    }

    @Override
    public void onDestroy() {
        if (mediaPlayer != null) {
            mediaPlayer.release();
            mediaPlayer = null;
        }
        releaseWakeLock();
        stopForeground(true);
        instance = null;
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null; // Not a bound service
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WakeLock
    // ─────────────────────────────────────────────────────────────────────────

    private void acquireWakeLock() {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null && (wakeLock == null || !wakeLock.isHeld())) {
            wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "melofy:MusicWakeLock"
            );
            wakeLock.acquire(3 * 60 * 60 * 1000L); // max 3 hours
        }

        WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        if (wm != null && (wifiLock == null || !wifiLock.isHeld())) {
            wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "melofy:MusicWifiLock");
            wifiLock.acquire();
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            wakeLock = null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Native MediaPlayer
    // ─────────────────────────────────────────────────────────────────────────

    private void setupMediaPlayer() {
        mediaPlayer = new MediaPlayer();
        mediaPlayer.setWakeMode(getApplicationContext(), PowerManager.PARTIAL_WAKE_LOCK);
        mediaPlayer.setAudioAttributes(
            new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .build()
        );
        mediaPlayer.setOnPreparedListener(mp -> {
            if (pendingSeekMs > 0) {
                mp.seekTo(pendingSeekMs);
            }
            mp.start();
            notifyBuffering(false);
            pendingSeekMs = -1;
        });
        mediaPlayer.setOnErrorListener((mp, what, extra) -> {
            Log.e("MusicService", "MediaPlayer error: " + what + " " + extra);
            return false;
        });
        
        mediaPlayer.setOnInfoListener((mp, what, extra) -> {
            if (what == MediaPlayer.MEDIA_INFO_BUFFERING_START) {
                notifyBuffering(true);
            } else if (what == MediaPlayer.MEDIA_INFO_BUFFERING_END) {
                notifyBuffering(false);
            }
            return false;
        });

        mediaPlayer.setOnCompletionListener(mp -> {
            // Reached end of track
            notifyPlaybackEnded();
        });
    }

    private void notifyPlaybackEnded() {
        if (NativePlayerPlugin.getInstance() != null) {
            NativePlayerPlugin.getInstance().notifyEnded();
        }
    }

    private void notifyBuffering(boolean isBuffering) {
        if (NativePlayerPlugin.getInstance() != null) {
            NativePlayerPlugin.getInstance().notifyBuffering(isBuffering);
        }
    }

    public void playUrl(String url, int timeMs) {
        if (mediaPlayer == null) return;
        try {
            if (url.equals(currentUrl)) {
                if (timeMs >= 0) {
                     mediaPlayer.seekTo(timeMs);
                }
                mediaPlayer.start();
                return;
            }
            notifyBuffering(true);
            pendingSeekMs = timeMs;
            mediaPlayer.reset();
            mediaPlayer.setDataSource(url);
            mediaPlayer.prepareAsync();
            currentUrl = url;
        } catch (Exception e) {
            Log.e("MusicService", "Failed to play URL: " + url, e);
        }
    }

    public void resumePlayback() {
        if (mediaPlayer != null && !mediaPlayer.isPlaying()) {
            mediaPlayer.start();
        }
    }

    public void pausePlayback() {
        if (mediaPlayer != null && mediaPlayer.isPlaying()) {
            mediaPlayer.pause();
        }
    }

    public void seekTo(int positionMs) {
        if (mediaPlayer != null) {
            mediaPlayer.seekTo(positionMs);
        }
    }

    public boolean isPlaying() {
        return mediaPlayer != null && mediaPlayer.isPlaying();
    }

    public int getCurrentPosition() {
        return mediaPlayer != null ? mediaPlayer.getCurrentPosition() : 0;
    }

    public int getDuration() {
        return mediaPlayer != null ? mediaPlayer.getDuration() : 0;
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Notification
    // ─────────────────────────────────────────────────────────────────────────

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Melofy Audio Playback",
                NotificationManager.IMPORTANCE_LOW // silent, no sound/vibration
            );
            channel.setDescription("Shows while music is playing in Melofy");
            channel.setShowBadge(false);

            NotificationManager manager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildForegroundNotification() {
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, openAppIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Melofy")
            .setContentText("Playing music…")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)           // Cannot be dismissed while playing
            .setSilent(true)            // No sound / vibration
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT) // Media transport category
            .build();
    }
}

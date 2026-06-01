package com.melofy.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
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
 * Also manages Android AudioFocus so the OS knows Melofy is actively
 * playing audio (preventing it from being silenced by other audio events).
 *
 * Android 14+ requires foregroundServiceType="mediaPlayback" (declared in
 * AndroidManifest.xml) to start this as a foreground service.
 */
public class MusicService extends Service {

    private static final String CHANNEL_ID = "melofy_audio_channel";
    private static final int    NOTIF_ID   = 1001;

    // WakeLock — prevents CPU from sleeping while audio is active
    private PowerManager.WakeLock wakeLock;

    // AudioFocus — tells Android this app is playing media
    private AudioManager        audioManager;
    private AudioFocusRequest   audioFocusRequest; // API 26+
    private AudioManager.OnAudioFocusChangeListener audioFocusListener;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        acquireWakeLock();
        setupAudioFocus();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = buildForegroundNotification();
        startForeground(NOTIF_ID, notification);

        // Request audio focus so Android knows we are actively playing music.
        requestAudioFocus();

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
        abandonAudioFocus();
        releaseWakeLock();
        stopForeground(true);
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
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            wakeLock = null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AudioFocus
    // ─────────────────────────────────────────────────────────────────────────

    private void setupAudioFocus() {
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);

        audioFocusListener = focusChange -> {
            // We intentionally do NOT pause here — the WebView audio element
            // manages its own state. This listener just keeps the focus request
            // alive so Android doesn't silently kill audio without a reason.
        };

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();

            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(audioAttributes)
                .setAcceptsDelayedFocusGain(true)
                .setOnAudioFocusChangeListener(audioFocusListener)
                .build();
        }
    }

    private void requestAudioFocus() {
        if (audioManager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (audioFocusRequest != null) {
                audioManager.requestAudioFocus(audioFocusRequest);
            }
        } else {
            //noinspection deprecation
            audioManager.requestAudioFocus(
                audioFocusListener,
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN
            );
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (audioFocusRequest != null) {
                audioManager.abandonAudioFocusRequest(audioFocusRequest);
            }
        } else {
            //noinspection deprecation
            audioManager.abandonAudioFocus(audioFocusListener);
        }
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

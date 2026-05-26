package com.melofy.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * MusicService — Foreground Service for background audio playback.
 *
 * This service keeps the app process alive when the screen turns off or
 * the user navigates away. The actual audio element lives in the Chrome
 * WebView; this service simply prevents the OS from killing the process.
 *
 * Android 14+ requires foregroundServiceType="mediaPlayback" (declared in
 * AndroidManifest.xml) to show a rich media-style notification.
 *
 * The Chrome WebView automatically integrates with the Android MediaSession /
 * notification panel via navigator.mediaSession when audio is playing, so no
 * extra code is needed here for notification controls — they come for free.
 */
public class MusicService extends Service {

    private static final String CHANNEL_ID   = "melofy_audio_channel";
    private static final int    NOTIF_ID     = 1001;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Build a minimal notification so Android allows the foreground service.
        // Android / Chrome WebView will upgrade this to a rich media notification
        // automatically once navigator.mediaSession provides metadata.
        Notification notification = buildForegroundNotification();
        startForeground(NOTIF_ID, notification);

        // If the service is killed, restart it automatically.
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopForeground(true);
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null; // Not a bound service
    }

    // ─────────────────────────────────────────────────────────────────────────

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Melofy Audio Playback",
                NotificationManager.IMPORTANCE_LOW // Low: silent, no sound/vibration
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
        // Tapping the notification opens the app.
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
            .setOngoing(true)          // Cannot be dismissed by user (keep alive)
            .setSilent(true)           // No sound / vibration
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build();
    }
}

package com.melofy.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

import ee.forgr.capacitor.social.login.SocialLoginPlugin;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.GoogleProvider;

/**
 * MainActivity — Capacitor host activity.
 *
 * Responsibilities:
 *  1. Hosts the Capacitor/Chrome WebView that loads the live Melofy URL.
 *  2. Starts MusicService as a foreground service so audio keeps playing
 *     when the screen is off or the user switches apps.
 *  3. Registers native plugins (SocialLogin for Google OAuth, etc.).
 *  4. Force-resumes the WebView after pause/stop lifecycle events to ensure
 *     the audio pipeline is never interrupted by Android's activity lifecycle.
 *
 * NOTE: We intentionally do NOT stop MusicService in onDestroy().
 * The service keeps the WebView process alive in the background.
 * It is stopped only when onTaskRemoved() fires (user swipes away from
 * recents) — which is handled inside MusicService itself.
 */
public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    private static final String TAG = "MelofyMainActivity";

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN &&
            requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {
            
            PluginHandle pluginHandle = bridge.getPlugin("SocialLogin");
            if (pluginHandle == null) {
                Log.i("Google Activity Result", "SocialLogin plugin handle is null");
                return;
            }
            
            SocialLoginPlugin plugin = (SocialLoginPlugin) pluginHandle.getInstance();
            if (plugin != null) {
                plugin.handleGoogleLoginIntent(requestCode, data);
            }
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register plugins BEFORE super.onCreate() so they are available
        // to the WebView bridge immediately.
        registerPlugin(SocialLoginPlugin.class);
        registerPlugin(NativePlayerPlugin.class);

        super.onCreate(savedInstanceState);

        // Configure the WebView for background media playback
        if (bridge != null) {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                android.webkit.WebSettings settings = webView.getSettings();
                settings.setMediaPlaybackRequiresUserGesture(false);
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    webView.setRendererPriorityPolicy(
                        WebView.RENDERER_PRIORITY_IMPORTANT,
                        false
                    );
                }
            }
        }

        // Start the background audio foreground service.
        startMusicService();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Background audio lifecycle overrides
    //
    // When the Activity goes to background, BridgeActivity's lifecycle can
    // pause the WebView (timers, audio pipeline, etc.). We let the bridge
    // lifecycle run normally (so plugins get their notifications), then
    // immediately force-resume the WebView so the <audio> element and its
    // JavaScript timers keep running.
    //
    // The real fix for background audio is in useMediaSession.ts — we now
    // set navigator.mediaSession (Web API) so Chrome WebView knows media
    // is playing and doesn't auto-pause the <audio> element. These overrides
    // are an additional safety net.
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public void onPause() {
        super.onPause();
        // Force-resume the WebView to counteract any pausing done by
        // BridgeActivity → Bridge → CordovaWebView lifecycle chain.
        forceResumeWebView();
        Log.d(TAG, "App paused — WebView force-resumed for background audio");
    }

    @Override
    public void onStop() {
        super.onStop();
        // Same: force-resume after stop to keep timers and audio alive.
        forceResumeWebView();
        Log.d(TAG, "App stopped — WebView force-resumed for background audio");
    }

    /**
     * Force the WebView to stay active (un-paused) even when the Activity
     * is in the background. This ensures JavaScript timers and the HTML
     * audio element continue running.
     */
    private void forceResumeWebView() {
        if (bridge != null) {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                webView.onResume();
                webView.resumeTimers();
            }
        }
    }

    // onDestroy is NOT overridden here.
    // The MusicService must remain alive even after the Activity is destroyed
    // so that background audio (WebView) continues playing. The service will
    // stop itself when onTaskRemoved() is triggered (user swipes away app).

    private void startMusicService() {
        Intent serviceIntent = new Intent(this, MusicService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
    }
}


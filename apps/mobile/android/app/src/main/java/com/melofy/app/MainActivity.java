package com.melofy.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;

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
 *
 * NOTE: We intentionally do NOT stop MusicService in onDestroy().
 * The service keeps the WebView process alive in the background.
 * It is stopped only when onTaskRemoved() fires (user swipes away from
 * recents) — which is handled inside MusicService itself.
 */
public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

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

        super.onCreate(savedInstanceState);

        // Start the background audio foreground service.
        startMusicService();
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

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.melofy.app',
  appName: 'Melofy',
  // webDir is only used when there is NO server.url configured.
  // Since we load the live URL, this folder just needs to exist as a fallback.
  webDir: 'www',
  server: {
    // ── Local Development & Production Redirect ────────────────────────────────
    // We handle the redirect in apps/mobile/www/index.html to provide a 
    // premium offline experience instead of a browser error page.
    // url: 'https://melofy.jene.in',
    allowNavigation: ['melofy.jene.in'],
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    // ─── Google OAuth ────────────────────────────────────────────────────────
    GoogleAuth: {
      // Web / server-side client ID (type 3 in google-services.json)
      clientId: '499485015638-sc946ao8esct09jf6klaa967fbs5bmce.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      forceCodeForRefreshToken: true,
    },
    // ─── Status Bar ──────────────────────────────────────────────────────────
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#000000',
    },
  },
  android: {
    // Allow the WebView to play audio in the background via AudioFocus.
    // The actual foreground service permissions live in AndroidManifest.xml.
    allowMixedContent: false,
    captureInput: true,
    // Keep the WebView audio alive when the screen turns off.
    backgroundColor: '#000000',
  },
  ios: {
    backgroundColor: '#000000',
  },
};

export default config;

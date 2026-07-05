import type { CapacitorConfig } from '@capacitor/cli';

// ─────────────────────────────────────────────────────────────────────────────
// DEV vs PROD toggle
//
// Dev  (physical device): set DEV=true in your shell before running cap sync
//      The phone CANNOT reach localhost — it must use your machine's LAN IP.
//      Update DEV_SERVER_IP if your machine's IP changes (run `ipconfig`).
//
//   Windows PowerShell:
//     $env:DEV="true"; npx cap sync
//
//   Revert to production:
//     $env:DEV=""; npx cap sync   (or just remove the env var)
// ─────────────────────────────────────────────────────────────────────────────
const isDev = process.env.DEV === 'true';
const DEV_SERVER_IP = process.env.DEV_SERVER_IP ?? '192.168.29.192';
const DEV_SERVER_PORT = process.env.DEV_SERVER_PORT ?? '3000';

const serverConfig = isDev
  ? {
      // ── LOCAL DEV ───────────────────────────────────────────────────────────
      // Use your machine's LAN IP — the phone cannot reach "localhost".
      // Make sure your Next.js dev server is bound to 0.0.0.0 (default for
      // `next dev`) and your firewall allows port 3000 from LAN.
      url: `http://${DEV_SERVER_IP}:${DEV_SERVER_PORT}`,
      allowNavigation: [DEV_SERVER_IP],
      cleartext: true,
      androidScheme: 'http',
    }
  : {
      // ── PRODUCTION ──────────────────────────────────────────────────────────
      // Load the live site directly so the Capacitor bridge is injected.
      url: 'https://melofy.jene.in',
      allowNavigation: ['melofy.jene.in'],
      cleartext: false,
      androidScheme: 'https',
    };

const config: CapacitorConfig = {
  appId: 'com.melofy.app',
  appName: 'Melofy',
  webDir: 'www',
  server: serverConfig,
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
    // ─── Media Session (background audio) ────────────────────────────────
    // Start the foreground service immediately on plugin load, not just
    // when playback begins. This prevents a race where the app goes to
    // background before the service has started.
    MediaSession: {
      foregroundService: 'always',
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

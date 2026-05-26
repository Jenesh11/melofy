import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';

let adminApp: App;

function getServiceAccountCredential() {
  // Option 1: Base64-encoded JSON in env var (ideal for cloud platforms)
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64) {
    try {
      const json = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
      return cert(json);
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:', error);
    }
  }

  // Option 2: GOOGLE_APPLICATION_CREDENTIALS file path is handled
  // automatically by the Admin SDK when calling initializeApp() with no args.

  return undefined;
}

export function getAdminApp(): App {
  if (adminApp) return adminApp;

  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    return adminApp;
  }

  const credential = getServiceAccountCredential();
  adminApp = credential
    ? initializeApp({ credential })
    : initializeApp(); // Uses GOOGLE_APPLICATION_CREDENTIALS or ADC on GCP

  return adminApp;
}

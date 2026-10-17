import { initializeApp, getApps, getApp } from 'firebase/app';
import { Firestore, getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
// Track metadata often has optional fields (artworkUrl, uri, ...). Without this flag a single
// undefined value makes Firestore reject the whole write, so likes/imports silently never save.
let db: Firestore;
try {
  db = initializeFirestore(app, { ignoreUndefinedProperties: true });
} catch {
  // Already initialized (e.g. after a hot reload) — reuse that instance.
  db = getFirestore(app);
}
const storage = getStorage(app);

export { app, db, storage };

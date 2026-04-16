'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { app, db } from '@/lib/firebase/config';
import { getAuth } from 'firebase/auth';
import { addPlaylist } from '@/lib/firebase/playlists';

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

/**
 * Detects if the code is running inside a Capacitor native WebView.
 * Safe to call in SSR — returns false on the server.
 */
function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      // Auto-sync user to Firestore on login
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: new Date().toISOString(),
          });

          // Generate initial "Liked Songs" playlist
          await addPlaylist(user.uid, {
            name: 'Liked Songs',
            trackCount: 0,
            tracks: [],
            isLikedSongs: true,
          });
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      if (isCapacitorNative()) {
        // ── Native path: use @capgo/capacitor-social-login ───────────────────
        // Dynamic import so the web bundle is never broken — this package is
        // only installed in apps/mobile, not apps/web.
        const { SocialLogin } = await import(
          '@capgo/capacitor-social-login'
        );
        await SocialLogin.initialize({
          google: {
            webClientId: '499485015638-sc946ao8esct09jf6klaa967fbs5bmce.apps.googleusercontent.com',
          },
        });
        const result = await SocialLogin.login({ provider: 'google', options: { scopes: ['profile', 'email'] } });
        
        // Use explicit types instead of 'any' to satisfy strict linting
        interface GoogleOnlineResponse {
          responseType: 'online';
          idToken: string | null;
        }

        const googleResult = result.result as GoogleOnlineResponse | { responseType: 'offline' };
        const idToken = googleResult?.responseType === 'online' ? googleResult.idToken : null;
        
        if (!idToken) throw new Error('Google Sign-In: no idToken returned from native provider. Ensure you are not in offline mode.');
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
      } else {
        // ── Browser path: existing popup flow (unchanged) ─────────────────
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

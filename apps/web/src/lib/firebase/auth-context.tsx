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
import { useHomeStore } from '@/store/useHomeStore';
import { useLikedStore } from '@/store/useLikedStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { addPlaylist } from '@/lib/firebase/playlists';

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

/**
 * Detects if the code is running inside a Capacitor native WebView.
 * Safe to call in SSR — returns false on the server.
 *
 * Uses multiple detection strategies since the Capacitor bridge may not
 * always be fully injected when loading a remote URL in production:
 *  1. Standard Capacitor.isNativePlatform() API
 *  2. Capacitor global object presence with platform check
 *  3. User-agent sniffing for Capacitor-injected WebViews
 */
function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;

  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
  const platform = cap?.getPlatform?.();

  return !!(
    cap?.isNativePlatform?.() ||
    platform === 'android' ||
    platform === 'ios' ||
    (typeof navigator !== 'undefined' && /Capacitor/i.test(navigator.userAgent))
  );
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

export const DEV_USER = {
  uid: 'dev-user',
  email: 'dev@melofy.local',
  displayName: 'Developer',
  photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  emailVerified: true,
  isAnonymous: false,
  phoneNumber: null,
  providerId: 'google.com',
  tenantId: null,
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  },
  providerData: [],
  refreshToken: 'dev-refresh-token',
  delete: async () => {},
  getIdToken: async () => 'dev-token',
  getIdTokenResult: async () => ({
    token: 'dev-token',
    authTime: new Date().toISOString(),
    issuedAtTime: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 3600 * 1000).toISOString(),
    signInProvider: 'google.com',
    signInSecondFactor: null,
    claims: {},
  }),
  reload: async () => {},
  toJSON: () => ({}),
} as unknown as User;

export function isDevEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV !== 'production';
  }
  return (
    process.env.NODE_ENV !== 'production' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined' && isDevEnvironment()) {
      if (localStorage.getItem('melofy_dev_signout') !== 'true') {
        return DEV_USER;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined' && isDevEnvironment()) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    const isDev = isDevEnvironment();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const effectiveUser =
        firebaseUser ||
        (isDev && localStorage.getItem('melofy_dev_signout') !== 'true'
          ? DEV_USER
          : null);

      if (useHomeStore.getState().userId !== (effectiveUser?.uid || null)) {
        useHomeStore.getState().resetForUser(effectiveUser?.uid || null);
        usePlayerStore.getState().reset();
      }
      useLikedStore.getState().bindUser(effectiveUser?.uid || null);
      setUser(effectiveUser);
      setLoading(false);

      // Auto-sync user to Firestore on login in background without blocking UI
      if (effectiveUser && effectiveUser !== DEV_USER) {
        try {
          const userRef = doc(db, 'users', effectiveUser.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            await setDoc(userRef, {
              email: effectiveUser.email,
              displayName: effectiveUser.displayName,
              photoURL: effectiveUser.photoURL,
              createdAt: new Date().toISOString(),
            });

            // Generate initial "Liked Songs" playlist
            await addPlaylist(effectiveUser.uid, {
              name: 'Liked Songs',
              trackCount: 0,
              tracks: [],
              isLikedSongs: true,
            });
          }
        } catch (err) {
          console.warn('[Auth] Firestore user profile sync skipped:', err);
        }
      }
    });

    // ── Tauri Deep Link Listener ──────────────────────────────────────────
    let unlistenTauriDeepLink: (() => void) | undefined;
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      // Helper to process a melofy:// deep link URL (auth or listening sessions)
      const handleDeepLinkUrl = async (url: string) => {
        if (url.startsWith('melofy://auth')) {
          const urlObj = new URL(url);
          const customToken = urlObj.searchParams.get('token');
          if (customToken) {
            console.log('[Auth] Deep link received. Signing in with Custom Token...');
            const { signInWithCustomToken } = await import('firebase/auth');
            signInWithCustomToken(auth, customToken).catch(console.error);
          }
        } else if (url.startsWith('melofy://listen/')) {
          const partyId = url.replace('melofy://listen/', '').split('?')[0];
          if (partyId) {
            console.log(`[DeepLink] Redirecting to listen session: ${partyId}`);
            window.location.href = `/listen/${partyId.toUpperCase()}`;
          }
        }
      };

      // Export it globally so the Rust single-instance hook can call it directly
      (window as { __handleDeepLinkUrl?: (url: string) => void }).__handleDeepLinkUrl = handleDeepLinkUrl;

      // Check for pending deep link that arrived before JS was ready
      // (set by the Rust setup hook via window.eval)
      const pendingUrl = (window as { __MELOFY_PENDING_DEEP_LINK?: string }).__MELOFY_PENDING_DEEP_LINK;
      if (pendingUrl) {
        console.log('[Auth] Processing pending deep link from startup:', pendingUrl);
        delete (window as { __MELOFY_PENDING_DEEP_LINK?: string }).__MELOFY_PENDING_DEEP_LINK;
        handleDeepLinkUrl(pendingUrl);
      }

      // Listen for deep links that arrive while the app is running
      import('@tauri-apps/plugin-deep-link').then((m) => {
        const deepLinkPlugin = m as { 
          onOpenUrl?: typeof m.onOpenUrl; 
          default?: { onOpenUrl?: typeof m.onOpenUrl } 
        };
        const onOpenUrl = deepLinkPlugin.onOpenUrl || deepLinkPlugin.default?.onOpenUrl;
        
        if (!onOpenUrl) {
          console.error('Tauri deep link plugin not found');
          return;
        }
        
        onOpenUrl(async (urls: string[]) => {
          for (const url of urls) {
            await handleDeepLinkUrl(url);
          }
        }).then((unlisten) => {
          unlistenTauriDeepLink = unlisten;
        }).catch(console.error);
      }).catch(console.error);
    }

    return () => {
      unsubscribe();
      if (unlistenTauriDeepLink) unlistenTauriDeepLink();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      if (isDevEnvironment()) {
        console.log('[Auth] Dev mode active — signing in as Dev User');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('melofy_dev_signout');
        }
        setUser(DEV_USER);
        if (useHomeStore.getState().userId !== DEV_USER.uid) {
          useHomeStore.getState().resetForUser(DEV_USER.uid);
        }
        useLikedStore.getState().bindUser(DEV_USER.uid);
        return;
      }

      const isNative = isCapacitorNative();
      console.log('[Auth] signInWithGoogle — isCapacitorNative:', isNative);

      if (isNative) {
        // ── Native path: use @capgo/capacitor-social-login ───────────────────
        try {
          const { SocialLogin } = await import('@capgo/capacitor-social-login');

          await SocialLogin.initialize({
            google: {
              webClientId: '499485015638-sc946ao8esct09jf6klaa967fbs5bmce.apps.googleusercontent.com',
            },
          });

          const result = await SocialLogin.login({ provider: 'google', options: { scopes: ['profile', 'email'] } });
          
          // The capgo Google plugin returns the tokens directly inside the result object
          const idToken = (result.result as { idToken?: string })?.idToken;

          if (!idToken) throw new Error('Google Sign-In: no idToken returned from native provider.');
          
          await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
          return; // Success — exit early
        } catch (nativeError: unknown) {
          console.error('[Auth] Native SocialLogin failed:', nativeError);
          // Instead, show an alert with the error so the developer/user knows why it failed.
          const msg =
            nativeError && typeof nativeError === 'object' && 'message' in nativeError
              ? String((nativeError as { message: unknown }).message)
              : String(nativeError);
          alert(`Google Sign-In failed: ${msg}\n\nMake sure your SHA-1 (Debug or Release) is added to Firebase Console!`);
          throw nativeError;
        }
      }

      // ── Browser / Fallback path ────────────────────────────────────────────
      const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

      if (isTauri) {
        console.log('[Auth] Tauri detected — opening system browser for login');
        const m = await import('@tauri-apps/plugin-opener');
        const openerPlugin = m as {
          openUrl?: typeof m.openUrl;
          default?: { openUrl?: typeof m.openUrl };
        };
        const openBrowserUrl = openerPlugin.openUrl || openerPlugin.default?.openUrl;

        if (!openBrowserUrl) {
          throw new Error('Tauri opener plugin not found');
        }

        // Determine the URL depending on dev/prod
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const baseUrl = isDev ? window.location.origin : 'https://melofy.jene.in';

        await openBrowserUrl(`${baseUrl}/desktop-login`);
      } else {
        // Always try popup first — it works in regular browsers and modern WebViews.
        console.log('[Auth] Attempting signInWithPopup…');
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('melofy_dev_signout', 'true');
      }
      await firebaseSignOut(auth);
      setUser(null);
      if (useHomeStore.getState().userId !== null) {
        useHomeStore.getState().resetForUser(null);
      }
      useLikedStore.getState().bindUser(null);
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

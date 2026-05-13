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

    // ── Tauri Deep Link Listener ──────────────────────────────────────────
    let unlistenTauriDeepLink: (() => void) | undefined;
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      // Helper to process a melofy:// auth deep link URL
      const handleDeepLinkUrl = async (url: string) => {
        if (url.startsWith('melofy://auth')) {
          const urlObj = new URL(url);
          const customToken = urlObj.searchParams.get('token');
          if (customToken) {
            console.log('[Auth] Deep link received. Signing in with Custom Token...');
            const { signInWithCustomToken } = await import('firebase/auth');
            signInWithCustomToken(auth, customToken).catch(console.error);
          }
        }
      };

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
        } catch (nativeError) {
          console.error('[Auth] Native SocialLogin failed, attempting popup fallback:', nativeError);
        }
      }

      // ── Browser / Fallback path ────────────────────────────────────────────
      const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

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
        const isDev = window.location.hostname === 'localhost';
        const baseUrl = isDev ? 'http://localhost:3000' : 'https://melofy.jene.in';

        await openBrowserUrl(`${baseUrl}/desktop-login`);
      } else {
        // Always try popup first — it works in regular browsers and modern WebViews.
        // signInWithRedirect is fundamentally broken in Android WebView.
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

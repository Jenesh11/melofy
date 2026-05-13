'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music2,
  Play,
  Loader2,
  AlertCircle,
  RefreshCw,
  Monitor,
  Shield,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { app } from '@/lib/firebase/config';
import Link from 'next/link';

export default function DesktopLogin() {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [customToken, setCustomToken] = useState('');
  const [deepLinkFailed, setDeepLinkFailed] = useState(false);

  const attemptDeepLink = useCallback((token: string) => {
    const deepLinkUrl = `melofy://auth?token=${token}`;
    
    // Try the deep link
    window.location.href = deepLinkUrl;

    // If still on this page after 3 seconds, the deep link didn't work
    setTimeout(() => {
      // If the page is still visible, the deep link failed
      if (!document.hidden) {
        setDeepLinkFailed(true);
        setLoading(false);
        setStatus('Deep link did not open the app.');
      }
    }, 3000);
  }, []);

  const handleRetryDeepLink = useCallback(() => {
    if (!customToken) return;
    setDeepLinkFailed(false);
    setLoading(true);
    setStatus('Retrying deep link…');
    attemptDeepLink(customToken);
  }, [customToken, attemptDeepLink]);

  const handleDesktopAuth = async () => {
    try {
      setLoading(true);
      setError('');
      setDeepLinkFailed(false);
      setStatus('Opening Google Sign-In…');

      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);

      setStatus('Generating secure session…');
      const idToken = await result.user.getIdToken();

      const response = await fetch('/api/auth/custom-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to generate session token');
      }

      const { customToken: token } = await response.json();
      setCustomToken(token);

      setStatus('Redirecting to Melofy Desktop…');
      setDone(true);

      // Attempt the deep link
      attemptDeepLink(token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      console.error(err);
      if (message.includes('popup-closed-by-user')) {
        setError('Login was cancelled. Please try again.');
      } else {
        setError(message);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4 mb-10"
        >
          <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(var(--primary),0.2)] hover:scale-105 transition-transform duration-500">
            <Music2 className="h-12 w-12 text-primary-foreground" />
          </div>
          <div className="flex flex-col items-center text-center">
            <h1 className="text-4xl font-black tracking-tighter text-foreground">
              Melofy
            </h1>
            <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase mt-1">
              Desktop Authentication
            </p>
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: error ? [0, -10, 10, -10, 10, 0] : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
            x: { duration: 0.4 },
          }}
          className="bg-card/40 backdrop-blur-3xl border border-border p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center text-center"
        >
          {/* Desktop badge */}
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full mb-6">
            <Monitor className="w-3.5 h-3.5" />
            Desktop App
          </div>

          <AnimatePresence mode="wait">
            {done && deepLinkFailed ? (
              /* ── Deep link failed — show fallback options ──────────────── */
              <motion.div
                key="fallback-state"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full space-y-5"
              >
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-amber-500" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">
                    Couldn&apos;t Open App
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Authentication was successful, but we couldn&apos;t redirect to Melofy Desktop.
                    This is normal during development or on first install.
                  </p>
                </div>

                {/* Option 1: Retry Deep Link */}
                <button
                  className="w-full bg-foreground text-background hover:bg-foreground/90 h-12 rounded-full font-bold text-sm flex items-center justify-center transition-all duration-300 shadow-xl active:scale-[0.98]"
                  onClick={handleRetryDeepLink}
                >
                  <RotateCcw className="mr-2 w-4 h-4" />
                  Retry Opening App
                </button>

              </motion.div>
            ) : done ? (
              <motion.div
                key="done-state"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full space-y-4"
              >
                <div className="flex flex-col items-center gap-3 py-4">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                  <h2 className="text-2xl font-bold text-foreground">All Set!</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Your Melofy Desktop app should now be logged in.
                    You can safely close this browser tab.
                  </p>
                </div>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error-state"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full space-y-4"
              >
                <div className="mb-2">
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Oops!
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {error}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-red-500 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-2xl text-sm font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Authentication failed</span>
                </div>
                <button
                  disabled={loading}
                  className="w-full bg-foreground text-background hover:bg-foreground/90 h-14 rounded-full font-bold text-lg flex items-center justify-center transition-all duration-300 shadow-xl active:scale-[0.98] disabled:opacity-50"
                  onClick={() => {
                    setError('');
                    setStatus('');
                  }}
                >
                  <RefreshCw className="mr-2 w-5 h-5" />
                  Try Again
                </button>
              </motion.div>
            ) : loading ? (
              <motion.div
                key="loading-state"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full space-y-5 py-4"
              >
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground font-medium">{status}</p>
              </motion.div>
            ) : (
              <motion.div
                key="idle-state"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full space-y-6"
              >
                <div className="mb-2">
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Connect Your Account
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Sign in with Google to link your Melofy Desktop app.
                    Your session will be securely transferred.
                  </p>
                </div>

                {/* Trust indicators */}
                <div className="flex flex-col gap-2.5 text-left">
                  {[
                    { icon: Shield, text: 'End-to-end encrypted session transfer' },
                    { icon: ArrowRight, text: 'Automatically redirects back to the app' },
                    { icon: ExternalLink, text: 'Uses your browser\'s saved Google accounts' },
                  ].map(({ icon: Icon, text }, i) => (
                    <motion.div
                      key={text}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-center gap-3 text-sm text-muted-foreground"
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      {text}
                    </motion.div>
                  ))}
                </div>

                <button
                  disabled={loading}
                  className="w-full bg-foreground text-background hover:bg-foreground/90 h-14 rounded-full font-bold text-lg flex items-center justify-center group transition-all duration-300 shadow-xl active:scale-[0.98] disabled:opacity-50"
                  onClick={handleDesktopAuth}
                >
                  <div className="mr-3 flex items-center justify-center">
                    <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </div>
                  Sign in with Google
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-8 text-xs text-muted-foreground/60 font-medium px-4 leading-relaxed">
            By signing in, you agree to our{' '}
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors hover:underline"
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </motion.div>

        {/* Footer Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 flex flex-col items-center gap-4"
        >
          <Link
            href="/"
            className="text-muted-foreground hover:text-primary text-sm font-bold transition-all flex items-center gap-2 group"
          >
            <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center group-hover:border-primary transition-colors">
              <Play className="w-2 h-2 fill-current translate-x-px rotate-180" />
            </div>
            Back to Homepage
          </Link>
          <div className="flex items-center gap-4 text-xs text-muted-foreground/40">
            <Link href="/help" className="hover:text-muted-foreground transition-colors">
              Help
            </Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-muted-foreground transition-colors">
              Privacy
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-muted-foreground transition-colors">
              Terms
            </Link>
            <span>·</span>
            <Link href="/github" className="hover:text-muted-foreground transition-colors">
              GitHub
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

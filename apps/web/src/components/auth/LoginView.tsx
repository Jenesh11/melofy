'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music2,
  Play,
  Disc,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function LoginView() {
  const { signInWithGoogle } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      // Firebase error codes handle: auth/popup-closed-by-user etc.
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login was cancelled. Please try again.');
      } else {
        setError('Login failed. Please check your connection and try again.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className='min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden'>
      {/* Background Ambient Glows */}
      <div className='absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/10 rounded-full blur-[140px] pointer-events-none' />
      <div className='absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none' />

      <div className='w-full max-w-md relative z-10'>
        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='flex flex-col items-center gap-4 mb-10'
        >
          <div className='w-20 h-20 bg-primary rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(var(--primary),0.2)] hover:scale-105 transition-transform duration-500'>
            <Music2 className='h-12 w-12 text-primary-foreground' />
          </div>
          <div className='flex flex-col items-center text-center'>
            <h1 className='text-4xl font-black tracking-tighter text-foreground'>
              Melofy
            </h1>
            <p className='text-muted-foreground text-sm font-medium tracking-wide uppercase mt-1'>
              Elevate your sound
            </p>
          </div>
        </motion.div>

        {/* Login Card */}
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
            x: { duration: 0.4 }, // Shake duration
          }}
          className='bg-card/40 backdrop-blur-3xl border border-border p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center text-center'
        >
          <div className='mb-8'>
            <h2 className='text-2xl font-bold text-foreground mb-2'>
              {error ? 'Oops!' : 'Welcome Back'}
            </h2>
            <p className='text-muted-foreground text-sm leading-relaxed'>
              {error
                ? error
                : 'Sign in to sync your library, playlists and preferences across all devices.'}
            </p>
          </div>

          <AnimatePresence mode='wait'>
            {error ? (
              <motion.div
                key='error-state'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className='w-full space-y-4'
              >
                <div className='flex items-center gap-2 text-red-500 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-2xl text-sm font-medium mb-2'>
                  <AlertCircle className='w-4 h-4 shrink-0' />
                  <span>Authentication failed</span>
                </div>
                <Button
                  size='lg'
                  disabled={isAuthenticating}
                  className='w-full bg-foreground text-background hover:bg-foreground/90 h-14 rounded-full font-bold text-lg flex items-center justify-center transition-all duration-300 shadow-xl active:scale-[0.98]'
                  onClick={handleSignIn}
                >
                  {isAuthenticating ? (
                    <Loader2 className='w-6 h-6 animate-spin' />
                  ) : (
                    <>
                      <RefreshCw className='mr-2 w-5 h-5' />
                      Try Again
                    </>
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key='idle-state'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className='w-full'
              >
                <Button
                  size='lg'
                  disabled={isAuthenticating}
                  className='w-full bg-foreground text-background hover:bg-foreground/90 h-14 rounded-full font-bold text-lg flex items-center justify-center group transition-all duration-300 shadow-xl active:scale-[0.98]'
                  onClick={handleSignIn}
                >
                  {isAuthenticating ? (
                    <Loader2 className='w-6 h-6 animate-spin' />
                  ) : (
                    <>
                      <div className='mr-3 flex items-center justify-center'>
                        <svg className='w-5 h-5 mr-1' viewBox='0 0 24 24'>
                          <path
                            fill='currentColor'
                            d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                          />
                          <path
                            fill='currentColor'
                            d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                          />
                          <path
                            fill='currentColor'
                            d='M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z'
                          />
                          <path
                            fill='currentColor'
                            d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z'
                          />
                        </svg>
                      </div>
                      Sign in with Google
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <p className='mt-8 text-xs text-muted-foreground/60 font-medium px-4 leading-relaxed'>
            By signing in, you agree to our{' '}
            <span className='text-muted-foreground hover:text-foreground cursor-pointer transition-colors'>
              Terms of Service
            </span>{' '}
            and{' '}
            <span className='text-muted-foreground hover:text-foreground cursor-pointer transition-colors'>
              Privacy Policy
            </span>
            .
          </p>
        </motion.div>

        {/* Footer Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className='mt-10 flex justify-center'
        >
          <Link
            href='/'
            className='text-muted-foreground hover:text-primary text-sm font-bold transition-all flex items-center gap-2 group'
          >
            <div className='w-5 h-5 rounded-full border border-border flex items-center justify-center group-hover:border-primary transition-colors'>
              <Play className='w-2 h-2 fill-current translate-x-px rotate-180' />
            </div>
            Back to Homepage
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

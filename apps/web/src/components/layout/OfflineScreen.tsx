'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export function OfflineScreen() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Only apply on native platform if requested, or we can apply it everywhere.
    // The user said "when the phone app is offline", but it works well on web too.
    
    // Initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className='fixed inset-0 z-[9999] bg-background/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center'
        >
          <div className='p-8 rounded-full bg-foreground/5 backdrop-blur-3xl border border-foreground/10 animate-pulse mb-8'>
            <WifiOff className='h-16 w-16 text-foreground/40' />
          </div>
          <h2 className='text-3xl font-black text-foreground tracking-tight mb-4'>
            You're offline
          </h2>
          <p className='text-foreground/60 max-w-sm font-medium mb-8'>
            Please check your internet connection. Melofy needs an active connection to stream your music.
          </p>
          <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary animate-pulse'>
            Waiting for connection...
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

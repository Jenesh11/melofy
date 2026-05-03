'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OfflineScreen() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    const checkConnection = async () => {
      // If browser explicitly says offline, trust it
      if (!navigator.onLine) {
        setIsOnline(false);
        return;
      }
      
      // Browser says online, but let's verify actual internet access
      // by pinging a reliable, fast external endpoint.
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 3000); // 3s timeout
        // Ping Google's generate_204 endpoint or a public DNS for a tiny response
        await fetch('https://www.google.com/generate_204', {
          mode: 'no-cors',
          signal: controller.signal,
          cache: 'no-store'
        });
        clearTimeout(id);
        setIsOnline(true);
      } catch (e) {
        // Fetch failed = no actual internet
        setIsOnline(false);
      }
    };

    // Check immediately on mount
    checkConnection();

    // Check periodically just in case (every 10s)
    const interval = setInterval(checkConnection, 10000);

    const handleOnline = () => checkConnection();
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='fixed inset-0 z-[10000] bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center'
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className='bg-card border border-border shadow-2xl rounded-[2.5rem] p-12 flex flex-col items-center gap-8 max-w-sm w-full'
          >
            <div className='w-20 h-20 rounded-full bg-muted flex items-center justify-center relative'>
              <WifiOff className='h-8 w-8 text-muted-foreground' />
              <div className='absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border-2 border-card flex items-center justify-center'>
                <div className='w-2 h-2 rounded-full bg-red-500 animate-pulse' />
              </div>
            </div>

            <div className='flex flex-col gap-2'>
              <h2 className='text-2xl font-bold text-foreground tracking-tight'>
                You&apos;re offline
              </h2>
              <p className='text-muted-foreground text-sm font-medium'>
                Check your connection and try again.
              </p>
            </div>

            <Button
              onClick={handleRetry}
              variant='outline'
              className='h-12 px-10 rounded-full font-bold text-sm border-border hover:bg-foreground hover:text-background transition-all flex items-center gap-2'
            >
              <RefreshCcw className='w-4 h-4' />
              Retry
            </Button>
          </motion.div>

          {/* Footer Status */}
          <div className='absolute bottom-10 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-foreground/20'>
            Melofy Web Player
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SyncedLyrics } from '@/components/ui/SyncedLyrics';
import { useLyricsPanelStore } from '@/store/useLyricsPanelStore';

export function LyricsPanel() {
  const { isOpen, close } = useLyricsPanelStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          key='lyrics-panel'
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 360, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className='hidden md:flex shrink-0 flex-col h-full overflow-hidden border-l border-border bg-background/80 backdrop-blur-2xl relative z-10'
          style={{ minWidth: 0 }}
        >
          {/* Header */}
          <div className='flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50 shrink-0'>
            <div className='flex flex-col gap-0.5'>
              <p className='text-xs font-black uppercase tracking-[0.25em] text-primary'>
                Lyrics
              </p>
            </div>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/10'
              onClick={close}
              title='Close lyrics'
            >
              <X className='h-4 w-4' />
            </Button>
          </div>

          {/* Lyrics content */}
          <div className='flex-1 min-h-0 overflow-hidden relative'>
            <SyncedLyrics compact />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

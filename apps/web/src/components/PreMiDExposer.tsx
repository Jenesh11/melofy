'use client';

import { useEffect } from 'react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';

declare global {
  interface Window {
    melofy?: {
      track: Track | null;
      isPlaying: boolean;
      progress: number;
      partyId: string | null;
      version: string;
    };
  }
}

/**
 * Exposes the player's current state to the window object for 
 * external integrations like PreMiD to hook into.
 */
export function PreMiDExposer() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const progress = usePlayerStore((state) => state.progress);
  const partyId = usePlayerStore((state) => state.partyId);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!window.melofy) {
        window.melofy = {
          track: currentTrack,
          isPlaying,
          progress,
          partyId,
          version: '5.0.1',
        };
      } else {
        window.melofy.track = currentTrack;
        window.melofy.isPlaying = isPlaying;
        window.melofy.progress = progress;
        window.melofy.partyId = partyId;
        window.melofy.version = '5.0.1';
      }
      
      // Dispatch event to proactively notify external listeners (like PreMiD)
      window.dispatchEvent(new CustomEvent('melofy_state_update', { detail: window.melofy }));
    }
  }, [currentTrack, isPlaying, progress, partyId]);

  return null;
}

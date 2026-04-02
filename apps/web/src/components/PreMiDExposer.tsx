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
      window.melofy = {
        track: currentTrack,
        isPlaying,
        progress,
        partyId,
        version: '1.0.1',
      };
    }
  }, [currentTrack, isPlaying, progress, partyId]);

  return null;
}

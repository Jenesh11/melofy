'use client';

import { useEffect } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';

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
      (window as any).melofy = {
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

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Track } from '@/store/usePlayerStore';
import { seedMetadata } from '@/lib/discovery';

const MAX_SKIPS = 50;
/** A skip this early means "not for me", not "heard enough". */
const EARLY_SKIP_MS = 30_000;
const EARLY_SKIP_FRACTION = 0.4;

type TrackMetadata = ReturnType<typeof seedMetadata>;

interface TasteStore {
  userId: string | null;
  skipped: TrackMetadata[];
  bindUser: (userId: string | null) => void;
  /** Records a user-initiated skip when it happened early in the track. */
  recordSkip: (track: Track, progressMs: number) => void;
}

export const useTasteStore = create<TasteStore>()(
  persist(
    (set) => ({
      userId: null,
      skipped: [],
      bindUser: (userId) => set(state => state.userId === userId ? state : { userId, skipped: [] }),
      recordSkip: (track, progressMs) => set(state => {
        const early = progressMs < EARLY_SKIP_MS || (track.duration > 0 && progressMs < track.duration * EARLY_SKIP_FRACTION);
        if (!state.userId || !early) return state;
        const skipped = [...state.skipped.filter(t => t.id !== track.id), seedMetadata(track)];
        return { skipped: skipped.slice(-MAX_SKIPS) };
      }),
    }),
    { name: 'melofy_taste_store' },
  ),
);

/** Skips belonging to the signed-in user only. */
export function skippedFor(userId: string | undefined | null): TrackMetadata[] {
  const state = useTasteStore.getState();
  return userId && state.userId === userId ? state.skipped : [];
}

import { useEffect, useRef, useCallback, useState } from 'react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { useShallow } from 'zustand/react/shallow';
import { useAuth } from '@/lib/firebase/auth-context';
import { Capacitor } from '@capacitor/core';

interface PersistedPlayerState {
  currentTrack?: Track | null;
  queue?: Track[];
  history?: Track[];
  isShuffle?: boolean;
  isRepeat?: boolean;
  volume?: number;
  currentTime?: number;
  activePlaylistContext?: Track[] | null;
  activeCollectionId?: string | null;
  activeCollectionType?: 'spotify' | 'custom' | null;
  partyId?: string | null;
  hostName?: string | null;
  isPartyHost?: boolean;
  listenersCanControl?: boolean;
}

export function usePlayerSync(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  setLocalTime: (time: number) => void
) {
  const { user } = useAuth();
  const [isHydrated, setIsHydrated] = useState(false);
  const stateSyncTimer = useRef<NodeJS.Timeout | null>(null);

  const {
    currentTrack,
    queue,
    history,
    isShuffle,
    isRepeat,
    volume,
    activePlaylistContext,
    activeCollectionId,
    activeCollectionType,
    hydrateState,
    resetStore,
  } = usePlayerStore(useShallow((state) => ({
    currentTrack: state.currentTrack,
    queue: state.queue,
    history: state.history,
    isShuffle: state.isShuffle,
    isRepeat: state.isRepeat,
    volume: state.volume,
    activePlaylistContext: state.activePlaylistContext,
    activeCollectionId: state.activeCollectionId,
    activeCollectionType: state.activeCollectionType,
    hydrateState: state.hydrateState,
    resetStore: state.reset,
  })));

  const getAuthHeader = useCallback(async () => {
    if (!user) return null;
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [user]);

  // Tracks user to handle resets correctly
  const lastUidRef = useRef(user?.uid);
  if (lastUidRef.current !== user?.uid) {
    lastUidRef.current = user?.uid;
    resetStore();
    // Setting state during render is specifically allowed for 'reset' logic
    setIsHydrated(false);
  }

  // Hydration
  useEffect(() => {
    if (!user?.uid) return;

    // Skip database hydration if an active party session is already loaded in-memory (e.g. joined a session or started hosting)
    const { partyId } = usePlayerStore.getState();
    if (partyId) {
      console.log(`[PlayerSync] Active party session detected (${partyId}). Skipping database hydration to prevent state override.`);
      setTimeout(() => setIsHydrated(true), 0);
      return;
    }

    getAuthHeader()
      .then((headers) => {
        if (!headers) {
          setIsHydrated(true);
          return null;
        }
        return fetch('/api/player-state', { headers });
      })
      .then((res) => {
        if (res === null) return;
        if (!res.ok) throw new Error('Failed to fetch player state');
        return res.json();
      })
      .then((data) => {
        if (!data?.state) {
          setIsHydrated(true);
          return;
        }

        let state: PersistedPlayerState = data.state;
        if (typeof state === 'string') {
          try {
            state = JSON.parse(state) as PersistedPlayerState;
          } catch {
            console.error('[PlayerState] Failed to parse state string');
            return;
          }
        }

        hydrateState({
          ...state,
          queue: state.queue || [],
          history: state.history || [],
          isShuffle: state.isShuffle || false,
          isRepeat: state.isRepeat || false,
          volume: state.volume ?? (Capacitor.isNativePlatform() ? 1 : 0.8),
        });

        if (audioRef.current && state.currentTime) {
          audioRef.current.currentTime = state.currentTime;
          setLocalTime(state.currentTime);
        }

        setIsHydrated(true);
      })
      .catch((err) => {
        console.error('[PlayerState] Hydration failed:', err);
      });
  }, [user?.uid, getAuthHeader, hydrateState, setLocalTime, audioRef]);

  const syncStateToServer = useCallback(async () => {
    if (!user?.uid || !isHydrated) return;

    const prunedHistory = history.slice(-50);
    const stateToSave = {
      currentTrack,
      queue,
      history: prunedHistory,
      isShuffle,
      isRepeat,
      volume,
      currentTime: audioRef.current?.currentTime || 0,
      activePlaylistContext,
      activeCollectionId,
      activeCollectionType,
      partyId: usePlayerStore.getState().partyId,
      isPartyHost: usePlayerStore.getState().isPartyHost,
      listenersCanControl: usePlayerStore.getState().listenersCanControl,
    };

    try {
      const authHeaders = await getAuthHeader();
      if (!authHeaders) return;

      await fetch('/api/player-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ state: stateToSave }),
      });
    } catch (error) {
      console.error('[PlayerState] Sync failed:', error);
    }
  }, [
    user?.uid,
    isHydrated,
    history,
    currentTrack,
    queue,
    isShuffle,
    isRepeat,
    volume,
    activePlaylistContext,
    activeCollectionId,
    activeCollectionType,
    getAuthHeader,
    audioRef,
  ]);

  // Throttled sync
  useEffect(() => {
    if (!user?.uid || !isHydrated) return;

    if (stateSyncTimer.current) clearTimeout(stateSyncTimer.current);
    stateSyncTimer.current = setTimeout(() => {
      syncStateToServer();
    }, 2000);

    return () => {
      if (stateSyncTimer.current) clearTimeout(stateSyncTimer.current);
    };
  }, [syncStateToServer, user?.uid, isHydrated]);

  return { isHydrated, syncStateToServer };
}

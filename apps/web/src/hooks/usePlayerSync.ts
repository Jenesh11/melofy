import { useEffect, useRef, useCallback, useState } from 'react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { useShallow } from 'zustand/react/shallow';
import { useAuth } from '@/lib/firebase/auth-context';
import { Capacitor } from '@capacitor/core';
import { useLibraryStore, type SavedCollection } from '@/store/useLibraryStore';

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
  activeCollectionType?: 'spotify' | 'custom' | 'youtube' | null;
  recentPlaylists?: SavedCollection[];
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
  const [hydratedUid, setHydratedUid] = useState<string | null>(null);
  const isHydrated = !!user && hydratedUid === user.uid;
  const stateSyncTimer = useRef<NodeJS.Timeout | null>(null);
  const recentPlaylists = useLibraryStore((state) => state.recentPlaylists);

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

  const lastUidRef = useRef(user?.uid);
  useEffect(() => {
    if (lastUidRef.current !== user?.uid) {
      lastUidRef.current = user?.uid;
      resetStore();
      useLibraryStore.setState({ recentPlaylists: [] });
    }
    if (!user) return;
    const uid = user.uid;
    const controller = new AbortController();
    const initialRevision = usePlayerStore.getState().playbackRevision;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    async function hydrate() {
      let deadline: ReturnType<typeof setTimeout> | undefined;
      const requestController = new AbortController();
      const abort = () => requestController.abort();
      controller.signal.addEventListener('abort', abort, { once: true });
      try {
        const headers = await getAuthHeader();
        if (!headers || controller.signal.aborted) return;
        if (usePlayerStore.getState().partyId) { setHydratedUid(uid); return; }
        deadline = setTimeout(abort, 10000);
        const response = await fetch('/api/player-state', { headers, signal: requestController.signal });
        if (!response.ok) throw new Error('State fetch failed');
        const data = await response.json();
        if (controller.signal.aborted) return;
        const state: PersistedPlayerState | null = typeof data.state === 'string' ? JSON.parse(data.state) : data.state;
        const live = usePlayerStore.getState();
        // Never replace a new local selection or a party joined while loading.
        if (state && !live.partyId && live.playbackRevision === initialRevision) {
          hydrateState({
            ...state, queue: Array.isArray(state.queue) ? state.queue : [],
            history: Array.isArray(state.history) ? state.history : [],
            isShuffle: !!state.isShuffle, isRepeat: !!state.isRepeat,
            volume: state.volume ?? (Capacitor.isNativePlatform() ? 1 : 0.8),
          });
          if (Array.isArray(state.recentPlaylists)) useLibraryStore.setState({ recentPlaylists: state.recentPlaylists });
          const time = typeof state.currentTime === 'number' && Number.isFinite(state.currentTime) ? Math.max(0, state.currentTime) : 0;
          setLocalTime(time);
          if (!Capacitor.isNativePlatform() && audioRef.current) audioRef.current.currentTime = time;
        }
        setHydratedUid(uid);
      } catch {
        if (!controller.signal.aborted) {
          // Keep saves disabled until the read succeeds; never overwrite saved state with defaults.
          timer = setTimeout(() => { void hydrate(); }, Math.min(30000, 1000 * 2 ** Math.min(attempt++, 5)));
        }
      } finally {
        if (deadline) clearTimeout(deadline);
        controller.signal.removeEventListener('abort', abort);
      }
    }
    void hydrate();
    return () => { controller.abort(); if (timer) clearTimeout(timer); setHydratedUid(null); };
  }, [user, getAuthHeader, hydrateState, resetStore, setLocalTime, audioRef]);

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
      currentTime: Capacitor.isNativePlatform() ? usePlayerStore.getState().progress / 1000 : audioRef.current?.currentTime || 0,
      activePlaylistContext,
      activeCollectionId,
      activeCollectionType,
      recentPlaylists,
      partyId: usePlayerStore.getState().partyId,
      isPartyHost: usePlayerStore.getState().isPartyHost,
      listenersCanControl: usePlayerStore.getState().listenersCanControl,
    };

    try {
      const authHeaders = await getAuthHeader();
      if (!authHeaders) return;

      const response = await fetch('/api/player-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ state: stateToSave }),
      });
      if (!response.ok) throw new Error('State save failed');
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
    recentPlaylists,
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

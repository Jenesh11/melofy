import { create } from 'zustand';
import { toast } from 'sonner';

export interface Track {
  id: string; // Spotify ID or internal ID
  identifier?: string; // YouTube Video ID (e.g. Y_BXtthvuaA)
  title: string;
  artist: string;
  artworkUrl: string;
  duration: number; // in milliseconds
  url?: string; // NodeLink encoded track string
}

export interface PartyListener {
  userId: string;
  username: string;
}

export interface LyricsData {
  syncedLyrics: string;
  plainLyrics: string;
}

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  queue: Track[];
  history: Track[];
  isShuffle: boolean;
  isRepeat: boolean;
  isAutoplay: boolean;
  activePlaylistContext: Track[] | null;
  activeCollectionId: string | null;
  activeCollectionType: 'spotify' | 'custom' | 'youtube' | null;

  // Party State
  partyId: string | null;
  hostName: string | null;
  isPartyHost: boolean;
  listenersCanControl: boolean;
  partyListeners: PartyListener[];
  lyricsCache: Record<string, LyricsData>;

  // Actions
  canControlPlayback: () => boolean;
  play: (track: Track, force?: boolean) => void;
  /** Play a track within a context (e.g. a carousel section). Sets the remaining tracks as queue. */
  playInContext: (track: Track, allTracks: Track[], force?: boolean) => void;
  pause: (force?: boolean) => void;
  resume: (force?: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  addToQueue: (track: Track) => void;
  setQueue: (tracks: Track[]) => void;
  playPlaylist: (
    tracks: Track[],
    collectionId?: string,
    collectionType?: 'spotify' | 'custom' | 'youtube',
    force?: boolean
  ) => void;
  playFromQueue: (index: number, force?: boolean) => void;
  playNext: (force?: boolean) => void;
  playPrevious: (force?: boolean) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleAutoplay: () => void;
  setLyrics: (id: string, lyrics: LyricsData) => void;
  updateTrackUrl: (id: string, url: string, identifier?: string) => void;
  hydrateState: (state: Partial<PlayerState>) => void;
  setPlaying: (isPlaying: boolean) => void;
  reset: () => void;
  setParty: (partyId: string, isHost: boolean, hostName?: string) => void;
  clearParty: () => void;
  setListenersCanControl: (canControl: boolean) => void;
  setPartyListeners: (listeners: PartyListener[]) => void;
}

import { Capacitor } from '@capacitor/core';

const initialState = {
  currentTrack: null,
  isPlaying: false,
  volume: Capacitor.isNativePlatform() ? 1 : 0.8,
  progress: 0,
  queue: [],
  history: [],
  isShuffle: false,
  isRepeat: false,
  isAutoplay: false,
  activePlaylistContext: null,
  activeCollectionId: null,
  activeCollectionType: null,
  partyId: null,
  hostName: null,
  isPartyHost: false,
  listenersCanControl: false,
  partyListeners: [],
  lyricsCache: {},
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  ...initialState,

  canControlPlayback: () => {
    const state = get();
    if (state.partyId && !state.isPartyHost && !state.listenersCanControl) {
      toast.error('The host has locked playback controls.');
      return false;
    }
    return true;
  },

  play: (track, force = false) => {
    if (!force && !get().canControlPlayback()) return;
    set((state) => ({
      history: state.currentTrack
        ? [...state.history, state.currentTrack]
        : state.history,
      currentTrack: track,
      isPlaying: true,
      progress: 0,
      queue: [], // explicitly clear the queue on single manual play
      activePlaylistContext: null, // clear context on manual individual play
      activeCollectionId: null,
      activeCollectionType: null,
    }));
  },

  playInContext: (track, allTracks, force = false) => {
    if (!force && !get().canControlPlayback()) return;
    const trackIndex = allTracks.findIndex(
      (t) => t.id === track.id || t.title === track.title,
    );
    const remaining = trackIndex >= 0 ? allTracks.slice(trackIndex + 1) : [];
    set((state) => ({
      history: state.currentTrack
        ? [...state.history, state.currentTrack]
        : state.history,
      currentTrack: track,
      queue: remaining,
      activePlaylistContext: allTracks,
      activeCollectionId: null,
      activeCollectionType: null,
      isPlaying: true,
      progress: 0,
    }));
  },

  pause: (force = false) => {
    if (!force && !get().canControlPlayback()) return;
    set({ isPlaying: false });
  },
  resume: (force = false) => {
    if (!force && !get().canControlPlayback()) return;
    set({ isPlaying: true });
  },
  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
  setQueue: (tracks) => set({ queue: tracks }),
  playPlaylist: (tracks, collectionId, collectionType, force = false) => {
    if (!force && !get().canControlPlayback()) return;
    if (tracks.length === 0) return;
    set((state) => ({
      history: state.currentTrack
        ? [...state.history, state.currentTrack]
        : state.history,
      currentTrack: tracks[0],
      queue: tracks.slice(1),
      activePlaylistContext: tracks,
      activeCollectionId: collectionId || null,
      activeCollectionType: collectionType || null,
      isPlaying: true,
      progress: 0,
    }));
  },
  playFromQueue: (index, force = false) => {
    if (!force && !get().canControlPlayback()) return;
    const { queue, currentTrack, history } = get();
    if (index < 0 || index >= queue.length) return;

    const nextTrack = queue[index];
    const skippedTracks = queue.slice(0, index);

    set({
      history: currentTrack ? [...history, currentTrack, ...skippedTracks] : [...history, ...skippedTracks],
      currentTrack: nextTrack,
      queue: queue.slice(index + 1),
      isPlaying: true,
      progress: 0,
    });
  },
  playNext: (force = false) => {
    if (!force && !get().canControlPlayback()) return;
    const { queue, currentTrack, history, isRepeat, isShuffle } = get();

    // Handle repeat state
    if (isRepeat && currentTrack) {
      set({ progress: 0, isPlaying: true });
      return;
    }

    if (queue.length > 0) {
      let nextTrackIndex = 0;

      // Handle shuffle state
      if (isShuffle && queue.length > 1) {
        nextTrackIndex = Math.floor(Math.random() * queue.length);
      }

      const nextTrack = queue[nextTrackIndex];
      const newQueue = [...queue];
      newQueue.splice(nextTrackIndex, 1);

      set({
        history: currentTrack ? [...history, currentTrack] : history,
        currentTrack: nextTrack,
        queue: newQueue,
        isPlaying: true,
        progress: 0,
      });
    } else {
      // Reached the end of the queue
      const { activePlaylistContext } = get();

      // If we are in a playlist context and repeat is on, loop the context
      if (
        activePlaylistContext &&
        activePlaylistContext.length > 0 &&
        isRepeat
      ) {
        let firstTrack = activePlaylistContext[0];
        let remainingTracks = activePlaylistContext.slice(1);

        if (isShuffle) {
          const randomIndex = Math.floor(
            Math.random() * activePlaylistContext.length,
          );
          firstTrack = activePlaylistContext[randomIndex];
          remainingTracks = [...activePlaylistContext];
          remainingTracks.splice(randomIndex, 1);
        }

        set({
          history: currentTrack ? [...history, currentTrack] : history,
          currentTrack: firstTrack,
          queue: remainingTracks,
          isPlaying: true,
          progress: 0,
        });
        return;
      }

      set({
        history: currentTrack ? [...history, currentTrack] : history,
        currentTrack: null,
        isPlaying: false,
        progress: 0,
      });
    }
  },
  playPrevious: (force = false) => {
    if (!force && !get().canControlPlayback()) return;
    const { history, currentTrack, queue } = get();
    if (history.length > 0) {
      const previousTrack = history[history.length - 1];
      set({
        currentTrack: previousTrack,
        history: history.slice(0, -1),
        queue: currentTrack ? [currentTrack, ...queue] : queue,
        isPlaying: true,
        progress: 0,
      });
    } else {
      set({ progress: 0 }); // restart track if no history
    }
  },
  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
  toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),
  toggleAutoplay: () => set((state) => ({ isAutoplay: !state.isAutoplay })),
  setLyrics: (id, lyrics) =>
    set((state) => ({
      lyricsCache: { ...state.lyricsCache, [id]: lyrics },
    })),
  updateTrackUrl: (id, url, identifier) =>
    set((state) => {
      const nextCurrentTrack =
        state.currentTrack && state.currentTrack.id === id
          ? {
              ...state.currentTrack,
              url,
              identifier: identifier || state.currentTrack.identifier,
            }
          : state.currentTrack;

      const queueIndex = state.queue.findIndex((track) => track.id === id);
      if (queueIndex === -1 && nextCurrentTrack === state.currentTrack) {
        return state;
      }

      let nextQueue = state.queue;
      if (queueIndex >= 0) {
        nextQueue = [...state.queue];
        nextQueue[queueIndex] = {
          ...nextQueue[queueIndex],
          url,
          identifier: identifier || nextQueue[queueIndex].identifier,
        };
      }

      return {
        currentTrack: nextCurrentTrack,
        queue: nextQueue,
      };
    }),
  hydrateState: (newState) =>
    set((state) => ({
      ...state,
      ...newState,
      isPlaying: false,
      partyId: newState.partyId || null,
      hostName: newState.hostName || null,
      isPartyHost: newState.isPartyHost || false,
      listenersCanControl: newState.listenersCanControl || false,
    })),
  setPlaying: (isPlaying) => set({ isPlaying }),
  reset: () => set(initialState),
  setParty: (partyId, isHost, hostName) => set({ partyId, isPartyHost: isHost, hostName: hostName || null }),
  clearParty: () => set({ partyId: null, hostName: null, isPartyHost: false, listenersCanControl: false, partyListeners: [] }),
  setListenersCanControl: (canControl) => set({ listenersCanControl: canControl }),
  setPartyListeners: (listeners) => set({ partyListeners: listeners }),
}));

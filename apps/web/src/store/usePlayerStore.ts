import { create } from 'zustand';

export interface Track {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
  duration: number; // in milliseconds
  url?: string;
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
  
  // Actions
  play: (track: Track) => void;
  pause: () => void;
  resume: () => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  addToQueue: (track: Track) => void;
  setQueue: (tracks: Track[]) => void;
  playPlaylist: (tracks: Track[]) => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleAutoplay: () => void;
  hydrateState: (state: Partial<PlayerState>) => void;
  setPlaying: (isPlaying: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  queue: [],
  history: [],
  isShuffle: false,
  isRepeat: false,
  isAutoplay: false,
  activePlaylistContext: null,

  play: (track) => set((state) => ({ 
    history: state.currentTrack ? [...state.history, state.currentTrack] : state.history,
    currentTrack: track, 
    isPlaying: true,
    progress: 0,
    queue: [], // explicitly clear the queue on single manual play 
    activePlaylistContext: null, // clear context on manual individual play
  })),
  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
  setQueue: (tracks) => set({ queue: tracks }),
  playPlaylist: (tracks) => {
    if (tracks.length === 0) return;
    set((state) => ({
      history: state.currentTrack ? [...state.history, state.currentTrack] : state.history,
      currentTrack: tracks[0],
      queue: tracks.slice(1),
      activePlaylistContext: tracks,
      isPlaying: true,
      progress: 0
    }));
  },
  playNext: () => {
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
      if (activePlaylistContext && activePlaylistContext.length > 0 && isRepeat) {
        let firstTrack = activePlaylistContext[0];
        let remainingTracks = activePlaylistContext.slice(1);
        
        if (isShuffle) {
          const randomIndex = Math.floor(Math.random() * activePlaylistContext.length);
          firstTrack = activePlaylistContext[randomIndex];
          remainingTracks = [...activePlaylistContext];
          remainingTracks.splice(randomIndex, 1);
        }

        set({
          history: currentTrack ? [...history, currentTrack] : history,
          currentTrack: firstTrack,
          queue: remainingTracks,
          isPlaying: true,
          progress: 0
        });
        return;
      }

      set({ 
        history: currentTrack ? [...history, currentTrack] : history,
        currentTrack: null, 
        isPlaying: false, 
        progress: 0 
      });
    }
  },
  playPrevious: () => {
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
  hydrateState: (newState) => set((state) => ({ ...state, ...newState, isPlaying: false })), // Always start paused on reload
  setPlaying: (isPlaying) => set({ isPlaying }),
}));

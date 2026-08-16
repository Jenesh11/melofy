import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track as FirebaseTrack } from '@/lib/firebase/playlists';

interface LikedStore {
  likedTracks: FirebaseTrack[];
  likedPlaylistId: string | null;
  isLoading: boolean;
  setLikedTracks: (tracks: FirebaseTrack[]) => void;
  setLikedPlaylistId: (id: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  addLikedTrack: (track: FirebaseTrack) => void;
  removeLikedTrack: (trackId: string) => void;
}

export const useLikedStore = create<LikedStore>()(
  persist(
    (set) => ({
      likedTracks: [],
      likedPlaylistId: null,
      isLoading: false,
      setLikedTracks: (tracks) => set({ likedTracks: tracks }),
      setLikedPlaylistId: (id) => set({ likedPlaylistId: id }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      addLikedTrack: (track) => 
        set((state) => {
          const trackId = track.info?.identifier || (track as any).id || (track as any).identifier;
          if (state.likedTracks.some(t => (t.info?.identifier || (t as any).id || (t as any).identifier) === trackId)) {
            return state;
          }
          return { likedTracks: [...state.likedTracks, track] };
        }),
      removeLikedTrack: (trackId) => 
        set((state) => ({ 
          likedTracks: state.likedTracks.filter(t => (t.info?.identifier || (t as any).id || (t as any).identifier) !== trackId) 
        })),
    }),
    {
      name: 'melofy_liked_tracks_store',
    }
  )
);

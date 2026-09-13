import { libraryTrackId } from '@/lib/library-tracks';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track as FirebaseTrack } from '@/lib/firebase/playlists';

interface LikedStore {
  userId: string | null;
  bindUser: (userId: string | null) => void;
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
      userId: null,
      bindUser: (userId) => set(state => state.userId === userId ? state : ({ userId, likedTracks: [], likedPlaylistId: null, isLoading: !!userId })),
      likedTracks: [],
      likedPlaylistId: null,
      isLoading: false,
      setLikedTracks: (tracks) => set({ likedTracks: tracks }),
      setLikedPlaylistId: (id) => set({ likedPlaylistId: id }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      addLikedTrack: (track) =>
        set((state) => {
          const trackId = libraryTrackId(track);
          if (state.likedTracks.some(t => libraryTrackId(t) === trackId)) {
            return state;
          }
          return { likedTracks: [...state.likedTracks, track] };
        }),
      removeLikedTrack: (trackId) =>
        set((state) => ({
          likedTracks: state.likedTracks.filter(t => libraryTrackId(t) !== trackId)
        })),
    }),
    {
      name: 'melofy_liked_tracks_store',
    }
  )
);

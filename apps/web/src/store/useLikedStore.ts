import { create } from 'zustand';
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

export const useLikedStore = create<LikedStore>((set) => ({
  likedTracks: [],
  likedPlaylistId: null,
  isLoading: true,
  setLikedTracks: (tracks) => set({ likedTracks: tracks }),
  setLikedPlaylistId: (id) => set({ likedPlaylistId: id }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  addLikedTrack: (track) => 
    set((state) => ({ 
      likedTracks: [...state.likedTracks, track] 
    })),
  removeLikedTrack: (trackId) => 
    set((state) => ({ 
      likedTracks: state.likedTracks.filter(t => t.info.identifier !== trackId) 
    })),
}));

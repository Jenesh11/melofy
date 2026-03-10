import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedCollection {
  id: string; // Spotify ID or Custom UUID
  name: string;
  artworkUrl: string;
  type: 'custom' | 'spotify' | 'youtube';
  trackCount?: number;
  tracks?: any[]; // Only for custom playlists
}

interface LibraryState {
  savedPlaylists: SavedCollection[];
  addPlaylist: (playlist: SavedCollection) => void;
  removePlaylist: (id: string) => void;
  isSaved: (id: string) => boolean;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      savedPlaylists: [],
      addPlaylist: (playlist) =>
        set((state) => ({
          savedPlaylists: [...state.savedPlaylists, playlist],
        })),
      removePlaylist: (id) =>
        set((state) => ({
          savedPlaylists: state.savedPlaylists.filter((p) => p.id !== id),
        })),
      isSaved: (id) => get().savedPlaylists.some((p) => p.id === id),
    }),
    {
      name: 'melofy_library',
    },
  ),
);

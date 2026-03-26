import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedCollection {
  id: string; // Spotify ID or Custom UUID
  name: string;
  artworkUrl: string;
  type: 'custom' | 'spotify' | 'youtube';
  trackCount?: number;
  tracks?: unknown[]; // Only for custom playlists
  isLikedSongs?: boolean;
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
        set((state) => {
          const existingIndex = state.savedPlaylists.findIndex(
            (entry) => entry.id === playlist.id,
          );

          if (existingIndex === -1) {
            return {
              savedPlaylists: [...state.savedPlaylists, playlist],
            };
          }

          const nextPlaylists = [...state.savedPlaylists];
          nextPlaylists[existingIndex] = playlist;
          return { savedPlaylists: nextPlaylists };
        }),
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

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
  recentPlaylists: SavedCollection[];
  addPlaylist: (playlist: SavedCollection) => void;
  removePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  isSaved: (id: string) => boolean;
  addRecentPlaylist: (playlist: SavedCollection) => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      savedPlaylists: [],
      recentPlaylists: [],
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
          recentPlaylists: (state.recentPlaylists || []).filter((p) => p.id !== id),
        })),
      renamePlaylist: (id, name) =>
        set((state) => ({
          savedPlaylists: state.savedPlaylists.map((p) =>
            p.id === id ? { ...p, name } : p,
          ),
          recentPlaylists: (state.recentPlaylists || []).map((p) =>
            p.id === id ? { ...p, name } : p,
          ),
        })),
      isSaved: (id) => get().savedPlaylists.some((p) => p.id === id),
      addRecentPlaylist: (playlist) =>
        set((state) => {
          const recent = state.recentPlaylists || [];
          const filtered = recent.filter((p) => p.id !== playlist.id);
          const nextRecent = [playlist, ...filtered].slice(0, 10);
          return { recentPlaylists: nextRecent };
        }),
    }),
    {
      name: 'melofy_library',
    },
  ),
);

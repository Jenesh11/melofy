import { create } from 'zustand';
import type { SpotifyTrackLike } from '@/lib/track-mappers';

export interface SpotifyTrendingItem {
  id?: string;
  track?: SpotifyTrackLike;
}

export interface SpotifyCollectionOwner {
  display_name?: string;
}

export interface SpotifyCollectionSummary {
  id: string;
  name?: string;
  description?: string;
  images?: Array<{ url?: string }>;
  owner?: SpotifyCollectionOwner;
  tracks?: { total?: number };
  type?: string;
}

interface HomeStore {
  trending: SpotifyTrendingItem[];
  newReleases: SpotifyCollectionSummary[];
  recommendations: SpotifyTrackLike[];
  mixes: SpotifyCollectionSummary[];
  popularPlaylists: SpotifyCollectionSummary[];
  hasFetched: boolean;

  setTrending: (data: SpotifyTrendingItem[]) => void;
  setNewReleases: (data: SpotifyCollectionSummary[]) => void;
  setRecommendations: (data: SpotifyTrackLike[]) => void;
  setMixes: (data: SpotifyCollectionSummary[]) => void;
  setPopularPlaylists: (data: SpotifyCollectionSummary[]) => void;
  setHasFetched: (status: boolean) => void;
}

export const useHomeStore = create<HomeStore>((set) => ({
  trending: [],
  newReleases: [],
  recommendations: [],
  mixes: [],
  popularPlaylists: [],
  hasFetched: false,

  setTrending: (data) => set({ trending: data }),
  setNewReleases: (data) => set({ newReleases: data }),
  setRecommendations: (data) => set({ recommendations: data }),
  setMixes: (data) => set({ mixes: data }),
  setPopularPlaylists: (data) => set({ popularPlaylists: data }),
  setHasFetched: (status) => set({ hasFetched: status }),
}));

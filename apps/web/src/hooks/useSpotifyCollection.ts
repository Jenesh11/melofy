import { useState } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { toast } from 'sonner';
import { useAuth } from '@/lib/firebase/auth-context';
import { getFirebaseAuthHeaders } from '@/lib/firebase/client-auth';
import {
  mapSpotifyTrackToPlayerTrack,
  type SpotifyTrackLike,
} from '@/lib/track-mappers';

interface SpotifyCollection {
  id: string;
  type?: string;
  images?: Array<{ url?: string }>;
}

interface SpotifyCollectionTracksResponse {
  items: Array<SpotifyTrackLike | { track?: SpotifyTrackLike }>;
}

export function useSpotifyCollection() {
  const playPlaylist = usePlayerStore((state) => state.playPlaylist);
  const [isPlayingCollection, setIsPlayingCollection] = useState(false);
  const { user } = useAuth();

  const handlePlaySpotifyCollection = async (collection: SpotifyCollection) => {
    try {
      setIsPlayingCollection(true);
      if (!user) throw new Error('User is not authenticated');

      const isAlbum = collection.type === 'album';
      const endpoint = isAlbum
        ? `/api/spotify/albums/${collection.id}/tracks`
        : `/api/spotify/playlists/${collection.id}/tracks`;

      const authHeaders = await getFirebaseAuthHeaders(user);
      const res = await fetch(endpoint, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to fetch collection tracks');

      const data = (await res.json()) as SpotifyCollectionTracksResponse;
      const items = isAlbum
        ? data.items
        : data.items.map((item) =>
            'track' in item ? item.track : undefined,
          );

      const tracks = items
        .filter((track): track is SpotifyTrackLike => Boolean(track))
        .map((track) => {
          const mapped = mapSpotifyTrackToPlayerTrack(track);
          return {
            ...mapped,
            artworkUrl: mapped.artworkUrl || collection.images?.[0]?.url || '',
            url: '',
          };
        });

      if (tracks.length > 0) {
        playPlaylist(tracks, collection.id, 'spotify');
      } else {
        toast.error('No tracks found in this collection');
      }
    } catch (error) {
      console.error('Failed to play Spotify collection:', error);
      toast.error('Failed to play this collection');
    } finally {
      setIsPlayingCollection(false);
    }
  };

  return { handlePlaySpotifyCollection, isPlayingCollection };
}

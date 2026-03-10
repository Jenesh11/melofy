import { useState } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { toast } from 'sonner';

export function useSpotifyCollection() {
  const { playPlaylist } = usePlayerStore();
  const [isPlayingCollection, setIsPlayingCollection] = useState(false);

  const handlePlaySpotifyCollection = async (collection: any) => {
    try {
      setIsPlayingCollection(true);
      
      const isAlbum = collection.type === 'album';
      const endpoint = isAlbum
        ? `/api/spotify/albums/${collection.id}/tracks`
        : `/api/spotify/playlists/${collection.id}/tracks`;

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to fetch collection tracks');

      const data = await res.json();
      const items = isAlbum ? data.items : data.items.map((i: any) => i.track);

      const tracks = items.filter(Boolean).map((t: any) => ({
        id: t.id,
        title: t.name,
        artist: t.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
        artworkUrl:
          t.album?.images?.[0]?.url || collection.images?.[0]?.url || '',
        duration: t.duration_ms || 0,
        url: '',
      }));

      if (tracks.length > 0) {
        playPlaylist(tracks);
      } else {
        toast.error('No tracks found in this collection');
      }
    } catch (err) {
      console.error('Failed to play Spotify collection:', err);
      toast.error('Failed to play this collection');
    } finally {
      setIsPlayingCollection(false);
    }
  };

  return { handlePlaySpotifyCollection, isPlayingCollection };
}

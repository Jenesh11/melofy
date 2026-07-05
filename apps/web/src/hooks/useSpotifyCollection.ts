import { useState } from 'react';
import { usePlayerStore, type Track } from '@/store/usePlayerStore';
import { toast } from 'sonner';
import { useAuth } from '@/lib/firebase/auth-context';
import { getFirebaseAuthHeaders } from '@/lib/firebase/client-auth';
import {
  mapSpotifyTrackToPlayerTrack,
  type SpotifyTrackLike,
} from '@/lib/track-mappers';
import { addPlaylist, getPlaylistById } from '@/lib/firebase/playlists';
import { useLibraryStore } from '@/store/useLibraryStore';

interface SpotifyCollection {
  id: string;
  name?: string;
  type?: string;
  images?: Array<{ url?: string }>;
  artworkUrl?: string;
}

interface SpotifyCollectionTracksResponse {
  items: Array<SpotifyTrackLike | { track?: SpotifyTrackLike }>;
}

export function useSpotifyCollection() {
  const playPlaylist = usePlayerStore((state) => state.playPlaylist);
  const [isPlayingCollection, setIsPlayingCollection] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { user } = useAuth();

  const handlePlayCollection = async (collection: SpotifyCollection) => {
    try {
      setIsPlayingCollection(true);
      if (!user) throw new Error('User is not authenticated');

      const colType = collection.type || 'spotify';
      let tracks: Track[] = [];
      let dbPlaylist: any = null;

      const isSpotify = colType === 'spotify' || colType === 'playlist' || colType === 'album';

      if (isSpotify) {
        const isAlbum = colType === 'album';
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

        tracks = items
          .filter((track): track is SpotifyTrackLike => Boolean(track))
          .map((track) => {
            const mapped = mapSpotifyTrackToPlayerTrack(track);
            return {
              ...mapped,
              artworkUrl: mapped.artworkUrl || collection.images?.[0]?.url || collection.artworkUrl || '',
              url: '',
            };
          });
      } else if (colType === 'youtube') {
        const ytId = collection.id.replace('youtube:', '');
        const authHeaders = await getFirebaseAuthHeaders(user);
        const targetUrl = ytId.startsWith('http') ? ytId : `https://www.youtube.com/playlist?list=${ytId}`;
        const res = await fetch(`/api/search?q=${encodeURIComponent(targetUrl)}`, {
          headers: authHeaders,
        });

        if (res.ok) {
          const ytData = await res.json();
          if (ytData.loadType === 'playlist' && ytData.tracks) {
            tracks = ytData.tracks.map((t: any) => ({
              id: t.info.identifier,
              identifier: t.info.identifier,
              title: t.info.title,
              artist: t.info.author,
              artworkUrl: t.info.artworkUrl || `https://img.youtube.com/vi/${t.info.identifier}/mqdefault.jpg`,
              duration: t.info.duration || t.info.length || 0,
              url: t.encoded || '',
            }));
          }
        }
      } else {
        // Custom/Firebase playlist
        dbPlaylist = await getPlaylistById(collection.id);
        if (dbPlaylist && dbPlaylist.tracks) {
          tracks = dbPlaylist.tracks.map((track: any) => ({
            id: track.info.identifier,
            identifier: track.info.identifier,
            title: track.info.title,
            artist: track.info.author,
            artworkUrl: track.info.artworkUrl || '',
            duration: track.info.duration,
            url: track.encoded || '',
          }));
        }
      }

      if (tracks.length > 0) {
        const playSource = isSpotify ? 'spotify' : colType === 'youtube' ? 'youtube' : 'custom';
        playPlaylist(tracks, collection.id, playSource);

        const playlistName = collection.name || dbPlaylist?.name || (colType === 'youtube' ? 'YouTube Playlist' : 'Collection');
        const playlistArt = collection.artworkUrl || collection.images?.[0]?.url || dbPlaylist?.artworkUrl || tracks[0]?.artworkUrl || '';

        // Save to recently played playlists
        useLibraryStore.getState().addRecentPlaylist({
          id: collection.id,
          name: playlistName,
          artworkUrl: playlistArt,
          type: playSource,
          trackCount: tracks.length,
        });
      } else {
        toast.error('No tracks found in this collection');
      }
    } catch (error) {
      console.error('Failed to play collection:', error);
      toast.error('Failed to play this collection');
    } finally {
      setIsPlayingCollection(false);
    }
  };

  const handleImportSpotifyPlaylist = async (playlist: {
    id: string;
    name?: string;
    images?: Array<{ url?: string }>;
  }) => {
    if (!user) return;
    setIsImporting(true);
    const playlistName = playlist.name || 'Playlist';
    const toastId = toast.loading(`Importing ${playlistName}...`);
    try {
      const authHeaders = await getFirebaseAuthHeaders(user);
      const res = await fetch(`/api/spotify/playlists/${playlist.id}`, {
        headers: authHeaders,
      });

      if (!res.ok) throw new Error('Failed to fetch playlist details');

      const fullData = await res.json();
      const tracksForDb = (fullData.tracks || []).map((t: any) => ({
        encoded: '', // Will be resolved on playback
        info: {
          identifier: t.id,
          title: t.name,
          author:
            t.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
          duration: t.duration_ms || 0,
          artworkUrl: t.album?.images?.[0]?.url || '',
          uri: `https://open.spotify.com/track/${t.id}`,
          sourceName: 'spotify',
          isSeekable: true,
          isStream: false,
          isrc: t.external_ids?.isrc || null,
        },
      }));

      await addPlaylist(user.uid, {
        name: fullData.name,
        trackCount: fullData.trackCount || fullData.tracks?.length || 0,
        artworkUrl: fullData.artworkUrl || fullData.images?.[0]?.url,
        tracks: tracksForDb,
      });

      toast.success('Playlist imported to your library!', { id: toastId });
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Failed to import playlist', { id: toastId });
    } finally {
      setIsImporting(false);
    }
  };

  return {
    handlePlaySpotifyCollection: handlePlayCollection,
    handlePlayCollection,
    isPlayingCollection,
    handleImportSpotifyPlaylist,
    isImporting,
  };
}

import { libraryToTrack } from '@/lib/discovery';
import { normalizeToFirebaseTrack } from '@/lib/library-tracks';
import { useState, useEffect, useRef } from 'react';
import { usePlayerStore, type Track } from '@/store/usePlayerStore';
import { toast } from 'sonner';
import { useAuth } from '@/lib/firebase/auth-context';
import { getFirebaseAuthHeaders } from '@/lib/firebase/client-auth';
import {
  mapSpotifyTrackToPlayerTrack,
  type SpotifyTrackLike,
} from '@/lib/track-mappers';
import { addPlaylist, getPlaylistById, type Playlist } from '@/lib/firebase/playlists';
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
  const requestRevision = useRef(0);
  useEffect(() => () => { requestRevision.current++; }, [user]);

  const handlePlayCollection = async (collection: SpotifyCollection) => {
    const request = ++requestRevision.current;
    const playbackRevision = usePlayerStore.getState().playbackRevision;
    try {
      setIsPlayingCollection(true);
      if (!user) throw new Error('User is not authenticated');

      const colType = collection.type || 'spotify';
      let tracks: Track[] = [];
      let dbPlaylist: Playlist | null = null;

      const isMix = collection.id.startsWith('mix:');
      const isSpotify = !isMix && (colType === 'spotify' || colType === 'playlist' || colType === 'album');

      if (isMix) {
        const headers = await getFirebaseAuthHeaders(user);
        const response = await fetch('/api/discovery/mixes/' + encodeURIComponent(collection.id), { headers });
        if (!response.ok) throw new Error('Mix unavailable');
        const mix = await response.json();
        tracks = (mix.tracks?.items || []).map(mapSpotifyTrackToPlayerTrack);
      } else if (isSpotify) {
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
            tracks = ytData.tracks.map(normalizeToFirebaseTrack).map(libraryToTrack);
          }
        }
      } else {
        // Custom/Firebase playlist
        dbPlaylist = await getPlaylistById(collection.id);
        if (dbPlaylist && dbPlaylist.tracks) {
          tracks = dbPlaylist.tracks.map(libraryToTrack);
        }
      }

      if (request !== requestRevision.current || playbackRevision !== usePlayerStore.getState().playbackRevision) return;
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
      if (request === requestRevision.current) setIsPlayingCollection(false);
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
      const isMix = playlist.id.startsWith('mix:');
      const endpoint = isMix ? '/api/discovery/mixes/' + encodeURIComponent(playlist.id) : '/api/spotify/playlists/' + playlist.id;
      const res = await fetch(endpoint, {
        headers: authHeaders,
      });

      if (!res.ok) throw new Error('Failed to fetch playlist details');

      const responseData = await res.json();
      const fullData = isMix ? { ...responseData, tracks: responseData.tracks.items, trackCount: responseData.tracks.total, artworkUrl: responseData.images?.[0]?.url } : responseData;
      const tracksForDb = (fullData.tracks || []).map((t: SpotifyTrackLike & { external_ids?: { isrc?: string } }) => ({
        encoded: t.encoded || '', // Spotify metadata still resolves on playback
        info: {
          identifier: t.id,
          title: t.name,
          author:
            t.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
          duration: t.duration_ms || 0,
          artworkUrl: t.album?.images?.[0]?.url || '',
          uri: t.uri || `https://open.spotify.com/track/${t.id}`,
          sourceName: t.source || 'spotify',
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

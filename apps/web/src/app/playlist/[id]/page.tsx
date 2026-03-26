'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Play, Music2, Loader2, ChevronLeft, Heart, Check } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getFirebaseAuthHeaders } from '@/lib/firebase/client-auth';
import { getPlaylistById } from '@/lib/firebase/playlists';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { Button } from '@/components/ui/button';
import { TrackList, TrackItem } from '@/components/ui/TrackList';
import Link from 'next/link';
import {
  mapSpotifyTrackToTrackItem,
  mapTrackItemToPlayerTrack,
  type SpotifyTrackLike,
} from '@/lib/track-mappers';

interface SpotifyPlaylistData {
  id?: string;
  name: string;
  description?: string;
  artworkUrl?: string;
  images?: Array<{ url?: string }>;
  trackCount?: number;
  tracks: SpotifyTrackLike[];
}

interface CustomPlaylistTrack {
  info: {
    identifier: string;
    title: string;
    author: string;
    artworkUrl?: string;
    duration: number;
  };
  encoded?: string;
}

interface CustomPlaylistData {
  id?: string;
  name: string;
  description?: string;
  artworkUrl?: string;
  images?: Array<{ url?: string }>;
  trackCount?: number;
  tracks: CustomPlaylistTrack[];
  isLikedSongs?: boolean;
}

type PlaylistData = SpotifyPlaylistData | CustomPlaylistData;

export default function PlaylistPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const playPlaylist = usePlayerStore((state) => state.playPlaylist);
  const savedPlaylists = useLibraryStore((state) => state.savedPlaylists);
  const addPlaylist = useLibraryStore((state) => state.addPlaylist);
  const removePlaylist = useLibraryStore((state) => state.removePlaylist);

  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSpotifySource, setIsSpotifySource] = useState(false);

  const saved = useMemo(
    () => savedPlaylists.some((entry) => entry.id === id),
    [id, savedPlaylists],
  );

  useEffect(() => {
    async function fetchPlaylist() {
      if (!id) return;

      setIsLoading(true);

      let dbPlaylist = null;
      try {
        dbPlaylist = await getPlaylistById(id);
      } catch {
        console.log('Firebase lookup failed, proceeding to Spotify fallback');
      }

      if (dbPlaylist) {
        setPlaylist(dbPlaylist);
        setIsSpotifySource(false);
        setIsLoading(false);
        return;
      }

      try {
        const authHeaders = await getFirebaseAuthHeaders(user);
        const res = await fetch(`/api/spotify/playlists/${id}`, {
          headers: authHeaders,
        });

        if (res.ok) {
          const spotifyData = (await res.json()) as SpotifyPlaylistData;
          setPlaylist(spotifyData);
          setIsSpotifySource(true);
        } else {
          setPlaylist(null);
        }
      } catch (error) {
        console.error('Error fetching Spotify playlist:', error);
        setPlaylist(null);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchPlaylist();
  }, [id, user]);

  const trackItems: TrackItem[] = useMemo(() => {
    if (!playlist?.tracks) return [];

    if (isSpotifySource) {
      const spotifyTracks = playlist.tracks as SpotifyTrackLike[];
      return spotifyTracks.map((track) => {
        const mapped = mapSpotifyTrackToTrackItem(track);
        return {
          ...mapped,
          artworkUrl: mapped.artworkUrl || playlist.artworkUrl || '',
          encoded: '',
        };
      });
    }

    const customTracks = playlist.tracks as CustomPlaylistTrack[];
    return customTracks.map((track) => ({
      id: track.info.identifier,
      title: track.info.title,
      artist: track.info.author,
      artworkUrl: track.info.artworkUrl || '',
      duration: track.info.duration,
      album: track.info.author,
      encoded: track.encoded,
    }));
  }, [isSpotifySource, playlist]);

  const tracksToPlay = useMemo(
    () => trackItems.map((track) => mapTrackItemToPlayerTrack(track)),
    [trackItems],
  );

  const handlePlayPlaylist = useCallback(() => {
    playPlaylist(tracksToPlay, id, isSpotifySource ? 'spotify' : 'custom');
  }, [id, isSpotifySource, playPlaylist, tracksToPlay]);

  const handleToggleSave = useCallback(() => {
    if (!playlist) return;

    if (saved) {
      removePlaylist(id);
      return;
    }

    addPlaylist({
      id,
      name: playlist.name,
      artworkUrl: playlist.artworkUrl || playlist.images?.[0]?.url || '',
      type: isSpotifySource ? 'spotify' : 'custom',
      trackCount: playlist.trackCount || playlist.tracks?.length || 0,
    });
  }, [addPlaylist, id, isSpotifySource, playlist, removePlaylist, saved]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh] w-full'>
        <Loader2 className='h-10 w-10 text-primary animate-spin' />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className='flex flex-col items-center justify-center h-full gap-4'>
        <Music2 className='h-16 w-16 text-zinc-700' />
        <h1 className='text-2xl font-bold text-foreground'>
          Playlist not found
        </h1>
        <Link href='/library'>
          <Button variant='outline' className='rounded-full'>
            <ChevronLeft className='mr-2 h-4 w-4' />
            Back to Library
          </Button>
        </Link>
      </div>
    );
  }

  const bgImageUrl = playlist.artworkUrl || playlist.images?.[0]?.url || '';

  return (
    <div className='flex flex-col min-h-full overflow-x-hidden custom-scrollbar p-4 md:p-8 pb-32 md:pb-8 relative'>
      {bgImageUrl && (
        <div
          className='absolute top-0 left-0 right-0 h-[50vh] opacity-30 blur-[120px] pointer-events-none z-10'
          style={{
            backgroundImage: `url(${bgImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      <header className='flex flex-col md:flex-row items-center md:items-end gap-6 mb-8 mt-4'>
        <div className='h-48 w-48 md:h-60 md:w-60 rounded-[2.5rem] bg-muted shadow-2xl shrink-0 overflow-hidden z-10 relative'>
          {(playlist as CustomPlaylistData).isLikedSongs || playlist.name === 'Liked Songs' ? (
            <div className='h-full w-full flex items-center justify-center bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500'>
              <Heart className='h-24 w-24 text-white fill-white drop-shadow-lg' />
            </div>
          ) : playlist.artworkUrl ? (
            <img
              src={playlist.artworkUrl}
              alt={playlist.name}
              className='h-full w-full object-cover'
            />
          ) : (
            <div className='h-full w-full flex items-center justify-center'>
              <Music2 className='h-24 w-24 text-muted-foreground' />
            </div>
          )}
        </div>

        <div className='flex flex-col gap-2'>
          <p className='text-primary font-bold tracking-widest text-[10px] uppercase'>
            {isSpotifySource ? 'Spotify Playlist' : 'Playlist'}
          </p>
          <h1 className='text-5xl md:text-7xl font-bold text-foreground tracking-tighter mb-2 line-clamp-2'>
            {playlist.name}
          </h1>
          {playlist.description && (
            <p className='text-muted-foreground text-sm font-medium line-clamp-2 max-w-2xl'>
              {playlist.description.replace(/<[^>]*>?/gm, '')}
            </p>
          )}
          <div className='flex items-center gap-2 text-muted-foreground text-sm font-light mt-2'>
            <span className='font-semibold text-foreground'>
              {isSpotifySource ? 'Spotify' : user?.displayName || 'User'}
            </span>
            <span>&middot;</span>
            <span>
              {playlist.trackCount || playlist.tracks?.length || 0} tracks
            </span>
          </div>
        </div>
      </header>

      <div className='flex items-center gap-6 mb-8'>

        <Button
          size='lg'
          className='bg-primary text-primary-foreground font-bold h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform'
          onClick={handlePlayPlaylist}
        >
          <Play className='h-6 w-6 fill-current' />
        </Button>
        {isSpotifySource ? (
          <Button
            variant='outline'
            size='icon'
            className={`h-12 w-12 rounded-full border-2 transition-all ${
              saved
                ? 'border-primary text-primary hover:bg-primary/10'
                : 'border-muted-foreground/30 text-muted-foreground hover:border-foreground hover:text-foreground'
            }`}
            onClick={handleToggleSave}
            title={saved ? 'Remove from Library' : 'Save to Library'}
          >
            {saved ? (
              <Check className='h-6 w-6' strokeWidth={3} />
            ) : (
              <Heart className='h-6 w-6' />
            )}
          </Button>
        ) : (
          <p className='text-muted-foreground font-light italic tracking-widest text-[10px] uppercase'>
            Play whole playlist
          </p>
        )}


      </div>

      <TrackList tracks={trackItems} />
    </div>
  );
}

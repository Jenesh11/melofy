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
import Image from 'next/image';

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
  const rawId = params.id as string;
  const id = decodeURIComponent(rawId);
  const { user } = useAuth();
  const playPlaylist = usePlayerStore((state) => state.playPlaylist);
  const savedPlaylists = useLibraryStore((state) => state.savedPlaylists);
  const addPlaylist = useLibraryStore((state) => state.addPlaylist);
  const removePlaylist = useLibraryStore((state) => state.removePlaylist);

  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSpotifySource, setIsSpotifySource] = useState(false);
  const [isYoutubeSource, setIsYoutubeSource] = useState(false);

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

      // Handle YouTube fallback
      if (id.startsWith('youtube:')) {
        const ytId = id.replace('youtube:', '');
        try {
          const authHeaders = await getFirebaseAuthHeaders(user);
          // Use the full URL to ensure NodeLink identifies it as a playlist
          const targetUrl = ytId.startsWith('http') ? ytId : `https://www.youtube.com/playlist?list=${ytId}`;
          const res = await fetch(`/api/search?q=${encodeURIComponent(targetUrl)}`, {
            headers: authHeaders,
          });

          if (res.ok) {
            const ytData = await res.json();
            if (ytData.loadType === 'playlist' && ytData.tracks) {
              const mapped: CustomPlaylistData = {
                name: ytData.playlistInfo?.name || 'YouTube Playlist',
                artworkUrl: ytData.tracks?.[0]?.info?.artworkUrl || `https://img.youtube.com/vi/${ytData.tracks?.[0]?.info?.identifier}/mqdefault.jpg`,
                tracks: ytData.tracks.map((t: {
                  info: {
                    identifier: string;
                    title: string;
                    author: string;
                    artworkUrl?: string;
                    duration?: number;
                    length?: number;
                  };
                  encoded: string;
                }) => ({
                  info: {
                    identifier: t.info.identifier,
                    title: t.info.title,
                    author: t.info.author,
                    artworkUrl: t.info.artworkUrl,
                    duration: t.info.duration || t.info.length || 0,
                  },
                  encoded: t.encoded
                }))
              };
              setPlaylist(mapped);
              setIsYoutubeSource(true);
              setIsSpotifySource(false);
            } else {
              setPlaylist(null);
            }
          }
        } catch (error) {
          console.error('Error fetching YouTube playlist:', error);
          setPlaylist(null);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      try {
        const authHeaders = await getFirebaseAuthHeaders(user);
        // Clean up Spotify ID if it has prefixes
        const cleanSpotifyId = id.replace('spotify:playlist:', '').replace('spotify:album:', '');
        const res = await fetch(`/api/spotify/playlists/${cleanSpotifyId}`, {
          headers: authHeaders,
        });

        if (res.ok) {
          const spotifyData = (await res.json()) as SpotifyPlaylistData;
          setPlaylist(spotifyData);
          setIsSpotifySource(true);
          setIsYoutubeSource(false);
        } else if (id.length === 22) {
          // One more try for albums if playlist failed
          const albumRes = await fetch(`/api/spotify/albums/${cleanSpotifyId}/tracks`, {
            headers: authHeaders,
          });
          if (albumRes.ok) {
             // Handle album data structure... (keep it simple for now or assume its a playlist mostly)
             setPlaylist(null); 
          } else {
            setPlaylist(null);
          }
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
      identifier: track.info.identifier,
      title: track.info.title,
      artist: track.info.author,
      artworkUrl: track.info.artworkUrl || '',
      duration: track.info.duration,
      album: track.info.author,
      encoded: track.encoded,
    }));
  }, [isSpotifySource, playlist]);

  const totalDurationMs = useMemo(() => {
    return trackItems.reduce((acc, track) => acc + (track.duration || 0), 0);
  }, [trackItems]);

  const formattedDuration = useMemo(() => {
    const totalSeconds = Math.floor(totalDurationMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  }, [totalDurationMs]);

  const tracksToPlay = useMemo(
    () => trackItems.map((track) => mapTrackItemToPlayerTrack(track)),
    [trackItems],
  );

  const handlePlayPlaylist = useCallback(() => {
    let source: 'spotify' | 'custom' | 'youtube' = 'custom';
    if (isSpotifySource) source = 'spotify';
    else if (isYoutubeSource) source = 'youtube';
    
    playPlaylist(tracksToPlay, id, source);
  }, [id, isSpotifySource, isYoutubeSource, playPlaylist, tracksToPlay]);

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
    return <PlaylistPageSkeleton />;
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
  const isLikedSongs = (playlist as CustomPlaylistData).isLikedSongs || playlist.name === 'Liked Songs';

  return (
    <div className='flex flex-col min-h-full overflow-x-hidden custom-scrollbar p-4 md:p-8 pb-32 md:pb-8 relative'>
      {isLikedSongs ? (
        <div
          className='absolute top-0 left-0 right-0 h-[50vh] opacity-25 blur-[120px] pointer-events-none z-10 bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500'
        />
      ) : bgImageUrl ? (
        <div
          className='absolute top-0 left-0 right-0 h-[50vh] opacity-30 blur-[120px] pointer-events-none z-10'
          style={{
            backgroundImage: `url(${bgImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ) : null}
      <header className='flex flex-col md:flex-row items-center md:items-end gap-6 mb-8 mt-4'>
        <div className='h-48 w-48 md:h-60 md:w-60 rounded-[2.5rem] bg-muted shadow-2xl shrink-0 overflow-hidden z-10 relative'>
          {(playlist as CustomPlaylistData).isLikedSongs || playlist.name === 'Liked Songs' ? (
            <div className='h-full w-full flex items-center justify-center bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500'>
              <Heart className='h-24 w-24 text-white fill-white drop-shadow-lg' />
            </div>
          ) : playlist.artworkUrl ? (
            <Image
              src={playlist.artworkUrl}
              alt={playlist.name}
              width={300}
              height={300}
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
            {isSpotifySource ? 'Spotify Playlist' : isYoutubeSource ? 'YouTube Playlist' : 'Playlist'}
          </p>
          <h1 className='text-5xl md:text-7xl font-bold text-foreground tracking-tighter mb-2 line-clamp-2'>
            {playlist.name}
          </h1>
          {playlist.description && (
            <p className='text-muted-foreground text-sm font-medium line-clamp-2 max-w-2xl'>
              {playlist.description.replace(/<[^>]*>?/gm, '')}
            </p>
          )}
          <div className='flex items-center flex-wrap gap-1.5 text-muted-foreground text-sm font-light mt-2'>
            <span className='font-semibold text-foreground'>
              {isSpotifySource ? 'Spotify' : isYoutubeSource ? 'YouTube' : user?.displayName || 'User'}
            </span>
            <span>&middot;</span>
            <span>
              {trackItems.length} {trackItems.length === 1 ? 'song' : 'songs'}
              {formattedDuration && `, ${formattedDuration}`}
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

function PlaylistPageSkeleton() {
  return (
    <div className='flex flex-col min-h-full overflow-x-hidden p-4 md:p-8 pb-32 md:pb-8 relative animate-pulse'>
      {/* Header Skeleton */}
      <header className='flex flex-col md:flex-row items-center md:items-end gap-6 mb-8 mt-4'>
        {/* Cover Art Skeleton */}
        <div className='h-48 w-48 md:h-60 md:w-60 rounded-[2.5rem] bg-zinc-200 dark:bg-zinc-800/60 shadow-2xl shrink-0' />

        {/* Metadata Details Skeleton */}
        <div className='flex flex-col gap-2 w-full md:w-auto md:min-w-[300px]'>
          {/* Subtitle / tag */}
          <div className='h-3.5 w-24 bg-zinc-200 dark:bg-zinc-800/60 rounded' />
          
          {/* Title */}
          <div className='h-12 md:h-16 w-3/4 md:w-[450px] bg-zinc-200 dark:bg-zinc-800/60 rounded-2xl my-2' />
          
          {/* Description */}
          <div className='h-4 w-5/6 md:w-[350px] bg-zinc-200 dark:bg-zinc-800/60 rounded' />
          
          {/* Bottom stats row */}
          <div className='flex items-center gap-1.5 mt-2'>
            <div className='h-4 w-16 bg-zinc-200 dark:bg-zinc-800/60 rounded' />
            <span className='text-zinc-300 dark:text-zinc-700'>&middot;</span>
            <div className='h-4 w-28 bg-zinc-200 dark:bg-zinc-800/60 rounded' />
          </div>
        </div>
      </header>

      {/* Action Bar Skeleton */}
      <div className='flex items-center gap-6 mb-8'>
        {/* Play Button Skeleton */}
        <div className='h-14 w-14 rounded-full bg-zinc-200 dark:bg-zinc-800/60 shadow-lg' />
        {/* Heart/Like Button Skeleton */}
        <div className='h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-800/60' />
      </div>

      {/* Track List Skeleton */}
      <div className='flex flex-col gap-1'>
        {/* Header Column Mock */}
        <div className='grid grid-cols-[2rem_1fr_auto_5rem] md:grid-cols-[2rem_1fr_minmax(0,200px)_auto_5rem] gap-4 px-4 py-2 border-b border-border text-muted-foreground text-[10px] font-bold tracking-wider uppercase mb-2'>
          <span className='text-center'>#</span>
          <span>Title</span>
          <span className='hidden md:block'>Album</span>
          <span className='flex items-center justify-end'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='12'
              height='12'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='text-muted-foreground'
            >
              <circle cx='12' cy='12' r='10' />
              <polyline points='12 6 12 12 16 14' />
            </svg>
          </span>
          <span></span>
        </div>

        {/* 8 Mock Track Rows */}
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className='grid grid-cols-[2rem_1fr_auto_5rem] md:grid-cols-[2rem_1fr_minmax(0,200px)_auto_5rem] gap-4 px-4 py-3 rounded-xl items-center'
          >
            {/* Number */}
            <span className='text-center text-sm font-medium text-muted-foreground/30 tabular-nums'>
              {index + 1}
            </span>

            {/* Title & Artist */}
            <div className='flex items-center gap-3 min-w-0'>
              <div className='h-10 w-10 rounded-lg bg-zinc-200 dark:bg-zinc-800/60 shrink-0' />
              <div className='flex flex-col gap-1.5 min-w-0'>
                <div className='h-4 w-40 md:w-60 bg-zinc-200 dark:bg-zinc-800/60 rounded' />
                <div className='h-3 w-24 md:w-36 bg-zinc-200 dark:bg-zinc-800/60 rounded' />
              </div>
            </div>

            {/* Album */}
            <span className='hidden md:block'>
              <div className='h-4 w-32 bg-zinc-200 dark:bg-zinc-800/60 rounded' />
            </span>

            {/* Duration */}
            <span className='flex justify-end items-center'>
              <div className='h-4 w-8 bg-zinc-200 dark:bg-zinc-800/60 rounded' />
            </span>

            {/* Actions spacing */}
            <div className='flex items-center justify-end gap-1 opacity-0'>
              <div className='h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800/60' />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

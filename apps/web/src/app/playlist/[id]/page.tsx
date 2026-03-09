'use client';

import { useEffect, useState, use } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  Clock,
  Music2,
  ListMusic,
  Loader2,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import {
  getPlaylistById,
  Playlist,
  Track as PlaylistTrack,
} from '@/lib/firebase/playlists';
import { usePlayerStore, Track as PlayerTrack } from '@/store/usePlayerStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function PlaylistPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const { currentTrack, isPlaying, play, pause, resume, playPlaylist } =
    usePlayerStore();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getPlaylistById(id)
        .then(setPlaylist)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [id]);

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

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPlaylist = () => {
    const tracksToPlay: PlayerTrack[] = playlist.tracks.map((t: any) => ({
      id: t.info.identifier,
      title: t.info.title,
      artist: t.info.author,
      artworkUrl: t.info.artworkUrl || '',
      duration: t.info.duration,
      url: t.encoded,
    }));
    playPlaylist(tracksToPlay);
  };

  const handlePlayTrack = (track: any) => {
    const playerTrack: PlayerTrack = {
      id: track.info.identifier,
      title: track.info.title,
      artist: track.info.author,
      artworkUrl: track.info.artworkUrl || '',
      duration: track.info.duration,
      url: track.encoded,
    };

    if (currentTrack?.id === playerTrack.id) {
      if (isPlaying) pause();
      else resume();
    } else {
      play(playerTrack);
    }
  };

  return (
    <div className='flex flex-col min-h-full overflow-x-hidden custom-scrollbar p-8 pb-32 md:pb-8'>
      <header className='flex flex-col md:flex-row items-center md:items-end gap-6 mb-8 mt-4'>
        <div className='h-48 w-48 md:h-60 md:w-60 rounded-[2.5rem] bg-muted shadow-2xl shrink-0 overflow-hidden'>
          {playlist.artworkUrl ? (
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
            Playlist
          </p>
          <h1 className='text-5xl md:text-7xl font-bold text-foreground tracking-tighter mb-2'>
            {playlist.name}
          </h1>
          <div className='flex items-center gap-2 text-muted-foreground text-sm font-light'>
            <span className='font-semibold text-foreground'>
              {user?.displayName || 'User'}
            </span>
            <span>•</span>
            <span>{playlist.trackCount} tracks</span>
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
        <p className='text-muted-foreground text-sm font-light italic'>
          Play the entire collection
        </p>
      </div>

      <div className='flex flex-col gap-1'>
        <div className='grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-2 border-b border-border text-muted-foreground text-[10px] font-bold tracking-wider uppercase mb-2'>
          <span className='w-8 text-center'>#</span>
          <span>Title</span>
          <span className='flex items-center justify-end'>
            <Clock className='h-3 w-3' />
          </span>
        </div>

        {playlist.tracks.map((track: any, index: number) => {
          const isActive = currentTrack?.id === track.info.identifier;
          return (
            <div
              key={track.info.identifier + index}
              onClick={() => handlePlayTrack(track)}
              className={cn(
                'grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 rounded-xl transition-all group cursor-pointer items-center',
                isActive
                  ? 'bg-foreground/10 shadow-sm'
                  : 'hover:bg-foreground/5',
              )}
            >
              <span
                className={cn(
                  'w-8 text-center text-sm tabular-nums',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground group-hover:text-foreground',
                )}
              >
                {isActive && isPlaying ? (
                  <div className='flex items-center justify-center gap-0.5 h-4'>
                    <div
                      className='w-0.5 h-2 bg-primary animate-bounce'
                      style={{ animationDelay: '0ms' }}
                    />
                    <div
                      className='w-0.5 h-3 bg-primary animate-bounce'
                      style={{ animationDelay: '100ms' }}
                    />
                    <div
                      className='w-0.5 h-2 bg-primary animate-bounce'
                      style={{ animationDelay: '200ms' }}
                    />
                  </div>
                ) : (
                  index + 1
                )}
              </span>

              <div className='flex items-center gap-3 min-w-0'>
                <div className='h-10 w-10 rounded-lg bg-muted shrink-0 overflow-hidden'>
                  {track.info.artworkUrl ? (
                    <img
                      src={track.info.artworkUrl}
                      alt={track.info.title}
                      className='h-full w-full object-cover'
                    />
                  ) : (
                    <div className='h-full w-full flex items-center justify-center'>
                      <Music2 className='h-4 w-4 text-muted-foreground' />
                    </div>
                  )}
                </div>
                <div className='flex flex-col min-w-0'>
                  <span
                    className={cn(
                      'text-sm font-medium truncate',
                      isActive ? 'text-foreground' : 'text-foreground/80',
                    )}
                  >
                    {track.info.title}
                  </span>
                  <span className='text-xs text-muted-foreground truncate'>
                    {track.info.author}
                  </span>
                </div>
              </div>

              <span className='text-xs text-muted-foreground tabular-nums font-light flex justify-end items-center'>
                {formatDuration(track.info.duration)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

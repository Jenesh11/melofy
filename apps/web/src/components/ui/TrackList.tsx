'use client';

import { useCallback, useMemo } from 'react';
import { Music2, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerStore, Track as PlayerTrack } from '@/store/usePlayerStore';
import { toast } from 'sonner';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase/config';
import { mapTrackItemToPlayerTrack } from '@/lib/track-mappers';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import type { TrackItem } from '@/lib/track-types';

export type { TrackItem };

interface TrackListProps {
  tracks: TrackItem[];
  showHeader?: boolean;
}

async function getClientAuthHeaders(): Promise<Record<string, string>> {
  const currentUser = getAuth(app).currentUser;
  if (!currentUser) return {};

  const token = await currentUser.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function resolvePlayableTrack(
  item: TrackItem,
): Promise<PlayerTrack | null> {
  if (item.encoded) {
    return {
      id: item.id,
      identifier: item.identifier,
      title: item.title,
      artist: item.artist,
      artworkUrl: item.artworkUrl,
      duration: item.duration,
      url: item.encoded,
    };
  }

  try {
    const searchQuery = `${item.title} ${item.artist}`;
    const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
      headers: await getClientAuthHeaders(),
    });
    const data = await res.json();

    if (data?.tracks?.length > 0) {
      const found = data.tracks[0];
      return {
        id: item.id,
        identifier: found.info.identifier,
        title: item.title,
        artist: item.artist,
        artworkUrl: item.artworkUrl,
        duration: item.duration || found.info.length || 0,
        url: found.encoded,
      };
    }
  } catch (error) {
    console.error('[TrackList] Failed to resolve playable URL:', error);
  }

  return null;
}

export { resolvePlayableTrack };

export function TrackList({ tracks, showHeader = true }: TrackListProps) {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playInContext = usePlayerStore((state) => state.playInContext);
  const pause = usePlayerStore((state) => state.pause);
  const resume = usePlayerStore((state) => state.resume);
  const { toggleLike, isLiked } = useLikedSongs();

  const contextTracks = useMemo(
    () => tracks.map((track) => mapTrackItemToPlayerTrack(track)),
    [tracks],
  );

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlay = useCallback(
    async (item: TrackItem, index: number) => {
      if (currentTrack?.title === item.title) {
        if (isPlaying) {
          pause();
        } else {
          resume();
        }
        return;
      }

      const resolved = await resolvePlayableTrack(item);
      if (!resolved) {
        toast.error('Could not find a playable version of this track');
        return;
      }

      const nextContextTracks = [...contextTracks];
      nextContextTracks[index] = resolved;
      playInContext(resolved, nextContextTracks);
    },
    [contextTracks, currentTrack?.title, isPlaying, pause, playInContext, resume],
  );

  return (
    <div className='flex flex-col gap-1'>
      {showHeader && (
        <div className='grid grid-cols-[2rem_1fr_auto_2rem] md:grid-cols-[2rem_1fr_minmax(0,200px)_auto_2rem] gap-4 px-4 py-2 border-b border-border text-muted-foreground text-[10px] font-bold tracking-wider uppercase mb-2'>
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
            >
              <circle cx='12' cy='12' r='10' />
              <polyline points='12 6 12 12 16 14' />
            </svg>
          </span>
          <span></span>
        </div>
      )}

      {tracks.map((item, index) => {
        const isActive = currentTrack?.title === item.title;
        return (
          <div
            key={item.id + index}
            className={cn(
              'grid grid-cols-[2rem_1fr_auto_2rem] md:grid-cols-[2rem_1fr_minmax(0,200px)_auto_2rem] gap-4 px-4 py-3 rounded-xl transition-all group items-center',
              isActive ? 'bg-foreground/10 shadow-sm' : 'hover:bg-foreground/5',
            )}
          >
            <span
              className={cn(
                'text-center text-sm tabular-nums',
                isActive
                  ? 'text-primary'
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

            <div className='flex items-center gap-3 min-w-0 cursor-pointer' onClick={() => handlePlay(item, index)}>
              <div className='h-10 w-10 rounded-lg bg-muted shrink-0 overflow-hidden'>
                {item.artworkUrl ? (
                  <img
                    src={item.artworkUrl}
                    alt={item.title}
                    className='h-full w-full object-cover'
                    loading='lazy'
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
                    isActive ? 'text-primary' : 'text-foreground/80',
                  )}
                >
                  {item.title}
                </span>
                <span className='text-xs text-muted-foreground truncate'>
                  {item.artist}
                </span>
              </div>
            </div>

            <span className='text-xs text-muted-foreground truncate hidden md:block'>
              {item.album || item.artist}
            </span>

            <span className='text-xs text-muted-foreground tabular-nums font-light flex justify-end items-center cursor-pointer' onClick={() => handlePlay(item, index)}>
              {formatDuration(item.duration)}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLike(contextTracks[index]);
              }}
              className='flex items-center justify-center h-8 w-8 rounded-full hover:bg-foreground/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 placeholder-shown:opacity-100'
              style={{ opacity: isLiked(contextTracks[index]?.id || '') ? 1 : undefined }}
            >
              <Heart
                className={cn(
                  'h-4 w-4 transition-all',
                  isLiked(contextTracks[index]?.id || '')
                    ? 'fill-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}

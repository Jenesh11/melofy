'use client';

import { Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerStore, Track as PlayerTrack } from '@/store/usePlayerStore';
import { toast } from 'sonner';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase/config';

/**
 * Unified track shape consumable by TrackList.
 * Both Spotify metadata and internal Melofy tracks can be mapped to this.
 */
export interface TrackItem {
  id: string;
  identifier?: string; // YouTube Video ID
  title: string;
  artist: string;
  artworkUrl: string;
  duration: number; // ms
  /** Album or secondary label shown in the ALBUM column */
  album?: string;
  /** NodeLink encoded URL – if present, direct play. If absent, we search for it. */
  encoded?: string;
}

interface TrackListProps {
  tracks: TrackItem[];
  /** Show a column header row */
  showHeader?: boolean;
}

async function getClientAuthHeaders(): Promise<Record<string, string>> {
  const currentUser = getAuth(app).currentUser;
  if (!currentUser) return {};

  const token = await currentUser.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

/**
 * Resolves a TrackItem into a playable PlayerTrack.
 * If the track already has an encoded URL, returns immediately.
 * Otherwise, searches NodeLink/Kazagumo and only takes the encoded URL,
 * keeping the original Spotify-style metadata (title, artist, artwork).
 */
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
      // IMPORTANT: Keep original Spotify metadata, only grab the encoded stream URL and identifier
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
  } catch (e) {
    console.error('[TrackList] Failed to resolve playable URL:', e);
  }

  return null;
}

// Export this so other components (TrackCarousel etc.) can reuse it
export { resolvePlayableTrack };

/**
 * A reusable, consistent list view for tracks across the app.
 * Mirrors the design of the /playlist/[id] page for a cohesive look.
 */
export function TrackList({ tracks, showHeader = true }: TrackListProps) {
  const { currentTrack, isPlaying, playInContext, pause, resume } =
    usePlayerStore();

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlay = async (item: TrackItem, index: number) => {
    // If same track – toggle
    if (currentTrack?.title === item.title) {
      isPlaying ? pause() : resume();
      return;
    }

    const resolved = await resolvePlayableTrack(item);
    if (!resolved) {
      toast.error('Could not find a playable version of this track');
      return;
    }

    // Build queue context: resolve all remaining tracks in the background
    // For now, build the queue from the track items with their metadata.
    // The player will resolve encoded URLs when it needs them via playNext.
    const contextTracks: PlayerTrack[] = tracks.map((t) => ({
      id: t.id,
      identifier: t.identifier,
      title: t.title,
      artist: t.artist,
      artworkUrl: t.artworkUrl,
      duration: t.duration,
      url: t.encoded || '',
    }));

    // Set the resolved track's URL in the context
    contextTracks[index] = resolved;

    playInContext(resolved, contextTracks);
  };

  return (
    <div className='flex flex-col gap-1'>
      {showHeader && (
        <div className='grid grid-cols-[2rem_1fr_auto] md:grid-cols-[2rem_1fr_minmax(0,200px)_auto] gap-4 px-4 py-2 border-b border-border text-muted-foreground text-[10px] font-bold tracking-wider uppercase mb-2'>
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
        </div>
      )}

      {tracks.map((item, index) => {
        const isActive = currentTrack?.title === item.title;
        return (
          <div
            key={item.id + index}
            onClick={() => handlePlay(item, index)}
            className={cn(
              'grid grid-cols-[2rem_1fr_auto] md:grid-cols-[2rem_1fr_minmax(0,200px)_auto] gap-4 px-4 py-3 rounded-xl transition-all group cursor-pointer items-center',
              isActive ? 'bg-foreground/10 shadow-sm' : 'hover:bg-foreground/5',
            )}
          >
            {/* Index / Equalizer */}
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

            {/* Artwork + Title + Artist */}
            <div className='flex items-center gap-3 min-w-0'>
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

            {/* Album column (hidden on mobile) */}
            <span className='text-xs text-muted-foreground truncate hidden md:block'>
              {item.album || item.artist}
            </span>

            {/* Duration */}
            <span className='text-xs text-muted-foreground tabular-nums font-light flex justify-end items-center'>
              {formatDuration(item.duration)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

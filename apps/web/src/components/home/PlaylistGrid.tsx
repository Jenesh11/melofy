'use client';
 

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Plus } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { resolvePlayableTrack, type TrackItem } from '@/components/ui/TrackList';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Artwork } from '@/components/ui/Artwork';
import { Shelf, SHELF_CARD_WIDTH } from '@/components/home/Shelf';

interface PlaylistGridItem {
  id: string;
  name?: string;
  identifier?: string;
  duration_ms?: number;
  encoded?: string;
  description?: string;
  images?: Array<{ url?: string }>;
  artists?: Array<{ name?: string }>;
  owner?: { display_name?: string };
  tracks?: { total?: number };
  type?: string;
}

interface PlaylistGridProps {
  title: string;
  subtitle?: string;
  items: PlaylistGridItem[];
  isAlbum?: boolean;
  isCarousel?: boolean;
  onPlayPlaylist?: (playlist: PlaylistGridItem) => void;
  onImport?: (playlist: PlaylistGridItem) => void;
  className?: string;
}

export function PlaylistGrid({
  title,
  subtitle,
  items,
  isAlbum = false,
  isCarousel = false,
  onPlayPlaylist,
  onImport,
  className,
}: PlaylistGridProps) {
  const play = usePlayerStore((state) => state.play);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const pause = usePlayerStore((state) => state.pause);
  const resume = usePlayerStore((state) => state.resume);
  const router = useRouter();

  const handlePlayItem = useCallback(
    async (item: PlaylistGridItem) => {
      if (onPlayPlaylist) {
        onPlayPlaylist(item);
        return;
      }

      if (!isAlbum) return;

      const trackTitle = item.name;
      if (currentTrack?.title === trackTitle) {
        if (isPlaying) {
          pause();
        } else {
          resume();
        }
        return;
      }

      const trackItem: TrackItem = {
        id: item.id,
        title: item.name || 'Unknown Title',
        artist: item.artists?.[0]?.name || 'Unknown',
        artworkUrl: item.images?.[0]?.url || '',
        duration: item.duration_ms || 0,
        album: item.name || 'Unknown Album',
      };

      const resolved = await resolvePlayableTrack(trackItem);
      if (!resolved) {
        toast.error('Could not find a playable version of this track');
        return;
      }

      play(resolved);
    },
    [currentTrack?.title, isAlbum, isPlaying, onPlayPlaylist, pause, play, resume],
  );

  if (!items || items.length === 0) return null;

  const subtitleFor = (item: PlaylistGridItem) =>
    isAlbum
      ? item.artists?.[0]?.name
      : item.owner?.display_name ||
        item.description ||
        (item.id.startsWith('mix:') ? 'Melofy Mix' : 'Spotify Mix');

  const cards = items.map((item, index) => {
    const artwork = item.images?.[0]?.url;
    const count = item.tracks?.total;
    return (
      <motion.div
        key={item.id + index}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index, 8) * 0.03, duration: 0.3, ease: 'easeOut' }}
        className={cn(
          'group relative cursor-pointer rounded-xl p-2 md:p-2.5 transition-colors hover:bg-foreground/[0.05]',
          isCarousel && cn('shrink-0 snap-start', SHELF_CARD_WIDTH),
        )}
        onClick={() => router.push(`/playlist/${item.id}`)}
      >
        <div className='relative aspect-square overflow-hidden rounded-lg bg-muted shadow-[0_8px_24px_-8px_rgb(0_0_0/0.5)]'>
          <Artwork src={artwork} className='h-full w-full' imgClassName='transition-transform duration-500 group-hover:scale-[1.03]' />
          <div className='absolute bottom-2 right-2 flex items-center gap-1.5'>
            {onImport && (
              <button
                type='button'
                aria-label={`Save ${item.name || 'mix'} to library`}
                title='Save to library'
                onClick={(event) => { event.stopPropagation(); onImport(item); }}
                className='flex h-9 w-9 translate-y-2 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-md transition-all duration-300 hover:bg-black/75 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100'
              >
                <Plus className='h-4 w-4' />
              </button>
            )}
            <button
              type='button'
              aria-label={`Play ${item.name || 'mix'}`}
              onClick={(event) => { event.stopPropagation(); void handlePlayItem(item); }}
              className='flex h-11 w-11 translate-y-2 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-[0_8px_20px_rgb(0_0_0/0.45)] transition-all duration-300 hover:scale-105 active:scale-95 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100'
            >
              <Play className='h-5 w-5 translate-x-px fill-current' />
            </button>
          </div>
        </div>
        <div className='mt-2.5 min-w-0'>
          <p className='truncate text-sm font-semibold text-foreground'>{item.name}</p>
          <p className='mt-0.5 line-clamp-1 text-[13px] text-muted-foreground'>
            {count ? `${count} songs · ` : ''}{subtitleFor(item)}
          </p>
        </div>
      </motion.div>
    );
  });

  if (isCarousel) {
    return <Shelf title={title} subtitle={subtitle} className={className}>{cards}</Shelf>;
  }

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <div>
        <h2 className='text-[1.375rem] md:text-2xl font-bold text-foreground'>{title}</h2>
        {subtitle && <p className='mt-0.5 text-sm text-muted-foreground'>{subtitle}</p>}
      </div>
      <div className='-mx-2 grid grid-cols-2 gap-1 sm:grid-cols-[repeat(auto-fill,minmax(164px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(184px,1fr))] md:gap-2'>
        {cards}
      </div>
    </section>
  );
}

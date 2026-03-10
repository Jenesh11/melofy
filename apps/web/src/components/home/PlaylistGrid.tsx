'use client';

import { motion } from 'framer-motion';
import { Disc, Play } from 'lucide-react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { resolvePlayableTrack, TrackItem } from '@/components/ui/TrackList';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface PlaylistGridProps {
  title: string;
  items: any[];
  isAlbum?: boolean;
  onPlayPlaylist?: (playlist: any) => void;
}

export function PlaylistGrid({
  title,
  items,
  isAlbum = false,
  onPlayPlaylist,
}: PlaylistGridProps) {
  const { playInContext, currentTrack, isPlaying, pause, resume } =
    usePlayerStore();
  const router = useRouter();

  if (!items || items.length === 0) return null;

  const handlePlayItem = async (item: any, index: number) => {
    // If it's a collection (playlist or album) and we have a handler, play the collection
    if (onPlayPlaylist) {
      onPlayPlaylist(item);
      return;
    }

    // Otherwise, try to play as a single track (fallback)
    if (!isAlbum) return;

    const trackTitle = item.name;
    if (currentTrack?.title === trackTitle) {
      isPlaying ? pause() : resume();
      return;
    }

    const trackItem: TrackItem = {
      id: item.id,
      title: item.name,
      artist: item.artists?.[0]?.name || 'Unknown',
      artworkUrl: item.images?.[0]?.url || '',
      duration: item.duration_ms || 0,
      album: item.name,
    };

    const resolved = await resolvePlayableTrack(trackItem);
    if (!resolved) {
      toast.error('Could not find a playable version of this track');
      return;
    }

    // Build context from all album items
    const contextTracks: Track[] = items
      .filter((i: any) => i.name)
      .map((i: any) => ({
        id: i.id,
        identifier: (i as any).identifier,
        title: i.name,
        artist: i.artists?.[0]?.name || 'Unknown',
        artworkUrl: i.images?.[0]?.url || '',
        duration: i.duration_ms || 0,
        url: '',
      }));
    contextTracks[index] = resolved;

    playInContext(resolved, contextTracks);
  };

  return (
    <section className='mt-8'>
      <div className='flex items-center justify-between mb-6'>
        <h3 className='text-3xl font-bold text-foreground flex items-center gap-2'>
          {title}
        </h3>
        {onPlayPlaylist && items.length > 0 && (
          <Button
            variant='ghost'
            size='sm'
            className='text-primary hover:text-primary/80 flex items-center gap-2 group/playall'
            onClick={() => onPlayPlaylist(items[0])} // This is a bit simplified, but follows the "play featured" vibe
          >
            <Play className='h-4 w-4 fill-current group-hover/playall:scale-110 transition-transform' />
            <span className='text-xs uppercase tracking-widest font-bold'>
              Play Featured
            </span>
          </Button>
        )}
      </div>
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6'>
        {items.map((item, i) => (
          <motion.div
            key={item.id + i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className='flex flex-col gap-3 group cursor-pointer'
            onClick={() => router.push(`/playlist/${item.id}`)}
          >
            <div className='aspect-square rounded-[2rem] bg-muted relative overflow-hidden shadow-xl group-hover:shadow-primary/10 transition-all duration-500'>
              {/* Play button overlay - Always centered like Library route */}
              <div className='absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10'>
                <Button
                  size='icon'
                  className='h-14 w-14 rounded-full bg-primary text-primary-foreground hover:scale-110 transition-all shadow-2xl'
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayItem(item, i);
                  }}
                >
                  <Play className='h-7 w-7 fill-current transition-colors ml-1' />
                </Button>
              </div>

              {/* Background Image */}
              <div className='h-full w-full bg-linear-to-br from-muted to-background group-hover:scale-110 transition-transform duration-700 flex items-center justify-center'>
                {item.images?.[0]?.url ? (
                  <img
                    src={item.images[0].url}
                    alt={item.name}
                    className='h-full w-full object-cover'
                  />
                ) : (
                  <Disc className='h-12 w-12 text-muted-foreground/40' />
                )}
              </div>

              {/* Tracks Count Badge (Bottom Right like Library) */}
              <div className='absolute bottom-4 right-4 bg-background/60 backdrop-blur-md px-3 py-1 rounded-full border border-border z-20'>
                <p className='text-[10px] text-foreground font-bold tracking-wider uppercase'>
                  {item.tracks?.total
                    ? `${item.tracks.total} TRACKS`
                    : isAlbum
                      ? 'ALBUM'
                      : 'MIX'}
                </p>
              </div>
            </div>
            <div className='flex flex-col px-1 mt-2'>
              <p className='text-foreground font-bold truncate text-base group-hover:text-primary transition-colors'>
                {item.name}
              </p>
              <p className='text-muted-foreground text-xs truncate uppercase tracking-tighter mt-1 font-medium'>
                {isAlbum
                  ? item.artists?.[0]?.name
                  : item.owner?.display_name ||
                    item.description ||
                    'Spotify Mix'}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

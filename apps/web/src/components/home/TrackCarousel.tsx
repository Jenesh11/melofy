'use client';

import { motion } from 'framer-motion';
import { Play, Music2 } from 'lucide-react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { resolvePlayableTrack, TrackItem } from '@/components/ui/TrackList';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TrackCarouselProps {
  title: string;
  tracks: any[];
  onPlayAll?: () => void;
}

export function TrackCarousel({
  title,
  tracks,
  onPlayAll,
}: TrackCarouselProps) {
  const { playInContext, currentTrack, isPlaying, pause, resume } =
    usePlayerStore();

  // Convert Spotify tracks to TrackItem format
  const trackItems: TrackItem[] = (tracks || []).map((t: any) => ({
    id: t.id || t.name,
    title: t.name,
    artist: t.artists?.map((a: any) => a.name).join(', ') || '',
    artworkUrl: t.album?.images?.[0]?.url || '',
    duration: t.duration_ms || 0,
    album: t.album?.name || '',
  }));

  const handlePlay = async (spotifyTrack: any, index: number) => {
    const trackTitle = spotifyTrack.name;

    // If same track – toggle play/pause
    if (currentTrack?.title === trackTitle) {
      isPlaying ? pause() : resume();
      return;
    }

    const item = trackItems[index];
    const resolved = await resolvePlayableTrack(item);
    if (!resolved) {
      toast.error('Could not find a playable version of this track');
      return;
    }

    // Build context with all tracks for queue generation
    const contextTracks: Track[] = trackItems.map((t) => ({
      id: t.id,
      identifier: t.identifier,
      title: t.title,
      artist: t.artist,
      artworkUrl: t.artworkUrl,
      duration: t.duration,
      url: t.encoded || '',
    }));
    contextTracks[index] = resolved;

    playInContext(resolved, contextTracks);
  };

  if (!tracks || tracks.length === 0) return null;

  return (
    <section className='mt-8'>
      <div className='flex items-center justify-between mb-6'>
        <h3 className='text-3xl font-bold text-foreground flex items-center gap-2'>
          {title}
        </h3>
        {onPlayAll && (
          <Button
            variant='ghost'
            size='sm'
            className='text-primary hover:text-primary/80 flex items-center gap-2 group/playall'
            onClick={onPlayAll}
          >
            <Play className='h-4 w-4 fill-current group-hover/playall:scale-110 transition-transform' />
            <span className='text-xs uppercase tracking-widest font-bold'>
              Play All
            </span>
          </Button>
        )}
      </div>
      <div className='flex overflow-x-auto gap-6 pb-6 custom-scrollbar scroll-smooth snap-x snap-mandatory'>
        {tracks.map((track, i) => (
          <motion.div
            key={(track.id || track.name) + i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className='flex flex-col gap-3 group cursor-pointer snap-start min-w-[200px] w-[200px]'
            onClick={() => handlePlay(track, i)}
          >
            <div className='aspect-square rounded-[2.5rem] bg-muted relative overflow-hidden shadow-lg group-hover:shadow-primary/20 transition-all duration-500'>
              <div className='absolute bottom-3 right-3 z-20'>
                <div className='w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-xl group-hover:scale-105 transition-transform'>
                  {currentTrack?.title === track.name && isPlaying ? (
                    <div className='h-5 w-5 flex items-end justify-center gap-[2px]'>
                      <span className='w-1 h-full bg-black animate-bounce'></span>
                      <span
                        className='w-1 h-3/4 bg-black animate-bounce'
                        style={{ animationDelay: '0.2s' }}
                      ></span>
                      <span
                        className='w-1 h-1/2 bg-black animate-bounce'
                        style={{ animationDelay: '0.4s' }}
                      ></span>
                    </div>
                  ) : (
                    <Play className='h-5 w-5 fill-black translate-x-0.5' />
                  )}
                </div>
              </div>
              <div className='absolute inset-0 bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none' />
              <div className='h-full w-full bg-linear-to-br from-muted to-background group-hover:scale-110 transition-transform duration-700 flex items-center justify-center'>
                {track.album?.images?.[0]?.url ? (
                  <img
                    src={track.album.images[0].url}
                    alt={track.name}
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <Music2 className='h-12 w-12 text-muted-foreground/40' />
                )}
              </div>
            </div>
            <div className='flex flex-col px-2'>
              <p className='text-foreground font-bold truncate text-base group-hover:text-primary transition-colors'>
                {track.name}
              </p>
              <p className='text-muted-foreground text-xs truncate uppercase tracking-tighter mt-1 font-medium'>
                {track.artists?.map((a: any) => a.name).join(', ')}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

import { Play, Music2, ListPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Track, usePlayerStore } from '@/store/usePlayerStore';
import { TrackOptionsMenu } from '@/components/ui/TrackOptionsMenu';
import { toast } from 'sonner';
import Image from 'next/image';

interface HistoryCarouselProps {
  history: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlay: (track: Track) => void;
  onPause: () => void;
  onResume: () => void;
}

export function HistoryCarousel({
  history,
  currentTrack,
  isPlaying,
  onPlay,
  onPause,
  onResume,
}: HistoryCarouselProps) {
  const addToQueue = usePlayerStore((state) => state.addToQueue);

  if (history.length === 0) return null;

  const handleAddToQueue = (track: Track) => {
    addToQueue(track);
    toast('Added to Queue', {
      className: 'bg-primary text-primary-foreground border-none shadow-2xl',
      description: (
        <div className="flex items-center gap-2 mt-1">
          {track.artworkUrl && (
            <Image 
              src={track.artworkUrl} 
              alt="" 
              width={32}
              height={32}
              className="h-8 w-8 rounded-md object-cover shadow-md brightness-90" 
            />
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs truncate opacity-90">{track.title}</span>
          </div>
        </div>
      ),
      icon: <ListPlus className="h-4 w-4" />,
      duration: 2500,
    });
  };

  return (
    <section className='mt-4'>
      <h3 className='text-3xl font-bold text-foreground flex items-center gap-2 mb-6'>
        Jump Back In
      </h3>
      <div className='flex overflow-x-auto gap-6 pb-6 custom-scrollbar carousel-scrollbar scroll-smooth snap-x snap-mandatory'>
        {Array.from(new Map(history.map((item) => [item.title, item])).values())
          .reverse()
          .slice(0, 10)
          .map((track, i) => (
            <motion.div
              key={track.id + i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className='flex flex-col gap-3 group cursor-pointer snap-start min-w-[200px] w-[200px]'
              onClick={() => {
                if (currentTrack?.title === track.title) {
                  isPlaying ? onPause() : onResume();
                } else {
                  onPlay(track);
                }
              }}
            >
              <div className='aspect-square rounded-[2.5rem] bg-muted relative overflow-hidden shadow-lg group-hover:shadow-primary/20 transition-all duration-500'>
                <div className='absolute bottom-3 right-3 z-20'>
                  <div className='w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-xl group-hover:scale-105 transition-transform'>
                    {currentTrack?.title === track.title && isPlaying ? (
                      <div className='flex items-center justify-center gap-0.5 h-4'>
                        <div
                          className='w-1 h-3 bg-black animate-bounce'
                          style={{ animationDelay: '0ms' }}
                        />
                        <div
                          className='w-1 h-5 bg-black animate-bounce'
                          style={{ animationDelay: '100ms' }}
                        />
                        <div
                          className='w-1 h-3 bg-black animate-bounce'
                          style={{ animationDelay: '200ms' }}
                        />
                      </div>
                    ) : (
                      <Play className='h-5 w-5 fill-black translate-x-0.5' />
                    )}
                  </div>
                </div>
                <div className='absolute inset-0 bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 pointer-events-none' />
                <div className='h-full w-full bg-linear-to-br from-muted to-background group-hover:scale-110 transition-transform duration-700 flex items-center justify-center'>
                  {track.artworkUrl ? (
                    <Image
                      src={track.artworkUrl}
                      alt={track.title}
                      width={200}
                      height={200}
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <Music2 className='h-12 w-12 text-muted-foreground/40' />
                  )}
                </div>
              </div>
              <div className='flex items-start justify-between px-2 gap-2'>
                <div className='flex flex-col min-w-0'>
                  <p className='text-foreground font-bold truncate text-base group-hover:text-primary transition-colors'>
                    {track.title}
                  </p>
                  <p className='text-muted-foreground text-xs truncate uppercase tracking-tighter mt-1 font-medium'>
                    {track.artist}
                  </p>
                </div>
                <div className='opacity-0 group-hover:opacity-100 transition-opacity shrink-0' onClick={(e) => e.stopPropagation()}>
                  <TrackOptionsMenu 
                    track={track} 
                    onAddToQueue={() => handleAddToQueue(track)} 
                  />
                </div>
              </div>
            </motion.div>
          ))}
      </div>
    </section>
  );
}

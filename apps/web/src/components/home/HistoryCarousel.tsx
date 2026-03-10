import { Play, Music2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Track } from '@/store/usePlayerStore';

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
  if (history.length === 0) return null;

  return (
    <section className='mt-4'>
      <h3 className='text-3xl font-bold text-foreground flex items-center gap-2 mb-6'>
        Jump Back In
      </h3>
      <div className='flex overflow-x-auto gap-6 pb-6 custom-scrollbar scroll-smooth snap-x snap-mandatory'>
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
                <div className='absolute inset-0 bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 pointer-events-none' />
                <div className='h-full w-full bg-linear-to-br from-muted to-background group-hover:scale-110 transition-transform duration-700 flex items-center justify-center'>
                  {track.artworkUrl ? (
                    <img
                      src={track.artworkUrl}
                      alt={track.title}
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <Music2 className='h-12 w-12 text-muted-foreground/40' />
                  )}
                </div>
              </div>
              <div className='flex flex-col px-2'>
                <p className='text-foreground font-bold truncate text-base group-hover:text-primary transition-colors'>
                  {track.title}
                </p>
                <p className='text-muted-foreground text-xs truncate uppercase tracking-tighter mt-1 font-medium'>
                  {track.artist}
                </p>
              </div>
            </motion.div>
          ))}
      </div>
    </section>
  );
}

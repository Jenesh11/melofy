'use client';
 

import { Play } from 'lucide-react';
import { usePlayerStore, type Track } from '@/store/usePlayerStore';
import { cn } from '@/lib/utils';
import { Artwork } from '@/components/ui/Artwork';

/** Compact tiles for jumping straight back into recent songs. */
export function QuickPicks({ tracks }: { tracks: Track[] }) {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const play = usePlayerStore((state) => state.play);
  const pause = usePlayerStore((state) => state.pause);
  const resume = usePlayerStore((state) => state.resume);

  if (!tracks.length) return null;

  return (
    <section aria-label='Jump back in' className='grid grid-cols-2 gap-2 lg:grid-cols-3 2xl:grid-cols-4'>
      {tracks.slice(0, 8).map((track) => {
        const isCurrent = currentTrack?.id === track.id;
        const isActive = isCurrent && isPlaying;
        const toggle = () => {
          if (isCurrent) return isPlaying ? pause() : resume();
          play(track);
        };
        return (
          <div
            key={track.id}
            role='button'
            tabIndex={0}
            onClick={toggle}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); } }}
            aria-label={`${isActive ? 'Pause' : 'Play'} ${track.title} by ${track.artist}`}
            className='group relative flex h-14 md:h-16 cursor-pointer items-center gap-3 overflow-hidden rounded-lg bg-foreground/[0.06] pr-3 transition-colors hover:bg-foreground/[0.11] focus-visible:bg-foreground/[0.11]'
          >
            <Artwork src={track.artworkUrl} size={128} eager className='h-full aspect-square shrink-0 shadow-[4px_0_16px_-4px_rgb(0_0_0/0.4)]' />
            <div className='min-w-0 flex-1'>
              <p className={cn('truncate text-[13px] md:text-sm font-semibold', isCurrent ? 'text-primary' : 'text-foreground')}>{track.title}</p>
              <p className='hidden md:block truncate text-xs text-muted-foreground'>{track.artist}</p>
            </div>
            <span
              aria-hidden
              className={cn(
                'hidden md:flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200',
                isActive ? 'opacity-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100',
              )}
            >
              {isActive ? (
                <span className='flex h-3.5 items-end gap-[2px]'>
                  <span className='eq-bar h-full' />
                  <span className='eq-bar h-full' style={{ animationDelay: '-0.3s' }} />
                  <span className='eq-bar h-full' style={{ animationDelay: '-0.6s' }} />
                </span>
              ) : (
                <Play className='h-4 w-4 translate-x-px fill-current' />
              )}
            </span>
          </div>
        );
      })}
    </section>
  );
}

'use client';

import { useRef, type KeyboardEvent } from 'react';
import { ChevronDown, Languages, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiscoveryControlsProps {
  genre: string;
  language: string;
  isFetching: boolean;
  unavailable: string[];
  setGenre: (value: string) => void;
  setLanguage: (value: string) => void;
  refresh: () => void;
}

const GENRES = ['pop', 'rock', 'indie', 'hip-hop', 'r&b', 'electronic', 'acoustic', 'jazz', 'classical', 'lofi'];
const LANGUAGES = ['all', 'English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Punjabi', 'Spanish', 'Korean', 'Japanese'];
const genreLabel = (value: string) =>
  value === 'r&b' ? 'R&B' : value === 'lofi' ? 'Lo-fi' : value === 'hip-hop' ? 'Hip-hop' : value.charAt(0).toUpperCase() + value.slice(1);

/** One-tap genre chips plus a compact language picker that tune discovery. */
export function DiscoveryControls({ genre, language, isFetching, unavailable, setGenre, setLanguage, refresh }: DiscoveryControlsProps) {
  const chipsRef = useRef<HTMLDivElement>(null);

  // Arrow keys move between chips, as expected of a radio group.
  const onChipKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = GENRES[(index + step + GENRES.length) % GENRES.length]!;
    setGenre(next);
    chipsRef.current?.querySelector<HTMLButtonElement>(`[data-genre="${CSS.escape(next)}"]`)?.focus();
  };

  return (
    <section aria-label='Discovery preferences' className='flex flex-col gap-2'>
      {/* Phones: language + refresh on the first row, chips get the full width below. */}
      <div className='flex flex-wrap items-center gap-2 md:flex-nowrap'>
        <div
          ref={chipsRef}
          role='radiogroup'
          aria-label='Discovery genre'
          className='order-last -mx-4 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 py-1 scrollbar-none md:order-none md:mx-0 md:w-auto md:min-w-0 md:flex-1 md:px-0'
        >
          {GENRES.map((value, index) => {
            const selected = genre === value;
            return (
              <button
                key={value}
                type='button'
                role='radio'
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                data-genre={value}
                onClick={() => setGenre(value)}
                onKeyDown={(event) => onChipKey(event, index)}
                className={cn(
                  'h-8 shrink-0 rounded-full px-4 text-[13px] font-semibold transition-colors',
                  selected
                    ? 'bg-foreground text-background'
                    : 'bg-foreground/[0.07] text-foreground hover:bg-foreground/[0.12]',
                )}
              >
                {genreLabel(value)}
              </button>
            );
          })}
        </div>

        <label className='relative flex shrink-0 items-center'>
          <Languages aria-hidden='true' className='pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground' />
          <select
            aria-label='Discovery language'
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className='h-8 cursor-pointer appearance-none rounded-full bg-foreground/[0.07] pl-8 pr-8 text-[13px] font-semibold text-foreground outline-none transition-colors hover:bg-foreground/[0.12] focus-visible:ring-2 focus-visible:ring-primary/50 [&>option]:bg-popover [&>option]:text-popover-foreground'
          >
            {LANGUAGES.map(value => <option key={value} value={value}>{value === 'all' ? 'Any language' : value}</option>)}
          </select>
          <ChevronDown aria-hidden='true' className='pointer-events-none absolute right-3 h-3.5 w-3.5 text-muted-foreground' />
        </label>

        <button
          type='button'
          aria-label='Refresh discovery'
          title='Refresh discovery'
          aria-busy={isFetching}
          disabled={isFetching}
          onClick={refresh}
          className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/[0.07] text-foreground transition-colors hover:bg-foreground/[0.12] disabled:cursor-wait disabled:text-muted-foreground'
        >
          <RefreshCw aria-hidden='true' className={cn('h-3.5 w-3.5', isFetching && 'motion-safe:animate-spin')} />
        </button>
      </div>

      {unavailable.length > 0 && (
        <p role='status' className='text-xs text-muted-foreground'>Some sections couldn’t load. Tap refresh to try again.</p>
      )}
    </section>
  );
}

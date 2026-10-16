'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Play, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Artwork } from '@/components/ui/Artwork';

interface SpotlightItem {
  id: string;
  name?: string;
  description?: string;
  images?: Array<{ url?: string }>;
  tracks?: { total?: number };
  owner?: { display_name?: string };
}

interface FeaturedSpotlightProps {
  items: SpotlightItem[];
  onPlay: (item: SpotlightItem) => void;
  onSave?: (item: SpotlightItem) => void;
}

const ROTATE_MS = 7000;

function cleanDescription(text?: string) {
  return (text || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&#x2F;/g, '/').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

/** One cinematic banner that rotates through featured collections. */
export function FeaturedSpotlight({ items, onPlay, onSave }: FeaturedSpotlightProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const featured = items.slice(0, 5);
  const current = featured[index % Math.max(featured.length, 1)];

  useEffect(() => {
    if (paused || reduceMotion || featured.length < 2) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % featured.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [paused, reduceMotion, featured.length]);

  if (!current) return null;
  const artwork = current.images?.[0]?.url;
  const description = cleanDescription(current.description) || 'A Melofy selection, tuned to your taste.';

  return (
    <section
      aria-roledescription='carousel'
      aria-label='Featured collections'
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className='grain relative isolate overflow-hidden rounded-2xl border border-border bg-card'
    >
      <AnimatePresence mode='popLayout' initial={false}>
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className='absolute inset-0 -z-10'
        >
          {artwork && <img src={artwork} alt='' className='h-full w-full scale-125 object-cover opacity-60 blur-3xl saturate-150' />}
          <div className='absolute inset-0 bg-linear-to-r from-black/75 via-black/45 to-black/10' />
        </motion.div>
      </AnimatePresence>

      <div
        className='flex cursor-pointer items-center gap-5 p-5 md:gap-8 md:p-8'
        onClick={() => router.push(`/playlist/${current.id}`)}
      >
        <AnimatePresence mode='wait' initial={false}>
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className='relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-muted shadow-[0_20px_50px_-12px_rgb(0_0_0/0.7)] sm:h-40 sm:w-40 md:h-52 md:w-52'
          >
            <Artwork src={artwork} size={384} eager className='h-full w-full' />
          </motion.div>
        </AnimatePresence>

        <div className='min-w-0 flex-1 text-white'>
          <p className='text-[11px] font-bold uppercase tracking-[0.18em] text-white/70'>Featured mix</p>
          <h2 className='mt-1.5 line-clamp-2 text-2xl font-extrabold leading-[1.05] sm:text-4xl md:text-5xl'>{current.name || 'Untitled mix'}</h2>
          <p className='mt-2 hidden max-w-xl line-clamp-2 text-sm text-white/75 sm:block'>{description}</p>
          <p className='mt-2 text-xs font-semibold text-white/70'>
            {current.owner?.display_name || 'Melofy'}{current.tracks?.total ? ` · ${current.tracks.total} songs` : ''}
          </p>
          <div className='mt-4 flex items-center gap-2 md:mt-6'>
            <button
              type='button'
              onClick={(event) => { event.stopPropagation(); onPlay(current); }}
              className='flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-lg transition-transform hover:scale-[1.03] active:scale-[0.98] md:h-12 md:px-7'
            >
              <Play className='h-4 w-4 fill-current' /> Play
            </button>
            {onSave && (
              <button
                type='button'
                aria-label={`Save ${current.name || 'mix'} to library`}
                title='Save to library'
                onClick={(event) => { event.stopPropagation(); onSave(current); }}
                className='flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-white/60 hover:bg-white/10 md:h-12 md:w-12'
              >
                <Plus className='h-5 w-5' />
              </button>
            )}
          </div>
        </div>
      </div>

      {featured.length > 1 && (
        <div className='absolute bottom-4 right-5 flex items-center gap-1.5 md:bottom-6 md:right-8'>
          {featured.map((item, dot) => (
            <button
              key={item.id}
              type='button'
              aria-label={`Show ${item.name || 'collection'}`}
              aria-current={dot === index}
              onClick={() => setIndex(dot)}
              className={cn('h-1.5 rounded-full transition-all duration-300', dot === index ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70')}
            />
          ))}
        </div>
      )}
    </section>
  );
}

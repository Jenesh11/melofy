'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface HeroPlaylist {
  id: string;
  name?: string;
  description?: string;
  images?: Array<{ url?: string }>;
  tracks?: { total?: number };
  owner?: { display_name?: string };
}

interface HeroPlaylistCardProps {
  playlist: HeroPlaylist;
  onPlay: (playlist: HeroPlaylist) => void;
  index: number;
}

export function HeroPlaylistCard({
  playlist,
  onPlay,
  index,
}: HeroPlaylistCardProps) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  // Helper to decode HTML entities like &#x2F; to /
  const decodeHtmlEntities = (text: string) => {
    if (!text) return '';
    const map: Record<string, string> = {
      '&#x2F;': '/',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
    };
    return text.replace(/&#x2F;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (m) => map[m]);
  };

  const decodedDescription = decodeHtmlEntities(
    playlist.description?.replace(/<[^>]*>/g, '') || '',
  );

  // Use a subtle opacity + tiny upward lift instead of a wide horizontal slide.
  // This prevents the "wiggle / settle" jitter that occurred when multiple cards
  // slid in from x:50 with staggered delays on every refresh.
  const variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 16 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={variants}
      initial='hidden'
      animate='visible'
      transition={{
        duration: 0.5,
        delay: index * 0.07,
        ease: [0.22, 1, 0.36, 1],
      }}
      className='relative group shrink-0 w-[82vw] max-w-[320px] md:max-w-none md:w-[500px] h-[220px] md:h-[300px] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-white/10 transition-all duration-500 bg-zinc-900/30 dark:bg-black/20 backdrop-blur-xl snap-start cursor-pointer shadow-2xl block'
      onClick={() => router.push(`/playlist/${playlist.id}`)}
    >
      {/* Background: Subtle Blurred cover art inside the card */}
      <div className='absolute inset-0 opacity-35 group-hover:opacity-45 transition-opacity duration-700 blur-[40px] scale-110 saturate-150 z-0 pointer-events-none'>
        {playlist.images?.[0]?.url && (
          <Image
            src={playlist.images[0].url}
            fill
            sizes="(max-width: 768px) 320px, 500px"
            className='object-cover'
            alt=''
            priority={index < 2}
          />
        )}
      </div>

      {/* Dark gradient overlay for text readability */}
      <div className='absolute inset-0 bg-linear-to-b from-black/5 via-black/15 to-black/30 z-5' />

      {/* Main split content */}
      <div className='absolute inset-0 p-4 md:p-6 flex gap-4 md:gap-6 items-center z-10'>
        {/* Left Side: Artwork Container with Hover Gloss Sweep Shine */}
        <div className='relative shrink-0 w-24 h-24 md:w-[185px] md:h-[185px] rounded-2xl md:rounded-[1.75rem] overflow-hidden shadow-2xl border border-white/10 group-hover:scale-[1.02] transition-transform duration-500 ease-out'>
          {playlist.images?.[0]?.url ? (
            <Image
              src={playlist.images[0].url}
              fill
              sizes='(max-width: 768px) 96px, 185px'
              className='object-cover'
              alt={playlist.name || ''}
              priority={index < 2}
            />
          ) : (
            <div className='w-full h-full bg-linear-to-br from-zinc-800 to-zinc-900 flex items-center justify-center'>
              <span className='text-zinc-500 font-bold text-xs'>No Cover</span>
            </div>
          )}

          {/* Elegant gloss shine sweep effect on hover */}
          <div className='absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out z-10 pointer-events-none' />
        </div>

        {/* Right Side: Text details */}
        <div className='flex-1 flex flex-col justify-between h-full min-w-0 py-2 md:py-4'>
          {/* Top part: Title */}
          <div className='min-w-0'>
            <h2 className='text-base md:text-2xl font-black text-white mt-1 md:mt-2.5 leading-tight tracking-tight drop-shadow-md group-hover:text-primary transition-colors line-clamp-2'>
              {playlist.name || 'Untitled Playlist'}
            </h2>
            <p className='text-zinc-300 text-[10px] md:text-xs line-clamp-2 md:line-clamp-3 mt-1.5 md:mt-2.5 font-medium leading-relaxed'>
              {decodedDescription ||
                'Expertly curated for your favorite vibes and moments.'}
            </p>
          </div>

          {/* Bottom part: Metadata & Play button */}
          <div className='flex items-center justify-between gap-2 mt-2 mb-1 md:mb-2'>
            <div className='flex items-center gap-1.5 md:gap-2.5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400 min-w-0'>
              <span className='text-white font-black shrink-0'>{playlist.tracks?.total || 50} Tracks</span>
              {playlist.owner?.display_name && (
                <>
                  <span className='text-zinc-600 font-normal select-none'>•</span>
                  <span className='truncate max-w-[80px] md:max-w-[130px]'>
                    By {playlist.owner.display_name}
                  </span>
                </>
              )}
            </div>

            {/* Play Button */}
            <div className='relative shrink-0'>
              <Button
                size='icon'
                className='h-8 w-8 md:h-11 md:w-11 rounded-full bg-primary text-primary-foreground shadow-xl scale-95 group-hover:scale-105 active:scale-95 transition-all duration-300 border-none relative z-10'
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPlay(playlist);
                }}
              >
                <Play className='h-3.5 w-3.5 md:h-5 md:w-5 fill-primary-foreground translate-x-px' />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

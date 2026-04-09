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
      // Use fluid viewport-relative width on mobile so the card doesn't overflow
      // or feel cramped. Max-width keeps it bounded on larger screens.
      className='relative group shrink-0 w-[82vw] max-w-[300px] md:max-w-none md:w-[500px] h-[220px] md:h-[300px] rounded-[2.5rem] md:rounded-[3rem] overflow-hidden border border-white/5 hover:border-white/20 transition-all duration-700 bg-black snap-start cursor-pointer shadow-2xl block'
      onClick={() => router.push(`/playlist/${playlist.id}`)}
    >
      {/* Cinematic Blurred Background 'Essence' */}
      <div className='absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity duration-700 blur-[80px] scale-150 saturate-200'>
        {playlist.images?.[0]?.url && (
          <Image
            src={playlist.images[0].url}
            fill
            sizes='(max-width: 768px) 82vw, 500px'
            className='object-cover'
            alt=''
            priority={index < 2}
          />
        )}
      </div>

      {/* Dark gradient overlay for text readability */}
      <div className='absolute inset-0 bg-linear-to-t from-black via-transparent to-black/20 z-0' />

      <div className='absolute inset-0 p-5 md:p-10 flex flex-col justify-between z-10'>
        <div className='flex justify-between items-start'>
          <div className='flex flex-col gap-1 pr-3 min-w-0'>
            <span className='px-2.5 py-1 bg-white/10 backdrop-blur-lg text-white/80 text-[9px] md:text-[10px] font-bold rounded-full uppercase tracking-[0.2em] border border-white/10 w-fit shrink-0'>
              Playlist
            </span>
            <h2 className='text-xl md:text-4xl font-black text-white mt-2 md:mt-4 leading-tight tracking-tight drop-shadow-lg group-hover:text-primary transition-colors truncate'>
              {playlist.name || 'Untitled Playlist'}
            </h2>
          </div>

          {/* Play Button */}
          <div className='relative z-20 shrink-0'>
            <div className='absolute -inset-4 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none' />
            <Button
              size='icon'
              className='h-10 w-10 md:h-14 md:w-14 rounded-full bg-primary text-primary-foreground shadow-2xl scale-90 group-hover:scale-110 transition-all duration-500 border-none relative z-20'
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPlay(playlist);
              }}
            >
              <Play className='h-4 w-4 md:h-6 md:w-6 fill-black' />
            </Button>
          </div>
        </div>

        <div className='flex flex-col gap-1.5 md:gap-2 pointer-events-none'>
          <p className='text-zinc-400 text-xs md:text-sm line-clamp-2 font-medium max-w-[240px] md:max-w-[280px] leading-relaxed'>
            {decodedDescription ||
              'Expertly curated for your favorite vibes and moments.'}
          </p>
          <div className='flex items-center gap-2 md:gap-3 mt-2 md:mt-4'>
            <div className='bg-white/10 backdrop-blur-md px-2.5 py-1 md:px-3 rounded-full border border-white/10'>
              <span className='text-[9px] md:text-[10px] text-white/90 font-black uppercase tracking-[0.15em]'>
                {playlist.tracks?.total || 50} TRACKS
              </span>
            </div>
            {playlist.owner?.display_name && (
              <span className='text-[9px] md:text-[10px] text-zinc-400 font-bold uppercase tracking-widest truncate'>
                By {playlist.owner.display_name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover Light Effect */}
      <div className='absolute inset-0 bg-linear-to-tr from-white/5 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-1000 pointer-events-none rounded-[2.5rem]' />
    </motion.div>
  );
}

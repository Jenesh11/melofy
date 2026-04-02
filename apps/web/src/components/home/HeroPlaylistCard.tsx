'use client';

import { motion } from 'framer-motion';
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

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.8,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`relative group shrink-0 w-[300px] md:w-[500px] h-[280px] md:h-[300px] rounded-[3rem] overflow-hidden border border-white/5 hover:border-white/20 transition-all duration-700 bg-black snap-start cursor-pointer shadow-2xl block`}
      onClick={() => router.push(`/playlist/${playlist.id}`)}
    >
      {/* Cinematic Blurred Background 'Essence' */}
      <div className='absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity duration-700 blur-[80px] scale-150 saturate-200'>
        {playlist.images?.[0]?.url && (
          <Image
            src={playlist.images[0].url}
            fill
            sizes='(max-width: 768px) 300px, 500px'
            className='object-cover'
            alt=''
            priority={index < 2}
          />
        )}
      </div>

      {/* Dark gradient overlay for text readability */}
      <div className='absolute inset-0 bg-linear-to-t from-black via-transparent to-black/20 z-0' />

      <div className='absolute inset-0 p-8 md:p-10 flex flex-col justify-between z-10'>
        <div className='flex justify-between items-start'>
          <div className='flex flex-col gap-1 pr-4 min-w-0'>
            <span className='px-3 py-1 bg-white/10 backdrop-blur-lg text-white/80 text-[10px] font-bold rounded-full uppercase tracking-[0.2em] border border-white/10 w-fit shrink-0'>
              Playlist
            </span>
            <h2 className='text-3xl md:text-4xl font-black text-white mt-4 leading-tight tracking-tight drop-shadow-lg group-hover:text-primary transition-colors truncate'>
              {playlist.name || 'Untitled Playlist'}
            </h2>
          </div>

          {/* Play Button */}
          <div className='relative z-20'>
            <div className='absolute -inset-4 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none' />
            <Button
              size='icon'
              className='h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-2xl scale-90 group-hover:scale-110 transition-all duration-500 border-none relative z-20'
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPlay(playlist);
              }}
            >
              <Play className='h-6 w-6 fill-black' />
            </Button>
          </div>
        </div>

        <div className='flex flex-col gap-2 pointer-events-none'>
          <p className='text-zinc-400 text-sm line-clamp-2 font-medium max-w-[280px] leading-relaxed'>
            {decodedDescription ||
              'Expertly curated for your favorite vibes and moments.'}
          </p>
          <div className='flex items-center gap-3 mt-4'>
            <div className='bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10'>
              <span className='text-[10px] text-white/90 font-black uppercase tracking-[0.15em]'>
                {playlist.tracks?.total || 50} TRACKS
              </span>
            </div>
            {playlist.owner?.display_name && (
              <span className='text-[10px] text-zinc-400 font-bold uppercase tracking-widest'>
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

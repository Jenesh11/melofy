'use client';

import { usePlayerStore } from '@/store/usePlayerStore';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Music2, Share2, Play, Pause } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function PlayingPage() {
  const { currentTrack, isPlaying, pause, resume } = usePlayerStore();
  const router = useRouter();

  const handleTogglePlay = () => {
    if (isPlaying) pause();
    else resume();
  };

  const handleShare = () => {
    if (!currentTrack) return;

    const youtubeUrl = currentTrack.identifier
      ? `https://www.youtube.com/watch?v=${currentTrack.identifier}`
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${currentTrack.title} ${currentTrack.artist}`)}`;

    navigator.clipboard
      .writeText(youtubeUrl)
      .then(() => {
        toast.success('Link copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
        toast.error('Failed to copy link');
      });
  };

  return (
    <div className='relative min-h-[calc(100dvh-4rem)] w-full overflow-hidden bg-black flex flex-col px-6 pt-6 pb-32 md:px-12 md:pt-8 md:pb-24 -mb-32 md:-mb-24'>
      {/* Dynamic Cinematic Backdrop (The "Essence") */}
      <AnimatePresence mode='wait'>
        {currentTrack && (
          <motion.div
            key={currentTrack.artworkUrl}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className='absolute inset-0 pointer-events-none'
          >
            <div
              className='absolute inset-0 blur-[120px] scale-150 saturate-200'
              style={{
                backgroundImage: `url(${currentTrack.artworkUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className='absolute inset-0 bg-black/40' />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className='relative z-10 w-full max-w-6xl mx-auto flex-1 flex flex-col justify-between'>
        <div className='flex items-center justify-between'>
          <Button
            variant='ghost'
            onClick={() => router.back()}
            className='text-white/60 hover:text-white hover:bg-white/10 rounded-full'
          >
            <ChevronLeft className='mr-2 h-5 w-5' />
            Back
          </Button>
        </div>

        <div className='flex-1 flex items-center justify-center'>
          <AnimatePresence mode='wait'>
            {currentTrack ? (
              <motion.div
                key={currentTrack.id}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 1.05 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className='flex flex-col lg:flex-row gap-12 lg:gap-20 items-center w-full'
              >
                {/* Artwork Card */}
                <div className='relative group shrink-0'>
                  <div className='absolute -inset-10 bg-primary/20 blur-[60px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-1000' />
                  <div className='relative w-full max-w-[280px] sm:max-w-[320px] md:max-w-[400px] lg:max-w-[450px] aspect-square rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 bg-zinc-900 shrink-0'>
                    {currentTrack.artworkUrl ? (
                      <img
                        src={currentTrack.artworkUrl}
                        alt={currentTrack.title}
                        className='w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110'
                      />
                    ) : (
                      <div className='w-full h-full flex items-center justify-center'>
                        <Music2 className='h-32 w-32 text-white/10' />
                      </div>
                    )}

                    <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                      <Button
                        size='icon'
                        className='h-24 w-24 rounded-full bg-primary text-black hover:scale-110 transition-transform shadow-2xl border-none'
                        onClick={handleTogglePlay}
                      >
                        {isPlaying ? (
                          <Pause className='h-10 w-10 fill-current' />
                        ) : (
                          <Play className='h-10 w-10 ml-2 fill-current' />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Text Info */}
                <div className='flex flex-col gap-6 flex-1 text-center lg:text-left min-w-0'>
                  <div className='space-y-4 min-w-0'>
                    <motion.p
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 0.8, x: 0 }}
                      className='text-primary font-black tracking-[0.4em] text-xs uppercase'
                    >
                      Now Playing
                    </motion.p>
                    <h1 className='text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-white tracking-tighter leading-[1.1] drop-shadow-2xl line-clamp-3 lg:line-clamp-2'>
                      {currentTrack.title}
                    </h1>
                    <p className='text-xl md:text-3xl text-white/50 font-medium tracking-tight truncate'>
                      {currentTrack.artist}
                    </p>
                  </div>

                  <div className='flex items-center justify-center lg:justify-start gap-4 mt-4'>
                    <Button
                      size='lg'
                      className='bg-white text-black font-black h-14 px-10 rounded-full hover:scale-105 transition-all active:scale-95 shadow-xl border-none text-base'
                      onClick={handleTogglePlay}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className='h-6 w-6 mr-3 fill-current' /> PAUSE
                        </>
                      ) : (
                        <>
                          <Play className='h-6 w-6 mr-3 fill-current' /> PLAY
                        </>
                      )}
                    </Button>

                    <Button
                      size='icon'
                      variant='outline'
                      className='h-14 w-14 rounded-full border-white/20 hover:bg-white/10 bg-white/5 backdrop-blur-md transition-all'
                      onClick={handleShare}
                    >
                      <Share2 className='h-6 w-6 text-white/80' />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='flex flex-col items-center justify-center gap-6 text-center'
              >
                <div className='p-8 rounded-full bg-white/5 backdrop-blur-3xl border border-white/10 animate-pulse'>
                  <Music2 className='h-16 w-16 text-white/20' />
                </div>
                <div className='space-y-2'>
                  <h2 className='text-3xl font-bold text-white tracking-tight'>
                    The stage is empty
                  </h2>
                  <p className='text-white/40 max-w-sm font-medium'>
                    Play something from your library or search for a track to
                    see it come to life here.
                  </p>
                </div>
                <Link href='/'>
                  <Button
                    variant='outline'
                    className='rounded-full border-white/10 hover:bg-white/5 mt-4 transition-all'
                  >
                    Discover Music
                  </Button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Subtle overlay texture */}
      <div className='absolute inset-0 pointer-events-none opacity-[0.03] bg-[url("https://www.transparenttextures.com/patterns/p6.png")] mix-blend-overlay' />
    </div>
  );
}

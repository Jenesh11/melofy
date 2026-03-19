'use client';

import { useState } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  Music2,
  Share2,
  Play,
  Pause,
  ListMusic,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import { SyncedLyrics } from '@/components/ui/SyncedLyrics';

export default function PlayingPage() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const pause = usePlayerStore((state) => state.pause);
  const resume = usePlayerStore((state) => state.resume);
  const router = useRouter();
  const [showLyrics, setShowLyrics] = useState(false);

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
    <div className='relative flex-1 h-full w-full overflow-hidden bg-black flex flex-col px-6 pt-6 md:px-12 md:pt-8'>
      {/* Dynamic Cinematic Backdrop (The "Essence") */}
      <AnimatePresence mode='wait'>
        {currentTrack && (
          <motion.div
            key={currentTrack.artworkUrl}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
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
            <div className='absolute inset-0 bg-black/60' />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Bar */}
      <div className='relative z-1 w-full flex justify-between items-center'>
        <Button
          variant='ghost'
          onClick={() => router.back()}
          className='text-white/60 hover:text-white hover:bg-white/10 rounded-full'
        >
          <ChevronLeft className='mr-2 h-5 w-5' />
          Back
        </Button>
      </div>

      {/* Main Content Area */}
      <div className='relative z-10 w-full flex-1 flex flex-col items-center justify-center'>
        <AnimatePresence mode='wait'>
          {currentTrack ? (
            <motion.div
              key={`player-${currentTrack.id}`}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 1.05 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className={`flex flex-col lg:flex-row gap-12 lg:gap-20 items-center w-full max-w-5xl mx-auto transition-all duration-700 ${showLyrics ? 'scale-90 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
            >
              {/* Artwork Card */}
              <div className='relative group shrink-0 w-full max-w-[280px] sm:max-w-[320px] md:max-w-[400px]'>
                <div className='absolute -inset-10 bg-primary/20 blur-[60px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-1000' />
                <div className='relative aspect-square rounded-[2rem] lg:rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 bg-zinc-900'>
                  {currentTrack.artworkUrl ? (
                    <img
                      src={currentTrack.artworkUrl}
                      alt={currentTrack.title}
                      className='w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105'
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

              {/* Text Info & Controls */}
              <div className='flex flex-col items-center lg:items-start text-center lg:text-left gap-6 lg:gap-8 w-full min-w-0'>
                <div className='space-y-4 w-full'>
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 0.8, y: 0 }}
                    className='text-primary font-black tracking-[0.4em] text-xs uppercase'
                  >
                    Now Playing
                  </motion.p>
                  <h1 className='text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white tracking-tighter leading-[1.1] drop-shadow-2xl line-clamp-2'>
                    {currentTrack.title}
                  </h1>
                  <p className='text-xl md:text-3xl lg:text-4xl text-white/50 font-medium tracking-tight truncate'>
                    {currentTrack.artist}
                  </p>
                </div>

                <div className='flex items-center justify-center lg:justify-start gap-4 mt-2 lg:mt-6'>
                  <Button
                    size='lg'
                    className='bg-white text-black font-black h-16 w-16 md:w-auto md:px-12 rounded-full hover:scale-105 transition-all active:scale-95 shadow-xl border-none text-base'
                    onClick={handleTogglePlay}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className='h-8 w-8 md:mr-3 fill-current' />{' '}
                        <span className='hidden md:inline'>PAUSE</span>
                      </>
                    ) : (
                      <>
                        <Play className='h-8 w-8 ml-1 md:ml-0 md:mr-3 fill-current' />{' '}
                        <span className='hidden md:inline'>PLAY</span>
                      </>
                    )}
                  </Button>

                  <Button
                    size='icon'
                    variant='outline'
                    className={`h-14 w-14 rounded-full border-white/20 transition-all backdrop-blur-md ${showLyrics ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                    onClick={() => setShowLyrics(!showLyrics)}
                    title='Toggle Lyrics'
                  >
                    <ListMusic className='h-6 w-6' />
                  </Button>

                  <Button
                    size='icon'
                    variant='outline'
                    className='h-14 w-14 rounded-full border-white/20 hover:bg-white/10 bg-white/5 backdrop-blur-md transition-all'
                    onClick={handleShare}
                    title='Share'
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
              className='flex flex-col items-center gap-6'
            >
              <div className='p-8 rounded-full bg-white/5 backdrop-blur-3xl border border-white/10 animate-pulse'>
                <Music2 className='h-16 w-16 text-white/20' />
              </div>
              <div className='space-y-2 text-center'>
                <h2 className='text-3xl font-bold text-white tracking-tight'>
                  The stage is empty
                </h2>
                <p className='text-white/40 max-w-sm font-medium'>
                  Play something from your library or search for a track to see
                  it come to life here.
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

        {/* Lyrics Modal Overlay */}
        <AnimatePresence>
          {showLyrics && currentTrack && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 md:p-8'
            >
              {/* Click outside to close */}
              <div
                className='absolute inset-0 cursor-pointer'
                onClick={() => setShowLyrics(false)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className='relative w-full max-w-4xl h-[80vh] bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col'
              >
                <div className='absolute top-4 right-4 z-50'>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => setShowLyrics(false)}
                    className='text-white/60 hover:text-white hover:bg-white/10 rounded-full h-10 w-10 md:h-12 md:w-12 bg-black/20 backdrop-blur-sm shadow-sm'
                  >
                    <X className='h-6 w-6 md:h-8 md:w-8' />
                  </Button>
                </div>

                <div className='flex-1 min-h-0 relative px-2 md:px-8'>
                  <SyncedLyrics />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Subtle overlay texture */}
      <div className='absolute inset-0 pointer-events-none opacity-[0.03] bg-[url("https://www.transparenttextures.com/patterns/p6.png")] mix-blend-overlay z-0' />
    </div>
  );
}

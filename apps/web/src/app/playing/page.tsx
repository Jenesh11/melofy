'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
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
  Heart,
  PictureInPicture2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import { SyncedLyrics } from '@/components/ui/SyncedLyrics';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import { openPip, isPipSupported } from '@/hooks/usePip';
import { useLyricsPanelStore } from '@/store/useLyricsPanelStore';
import { Drawer } from 'vaul';

export default function PlayingPage() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const pause = usePlayerStore((state) => state.pause);
  const resume = usePlayerStore((state) => state.resume);
  const router = useRouter();
  const [showLyrics, setShowLyrics] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const { toggleLike, isLiked } = useLikedSongs();
  const [pipAvailable, setPipAvailable] = useState(false);
  const isPanelOpen = useLyricsPanelStore((s) => s.isOpen);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const supported = isPipSupported();
    if (supported) {
      const timeout = setTimeout(() => setPipAvailable(true), 0);
      return () => clearTimeout(timeout);
    }
  }, []);

  const handleTogglePlay = () => {
    if (isPlaying) pause();
    else resume();
  };

  // Fade the entire page out before navigating so neither the backdrop
  // nor the content can flash on the destination page.
  const handleBack = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      router.back();
    }, 180);
  }, [router]);

  useEffect(() => {
    const handleHardwareBack = (e: Event) => {
      e.preventDefault();
      if (showLyrics) {
        setShowLyrics(false);
      } else {
        handleBack();
      }
    };
    
    window.addEventListener('hardwareBack', handleHardwareBack);
    return () => window.removeEventListener('hardwareBack', handleHardwareBack);
  }, [showLyrics, handleBack]);

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
    <motion.div
      drag={isMobile ? 'y' : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.8}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 80 || info.velocity.y > 400) {
          handleBack();
        }
      }}
      className='relative flex-1 h-full w-full overflow-hidden bg-background flex flex-col px-6 pt-6 md:px-12 md:pt-8'
      style={{
        opacity: isLeaving ? 0 : 1,
        transition: 'opacity 0.18s ease',
      }}
    >
      {/* Simple Cinematic Backdrop */}
      {currentTrack?.artworkUrl && (
        <div className='absolute inset-0 pointer-events-none'>
          <div
            className='absolute inset-0 blur-[80px] scale-125 opacity-50 saturate-150 transition-all duration-700'
            style={{
              backgroundImage: `url(${currentTrack.artworkUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className='absolute inset-0 bg-background/60 dark:bg-black/60' />
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className='relative z-1 w-full flex justify-between items-center'>
        <Button
          variant='ghost'
          onClick={handleBack}
          className='text-foreground/60 hover:text-foreground hover:bg-foreground/10 rounded-full'
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
              className={[
                'flex items-center w-full mx-auto transition-all duration-500',
                // When lyrics panel is open, shrink row-layout breakpoint (xl) and tighten gap
                isPanelOpen
                  ? 'flex-col xl:flex-row gap-8 xl:gap-12 max-w-3xl'
                  : 'flex-col lg:flex-row gap-12 lg:gap-20 max-w-5xl',
                showLyrics ? 'scale-90 opacity-0 pointer-events-none' : 'scale-100 opacity-100',
              ].join(' ')}
            >
              {/* Artwork Card */}
              <div className={[
                'relative group shrink-0 w-full transition-all duration-500',
                isPanelOpen
                  ? 'max-w-[220px] md:max-w-[260px] xl:max-w-[300px]'
                  : 'max-w-[280px] sm:max-w-[320px] md:max-w-[400px]',
              ].join(' ')}>
                <div className='relative aspect-square rounded-[2rem] lg:rounded-[3rem] overflow-hidden shadow-2xl border border-foreground/10 bg-secondary/30 backdrop-blur-2xl'>
                  {currentTrack.artworkUrl ? (
                    <Image
                      src={currentTrack.artworkUrl}
                      alt={currentTrack.title}
                      width={400}
                      height={400}
                      className='w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105'
                    />
                  ) : (
                    <div className='w-full h-full flex items-center justify-center'>
                      <Music2 className='h-32 w-32 text-foreground/10' />
                    </div>
                  )}

                  <div className='absolute inset-0 bg-background/20 dark:bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm'>
                    <Button
                      size='icon'
                      className='h-24 w-24 rounded-full bg-primary text-primary-foreground hover:scale-110 transition-transform shadow-2xl border-none'
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
              <div className={[
                'flex flex-col w-full min-w-0 transition-all duration-500',
                isPanelOpen
                  ? 'items-center xl:items-start text-center xl:text-left gap-4 xl:gap-6'
                  : 'items-center lg:items-start text-center lg:text-left gap-6 lg:gap-8',
              ].join(' ')}>
                <div className='space-y-4 w-full'>
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 0.8, y: 0 }}
                    className='text-primary font-black tracking-[0.4em] text-xs uppercase'
                  >
                    Now Playing
                  </motion.p>
                  <h1 className={[
                    'font-black text-foreground tracking-tighter leading-[1.1] drop-shadow-2xl line-clamp-2 transition-all duration-500',
                    isPanelOpen
                      ? 'text-2xl md:text-3xl xl:text-4xl xxl:text-5xl'
                      : 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl',
                  ].join(' ')}>
                    {currentTrack.title}
                  </h1>
                  <p className={[
                    'text-foreground/50 font-medium tracking-tight truncate transition-all duration-500',
                    isPanelOpen ? 'text-base md:text-xl xl:text-2xl' : 'text-xl md:text-3xl lg:text-4xl',
                  ].join(' ')}>
                    {currentTrack.artist}
                  </p>
                </div>

                <div className={[
                    'flex items-center justify-center mt-2 gap-3 flex-wrap transition-all duration-500',
                    isPanelOpen ? 'xl:justify-start xl:mt-4' : 'lg:justify-start lg:mt-6',
                  ].join(' ')}>
                  <Button
                    size='lg'
                    className='bg-foreground text-background font-black h-16 w-16 md:w-auto md:px-12 rounded-full hover:scale-105 transition-all active:scale-95 shadow-xl border-none text-base'
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
                    className={`h-14 w-14 rounded-full border-foreground/20 transition-all backdrop-blur-xl ${showLyrics ? 'bg-foreground text-background' : 'bg-foreground/5 text-foreground hover:bg-foreground/10'}`}
                    onClick={() => setShowLyrics(!showLyrics)}
                    title='Toggle Lyrics'
                  >
                    <ListMusic className='h-6 w-6' />
                  </Button>

                  <Button
                    size='icon'
                    variant='outline'
                    className='h-14 w-14 rounded-full border-foreground/20 hover:bg-foreground/10 bg-foreground/5 backdrop-blur-xl transition-all'
                    onClick={handleShare}
                    title='Share'
                  >
                    <Share2 className='h-6 w-6 text-foreground/80' />
                  </Button>

                  <Button
                    size='icon'
                    variant='outline'
                    className='h-14 w-14 rounded-full border-foreground/20 hover:bg-foreground/10 bg-foreground/5 backdrop-blur-xl transition-all'
                    onClick={() => currentTrack && toggleLike(currentTrack)}
                    title='Like Song'
                  >
                    <Heart
                      className={`h-6 w-6 transition-all ${isLiked(currentTrack?.id || '') ? 'fill-foreground' : ''}`}
                    />
                  </Button>

                  {pipAvailable && (
                    <Button
                      size='icon'
                      variant='outline'
                      className='h-14 w-14 rounded-full border-foreground/20 hover:bg-foreground/10 bg-foreground/5 backdrop-blur-xl transition-all'
                      onClick={() => openPip()}
                      title='Picture-in-Picture'
                    >
                      <PictureInPicture2 className='h-6 w-6 text-foreground/80' />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='flex flex-col items-center gap-6'
            >
              <div className='p-8 rounded-full bg-foreground/5 backdrop-blur-3xl border border-foreground/10 animate-pulse'>
                <Music2 className='h-16 w-16 text-foreground/20' />
              </div>
              <div className='space-y-2 text-center'>
                <h2 className='text-3xl font-bold text-foreground tracking-tight'>
                  The stage is empty
                </h2>
                <p className='text-foreground/40 max-w-sm font-medium'>
                  Play something from your library or search for a track to see
                  it come to life here.
                </p>
              </div>
              <Link href='/'>
                <Button
                  variant='outline'
                  className='rounded-full border-foreground/10 hover:bg-foreground/5 mt-4 transition-all'
                >
                  Discover Music
                </Button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lyrics Drawer / Modal */}
        <Drawer.Root 
          open={showLyrics} 
          onOpenChange={setShowLyrics}
          shouldScaleBackground={true}
        >
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
            <Drawer.Content className="bg-background flex flex-col rounded-t-[32px] h-[92vh] fixed bottom-0 left-0 right-0 z-[101] border-t border-foreground/10 outline-none">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-foreground/20 mt-4 mb-2" />
              
              <div className="flex items-center justify-between px-6 py-2 shrink-0">
                <div className="flex flex-col">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-0.5">Now Reading</p>
                  <h2 className="text-xl font-bold tracking-tight text-foreground line-clamp-1">
                    {currentTrack?.title}
                  </h2>
                </div>
                <Drawer.Close asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-foreground/5 h-10 w-10">
                    <X className="h-6 w-6" />
                  </Button>
                </Drawer.Close>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden relative px-2 md:px-8">
                <SyncedLyrics />
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>


    </motion.div>
  );
}

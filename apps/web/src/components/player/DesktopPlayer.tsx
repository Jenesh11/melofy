'use client';

import {
  Shuffle,
  SkipBack,
  Pause,
  Play,
  SkipForward,
  Repeat,
  Loader2,
  Mic2,
  Heart,
  PictureInPicture2,
  ListMusic,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';
import { ListenAlongPopover } from './ListenAlongPopover';
import { cn } from '@/lib/utils';
import { Track } from '@/store/usePlayerStore';
import Image from 'next/image';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import { isPipSupported } from '@/hooks/usePip';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface DesktopPlayerProps {
  currentTrack: Track;
  isShuffle: boolean;
  toggleShuffle: () => void;
  playPrevious: () => void;
  handleTogglePlay: () => void;
  handleSkipNext: () => void;
  isPlaying: boolean;
  isRepeat: boolean;
  toggleRepeat: () => void;
  isBuffering: boolean;
  progressPercent: number;
  currentDisplayTime: string;
  durationTime: string;
  isDraggingSlider: boolean;
  setIsDraggingSlider: (dragging: boolean) => void;
  setSliderValue: (value: number) => void;
  handleSeek: (value: number[]) => void;
  volume: number;
  setVolume: (volume: number) => void;
  handleVolumeWheel: (e: React.WheelEvent) => void;
  onExpand: () => void;
  onOpenPip?: () => void;
  isPipOpen?: boolean;
  isLyricsOpen?: boolean;
  toggleLyrics?: () => void;
  isQueueOpen?: boolean;
  toggleQueue?: () => void;
}

export function DesktopPlayer({
  currentTrack,
  isShuffle,
  toggleShuffle,
  playPrevious,
  handleTogglePlay,
  handleSkipNext,
  isPlaying,
  isRepeat,
  toggleRepeat,
  isBuffering,
  progressPercent,
  currentDisplayTime,
  durationTime,
  setIsDraggingSlider,
  setSliderValue,
  handleSeek,
  volume,
  setVolume,
  handleVolumeWheel,
  onExpand,
  onOpenPip,
  isPipOpen,
  isLyricsOpen,
  toggleLyrics,
  isQueueOpen,
  toggleQueue,
}: DesktopPlayerProps) {
  const { isLiked, toggleLike } = useLikedSongs();
  const [pipAvailable, setPipAvailable] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const supported = isPipSupported();
    if (supported) {
      const timeout = setTimeout(() => setPipAvailable(true), 0);
      return () => clearTimeout(timeout);
    }
  }, []);

  return (
    <motion.div
      drag={isMobile ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      onDragEnd={(_, info) => {
        const swipeThreshold = 50;
        const velocityThreshold = 500;
        
        if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
          setDirection(1);
          handleSkipNext();
        } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
          setDirection(-1);
          playPrevious();
        }
      }}
      className={cn(
        'relative h-14 md:h-20 border-t border-border bg-background md:bg-background/60 backdrop-blur-3xl px-2 md:px-4 flex items-center justify-between w-full mx-auto md:max-w-none rounded-md md:rounded-none mb-16 md:mb-0 shadow-lg md:shadow-none transition-all',
        'cursor-pointer md:cursor-default touch-none',
      )}
      onTap={(e) => {
        // On mobile, tap on the bar expands the player.
        // On desktop, navigation is restricted to clicking the track info.
        if (!isMobile) return;

        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('[role="slider"]') || target.closest('.no-nav')) return;
        
        if (isMobile) {
          onExpand();
        }
      }}
    >
      {/* Current Track Info */}
      <div 
        className='relative flex items-center flex-1 md:flex-none md:w-[35%] md:min-w-[240px] gap-2 pl-1 md:pl-0 overflow-hidden group/info md:cursor-pointer'
        onClick={() => !isMobile && router.push('/playing')}
      >
        {/* Blended Background Artwork */}
        <AnimatePresence mode='wait'>
          <motion.div
            key={currentTrack.artworkUrl}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className='absolute inset-0 z-0 pointer-events-none'
            style={{
              backgroundImage: `url(${currentTrack.artworkUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(20px) saturate(2)',
              maskImage: 'linear-gradient(to right, black, transparent)',
              WebkitMaskImage: 'linear-gradient(to right, black, transparent)',
            } as React.CSSProperties}
          />
        </AnimatePresence>

        <AnimatePresence mode='wait' initial={false} custom={direction}>
          <motion.div
            key={currentTrack.id}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className='relative z-10 flex-1 min-w-0'
          >
            <div className='flex items-center gap-3 overflow-hidden py-2 px-1'>
              <div className='h-10 w-10 md:h-14 md:w-14 rounded-md bg-muted overflow-hidden shrink-0 relative'>
                <Image
                  src={currentTrack.artworkUrl}
                  alt={currentTrack.title}
                  width={56}
                  height={56}
                  className='h-full w-full object-cover group-hover/info:scale-105 transition-transform duration-500'
                />
              </div>
              <div className='flex flex-col min-w-0'>
                <p className='text-sm font-semibold text-foreground truncate group-hover/info:underline decoration-1 underline-offset-4'>
                  {currentTrack.title}
                </p>
                <p 
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/search?q=${encodeURIComponent(currentTrack.artist)}`);
                  }}
                  className='text-xs text-muted-foreground truncate hover:text-primary hover:underline underline-offset-2 cursor-pointer transition-all font-outfit'
                >
                  {currentTrack.artist}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Primary Controls */}
      <div className='flex items-center md:flex-col md:items-center justify-end md:max-w-[40%] flex-1 gap-2 pr-1 md:pr-0'>
        <div className='flex items-center gap-2 md:gap-4'>
          <Button
            variant='ghost'
            size='icon'
            className={cn(
              'hidden md:inline-flex h-8 w-8 transition-colors',
              isShuffle
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleShuffle();
            }}
          >
            <Shuffle className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='hidden md:inline-flex h-8 w-8 text-muted-foreground hover:text-foreground'
            onClick={(e) => {
              e.stopPropagation();
              setDirection(-1);
              playPrevious();
            }}
          >
            <SkipBack className='h-4 w-4 fill-current' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className={cn(
              'flex md:hidden h-9 w-9 shrink-0 transition-colors',
              isLiked(currentTrack.id)
                ? 'text-primary'
                : 'text-muted-foreground',
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(currentTrack);
            }}
          >
            <Heart
              className={cn(
                'h-5 w-5',
                isLiked(currentTrack.id) && 'fill-current',
              )}
            />
          </Button>
          <Button
            variant='default'
            size='icon'
            className='h-9 w-9 md:h-8 md:w-8 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform mx-1 md:mx-0'
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePlay();
            }}
            disabled={isBuffering}
          >
            {isBuffering ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : isPlaying ? (
              <Pause className='h-4 w-4 fill-current' />
            ) : (
              <Play className='h-4 w-4 fill-current ml-0.5' />
            )}
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='hidden md:inline-flex h-8 w-8 text-muted-foreground hover:text-foreground'
            onClick={(e) => {
              e.stopPropagation();
              setDirection(1);
              handleSkipNext();
            }}
          >
            <SkipForward className='h-4 w-4 fill-current' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className={cn(
              'hidden md:inline-flex h-8 w-8 transition-colors',
              isRepeat
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleRepeat();
            }}
          >
            <Repeat className='h-4 w-4' />
          </Button>
        </div>

        <div 
          className='hidden md:block w-full'
          onClick={(e) => e.stopPropagation()}
        >
          <ProgressBar
            progressPercent={progressPercent}
            currentDisplayTime={currentDisplayTime}
            durationTime={durationTime}
            onPointerDown={() => setIsDraggingSlider(true)}
            onPointerUp={() => setIsDraggingSlider(false)}
            onValueChange={setSliderValue}
            onValueCommit={handleSeek}
            className='hidden md:flex w-full items-center gap-2 mt-1 px-8 no-nav'
            showLabels={true}
          />
        </div>
      </div>

      {/* Mobile Thin Progress Bar at bottom */}
      <div className='md:hidden absolute bottom-0 left-0 right-0 h-0.5 bg-muted/30 no-nav'>
        <div
          className='absolute left-0 top-0 bottom-0 bg-primary rounded-r-full transition-all duration-100 ease-linear'
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Secondary Controls (Volume etc.) */}
      <div className='hidden md:flex items-center justify-end w-[30%] min-w-[180px] gap-2'>
        <Button
          variant='ghost'
          size='icon'
          className={cn(
            'h-9 w-9 shrink-0 transition-colors',
            isLiked(currentTrack.id) 
              ? 'text-primary hover:text-primary/80' 
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(currentTrack);
          }}
          title={isLiked(currentTrack.id) ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
        >
          <Heart className={cn('h-5 w-5', isLiked(currentTrack.id) && 'fill-current')} />
        </Button>
        <ListenAlongPopover />
        <Button
          variant='ghost'
          size='icon'
          className={cn(
            'transition-colors',
            isQueueOpen ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={(e) => {
            e.stopPropagation();
            toggleQueue?.();
          }}
          title='View Queue'
        >
          <ListMusic className='h-5 w-5' />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className={cn(
            'transition-colors',
            isLyricsOpen ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={(e) => {
            e.stopPropagation();
            toggleLyrics?.();
          }}
          title='View Lyrics'
        >
          <Mic2 className='h-5 w-5' />
        </Button>

        <div className="no-nav" onClick={(e) => e.stopPropagation()}>
          <VolumeControl
            volume={volume}
            setVolume={setVolume}
            onWheel={handleVolumeWheel}
          />

        </div>
        {pipAvailable && (
          <Button
            variant='ghost'
            size='icon'
            className={cn(
              'h-9 w-9 transition-colors',
              isPipOpen
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onOpenPip?.()}
            title={isPipOpen ? 'PiP open' : 'Open Picture-in-Picture'}
          >
            <PictureInPicture2 className='h-5 w-5' />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

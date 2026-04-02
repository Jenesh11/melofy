'use client';

import { useState } from 'react';
import {
  ChevronDown,
  Radio,
  Shuffle,
  SkipBack,
  Pause,
  Play,
  SkipForward,
  Repeat,
  Loader2,
  Mic2,
  X,
  Heart,
} from 'lucide-react';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import { Button } from '@/components/ui/button';
import { ProgressBar } from './ProgressBar';
import { cn } from '@/lib/utils';
import { Track } from '@/store/usePlayerStore';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { SyncedLyrics } from '@/components/ui/SyncedLyrics';
import { ListenAlongPopover } from './ListenAlongPopover';

interface MobilePlayerProps {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  currentTrack: Track;
  isAutoplay: boolean;
  toggleAutoplay: () => void;
  progressPercent: number;
  currentDisplayTime: string;
  durationTime: string;
  setIsDraggingSlider: (dragging: boolean) => void;
  setSliderValue: (value: number) => void;
  handleSeek: (value: number[]) => void;
  isShuffle: boolean;
  toggleShuffle: () => void;
  playPrevious: () => void;
  handleTogglePlay: () => void;
  handleSkipNext: () => void;
  isPlaying: boolean;
  isRepeat: boolean;
  toggleRepeat: () => void;
  isBuffering: boolean;
}

export function MobilePlayer({
  isExpanded,
  setIsExpanded,
  currentTrack,
  isAutoplay,
  toggleAutoplay,
  progressPercent,
  currentDisplayTime,
  durationTime,
  setIsDraggingSlider,
  setSliderValue,
  handleSeek,
  isShuffle,
  toggleShuffle,
  playPrevious,
  handleTogglePlay,
  handleSkipNext,
  isPlaying,
  isRepeat,
  toggleRepeat,
  isBuffering,
}: MobilePlayerProps) {
  const [showLyrics, setShowLyrics] = useState(false);
  const { isLiked, toggleLike } = useLikedSongs();
  const [direction, setDirection] = useState(0); // 1 = next, -1 = prev

  if (!isExpanded) return null;

  return (
    <div className='md:hidden fixed inset-0 z-100 bg-black text-white flex flex-col overflow-hidden'>
      {/* Background Essence */}
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
              className='absolute inset-0 blur-[100px] scale-150 saturate-200'
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

      <div className='relative z-10 w-full h-full flex flex-col pt-6 pb-8 px-6 overflow-y-auto custom-scrollbar'>
        {/* Top Header */}
        <div className='flex items-center justify-between mb-8'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => setIsExpanded(false)}
            className='text-white hover:bg-white/10'
          >
            <ChevronDown className='h-8 w-8' />
          </Button>
          <div className='text-xs font-bold uppercase tracking-widest text-white/50'>
            Now Playing
          </div>
          <div className='flex items-center gap-1'>
            <ListenAlongPopover />
            <Button
              variant='ghost'
              size='icon'
              onClick={toggleAutoplay}
              className={cn(
                'transition-colors hover:bg-white/10',
                isAutoplay ? 'text-primary bg-primary/20' : 'text-white/50',
              )}
            >
              <Radio className='h-6 w-6' />
            </Button>
          </div>
        </div>

        {/* Large Artwork */}
        <div className='relative w-full aspect-square mb-8 shrink-0'>
          <AnimatePresence mode='wait' initial={false} custom={direction}>
            <motion.div
              key={currentTrack.id}
              custom={direction}
              initial={{ opacity: 0, scale: 0.9, x: direction > 0 ? 40 : -40 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: direction > 0 ? -40 : 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              drag='x'
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
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
              className='w-full h-full rounded-[3rem] bg-zinc-900 overflow-hidden shadow-2xl border border-white/10 touch-none'
            >
              {currentTrack.artworkUrl ? (
                <Image
                  src={currentTrack.artworkUrl}
                  alt={currentTrack.title}
                  width={400}
                  height={400}
                  className='w-full h-full object-cover shadow-2xl pointer-events-none'
                />
              ) : (
                <div className='w-full h-full flex items-center justify-center'>
                  <div className='h-24 w-24 text-white/20' />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Title & Artist & Like */}
        <div className='flex items-center justify-between gap-4 mb-3 w-full px-2'>
          <AnimatePresence mode='wait' initial={false} custom={direction}>
            <motion.div 
              key={currentTrack.id}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
              transition={{ duration: 0.2 }}
              className='flex flex-col items-start min-w-0 flex-1'
            >
              <h2 className='text-3xl font-black text-white truncate drop-shadow-lg tracking-tight w-full text-left'>
                {currentTrack.title}
              </h2>
              <p className='text-xl text-white/60 truncate mt-1 font-medium w-full text-left'>
                {currentTrack.artist}
              </p>
            </motion.div>
          </AnimatePresence>
          <Button
            variant='ghost'
            size='icon'
            className={cn(
              'h-12 w-12 shrink-0 transition-colors',
              isLiked(currentTrack.id) 
                ? 'text-primary hover:bg-primary/20' 
                : 'text-white/50 hover:bg-white/10'
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(currentTrack);
            }}
          >
            <Heart className={cn('h-7 w-7', isLiked(currentTrack.id) && 'fill-current')} />
          </Button>
        </div>

        {/* Progress Slider */}
        <ProgressBar
          progressPercent={progressPercent}
          currentDisplayTime={currentDisplayTime}
          durationTime={durationTime}
          onPointerDown={() => setIsDraggingSlider(true)}
          onPointerUp={() => setIsDraggingSlider(false)}
          onValueChange={setSliderValue}
          onValueCommit={handleSeek}
          className='w-full flex items-center gap-3 mb-8'
          showLabels={true}
        />

        {/* Main Controls - large */}
        <div className='flex items-center justify-between mb-8 px-2'>
          <Button
            variant='ghost'
            size='icon'
            className={cn(
              'h-12 w-12 transition-colors hover:bg-white/10',
              isShuffle ? 'text-primary bg-primary/20' : 'text-white/50',
            )}
            onClick={toggleShuffle}
          >
            <Shuffle className='h-6 w-6' />
          </Button>

          <Button
            variant='ghost'
            size='icon'
            className='h-14 w-14 text-white hover:bg-white/10'
            onClick={playPrevious}
          >
            <SkipBack className='h-8 w-8 fill-current' />
          </Button>

          <Button
            variant='default'
            size='icon'
            className='h-16 w-16 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform'
            onClick={handleTogglePlay}
            disabled={isBuffering}
          >
            {isBuffering ? (
              <Loader2 className='h-8 w-8 animate-spin' />
            ) : isPlaying ? (
              <Pause className='h-8 w-8 fill-current' />
            ) : (
              <Play className='h-8 w-8 fill-current ml-1' />
            )}
          </Button>

          <Button
            variant='ghost'
            size='icon'
            className='h-14 w-14 text-white hover:bg-white/10'
            onClick={() => handleSkipNext()}
          >
            <SkipForward className='h-8 w-8 fill-current' />
          </Button>

          <Button
            variant='ghost'
            size='icon'
            className={cn(
              'h-12 w-12 transition-colors hover:bg-white/10',
              isRepeat ? 'text-primary bg-primary/20' : 'text-white/50',
            )}
            onClick={toggleRepeat}
          >
            <Repeat className='h-6 w-6' />
          </Button>
        </div>

        {/* Show Lyrics Button */}
        <Button
          variant='ghost'
          onClick={() => setShowLyrics(true)}
          className='w-full h-14 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-3 text-white/90 font-bold transition-all active:scale-95'
        >
          <Mic2 className='h-5 w-5' />
          <span>Show lyrics</span>
        </Button>
      </div>

      {/* Lyrics Modal */}
      <AnimatePresence>
        {showLyrics && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className='absolute inset-0 z-50 bg-black/80 backdrop-blur-3xl flex flex-col'
          >
            <div className='flex items-center justify-between p-6 shrink-0 border-b border-white/10'>
              <h3 className='text-xl font-bold text-white tracking-widest uppercase'>
                Lyrics
              </h3>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setShowLyrics(false)}
                className='text-white hover:bg-white/20 rounded-full'
              >
                <X className='h-6 w-6' />
              </Button>
            </div>
            <div className='flex-1 overflow-hidden'>
              <SyncedLyrics />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle overlay texture */}
      <div className='absolute inset-0 pointer-events-none opacity-[0.03] bg-[url("https://www.transparenttextures.com/patterns/p6.png")] mix-blend-overlay z-0' />
    </div>
  );
}

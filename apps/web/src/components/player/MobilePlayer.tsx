'use client';

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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from './ProgressBar';
import { cn } from '@/lib/utils';
import { Track } from '@/store/usePlayerStore';
import { motion, AnimatePresence } from 'framer-motion';

interface MobilePlayerProps {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  currentTrack: Track;
  isAutoplay: boolean;
  toggleAutoplay: () => void;
  progressPercent: number;
  currentDisplayTime: string;
  durationTime: string;
  isDraggingSlider: boolean;
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
  isDraggingSlider,
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

      <div className='relative z-10 w-full h-full flex flex-col pt-12 pb-8 px-6 overflow-y-auto custom-scrollbar'>
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

        {/* Large Artwork */}
        <div className='w-full aspect-square rounded-[3rem] bg-zinc-900 overflow-hidden shadow-2xl mb-8 border border-white/10 shrink-0'>
          {currentTrack.artworkUrl ? (
            <img
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              className='w-full h-full object-cover shadow-2xl'
            />
          ) : (
            <div className='w-full h-full flex items-center justify-center'>
              <div className='h-24 w-24 text-white/20' />
            </div>
          )}
        </div>

        {/* Title & Artist */}
        <div className='flex flex-col mb-8 min-w-0'>
          <h2 className='text-3xl font-black text-white truncate drop-shadow-lg tracking-tight'>
            {currentTrack.title}
          </h2>
          <p className='text-xl text-white/60 truncate mt-1 font-medium'>
            {currentTrack.artist}
          </p>
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
      </div>

      {/* Subtle overlay texture */}
      <div className='absolute inset-0 pointer-events-none opacity-[0.03] bg-[url("https://www.transparenttextures.com/patterns/p6.png")] mix-blend-overlay z-0' />
    </div>
  );
}

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
    <div className='md:hidden fixed inset-0 z-100 bg-background text-foreground flex flex-col pt-12 pb-8 px-6 overflow-y-auto'>
      {/* Top Header */}
      <div className='flex items-center justify-between mb-8'>
        <Button
          variant='ghost'
          size='icon'
          onClick={() => setIsExpanded(false)}
          className='text-foreground hover:bg-accent'
        >
          <ChevronDown className='h-8 w-8' />
        </Button>
        <div className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
          Now Playing
        </div>
        <Button
          variant='ghost'
          size='icon'
          onClick={toggleAutoplay}
          className={cn(
            'transition-colors hover:bg-accent',
            isAutoplay ? 'text-primary bg-primary/10' : 'text-muted-foreground',
          )}
        >
          <Radio className='h-6 w-6' />
        </Button>
      </div>

      {/* Large Artwork */}
      <div className='w-full aspect-square rounded-2xl bg-muted overflow-hidden shadow-2xl mb-8 border border-border'>
        <img
          src={currentTrack.artworkUrl}
          alt={currentTrack.title}
          className='w-full h-full object-cover'
        />
      </div>

      {/* Title & Artist */}
      <div className='flex flex-col mb-8'>
        <h2 className='text-2xl font-bold text-foreground truncate'>
          {currentTrack.title}
        </h2>
        <p className='text-lg text-muted-foreground truncate mt-1'>
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
        className='w-full flex flex-col gap-2 mb-8'
        showLabels={true}
      />

      {/* Main Controls - large */}
      <div className='flex items-center justify-between mb-8 px-2'>
        <Button
          variant='ghost'
          size='icon'
          className={cn(
            'h-10 w-10 transition-colors',
            isShuffle ? 'text-primary bg-primary/10' : 'text-muted-foreground',
          )}
          onClick={toggleShuffle}
        >
          <Shuffle className='h-6 w-6' />
        </Button>

        <Button
          variant='ghost'
          size='icon'
          className='h-12 w-12 text-foreground'
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
          className='h-12 w-12 text-foreground'
          onClick={() => handleSkipNext()}
        >
          <SkipForward className='h-8 w-8 fill-current' />
        </Button>

        <Button
          variant='ghost'
          size='icon'
          className={cn(
            'h-10 w-10 transition-colors',
            isRepeat ? 'text-primary bg-primary/10' : 'text-muted-foreground',
          )}
          onClick={toggleRepeat}
        >
          <Repeat className='h-6 w-6' />
        </Button>
      </div>
    </div>
  );
}

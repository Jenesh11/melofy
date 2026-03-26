'use client';

import {
  Shuffle,
  Radio,
  SkipBack,
  Pause,
  Play,
  SkipForward,
  Repeat,
  Loader2,
  Mic2,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';
import { ListenAlongPopover } from './ListenAlongPopover';
import { cn } from '@/lib/utils';
import { Track } from '@/store/usePlayerStore';
import Link from 'next/link';
import { useLikedSongs } from '@/hooks/useLikedSongs';

interface DesktopPlayerProps {
  currentTrack: Track;
  isShuffle: boolean;
  toggleShuffle: () => void;
  isAutoplay: boolean;
  toggleAutoplay: () => void;
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
}

export function DesktopPlayer({
  currentTrack,
  isShuffle,
  toggleShuffle,
  isAutoplay,
  toggleAutoplay,
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
  isDraggingSlider,
  setIsDraggingSlider,
  setSliderValue,
  handleSeek,
  volume,
  setVolume,
  handleVolumeWheel,
  onExpand,
}: DesktopPlayerProps) {
  const { isLiked, toggleLike } = useLikedSongs();

  return (
    <div
      className={cn(
        'relative h-14 md:h-20 border-t border-border bg-background md:bg-background/60 backdrop-blur-3xl px-2 md:px-4 flex items-center justify-between w-full mx-auto md:max-w-none rounded-md md:rounded-none mb-16 md:mb-0 shadow-lg md:shadow-none transition-all',
        'cursor-pointer md:cursor-default',
      )}
      onClick={() => {
        if (window.innerWidth < 768) onExpand();
      }}
    >
      {/* Current Track Info */}
      <div className='flex items-center flex-1 md:flex-none md:w-[30%] md:min-w-[180px] gap-2 pl-1 md:pl-0'>
        <Link
          href='/playing'
          className='flex items-center gap-3 cursor-pointer group/info overflow-hidden flex-1 min-w-0'
          onClick={(e) => {
            if (window.innerWidth < 768) {
              e.preventDefault();
              onExpand();
            }
          }}
        >
          <div className='h-10 w-10 md:h-14 md:w-14 rounded-md bg-muted overflow-hidden shrink-0'>
            <img
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              loading='lazy'
              className='h-full w-full object-cover group-hover/info:scale-105 transition-transform duration-300'
            />
          </div>
          <div className='flex flex-col min-w-0'>
            <p className='text-sm font-semibold text-foreground truncate group-hover/info:underline'>
              {currentTrack.title}
            </p>
            <p className='text-xs text-muted-foreground truncate group-hover/info:text-foreground transition-colors'>
              {currentTrack.artist}
            </p>
          </div>
        </Link>
        <Button
          variant='ghost'
          size='icon'
          className={cn(
            'h-9 w-9 shrink-0 transition-colors hidden md:inline-flex',
            isLiked(currentTrack.id) 
              ? 'text-primary hover:text-primary/80' 
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(currentTrack);
          }}
        >
          <Heart className={cn('h-5 w-5', isLiked(currentTrack.id) && 'fill-current')} />
        </Button>
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
            className={cn(
              'hidden md:inline-flex h-8 w-8 transition-colors',
              isAutoplay
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleAutoplay();
            }}
            title='Autoplay similar songs'
          >
            <Radio className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='hidden md:inline-flex h-8 w-8 text-muted-foreground hover:text-foreground'
            onClick={(e) => {
              e.stopPropagation();
              playPrevious();
            }}
          >
            <SkipBack className='h-4 w-4 fill-current' />
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
            onClick={handleSkipNext}
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

        {/* Desktop Progress Bar */}
        <ProgressBar
          progressPercent={progressPercent}
          currentDisplayTime={currentDisplayTime}
          durationTime={durationTime}
          onPointerDown={() => setIsDraggingSlider(true)}
          onPointerUp={() => setIsDraggingSlider(false)}
          onValueChange={setSliderValue}
          onValueCommit={handleSeek}
          className='hidden md:flex w-full items-center gap-2 mt-1 px-8'
          showLabels={true}
        />
      </div>

      {/* Mobile Thin Progress Bar at bottom */}
      <div className='md:hidden absolute bottom-0 left-0 right-0 h-0.5 bg-muted/30'>
        <div
          className='absolute left-0 top-0 bottom-0 bg-primary rounded-r-full transition-all duration-100 ease-linear'
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Secondary Controls (Volume etc.) */}
      <div className='hidden md:flex items-center justify-end w-[30%] min-w-[180px] gap-4'>
        <ListenAlongPopover />
        <Link
          href='/playing'
          className='text-muted-foreground hover:text-foreground transition-colors'
          title='View Lyrics'
        >
          <Mic2 className='h-5 w-5' />
        </Link>
        <VolumeControl
          volume={volume}
          setVolume={setVolume}
          onWheel={handleVolumeWheel}
        />
      </div>
    </div>
  );
}

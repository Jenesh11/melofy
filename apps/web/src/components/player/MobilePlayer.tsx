'use client';

import { useState, useEffect } from 'react';
import {
  ChevronDown,
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
  ListMusic,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import { Button } from '@/components/ui/button';
import { ProgressBar } from './ProgressBar';
import { cn } from '@/lib/utils';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { SyncedLyrics } from '@/components/ui/SyncedLyrics';
import { ListenAlongDrawer } from './ListenAlongDrawer';
import { Drawer } from 'vaul';

interface MobilePlayerProps {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  currentTrack: Track;
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
  const [showQueue, setShowQueue] = useState(false);
  const { isLiked, toggleLike } = useLikedSongs();
  const [direction, setDirection] = useState(0); // 1 = next, -1 = prev
  
  const queue = usePlayerStore((state) => state.queue);
  const playFromQueue = usePlayerStore((state) => state.playFromQueue);
  const setQueue = usePlayerStore((state) => state.setQueue);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const updatedQueue = [...queue];
    const [draggedItem] = updatedQueue.splice(draggedIndex, 1);
    updatedQueue.splice(dropIndex, 0, draggedItem);
    
    setQueue(updatedQueue);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  useEffect(() => {
    const handleHardwareBack = (e: Event) => {
      if (showQueue) {
        e.preventDefault();
        setShowQueue(false);
      } else if (showLyrics) {
        e.preventDefault();
        setShowLyrics(false);
      } else if (isExpanded) {
        e.preventDefault();
        setIsExpanded(false);
      }
    };

    window.addEventListener('hardwareBack', handleHardwareBack);
    return () => {
      window.removeEventListener('hardwareBack', handleHardwareBack);
    };
  }, [isExpanded, showQueue, showLyrics, setIsExpanded]);

  if (!isExpanded) return null;

  return (
    <Drawer.Root 
      open={isExpanded} 
      onOpenChange={(open) => !open && setIsExpanded(false)}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
        <Drawer.Content className="md:hidden fixed bottom-0 left-0 right-0 top-12 z-[101] bg-zinc-950 border-t border-white/10 rounded-t-[2rem] text-white flex flex-col overflow-hidden outline-none">
          <Drawer.Title className="sr-only">Now Playing</Drawer.Title>
          <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-white/20 mt-4 mb-2 z-[110]" />
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
        <div className='flex items-center justify-between mb-4 shrink-0'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => setIsExpanded(false)}
            className='text-white hover:bg-white/10'
          >
            <ChevronDown className='h-8 w-8' />
          </Button>
          <div className='text-xs font-semibold text-white/50'>
            Now Playing
          </div>
          <div className='flex items-center gap-1'>
            <ListenAlongDrawer />
          </div>
        </div>

        {/* Main Content wrapper for centering */}
        <div className='flex-1 flex flex-col justify-center min-h-min py-4'>

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
                  unoptimized
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
              <p className='text-xl text-white/60 truncate mt-1 font-medium font-outfit w-full text-left'>
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
            onClick={() => {
              setDirection(-1);
              playPrevious();
            }}
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
            onClick={() => {
              setDirection(1);
              handleSkipNext();
            }}
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

        {/* Action Buttons */}
        <div className='flex items-center gap-4 w-full shrink-0'>
          <Button
            variant='ghost'
            onClick={() => setShowLyrics(true)}
            className='flex-1 h-14 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-white/90 font-bold transition-all active:scale-95'
          >
            <Mic2 className='h-5 w-5' />
            <span>Lyrics</span>
          </Button>
          <Button
            variant='ghost'
            onClick={() => setShowQueue(true)}
            className='flex-1 h-14 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-white/90 font-bold transition-all active:scale-95'
          >
            <ListMusic className='h-5 w-5' />
            <span>Queue</span>
          </Button>
        </div>
        </div>
      </div>

      {/* Lyrics Drawer */}
      <Drawer.NestedRoot 
        open={showLyrics} 
        onOpenChange={setShowLyrics}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-110" />
          <Drawer.Content className='fixed inset-0 z-120 bg-black/80 backdrop-blur-3xl flex flex-col outline-none'>
            <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-white/20 mt-4 mb-2" />
            <div className='flex items-center justify-between p-6 shrink-0 border-b border-white/10'>
              <Drawer.Title className='text-xl font-bold text-white tracking-widest uppercase m-0'>
                Lyrics
              </Drawer.Title>
              <Drawer.Close asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='text-white hover:bg-white/20 rounded-full'
                >
                  <X className='h-6 w-6' />
                </Button>
              </Drawer.Close>
            </div>
            <div className='flex-1 overflow-hidden'>
              <SyncedLyrics />
            </div>
            <div className='p-6 pb-8 shrink-0'>
              <Drawer.Close asChild>
                <Button
                  variant='ghost'
                  className='w-full h-14 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-3 text-white/90 font-bold transition-all active:scale-95 shrink-0'
                >
                  <X className='h-5 w-5' />
                  <span>Close lyrics</span>
                </Button>
              </Drawer.Close>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.NestedRoot>

      {/* Queue Drawer */}
      <Drawer.NestedRoot 
        open={showQueue} 
        onOpenChange={setShowQueue}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-110" />
          <Drawer.Content className='fixed inset-0 z-120 bg-black/80 backdrop-blur-3xl flex flex-col outline-none'>
            <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-white/20 mt-4 mb-2" />
            <div className='flex items-center justify-between p-6 shrink-0 border-b border-white/10'>
              <Drawer.Title className='text-xl font-bold text-white tracking-widest uppercase flex items-center gap-2 m-0'>
                <ListMusic className='h-5 w-5' /> Queue ({queue.length})
              </Drawer.Title>
              <Drawer.Close asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='text-white hover:bg-white/20 rounded-full'
                >
                  <X className='h-6 w-6' />
                </Button>
              </Drawer.Close>
            </div>
            
            <div className='flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2'>
              {queue.length === 0 ? (
                <div className='h-full flex flex-col items-center justify-center text-white/50 p-4 text-center'>
                  <ListMusic className='h-12 w-12 mb-4 opacity-20' />
                  <p className='text-lg font-bold'>Your queue is empty.</p>
                  <p className='text-sm opacity-70 mt-2'>Add some tracks to keep the music going!</p>
                </div>
              ) : (
                queue.map((track, i) => (
                  <div
                    key={`${track.id}-${i}`}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    onDrop={() => handleDrop(i)}
                    onClick={() => {
                      playFromQueue(i);
                      setShowQueue(false);
                    }}
                    className={`flex items-center gap-2.5 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group cursor-pointer border-t-2 relative ${
                      dragOverIndex === i && draggedIndex !== i ? 'border-primary' : 'border-transparent'
                    } ${draggedIndex === i ? 'opacity-40' : ''}`}
                  >
                    <div className='flex items-center shrink-0 opacity-40 hover:opacity-100 transition-opacity duration-150 cursor-grab active:cursor-grabbing text-white mr-0.5'>
                      <GripVertical className='h-4 w-4' />
                    </div>
                    <div className='h-12 w-12 shrink-0 rounded-lg overflow-hidden relative bg-white/10 flex items-center justify-center'>
                      {track.artworkUrl ? (
                        <Image
                          src={track.artworkUrl}
                          alt={track.title}
                          fill
                          sizes="48px"
                          className='object-cover'
                        />
                      ) : (
                        <Play className='h-5 w-5 text-white/50' />
                      )}
                      <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                        <Play className='h-5 w-5 text-white fill-white' />
                      </div>
                    </div>
                    <div className='flex-1 min-w-0 flex flex-col justify-center pr-2'>
                      <p className='text-base font-bold text-white truncate group-hover:text-primary transition-colors'>
                        {track.title}
                      </p>
                      <p className='text-sm text-white/60 truncate font-outfit'>
                        {track.artist}
                      </p>
                    </div>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-10 w-10 text-white/50 hover:text-red-400 hover:bg-red-400/10 transition-colors'
                      onClick={(e) => {
                        e.stopPropagation();
                        const newQueue = [...queue];
                        newQueue.splice(i, 1);
                        setQueue(newQueue);
                      }}
                    >
                      <Trash2 className='h-5 w-5' />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {queue.length > 0 && (
              <div className='p-6 pb-8 shrink-0'>
                <Button
                  variant='ghost'
                  onClick={() => setQueue([])}
                  className='w-full h-14 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all active:scale-95 shrink-0'
                >
                  <Trash2 className='h-5 w-5' />
                  <span>Clear Queue</span>
                </Button>
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.NestedRoot>

      {/* Subtle overlay texture */}
      <div className='absolute inset-0 pointer-events-none opacity-[0.03] bg-[url("https://www.transparenttextures.com/patterns/p6.png")] mix-blend-overlay z-0' />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ListMusic, Play, Trash2, GripVertical, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SyncedLyrics } from '@/components/ui/SyncedLyrics';
import { useLyricsPanelStore } from '@/store/useLyricsPanelStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function LyricsPanel() {
  const { isOpen, close, activeTab, setActiveTab } = useLyricsPanelStore();
  const queue = usePlayerStore((state) => state.queue);
  const playFromQueue = usePlayerStore((state) => state.playFromQueue);
  const setQueue = usePlayerStore((state) => state.setQueue);

  const [width, setWidth] = useState(360);
  const [isResizing, setIsResizing] = useState(false);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const maxWidth = Math.min(600, window.innerWidth * 0.6);
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 280 && newWidth <= maxWidth) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handlePlayFromQueue = (index: number) => {
    playFromQueue(index);
  };

  const removeFromQueue = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newQueue = [...queue];
    newQueue.splice(index, 1);
    setQueue(newQueue);
  };

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          key='lyrics-panel'
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: width, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{
            duration: isResizing ? 0 : 0.35,
            ease: [0.22, 1, 0.36, 1]
          }}
          className='hidden md:flex shrink-0 flex-col h-full overflow-hidden border-l border-border bg-background/80 backdrop-blur-2xl relative z-10'
          style={{ minWidth: 280, maxWidth: 600 }}
        >
          {/* Resize Handle */}
          <div
            onMouseDown={startResizing}
            className={cn(
              'absolute left-0 top-0 w-1.5 h-full cursor-col-resize z-50 transition-colors',
              isResizing ? 'bg-primary/80' : 'hover:bg-primary/30'
            )}
          />

          {/* Header */}
          <div className='flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50 shrink-0 pl-7'>
            <div className='flex items-center gap-6'>
              <button
                onClick={() => setActiveTab('lyrics')}
                className={cn(
                  'text-xs font-bold uppercase tracking-wider transition-all duration-200 relative pb-1.5 cursor-pointer',
                  activeTab === 'lyrics'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Lyrics
                {activeTab === 'lyrics' && (
                  <motion.div
                    layoutId='panel-active-tab'
                    className='absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full'
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('queue')}
                className={cn(
                  'text-xs font-bold uppercase tracking-wider transition-all duration-200 relative pb-1.5 cursor-pointer',
                  activeTab === 'queue'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Queue
                {activeTab === 'queue' && (
                  <motion.div
                    layoutId='panel-active-tab'
                    className='absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full'
                  />
                )}
              </button>
            </div>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/10'
              onClick={close}
              title={activeTab === 'lyrics' ? 'Close lyrics' : 'Close queue'}
            >
              <X className='h-4 w-4' />
            </Button>
          </div>

          {/* Panel content */}
          <div className='flex-1 min-h-0 overflow-hidden relative pl-2'>
            {activeTab === 'lyrics' ? (
              <div className='h-full w-full relative pl-2'>
                <SyncedLyrics compact />
              </div>
            ) : (
              <div className='flex flex-col h-full pl-3 pr-2 py-4'>
                <div className='flex items-center justify-between mb-4 pr-2 shrink-0'>
                  <span className='text-xs font-bold text-muted-foreground uppercase tracking-wider'>Up Next</span>
                  <span className='text-xs text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full font-medium'>{queue.length} items</span>
                </div>

                <div className='flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1 pb-4'>
                  {queue.length === 0 ? (
                    <div className='h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center'>
                      <ListMusic className='h-12 w-12 mb-3 opacity-20 text-primary' />
                      <p className='text-sm font-semibold'>Your queue is empty.</p>
                      <p className='text-xs opacity-70 mt-1 max-w-[200px] leading-relaxed'>Add some tracks to keep the music playing!</p>
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
                        onClick={() => handlePlayFromQueue(i)}
                        className={cn(
                          'flex items-center gap-3 p-2 hover:bg-muted/50 rounded-xl transition-colors group cursor-pointer border-t-2 relative',
                          dragOverIndex === i && draggedIndex !== i ? 'border-primary' : 'border-transparent',
                          draggedIndex === i ? 'opacity-40' : ''
                        )}
                      >
                        <div className='flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-grab active:cursor-grabbing text-muted-foreground/60 mr-0.5'>
                          <GripVertical className='h-4 w-4' />
                        </div>
                        <div className='h-11 w-11 shrink-0 rounded-lg overflow-hidden relative bg-muted flex items-center justify-center shadow-md'>
                          {track.artworkUrl ? (
                            <Image
                              src={track.artworkUrl}
                              alt={track.title}
                              fill
                              sizes="44px"
                              className='object-cover'
                            />
                          ) : (
                            <Music2 className='h-5 w-5 text-muted-foreground/50' />
                          )}
                          <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                            <Play className='h-5 w-5 text-white fill-white' />
                          </div>
                        </div>
                        <div className='flex-1 min-w-0 flex flex-col justify-center pr-2'>
                          <p className='text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors'>
                            {track.title}
                          </p>
                          <p className='text-xs text-muted-foreground truncate font-outfit mt-0.5'>
                            {track.artist}
                          </p>
                        </div>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full shrink-0'
                          onClick={(e) => removeFromQueue(i, e)}
                          title='Remove from queue'
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                {queue.length > 0 && (
                  <div className='pt-3 border-t border-border/50 shrink-0 pr-1'>
                    <Button
                      variant='ghost'
                      className='w-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl py-2 h-auto font-bold'
                      onClick={() => setQueue([])}
                    >
                      Clear Queue
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

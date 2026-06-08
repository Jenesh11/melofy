'use client';

import { useState } from 'react';
import { ListMusic, Play, Trash2, GripVertical } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { usePlayerStore } from '@/store/usePlayerStore';
import Image from 'next/image';

export function QueuePopover() {
  const [isOpen, setIsOpen] = useState(false);
  const queue = usePlayerStore((state) => state.queue);
  const playFromQueue = usePlayerStore((state) => state.playFromQueue);
  const setQueue = usePlayerStore((state) => state.setQueue);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger render={
        <Button
          variant='ghost'
          size='icon'
          className={`transition-colors ${isOpen || queue.length > 0 ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
          title='View Queue'
        >
          <ListMusic className='h-5 w-5' />
        </Button>
      } />
      <PopoverContent className='w-80 border-border/50 bg-background/95 backdrop-blur-xl p-0' align='end' sideOffset={20}>
        <div className='flex flex-col h-[400px]'>
          <div className='p-4 border-b border-border flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <ListMusic className='h-4 w-4 text-primary' />
              <span className='font-semibold text-sm'>Up Next</span>
            </div>
            <span className='text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full'>{queue.length} items</span>
          </div>

          <div className='flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1'>
            {queue.length === 0 ? (
              <div className='h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center'>
                <ListMusic className='h-8 w-8 mb-2 opacity-20' />
                <p className='text-sm'>Your queue is empty.</p>
                <p className='text-xs opacity-70 mt-1'>Add some tracks to keep the music going!</p>
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
                  className={`flex items-center gap-2.5 p-2 hover:bg-muted/50 rounded-md transition-colors group cursor-pointer border-t-2 relative ${
                    dragOverIndex === i && draggedIndex !== i ? 'border-primary' : 'border-transparent'
                  } ${draggedIndex === i ? 'opacity-40' : ''}`}
                >
                  <div className='flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-grab active:cursor-grabbing text-muted-foreground mr-0.5'>
                    <GripVertical className='h-3.5 w-3.5' />
                  </div>
                  <div className='h-10 w-10 shrink-0 rounded-md overflow-hidden relative bg-muted flex items-center justify-center'>
                    {track.artworkUrl ? (
                      <Image
                        src={track.artworkUrl}
                        alt={track.title}
                        fill
                        sizes="40px"
                        className='object-cover'
                      />
                    ) : (
                      <Play className='h-4 w-4 text-muted-foreground' />
                    )}
                    <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                      <Play className='h-4 w-4 text-white fill-white' />
                    </div>
                  </div>
                  <div className='flex-1 min-w-0 flex flex-col justify-center pr-2'>
                    <p className='text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors'>
                      {track.title}
                    </p>
                    <p className='text-xs text-muted-foreground truncate'>
                      {track.artist}
                    </p>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive'
                    onClick={(e) => removeFromQueue(i, e)}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              ))
            )}
          </div>
          {queue.length > 0 && (
             <div className="p-2 border-t border-border">
                <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => setQueue([])}>Clear Queue</Button>
             </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

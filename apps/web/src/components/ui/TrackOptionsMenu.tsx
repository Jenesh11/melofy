'use client';
import { useState } from 'react';

import { MoreHorizontal, Heart, ListPlus, HeartOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import { Track as PlayerTrack } from '@/store/usePlayerStore';

export function TrackOptionsMenu({
  track,
  onAddToQueue,
}: {
  track: PlayerTrack;
  onAddToQueue: () => void;
}) {
  const { isLiked, toggleLike } = useLikedSongs();
  const liked = isLiked(track.id);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <Button
          size='icon'
          variant='ghost'
          className='h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 flex items-center justify-center'
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <MoreHorizontal className='h-4 w-4' />
        </Button>
      } />
      <PopoverContent side="bottom" align="end" className="w-56 p-1.5 flex flex-col gap-1 bg-card/95 backdrop-blur-xl border-border rounded-2xl shadow-2xl z-150">
        <button
          className='w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-xl transition-colors'
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setOpen(false);
            onAddToQueue();
          }}
        >
          <ListPlus className='h-4 w-4 text-muted-foreground' />
          Add to queue
        </button>
        <button
          className='w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-xl transition-colors'
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setOpen(false);
            toggleLike(track);
          }}
        >
          {liked ? <HeartOff className='h-4 w-4 text-primary' /> : <Heart className='h-4 w-4 text-muted-foreground' />}
          {liked ? 'Remove from liked' : 'Save to liked'}
        </button>
      </PopoverContent>
    </Popover>
  );
}

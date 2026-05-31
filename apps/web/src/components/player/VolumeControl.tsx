'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface VolumeControlProps {
  volume: number;
  setVolume: (volume: number) => void;
  onWheel: (e: React.WheelEvent) => void;
}

export function VolumeControl({
  volume,
  setVolume,
  onWheel,
}: VolumeControlProps) {
  return (
    <div className="no-nav" onWheel={onWheel}>
      {/* 1. COMPACT VERTICAL POPOVER VIEW (Visible on 768px to 1023px screens) */}
      <div className='relative flex lg:hidden items-center group/volume-vertical py-2'>
        {/* Vertical Slider Dropdown Popover (No 'mb' margin to ensure solid overlap for mouse traversal) */}
        <div className='absolute bottom-full left-1/2 -translate-x-1/2 pb-3.5 opacity-0 pointer-events-none group-hover/volume-vertical:opacity-100 group-hover/volume-vertical:pointer-events-auto transition-all duration-300 transform translate-y-2 group-hover/volume-vertical:translate-y-0 z-50'>
          <div className='bg-zinc-950/95 border border-white/10 backdrop-blur-md rounded-2xl p-3 shadow-2xl flex flex-col items-center gap-2.5 w-11 h-36'>
            <span className='text-[10px] font-bold text-white/90 shrink-0 select-none'>
              {Math.round(volume * 100)}%
            </span>
            <Slider
              orientation='vertical'
              value={[volume * 100]}
              max={100}
              step={1}
              onValueChange={(value) => setVolume(value[0] / 100)}
              className='h-20'
            />
          </div>
        </div>

        {/* Volume Icon Button */}
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 text-zinc-400 hover:text-white select-none'
          onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
          title={volume === 0 ? 'Unmute' : 'Mute'}
        >
          {volume === 0 ? (
            <VolumeX className='h-5 w-5' />
          ) : (
            <Volume2 className='h-5 w-5' />
          )}
        </Button>
      </div>

      {/* 2. STANDARD HORIZONTAL VIEW (Visible on >=1024px screens) */}
      <div className='hidden lg:flex items-center gap-2 group/volume-horizontal'>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 text-zinc-400 hover:text-white select-none'
          onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
          title={volume === 0 ? 'Unmute' : 'Mute'}
        >
          {volume === 0 ? (
            <VolumeX className='h-5 w-5' />
          ) : (
            <Volume2 className='h-5 w-5' />
          )}
        </Button>
        <div className="relative flex items-center">
          {/* Volume Tooltip centered over horizontal slider */}
          <div className='absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-900/95 text-white text-[10px] font-bold rounded-md opacity-0 group-hover/volume-horizontal:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-2xl border border-white/10 backdrop-blur-md translate-y-2 group-hover/volume-horizontal:translate-y-0 z-50'>
            {Math.round(volume * 100)}%
          </div>
          <Slider
            value={[volume * 100]}
            max={100}
            step={1}
            onValueChange={(value) => setVolume(value[0] / 100)}
            className='w-24'
          />
        </div>
      </div>
    </div>
  );
}

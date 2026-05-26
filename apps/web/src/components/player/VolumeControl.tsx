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
    <div className='flex items-center gap-2 group/volume' onWheel={onWheel}>
      <Button
        variant='ghost'
        size='icon'
        className='h-8 w-8 text-zinc-400 hover:text-white'
        onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
      >
        {volume === 0 ? (
          <VolumeX className='h-5 w-5' />
        ) : (
          <Volume2 className='h-5 w-5' />
        )}
      </Button>
      <div className="relative flex items-center">
        {/* Volume Tooltip centered over slider */}
        <div className='absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-900/95 text-white text-[10px] font-bold rounded-md opacity-0 group-hover/volume:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-2xl border border-white/10 backdrop-blur-md translate-y-2 group-hover/volume:translate-y-0 z-50'>
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
  );
}

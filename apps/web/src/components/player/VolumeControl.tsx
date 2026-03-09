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
    <div
      className='hidden md:flex items-center justify-end w-[30%] min-w-[180px] gap-2 group/volume'
      onWheel={onWheel}
    >
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
      <Slider
        value={[volume * 100]}
        max={100}
        step={1}
        onValueChange={(value) => setVolume(value[0] / 100)}
        className='w-24'
      />
    </div>
  );
}

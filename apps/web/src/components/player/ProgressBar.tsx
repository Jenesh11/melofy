'use client';

import { Slider } from '@/components/ui/slider';

interface ProgressBarProps {
  progressPercent: number;
  currentDisplayTime: string;
  durationTime: string;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onValueChange: (value: number) => void;
  onValueCommit: (value: number[]) => void;
  className?: string;
  showLabels?: boolean;
}

export function ProgressBar({
  progressPercent,
  currentDisplayTime,
  durationTime,
  onPointerDown,
  onPointerUp,
  onValueChange,
  onValueCommit,
  className,
  showLabels = true,
}: ProgressBarProps) {
  return (
    <div className={className}>
      {showLabels && (
        <span className='w-10 text-right text-xs text-zinc-400'>
          {currentDisplayTime}
        </span>
      )}
      <Slider
        value={[progressPercent]}
        max={100}
        step={0.1}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onValueChange={(val) => onValueChange(val[0])}
        onValueCommit={onValueCommit}
        className='flex-1 group-slider'
      />
      {showLabels && (
        <span className='w-10 text-xs text-zinc-400'>{durationTime}</span>
      )}
    </div>
  );
}

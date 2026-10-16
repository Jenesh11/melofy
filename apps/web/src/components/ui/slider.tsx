'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { cn } from '@/lib/utils';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, orientation = 'horizontal', ...props }, ref) => {
  const isVertical = orientation === 'vertical';
  return (
    <SliderPrimitive.Root
      ref={ref}
      orientation={orientation}
      className={cn(
        'relative flex touch-none select-none group',
        // Generous hit area around a thin track.
        isVertical ? 'flex-col h-full w-4 items-center justify-center' : 'w-full items-center py-2 cursor-pointer',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className={cn(
        'relative rounded-full bg-foreground/15 transition-colors',
        isVertical ? 'h-full w-1.5 grow' : 'h-1 w-full grow overflow-hidden'
      )}>
        <SliderPrimitive.Range className={cn(
          'absolute rounded-full bg-foreground transition-colors group-hover:bg-primary',
          isVertical ? 'w-full bottom-0' : 'h-full'
        )} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className='block h-3 w-3 rounded-full bg-foreground shadow-[0_2px_8px_rgb(0_0_0/0.5)] transition-[opacity,transform] duration-200 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50 hover:scale-125 cursor-grab active:cursor-grabbing' />
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };

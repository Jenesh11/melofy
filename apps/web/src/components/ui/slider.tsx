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
        isVertical ? 'flex-col h-full w-4 items-center justify-center' : 'w-full items-center',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className={cn(
        'relative rounded-full bg-muted/50 transition-colors',
        isVertical ? 'h-full w-1.5 grow' : 'h-1.5 w-full grow overflow-hidden'
      )}>
        <SliderPrimitive.Range className={cn(
          'absolute bg-primary',
          isVertical ? 'w-full bottom-0' : 'h-full'
        )} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className='hidden group-hover:block h-3.5 w-3.5 rounded-full border border-primary/20 bg-foreground shadow-2xl transition-[opacity,transform] focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:scale-125 opacity-0 group-hover:opacity-100 ease-in-out duration-300 cursor-grab active:cursor-grabbing' />
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };

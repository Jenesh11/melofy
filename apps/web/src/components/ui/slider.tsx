'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { cn } from '@/lib/utils';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center group',
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track className='relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted/50 transition-colors'>
      <SliderPrimitive.Range className='absolute h-full bg-primary group-hover:bg-primary' />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className='hidden group-hover:block h-3.5 w-3.5 rounded-full border border-primary/20 bg-foreground shadow-2xl transition-[opacity,transform] focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:scale-125 opacity-0 group-hover:opacity-100 ease-in-out duration-300 cursor-grab active:cursor-grabbing' />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };

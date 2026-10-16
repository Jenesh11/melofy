'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShelfProps {
  title: string;
  subtitle?: string;
  /** Optional link for the title and "Show all". */
  href?: string;
  /** Extra header actions (e.g. Play all). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * A titled, horizontally scrolling row. Arrow buttons appear only when there
 * is more to see in that direction; touch and trackpads scroll natively.
 */
export function Shelf({ title, subtitle, href, actions, children, className }: ShelfProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    updateEdges();
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateEdges, children]);

  const scrollBy = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const heading = <h2 className='truncate text-[1.375rem] md:text-2xl font-bold text-foreground'>{title}</h2>;

  return (
    <section className={cn('group/shelf flex flex-col gap-3', className)}>
      <div className='flex items-end justify-between gap-4'>
        <div className='min-w-0'>
          {href ? <Link href={href} className='hover:underline decoration-2 underline-offset-4'>{heading}</Link> : heading}
          {subtitle && <p className='mt-0.5 truncate text-sm text-muted-foreground'>{subtitle}</p>}
        </div>
        <div className='flex shrink-0 items-center gap-1'>
          {actions}
          {href && (
            <Link href={href} className='rounded-full px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground'>
              Show all
            </Link>
          )}
          <div className='hidden md:flex items-center gap-1 opacity-0 transition-opacity group-hover/shelf:opacity-100 focus-within:opacity-100'>
            <button type='button' aria-label={`Scroll ${title} left`} disabled={edges.start} onClick={() => scrollBy(-1)}
              className='flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.07] text-foreground transition-colors hover:bg-foreground/[0.12] disabled:opacity-30 disabled:hover:bg-foreground/[0.07]'>
              <ChevronLeft className='h-4 w-4' />
            </button>
            <button type='button' aria-label={`Scroll ${title} right`} disabled={edges.end} onClick={() => scrollBy(1)}
              className='flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.07] text-foreground transition-colors hover:bg-foreground/[0.12] disabled:opacity-30 disabled:hover:bg-foreground/[0.07]'>
              <ChevronRight className='h-4 w-4' />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={scrollerRef}
        onScroll={updateEdges}
        className='-mx-4 md:-mx-2 flex snap-x snap-mandatory scroll-px-4 md:scroll-px-2 gap-1 md:gap-2 overflow-x-auto px-4 md:px-2 pb-1 scrollbar-none'
      >
        {children}
      </div>
    </section>
  );
}

/** Shared width for every card in a shelf so rows line up across the page. */
export const SHELF_CARD_WIDTH = 'w-[42vw] max-w-[176px] min-w-[136px] sm:w-[164px] md:w-[184px] md:max-w-none';

'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function LandingPageHeader({ backLabel = 'Back to Home', backHref = '/' }: { backLabel?: string; backHref?: string }) {
  return (
    <>
      <header className='fixed top-0 left-0 right-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl'>
        <div className='max-w-6xl mx-auto px-6 py-4 flex items-center justify-between'>
          <Link href='/' className='flex items-center gap-2 group'>
            <div className='w-8 h-8 flex items-center justify-center overflow-hidden'>
              <img src='/logo.png' alt='Melofy' className='w-full h-full object-contain' />
            </div>
            <span className='text-xl font-black text-foreground tracking-tighter'>Melofy.</span>
          </Link>

          <Link
            href={backHref}
            className='flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all duration-300 bg-foreground/5 hover:bg-foreground/10 border border-border/50 hover:border-border px-4 py-2 rounded-full group'
          >
            <ArrowLeft className='w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-300' />
            {backLabel}
          </Link>
        </div>
      </header>
      {/* Spacer to offset fixed header height */}
      <div className='h-[65px] shrink-0' aria-hidden='true' />
    </>
  );
}

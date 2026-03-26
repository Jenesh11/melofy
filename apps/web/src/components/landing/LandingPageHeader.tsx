import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function LandingPageHeader({ backLabel = 'Back to Home', backHref = '/' }: { backLabel?: string; backHref?: string }) {
  return (
    <header className='w-full py-6 px-6 md:px-16 flex items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50'>
      <Link href='/' className='flex items-center gap-2 group'>
        <div className='w-8 h-8 flex items-center justify-center overflow-hidden'>
          <img src='/logo.png' alt='Melofy' className='w-full h-full object-contain' />
        </div>
        <span className='text-xl font-black text-foreground tracking-tighter'>Melofy.</span>
      </Link>
      <Link
        href={backHref}
        className='flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group'
      >
        <ArrowLeft className='w-4 h-4 group-hover:-translate-x-1 transition-transform' />
        {backLabel}
      </Link>
    </header>
  );
}

'use client';

import { Search, User } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/firebase/auth-context';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  // If we are on the search page, we might not want to show the global search
  // or we just let it take them to the search page.
  const handleSearchClick = () => {
    if (pathname !== '/search') {
      router.push('/search');
    }
  };

  return (
    <div className='h-16 flex items-center justify-between px-6 bg-background/60 backdrop-blur-3xl border-b border-border transition-all duration-300'>
      <div className='flex items-center gap-4 flex-1'>
        {/* Mobile Logo */}
        <Link
          href='/'
          className='flex md:hidden items-center gap-2 hover:opacity-80 transition-opacity'
        >
          <div className='h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 relative'>
            <Image
              src='/logo.png'
              alt='Melofy Logo'
              width={32}
              height={32}
              className='h-full w-full object-contain'
            />
          </div>
          <span className='text-lg font-bold tracking-tight text-foreground'>
            Melofy
          </span>
        </Link>

        {/* Search Bar */}
        {pathname !== '/search' && (
          <div
            className='relative max-w-[350px] w-full hidden md:block group cursor-pointer'
            onClick={handleSearchClick}
          >
            <div className='absolute inset-y-0 left-3 flex items-center pointer-events-none'>
              <Search className='h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors' />
            </div>
            <div className='h-12 w-full bg-muted/80 hover:bg-muted border border-border/50 hover:border-border transition-colors rounded-full flex items-center pl-10 text-sm font-medium text-muted-foreground group-hover:text-foreground'>
              What do you want to play?
            </div>
          </div>
        )}
      </div>

      <div className='flex items-center gap-4'>
        <Link href='/settings'>
          <Button
            variant='ghost'
            className='h-10 rounded-full px-3 py-2 bg-card/40 hover:bg-card hover:scale-105 transition-all text-foreground font-medium border border-border/50 hover:border-border flex items-center gap-2'
          >
            <span className='hidden sm:block text-sm mr-1 truncate max-w-[120px]'>
              {user?.displayName || 'Settings'}
            </span>
            <div className='h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 relative'>
              {user?.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt='Profile'
                  width={28}
                  height={28}
                  referrerPolicy='no-referrer'
                  className='h-full w-full rounded-full object-cover'
                />
              ) : (
                <User className='h-4 w-4 text-muted-foreground' />
              )}
            </div>
          </Button>
        </Link>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNavigation() {
  const pathname = usePathname();

  const routes = [
    { label: 'Home', icon: Home, href: '/', active: pathname === '/' },
    {
      label: 'Search',
      icon: Search,
      href: '/search',
      active: pathname === '/search',
    },
    {
      label: 'Library',
      icon: Library,
      href: '/library',
      active: pathname === '/library',
    },
  ];

  return (
    <nav
      aria-label='Main'
      className='md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 items-stretch justify-around border-t border-border bg-background/85 px-2 backdrop-blur-xl'
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          aria-current={route.active ? 'page' : undefined}
          className={cn(
            'relative flex w-full flex-col items-center justify-center gap-1 transition-colors',
            route.active ? 'text-foreground' : 'text-muted-foreground active:text-foreground',
          )}
        >
          {route.active && <span className='absolute top-0 h-[3px] w-8 rounded-b-full bg-primary' />}
          <route.icon className='h-[22px] w-[22px]' strokeWidth={route.active ? 2.4 : 1.9} />
          <span className={cn('text-[10.5px] tracking-wide', route.active ? 'font-bold' : 'font-medium')}>
            {route.label}
          </span>
        </Link>
      ))}
    </nav>
  );
}

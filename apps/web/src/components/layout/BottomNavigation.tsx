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
    <div className='md:hidden fixed bottom-0 left-0 right-0 h-16 bg-black/95 backdrop-blur-3xl border-t border-white/5 z-50 flex items-center justify-around px-2 pb-2 pt-1'>
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            'flex flex-col items-center justify-center gap-1 w-full h-full transition-colors',
            route.active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300',
          )}
        >
          <route.icon className={cn('h-6 w-6', route.active && 'text-white')} />
          <span className='text-[10px] font-medium tracking-wide'>
            {route.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

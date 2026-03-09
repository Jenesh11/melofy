'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Home,
  Search,
  Library,
  Music2,
  PlusCircle,
  Heart,
  ListMusic,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/firebase/auth-context';
import { Playlist } from '@/lib/firebase/playlists';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    if (!user) {
      setPlaylists([]);
      return;
    }

    const q = query(
      collection(db, 'playlists'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedPlaylists = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as Playlist,
        );
        setPlaylists(fetchedPlaylists);
      },
      (error) => {
        console.error('Error listening to playlists:', error);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const routes = [
    { label: 'Home', icon: Home, href: '/', active: pathname === '/' },
    {
      label: 'Search',
      icon: Search,
      href: '/search',
      active: pathname === '/search',
    },
    {
      label: 'Your Library',
      icon: Library,
      href: '/library',
      active: pathname === '/library',
    },
  ];

  return (
    <div className='flex h-full flex-col bg-sidebar/40 backdrop-blur-xl border-r border-sidebar-border w-64 p-4 text-sidebar-foreground overflow-hidden'>
      <div className='flex items-center gap-2 px-2 pb-8 pt-2'>
        <div className='h-8 w-8 overflow-hidden flex items-center justify-center shrink-0'>
          <img
            src='/logo.png'
            alt='Melofy Logo'
            className='h-full w-full object-contain'
          />
        </div>
        <h1 className='text-xl font-bold tracking-tight'>Melofy</h1>
      </div>

      <div className='flex flex-col gap-1'>
        {routes.map((route) => (
          <Link key={route.href} href={route.href}>
            <div
              className={cn(
                'flex items-center gap-4 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                route.active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
              )}
            >
              <route.icon className='h-5 w-5' />
              {route.label}
            </div>
          </Link>
        ))}
      </div>

      <div className='mt-8 flex flex-col gap-1 flex-1 overflow-hidden'>
        <p className='px-3 text-xs font-semibold tracking-wider text-sidebar-foreground/40 mb-2 uppercase'>
          Playlists
        </p>
        <div className='flex flex-col gap-1 overflow-y-auto pr-2 custom-scrollbar sidebar-scrollbar'>
          <div className='mt-2 flex flex-col gap-0.5'>
            {playlists.map((playlist) => (
              <Link key={playlist.id} href={`/playlist/${playlist.id}`}>
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors group cursor-pointer',
                    pathname === `/playlist/${playlist.id}`
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
                  )}
                >
                  <div className='flex items-center justify-center w-8 h-8 rounded-md bg-sidebar-accent/20 border border-sidebar-border overflow-hidden shrink-0 shadow-sm'>
                    {playlist.artworkUrl || playlist.coverUrl ? (
                      <img
                        src={playlist.artworkUrl || playlist.coverUrl}
                        alt={playlist.name}
                        className='h-full w-full object-cover group-hover:scale-110 transition-transform duration-300'
                      />
                    ) : (
                      <ListMusic className='h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors' />
                    )}
                  </div>
                  <span className='truncate group-hover:text-primary transition-colors font-medium'>
                    {playlist.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

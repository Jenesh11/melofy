'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
import {
  Home,
  Search,
  Library,
  ListMusic,
  Heart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/store/usePlayerStore';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSidebarStore } from '@/store/useSidebarStore';
import { useAuth } from '@/lib/firebase/auth-context';
import {
  Playlist,
  deletePlaylist,
  renamePlaylist,
} from '@/lib/firebase/playlists';
import { useLibraryStore } from '@/store/useLibraryStore';
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
  const [firebasePlaylists, setFirebasePlaylists] = useState<Playlist[]>([]);
  const savedPlaylists = useLibraryStore((state) => state.savedPlaylists);
  const removePlaylist = useLibraryStore((state) => state.removePlaylist);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const activeCollectionId = usePlayerStore((state) => state.activeCollectionId);
  const { isCollapsed, toggle: toggleSidebar } = useSidebarStore();

  useEffect(() => {
    if (!user) {
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
        setFirebasePlaylists(fetchedPlaylists);
      },
      (error) => {
        console.error('Error listening to playlists:', error);
      },
    );

    return () => unsubscribe();
  }, [user]);

  // Combine Firebase lists and locally stored Spotify lists, ensuring Liked Songs is on top.
  const allPlaylists = useMemo(() => {
    const combined = [...(user ? firebasePlaylists : []), ...savedPlaylists];
    return combined.sort((a, b) => {
      const aIsLiked = a.isLikedSongs || a.name === 'Liked Songs';
      const bIsLiked = b.isLikedSongs || b.name === 'Liked Songs';
      if (aIsLiked && !bIsLiked) return -1;
      if (!aIsLiked && bIsLiked) return 1;
      return 0;
    });
  }, [firebasePlaylists, savedPlaylists, user]);
  const savedPlaylistIds = useMemo(
    () => new Set(savedPlaylists.map((playlist) => playlist.id)),
    [savedPlaylists],
  );

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
    <div className={cn(
      'flex h-full flex-col bg-sidebar/40 backdrop-blur-xl border-r border-sidebar-border text-sidebar-foreground overflow-hidden transition-[width] duration-300 ease-in-out select-none',
      isCollapsed ? 'w-18 items-center p-3' : 'w-64 p-4'
    )}>
      {/* Brand Header & Toggle */}
      <div className={cn(
        'flex items-center justify-between pb-8 pt-2 w-full',
        isCollapsed ? 'flex-col gap-4 px-0' : 'px-2'
      )}>
        {activeCollectionId ? (
          <Link
            href={`/playlist/${activeCollectionId}`}
            className={cn(
              'flex items-center gap-2 transition-opacity duration-200 cursor-pointer hover:opacity-80 active:scale-95',
            )}
          >
            <div className='h-8 w-8 overflow-hidden flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 rounded-lg relative'>
              <Image
                src='/logo.png'
                alt='Melofy Logo'
                width={32}
                height={32}
                className='h-full w-full object-contain'
              />
            </div>
            {!isCollapsed && (
              <h1 className='text-xl font-bold tracking-tight bg-linear-to-br from-foreground to-foreground/60 bg-clip-text text-transparent'>
                Melofy
              </h1>
            )}
          </Link>
        ) : (
          <div className='flex items-center gap-2 cursor-default'>
            <div className='h-8 w-8 overflow-hidden flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 rounded-lg relative'>
              <Image
                src='/logo.png'
                alt='Melofy Logo'
                width={32}
                height={32}
                className='h-full w-full object-contain'
              />
            </div>
            {!isCollapsed && (
              <h1 className='text-xl font-bold tracking-tight bg-linear-to-br from-foreground to-foreground/60 bg-clip-text text-transparent'>
                Melofy
              </h1>
            )}
          </div>
        )}

        <Button
          variant='ghost'
          size='icon'
          onClick={toggleSidebar}
          className='h-8 w-8 text-zinc-400 hover:text-white rounded-lg transition-transform hover:scale-105 active:scale-95 shrink-0'
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className='h-4 w-4' /> : <ChevronLeft className='h-4 w-4' />}
        </Button>
      </div>

      {/* Navigation Routes */}
      <div className='flex flex-col gap-1.5 w-full items-center shrink-0'>
        {routes.map((route) => (
          <Link key={route.href} href={route.href} className='w-full flex justify-center'>
            <div
              className={cn(
                'flex items-center rounded-md text-sm font-medium transition-colors duration-200 group/item cursor-pointer',
                isCollapsed ? 'justify-center w-10 h-10 p-0' : 'gap-4 px-3 py-2 w-full',
                route.active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
              )}
              title={isCollapsed ? route.label : undefined}
            >
              <route.icon className='h-5 w-5 shrink-0 transition-transform group-hover/item:scale-105' />
              {!isCollapsed && (
                <span className='truncate font-medium'>
                  {route.label}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Playlists Section */}
      <div className='mt-8 flex flex-col gap-1 flex-1 overflow-hidden w-full'>
        {isCollapsed ? (
          <div className='w-8 h-px bg-white/10 my-3 shrink-0' />
        ) : (
          <p className='px-3 text-xs font-semibold tracking-wider text-sidebar-foreground/40 mb-2 uppercase shrink-0'>
            Playlists
          </p>
        )}
        <div className={cn(
          'flex flex-col gap-1 overflow-y-auto custom-scrollbar sidebar-scrollbar w-full items-center',
          isCollapsed ? 'pr-0' : 'pr-2'
        )}>
          <div className='mt-2 flex flex-col gap-1.5 w-full items-center'>
            {allPlaylists.map((playlist) => {
              const isLocalReference = savedPlaylistIds.has(
                playlist.id as string,
              );

              return (
                <ContextMenu key={playlist.id}>
                  <ContextMenuTrigger className='w-full flex justify-center'>
                    <Link href={`/playlist/${playlist.id}`} className='w-full flex justify-center'>
                      <div
                        className={cn(
                          'flex items-center rounded-md text-sm transition-colors duration-200 group/playlist cursor-pointer',
                          isCollapsed ? 'justify-center w-10 h-10 p-0' : 'gap-3 px-3 py-2 w-full',
                          pathname === `/playlist/${playlist.id}`
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
                        )}
                        title={isCollapsed ? playlist.name : undefined}
                      >
                        <div className='flex items-center justify-center w-8 h-8 rounded-md bg-sidebar-accent/20 border border-sidebar-border overflow-hidden shrink-0 shadow-sm'>
                          {playlist.isLikedSongs || playlist.name === 'Liked Songs' ? (
                            <div className='h-full w-full flex items-center justify-center bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500'>
                              <Heart className='h-4 w-4 text-white fill-white shadow-md' />
                            </div>
                          ) : playlist.artworkUrl ||
                          ('coverUrl' in playlist &&
                            typeof playlist.coverUrl === 'string' &&
                            playlist.coverUrl) ? (
                            <Image
                              src={
                                (playlist.artworkUrl ||
                                ('coverUrl' in playlist
                                  ? playlist.coverUrl
                                  : undefined)) as string
                              }
                              alt={playlist.name}
                              width={32}
                              height={32}
                              className='h-full w-full object-cover group-hover/playlist:scale-110 transition-transform duration-200'
                            />
                          ) : (
                            <ListMusic className='h-4 w-4 text-muted-foreground group-hover/playlist:text-primary transition-colors' />
                          )}
                        </div>
                        {!isCollapsed && (
                          editingId === playlist.id ? (
                            <Input
                              autoFocus
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onBlur={() => setEditingId(null)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  if (
                                    editingName.trim() !== '' &&
                                    editingName.trim() !== playlist.name
                                  ) {
                                    await renamePlaylist(
                                      playlist.id!,
                                      editingName.trim(),
                                    );
                                  }
                                  setEditingId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingId(null);
                                }
                              }}
                              className='h-7 py-0 px-2 text-sm bg-sidebar-accent/50 border-primary/50 focus-visible:ring-0 focus-visible:ring-offset-0'
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className='truncate group-hover/playlist:text-primary transition-colors font-medium'>
                              {playlist.name}
                            </span>
                          )
                        )}
                      </div>
                    </Link>
                  </ContextMenuTrigger>
                  <ContextMenuContent className='w-48 bg-sidebar text-sidebar-foreground border-sidebar-border'>
                    {isLocalReference ? (
                      <ContextMenuItem
                        className='text-red-500 focus:bg-red-500/10 focus:text-red-500 cursor-pointer'
                        onClick={() => removePlaylist(playlist.id as string)}
                      >
                        Remove from Library
                      </ContextMenuItem>
                    ) : playlist.isLikedSongs || playlist.name === 'Liked Songs' ? (
                      <ContextMenuItem disabled className='text-sidebar-foreground/40'>
                        System Playlist
                      </ContextMenuItem>
                    ) : (
                      <>
                        <ContextMenuItem
                          className='cursor-pointer'
                          onClick={() => {
                            if (playlist.id) {
                              setEditingId(playlist.id);
                              setEditingName(playlist.name);
                            }
                          }}
                        >
                          Rename Playlist
                        </ContextMenuItem>
                        <ContextMenuItem
                          className='text-red-500 focus:bg-red-500/10 focus:text-red-500 cursor-pointer'
                          onClick={async () => {
                            if (playlist.id) {
                              const confirmed = window.confirm(
                                `Are you sure you want to delete "${playlist.name}"?`,
                              );
                              if (confirmed) {
                                await deletePlaylist(playlist.id);
                              }
                            }
                          }}
                        >
                          Delete Playlist
                        </ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

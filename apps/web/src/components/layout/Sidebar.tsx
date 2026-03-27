'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import {
  Home,
  Search,
  Library,
  ListMusic,
  Heart,
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
    <div className='flex h-full flex-col bg-sidebar/40 backdrop-blur-xl border-r border-sidebar-border w-64 p-4 text-sidebar-foreground overflow-hidden'>
      {activeCollectionId ? (
        <Link
          href={`/playlist/${activeCollectionId}`}
          className={cn(
            'flex items-center gap-2 px-2 pb-8 pt-2 transition-all duration-300 cursor-pointer hover:opacity-80 active:scale-95',
          )}
        >
          <div className='h-8 w-8 overflow-hidden flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 rounded-lg'>
            <img
              src='/logo.png'
              alt='Melofy Logo'
              className='h-full w-full object-contain'
            />
          </div>
          <h1 className='text-xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent'>
            Melofy
          </h1>
        </Link>
      ) : (
        <div className='flex items-center gap-2 px-2 pb-8 pt-2 cursor-default'>
          <div className='h-8 w-8 overflow-hidden flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 rounded-lg'>
            <img
              src='/logo.png'
              alt='Melofy Logo'
              className='h-full w-full object-contain'
            />
          </div>
          <h1 className='text-xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent'>
            Melofy
          </h1>
        </div>
      )}

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
            {allPlaylists.map((playlist) => {
              const isLocalReference = savedPlaylistIds.has(
                playlist.id as string,
              );

              return (
                <ContextMenu key={playlist.id}>
                  <ContextMenuTrigger>
                    <Link href={`/playlist/${playlist.id}`}>
                      <div
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors group cursor-pointer',
                          pathname === `/playlist/${playlist.id}`
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
                        )}
                      >
                        <div className='flex items-center justify-center w-8 h-8 rounded-md bg-sidebar-accent/20 border border-sidebar-border overflow-hidden shrink-0 shadow-sm'>
                          {playlist.isLikedSongs || playlist.name === 'Liked Songs' ? (
                            <div className='h-full w-full flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'>
                              <Heart className='h-4 w-4 text-white fill-white shadow-md' />
                            </div>
                          ) : playlist.artworkUrl ||
                          ('coverUrl' in playlist &&
                            typeof playlist.coverUrl === 'string' &&
                            playlist.coverUrl) ? (
                            <img
                              src={
                                playlist.artworkUrl ||
                                ('coverUrl' in playlist
                                  ? playlist.coverUrl
                                  : undefined)
                              }
                              alt={playlist.name}
                              className='h-full w-full object-cover group-hover:scale-110 transition-transform duration-300'
                            />
                          ) : (
                            <ListMusic className='h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors' />
                          )}
                        </div>
                        {editingId === playlist.id ? (
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
                          <span className='truncate group-hover:text-primary transition-colors font-medium'>
                            {playlist.name}
                          </span>
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

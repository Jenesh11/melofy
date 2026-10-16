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
import { useLikedStore } from '@/store/useLikedStore';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const likedPlaylistId = useLikedStore((state) => state.likedPlaylistId);
  const [playlistSnapshot, setPlaylistSnapshot] = useState<{ uid: string; playlists: Playlist[] } | null>(null);
  const firebasePlaylists = useMemo(() => playlistSnapshot?.uid === user?.uid ? playlistSnapshot?.playlists || [] : [], [playlistSnapshot, user?.uid]);
  const savedPlaylists = useLibraryStore((state) => state.savedPlaylists);
  const removePlaylist = useLibraryStore((state) => state.removePlaylist);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const activeCollectionId = usePlayerStore((state) => state.activeCollectionId);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const { isCollapsed, toggle: toggleSidebar } = useSidebarStore();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'playlists'),
      where('userId', '==', user.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedPlaylists = snapshot.docs
          .map(
            (doc) =>
              ({
                id: doc.id,
                ...doc.data(),
              }) as Playlist,
          )
          .sort((a, b) => {
            const timeA = (a.createdAt && 'seconds' in a.createdAt ? a.createdAt.seconds : 0);
            const timeB = (b.createdAt && 'seconds' in b.createdAt ? b.createdAt.seconds : 0);
            return timeB - timeA;
          });
        setPlaylistSnapshot({ uid: user.uid, playlists: fetchedPlaylists });
      },
      (error) => {
        console.error('Error listening to playlists:', error);
      },
    );

    return () => unsubscribe();
  }, [user]);

  // Combine Firebase lists and locally stored Spotify lists, ensuring single Liked Songs is on top.
  const allPlaylists = useMemo(() => {
    const combined = [...(user ? firebasePlaylists : []), ...savedPlaylists];
    
    // Find all liked songs playlists
    const likedPlaylists = combined.filter((p) => p.isLikedSongs || p.name === 'Liked Songs');
    const otherPlaylists = combined.filter((p) => !p.isLikedSongs && p.name !== 'Liked Songs');

    // Pick the best liked songs playlist: prefer likedPlaylistId from store, then the one with the most tracks
    let canonicalLiked: (Playlist | (typeof savedPlaylists)[number]) | null = null;
    if (likedPlaylists.length > 0) {
      if (likedPlaylistId) {
        canonicalLiked = likedPlaylists.find((p) => p.id === likedPlaylistId) || null;
      }
      if (!canonicalLiked) {
        canonicalLiked = [...likedPlaylists].sort((a, b) => {
          const countA = (a.tracks?.length) || a.trackCount || 0;
          const countB = (b.tracks?.length) || b.trackCount || 0;
          return countB - countA;
        })[0];
      }
    }

    return canonicalLiked ? [canonicalLiked, ...otherPlaylists] : otherPlaylists;
  }, [firebasePlaylists, savedPlaylists, user, likedPlaylistId]);
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

  const isLikedPlaylist = (playlist: (typeof allPlaylists)[number]) =>
    !!playlist.isLikedSongs || playlist.name === 'Liked Songs';
  const playlistCount = (playlist: (typeof allPlaylists)[number]) =>
    playlist.tracks?.length || playlist.trackCount || 0;
  const playlistArtwork = (playlist: (typeof allPlaylists)[number]) =>
    (playlist.artworkUrl || ('coverUrl' in playlist && typeof playlist.coverUrl === 'string' ? playlist.coverUrl : '')) || '';

  return (
    <div className={cn(
      'flex h-full flex-col rounded-2xl border border-border bg-background text-sidebar-foreground overflow-hidden transition-[width] duration-300 ease-in-out select-none',
      isCollapsed ? 'w-[76px]' : 'w-[272px]',
    )}>
      {/* Brand & collapse */}
      <div className={cn('flex h-16 shrink-0 items-center px-4', isCollapsed ? 'justify-center' : 'justify-between')}>
        <Link
          href={activeCollectionId ? `/playlist/${activeCollectionId}` : '/'}
          className={cn('flex min-w-0 items-center gap-2.5 rounded-lg transition-opacity hover:opacity-80', isCollapsed && 'hidden')}
        >
          <span className='relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg'>
            <Image src='/logo.png' alt='' width={32} height={32} className='h-full w-full object-contain' />
          </span>
          <span className='font-display text-[1.35rem] font-bold tracking-tight'>Melofy</span>
        </Link>
        <Button
          variant='ghost'
          size='icon'
          onClick={toggleSidebar}
          className='h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground'
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className='h-4 w-4' /> : <ChevronLeft className='h-4 w-4' />}
        </Button>
      </div>

      {/* Primary navigation */}
      <nav aria-label='Main' className='flex shrink-0 flex-col gap-0.5 px-3'>
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            aria-current={route.active ? 'page' : undefined}
            title={isCollapsed ? route.label : undefined}
            className={cn(
              'group/item relative flex h-10 items-center gap-3.5 rounded-xl text-sm font-semibold transition-colors',
              isCollapsed ? 'justify-center px-0' : 'px-3',
              route.active
                ? 'bg-foreground/[0.07] text-foreground'
                : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
            )}
          >
            {route.active && !isCollapsed && <span className='absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full bg-primary' />}
            <route.icon className={cn('h-[18px] w-[18px] shrink-0', route.active && 'text-primary')} strokeWidth={route.active ? 2.4 : 2} />
            {!isCollapsed && <span className='truncate'>{route.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Library */}
      <div className='mt-5 flex min-h-0 flex-1 flex-col'>
        {isCollapsed ? (
          <div className='mx-auto mb-2 h-px w-8 bg-border' />
        ) : (
          <div className='mb-1.5 flex items-center justify-between px-6'>
            <span className='eyebrow'>Your library</span>
            {allPlaylists.length > 0 && <span className='text-[11px] font-semibold tabular-nums text-muted-foreground'>{allPlaylists.length}</span>}
          </div>
        )}
        <div className={cn('flex flex-1 flex-col gap-0.5 overflow-y-auto custom-scrollbar sidebar-scrollbar px-3 pb-3', isCollapsed && 'scrollbar-none')}>
          {allPlaylists.length === 0 && !isCollapsed && (
            <Link href='/library' className='mx-1 mt-1 rounded-xl border border-dashed border-border p-4 text-xs leading-relaxed text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground'>
              <span className='mb-1 block text-sm font-semibold text-foreground'>Build your library</span>
              Create a playlist or import one from Spotify.
            </Link>
          )}
          {allPlaylists.map((playlist) => {
            const isLocalReference = savedPlaylistIds.has(playlist.id as string);
            const liked = isLikedPlaylist(playlist);
            const artwork = playlistArtwork(playlist);
            const count = playlistCount(playlist);
            const isActive = pathname === `/playlist/${playlist.id}`;
            const isPlayingFrom = activeCollectionId === playlist.id;

            return (
              <ContextMenu key={playlist.id}>
                <ContextMenuTrigger className='w-full'>
                  <Link
                    href={`/playlist/${playlist.id}`}
                    title={isCollapsed ? playlist.name : undefined}
                    className={cn(
                      'group/playlist flex w-full items-center gap-3 rounded-xl p-1.5 transition-colors',
                      isCollapsed && 'justify-center',
                      isActive ? 'bg-foreground/[0.07]' : 'hover:bg-foreground/[0.04]',
                    )}
                  >
                    <div className='relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted'>
                      {liked ? (
                        <div className='flex h-full w-full items-center justify-center bg-linear-to-br from-primary via-primary/70 to-fuchsia-600'>
                          <Heart className='h-[18px] w-[18px] fill-white text-white' />
                        </div>
                      ) : artwork ? (
                        <Image src={artwork} alt='' width={44} height={44} className='h-full w-full object-cover' />
                      ) : (
                        <ListMusic className='h-[18px] w-[18px] text-muted-foreground' />
                      )}
                    </div>
                    {!isCollapsed && (editingId === playlist.id ? (
                      <Input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            if (editingName.trim() !== '' && editingName.trim() !== playlist.name) {
                              await renamePlaylist(playlist.id!, editingName.trim());
                            }
                            setEditingId(null);
                          } else if (e.key === 'Escape') {
                            setEditingId(null);
                          }
                        }}
                        className='h-8 px-2 text-sm'
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className='flex min-w-0 flex-1 items-center gap-2'>
                        <div className='min-w-0 flex-1'>
                          <p className={cn('truncate text-sm font-semibold', isPlayingFrom ? 'text-primary' : 'text-foreground')}>
                            {playlist.name}
                          </p>
                          <p className='truncate text-xs text-muted-foreground'>
                            {liked ? 'Playlist' : isLocalReference ? 'Saved mix' : 'Playlist'}
                            {count > 0 && ` · ${count} songs`}
                          </p>
                        </div>
                        {isPlayingFrom && isPlaying && (
                          <span aria-label='Playing' className='flex h-3.5 shrink-0 items-end gap-[2px] text-primary'>
                            <span className='eq-bar h-full' />
                            <span className='eq-bar h-full' style={{ animationDelay: '-0.3s' }} />
                            <span className='eq-bar h-full' style={{ animationDelay: '-0.6s' }} />
                          </span>
                        )}
                      </div>
                    ))}
                  </Link>
                </ContextMenuTrigger>
                <ContextMenuContent className='w-48'>
                  {isLocalReference ? (
                    <ContextMenuItem
                      className='cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-500'
                      onClick={() => removePlaylist(playlist.id as string)}
                    >
                      Remove from Library
                    </ContextMenuItem>
                  ) : liked ? (
                    <ContextMenuItem disabled className='text-muted-foreground'>
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
                        className='cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-500'
                        onClick={async () => {
                          if (playlist.id && window.confirm(`Are you sure you want to delete "${playlist.name}"?`)) {
                            await deletePlaylist(playlist.id);
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
  );
}

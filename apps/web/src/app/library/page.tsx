'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Loader2,
  Trash2,
  Music2,
  ListMusic,
  Sparkles,
  Check,
  AlertCircle,
  Play,
  MoreHorizontal,
  Edit2,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import {
  getUserPlaylists,
  addPlaylist,
  deletePlaylist,
  renamePlaylist,
  Playlist,
} from '@/lib/firebase/playlists';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';

export default function LibraryPage() {
  const { user } = useAuth();
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPlaylists();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchPlaylists = async () => {
    if (!user) return;
    try {
      const data = await getUserPlaylists(user.uid);
      setPlaylists(data);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      toast.error('Failed to load library');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!user || !importUrl.trim()) return;

    setIsImporting(true);
    setImportSuccess(false);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(importUrl)}`,
      );
      const data = await response.json();

      if (data.loadType === 'playlist') {
        const { userId, ...playlistData } = {
          name:
            data.playlistInfo?.name ||
            data.playlist?.name ||
            'Untitled Playlist',
          userId: user.uid,
          trackCount: data.tracks.length,
          tracks: data.tracks,
          artworkUrl: data.tracks[0]?.info?.artworkUrl || '',
        };

        const result = await addPlaylist(user.uid, playlistData);
        setImportSuccess(true);
        setImportUrl('');
        fetchPlaylists();

        if (result.updated) {
          toast.success('Playlist refreshed and updated successfully!');
        } else {
          toast.success('Playlist imported successfully!');
        }

        setTimeout(() => setImportSuccess(false), 3000);
      } else {
        toast.error('Could not find a valid playlist at this URL');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('An error occurred during import');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePlaylist(id);
      setPlaylists(playlists.filter((p) => p.id !== id));
      toast.success('Playlist removed');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to remove playlist');
    }
  };

  const handleRename = async () => {
    if (!renamingId || !newName.trim()) return;
    setIsRenaming(true);
    try {
      await renamePlaylist(renamingId, newName.trim());
      setPlaylists(
        playlists.map((p) =>
          p.id === renamingId ? { ...p, name: newName.trim() } : p,
        ),
      );
      toast.success('Playlist renamed');
      setRenamingId(null);
      setNewName('');
    } catch (error) {
      console.error('Rename error:', error);
      toast.error('Failed to rename playlist');
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <div className='p-8 flex flex-col gap-10'>
      <header className='flex flex-col gap-2'>
        <p className='text-primary font-bold tracking-widest text-[10px] uppercase'>
          Your Collection
        </p>
        <h1 className='text-4xl md:text-5xl font-bold text-foreground tracking-tight'>
          Library
        </h1>
      </header>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-10 items-start'>
        {/* Import Section */}
        <Card className='lg:col-span-1 bg-card/40 backdrop-blur-xl border-border rounded-[2rem] overflow-hidden shadow-2xl'>
          <CardHeader className='p-8 pb-4'>
            <CardTitle className='text-2xl font-bold text-foreground flex items-center gap-3'>
              <Sparkles className='h-6 w-6 text-foreground' />
              Import Playlist
            </CardTitle>
            <CardDescription className='text-muted-foreground font-light'>
              Paste a Spotify playlist URL to instantly port your favorite
              tracks.
            </CardDescription>
          </CardHeader>
          <CardContent className='p-8 pt-0 space-y-6'>
            <div className='space-y-4'>
              <Input
                placeholder='https://open.spotify.com/playlist/...'
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                className='bg-muted/50 border-border h-12 rounded-2xl focus-visible:ring-primary/50 text-foreground placeholder:text-muted-foreground font-light'
                disabled={isImporting || !user}
              />
              <Button
                onClick={handleImport}
                disabled={isImporting || !importUrl.trim() || !user}
                className='w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-all active:scale-[0.98] group border-none'
              >
                {isImporting ? (
                  <>
                    <Loader2 className='h-5 w-5 animate-spin mr-2' />
                    Importing...
                  </>
                ) : importSuccess ? (
                  <>
                    <Check className='h-5 w-5 mr-2' />
                    Success!
                  </>
                ) : (
                  <>
                    <Plus className='h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300' />
                    Add to Library
                  </>
                )}
              </Button>
            </div>
            {!user && (
              <div className='flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs'>
                <AlertCircle className='h-4 w-4' />
                Please sign in to import playlists.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Playlists Section */}
        <div className='lg:col-span-2 overflow-y-auto custom-scrollbar'>
          <h2 className='text-2xl font-bold text-foreground mb-6 flex items-center gap-3'>
            <ListMusic className='h-6 w-6 text-foreground' />
            Stored Playlists
          </h2>

          {isLoading ? (
            <div className='flex items-center justify-center py-20'>
              <Loader2 className='h-8 w-8 text-foreground animate-spin' />
            </div>
          ) : playlists.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-24 bg-card/30 rounded-[2.5rem] border border-border border-dashed'>
              <div className='p-6 bg-muted/50 rounded-full mb-6'>
                <ListMusic className='h-12 w-12 text-muted-foreground' />
              </div>
              <h3 className='text-xl font-medium text-foreground'>
                Collection is empty
              </h3>
              <p className='text-sm text-muted-foreground max-w-xs text-center mt-2 font-light'>
                {user
                  ? 'Import a playlist from Spotify to start building your unique music library.'
                  : 'Welcome! Sign in to see your imported playlists and saved music.'}
              </p>
            </div>
          ) : (
            <motion.div
              layout
              className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6'
            >
              <AnimatePresence>
                {playlists.map((playlist) => (
                  <motion.div
                    key={playlist.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className='group relative flex flex-col gap-3'
                  >
                    <div className='aspect-square rounded-[2rem] bg-muted relative overflow-hidden shadow-xl group-hover:shadow-primary/10 transition-all duration-500'>
                      <div className='absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10'>
                        <Link href={`/playlist/${playlist.id}`}>
                          <Button
                            size='icon'
                            className='h-14 w-14 rounded-full bg-primary text-primary-foreground hover:scale-110 transition-all shadow-2xl'
                          >
                            <Play className='h-7 w-7 fill-current transition-colors ml-1' />
                          </Button>
                        </Link>
                      </div>
                      <Link href={`/playlist/${playlist.id}`}>
                        <div className='h-full w-full bg-linear-to-br from-muted to-background group-hover:scale-110 transition-transform duration-700 cursor-pointer'>
                          {playlist.artworkUrl ? (
                            <img
                              src={playlist.artworkUrl}
                              alt={playlist.name}
                              className='h-full w-full object-cover'
                            />
                          ) : (
                            <div className='h-full w-full flex items-center justify-center'>
                              <Music2 className='h-12 w-12 text-muted-foreground' />
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className='absolute bottom-4 right-4 bg-background/60 backdrop-blur-md px-3 py-1 rounded-full border border-border z-20'>
                        <p className='text-[10px] text-foreground font-bold tracking-wider'>
                          {playlist.trackCount} TRACKS
                        </p>
                      </div>
                    </div>
                    <div className='flex items-start justify-between px-1'>
                      <Link
                        href={`/playlist/${playlist.id}`}
                        className='flex-1 truncate'
                      >
                        <div className='cursor-pointer group/text'>
                          <h3 className='text-foreground font-bold truncate text-sm group-hover/text:underline transition-all'>
                            {playlist.name}
                          </h3>
                          <p className='text-muted-foreground text-[10px] uppercase tracking-widest font-medium'>
                            Spotify Import
                          </p>
                        </div>
                      </Link>

                      <div className='relative'>
                        <Button
                          size='icon'
                          variant='ghost'
                          className='h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted shrink-0'
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(
                              activeMenuId === playlist.id
                                ? null
                                : playlist.id || null,
                            );
                          }}
                        >
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>

                        <AnimatePresence>
                          {activeMenuId === playlist.id && (
                            <>
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className='fixed inset-0 z-40'
                                onClick={() => setActiveMenuId(null)}
                              />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className='absolute bottom-full right-0 mb-2 w-48 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden'
                              >
                                <div className='p-1.5'>
                                  <button
                                    className='w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-xl transition-colors'
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      setRenamingId(playlist.id || null);
                                      setNewName(playlist.name);
                                    }}
                                  >
                                    <Edit2 className='h-4 w-4' />
                                    Rename
                                  </button>
                                  <button
                                    className='w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-xl transition-colors'
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      playlist.id && handleDelete(playlist.id);
                                    }}
                                  >
                                    <Trash2 className='h-4 w-4' />
                                    Delete
                                  </button>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Rename Modal */}
      <AnimatePresence>
        {renamingId && (
          <div className='fixed inset-0 z-100 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm shadow-2xl'>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className='w-full max-w-md bg-card border border-border p-8 rounded-[2.5rem] shadow-2xl'
            >
              <h2 className='text-2xl font-bold text-foreground mb-2'>
                Rename Playlist
              </h2>
              <p className='text-muted-foreground text-sm mb-6 font-light'>
                Give your collection a new name that resonates with you.
              </p>

              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder='Playlist name'
                className='h-12 rounded-2xl bg-muted/50 border-border mb-8 focus-visible:ring-primary/50'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') setRenamingId(null);
                }}
              />

              <div className='flex items-center gap-3'>
                <Button
                  variant='ghost'
                  className='flex-1 h-12 rounded-2xl text-muted-foreground border border-transparent hover:border-border'
                  onClick={() => setRenamingId(null)}
                >
                  Cancel
                </Button>
                <Button
                  className='flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20'
                  onClick={handleRename}
                  disabled={isRenaming || !newName.trim()}
                >
                  {isRenaming ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

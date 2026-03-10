import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListMusic,
  Loader2,
  Play,
  Music2,
  MoreHorizontal,
  Edit2,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Playlist } from '@/lib/firebase/playlists';

interface LibraryPlaylistGridProps {
  playlists: Playlist[];
  isLoading: boolean;
  user: any;
  onInitiateRename: (id: string, currentName: string) => void;
  onDelete: (id: string) => void;
}

export function LibraryPlaylistGrid({
  playlists,
  isLoading,
  user,
  onInitiateRename,
  onDelete,
}: LibraryPlaylistGridProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  return (
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
                                  onInitiateRename(
                                    playlist.id || '',
                                    playlist.name,
                                  );
                                }}
                              >
                                <Edit2 className='h-4 w-4' />
                                Rename
                              </button>
                              <button
                                className='w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-xl transition-colors'
                                onClick={() => {
                                  setActiveMenuId(null);
                                  playlist.id && onDelete(playlist.id);
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
  );
}

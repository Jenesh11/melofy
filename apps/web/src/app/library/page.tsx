'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import {
  getUserPlaylists,
  deletePlaylist,
  renamePlaylist,
  Playlist,
} from '@/lib/firebase/playlists';
import { useLibraryStore } from '@/store/useLibraryStore';
import { toast } from 'sonner';
import { ImportPlaylistCard } from '@/components/library/ImportPlaylistCard';
import { LibraryPlaylistGrid } from '@/components/library/LibraryPlaylistGrid';
import { RenamePlaylistModal } from '@/components/library/RenamePlaylistModal';

export default function LibraryPage() {
  const { user } = useAuth();
  const [firebasePlaylists, setFirebasePlaylists] = useState<Playlist[]>([]);
  const savedPlaylists = useLibraryStore((state) => state.savedPlaylists);
  const removeSavedPlaylist = useLibraryStore((state) => state.removePlaylist);
  const renameSavedPlaylist = useLibraryStore((state) => state.renamePlaylist);
  const [isLoading, setIsLoading] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const fetchPlaylists = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUserPlaylists(user.uid);
      setFirebasePlaylists(data);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      toast.error('Failed to load library');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPlaylists();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchPlaylists]);

  const allPlaylists = useMemo(() => {
    // Combine Firebase lists and locally stored Spotify lists, ensuring Liked Songs is on top.
    const combined = [...firebasePlaylists, ...savedPlaylists];
    return combined.sort((a, b) => {
      const aIsLiked = a.isLikedSongs || a.name === 'Liked Songs';
      const bIsLiked = b.isLikedSongs || b.name === 'Liked Songs';
      if (aIsLiked && !bIsLiked) return -1;
      if (!aIsLiked && bIsLiked) return 1;
      return 0;
    });
  }, [firebasePlaylists, savedPlaylists]);

  const savedPlaylistIds = useMemo(
    () => new Set(savedPlaylists.map((playlist) => playlist.id)),
    [savedPlaylists],
  );

  const handleDelete = async (id: string) => {
    try {
      if (savedPlaylistIds.has(id)) {
        removeSavedPlaylist(id);
        toast.success('Playlist removed from library');
      } else {
        await deletePlaylist(id);
        setFirebasePlaylists((prev) => prev.filter((p) => p.id !== id));
        toast.success('Playlist deleted');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to remove playlist');
    }
  };

  const handleRename = async () => {
    if (!renamingId || !newName.trim()) return;
    
    setIsRenaming(true);
    try {
      if (savedPlaylistIds.has(renamingId)) {
        renameSavedPlaylist(renamingId, newName.trim());
      } else {
        await renamePlaylist(renamingId, newName.trim());
        setFirebasePlaylists((prev) =>
          prev.map((p) =>
            p.id === renamingId ? { ...p, name: newName.trim() } : p,
          ),
        );
      }
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

      <div className='flex flex-col gap-10 items-start w-full'>
        <div className='w-full max-w-5xl'>
          <ImportPlaylistCard onImportSuccess={fetchPlaylists} />
        </div>

        <LibraryPlaylistGrid
          playlists={allPlaylists as Playlist[]}
          isLoading={isLoading}
          user={user}
          onInitiateRename={(id, currentName) => {
            setRenamingId(id);
            setNewName(currentName);
          }}
          onDelete={handleDelete}
        />
      </div>

      <RenamePlaylistModal
        renamingId={renamingId}
        newName={newName}
        setNewName={setNewName}
        isRenaming={isRenaming}
        onRename={handleRename}
        onCancel={() => {
          setRenamingId(null);
          setNewName('');
        }}
      />
    </div>
  );
}

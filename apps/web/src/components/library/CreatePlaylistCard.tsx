'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { Loader2, Plus, Sparkles } from 'lucide-react';
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
import { addPlaylist } from '@/lib/firebase/playlists';

interface CreatePlaylistCardProps {
  onCreateSuccess: () => void;
}

export function CreatePlaylistCard({
  onCreateSuccess,
}: CreatePlaylistCardProps) {
  const { user } = useAuth();
  const [playlistName, setPlaylistName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !playlistName.trim()) return;

    setIsCreating(true);

    try {
      const playlistData = {
        name: playlistName.trim(),
        trackCount: 0,
        tracks: [],
        description: description.trim(),
        artworkUrl: '',
      };

      await addPlaylist(user.uid, playlistData);
      setPlaylistName('');
      setDescription('');
      onCreateSuccess();
      toast.success('Custom playlist created successfully!');
    } catch (error) {
      console.error('Create playlist error:', error);
      toast.error('An error occurred while creating the playlist');
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleCreate(e);
    }
  };

  return (
    <Card className="w-full bg-card/40 backdrop-blur-xl border-border rounded-[2rem] overflow-hidden shadow-2xl">
      <CardHeader className="p-8 pb-4">
        <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-foreground" />
          Create Custom Playlist
        </CardTitle>
        <CardDescription className="text-muted-foreground font-light">
          Create an empty personalized collection to add your favorite tracks manually.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8 pt-0 space-y-6">
        <form onSubmit={(e: React.FormEvent) => void handleCreate(e)} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center w-full">
            <div className="flex-1 w-full space-y-3">
              <Input
                placeholder="Playlist name"
                value={playlistName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlaylistName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-muted/50 border-border h-14 rounded-2xl focus-visible:ring-primary/50 text-foreground placeholder:text-muted-foreground font-light w-full"
                disabled={isCreating || !user}
              />
              <Input
                placeholder="Description (Optional)"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-muted/50 border-border h-14 rounded-2xl focus-visible:ring-primary/50 text-foreground placeholder:text-muted-foreground font-light w-full"
                disabled={isCreating || !user}
              />
            </div>
            <Button
              type="submit"
              disabled={isCreating || !playlistName.trim() || !user}
              className="h-14 sm:w-56 w-full rounded-2xl bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-all active:scale-[0.98] group border-none shrink-0"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                  Create Playlist
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

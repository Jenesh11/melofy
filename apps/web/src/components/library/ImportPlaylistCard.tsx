import { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { Plus, Loader2, Sparkles, Check, AlertCircle } from 'lucide-react';
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

interface ImportPlaylistCardProps {
  onImportSuccess: () => void;
}

export function ImportPlaylistCard({
  onImportSuccess,
}: ImportPlaylistCardProps) {
  const { user } = useAuth();
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleImport = async () => {
    if (!user || !importUrl.trim()) return;

    setIsImporting(true);
    setImportSuccess(false);

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(importUrl)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();

      if (data.loadType === 'playlist') {
        const playlistData = {
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
        onImportSuccess();

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

  return (
    <Card className='w-full bg-card/40 backdrop-blur-xl border-border rounded-[2rem] overflow-hidden shadow-2xl'>
      <CardHeader className='p-8 pb-4'>
        <CardTitle className='text-2xl font-bold text-foreground flex items-center gap-3'>
          <Sparkles className='h-6 w-6 text-foreground' />
          Import Playlist
        </CardTitle>
        <CardDescription className='text-muted-foreground font-light'>
          Paste a Spotify or youtube playlist URL to instantly port your favorite tracks.
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
  );
}

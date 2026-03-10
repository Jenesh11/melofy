'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Play, Music2, Loader2, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getPlaylistById, Playlist } from '@/lib/firebase/playlists';
import { usePlayerStore, Track as PlayerTrack } from '@/store/usePlayerStore';
import { Button } from '@/components/ui/button';
import { TrackList, TrackItem } from '@/components/ui/TrackList';
import Link from 'next/link';

export default function PlaylistPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const { playPlaylist } = usePlayerStore();

  const [playlist, setPlaylist] = useState<any>(null); // Use any to support both Firebase and Spotify shapes
  const [isLoading, setIsLoading] = useState(true);
  const [isSpotifySource, setIsSpotifySource] = useState(false);

  useEffect(() => {
    async function fetchPlaylist() {
      if (!id) return;

      setIsLoading(true);

      // 1. Try Firebase first
      let dbPlaylist = null;
      try {
        dbPlaylist = await getPlaylistById(id);
      } catch (e) {
        console.log('Firebase lookup failed, proceeding to Spotify fallback');
      }

      if (dbPlaylist) {
        setPlaylist(dbPlaylist);
        setIsSpotifySource(false);
        setIsLoading(false);
        return;
      }

      // 2. Fallback to Spotify API
      try {
        const res = await fetch(`/api/spotify/playlists/${id}`);
        if (res.ok) {
          const spotifyData = await res.json();
          setPlaylist(spotifyData);
          setIsSpotifySource(true);
        } else {
          setPlaylist(null); // Truly not found
        }
      } catch (error) {
        console.error('Error fetching Spotify playlist:', error);
        setPlaylist(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPlaylist();
  }, [id]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh] w-full'>
        <Loader2 className='h-10 w-10 text-primary animate-spin' />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className='flex flex-col items-center justify-center h-full gap-4'>
        <Music2 className='h-16 w-16 text-zinc-700' />
        <h1 className='text-2xl font-bold text-foreground'>
          Playlist not found
        </h1>
        <Link href='/library'>
          <Button variant='outline' className='rounded-full'>
            <ChevronLeft className='mr-2 h-4 w-4' />
            Back to Library
          </Button>
        </Link>
      </div>
    );
  }

  // Map playlist tracks to TrackItem shape for the unified TrackList
  const trackItems: TrackItem[] = isSpotifySource
    ? playlist.tracks.map((t: any) => ({
        id: t.id,
        title: t.name,
        artist: t.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
        artworkUrl: t.album?.images?.[0]?.url || playlist.artworkUrl || '',
        duration: t.duration_ms || 0,
        album: t.album?.name || 'Single',
        encoded: '', // Empty, resolved on-the-fly by PlayerShell
      }))
    : playlist.tracks.map((t: any) => ({
        id: t.info.identifier,
        title: t.info.title,
        artist: t.info.author,
        artworkUrl: t.info.artworkUrl || '',
        duration: t.info.duration,
        album: t.info.author, // Show artist in album column
        encoded: t.encoded,
      }));

  const handlePlayPlaylist = () => {
    const tracksToPlay: PlayerTrack[] = trackItems.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      artworkUrl: t.artworkUrl,
      duration: t.duration,
      url: t.encoded,
    }));
    playPlaylist(tracksToPlay);
  };

  return (
    <div className='flex flex-col min-h-full overflow-x-hidden custom-scrollbar p-4 md:p-8 pb-32 md:pb-8'>
      <header className='flex flex-col md:flex-row items-center md:items-end gap-6 mb-8 mt-4'>
        <div className='h-48 w-48 md:h-60 md:w-60 rounded-[2.5rem] bg-muted shadow-2xl shrink-0 overflow-hidden'>
          {playlist.artworkUrl ? (
            <img
              src={playlist.artworkUrl}
              alt={playlist.name}
              className='h-full w-full object-cover'
            />
          ) : (
            <div className='h-full w-full flex items-center justify-center'>
              <Music2 className='h-24 w-24 text-muted-foreground' />
            </div>
          )}
        </div>

        <div className='flex flex-col gap-2'>
          <p className='text-primary font-bold tracking-widest text-[10px] uppercase'>
            {isSpotifySource ? 'Spotify Playlist' : 'Playlist'}
          </p>
          <h1 className='text-5xl md:text-7xl font-bold text-foreground tracking-tighter mb-2 line-clamp-2'>
            {playlist.name}
          </h1>
          {playlist.description && (
            <p className='text-muted-foreground text-sm font-medium line-clamp-2 max-w-2xl'>
              {playlist.description.replace(/<[^>]*>?/gm, '')}
            </p>
          )}
          <div className='flex items-center gap-2 text-muted-foreground text-sm font-light mt-2'>
            <span className='font-semibold text-foreground'>
              {isSpotifySource ? 'Spotify' : user?.displayName || 'User'}
            </span>
            <span>•</span>
            <span>
              {playlist.trackCount || playlist.tracks?.length || 0} tracks
            </span>
          </div>
        </div>
      </header>

      <div className='flex items-center gap-6 mb-8'>
        <Button
          size='lg'
          className='bg-primary text-primary-foreground font-bold h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform'
          onClick={handlePlayPlaylist}
        >
          <Play className='h-6 w-6 fill-current' />
        </Button>
        <p className='text-muted-foreground text-sm font-light italic'>
          Play the entire collection
        </p>
      </div>

      <TrackList tracks={trackItems} />
    </div>
  );
}

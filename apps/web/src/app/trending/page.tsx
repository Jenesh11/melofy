'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Loader2, Music2, Play } from 'lucide-react';
import { TrackList, TrackItem } from '@/components/ui/TrackList';
import { usePlayerStore, Track as PlayerTrack } from '@/store/usePlayerStore';
import { Button } from '@/components/ui/button';

export default function TrendingPage() {
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playPlaylist } = usePlayerStore();

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/spotify/trending');
        if (res.ok) {
          const data = await res.json();
          const mapped: TrackItem[] = data
            .filter((item: any) => item.track)
            .map((item: any) => ({
              id: item.track.id,
              title: item.track.name,
              artist:
                item.track.artists?.map((a: any) => a.name).join(', ') ||
                'Unknown',
              artworkUrl: item.track.album?.images?.[0]?.url || '',
              duration: item.track.duration_ms || 0,
              album: item.track.album?.name || '',
            }));
          setTracks(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch trending:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrending();
  }, []);

  return (
    <div className='flex flex-col min-h-full overflow-x-hidden custom-scrollbar p-4 md:p-8 pb-32 md:pb-8'>
      {/* Header – matching playlist page style */}
      <header className='flex flex-col md:flex-row items-center md:items-end gap-6 mb-8 mt-4'>
        <div className='h-48 w-48 md:h-60 md:w-60 rounded-[2.5rem] bg-linear-to-br from-primary/30 to-blue-500/20 shadow-2xl shrink-0 flex items-center justify-center'>
          <TrendingUp className='h-24 w-24 text-primary' />
        </div>

        <div className='flex flex-col gap-2'>
          <p className='text-primary font-bold tracking-widest text-[10px] uppercase'>
            Chart
          </p>
          <h1 className='text-5xl md:text-7xl font-bold text-foreground tracking-tighter mb-2'>
            Top 50 Global
          </h1>
          <div className='flex items-center gap-2 text-muted-foreground text-sm font-light'>
            <span className='font-semibold text-foreground'>Spotify</span>
            <span>•</span>
            <span>{tracks.length} tracks</span>
            <span>•</span>
            <span>Updated daily</span>
          </div>
        </div>
      </header>

      <div className='flex items-center gap-6 mb-8'>
        <Button
          size='lg'
          className='bg-primary text-primary-foreground font-bold h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform'
          onClick={() => {
            const tracksToPlay: PlayerTrack[] = tracks.map((t) => ({
              id: t.id,
              title: t.title,
              artist: t.artist,
              artworkUrl: t.artworkUrl,
              duration: t.duration,
              url: t.encoded || '',
            }));
            playPlaylist(tracksToPlay);
          }}
          disabled={tracks.length === 0}
        >
          <Play className='h-6 w-6 fill-current' />
        </Button>
        <p className='text-muted-foreground text-sm font-light italic'>
          Play the weekly top charts
        </p>
      </div>

      {/* Track List */}
      {isLoading ? (
        <div className='flex flex-col items-center justify-center py-32 gap-4'>
          <Loader2 className='h-10 w-10 text-primary animate-spin' />
          <p className='text-muted-foreground animate-pulse'>
            Loading global charts...
          </p>
        </div>
      ) : tracks.length > 0 ? (
        <TrackList tracks={tracks} />
      ) : (
        <div className='flex flex-col items-center justify-center py-32 gap-4'>
          <Music2 className='h-16 w-16 text-muted-foreground' />
          <p className='text-xl text-muted-foreground'>
            No trending tracks available
          </p>
        </div>
      )}
    </div>
  );
}

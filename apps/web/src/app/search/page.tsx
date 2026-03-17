'use client';

import { useState, useEffect } from 'react';
import { Search as SearchIcon, Loader2, X, Clock, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDebounce } from '@/hooks/useDebounce';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TrackList, TrackItem } from '@/components/ui/TrackList';
import { TrackCarousel } from '@/components/home/TrackCarousel';
import { PlaylistGrid } from '@/components/home/PlaylistGrid';
import { useSpotifyCollection } from '@/hooks/useSpotifyCollection';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  const [results, setResults] = useState<TrackItem[]>([]);
  const [spotifyTracks, setSpotifyTracks] = useState<any[]>([]);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const { handlePlaySpotifyCollection } = useSpotifyCollection();

  useEffect(() => {
    const savedHistory = localStorage.getItem('melofy_search_history');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse search history', e);
      }
    }
  }, []);

  const saveToHistory = (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    const term = searchTerm.trim();
    setSearchHistory((prev) => {
      const newHistory = [term, ...prev.filter((t) => t !== term)].slice(0, 10);
      localStorage.setItem('melofy_search_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const removeFromHistory = (searchTerm: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory((prev) => {
      const newHistory = prev.filter((t) => t !== searchTerm);
      localStorage.setItem('melofy_search_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('melofy_search_history');
  };

  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        setSpotifyTracks([]);
        setSpotifyPlaylists([]);
        return;
      }

      setLoading(true);
      try {
        const [ytRes, spotifyRes] = await Promise.allSettled([
          fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`),
          fetch(
            `/api/spotify/search?q=${encodeURIComponent(
              debouncedQuery,
            )}&type=track,playlist`,
          ),
        ]);

        let ytData: any = null;
        if (ytRes.status === 'fulfilled' && ytRes.value.ok) {
          ytData = await ytRes.value.json();
        }

        let spotData: any = null;
        if (spotifyRes.status === 'fulfilled' && spotifyRes.value.ok) {
          spotData = await spotifyRes.value.json();
        }

        if (ytData && ytData.tracks && ytData.tracks.length > 0) {
          const mapped: TrackItem[] = ytData.tracks
            .filter(Boolean)
            .map((track: any) => ({
              id: track.info?.identifier || 'unknown',
              title: track.info?.title || 'Unknown Title',
              artist: track.info?.author || 'Unknown Artist',
              artworkUrl:
                track.info?.artworkUrl ||
                (track.info?.identifier
                  ? `https://img.youtube.com/vi/${track.info.identifier}/mqdefault.jpg`
                  : ''),
              duration: track.info?.duration || 0,
              album: track.info?.author || '',
              encoded: track.encoded,
            }));
          setResults(mapped);
          saveToHistory(debouncedQuery);
        } else {
          setResults([]);
        }

        if (spotData) {
          setSpotifyTracks(spotData.tracks?.items?.filter(Boolean) || []);
          setSpotifyPlaylists(spotData.playlists?.items?.filter(Boolean) || []);
        } else {
          setSpotifyTracks([]);
          setSpotifyPlaylists([]);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  return (
    <div className='p-4 md:p-8 h-full flex flex-col'>
      <div className='relative max-w-2xl mb-8'>
        <SearchIcon className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground' />
        <Input
          className='w-full h-14 pl-12 bg-card border-border text-foreground text-lg rounded-full focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground'
          placeholder='What do you want to listen to?'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <div className='flex-1 overflow-y-auto custom-scrollbar pb-24'>
        {loading && (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        )}

        {!query && !loading && searchHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className='mb-8'
          >
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-2xl font-bold text-foreground flex items-center gap-2'>
                <Flame className='h-5 w-5 text-primary' />
                Recent Searches
              </h2>
              <Button
                variant='ghost'
                className='text-muted-foreground hover:text-foreground text-xs uppercase tracking-widest'
                onClick={clearHistory}
              >
                Clear All
              </Button>
            </div>
            <div className='flex flex-wrap gap-3'>
              {searchHistory.map((term, index) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  key={`history-${index}`}
                  onClick={() => setQuery(term)}
                  className='group relative flex items-center gap-2 px-4 py-2 bg-muted border border-border hover:border-primary/50 rounded-full cursor-pointer transition-all duration-300'
                >
                  <Clock className='h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors' />
                  <span className='text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors'>
                    {term}
                  </span>
                  <button
                    onClick={(e) => removeFromHistory(term, e)}
                    className='ml-2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/10 opacity-0 group-hover:opacity-100 transition-all'
                  >
                    <X className='h-3 w-3' />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {!loading &&
          query &&
          results.length === 0 &&
          spotifyTracks.length === 0 &&
          spotifyPlaylists.length === 0 && (
            <div className='flex flex-col items-center justify-center py-24 text-muted-foreground'>
              <h3 className='text-xl font-semibold text-foreground mb-2'>
                No results found for &quot;{query}&quot;
              </h3>
              <p>
                Please make sure your words are spelled correctly, or use less
                or different keywords.
              </p>
            </div>
          )}

        {!loading &&
          (spotifyPlaylists.length > 0 ||
            spotifyTracks.length > 0 ||
            results.length > 0) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='flex flex-col gap-4'
            >
              {spotifyTracks.length > 0 && (
                <TrackCarousel title='Top Tracks' tracks={spotifyTracks} />
              )}

              {spotifyPlaylists.length > 0 && (
                <PlaylistGrid
                  title='Featured Playlists'
                  items={spotifyPlaylists}
                  isCarousel={true}
                  onPlayPlaylist={handlePlaySpotifyCollection}
                />
              )}

              {results.length > 0 && (
                <div className='mt-8'>
                  <h3 className='text-3xl font-bold text-foreground mb-6'>
                    More Audio Results
                  </h3>
                  <TrackList tracks={results} />
                </div>
              )}
            </motion.div>
          )}
      </div>
    </div>
  );
}

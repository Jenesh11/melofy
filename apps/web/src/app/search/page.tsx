'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon, Play, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Clock, Flame } from 'lucide-react';

interface SearchResult {
  tracks: any[];
  // Other fields from kazagumo like playlistName, etc.
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const { play, addToQueue } = usePlayerStore();

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
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}`,
        );
        const data = await res.json();
        if (data && data.tracks && data.tracks.length > 0) {
          setResults(data.tracks);
          saveToHistory(debouncedQuery);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  const handlePlayTrack = (trackData: any) => {
    // Map lavalink-client track data to our local Track interface
    const track: Track = {
      id: trackData.info?.identifier || 'unknown',
      title: trackData.info?.title || 'Unknown Title',
      artist: trackData.info?.author || 'Unknown Artist',
      artworkUrl:
        trackData.info?.artworkUrl ||
        (trackData.info?.identifier
          ? `https://img.youtube.com/vi/${trackData.info.identifier}/maxresdefault.jpg`
          : ''),
      duration: trackData.info?.duration || 0,
      url: trackData.encoded,
    };
    play(track);
  };

  return (
    <div className='p-8 h-full flex flex-col'>
      <div className='relative max-w-2xl mb-8'>
        <SearchIcon className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground' />
        <Input
          className='w-full h-14 pl-12 bg-card border-border text-foreground text-lg rounded-full focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground'
          placeholder='What do you want to listen to?'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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

        {!loading && query && results.length === 0 && (
          <div className='flex flex-col items-center justify-center py-24 text-muted-foreground'>
            <h3 className='text-xl font-semibold text-foreground mb-2'>
              No results found for "{query}"
            </h3>
            <p>
              Please make sure your words are spelled correctly, or use less or
              different keywords.
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          >
            {results.map((track, i) => {
              if (!track) return null;
              const artwork =
                track.info?.artworkUrl ||
                (track.info?.identifier
                  ? `https://img.youtube.com/vi/${track.info.identifier}/mqdefault.jpg`
                  : '');
              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={`${track.info?.identifier || i}-${i}`}
                  className='group relative bg-card/50 hover:bg-card p-4 rounded-xl transition-all duration-300 cursor-pointer flex flex-col items-start gap-4 hover:shadow-2xl hover:shadow-primary/20 border border-border/50'
                >
                  <div className='relative w-full aspect-square rounded-md overflow-hidden bg-muted shadow-lg'>
                    <img
                      src={artwork}
                      alt={track.title || 'Unknown Title'}
                      loading='lazy'
                      className='object-cover w-full h-full group-hover:scale-105 transition-transform duration-500'
                    />
                    <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                      <Button
                        size='icon'
                        className='h-12 w-12 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform'
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handlePlayTrack(track);
                        }}
                      >
                        <Play className='h-6 w-6 ml-1 fill-current' />
                      </Button>
                    </div>
                  </div>
                  <div className='flex flex-col w-full'>
                    <h4 className='text-foreground font-semibold truncate text-base'>
                      {track.info?.title || 'Unknown Title'}
                    </h4>
                    <p className='text-sm text-muted-foreground truncate'>
                      {track.info?.author || 'Unknown Artist'}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}

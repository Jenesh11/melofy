'use client';

import { useState, useEffect } from 'react';
import { Search as SearchIcon, Loader2, X, Clock } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { TrackList, TrackItem } from '@/components/ui/TrackList';
import { TrackCarousel } from '@/components/home/TrackCarousel';
import { PlaylistGrid } from '@/components/home/PlaylistGrid';
import { useSpotifyCollection } from '@/hooks/useSpotifyCollection';
import { useAuth } from '@/lib/firebase/auth-context';
import { usePlayerStore } from '@/store/usePlayerStore';
import { addPlaylist } from '@/lib/firebase/playlists';
import { getFirebaseAuthHeaders } from '@/lib/firebase/client-auth';
import { toast } from 'sonner';
import type { SpotifyTrackLike } from '@/lib/track-mappers';

interface SpotifyPlaylistItem {
  id: string;
  name?: string;
  description?: string;
  images?: Array<{ url?: string }>;
  owner?: { display_name?: string };
  tracks?: { total?: number };
  type?: string;
}

import Image from 'next/image';

interface DetectedPlaylist {
  id: string;
  name: string;
  tracks: TrackItem[];
  source: string;
  spotifyId?: string;
  youtubeId?: string;
}

interface SpotifySearchResponse {
  tracks?: { items?: SpotifyTrackLike[] };
  playlists?: { items?: SpotifyPlaylistItem[] };
}

interface SearchHistoryItem {
  term: string;
  image?: string;
  type?: 'track' | 'playlist' | 'search';
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const debouncedQuery = useDebounce(query, 500);
  const [results, setResults] = useState<TrackItem[]>([]);
  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrackLike[]>([]);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylistItem[]>([]);
  const [detectedPlaylist, setDetectedPlaylist] = useState<DetectedPlaylist | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const playPlaylist = usePlayerStore((state) => state.playPlaylist);
  const { handlePlaySpotifyCollection } = useSpotifyCollection();
  const { user } = useAuth();
  const [isImporting, setIsImporting] = useState(false);

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

  const saveToHistory = (term: string, image?: string, type: 'track' | 'playlist' | 'search' = 'search') => {
    if (!term.trim()) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item.term.toLowerCase() !== term.toLowerCase());
      const newHistory = [{ term, image, type }, ...filtered].slice(0, 10);
      localStorage.setItem('melofy_search_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const removeFromHistory = (searchTerm: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory((prev) => {
      const newHistory = prev.filter((item) => item.term !== searchTerm);
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
        setDetectedPlaylist(null);
        return;
      }

      setLoading(true);
      try {
        const authHeaders = await getFirebaseAuthHeaders(user);

        const [ytRes, spotifyRes] = await Promise.allSettled([
          fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
            headers: authHeaders,
          }),
          fetch(
            `/api/spotify/search?q=${encodeURIComponent(
              debouncedQuery,
            )}&type=track,playlist`,
            {
              headers: authHeaders,
            },
          ),
        ]);

        let ytData: {
          loadType?: string;
          tracks?: Array<{
            encoded: string;
            info?: {
              identifier?: string;
              title?: string;
              author?: string;
              artworkUrl?: string;
              duration?: number;
              length?: number;
              sourceName?: string;
            };
          }>;
          playlistInfo?: { name?: string };
        } | null = null;
        if (ytRes.status === 'fulfilled' && ytRes.value.ok) {
          ytData = await ytRes.value.json();
        }

        let spotData: SpotifySearchResponse | null = null;
        if (spotifyRes.status === 'fulfilled' && spotifyRes.value.ok) {
          spotData = await spotifyRes.value.json();
        }

        if (spotData) {
          setSpotifyTracks(spotData.tracks?.items?.filter(Boolean).slice(0, 10) || []);
          setSpotifyPlaylists(spotData.playlists?.items?.filter(Boolean).slice(0, 10) || []);
        } else {
          setSpotifyTracks([]);
          setSpotifyPlaylists([]);
          setDetectedPlaylist(null);
          return;
        }

        if (ytData) {
          if (ytData.loadType === 'playlist' && ytData.tracks) {
            const mapped: TrackItem[] = ytData.tracks.map((track) => ({
              id: track.info?.identifier || 'unknown',
              identifier: track.info?.identifier || 'unknown',
              title: track.info?.title || 'Unknown Title',
              artist: track.info?.author || 'Unknown Artist',
              artworkUrl: track.info?.artworkUrl || '',
              duration: track.info?.duration || track.info?.length || 0,
              album: ytData.playlistInfo?.name || track.info?.author || '',
              encoded: track.encoded,
              source: track.info?.sourceName || 'youtube'
            }));
            setResults(mapped);
            setDetectedPlaylist({
              id: ytData.playlistInfo?.name || 'playlist',
              name: ytData.playlistInfo?.name || 'YouTube Playlist',
              tracks: mapped,
              source: mapped[0]?.source || 'youtube',
              spotifyId: debouncedQuery.match(/playlist[\/:]([a-zA-Z0-9]{22})/)?.[1] ||
                         debouncedQuery.match(/album[\/:]([a-zA-Z0-9]{22})/)?.[1] ||
                         (debouncedQuery.includes('spotify.com') ? debouncedQuery.match(/\/([a-zA-Z0-9]{22})/)?.[1] : undefined),
              youtubeId: debouncedQuery.match(/[&?]list=([a-zA-Z0-9_-]{18,34})/)?.[1]
            });
          } else if (ytData.tracks && ytData.tracks.length > 0) {
            const mapped: TrackItem[] = ytData.tracks
              .filter(Boolean)
              .map((track) => {
                const identifier = track.info?.identifier;
                return {
                  id: identifier || 'unknown',
                  identifier: identifier || 'unknown',
                  title: track.info?.title || 'Unknown Title',
                  artist: track.info?.author || 'Unknown Artist',
                  artworkUrl: track.info?.artworkUrl || '',
                  duration: track.info?.duration || track.info?.length || 0,
                  album: track.info?.author || '',
                  encoded: track.encoded,
                };
              });
            setResults(mapped);
            setDetectedPlaylist(null);
          } else {
            setDetectedPlaylist(null);
          }

          const firstResultImage = 
            spotData?.tracks?.items?.[0]?.album?.images?.[0]?.url || 
            spotData?.playlists?.items?.[0]?.images?.[0]?.url || 
            ytData?.tracks?.[0]?.info?.artworkUrl;

          saveToHistory(debouncedQuery, firstResultImage, 'search');
        } else {
          setResults([]);
          setDetectedPlaylist(null);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery, user]);

  const handleImportSpotifyPlaylist = async (playlist: SpotifyPlaylistItem) => {
    if (!user) return;
    setIsImporting(true);
    const toastId = toast.loading(`Importing ${playlist.name}...`);
    try {
      const authHeaders = await getFirebaseAuthHeaders(user);
      const res = await fetch(`/api/spotify/playlists/${playlist.id}`, { headers: authHeaders });
      
      if (!res.ok) throw new Error('Failed to fetch playlist details');
      
      const fullData = await res.json();
      const tracksForDb = (fullData.tracks || []).map((t: {
        id: string;
        name: string;
        artists?: Array<{ name: string }>;
        duration_ms?: number;
        album?: { images?: Array<{ url: string }> };
        external_ids?: { isrc?: string };
      }) => ({
        encoded: '', // Will be resolved on playback
        info: {
          identifier: t.id,
          title: t.name,
          author: t.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
          duration: t.duration_ms || 0,
          artworkUrl: t.album?.images?.[0]?.url || '',
          uri: `https://open.spotify.com/track/${t.id}`,
          sourceName: 'spotify',
          isSeekable: true,
          isStream: false,
          isrc: t.external_ids?.isrc || null
        }
      }));

      await addPlaylist(user.uid, {
        name: fullData.name,
        trackCount: fullData.trackCount || fullData.tracks?.length || 0,
        artworkUrl: fullData.artworkUrl || fullData.images?.[0]?.url,
        tracks: tracksForDb
      });
      
      toast.success('Playlist imported to your library!', { id: toastId });
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Failed to import playlist', { id: toastId });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportYoutubePlaylist = async () => {
    if (!user || !detectedPlaylist) return;
    setIsImporting(true);
    const toastId = toast.loading(`Importing ${detectedPlaylist.name}...`);
    try {
      const tracksForDb = detectedPlaylist.tracks.map((t) => ({
        encoded: t.encoded || '',
        info: {
          identifier: t.id,
          title: t.title,
          author: t.artist,
          duration: t.duration,
          artworkUrl: t.artworkUrl,
          uri: `https://www.youtube.com/watch?v=${t.id}`,
          sourceName: t.source || 'youtube',
          isSeekable: true,
          isStream: false
        }
      }));

      await addPlaylist(user.uid, {
        name: detectedPlaylist.name,
        trackCount: detectedPlaylist.tracks.length,
        artworkUrl: detectedPlaylist.tracks[0]?.artworkUrl,
        tracks: tracksForDb
      });
      toast.success('Playlist imported to your library!', { id: toastId });
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Failed to import playlist', { id: toastId });
    } finally {
      setIsImporting(false);
    }
  };

  const BROWSE_CATEGORIES = [
    { label: 'Chill',       sub: 'Ambient & Lo-fi',     query: 'chill lofi',        image: '/moods/chill.png' },
    { label: 'Focus',       sub: 'Deep Study Beats',   query: 'focus study beats',  image: '/moods/focus.png' },
    { label: 'Hype',        sub: 'Energy & Power',      query: 'hype workout',       image: '/moods/hype.png' },
    { label: 'Night Drive', sub: 'Synthwave Mood',      query: 'night drive synth',  image: '/moods/night_drive.png' },
    { label: 'Feel Good',   sub: 'Upbeat Anthems',      query: 'feel good pop',      image: '/moods/feel_good.png' },
    { label: 'Heartbreak',  sub: 'Emotional Melodies',  query: 'sad heartbreak',     image: '/moods/heartbreak.png' },
  ];

  return (
    <div className='p-4 md:p-8 h-full flex flex-col overflow-x-hidden'>
      {/* Search Input */}
      <div className='relative max-w-2xl mb-8'>
        <SearchIcon className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground' />
        <Input
          className='w-full h-14 pl-12 bg-card border-border text-foreground text-lg rounded-full focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground'
          placeholder='Search songs, artists, playlists…'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          // autoFocus intentionally omitted: SearchPage is always-mounted on mobile,
          // so autoFocus would open the keyboard even when this tab is hidden.
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className='absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all'
          >
            <X className='h-4 w-4' />
          </button>
        )}
      </div>

      <div className='flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-8'>
        {loading && (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        )}

        {/* Jump Back In — horizontal scroll, shown when idle + history exists */}
        {!query && !loading && searchHistory.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className='mb-10'
          >
            <div className='flex items-center justify-between mb-5 px-1'>
              <div>
                <p className='text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-1'>History</p>
                <h2 className='text-2xl font-bold text-foreground'>Jump Back In</h2>
              </div>
              <button
                onClick={clearHistory}
                className='text-xs text-muted-foreground hover:text-foreground transition-colors font-medium uppercase tracking-widest py-1 px-3 rounded-full hover:bg-foreground/5'
              >
                Clear All
              </button>
            </div>

            <div className='flex gap-4 overflow-x-auto pb-3 custom-scrollbar -mx-1 px-1 snap-x snap-mandatory'>
              {searchHistory.map((item, index) => (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  key={`history-${item.term}-${index}`}
                  onClick={() => setQuery(item.term)}
                  className='group relative shrink-0 w-52 h-32 rounded-2xl overflow-hidden cursor-pointer snap-start border border-white/5 hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:scale-[1.02]'
                >
                  {/* Background image */}
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.term}
                      fill
                      sizes="208px"
                      className='object-cover brightness-50 group-hover:brightness-65 group-hover:scale-110 transition-all duration-700'
                    />
                  ) : (
                    <div className='absolute inset-0 bg-linear-to-br from-zinc-800 to-zinc-900' />
                  )}

                  {/* Bottom gradient */}
                  <div className='absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent' />

                  {/* Delete button top-right */}
                  <button
                    onClick={(e) => removeFromHistory(item.term, e)}
                    className='absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/50 text-white/40 hover:text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-all scale-90 hover:scale-100 z-10'
                  >
                    <X className='h-3 w-3' />
                  </button>

                  {/* Content */}
                  <div className='absolute bottom-0 left-0 right-0 p-4'>
                    <p className='text-white font-bold text-sm leading-tight line-clamp-2 mb-2'>
                      {item.term}
                    </p>
                    <span className='inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/50 bg-white/10 rounded-full px-2 py-0.5'>
                      <Clock className='h-2.5 w-2.5' />
                      {item.type === 'playlist' ? 'Playlist' : item.type === 'track' ? 'Track' : 'Search'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Browse by Mood */}
        {!query && !loading && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className='mt-4'
          >
            <div className='flex items-center gap-3 mb-6'>
              <h2 className='text-3xl font-black text-foreground tracking-tight'>Browse by Mood</h2>
              <div className='h-px flex-1 bg-linear-to-r from-border to-transparent opacity-50' />
            </div>
            <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
              {BROWSE_CATEGORIES.map((cat) => (
                <motion.button
                  key={cat.query}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setQuery(cat.query)}
                  className='group relative h-32 md:h-40 rounded-3xl overflow-hidden border border-white/5 bg-zinc-900/50 shadow-xl transition-all duration-500'
                >
                  <Image 
                    src={cat.image} 
                    alt={cat.label} 
                    fill 
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className='object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700'
                  />
                  <div className='absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-500 group-hover:from-black/90' />
                  
                  <div className='absolute inset-0 p-6 flex flex-col justify-end'>
                    <span className='text-white font-black text-xl md:text-2xl tracking-tighter mb-1 drop-shadow-md'>
                      {cat.label}
                    </span>
                    <span className='text-white/60 text-xs md:text-sm font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300'>
                      {cat.sub}
                    </span>
                  </div>

                  {/* Glassmorphism accent */}
                  <div className='absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500'>
                    <div className='h-2 w-2 rounded-full bg-primary animate-pulse' />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.section>
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
              {detectedPlaylist && (
                <div className='mb-12'>
                  <div className='relative overflow-hidden rounded-[2.5rem] bg-zinc-900/40 border border-white/5 p-8 md:p-12 flex flex-col md:flex-row items-center gap-10 group'>
                    <div className='absolute inset-0 bg-linear-to-br from-primary/20 via-transparent to-transparent opacity-50' />
                    <div className='h-64 w-64 md:h-72 md:w-72 rounded-[2rem] shadow-2xl relative z-10 overflow-hidden shrink-0 border-4 border-white/5'>
                      <Image 
                        src={detectedPlaylist.tracks[0]?.artworkUrl || '/logo.png'} 
                        alt={detectedPlaylist.name}
                        width={300}
                        height={300}
                        className='h-full w-full object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000'
                      />
                    </div>
                    <div className='relative z-10 flex-1 text-center md:text-left'>
                      <span className='text-primary font-black tracking-[0.2em] text-[10px] md:text-xs uppercase mb-4 block'>
                        {detectedPlaylist.source === 'spotify' ? 'Spotify' : 'YouTube'} Playlist Identified
                      </span>
                      {detectedPlaylist.spotifyId ? (
                        <Link href={`/playlist/${detectedPlaylist.spotifyId}`}>
                          <h2 className='text-5xl md:text-6xl font-black text-white mb-6 tracking-tighter leading-none cursor-pointer hover:text-primary transition-colors'>
                            {detectedPlaylist.name}
                          </h2>
                        </Link>
                      ) : detectedPlaylist.youtubeId ? (
                        <Link href={`/playlist/youtube:${detectedPlaylist.youtubeId}`}>
                          <h2 className='text-5xl md:text-6xl font-black text-white mb-6 tracking-tighter leading-none cursor-pointer hover:text-primary transition-colors'>
                            {detectedPlaylist.name}
                          </h2>
                        </Link>
                      ) : (
                        <h2 className='text-5xl md:text-6xl font-black text-white mb-6 tracking-tighter leading-none'>
                          {detectedPlaylist.name}
                        </h2>
                      )}
                      <div className='flex flex-wrap items-center gap-4 justify-center md:justify-start'>
                        <Button 
                          onClick={() => {
                            const tracksToPlay = detectedPlaylist.tracks.map((t) => ({
                              id: t.id,
                              title: t.title,
                              artist: t.artist,
                              artworkUrl: t.artworkUrl,
                              duration: t.duration,
                              url: t.encoded,
                              identifier: t.id
                            }));
                            playPlaylist(tracksToPlay);
                          }}
                          className='h-16 px-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/30'
                        >
                          Play Instantly
                        </Button>
                        <Button
                          variant='outline'
                          disabled={isImporting}
                          className='h-16 px-10 rounded-full border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-xl backdrop-blur-xl'
                          onClick={handleImportYoutubePlaylist}
                        >
                          {isImporting ? 'Importing...' : 'Import to Library'}
                        </Button>
                        <span className='text-zinc-500 font-bold text-lg ml-2'>
                          {detectedPlaylist.tracks.length} Tracks
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {spotifyTracks.length > 0 && (
                <TrackCarousel title='Top Tracks' tracks={spotifyTracks} />
              )}

              {spotifyPlaylists.length > 0 && (
                <PlaylistGrid
                  title='Featured Playlists'
                  items={spotifyPlaylists}
                  isCarousel={true}
                  onPlayPlaylist={handlePlaySpotifyCollection}
                  onImport={handleImportSpotifyPlaylist}
                />
              )}

              {results.length > 0 && (
                <div className='mt-8'>
                  <h3 className='text-3xl font-bold text-foreground mb-6 flex items-center gap-3'>
                    More Audio Results
                    <span className='h-px flex-1 bg-border hidden md:block' />
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

'use client';

import { Search, User, X, Loader2, Play, PlusCircle, ListPlus } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/firebase/auth-context';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { usePlayerStore } from '@/store/usePlayerStore';
import { getFirebaseAuthHeaders } from '@/lib/firebase/client-auth';
import { toast } from 'sonner';

interface LavalinkTrack {
  encoded: string;
  info: {
    identifier: string;
    title: string;
    author: string;
    artworkUrl?: string;
    duration: number;
    length?: number;
    sourceName?: string;
  };
}

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const playTrack = usePlayerStore((state) => state.play);
  const playInContext = usePlayerStore((state) => state.playInContext);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const queue = usePlayerStore((state) => state.queue);
  const currentTrack = usePlayerStore((state) => state.currentTrack);

  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<LavalinkTrack[]>([]);
  const [loading, setLoading] = useState(false);
  
  const debouncedQuery = useDebounce(query, 500);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    const fetchResults = async () => {
      setLoading(true);
      try {
        const authHeaders = await getFirebaseAuthHeaders(user);
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
          headers: authHeaders,
        });
        if (res.ok) {
          const ytData = await res.json();
          const tracksList = ytData?.tracks || ytData?.data || (Array.isArray(ytData) ? ytData : []);
          if (tracksList && tracksList.length > 0) {
            setResults(tracksList.slice(0, 8)); // Top 8 results
          } else {
            setResults([]);
          }
        }
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [debouncedQuery, user, authLoading]);

  const mapTrack = (track: LavalinkTrack) => ({
    id: track.info?.identifier || 'unknown',
    identifier: track.info?.identifier || 'unknown',
    title: track.info?.title || 'Unknown Title',
    artist: track.info?.author || 'Unknown Artist',
    artworkUrl: track.info?.artworkUrl || '',
    duration: track.info?.duration || track.info?.length || 0,
    album: track.info?.author || '',
    encoded: track.encoded,
  });

  const handleTrackClick = (track: LavalinkTrack) => {
    const mappedTrack = mapTrack(track);
    const allMappedTracks = results.map((t) => mapTrack(t));
    playInContext(mappedTrack, allMappedTracks, true);
    setIsFocused(false);
    setQuery('');
    if (inputRef.current) inputRef.current.blur();
  };

  const handleAddToQueue = (e: React.MouseEvent, track: LavalinkTrack) => {
    e.stopPropagation();
    const mappedTrack = mapTrack(track);
    if (!currentTrack) {
      setQueue([mappedTrack]);
      playTrack(mappedTrack, true);
    } else {
      setQueue([...queue, mappedTrack]);
    }
    setIsFocused(false);
    setQuery('');
    if (inputRef.current) inputRef.current.blur();

    toast('Added to Queue', {
      className: 'bg-primary text-primary-foreground border-none shadow-2xl',
      description: (
        <div className="flex items-center gap-2 mt-1">
          {mappedTrack.artworkUrl && (
            <img
              // eslint-disable-next-line @next/next/no-img-element
              src={mappedTrack.artworkUrl}
              alt=""
              className="h-8 w-8 rounded-md object-cover shadow-md brightness-90"
            />
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs truncate opacity-90">{mappedTrack.title}</span>
          </div>
        </div>
      ),
      icon: <ListPlus className="h-4 w-4" />,
      duration: 2500,
    });
  };

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      setIsFocused(false);
      if (inputRef.current) inputRef.current.blur();
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className='h-16 flex items-center justify-between px-6 bg-background/60 backdrop-blur-3xl border-b border-border transition-all duration-300'>
      <div className='flex items-center gap-4 flex-1'>
        {/* Mobile Logo (only shown on search page where topbar search is hidden) */}
        {pathname === '/search' && (
          <Link
            href='/'
            className='flex md:hidden items-center gap-2 hover:opacity-80 transition-opacity'
          >
            <div className='h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 relative'>
              <Image
                src='/logo.png'
                alt='Melofy Logo'
                width={32}
                height={32}
                className='h-full w-full object-contain'
              />
            </div>
            <span className='text-lg font-bold tracking-tight text-foreground'>
              Melofy
            </span>
          </Link>
        )}

        {/* Search Bar with Live Dropdown */}
        {pathname !== '/search' && (
          <div
            ref={dropdownRef}
            className='relative max-w-full md:max-w-[450px] w-full flex-1'
          >
            <div className='relative group'>
              <div className='absolute inset-y-0 left-3 flex items-center pointer-events-none'>
                <Search className='h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-focus-within:text-foreground transition-colors' />
              </div>
              <input
                ref={inputRef}
                type='text'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onKeyDown={handleSearchSubmit}
                placeholder='What do you want to play?'
                className='h-10 md:h-12 w-full bg-muted/80 focus:bg-muted hover:bg-muted border border-border/50 focus:border-border transition-colors rounded-full flex items-center pl-9 md:pl-11 pr-10 text-xs md:text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none'
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    if (inputRef.current) inputRef.current.focus();
                  }}
                  className='absolute inset-y-0 right-3 flex items-center justify-center text-muted-foreground hover:text-foreground'
                >
                  <X className='h-4 w-4 md:h-5 md:w-5' />
                </button>
              )}
            </div>

            {/* Dropdown */}
            {isFocused && (query.trim() || loading) && (
              <div className='absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden z-100 max-h-[60vh] overflow-y-auto custom-scrollbar'>
                {loading && results.length === 0 ? (
                  <div className='flex items-center justify-center p-8'>
                    <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
                  </div>
                ) : results.length > 0 ? (
                  <div className='flex flex-col py-2'>
                    {results.map((track, i) => (
                      <div
                        key={`${track.info?.identifier}-${i}`}
                        onClick={() => handleTrackClick(track)}
                        className='flex items-center gap-3 w-full p-2 hover:bg-muted/50 transition-colors text-left group/item cursor-pointer'
                      >
                        <div className='h-10 w-10 shrink-0 rounded-md overflow-hidden relative bg-muted flex items-center justify-center'>
                          {track.info?.artworkUrl ? (
                            <Image
                              src={track.info.artworkUrl}
                              alt={track.info.title || 'Track'}
                              fill
                              className='object-cover'
                            />
                          ) : (
                            <Play className='h-4 w-4 text-muted-foreground' />
                          )}
                          <div className='absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center'>
                            <Play className='h-4 w-4 text-white fill-white' />
                          </div>
                        </div>
                        <div className='flex-1 min-w-0 flex flex-col justify-center pr-2'>
                          <p className='text-sm font-medium text-foreground truncate'>
                            {track.info?.title}
                          </p>
                          <p className='text-xs text-muted-foreground truncate'>
                            {track.info?.sourceName === 'youtube' && track.info?.title?.toLowerCase().includes('video') ? 'Music video' : 'Song'} • {track.info?.author}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleAddToQueue(e, track)}
                          className='p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0'
                          title='Add to queue'
                        >
                          <PlusCircle className='h-5 w-5' />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : query.trim() && !loading ? (
                  <div className='p-6 text-center text-sm text-muted-foreground'>
                    No results found for &quot;{query}&quot;
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      <div className='flex items-center gap-4'>
        <Link href='/settings'>
          <Button
            variant='ghost'
            className='h-10 rounded-full px-3 py-2 bg-card/40 hover:bg-card hover:scale-105 transition-all text-foreground font-medium border border-border/50 hover:border-border flex items-center gap-2'
          >
            <span className='hidden sm:block text-sm mr-1 truncate max-w-[120px]'>
              {user?.displayName || 'Settings'}
            </span>
            <div className='h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 relative'>
              {user?.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt='Profile'
                  width={28}
                  height={28}
                  referrerPolicy='no-referrer'
                  className='h-full w-full rounded-full object-cover'
                />
              ) : (
                <User className='h-4 w-4 text-muted-foreground' />
              )}
            </div>
          </Button>
        </Link>
      </div>
    </div>
  );
}

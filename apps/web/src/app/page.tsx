'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { motion } from 'framer-motion';
import {
  Play,
  Sparkles,
  TrendingUp,
  Clock,
  Disc,
  Headphones,
  Music2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingPage } from '@/components/layout/LandingPage';
import { TrackCarousel } from '@/components/home/TrackCarousel';
import { PlaylistGrid } from '@/components/home/PlaylistGrid';
import { usePlayerStore } from '@/store/usePlayerStore';
import { toast } from 'sonner';
import Link from 'next/link';
import { HeroPlaylistCard } from '@/components/home/HeroPlaylistCard';
import { HistoryCarousel } from '@/components/home/HistoryCarousel';
import { useSpotifyCollection } from '@/hooks/useSpotifyCollection';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const {
    history,
    play,
    currentTrack,
    isPlaying,
    pause,
    resume,
    playPlaylist,
  } = usePlayerStore();

  const [trending, setTrending] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [mixes, setMixes] = useState<any[]>([]);
  const [popularPlaylists, setPopularPlaylists] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  const { handlePlaySpotifyCollection } = useSpotifyCollection();

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        setIsFetching(true);
        const [trendRes, newRes, mixRes, popularRes] = await Promise.all([
          fetch('/api/spotify/trending'),
          fetch('/api/spotify/new-releases'),
          fetch('/api/spotify/mixes'),
          fetch('/api/spotify/popular-playlists'),
        ]);

        if (trendRes.ok) setTrending(await trendRes.json());
        if (newRes.ok) setNewReleases(await newRes.json());
        if (mixRes.ok) setMixes(await mixRes.json());
        if (popularRes.ok) setPopularPlaylists(await popularRes.json());

        // Use genre-based smart search for recommendations (Spotify /recommendations was deprecated Nov 2024)
        const genres = ['pop', 'hip-hop', 'r&b', 'indie', 'electronic', 'soul'];
        const randomGenre = genres[Math.floor(Math.random() * genres.length)];
        const recRes = await fetch(
          `/api/spotify/recommendations?genre=${randomGenre}`,
        );
        if (recRes.ok) setRecommendations(await recRes.json());
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Show a blank screen while checking auth
  if (loading) return <div className='min-h-screen bg-background' />;

  // Display the detailed Landing Page if not logged in
  if (!user) {
    return <LandingPage />;
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  };

  const greeting = getGreeting();

  return (
    <div className='p-4 md:p-8 flex flex-col gap-10 overflow-x-hidden min-h-screen'>
      <header className='flex flex-col gap-2'>
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className='text-primary font-bold tracking-widest text-xs uppercase'
        >
          Welcome back
        </motion.p>
        <motion.h1
          animate={{ opacity: 1, x: 0 }}
          className='text-4xl md:text-5xl font-bold text-foreground tracking-tight'
        >
          {user?.displayName
            ? `${greeting}, ${user.displayName.split(' ')[0]}`
            : greeting}
        </motion.h1>
      </header>

      <section className='relative group/hero'>
        <div className='flex items-center justify-between mb-6 px-1'>
          <h2 className='text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px]'>
            Featured Collections
          </h2>
          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 rounded-full border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 transition-colors opacity-0 group-hover/hero:opacity-100'
              onClick={() => {
                const el = document.getElementById('hero-scroll');
                if (el) el.scrollBy({ left: -400, behavior: 'smooth' });
              }}
            >
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 rounded-full border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 transition-colors opacity-0 group-hover/hero:opacity-100'
              onClick={() => {
                const el = document.getElementById('hero-scroll');
                if (el) el.scrollBy({ left: 400, behavior: 'smooth' });
              }}
            >
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
        </div>

        <div
          id='hero-scroll'
          className='flex overflow-x-auto gap-6 pb-4 custom-scrollbar snap-x snap-mandatory scroll-smooth relative'
        >
          {popularPlaylists.slice(0, 8).map((playlist, i) => (
            <HeroPlaylistCard
              key={playlist.id + i}
              playlist={playlist}
              index={i}
              onPlay={handlePlaySpotifyCollection}
            />
          ))}
        </div>
      </section>

      {isFetching ? (
        <div className='flex flex-col items-center justify-center py-32 gap-6 pb-24'>
          <Loader2 className='h-10 w-10 text-primary animate-spin' />
          <p className='text-muted-foreground font-medium animate-pulse text-lg tracking-wide'>
            Curating your experience...
          </p>
        </div>
      ) : (
        <div className='flex flex-col gap-10 pb-24'>
          {/* Jump Back In (History) */}
          <HistoryCarousel
            history={history}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onPlay={play}
            onPause={pause}
            onResume={resume}
          />

          <PlaylistGrid
            title='Popular Playlists'
            items={popularPlaylists}
            onPlayPlaylist={handlePlaySpotifyCollection}
          />

          {/* Trending section with clickable title */}
          <section className='mt-8'>
            <div className='flex items-center justify-between mb-6'>
              <Link href='/trending' className='group flex items-center gap-2'>
                <h3 className='text-3xl font-bold text-foreground group-hover:text-primary transition-colors'>
                  Trending Right Now
                </h3>
                <ChevronRight className='h-6 w-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all' />
              </Link>
              <Link href='/trending'>
                <Button
                  variant='ghost'
                  className='text-muted-foreground hover:text-foreground text-xs uppercase tracking-widest'
                >
                  See all
                </Button>
              </Link>
            </div>
            {/* Render TrackCarousel content inline but without its own title */}
            <TrackCarousel
              title=''
              tracks={trending.map((item: any) => item.track).filter(Boolean)}
              onPlayAll={() => {
                const tracks = trending.map((item: any) => ({
                  id: item.track?.id || item.id,
                  title: item.track?.name || item.name,
                  artist:
                    item.track?.artists?.map((a: any) => a.name).join(', ') ||
                    '',
                  artworkUrl: item.track?.album?.images?.[0]?.url || '',
                  duration: item.track?.duration_ms || 0,
                  url: '',
                }));
                playPlaylist(tracks);
              }}
            />
          </section>

          <TrackCarousel
            title='Because You Like Music'
            tracks={recommendations}
            onPlayAll={() => {
              const tracks = recommendations.map((t: any) => ({
                id: t.id,
                title: t.name,
                artist: t.artists?.map((a: any) => a.name).join(', ') || '',
                artworkUrl: t.album?.images?.[0]?.url || '',
                duration: t.duration_ms || 0,
                url: '',
              }));
              playPlaylist(tracks);
            }}
          />
          <PlaylistGrid
            title='New Releases'
            items={newReleases}
            isAlbum={true}
            onPlayPlaylist={handlePlaySpotifyCollection}
          />
          <PlaylistGrid
            title='Your Curated Mixes'
            items={mixes}
            onPlayPlaylist={handlePlaySpotifyCollection}
          />
        </div>
      )}
    </div>
  );
}

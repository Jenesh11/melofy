'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { motion } from 'framer-motion';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingPage } from '@/components/layout/LandingPage';
import { TrackCarousel } from '@/components/home/TrackCarousel';
import { PlaylistGrid } from '@/components/home/PlaylistGrid';
import { usePlayerStore } from '@/store/usePlayerStore';
import Link from 'next/link';
import { HeroPlaylistCard } from '@/components/home/HeroPlaylistCard';
import { HistoryCarousel } from '@/components/home/HistoryCarousel';
import { useSpotifyCollection } from '@/hooks/useSpotifyCollection';
import { getFirebaseAuthHeaders } from '@/lib/firebase/client-auth';
import {
  mapSpotifyTrackToPlayerTrack,
  type SpotifyTrackLike,
} from '@/lib/track-mappers';
import { useHomeStore } from '@/store/useHomeStore';

export default function Home() {
  const { user, loading } = useAuth();
  const history = usePlayerStore((state) => state.history);
  const play = usePlayerStore((state) => state.play);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const pause = usePlayerStore((state) => state.pause);
  const resume = usePlayerStore((state) => state.resume);
  const playPlaylist = usePlayerStore((state) => state.playPlaylist);

  const {
    trending,
    newReleases,
    recommendations,
    mixes,
    popularPlaylists,
    discoveryMixes,
    hasFetched,
    setTrending,
    setNewReleases,
    setRecommendations,
    setMixes,
    setPopularPlaylists,
    setDiscoveryMixes,
    setHasFetched,
  } = useHomeStore();
  const [isFetching, setIsFetching] = useState(!hasFetched);

  const { handlePlaySpotifyCollection } = useSpotifyCollection();

  const trendingTracks = useMemo(
    () =>
      trending
        .map((item) => item.track)
        .filter((track): track is SpotifyTrackLike => Boolean(track)),
    [trending],
  );

  const trendingTracksToPlay = useMemo(
    () => trendingTracks.map((track) => mapSpotifyTrackToPlayerTrack(track)),
    [trendingTracks],
  );

  const recommendationTracksToPlay = useMemo(
    () => recommendations.map((track) => mapSpotifyTrackToPlayerTrack(track)),
    [recommendations],
  );

  const newReleasesAsTracks = useMemo(() => {
    return newReleases.map(album => ({
      id: album.id,
      name: album.name,
      artists: album.owner ? [{ name: album.owner.display_name }] : [{ name: 'Unknown' }],
      album: album,
    } as SpotifyTrackLike));
  }, [newReleases]);

  const newReleasesTracksToPlay = useMemo(
    () => newReleasesAsTracks.map((track) => mapSpotifyTrackToPlayerTrack(track)),
    [newReleasesAsTracks],
  );

  const handlePlayTrending = useCallback(() => {
    playPlaylist(trendingTracksToPlay);
  }, [playPlaylist, trendingTracksToPlay]);

  const handlePlayRecommendations = useCallback(() => {
    playPlaylist(recommendationTracksToPlay);
  }, [playPlaylist, recommendationTracksToPlay]);

  const handlePlayNewReleases = useCallback(() => {
    playPlaylist(newReleasesTracksToPlay);
  }, [playPlaylist, newReleasesTracksToPlay]);

  useEffect(() => {
    if (!user) return;
    if (hasFetched) {
      setIsFetching(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setIsFetching(true);
        const authHeaders = await getFirebaseAuthHeaders(user);

        const [trendRes, newRes, mixRes, popularRes] = await Promise.all([
          fetch('/api/spotify/trending', { headers: authHeaders }),
          fetch('/api/spotify/new-releases', { headers: authHeaders }),
          fetch('/api/spotify/mixes', { headers: authHeaders }),
          fetch('/api/spotify/popular-playlists', { headers: authHeaders }),
        ]);

        if (trendRes.ok) setTrending(await trendRes.json());
        if (newRes.ok) setNewReleases(await newRes.json());
        if (mixRes.ok) setMixes(await mixRes.json());
        if (popularRes.ok) setPopularPlaylists(await popularRes.json());

        // Fetch Discovery Mixes based on history
        if (history.length > 0) {
          const artists = history.map(t => t.artist).filter(Boolean);
          const discRes = await fetch('/api/spotify/discovery', {
            method: 'POST',
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ artists }),
          });
          if (discRes.ok) setDiscoveryMixes(await discRes.json());
        }

        const genres = ['pop', 'hip-hop', 'r&b', 'indie', 'electronic', 'soul'];
        const randomGenre = genres[Math.floor(Math.random() * genres.length)];
        const recRes = await fetch(
          `/api/spotify/recommendations?genre=${randomGenre}`,
          { headers: authHeaders },
        );

        if (recRes.ok) setRecommendations(await recRes.json());
        
        setHasFetched(true);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsFetching(false);
      }
    };

    void fetchDashboardData();
  }, [user, hasFetched, history, setTrending, setNewReleases, setMixes, setPopularPlaylists, setDiscoveryMixes, setRecommendations, setHasFetched]);

  if (loading) return <div className='min-h-screen bg-background' />;

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
                const element = document.getElementById('hero-scroll');
                if (element) element.scrollBy({ left: -400, behavior: 'smooth' });
              }}
            >
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 rounded-full border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 transition-colors opacity-0 group-hover/hero:opacity-100'
              onClick={() => {
                const element = document.getElementById('hero-scroll');
                if (element) element.scrollBy({ left: 400, behavior: 'smooth' });
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
          {popularPlaylists.slice(0, 8).map((playlist, index) => (
            <HeroPlaylistCard
              key={playlist.id + index}
              playlist={playlist}
              index={index}
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
          <HistoryCarousel
            history={history}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onPlay={play}
            onPause={pause}
            onResume={resume}
          />

          {discoveryMixes.length > 0 && (
            <PlaylistGrid
              title='Made For You'
              items={discoveryMixes}
              onPlayPlaylist={handlePlaySpotifyCollection}
            />
          )}

          <PlaylistGrid
            title='Popular Playlists'
            items={popularPlaylists}
            onPlayPlaylist={handlePlaySpotifyCollection}
          />

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
            <TrackCarousel
              title=''
              tracks={trendingTracks}
              onPlayAll={handlePlayTrending}
            />
          </section>

          <TrackCarousel
            title='Because You Like Music'
            tracks={recommendations}
            onPlayAll={handlePlayRecommendations}
          />

          <TrackCarousel
            title='New Releases'
            tracks={newReleasesAsTracks}
            onPlayAll={handlePlayNewReleases}
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

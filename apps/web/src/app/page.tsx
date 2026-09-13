'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingPage } from '@/components/layout/LandingPage';
import { TrackCarousel } from '@/components/home/TrackCarousel';
import { PlaylistGrid } from '@/components/home/PlaylistGrid';
import { usePlayerStore } from '@/store/usePlayerStore';
import Link from 'next/link';
import { HeroPlaylistCard } from '@/components/home/HeroPlaylistCard';
import { useSpotifyCollection } from '@/hooks/useSpotifyCollection';
import { useHomeDiscovery } from '@/hooks/useHomeDiscovery';
import {
  mapSpotifyTrackToPlayerTrack,
  type SpotifyTrackLike,
} from '@/lib/track-mappers';
import { useHomeStore } from '@/store/useHomeStore';
import { useLibraryStore } from '@/store/useLibraryStore';

export default function Home() {
  const { user, loading } = useAuth();
  const history = usePlayerStore((state) => state.history);
  const playPlaylist = usePlayerStore((state) => state.playPlaylist);

  const {
    userId: homeUserId,
    trending,
    newReleases,
    recommendations,
    mixes,
    editorsPicks,
    discoveryMixes,
    featuredPlaylists,
  } = useHomeStore();
  const { isFetching, refresh, unavailable, genre, language, setGenre, setLanguage } = useHomeDiscovery();

  const { handlePlayCollection, handleImportSpotifyPlaylist } = useSpotifyCollection();
  const recentPlaylists = useLibraryStore((state) => state.recentPlaylists) || [];

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
    return newReleases as SpotifyTrackLike[];
  }, [newReleases]);

  const newReleasesTracksToPlay = useMemo(
    () => newReleasesAsTracks.map((track) => mapSpotifyTrackToPlayerTrack(track)),
    [newReleasesAsTracks],
  );

  const uniqueHistory = useMemo(() => {
    return Array.from(new Map(history.map((item) => [item.title, item])).values())
      .reverse()
      .slice(0, 10);
  }, [history]);

  const handlePlayTrending = useCallback(() => {
    playPlaylist(trendingTracksToPlay);
  }, [playPlaylist, trendingTracksToPlay]);

  const handlePlayRecommendations = useCallback(() => {
    playPlaylist(recommendationTracksToPlay);
  }, [playPlaylist, recommendationTracksToPlay]);

  const handlePlayNewReleases = useCallback(() => {
    playPlaylist(newReleasesTracksToPlay);
  }, [playPlaylist, newReleasesTracksToPlay]);

  // Autoplay carousel scroll
  const isHoveredRef = useRef(false);

  useEffect(() => {
    if (featuredPlaylists.length <= 1) return;

    const intervalId = setInterval(() => {
      const container = document.getElementById('hero-scroll');
      if (!container || isHoveredRef.current) return;

      const firstCard = container.firstElementChild as HTMLElement;
      if (!firstCard) return;

      // Card width plus the gap-6 (24px)
      const scrollAmount = firstCard.clientWidth + 24;
      const maxScrollLeft = container.scrollWidth - container.clientWidth;

      // If we are near the end, loop back smoothly to the beginning
      if (container.scrollLeft >= maxScrollLeft - 30) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }, 4000); // Scroll every 4 seconds for an immersive carousel experience

    return () => clearInterval(intervalId);
  }, [featuredPlaylists]);

  if (loading) return <div className='min-h-screen bg-background' />;

  if (!user) {
    return <LandingPage />;
  }

  if (homeUserId !== user.uid) return <div className='p-4'><HomePageSkeleton /></div>;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  };

  const greeting = getGreeting();

  return (
    <div className='p-4 md:p-4 flex flex-col gap-10 overflow-x-hidden'>
      <header className='flex flex-col gap-2'>
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className='text-primary font-semibold text-sm'
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

      <div className='flex flex-wrap items-center gap-3'>
        <label className='text-sm'>Genre <select aria-label='Discovery genre' className='ml-2 rounded-md border bg-background p-2' value={genre} onChange={e => setGenre(e.target.value)}>
          {['pop', 'rock', 'indie', 'hip-hop', 'r&b', 'electronic', 'acoustic', 'jazz', 'classical', 'lofi'].map(value => <option key={value}>{value}</option>)}
        </select></label>
        <label className='text-sm'>Language <select aria-label='Discovery language' className='ml-2 rounded-md border bg-background p-2' value={language} onChange={e => setLanguage(e.target.value)}>
          {['all', 'English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Punjabi', 'Spanish', 'Korean', 'Japanese'].map(value => <option key={value} value={value}>{value === 'all' ? 'Any language' : value}</option>)}
        </select></label>
        <Button variant='outline' onClick={refresh} disabled={isFetching}>Refresh discovery</Button>
        {unavailable.length > 0 && <p role='status' className='text-sm text-muted-foreground'>Some music is temporarily unavailable. You can retry with Refresh discovery.</p>}
      </div>
      {isFetching && !recommendations.length && !trending.length ? (
        <HomePageSkeleton />
      ) : (
        <>
          {featuredPlaylists.length > 0 && <section className='relative group/hero'>
            <div className='flex items-center justify-between mb-6 px-1'>
              <h2 className='text-zinc-500 font-bold uppercase tracking-wider text-[10px]'>
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
              onMouseEnter={() => { isHoveredRef.current = true; }}
              onMouseLeave={() => { isHoveredRef.current = false; }}
              className='flex overflow-x-auto gap-6 pb-4 carousel-scrollbar snap-x snap-mandatory scroll-smooth relative'
            >
              {featuredPlaylists.slice(0, 8).map((playlist, index) => (
                <HeroPlaylistCard
                  key={playlist.id + index}
                  playlist={playlist}
                  index={index}
                  onPlay={handlePlayCollection}
                />
              ))}
            </div>
          </section>}

          <div className='flex flex-col gap-10'>
            {uniqueHistory.length > 0 && (
              <TrackCarousel
                title="Jump Back In"
                tracks={uniqueHistory}
                className='mt-0'
              />
            )}

            {recentPlaylists.length > 0 && (
              <PlaylistGrid
                title="Recent Playlists"
                items={recentPlaylists.map(p => ({
                  id: p.id,
                  name: p.name,
                  images: [{ url: p.artworkUrl }],
                  type: p.type,
                  tracks: { total: p.trackCount }
                }))}
                isCarousel={true}
                onPlayPlaylist={handlePlayCollection}
                className='mt-0'
              />
            )}

            {discoveryMixes.length > 0 && (
              <PlaylistGrid
                title='Made For You'
                items={discoveryMixes}
                onPlayPlaylist={handlePlayCollection}
                onImport={handleImportSpotifyPlaylist}
                className='mt-0'
              />
            )}

            <PlaylistGrid
              title='Explore More'
              items={editorsPicks}
              onPlayPlaylist={handlePlayCollection}
              onImport={handleImportSpotifyPlaylist}
              className='mt-0'
            />

            <section className='mt-0'>
              <div className='flex items-center justify-between mb-6'>
                <Link href='/trending' className='group flex items-center gap-2'>
                  <h3 className='text-3xl font-bold text-foreground group-hover:text-primary transition-colors'>
                    Popular Discoveries
                  </h3>
                  <ChevronRight className='h-6 w-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all' />
                </Link>
                <Link href='/trending'>
                  <Button
                    variant='ghost'
                    className='text-muted-foreground hover:text-foreground text-xs font-semibold'
                  >
                    See all
                  </Button>
                </Link>
              </div>
              <TrackCarousel
                title=''
                tracks={trendingTracks}
                onPlayAll={handlePlayTrending}
                className='mt-0'
              />
            </section>

            <TrackCarousel
              title='Recommended For You'
              tracks={recommendations}
              onPlayAll={handlePlayRecommendations}
              className='mt-0'
            />

            <TrackCarousel
              title='Fresh Finds'
              tracks={newReleasesAsTracks}
              onPlayAll={handlePlayNewReleases}
              className='mt-0'
            />

            <PlaylistGrid
              title='Your Curated Mixes'
              items={mixes}
              onPlayPlaylist={handlePlayCollection}
              onImport={handleImportSpotifyPlaylist}
              className='mt-0'
            />
          </div>
        </>
      )}
    </div>
  );
}

function HomePageSkeleton() {
  return (
    <div className='flex flex-col gap-10 animate-pulse'>
      {/* Featured Collections Skeleton */}
      <section className='relative'>
        <div className='flex items-center justify-between mb-6 px-1'>
          <div className='h-3.5 w-36 bg-zinc-200 dark:bg-zinc-800/60 rounded' />
        </div>
        <div className='flex overflow-x-auto gap-6 pb-4 carousel-scrollbar snap-x snap-mandatory relative'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className='shrink-0 w-[82vw] max-w-[320px] md:max-w-none md:w-[500px] h-[220px] md:h-[300px] rounded-[2rem] md:rounded-[2.5rem] bg-zinc-200 dark:bg-zinc-800/60 border border-border/10 p-4 md:p-6 flex gap-4 md:gap-6 items-center'
            >
              <div className='shrink-0 w-24 h-24 md:w-[185px] md:h-[185px] rounded-2xl md:rounded-[1.75rem] bg-zinc-200 dark:bg-zinc-800/60' />
              <div className='flex-1 flex flex-col justify-between h-full py-2 md:py-4 min-w-0'>
                <div className='min-w-0'>
                  <div className='h-5 md:h-7 w-3/4 bg-zinc-200 dark:bg-zinc-800/60 rounded-md mt-1 md:mt-2.5' />
                  <div className='h-3 w-5/6 bg-zinc-200 dark:bg-zinc-800/60 rounded mt-2.5' />
                  <div className='h-3 w-2/3 bg-zinc-200 dark:bg-zinc-800/60 rounded mt-1.5' />
                </div>
                <div className='flex items-center justify-between gap-2 mt-2'>
                  <div className='h-3.5 w-20 bg-zinc-200 dark:bg-zinc-800/60 rounded' />
                  <div className='h-8 w-8 md:h-11 md:w-11 rounded-full bg-zinc-200 dark:bg-zinc-800/60' />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Grid of Playlist Skeletons */}
      <section className='mt-8'>
        <div className='h-8 w-48 bg-zinc-200 dark:bg-zinc-800/60 rounded mb-6' />
        <div className='grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-6'>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className='flex flex-col gap-3'>
              <div className='aspect-square rounded-[2rem] bg-zinc-200 dark:bg-zinc-800/60 shadow-xl' />
              <div className='flex flex-col gap-2 mt-2 px-1'>
                <div className='h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800/60 rounded' />
                <div className='h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800/60 rounded' />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Carousel of Track Skeletons */}
      <section className='mt-8'>
        <div className='h-8 w-56 bg-zinc-200 dark:bg-zinc-800/60 rounded mb-6' />
        <div className='flex overflow-x-auto gap-6 pb-6 carousel-scrollbar'>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className='flex flex-col gap-3 min-w-[140px] w-[140px] sm:min-w-[160px] sm:w-[160px] md:min-w-[180px] md:w-[180px] shrink-0'>
              <div className='aspect-square rounded-[2.5rem] bg-zinc-200 dark:bg-zinc-800/60 shadow-lg' />
              <div className='flex flex-col gap-2 px-2 mt-2'>
                <div className='h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800/60 rounded' />
                <div className='h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800/60 rounded' />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

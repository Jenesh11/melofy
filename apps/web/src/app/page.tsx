'use client';

import { useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { motion } from 'framer-motion';
import { LandingPage } from '@/components/layout/LandingPage';
import { TrackCarousel } from '@/components/home/TrackCarousel';
import { PlaylistGrid } from '@/components/home/PlaylistGrid';
import { usePlayerStore } from '@/store/usePlayerStore';
import { DiscoveryControls } from '@/components/home/DiscoveryControls';
import { FeaturedSpotlight } from '@/components/home/FeaturedSpotlight';
import { QuickPicks } from '@/components/home/QuickPicks';
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

  const firstName = user?.displayName?.split(' ')[0];

  return (
    <div className='flex flex-col gap-9 md:gap-11 overflow-x-hidden px-4 pb-10 pt-2 md:px-8'>
      <header className='flex flex-col gap-4'>
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className='text-[2rem] font-extrabold leading-tight text-foreground md:text-[2.75rem]'
        >
          {firstName ? `${greeting}, ${firstName}` : greeting}
        </motion.h1>
        <DiscoveryControls {...{ genre, language, isFetching, unavailable, setGenre, setLanguage, refresh }} />
      </header>

      {isFetching && !recommendations.length && !trending.length ? (
        <HomePageSkeleton />
      ) : (
        <>
          {uniqueHistory.length > 0 && <QuickPicks tracks={uniqueHistory} />}

          {featuredPlaylists.length > 0 && (
            <FeaturedSpotlight
              items={featuredPlaylists}
              onPlay={handlePlayCollection}
              onSave={handleImportSpotifyPlaylist}
            />
          )}

          <TrackCarousel
            title='Recommended For You'
            subtitle='Tuned by what you play, like and skip'
            tracks={recommendations}
            onPlayAll={handlePlayRecommendations}
          />

          {discoveryMixes.length > 0 && (
            <PlaylistGrid
              title='Made For You'
              subtitle='Mixes built around artists you love'
              items={discoveryMixes}
              isCarousel
              onPlayPlaylist={handlePlayCollection}
              onImport={handleImportSpotifyPlaylist}
            />
          )}

          {recentPlaylists.length > 0 && (
            <PlaylistGrid
              title='Recent Playlists'
              items={recentPlaylists.map(p => ({
                id: p.id,
                name: p.name,
                images: [{ url: p.artworkUrl }],
                type: p.type,
                tracks: { total: p.trackCount },
              }))}
              isCarousel
              onPlayPlaylist={handlePlayCollection}
            />
          )}

          <TrackCarousel
            title='Popular Discoveries'
            subtitle='What listeners are playing right now'
            href='/trending'
            tracks={trendingTracks}
            onPlayAll={handlePlayTrending}
          />

          <TrackCarousel
            title='Fresh Finds'
            subtitle='New music in your genre'
            tracks={newReleasesAsTracks}
            onPlayAll={handlePlayNewReleases}
          />

          <PlaylistGrid
            title='Your Curated Mixes'
            items={mixes}
            isCarousel
            onPlayPlaylist={handlePlayCollection}
            onImport={handleImportSpotifyPlaylist}
          />

          <PlaylistGrid
            title='Explore More'
            items={editorsPicks}
            isCarousel
            onPlayPlaylist={handlePlayCollection}
            onImport={handleImportSpotifyPlaylist}
          />
        </>
      )}
    </div>
  );
}

function HomePageSkeleton() {
  const block = 'rounded-lg bg-foreground/[0.06]';
  return (
    <div aria-hidden className='flex flex-col gap-10 animate-pulse'>
      <div className='grid grid-cols-2 gap-2 lg:grid-cols-3 2xl:grid-cols-4'>
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className={`h-14 md:h-16 ${block}`} />)}
      </div>
      <div className='h-[168px] rounded-2xl bg-foreground/[0.06] sm:h-[224px] md:h-[272px]' />
      {Array.from({ length: 2 }).map((_, row) => (
        <div key={row} className='flex flex-col gap-4'>
          <div className={`h-6 w-48 ${block}`} />
          <div className='flex gap-4 overflow-hidden'>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className='flex w-[136px] shrink-0 flex-col gap-2 md:w-[184px]'>
                <div className={`aspect-square ${block}`} />
                <div className={`h-3.5 w-3/4 ${block}`} />
                <div className={`h-3 w-1/2 ${block}`} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

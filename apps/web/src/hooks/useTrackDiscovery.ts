import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useShallow } from 'zustand/react/shallow';
import { useAuth } from '@/lib/firebase/auth-context';

export function useTrackDiscovery() {
  const { user } = useAuth();
  const [isBuffering, setIsBuffering] = useState(false);
  const [isFetchingAutoplay, setIsFetchingAutoplay] = useState(false);
  const pendingTrackResolutionRef = useRef<Map<string, Promise<void>>>(new Map());

  const {
    currentTrack,
    isAutoplay,
    play,
    updateTrackUrl,
  } = usePlayerStore(useShallow((state) => ({
    currentTrack: state.currentTrack,
    isAutoplay: state.isAutoplay,
    play: state.play,
    updateTrackUrl: state.updateTrackUrl,
  })));

  const getAuthHeader = useCallback(async () => {
    if (!user) return null;
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [user]);

  // URL resolution for Spotify/Metatracks
  useEffect(() => {
    let cancelled = false;
    const resolveMissingUrl = async () => {
      if (!currentTrack || currentTrack.url) return;
      const activeResolution = pendingTrackResolutionRef.current.get(currentTrack.id);
      if (activeResolution) return;

      const resolutionPromise = (async () => {
        setIsBuffering(true);
        try {
          const searchQuery = `${currentTrack.title} ${currentTrack.artist}`;
          const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
            headers: (await getAuthHeader()) || {},
          });
          const data = await res.json();
          if (cancelled || !data?.tracks?.length) return;
          const found = data.tracks[0];
          if (!found?.encoded) return;
          updateTrackUrl(currentTrack.id, found.encoded, found.info.identifier);
        } catch (error) {
          console.error('[TrackResolution] Failed:', error);
        } finally {
          pendingTrackResolutionRef.current.delete(currentTrack.id);
          if (!cancelled) setIsBuffering(false);
        }
      })();
      pendingTrackResolutionRef.current.set(currentTrack.id, resolutionPromise);
    };
    void resolveMissingUrl();
    return () => { cancelled = true; };
  }, [currentTrack, getAuthHeader, updateTrackUrl]);

  // Autoplay Trigger
  const triggerAutoplay = useCallback(async () => {
    if (!isAutoplay || !currentTrack || isFetchingAutoplay) return;
    setIsFetchingAutoplay(true);
    try {
      const params = new URLSearchParams();
      if (currentTrack.id) params.append('spotifyId', currentTrack.id);
      if (currentTrack.identifier) params.append('videoId', currentTrack.identifier);
      params.append('query', `${currentTrack.title} ${currentTrack.artist}`);

      const res = await fetch(`/api/recommendations?${params.toString()}`, {
        headers: (await getAuthHeader()) || {},
      });
      const data = await res.json() as { tracks?: { id: string; title: string; encoded: string; artist: string; artwork: string; duration: number }[] };
      if (!data?.tracks?.length) return;

      const nextTrackData = data.tracks.find(
        (track) => 
          track.id !== currentTrack.identifier && 
          track.title.toLowerCase() !== currentTrack.title.toLowerCase()
      ) || data.tracks[0];
      
      if (!nextTrackData) return;
      play({
        id: nextTrackData.id,
        identifier: nextTrackData.id,
        title: nextTrackData.title,
        artist: nextTrackData.artist,
        artworkUrl: nextTrackData.artwork,
        duration: nextTrackData.duration,
        url: nextTrackData.encoded,
      });
    } catch (error) {
      console.error('[Autoplay] Failed:', error);
    } finally {
      setIsFetchingAutoplay(false);
    }
  }, [currentTrack, getAuthHeader, isAutoplay, isFetchingAutoplay, play]);

  return { isBuffering, setIsBuffering, triggerAutoplay };
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore, type Track } from '@/store/usePlayerStore';
import { useAuth } from '@/lib/firebase/auth-context';
import { useHomeStore } from '@/store/useHomeStore';
import { useLikedStore } from '@/store/useLikedStore';
import { libraryToTrack, recommendationToTrack, seedMetadata, type RecommendationTrack } from '@/lib/discovery';
import { toast } from 'sonner';

export function useTrackDiscovery() {
  const { user } = useAuth();
  const [isBuffering, setIsBuffering] = useState(false);
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const resolutionRef = useRef<AbortController | null>(null);
  const autoplayRef = useRef<AbortController | null>(null);
  const getAuthHeader = useCallback(async () => {
    if (!user) throw new Error('Please sign in');
    return { Authorization: 'Bearer ' + await user.getIdToken() };
  }, [user]);

  useEffect(() => {
    if (!currentTrack || currentTrack.url || !user) return;
    const controller = new AbortController();
    resolutionRef.current = controller;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
    async function resolve() {
      let success = false;
      try {
        const headers = await getAuthHeader();
        if (controller.signal.aborted) return;
        setIsBuffering(true);
        const response = await fetch('/api/search?q=' + encodeURIComponent(currentTrack!.title + ' ' + currentTrack!.artist), { headers, signal: controller.signal });
        if (!response.ok) throw new Error('Track search failed');
        const data = await response.json();
        if (controller.signal.aborted || usePlayerStore.getState().currentTrack !== currentTrack) return;
        const tracks = (data?.tracks || data?.data || (Array.isArray(data) ? data : [])) as Array<{ id?: string; duration?: number; encoded?: string; info?: { identifier?: string; duration?: number; length?: number } }>;
        const found = Array.isArray(tracks) ? tracks.find(t => t?.encoded) : undefined;
        if (found?.encoded) {
          usePlayerStore.getState().updateTrackUrl(currentTrack!.id, found.encoded, found.info?.identifier || found.id, found.info?.duration || found.info?.length || found.duration);
          success = true;
        }
      } catch { /* Report only if this request still owns the active track. */ }
      finally {
        clearTimeout(timeout);
        if (resolutionRef.current === controller) {
          setIsBuffering(false);
          if (!success && (!controller.signal.aborted || timedOut) && usePlayerStore.getState().currentTrack === currentTrack) {
            const state = usePlayerStore.getState();
            if (state.partyId && !state.isPartyHost) { toast.error('Track unavailable. Waiting for the host.'); state.pause(true); }
            else { toast.error('This track is unavailable. Skipping...'); state.playNext(true, true); }
          }
        }
      }
    }
    void resolve();
    return () => { controller.abort(); clearTimeout(timeout); if (resolutionRef.current === controller) { resolutionRef.current = null; setIsBuffering(false); } };
  }, [currentTrack, user, getAuthHeader]);

  useEffect(() => () => { autoplayRef.current?.abort(); resolutionRef.current?.abort(); }, [user]);

  const triggerAutoplay = useCallback(async (seed: Track) => {
    const snapshot = usePlayerStore.getState();
    if (!user || !snapshot.isAutoplay || snapshot.currentTrack || snapshot.queue.length || (snapshot.partyId && !snapshot.isPartyHost)) return;
    autoplayRef.current?.abort();
    const controller = new AbortController();
    autoplayRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 25000);
    const stillCurrent = () => {
      const state = usePlayerStore.getState();
      return !controller.signal.aborted && state.playbackRevision === snapshot.playbackRevision && !state.currentTrack && !state.queue.length && state.isAutoplay && state.partyId === snapshot.partyId && (!state.partyId || state.isPartyHost);
    };
    const unsubscribe = usePlayerStore.subscribe(() => { if (!stillCurrent()) controller.abort(); });
    try {
      const headers = await getAuthHeader();
      if (!stillCurrent()) return;
      const likes = useLikedStore.getState();
      const response = await fetch('/api/recommendations', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ genre: useHomeStore.getState().genre, language: useHomeStore.getState().language, seed: seedMetadata(seed), history: snapshot.history.slice(-50).map(seedMetadata), liked: likes.userId === user.uid ? likes.likedTracks.slice(-50).map(libraryToTrack).map(seedMetadata) : [] }) });
      if (!response.ok) throw new Error('Radio is temporarily unavailable');
      const data = await response.json() as { tracks?: RecommendationTrack[] };
      if (!stillCurrent()) return;
      const recentIds = new Set([...snapshot.history.slice(-20), seed].flatMap(t => [t.id, t.identifier]));
      const next = data.tracks?.find(t => !recentIds.has(t.id) && !(t.title.toLowerCase() === seed.title.toLowerCase() && t.artist.toLowerCase() === seed.artist.toLowerCase()));
      if (!next) { toast.info('No fresh recommendations found. Try another song or mix.'); return; }
      unsubscribe();
      usePlayerStore.getState().play(recommendationToTrack(next));
    } catch { if (stillCurrent()) toast.error('Radio is temporarily unavailable. Try another song.'); }
    finally { clearTimeout(timeout); unsubscribe(); if (autoplayRef.current === controller) autoplayRef.current = null; }
  }, [user, getAuthHeader]);
  return { isBuffering, setIsBuffering, triggerAutoplay };
}

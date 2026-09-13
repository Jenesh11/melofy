import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getFirebaseAuthHeaders } from '@/lib/firebase/client-auth';
import { useHomeStore } from '@/store/useHomeStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useLikedStore } from '@/store/useLikedStore';
import { libraryToTrack, seedMetadata } from '@/lib/discovery';

const sections = ['trending', 'newReleases', 'recommendations', 'mixes', 'editorsPicks', 'discoveryMixes', 'featuredPlaylists'] as const;

export function useHomeDiscovery() {
  const { user } = useAuth();
  const genre = useHomeStore(s => s.genre);
  const language = useHomeStore(s => s.language);
  const setGenre = useHomeStore(s => s.setGenre);
  const setLanguage = useHomeStore(s => s.setLanguage);
  const hasFetched = useHomeStore(s => s.hasFetched);
  const [revision, setRevision] = useState(0);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const history = usePlayerStore(s => s.history);
  const likedTracks = useLikedStore(s => s.likedTracks);
  const likedUser = useLikedStore(s => s.userId);
  const owner = useHomeStore(s => s.userId);
  const unavailable = useHomeStore(s => s.unavailable);
  const refresh = useCallback(() => setRevision(v => v + 1), []);

  useEffect(() => {
    if (!user) { useHomeStore.getState().resetForUser(null); return; }
    if (useHomeStore.getState().userId !== user.uid) useHomeStore.getState().resetForUser(user.uid);
    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const uid = user.uid;
    async function fetchSections(requested: readonly string[] = sections, attempt = 0) {
      try {
        const headers = await getFirebaseAuthHeaders(user!);
        if (controller.signal.aborted) return;
        setPendingUser(uid);
        const response = await fetch('/api/discovery/home', {
          method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]),
          body: JSON.stringify({ history: history.slice(-50).map(seedMetadata),
            liked: likedUser === uid ? likedTracks.slice(-50).map(libraryToTrack).map(seedMetadata) : [], genre, language, sections: requested }),
        });
        if (!response.ok) throw new Error('Discovery unavailable');
        const data = await response.json();
        if (controller.signal.aborted || useHomeStore.getState().userId !== uid) return;
        const failed = requested.filter(key => !Array.isArray(data[key]) || data.unavailable?.includes(key));
        const patch: Record<string, unknown> = {};
        for (const key of sections) if (requested.includes(key) && Array.isArray(data[key])) patch[key] = data[key];
        useHomeStore.setState({ ...patch, hasFetched: failed.length === 0, unavailable: [...failed] });
        if (failed.length && attempt < 2) retryTimer = setTimeout(() => { void fetchSections(failed, attempt + 1); }, 3000 * (attempt + 1));
      } catch {
        if (!controller.signal.aborted && useHomeStore.getState().userId === uid) {
          useHomeStore.setState({ hasFetched: false, unavailable: [...requested] });
          if (attempt < 2) retryTimer = setTimeout(() => { void fetchSections(requested, attempt + 1); }, 3000 * (attempt + 1));
        }
      } finally {
        if (!controller.signal.aborted) setPendingUser(null);
      }
    }
    void fetchSections();
    return () => { controller.abort(); if (retryTimer) clearTimeout(retryTimer); };
  }, [user, history, likedTracks, likedUser, genre, language, revision]);

  return { genre, language, setGenre, setLanguage, refresh, unavailable,
    isFetching: !!user && (owner !== user.uid || pendingUser === user.uid || (!hasFetched && unavailable.length === 0)) };
}

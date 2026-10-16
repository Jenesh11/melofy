import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/firebase/auth-context';
import { buildStreamUrl } from '@/lib/streamUrl';
import { usePlayerStore } from '@/store/usePlayerStore';

interface StreamSession {
  id: string;
  encoded: string;
  controller: AbortController;
  failures: number;
  pending: Promise<string | null> | null;
}

/** A failed stream belongs to one selection. Never consume the queue to recover it. */
export function useTrackStream() {
  const { user } = useAuth();
  const trackId = usePlayerStore(state => state.currentTrack?.id);
  const encoded = usePlayerStore(state => state.currentTrack?.url);
  const sessionRef = useRef<StreamSession | null>(null);
  const requestNumber = useRef(0);
  const [source, setSource] = useState<{ url: string; id: string; encoded: string; uid: string; issuedAt: number } | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  const owns = useCallback((session: StreamSession) => {
    const current = usePlayerStore.getState().currentTrack;
    return sessionRef.current === session && !session.controller.signal.aborted && current?.id === session.id && current?.url === session.encoded;
  }, []);

  const refreshStreamSrc = useCallback((): Promise<string | null> => {
    const session = sessionRef.current;
    if (!session || !user || !owns(session)) return Promise.resolve(null);
    if (session.pending) return session.pending;
    const request = async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const url = await buildStreamUrl(session.encoded, user, session.controller.signal);
          if (!url || !owns(session)) return null;
          // Even if a cached ticket is returned, force a real load instead of
          // play() on an already failed media resource.
          const fresh = new URL(url);
          fresh.searchParams.set('attempt', `${Date.now()}-${++requestNumber.current}`);
          const result = fresh.toString();
          setSource({ url: result, id: session.id, encoded: session.encoded, uid: user.uid, issuedAt: Date.now() });
          return result;
        } catch (error) {
          if (!owns(session)) return null;
          if (attempt === 2) throw error;
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
          if (!owns(session)) return null;
        }
      }
      return null;
    };
    session.pending = request().finally(() => { session.pending = null; });
    return session.pending;
  }, [user, owns]);

  const stopWithError = useCallback((session: StreamSession) => {
    if (!owns(session)) return;
    const state = usePlayerStore.getState();
    state.pause(true);
    setIsRecovering(false);
    toast.error(`Couldn’t play "${state.currentTrack?.title || 'this track'}". Your queue is unchanged. Try Play again.`, { id: 'playback-error' });
  }, [owns]);

  useEffect(() => {
    if (!trackId || !encoded || !user) { sessionRef.current = null; return; }
    const session: StreamSession = { id: trackId, encoded, controller: new AbortController(), failures: 0, pending: null };
    sessionRef.current = session;
    void refreshStreamSrc().catch(() => stopWithError(session)).finally(() => { if (owns(session)) setIsRecovering(false); });
    return () => { session.controller.abort(); };
  }, [trackId, encoded, user, refreshStreamSrc, stopWithError, owns]);

  const recoverStream = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || !owns(session) || session.pending) return;
    if (session.failures >= 2) { stopWithError(session); return; }
    session.failures++;
    setIsRecovering(true);
    try { await refreshStreamSrc(); }
    catch { stopWithError(session); }
    finally { if (owns(session)) setIsRecovering(false); }
  }, [owns, refreshStreamSrc, stopWithError]);

  const retryStream = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || !owns(session)) return null;
    session.failures = 0;
    try { return await refreshStreamSrc(); }
    catch { stopWithError(session); return null; }
  }, [owns, refreshStreamSrc, stopWithError]);

  const matches = source?.id === trackId && source?.encoded === encoded && source?.uid === user?.uid;
  return {
    streamSrc: matches ? source?.url : undefined,
    streamSrcIssuedAt: matches ? source?.issuedAt : 0,
    streamTrackId: user && encoded ? trackId : undefined,
    // Remount on selection/account changes so queued events from detached audio
    // elements cannot be interpreted as the newly selected song's events.
    mediaKey: `${user?.uid || ''}:${trackId || ''}:${encoded || ''}`,
    isRecovering: matches && isRecovering,
    refreshStreamSrc: retryStream,
    recoverStream,
  };
}

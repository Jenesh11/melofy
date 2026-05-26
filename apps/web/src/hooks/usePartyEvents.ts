import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { usePlayerStore, Track, PartyListener } from '@/store/usePlayerStore';
import { toast } from 'sonner';

interface RemotePlaybackState {
  type: 'play_track' | 'pause' | 'resume' | 'seek' | 'sync';
  track?: Track;
  time?: number;
  isPlaying?: boolean;
}

interface PartyEventsProps {
  socket: Socket | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  currentTrack: Track | null;
  isPlaying: boolean;
  isHydrated: boolean;
  userUid?: string;
  syncStateToServer: () => Promise<void>;
}

interface JoinPartyResponse {
  ok: boolean;
  isHost?: boolean;
  initialState?: {
    hostName?: string;
    currentTrack?: Track | null;
    isPlaying?: boolean;
    listenersCanControl?: boolean;
    listeners?: PartyListener[];
  };
}

export function usePartyEvents({
  socket,
  audioRef,
  currentTrack,
  isPlaying,
  isHydrated,
  userUid,
  syncStateToServer,
}: PartyEventsProps) {
  const lastReceivedTrackRef = useRef<string | null>(null);
  const prevPartyIdRef = useRef<string | null>(null);
  const hasAttemptedRejoin = useRef(false);
  const pendingSyncTimeRef = useRef<number | null>(null);

  // Incoming socket events
  useEffect(() => {
    if (!socket) return;

    const handlePlaybackState = (data: RemotePlaybackState) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (data.type === 'play_track' && data.track) {
        lastReceivedTrackRef.current = data.track.id;
        usePlayerStore.getState().play(data.track, true);
        if (typeof data.time === 'number') {
          if (audio.readyState >= 1) {
            audio.currentTime = data.time;
          } else {
            pendingSyncTimeRef.current = data.time;
          }
        }
      } else if (data.type === 'pause') {
        usePlayerStore.getState().pause(true);
        if (typeof data.time === 'number') {
          if (audio.readyState >= 1) {
            audio.currentTime = data.time;
          } else {
            pendingSyncTimeRef.current = data.time;
          }
        }
      } else if (data.type === 'resume') {
        usePlayerStore.getState().resume(true);
        if (typeof data.time === 'number') {
          if (audio.readyState >= 1) {
            audio.currentTime = data.time;
          } else {
            pendingSyncTimeRef.current = data.time;
          }
        }
      } else if (data.type === 'seek' && typeof data.time === 'number') {
        if (audio.readyState >= 1) {
          audio.currentTime = data.time;
        } else {
          pendingSyncTimeRef.current = data.time;
        }
      } else if (data.type === 'sync' && typeof data.time === 'number') {
        const activeTrack = usePlayerStore.getState().currentTrack;
        // Auto-heal track desync if host's track is different
        if (data.track && (!activeTrack || activeTrack.id !== data.track.id)) {
          console.log(`[JamSync] Auto-healing track desync. Loading host track: ${data.track.title}`);
          lastReceivedTrackRef.current = data.track.id;
          usePlayerStore.getState().play(data.track, true);
        }

        if (audio.readyState >= 1) {
          const drift = Math.abs(audio.currentTime - data.time);
          if (drift > 0.6) {
            console.log(`[JamSync] Re-aligning drift of ${drift.toFixed(2)}s`);
            audio.currentTime = data.time;
          }
        } else {
          pendingSyncTimeRef.current = data.time;
        }
        if (data.isPlaying && audio.paused) {
          usePlayerStore.getState().resume(true);
        } else if (!data.isPlaying && !audio.paused) {
          usePlayerStore.getState().pause(true);
        }
      }
    };

    const handleListenerControl = (data: { canControl: boolean }) =>
      usePlayerStore.getState().setListenersCanControl(data.canControl);

    const handleListenersUpdate = (data: { listeners: PartyListener[] }) =>
      usePlayerStore.getState().setPartyListeners(data.listeners);

    const handleListenerJoined = (data: { username: string }) => {
      toast.success(`${data.username} joined the session`);
      
      // Host immediately broadcasts a sync state to align the joining user instantly
      const freshTrack = usePlayerStore.getState().currentTrack;
      if (socket && usePlayerStore.getState().isPartyHost && audioRef.current) {
        socket.emit('playback_state', {
          type: 'sync',
          time: audioRef.current.currentTime || 0,
          isPlaying: !audioRef.current.paused,
          track: freshTrack || undefined,
        });
      }
    };

    const handleListenerLeft = (data: { username: string }) =>
      toast.info(`${data.username} left the session`);

    const handlePartyEnded = () => {
      usePlayerStore.getState().clearParty();
      toast.info('The session has ended.');
    };

    socket.on('playback_state', handlePlaybackState);
    socket.on('listener_control_updated', handleListenerControl);
    socket.on('listeners_update', handleListenersUpdate);
    socket.on('listener_joined', handleListenerJoined);
    socket.on('listener_left', handleListenerLeft);
    socket.on('party_ended', handlePartyEnded);

    return () => {
      socket.off('playback_state', handlePlaybackState);
      socket.off('listener_control_updated', handleListenerControl);
      socket.off('listeners_update', handleListenersUpdate);
      socket.off('listener_joined', handleListenerJoined);
      socket.off('listener_left', handleListenerLeft);
      socket.off('party_ended', handlePartyEnded);
    };
  }, [socket, audioRef]);

  // Handle seeking once audio metadata has finished loading (HAVE_METADATA readyState)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const applyPendingSync = () => {
      if (pendingSyncTimeRef.current !== null) {
        console.log(`[JamSync] Applying pending start time: ${pendingSyncTimeRef.current}s`);
        audio.currentTime = pendingSyncTimeRef.current;
        pendingSyncTimeRef.current = null;
      }
    };

    audio.addEventListener('loadedmetadata', applyPendingSync);
    audio.addEventListener('canplay', applyPendingSync);

    return () => {
      audio.removeEventListener('loadedmetadata', applyPendingSync);
      audio.removeEventListener('canplay', applyPendingSync);
    };
  }, [audioRef, currentTrack]);

  // Outgoing socket events
  useEffect(() => {
    const audio = audioRef.current;
    if (socket && currentTrack) {
      if (lastReceivedTrackRef.current === currentTrack.id) {
        lastReceivedTrackRef.current = null;
        return;
      }

      // Guard: If we are in a party but don't have control permissions, don't emit anything!
      const state = usePlayerStore.getState();
      const canControl = state.isPartyHost || state.listenersCanControl;
      if (state.partyId && !canControl) {
        return;
      }

      socket.emit('playback_state', {
        type: 'play_track',
        track: currentTrack,
        time: audio?.currentTime || 0,
      });
    }
  }, [currentTrack, socket, audioRef]);

  // Host initial sync
  const partyId = usePlayerStore((state) => state.partyId);
  const isPartyHost = usePlayerStore((state) => state.isPartyHost);

  useEffect(() => {
    const audio = audioRef.current;
    if (isPartyHost && partyId && partyId !== prevPartyIdRef.current && socket && currentTrack) {
      prevPartyIdRef.current = partyId;
      socket.emit('playback_state', {
        type: 'play_track',
        track: currentTrack,
        time: audio?.currentTime || 0,
      });
      if (isPlaying) {
        socket.emit('playback_state', {
          type: 'resume',
          time: audio?.currentTime || 0,
        });
      }
    }
  }, [isPartyHost, partyId, socket, currentTrack, isPlaying, audioRef]);

  // Rejoin party helper
  const rejoinParty = useCallback(() => {
    if (!socket || !partyId || !isHydrated) return;

    console.log(`[JamSync] Rejoining party ${partyId}...`);
    let isHandled = false;
    const timeout = setTimeout(() => {
      if (!isHandled) {
        console.warn('[JamSync] Rejoin timed out, clearing party state.');
        usePlayerStore.getState().clearParty();
      }
    }, 5000);

    socket.emit('join_party', partyId, (response: JoinPartyResponse) => {
      isHandled = true;
      clearTimeout(timeout);
      if (response?.ok && response.initialState) {
        console.log(`[JamSync] Successfully rejoined party ${partyId}.`);
        usePlayerStore.getState().setParty(partyId, !!response.isHost, response.initialState.hostName);
        usePlayerStore.getState().setListenersCanControl(!!response.initialState.listenersCanControl);
        if (response.initialState.listeners) {
          usePlayerStore.getState().setPartyListeners(response.initialState.listeners);
        }
      } else {
        console.warn('[JamSync] Rejoin rejected, clearing party state:', response?.error);
        usePlayerStore.getState().clearParty();
      }
    });
  }, [socket, partyId, isHydrated]);

  // Handle rejoining on socket connection/reconnection events
  useEffect(() => {
    if (!socket || !partyId || !isHydrated) return;

    const handleConnect = () => {
      console.log('[JamSync] Socket connected, triggering rejoin.');
      rejoinParty();
    };

    socket.on('connect', handleConnect);
    
    // If socket is already connected when this effect runs, trigger rejoin immediately
    if (socket.connected) {
      rejoinParty();
    }

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [socket, partyId, isHydrated, rejoinParty]);

  // Automatically notify server when leaving a party or unmounting
  useEffect(() => {
    const activePartyId = usePlayerStore.getState().partyId;
    return () => {
      if (socket && activePartyId) {
        console.log(`[JamSync] Unmounting or leaving party ${activePartyId}. Emitting leave_party.`);
        socket.emit('leave_party');
      }
    };
  }, [socket, partyId]);

  // Heartbeat sync (periodically align listeners to host timeline)
  useEffect(() => {
    if (!userUid || !isHydrated || !isPlaying) return;
    const intervalId = setInterval(() => {
      if (!audioRef.current || audioRef.current.paused) return;
      syncStateToServer();
      if (socket && usePlayerStore.getState().isPartyHost) {
        socket.emit('playback_state', {
          type: 'sync',
          time: audioRef.current.currentTime || 0,
          isPlaying: true,
          track: currentTrack || undefined,
        });
      }
    }, 3000); // Increased frequency to 3 seconds for extremely high-fidelity synchronization
    return () => clearInterval(intervalId);
  }, [userUid, isHydrated, isPlaying, syncStateToServer, socket, audioRef, currentTrack]);
}

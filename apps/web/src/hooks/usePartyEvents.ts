import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { usePlayerStore, Track, PartyListener } from '@/store/usePlayerStore';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { NativePlayer } from '@/lib/capacitor/NativePlayer';

const SYNC_RULES = {
  heartbeatIntervalMs: 4000,
  minEmitIntervalMs: 1200,
  hardSeekForwardDriftSec: 5,
  hardSeekBackwardDriftSec: 10,
  forcedSyncDriftSec: 0.5,
  softCorrectionDriftSec: 0.75,
  settledDriftSec: 0.25,
  correctionRateMaxDelta: 0.06,
  correctionRateDriftFactor: 0.015,
  maxClockProjectionSec: 5,
  staleSyncToleranceMs: 250,
} as const;

type SyncReason =
  | 'host_heartbeat'
  | 'listener_joined'
  | 'host_started'
  | 'track_changed'
  | 'rejoin';

interface RemotePlaybackState {
  type: 'play_track' | 'pause' | 'resume' | 'seek';
  track?: Track;
  time?: number;
  sentAt?: number;
  serverSentAt?: number;
}

interface RemoteSyncState {
  track?: Track;
  time: number;
  isPlaying?: boolean;
  sentAt?: number;
  reason?: SyncReason;
  seq?: number;
  serverSentAt?: number;
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
    currentTime?: number;
    isPlaying?: boolean;
    listenersCanControl?: boolean;
    listeners?: PartyListener[];
  };
  error?: string;
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
  const pendingSyncTimeRef = useRef<number | null>(null);
  const lastSyncEmitAtRef = useRef(0);
  const syncSequenceRef = useRef(0);
  const lastAppliedSyncEventAtRef = useRef(0);
  const lastAppliedSyncTrackIdRef = useRef<string | null>(null);

  const getSafeTime = useCallback((time: unknown) => {
    return typeof time === 'number' && Number.isFinite(time) && time >= 0 ? time : 0;
  }, []);

  const resetPartySyncState = useCallback(() => {
    lastReceivedTrackRef.current = null;
    pendingSyncTimeRef.current = null;
    lastSyncEmitAtRef.current = 0;
    syncSequenceRef.current = 0;
    lastAppliedSyncEventAtRef.current = 0;
    lastAppliedSyncTrackIdRef.current = null;
  }, []);

  const getProjectedRemoteTime = useCallback((data: RemotePlaybackState | RemoteSyncState) => {
    const baseTime = getSafeTime(data.time);
    const shouldProject = 'isPlaying' in data
      ? data.isPlaying !== false
      : 'type' in data && (data.type === 'play_track' || data.type === 'resume');
    const timestamp = data.serverSentAt || data.sentAt;
    if (!shouldProject || !timestamp || !Number.isFinite(timestamp)) {
      return baseTime;
    }

    const elapsedSeconds = Math.max(
      0,
      Math.min((Date.now() - timestamp) / 1000, SYNC_RULES.maxClockProjectionSec),
    );
    return baseTime + elapsedSeconds;
  }, [getSafeTime]);

  const getCorrectionRate = useCallback((signedDrift: number, absDrift: number) => {
    const delta = Math.min(
      SYNC_RULES.correctionRateMaxDelta,
      Math.max(0.02, absDrift * SYNC_RULES.correctionRateDriftFactor),
    );
    return Number((signedDrift > 0 ? 1 + delta : 1 - delta).toFixed(2));
  }, []);

  const getPlaybackSnapshot = useCallback(() => {
    const audio = audioRef.current;
    const state = usePlayerStore.getState();
    const isNative = Capacitor.isNativePlatform();
    const time = isNative ? state.progress / 1000 : audio?.currentTime ?? state.progress / 1000;
    const paused = isNative ? !state.isPlaying : audio?.paused ?? !state.isPlaying;

    return {
      time: Number.isFinite(time) && time >= 0 ? time : 0,
      isPlaying: !paused,
      track: state.currentTrack,
    };
  }, [audioRef]);

  const emitHostSync = useCallback((reason: SyncReason, force = false, timeOverride?: number) => {
    const state = usePlayerStore.getState();
    if (!socket || !state.partyId || !state.isPartyHost) return;

    const now = Date.now();
    if (!force && now - lastSyncEmitAtRef.current < SYNC_RULES.minEmitIntervalMs) {
      return;
    }

    const snapshot = getPlaybackSnapshot();
    lastSyncEmitAtRef.current = now;
    syncSequenceRef.current += 1;

    socket.emit('sync_state', {
      time: typeof timeOverride === 'number' ? getSafeTime(timeOverride) : snapshot.time,
      isPlaying: snapshot.isPlaying,
      track: snapshot.track || undefined,
      sentAt: now,
      reason,
      seq: syncSequenceRef.current,
    } satisfies RemoteSyncState);
  }, [getPlaybackSnapshot, getSafeTime, socket]);

  const applyRemoteTime = useCallback((time: number) => {
    const safeTime = Number.isFinite(time) && time >= 0 ? time : 0;
    usePlayerStore.setState({ progress: Math.floor(safeTime * 1000) });

    if (Capacitor.isNativePlatform()) {
      NativePlayer.seekTo({ time: safeTime }).catch(console.error);
      return true;
    }

    const audio = audioRef.current;
    if (!audio) return false;
    if (audio.readyState >= 1) {
      audio.currentTime = safeTime;
      return true;
    }

    pendingSyncTimeRef.current = safeTime;
    return false;
  }, [audioRef]);

  useEffect(() => {
    if (!socket) return;

    const handlePlaybackState = (data: RemotePlaybackState) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (data.type === 'play_track' && data.track) {
        lastReceivedTrackRef.current = data.track.id;
        usePlayerStore.getState().play(data.track, true);
        if (audio) audio.playbackRate = 1.0;
        applyRemoteTime(getProjectedRemoteTime(data));
      } else if (data.type === 'pause') {
        usePlayerStore.getState().pause(true);
        if (typeof data.time === 'number') {
          applyRemoteTime(getProjectedRemoteTime(data));
        }
      } else if (data.type === 'resume') {
        usePlayerStore.getState().resume(true);
        if (typeof data.time === 'number') {
          applyRemoteTime(getProjectedRemoteTime(data));
        }
      } else if (data.type === 'seek' && typeof data.time === 'number') {
        applyRemoteTime(getProjectedRemoteTime(data));
      }
    };

    const handleSyncState = (data: RemoteSyncState) => {
      const audio = audioRef.current;
      if (!audio || typeof data.time !== 'number') return;

      const activeTrack = usePlayerStore.getState().currentTrack;
      const incomingTrackId = data.track?.id ?? activeTrack?.id ?? null;
      const eventAt = data.serverSentAt || data.sentAt || 0;
      if (
        eventAt &&
        incomingTrackId &&
        lastAppliedSyncTrackIdRef.current === incomingTrackId &&
        eventAt + SYNC_RULES.staleSyncToleranceMs < lastAppliedSyncEventAtRef.current
      ) {
        console.log(`[JamSync] Ignoring stale sync for ${incomingTrackId}.`);
        return;
      }
      if (eventAt && incomingTrackId) {
        lastAppliedSyncEventAtRef.current = Math.max(lastAppliedSyncEventAtRef.current, eventAt);
        lastAppliedSyncTrackIdRef.current = incomingTrackId;
      }

      let changedTrack = false;
      if (data.track && (!activeTrack || activeTrack.id !== data.track.id)) {
        console.log(`[JamSync] Auto-healing track desync. Loading host track: ${data.track.title}`);
        lastReceivedTrackRef.current = data.track.id;
        usePlayerStore.getState().play(data.track, true);
        changedTrack = true;
      }

      const remoteTime = getProjectedRemoteTime(data);
      const localTime = audio?.currentTime ?? 0;
      const signedDrift = remoteTime - localTime;
      const absDrift = Math.abs(signedDrift);
      const shouldForceSeek =
        changedTrack ||
        data.reason === 'track_changed' ||
        data.reason === 'host_started' ||
        data.reason === 'rejoin';
      const hardSeekThreshold = signedDrift >= 0
        ? SYNC_RULES.hardSeekForwardDriftSec
        : SYNC_RULES.hardSeekBackwardDriftSec;

      if (audio && audio.readyState >= 1) {
        if (shouldForceSeek && absDrift > SYNC_RULES.forcedSyncDriftSec) {
          console.log(`[JamSync] Hard re-align: forced ${data.reason || 'track_desync'} drift ${absDrift.toFixed(2)}s`);
          applyRemoteTime(remoteTime);
          audio.playbackRate = 1.0;
        } else if (absDrift > hardSeekThreshold) {
          const direction = signedDrift >= 0 ? 'forward' : 'backward';
          console.log(`[JamSync] Hard re-align ${direction}: drift ${absDrift.toFixed(2)}s`);
          applyRemoteTime(remoteTime);
          audio.playbackRate = 1.0;
        } else if (absDrift > SYNC_RULES.softCorrectionDriftSec) {
          const newRate = getCorrectionRate(signedDrift, absDrift);
          if (Math.abs(audio.playbackRate - newRate) >= 0.005) {
            console.log(`[JamSync] Gradual correction: drift ${absDrift.toFixed(2)}s, rate -> ${newRate}`);
            audio.playbackRate = newRate;
          }
        } else if (absDrift <= SYNC_RULES.settledDriftSec && audio.playbackRate !== 1.0) {
          console.log(`[JamSync] Drift resolved (${absDrift.toFixed(2)}s), rate -> 1.0`);
          audio.playbackRate = 1.0;
        }
      } else {
        pendingSyncTimeRef.current = remoteTime;
      }

      if (data.isPlaying) {
        usePlayerStore.getState().resume(true);
      } else if (data.isPlaying === false) {
        usePlayerStore.getState().pause(true);
      }
    };

    const handleListenerControl = (data: { canControl: boolean }) =>
      usePlayerStore.getState().setListenersCanControl(data.canControl);

    const handleListenersUpdate = (data: { listeners: PartyListener[] }) =>
      usePlayerStore.getState().setPartyListeners(data.listeners);

    const handleListenerJoined = (data: { username: string }) => {
      toast.success(`${data.username} joined the session`);
      emitHostSync('listener_joined', true);
    };

    const handleListenerLeft = (data: { username: string }) =>
      toast.info(`${data.username} left the session`);

    const handlePartyEnded = () => {
      const audio = audioRef.current;
      if (audio) audio.playbackRate = 1.0;
      resetPartySyncState();
      usePlayerStore.getState().clearParty();
      toast.info('The session has ended.');
    };

    socket.on('playback_state', handlePlaybackState);
    socket.on('sync_state', handleSyncState);
    socket.on('listener_control_updated', handleListenerControl);
    socket.on('listeners_update', handleListenersUpdate);
    socket.on('listener_joined', handleListenerJoined);
    socket.on('listener_left', handleListenerLeft);
    socket.on('party_ended', handlePartyEnded);

    return () => {
      socket.off('playback_state', handlePlaybackState);
      socket.off('sync_state', handleSyncState);
      socket.off('listener_control_updated', handleListenerControl);
      socket.off('listeners_update', handleListenersUpdate);
      socket.off('listener_joined', handleListenerJoined);
      socket.off('listener_left', handleListenerLeft);
      socket.off('party_ended', handlePartyEnded);
    };
  }, [socket, audioRef, applyRemoteTime, getProjectedRemoteTime, getCorrectionRate, emitHostSync, resetPartySyncState]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const applyPendingSync = () => {
      if (pendingSyncTimeRef.current !== null) {
        console.log(`[JamSync] Applying pending start time: ${pendingSyncTimeRef.current}s`);
        applyRemoteTime(pendingSyncTimeRef.current);
        pendingSyncTimeRef.current = null;
      }
    };

    audio.addEventListener('loadedmetadata', applyPendingSync);
    audio.addEventListener('canplay', applyPendingSync);

    return () => {
      audio.removeEventListener('loadedmetadata', applyPendingSync);
      audio.removeEventListener('canplay', applyPendingSync);
    };
  }, [audioRef, currentTrack, applyRemoteTime]);

  useEffect(() => {
    if (socket && currentTrack) {
      if (lastReceivedTrackRef.current === currentTrack.id) {
        lastReceivedTrackRef.current = null;
        return;
      }

      const state = usePlayerStore.getState();
      if (!state.partyId) return;

      const canControl = state.isPartyHost || state.listenersCanControl;
      if (!canControl) return;

      if (state.isPartyHost) {
        emitHostSync('track_changed', true, 0);
      } else if (state.listenersCanControl) {
        socket.emit('playback_state', {
          type: 'play_track',
          track: currentTrack,
          time: 0,
          reason: 'track_changed',
          sentAt: Date.now(),
        });
      }
    }
  }, [currentTrack, socket, emitHostSync]);

  const partyId = usePlayerStore((state) => state.partyId);
  const isPartyHost = usePlayerStore((state) => state.isPartyHost);

  useEffect(() => {
    if (isPartyHost && partyId && partyId !== prevPartyIdRef.current && socket && currentTrack) {
      prevPartyIdRef.current = partyId;
      emitHostSync('host_started', true);
    }
  }, [isPartyHost, partyId, socket, currentTrack, emitHostSync]);

  const rejoinParty = useCallback(() => {
    if (!socket || !partyId || !isHydrated) return;

    console.log(`[JamSync] Rejoining party ${partyId}...`);
    let isHandled = false;
    const timeout = setTimeout(() => {
      if (!isHandled) {
        console.warn('[JamSync] Rejoin timed out, clearing party state.');
        resetPartySyncState();
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
        if (!response.isHost && response.initialState.currentTrack) {
          lastReceivedTrackRef.current = response.initialState.currentTrack.id;
          usePlayerStore.getState().play(response.initialState.currentTrack, true);
          if (typeof response.initialState.currentTime === 'number') {
            applyRemoteTime(response.initialState.currentTime);
          }
          if (response.initialState.isPlaying) {
            usePlayerStore.getState().resume(true);
          } else {
            usePlayerStore.getState().pause(true);
          }
        }
      } else {
        console.warn('[JamSync] Rejoin rejected, clearing party state:', response?.error);
        resetPartySyncState();
        usePlayerStore.getState().clearParty();
      }
    });
  }, [socket, partyId, isHydrated, applyRemoteTime, resetPartySyncState]);

  useEffect(() => {
    if (!socket || !partyId || !isHydrated) return;

    const handleConnect = () => {
      console.log('[JamSync] Socket connected, triggering rejoin.');
      rejoinParty();
    };

    socket.on('connect', handleConnect);

    if (socket.connected) {
      rejoinParty();
    }

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [socket, partyId, isHydrated, rejoinParty]);

  useEffect(() => {
    if (!partyId) {
      resetPartySyncState();
      prevPartyIdRef.current = null;
    }
  }, [partyId, resetPartySyncState]);

  useEffect(() => {
    if (!userUid || !isHydrated || !isPlaying) return;
    const intervalId = setInterval(() => {
      const snapshot = getPlaybackSnapshot();
      if (!snapshot.isPlaying) return;

      if (!usePlayerStore.getState().partyId) {
        syncStateToServer();
      }

      emitHostSync('host_heartbeat');
    }, SYNC_RULES.heartbeatIntervalMs);

    return () => clearInterval(intervalId);
  }, [userUid, isHydrated, isPlaying, syncStateToServer, getPlaybackSnapshot, emitHostSync]);
}

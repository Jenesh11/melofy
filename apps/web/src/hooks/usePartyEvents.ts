import { useEffect, useRef } from 'react';
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

  // Incoming socket events
  useEffect(() => {
    if (!socket) return;

    const handlePlaybackState = (data: RemotePlaybackState) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (data.type === 'play_track' && data.track) {
        lastReceivedTrackRef.current = data.track.id;
        usePlayerStore.getState().play(data.track, true);
        if (typeof data.time === 'number') audio.currentTime = data.time;
      } else if (data.type === 'pause') {
        usePlayerStore.getState().pause(true);
        if (typeof data.time === 'number') audio.currentTime = data.time;
      } else if (data.type === 'resume') {
        usePlayerStore.getState().resume(true);
        if (typeof data.time === 'number') audio.currentTime = data.time;
      } else if (data.type === 'seek' && typeof data.time === 'number') {
        audio.currentTime = data.time;
      } else if (data.type === 'sync' && typeof data.time === 'number') {
        if (Math.abs(audio.currentTime - data.time) > 2) {
          audio.currentTime = data.time;
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

    const handleListenerJoined = (data: { username: string }) =>
      toast.success(`${data.username} joined the session`);

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

  // Outgoing socket events
  useEffect(() => {
    const audio = audioRef.current;
    if (socket && currentTrack) {
      if (lastReceivedTrackRef.current === currentTrack.id) {
        lastReceivedTrackRef.current = null;
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

  // Rejoin party
  useEffect(() => {
    if (isHydrated && partyId && socket && !hasAttemptedRejoin.current) {
      hasAttemptedRejoin.current = true;
      let isHandled = false;
      const timeout = setTimeout(() => {
        if (!isHandled) usePlayerStore.getState().clearParty();
      }, 5000);

      socket.emit('join_party', partyId, (response: JoinPartyResponse) => {
        isHandled = true;
        clearTimeout(timeout);
        if (response?.ok && response.initialState) {
          usePlayerStore.getState().setParty(partyId, !!response.isHost, response.initialState.hostName);
          usePlayerStore.getState().setListenersCanControl(!!response.initialState.listenersCanControl);
          if (response.initialState.listeners) {
            usePlayerStore.getState().setPartyListeners(response.initialState.listeners);
          }
        } else {
          usePlayerStore.getState().clearParty();
        }
      });
    }
  }, [isHydrated, partyId, socket]);

  // Heartbeat sync
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
        });
      }
    }, 10000);
    return () => clearInterval(intervalId);
  }, [userUid, isHydrated, isPlaying, syncStateToServer, socket, audioRef]);
}

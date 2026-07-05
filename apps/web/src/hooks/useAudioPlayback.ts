import {
  type WheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { usePlayerStore, type Track } from '@/store/usePlayerStore';
import { useShallow } from 'zustand/react/shallow';
import { useSocket } from '@/lib/socket-context';
import { useAuth } from '@/lib/firebase/auth-context';
import { buildStreamUrl } from '@/lib/streamUrl';
import { Capacitor } from '@capacitor/core';

// Sub-hooks for modular logic
import { useMediaSession } from './useMediaSession';
import { usePlayerSync } from './usePlayerSync';
import { usePartyEvents } from './usePartyEvents';
import { useTrackDiscovery } from './useTrackDiscovery';
import { NativePlayer } from '@/lib/capacitor/NativePlayer';

const STREAM_URL_REFRESH_AFTER_MS = 4 * 60 * 1000;

interface AudioPlaybackOptions {
  refreshStreamSrc?: () => Promise<string | null>;
  streamSrcIssuedAt?: number;
  streamTrackId?: string | null;
}

export function useAudioPlayback(streamSrc?: string, options: AudioPlaybackOptions = {}) {
  // Store selectors
  const {
    currentTrack,
    isPlaying,
    isShuffle,
    isRepeat,
    isAutoplay,
    volume,
    queue,
    playNext,
    playPrevious,
    pause,
    resume,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    canControlPlayback,
  } = usePlayerStore(useShallow((state) => ({
    currentTrack: state.currentTrack,
    isPlaying: state.isPlaying,
    isShuffle: state.isShuffle,
    isRepeat: state.isRepeat,
    isAutoplay: state.isAutoplay,
    volume: state.volume,
    queue: state.queue,
    playNext: state.playNext,
    playPrevious: state.playPrevious,
    pause: state.pause,
    resume: state.resume,
    setVolume: state.setVolume,
    toggleShuffle: state.toggleShuffle,
    toggleRepeat: state.toggleRepeat,
    canControlPlayback: state.canControlPlayback,
  })));

  const { user } = useAuth();
  const { socket } = useSocket();

  // Core Refs and State
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setLocalTime] = useState(0);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);

  const getCurrentPlaybackTime = useCallback(() => {
    if (Capacitor.isNativePlatform()) {
      return usePlayerStore.getState().progress / 1000;
    }
    return audioRef.current?.currentTime || usePlayerStore.getState().progress / 1000 || 0;
  }, []);

  // Helper to sync time to both local state and store
  const setCurrentTime = useCallback((time: number) => {
    setLocalTime(time);
    usePlayerStore.setState({ progress: Math.floor(time * 1000) });
  }, []);

  // 1. Persistence & Hydration
  const { isHydrated, syncStateToServer } = usePlayerSync(audioRef, setCurrentTime);

  // 2. Track resolution & Autoplay
  const { isBuffering, setIsBuffering, triggerAutoplay } = useTrackDiscovery();
  const { refreshStreamSrc, streamSrcIssuedAt = 0, streamTrackId } = options;

  // Handlers for controls
  const handleTogglePlay = useCallback(() => {
    if (!canControlPlayback()) return;
    const state = usePlayerStore.getState();
    const time = getCurrentPlaybackTime();
    if (isPlaying) {
      pause();
      if (socket && state.partyId) {
        socket.emit('playback_state', { type: 'pause', time, reason: 'playback_toggled', sentAt: Date.now() });
      }
    } else {
      resume();
      if (socket && state.partyId) {
        socket.emit('playback_state', { type: 'resume', time, reason: 'playback_toggled', sentAt: Date.now() });
      }
    }
  }, [isPlaying, pause, resume, socket, canControlPlayback, getCurrentPlaybackTime]);

  const handleSkipNext = useCallback(async () => {
    if (!canControlPlayback()) return;
    if (isRepeat) {
      // Repeat: replay the current track from the start.
      if (Capacitor.isNativePlatform()) {
        NativePlayer.seekTo({ time: 0 }).catch(console.error);
        usePlayerStore.setState({ progress: 0, isPlaying: true });
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
        usePlayerStore.setState({ progress: 0 });
      }
      const partyState = usePlayerStore.getState();
      if (socket && partyState.partyId) {
        const sentAt = Date.now();
        socket.emit('playback_state', { type: 'seek', time: 0, reason: 'repeat_track', sentAt });
        socket.emit('playback_state', { type: 'resume', time: 0, reason: 'repeat_track', sentAt });
      }
      return;
    }
    playNext();
    if (!usePlayerStore.getState().isPlaying) {
      await triggerAutoplay();
    }
  }, [playNext, triggerAutoplay, isRepeat, canControlPlayback, socket]);

  const handleTrackEnd = useCallback(async () => {
    const state = usePlayerStore.getState();
    if (state.partyId && !state.isPartyHost) return;
    await handleSkipNext();
  }, [handleSkipNext]);

  // ───────────────────────────────────────────────────────────────────────
  // Native auto-advance (Android)
  //
  // The native MusicService plays one pre-armed "next" track on its own when
  // the current one ends, so audio keeps going (and auto-skips) even when the
  // WebView renderer is frozen or killed by the OS / an OEM battery manager.
  // JS keeps the armed track fresh while it's alive and reconciles the store
  // whenever it wakes back up.
  // ───────────────────────────────────────────────────────────────────────

  // What playNext() would advance to, computed without mutating state.
  const armedNextRef = useRef<{ track: Track; mode: 'repeat' | 'queue' } | null>(null);

  const computeNextTrack = useCallback((): { track: Track; mode: 'repeat' | 'queue' } | null => {
    const { queue: q, currentTrack: cur, isRepeat: rep, isShuffle: shuf } = usePlayerStore.getState();
    if (!cur) return null;
    if (rep) return { track: cur, mode: 'repeat' };
    if (q.length > 0) {
      const idx = shuf && q.length > 1 ? Math.floor(Math.random() * q.length) : 0;
      return { track: q[idx], mode: 'queue' };
    }
    return null;
  }, []);

  // Apply the transition the native player already performed, WITHOUT
  // re-triggering playback (the service is already playing the armed track).
  const handleNativeAdvanced = useCallback((advancedId: string | null) => {
    const state = usePlayerStore.getState();
    if (state.partyId && !state.isPartyHost) return; // party listeners follow the host
    const armed = armedNextRef.current;
    armedNextRef.current = null;

    if (!armed || (advancedId && armed.track.id !== advancedId)) {
      // We don't know what was armed (renderer was killed before we re-armed).
      // Fall back to reconciling from the native snapshot.
      void reconcileWithNative();
      return;
    }

    if (armed.mode === 'repeat') {
      usePlayerStore.setState({ progress: 0, isPlaying: true });
      return;
    }

    const { queue: q, currentTrack: cur, history } = usePlayerStore.getState();
    const idx = q.findIndex((t) => t.id === armed.track.id);
    const newQueue = idx >= 0 ? [...q.slice(0, idx), ...q.slice(idx + 1)] : q;
    usePlayerStore.setState({
      history: cur ? [...history, cur] : history,
      currentTrack: armed.track,
      queue: newQueue,
      isPlaying: true,
      progress: 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconcile the store with native state after the renderer was frozen/killed
  // (during which the service may have auto-advanced a track on its own).
  const reconcileWithNative = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const st = await NativePlayer.getState();
      if (!st.trackId) return;
      const state = usePlayerStore.getState();
      if (state.partyId && !state.isPartyHost) return;

      if (state.currentTrack?.id === st.trackId) {
        usePlayerStore.setState({
          progress: Math.floor((st.currentTime || 0) * 1000),
          isPlaying: st.isPlaying,
        });
        return;
      }

      // Native advanced past our current track — fast-forward the queue to it.
      const idx = state.queue.findIndex((t) => t.id === st.trackId);
      if (idx >= 0) {
        const skipped = state.queue.slice(0, idx);
        usePlayerStore.setState({
          history: state.currentTrack
            ? [...state.history, state.currentTrack, ...skipped]
            : [...state.history, ...skipped],
          currentTrack: state.queue[idx],
          queue: state.queue.slice(idx + 1),
          isPlaying: st.isPlaying,
          progress: Math.floor((st.currentTime || 0) * 1000),
        });
      }
    } catch (error) {
      console.error('[useAudioPlayback] Native reconcile failed:', error);
    }
  }, []);

  // 3. MediaSession Interface
  useMediaSession({
    audioRef,
    currentTrack,
    isPlaying,
    isDraggingSlider,
    resume,
    pause,
    playPrevious,
    handleSkipNext,
    setLocalTime: setCurrentTime,
  });

  // 4. Socket/Party Orchestration
  usePartyEvents({
    socket,
    audioRef,
    currentTrack,
    isPlaying,
    isHydrated,
    userUid: user?.uid,
    syncStateToServer,
  });

  // Core Play/Pause Effect for the Ref
  const lastPlayedSrc = useRef<string | null>(null);
  const currentTrackId = currentTrack?.id;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let cancelled = false;

    const isSourceMatching = !!(currentTrackId && streamTrackId === currentTrackId);

    if (Capacitor.isNativePlatform()) {
      if (streamSrc && isSourceMatching) {
        if (isPlaying) {
          const isNewTrack = streamSrc !== lastPlayedSrc.current;
          const timeToPass = isNewTrack ? (usePlayerStore.getState().progress / 1000) : undefined;
          lastPlayedSrc.current = streamSrc;
          const trackId = usePlayerStore.getState().currentTrack?.id;

          NativePlayer.play({ url: streamSrc, time: timeToPass, trackId }).catch(console.error);
        } else {
          NativePlayer.pause().catch(console.error);
        }
      } else {
        NativePlayer.pause().catch(console.error);
      }
    } else {
      if (isPlaying && isSourceMatching) {
        const play = async () => {
          let playableSrc = streamSrc;
          const streamAgeMs = streamSrcIssuedAt ? Date.now() - streamSrcIssuedAt : Infinity;
          if (refreshStreamSrc && (!playableSrc || streamAgeMs > STREAM_URL_REFRESH_AFTER_MS)) {
            try {
              setIsBuffering(true);
              playableSrc = await refreshStreamSrc() || undefined;
              if (cancelled) return;
              if (playableSrc && audio.src !== playableSrc) {
                audio.src = playableSrc;
              }
            } catch (error) {
              if (!cancelled) {
                console.error('[useAudioPlayback] Failed to refresh stream before resume:', error);
                setIsBuffering(false);
              }
              return;
            }
          }

          audio.play().catch(console.error);
        };

        void play();
      } else {
        audio.pause();
      }
    }

    return () => {
      cancelled = true;
    };
  }, [isPlaying, streamSrc, streamSrcIssuedAt, refreshStreamSrc, setIsBuffering, currentTrackId, streamTrackId]);

  // Native Player Event Listener
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handles: import('@capacitor/core').PluginListenerHandle[] = [];
    let isCancelled = false;

    // Register a listener and either keep its handle or immediately remove it
    // if the effect was already torn down (avoids the add/remove race that
    // previously leaked listeners on every re-render).
    const track = async <T>(p: Promise<T> & { remove?: () => void }) => {
      const handle = (await p) as unknown as import('@capacitor/core').PluginListenerHandle;
      if (isCancelled) {
        handle.remove();
      } else {
        handles.push(handle);
      }
    };

    const setupListeners = async () => {
      await track(NativePlayer.addListener('timeupdate', (state) => {
        if (!isDraggingSlider) {
          setCurrentTime(state.currentTime);
        }
        
        // Native MediaSession sync
        import('@capgo/capacitor-media-session').then(({ MediaSession }) => {
          const cur = usePlayerStore.getState().currentTrack;
          const storeDuration = cur ? cur.duration / 1000 : 0;
          const dur = state.duration > 0 ? state.duration : storeDuration;
          if (dur > 0) {
            MediaSession.setPositionState({
              duration: dur,
              position: state.currentTime,
              playbackRate: 1,
            }).catch(() => {});
          }
        });
        if (state.duration > 0) {
          const cur = usePlayerStore.getState().currentTrack;
          if (cur && (isNaN(cur.duration) || Math.abs(cur.duration - state.duration * 1000) > 1000)) {
             usePlayerStore.setState({
               currentTrack: { ...cur, duration: Math.floor(state.duration * 1000) }
             });
          }
        }
      }));

      // Queue empty / nothing pre-armed: let JS decide (autoplay, stop, …).
      await track(NativePlayer.addListener('ended', () => {
        handleTrackEnd();
      }));

      // The service auto-advanced to the pre-armed next track on its own.
      await track(NativePlayer.addListener('advanced', (state) => {
        handleNativeAdvanced(state.trackId);
      }));

      await track(NativePlayer.addListener('buffering', (state) => {
        setIsBuffering(state.isBuffering);
      }));
    };

    void setupListeners();

    return () => {
      isCancelled = true;
      for (const handle of handles) handle.remove();
    };
  }, [setCurrentTime, isDraggingSlider, handleTrackEnd, handleNativeAdvanced, setIsBuffering]);

  // Pre-arm the next track natively so the service can auto-advance without
  // the WebView. Re-runs whenever the queue head / current track / shuffle /
  // repeat changes, minting a fresh stream ticket each time.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;

    const arm = async () => {
      // Party listeners follow the host's commands; never auto-advance locally.
      const partyState = usePlayerStore.getState();
      const next = (partyState.partyId && !partyState.isPartyHost) ? null : computeNextTrack();
      if (!next || !next.track.url) {
        armedNextRef.current = null;
        NativePlayer.setNext({ url: null, trackId: null }).catch(() => {});
        return;
      }
      try {
        const url = await buildStreamUrl(next.track.url, user);
        if (cancelled || !url) return;
        armedNextRef.current = next;
        await NativePlayer.setNext({ url, trackId: next.track.id });
      } catch (error) {
        console.error('[useAudioPlayback] Failed to arm next track:', error);
      }
    };

    void arm();
    return () => { cancelled = true; };
  }, [currentTrack?.id, currentTrack?.url, queue, isShuffle, isRepeat, user, computeNextTrack]);

  // Reconcile the store with native playback on startup and whenever the app
  // returns to the foreground (the renderer may have been frozen/killed while
  // the service kept playing and auto-advancing).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void reconcileWithNative();

    let appHandle: import('@capacitor/core').PluginListenerHandle | null = null;
    let cancelled = false;
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) void reconcileWithNative();
      }).then((handle) => {
        if (cancelled) handle.remove();
        else appHandle = handle;
      });
    });

    return () => {
      cancelled = true;
      if (appHandle) appHandle.remove();
    };
  }, [reconcileWithNative]);

  // Reconcile again once the store finishes (re)hydrating from the server. If
  // the renderer was killed, the store comes back as the last-synced state
  // while the native service may have auto-advanced past it — this realigns it.
  useEffect(() => {
    if (Capacitor.isNativePlatform() && isHydrated) void reconcileWithNative();
  }, [isHydrated, reconcileWithNative]);

  // Volume sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Capacitor.isNativePlatform() ? 1 : volume;
    }
  }, [volume]);

  // Global Hotkeys
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).isContentEditable
      ) return;

      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        handleTogglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay]);

  // UI Support Helpers
  const formatTime = (ms: number | undefined | null) => {
    if (ms == null || isNaN(ms) || ms < 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentDisplayTimeMs = isDraggingSlider
    ? currentTrack ? (sliderValue / 100) * currentTrack.duration : 0
    : currentTime * 1000;

  const progressPercent = currentTrack && currentTrack.duration > 0
    ? (currentDisplayTimeMs / currentTrack.duration) * 100
    : 0;

  const handleSeek = useCallback((value: number[]) => {
    const seekPosition = value[0];
    if (seekPosition === undefined || !currentTrack) return;
    if (!canControlPlayback()) return;

    const time = (seekPosition / 100) * (currentTrack.duration / 1000);

    if (Capacitor.isNativePlatform()) {
      NativePlayer.seekTo({ time }).catch(console.error);
    } else if (audioRef.current) {
      audioRef.current.currentTime = time;
    }

    usePlayerStore.setState({ progress: Math.floor(time * 1000) });

    if (socket && usePlayerStore.getState().partyId) {
      socket.emit('playback_state', { type: 'seek', time, reason: 'manual_seek', sentAt: Date.now() });
    }

    // Immediate sync
    syncStateToServer();
  }, [currentTrack, socket, syncStateToServer, canControlPlayback]);

  const handleVolumeWheel = (event: WheelEvent) => {
    const delta = event.deltaY > 0 ? -0.05 : 0.05;
    const nextVolume = Math.min(1, Math.max(0, volume + delta));
    setVolume(nextVolume);
  };

  return {
    audioRef,
    currentTrack,
    isPlaying,
    isShuffle,
    toggleShuffle,
    isAutoplay,
    playPrevious,
    handleTogglePlay,
    handleSkipNext,
    handleTrackEnd,
    isRepeat,
    toggleRepeat,
    isBuffering,
    setIsBuffering,
    progressPercent,
    currentDisplayTime: formatTime(currentDisplayTimeMs),
    durationTime: currentTrack ? formatTime(currentTrack.duration) : '0:00',
    isDraggingSlider,
    setIsDraggingSlider,
    setSliderValue,
    handleSeek,
    volume,
    setVolume,
    handleVolumeWheel,
    setCurrentTime,
  };
}

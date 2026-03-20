import {
  type WheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { useSocket } from '@/lib/socket-context';
import { useAuth } from '@/lib/firebase/auth-context';

interface RemotePlaybackState {
  type: 'play_track' | 'pause' | 'resume' | 'seek';
  track?: Track;
  time?: number;
}

interface AutoplayTrackData {
  encoded?: string;
  info?: {
    identifier?: string;
    title?: string;
    author?: string;
    artworkUrl?: string;
    duration?: number;
  };
}

interface AutoplayResponse {
  tracks?: AutoplayTrackData[];
}

export function useAudioPlayback() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const queue = usePlayerStore((state) => state.queue);
  const history = usePlayerStore((state) => state.history);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrevious = usePlayerStore((state) => state.playPrevious);
  const pause = usePlayerStore((state) => state.pause);
  const resume = usePlayerStore((state) => state.resume);
  const volume = usePlayerStore((state) => state.volume);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const play = usePlayerStore((state) => state.play);
  const updateTrackUrl = usePlayerStore((state) => state.updateTrackUrl);
  const isShuffle = usePlayerStore((state) => state.isShuffle);
  const isRepeat = usePlayerStore((state) => state.isRepeat);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const toggleRepeat = usePlayerStore((state) => state.toggleRepeat);
  const toggleAutoplay = usePlayerStore((state) => state.toggleAutoplay);
  const hydrateState = usePlayerStore((state) => state.hydrateState);
  const activePlaylistContext = usePlayerStore(
    (state) => state.activePlaylistContext,
  );
  const isAutoplay = usePlayerStore((state) => state.isAutoplay);

  const { user } = useAuth();
  const { socket } = useSocket();

  const getAuthHeader = useCallback(async () => {
    if (!user) return null;
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [user]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setLocalTime] = useState(0);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isFetchingAutoplay, setIsFetchingAutoplay] = useState(false);

  const isRemoteUpdate = useRef(false);
  const stateSyncTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingTrackResolutionRef = useRef<Map<string, Promise<void>>>(
    new Map(),
  );

  const setCurrentTime = useCallback((time: number) => {
    setLocalTime(time);
    usePlayerStore.setState({ progress: Math.floor(time * 1000) });
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handlePlaybackState = (data: RemotePlaybackState) => {
      isRemoteUpdate.current = true;

      if (data.type === 'play_track' && data.track) {
        play(data.track);
      } else if (data.type === 'pause') {
        pause();
      } else if (data.type === 'resume') {
        resume();
      } else if (
        data.type === 'seek' &&
        audioRef.current &&
        typeof data.time === 'number'
      ) {
        audioRef.current.currentTime = data.time;
      }
    };

    socket.on('playback_state', handlePlaybackState);
    return () => {
      socket.off('playback_state', handlePlaybackState);
    };
  }, [socket, play, pause, resume]);

  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.play().catch(console.error);
      return;
    }

    audioRef.current.pause();
  }, [isPlaying]);

  useEffect(() => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    if (socket && currentTrack) {
      socket.emit('playback_state', {
        type: 'play_track',
        track: currentTrack,
      });
    }
  }, [currentTrack, socket]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    let cancelled = false;

    const resolveMissingUrl = async () => {
      if (!currentTrack || currentTrack.url) return;

      const activeResolution = pendingTrackResolutionRef.current.get(
        currentTrack.id,
      );
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
          console.error('[PlayerShell] URL resolution failed:', error);
        } finally {
          pendingTrackResolutionRef.current.delete(currentTrack.id);
          if (!cancelled) {
            setIsBuffering(false);
          }
        }
      })();

      pendingTrackResolutionRef.current.set(currentTrack.id, resolutionPromise);
      await resolutionPromise;
    };

    void resolveMissingUrl();

    return () => {
      cancelled = true;
    };
  }, [currentTrack, getAuthHeader, updateTrackUrl]);

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    getAuthHeader()
      .then((headers) => {
        if (!headers) return null;
        return fetch('/api/player-state', { headers });
      })
      .then((res) => (res ? res.json() : null))
      .then((data) => {
        setIsHydrated(true); // Mark as hydrated even if no state exists
        if (!data?.state) return;

        let state = data.state;
        if (typeof state === 'string') {
          try {
            state = JSON.parse(state);
          } catch {
            return;
          }
        }

        hydrateState({
          currentTrack: state.currentTrack,
          queue: state.queue || [],
          history: state.history || [],
          isShuffle: state.isShuffle || false,
          isRepeat: state.isRepeat || false,
          volume: state.volume ?? 0.8,
          activePlaylistContext: state.activePlaylistContext || null,
        });

        if (audioRef.current && state.currentTime) {
          audioRef.current.currentTime = state.currentTime;
          setCurrentTime(state.currentTime);
        }
      })
      .catch((err) => {
        console.error(err);
        setIsHydrated(true); // Still allow saving if fetch fails
      });
  }, [user?.uid, getAuthHeader, hydrateState, setCurrentTime]);

  useEffect(() => {
    if (!user?.uid || !isHydrated) return;

    if (stateSyncTimer.current) {
      clearTimeout(stateSyncTimer.current);
    }

    stateSyncTimer.current = setTimeout(() => {
      const stateToSave = {
        currentTrack,
        queue,
        history,
        isShuffle,
        isRepeat,
        volume,
        currentTime: audioRef.current?.currentTime || 0,
        activePlaylistContext,
      };

      getAuthHeader()
        .then((authHeaders) => {
          if (!authHeaders) return;

          return fetch('/api/player-state', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders,
            },
            body: JSON.stringify({ state: stateToSave }),
          });
        })
        .catch(console.error);
    }, 2000);

    return () => {
      if (stateSyncTimer.current) {
        clearTimeout(stateSyncTimer.current);
      }
    };
  }, [
    user?.uid,
    currentTrack,
    queue,
    history,
    isShuffle,
    isRepeat,
    volume,
    activePlaylistContext,
    getAuthHeader,
    isHydrated,
  ]);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
      if (socket) socket.emit('playback_state', { type: 'pause' });
      return;
    }

    resume();
    if (socket) socket.emit('playback_state', { type: 'resume' });
  }, [isPlaying, pause, resume, socket]);

  const triggerAutoplay = useCallback(async () => {
    const state = usePlayerStore.getState();
    if (!state.isAutoplay || !currentTrack || isFetchingAutoplay) return;

    setIsFetchingAutoplay(true);
    try {
      const res = await fetch(
        `/api/recommendations?trackId=${encodeURIComponent(currentTrack.title + ' ' + currentTrack.artist)}`,
        {
          headers: (await getAuthHeader()) || {},
        },
      );
      const data = (await res.json()) as AutoplayResponse;

      if (!data?.tracks?.length) return;

      const nextTrackData =
        data.tracks.find((track) => track.info?.title !== currentTrack.title) ||
        data.tracks[0];

      if (!nextTrackData) return;

      const newTrack: Track = {
        id: nextTrackData.info?.identifier || 'unknown',
        title: nextTrackData.info?.title || 'Unknown Title',
        artist: nextTrackData.info?.author || 'Unknown Artist',
        artworkUrl:
          nextTrackData.info?.artworkUrl ||
          (nextTrackData.info?.identifier
            ? `https://img.youtube.com/vi/${nextTrackData.info.identifier}/maxresdefault.jpg`
            : ''),
        duration: nextTrackData.info?.duration || 0,
        url: nextTrackData.encoded,
      };
      play(newTrack);
    } catch (error) {
      console.error('Autoplay failed:', error);
    } finally {
      setIsFetchingAutoplay(false);
    }
  }, [currentTrack, getAuthHeader, isFetchingAutoplay, play]);

  const handleSkipNext = useCallback(async () => {
    const state = usePlayerStore.getState();

    if (state.isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
      usePlayerStore.setState({ progress: 0 });
      return;
    }

    playNext();

    const nextState = usePlayerStore.getState();
    if (!nextState.isPlaying) {
      await triggerAutoplay();
    }
  }, [playNext, triggerAutoplay]);

  const handleTrackEnd = useCallback(async () => {
    await handleSkipNext();
  }, [handleSkipNext]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    if (currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: 'Melofy',
        artwork: [96, 128, 192, 256, 384, 512].map((size) => ({
          src: currentTrack.artworkUrl,
          sizes: `${size}x${size}`,
          type: 'image/png',
        })),
      });
    }

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    const actionHandlers: [MediaSessionAction, () => void][] = [
      ['play', resume],
      ['pause', pause],
      ['previoustrack', playPrevious],
      ['nexttrack', handleSkipNext],
    ];

    for (const [action, handler] of actionHandlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {
        console.error(`Media session action "${action}" could not be set.`, error);
      }
    }

    return () => {
      for (const [action] of actionHandlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Some actions are not supported in all browsers.
        }
      }
    };
  }, [currentTrack, isPlaying, resume, pause, playPrevious, handleSkipNext]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        handleTogglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentDisplayTimeMs = isDraggingSlider
    ? currentTrack
      ? (sliderValue / 100) * currentTrack.duration
      : 0
    : currentTime * 1000;

  const progressPercent =
    currentTrack && currentTrack.duration > 0
      ? (currentDisplayTimeMs / currentTrack.duration) * 100
      : 0;

  const handleSeek = (value: number[]) => {
    const seekPosition = value[0];
    if (seekPosition === undefined || !audioRef.current || !currentTrack) return;

    const time = (seekPosition / 100) * (currentTrack.duration / 1000);
    audioRef.current.currentTime = time;
    if (socket) socket.emit('playback_state', { type: 'seek', time });
  };

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
    toggleAutoplay,
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

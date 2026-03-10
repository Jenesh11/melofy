import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { useSocket } from '@/lib/socket-context';
import { useAuth } from '@/lib/firebase/auth-context';
import { toast } from 'sonner';

export function useAudioPlayback() {
  const {
    currentTrack,
    isPlaying,
    queue,
    playNext,
    playPrevious,
    pause,
    resume,
    volume,
    setVolume,
    play,
    updateTrackUrl,
    isShuffle,
    isRepeat,
    toggleShuffle,
    toggleRepeat,
    toggleAutoplay,
    hydrateState,
    activePlaylistContext,
    isAutoplay,
  } = usePlayerStore();
  const { user } = useAuth();
  const { socket } = useSocket();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const isRemoteUpdate = useRef(false);

  // Handle remote socket events
  useEffect(() => {
    if (!socket) return;

    const handlePlaybackState = (data: any) => {
      isRemoteUpdate.current = true;
      if (data.type === 'play_track' && data.track) {
        play(data.track);
      } else if (data.type === 'pause') {
        pause();
      } else if (data.type === 'resume') {
        resume();
      } else if (data.type === 'seek' && audioRef.current) {
        audioRef.current.currentTime = data.time;
      }
    };

    socket.on('playback_state', handlePlaybackState);
    return () => {
      socket.off('playback_state', handlePlaybackState);
    };
  }, [socket, play, pause, resume]);

  // Handle Play/Pause synchronization with Audio Element
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Emit track changes uniquely locally
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

  // Volume synchronization
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // On-the-fly URL resolution for Spotify/metadata tracks in the queue
  useEffect(() => {
    async function resolveMissingUrl() {
      if (currentTrack && !currentTrack.url) {
        setIsBuffering(true);
        try {
          console.log(`[PlayerShell] Resolving URL for: ${currentTrack.title}`);
          const searchQuery = `${currentTrack.title} ${currentTrack.artist}`;
          const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
          const data = await res.json();

          if (data && data.tracks && data.tracks.length > 0) {
            const found = data.tracks[0];
            if (found.encoded) {
              console.log(`[PlayerShell] URL resolved for: ${currentTrack.title}`);
              updateTrackUrl(currentTrack.id, found.encoded, found.info.identifier);
            }
          }
        } catch (error) {
          console.error('[PlayerShell] URL resolution failed:', error);
        } finally {
          setIsBuffering(false);
        }
      }
    }
    resolveMissingUrl();
  }, [currentTrack?.id, currentTrack?.url, currentTrack?.identifier, updateTrackUrl]);

  const stateSyncTimer = useRef<NodeJS.Timeout | null>(null);

  // Load state from Redis on mount
  useEffect(() => {
    if (user?.uid) {
      fetch(`/api/player-state?userId=${user.uid}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.state) {
            const state = typeof data.state === 'string' ? JSON.parse(data.state) : data.state;
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
          }
        })
        .catch(console.error);
    }
  }, [user?.uid, hydrateState]);

  // Save state to Redis on changes
  useEffect(() => {
    if (!user?.uid) return;
    if (stateSyncTimer.current) clearTimeout(stateSyncTimer.current);

    stateSyncTimer.current = setTimeout(() => {
      const stateToSave = {
        currentTrack,
        queue,
        history: usePlayerStore.getState().history,
        isShuffle,
        isRepeat,
        volume,
        currentTime: audioRef.current?.currentTime || 0,
        activePlaylistContext,
      };
      fetch('/api/player-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, state: stateToSave }),
      }).catch(console.error);
    }, 2000);
  }, [user?.uid, currentTrack, queue, isShuffle, isRepeat, volume, isPlaying, activePlaylistContext]);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
      if (socket) socket.emit('playback_state', { type: 'pause' });
    } else {
      resume();
      if (socket) socket.emit('playback_state', { type: 'resume' });
    }
  }, [isPlaying, pause, resume, socket]);

  const [isFetchingAutoplay, setIsFetchingAutoplay] = useState(false);

  const triggerAutoplay = useCallback(async () => {
    const state = usePlayerStore.getState();
    if (state.isAutoplay && currentTrack && !isFetchingAutoplay) {
      setIsFetchingAutoplay(true);
      try {
        const res = await fetch(`/api/recommendations?trackId=${encodeURIComponent(currentTrack.title + ' ' + currentTrack.artist)}`);
        const data = await res.json();
        if (data && data.tracks && data.tracks.length > 0) {
          const nextTrackData = data.tracks.find((t: any) => t.info?.title !== currentTrack.title) || data.tracks[0];
          if (nextTrackData) {
            const newTrack: Track = {
              id: nextTrackData.info?.identifier || 'unknown',
              title: nextTrackData.info?.title || 'Unknown Title',
              artist: nextTrackData.info?.author || 'Unknown Artist',
              artworkUrl: nextTrackData.info?.artworkUrl || (nextTrackData.info?.identifier ? `https://img.youtube.com/vi/${nextTrackData.info.identifier}/maxresdefault.jpg` : ''),
              duration: nextTrackData.info?.duration || 0,
              url: nextTrackData.encoded,
            };
            usePlayerStore.getState().play(newTrack);
          }
        }
      } catch (e) {
        console.error('Autoplay failed:', e);
      } finally {
        setIsFetchingAutoplay(false);
      }
    }
  }, [currentTrack, isFetchingAutoplay]);

  const handleSkipNext = useCallback(async () => {
    const { isRepeat } = usePlayerStore.getState();
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
      usePlayerStore.setState({ progress: 0 });
      return;
    }
    playNext();
    const state = usePlayerStore.getState();
    if (!state.isPlaying) {
      await triggerAutoplay();
    }
  }, [playNext, triggerAutoplay]);

  const handleTrackEnd = useCallback(async () => {
    await handleSkipNext();
  }, [handleSkipNext]);

  // Media Session Support
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
        } catch (e) {}
      }
    };
  }, [currentTrack, isPlaying, resume, pause, playPrevious, handleSkipNext]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
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
    ? currentTrack ? (sliderValue / 100) * currentTrack.duration : 0
    : currentTime * 1000;

  const progressPercent = currentTrack && currentTrack.duration > 0
    ? (currentDisplayTimeMs / currentTrack.duration) * 100
    : 0;

  const handleSeek = (value: number[]) => {
    if (audioRef.current && currentTrack) {
      const time = (value[0] / 100) * (currentTrack.duration / 1000);
      audioRef.current.currentTime = time;
      if (socket) socket.emit('playback_state', { type: 'seek', time });
    }
  };

  const handleVolumeWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const newVolume = Math.min(1, Math.max(0, volume + delta));
    setVolume(newVolume);
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

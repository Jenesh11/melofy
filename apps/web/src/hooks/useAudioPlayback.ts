import {
  type WheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useShallow } from 'zustand/react/shallow';
import { useSocket } from '@/lib/socket-context';
import { useAuth } from '@/lib/firebase/auth-context';
import { Capacitor } from '@capacitor/core';

// Sub-hooks for modular logic
import { useMediaSession } from './useMediaSession';
import { usePlayerSync } from './usePlayerSync';
import { usePartyEvents } from './usePartyEvents';
import { useTrackDiscovery } from './useTrackDiscovery';
import { NativePlayer } from '@/lib/capacitor/NativePlayer';

export function useAudioPlayback(streamSrc?: string) {
  // Store selectors
  const {
    currentTrack,
    isPlaying,
    isShuffle,
    isRepeat,
    isAutoplay,
    volume,
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

  // Helper to sync time to both local state and store
  const setCurrentTime = useCallback((time: number) => {
    setLocalTime(time);
    usePlayerStore.setState({ progress: Math.floor(time * 1000) });
  }, []);

  // 1. Persistence & Hydration
  const { isHydrated, syncStateToServer } = usePlayerSync(audioRef, setCurrentTime);

  // 2. Track resolution & Autoplay
  const { isBuffering, setIsBuffering, triggerAutoplay } = useTrackDiscovery();

  // Handlers for controls
  const handleTogglePlay = useCallback(() => {
    if (!canControlPlayback()) return;
    if (isPlaying) {
      pause();
      if (socket) socket.emit('playback_state', { type: 'pause', time: audioRef.current?.currentTime || 0 });
    } else {
      resume();
      if (socket) socket.emit('playback_state', { type: 'resume', time: audioRef.current?.currentTime || 0 });
    }
  }, [isPlaying, pause, resume, socket, canControlPlayback]);

  const handleSkipNext = useCallback(async () => {
    if (!canControlPlayback()) return;
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
      usePlayerStore.setState({ progress: 0 });
      return;
    }
    playNext();
    if (!usePlayerStore.getState().isPlaying) {
      await triggerAutoplay();
    }
  }, [playNext, triggerAutoplay, isRepeat, canControlPlayback]);

  const handleTrackEnd = useCallback(async () => {
    const state = usePlayerStore.getState();
    if (state.partyId && !state.isPartyHost) return;
    await handleSkipNext();
  }, [handleSkipNext]);

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
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (Capacitor.isNativePlatform() && streamSrc) {
      if (isPlaying) {
        NativePlayer.play({ url: streamSrc }).catch(console.error);
      } else {
        NativePlayer.pause().catch(console.error);
      }
    } else {
      if (isPlaying) {
        audio.play().catch(console.error);
      } else {
        audio.pause();
      }
    }
  }, [isPlaying, streamSrc]);

  // Native Player Event Listener
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    let timeupdateListener: any = null;
    let endedListener: any = null;

    NativePlayer.addListener('timeupdate', (state) => {
      if (!isDraggingSlider) {
        setCurrentTime(state.currentTime);
      }
      // If duration comes in from native player, update store if needed
      if (state.duration > 0) {
        const track = usePlayerStore.getState().currentTrack;
        if (track && Math.abs(track.duration - state.duration * 1000) > 1000) {
           usePlayerStore.setState({
             currentTrack: { ...track, duration: Math.floor(state.duration * 1000) }
           });
        }
      }
    }).then(handle => { timeupdateListener = handle; });

    NativePlayer.addListener('ended', () => {
      handleTrackEnd();
    }).then(handle => { endedListener = handle; });
    
    return () => {
      if (timeupdateListener) {
        timeupdateListener.remove();
      }
      if (endedListener) {
        endedListener.remove();
      }
    };
  }, [setCurrentTime, isDraggingSlider, handleTrackEnd]);

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

  const handleSeek = useCallback((value: number[]) => {
    const seekPosition = value[0];
    if (seekPosition === undefined || !audioRef.current || !currentTrack) return;
    if (!canControlPlayback()) return;

    const time = (seekPosition / 100) * (currentTrack.duration / 1000);
    
    if (Capacitor.isNativePlatform()) {
      NativePlayer.seekTo({ time }).catch(console.error);
    } else {
      audioRef.current.currentTime = time;
    }
    
    if (socket) socket.emit('playback_state', { type: 'seek', time });

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

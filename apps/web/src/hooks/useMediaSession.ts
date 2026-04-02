import { useEffect } from 'react';
import { Track } from '@/store/usePlayerStore';

interface MediaSessionProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  currentTrack: Track | null;
  isPlaying: boolean;
  isDraggingSlider: boolean;
  resume: () => void;
  pause: () => void;
  playPrevious: () => void;
  handleSkipNext: () => Promise<void>;
  setLocalTime: (time: number) => void;
}

export function useMediaSession({
  audioRef,
  currentTrack,
  isPlaying,
  isDraggingSlider,
  resume,
  pause,
  playPrevious,
  handleSkipNext,
  setLocalTime,
}: MediaSessionProps) {
  // Handle Metadata and Action Handlers
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    if (currentTrack) {
      // Force refresh for Android/Chrome stability
      navigator.mediaSession.metadata = null;
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

    const actionHandlers: [MediaSessionAction, (details: MediaSessionActionDetails) => void][] = [
      ['play', () => {
        resume();
      }],
      ['pause', () => {
        pause();
      }],
      ['previoustrack', () => {
        playPrevious();
      }],
      ['nexttrack', () => {
        handleSkipNext();
      }],
      ['seekbackward', (details) => {
        if (audioRef.current) {
          const skipTime = details.seekOffset || 10;
          const newTime = Math.max(audioRef.current.currentTime - skipTime, 0);
          audioRef.current.currentTime = newTime;
          
          if ('setPositionState' in navigator.mediaSession) {
            navigator.mediaSession.setPositionState({
              duration: audioRef.current.duration,
              playbackRate: audioRef.current.playbackRate,
              position: newTime,
            });
          }
        }
      }],
      ['seekforward', (details) => {
        if (audioRef.current) {
          const skipTime = details.seekOffset || 10;
          const newTime = Math.min(audioRef.current.currentTime + skipTime, audioRef.current.duration);
          audioRef.current.currentTime = newTime;

          if ('setPositionState' in navigator.mediaSession) {
            navigator.mediaSession.setPositionState({
              duration: audioRef.current.duration,
              playbackRate: audioRef.current.playbackRate,
              position: newTime,
            });
          }
        }
      }],
      ['seekto', (details) => {
        if (audioRef.current && details.seekTime !== undefined) {
          audioRef.current.currentTime = details.seekTime;

          if ('setPositionState' in navigator.mediaSession) {
            navigator.mediaSession.setPositionState({
              duration: audioRef.current.duration,
              playbackRate: audioRef.current.playbackRate,
              position: details.seekTime,
            });
          }
        }
      }],
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
  }, [currentTrack, isPlaying, resume, pause, playPrevious, handleSkipNext, audioRef]);

  // Synchronize audio state directly with MediaSession and React state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const updatePosition = () => {
      if ('setPositionState' in navigator.mediaSession) {
        const duration = (audio && isFinite(audio.duration) && audio.duration > 0) 
          ? audio.duration 
          : (currentTrack?.duration ? currentTrack.duration / 1000 : 0);

        if (isFinite(duration) && duration > 0) {
          navigator.mediaSession.setPositionState({
            duration,
            playbackRate: audio.playbackRate,
            position: audio.currentTime,
          });
        }
      }
    };

    const onTimeUpdate = () => {
      if (!isDraggingSlider) {
        setLocalTime(audio.currentTime);
      }
      updatePosition();
    };

    const onLoadedMetadata = () => {
      updatePosition();
    };

    const onPlay = () => {
      navigator.mediaSession.playbackState = 'playing';
    };

    const onPause = () => {
      navigator.mediaSession.playbackState = 'paused';
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [currentTrack, isDraggingSlider, audioRef, setLocalTime]);
}

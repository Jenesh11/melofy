import { useEffect } from 'react';
import { Track } from '@/store/usePlayerStore';
import { Capacitor } from '@capacitor/core';
import { MediaSession } from '@capgo/capacitor-media-session';

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
    if (typeof window === 'undefined') return;

    const setupMediaSession = async () => {
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        if (currentTrack) {
          await MediaSession.setMetadata({
            title: currentTrack.title,
            artist: currentTrack.artist,
            album: 'Melofy',
            artwork: [
              {
                src: currentTrack.artworkUrl,
                sizes: '512x512',
                type: 'image/png',
              }
            ],
          });
        }
        await MediaSession.setPlaybackState({
          playbackState: isPlaying ? 'playing' : 'paused'
        });

      } else {
        if (!('mediaSession' in navigator)) return;
        
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
      }
    };
    
    setupMediaSession();

  }, [currentTrack, isPlaying]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isNative = Capacitor.isNativePlatform();

    const actionHandlers: [string, (details: { seekOffset?: number | null; seekTime?: number | null }) => void][] = [
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
        }
      }],
      ['seekforward', (details) => {
        if (audioRef.current) {
          const skipTime = details.seekOffset || 10;
          const newTime = Math.min(audioRef.current.currentTime + skipTime, audioRef.current.duration);
          audioRef.current.currentTime = newTime;
        }
      }],
      ['seekto', (details) => {
        if (audioRef.current && details.seekTime != null) {
          audioRef.current.currentTime = details.seekTime;
        }
      }],
    ];

    type CapgoMediaSessionAction = 'play' | 'pause' | 'seekbackward' | 'seekforward' | 'previoustrack' | 'nexttrack' | 'seekto' | 'stop';

    if (isNative) {
      for (const [action, handler] of actionHandlers) {
        MediaSession.setActionHandler({ action: action as CapgoMediaSessionAction }, handler);
      }
    } else {
      if (!('mediaSession' in navigator)) return;
      for (const [action, handler] of actionHandlers) {
        try {
          // Cast the string to the native MediaSessionAction type
          navigator.mediaSession.setActionHandler(action as globalThis.MediaSessionAction, handler);
        } catch (e) {}
      }
    }

    return () => {
      if (isNative) {
        for (const [action] of actionHandlers) {
          MediaSession.setActionHandler({ action: action as CapgoMediaSessionAction }, null).catch(() => {});
        }
      } else {
        if (!('mediaSession' in navigator)) return;
        for (const [action] of actionHandlers) {
          try {
            navigator.mediaSession.setActionHandler(action as globalThis.MediaSessionAction, null);
          } catch (e) {}
        }
      }
    };
  }, [resume, pause, playPrevious, handleSkipNext, audioRef]);

  // Synchronize audio state directly with MediaSession and React state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || typeof window === 'undefined') return;
    const isNative = Capacitor.isNativePlatform();

    const updatePosition = () => {
      const duration = (audio && isFinite(audio.duration) && audio.duration > 0) 
        ? audio.duration 
        : (currentTrack?.duration ? currentTrack.duration / 1000 : 0);

      if (isFinite(duration) && duration > 0) {
        if (isNative) {
          MediaSession.setPositionState({
            duration,
            playbackRate: audio.playbackRate,
            position: audio.currentTime,
          });
        } else if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
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
      if (isNative) {
        MediaSession.setPlaybackState({ playbackState: 'playing' });
      } else if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    };

    const onPause = () => {
      if (isNative) {
        MediaSession.setPlaybackState({ playbackState: 'paused' });
      } else if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
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


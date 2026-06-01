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

import { NativePlayer } from '@/lib/capacitor/NativePlayer';
import { usePlayerStore } from '@/store/usePlayerStore';

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

      // ── Native: Capgo plugin for Android notification controls ─────────
      // IMPORTANT: Always set metadata BEFORE playback state. When
      // setPlaybackState('playing') is called, the plugin starts the
      // foreground service. If metadata hasn't been set yet, the
      // notification will be empty and Android may kill the service.
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
          await MediaSession.setPlaybackState({
            playbackState: isPlaying ? 'playing' : 'paused'
          });
        } else {
          await MediaSession.setPlaybackState({
            playbackState: 'none'
          });
        }
      }

      // ── Web API: ALWAYS set navigator.mediaSession ────────────────────
      // Chrome WebView uses this (not the native MediaSessionCompat) to
      // decide whether to pause <audio> elements when the page goes to
      // background. Without this, Chrome kills audio on home-screen.
      if ('mediaSession' in navigator) {
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
        const skipTime = details.seekOffset || 10;
        if (isNative) {
          // Note: To be totally robust we'd need to fetch current time, but we can assume a store read
          // Actually, we can use the JS track store progress / 1000.
          const { progress } = usePlayerStore.getState();
          const newTime = Math.max((progress / 1000) - skipTime, 0);
          NativePlayer.seekTo({ time: newTime }).catch(console.error);
        } else if (audioRef.current) {
          const newTime = Math.max(audioRef.current.currentTime - skipTime, 0);
          audioRef.current.currentTime = newTime;
        }
      }],
      ['seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        const duration = currentTrack?.duration ? currentTrack.duration / 1000 : 0;
        if (isNative) {
          const { progress } = usePlayerStore.getState();
          const newTime = Math.min((progress / 1000) + skipTime, duration);
          NativePlayer.seekTo({ time: newTime }).catch(console.error);
        } else if (audioRef.current) {
          const newTime = Math.min(audioRef.current.currentTime + skipTime, audioRef.current.duration || duration);
          audioRef.current.currentTime = newTime;
        }
      }],
      ['seekto', (details) => {
        if (details.seekTime != null) {
          if (isNative) {
            NativePlayer.seekTo({ time: details.seekTime }).catch(console.error);
          } else if (audioRef.current) {
            audioRef.current.currentTime = details.seekTime;
          }
        }
      }],
    ];

    type CapgoMediaSessionAction = 'play' | 'pause' | 'seekbackward' | 'seekforward' | 'previoustrack' | 'nexttrack' | 'seekto' | 'stop';

    // Native: Capgo plugin for notification controls
    if (isNative) {
      for (const [action, handler] of actionHandlers) {
        MediaSession.setActionHandler({ action: action as CapgoMediaSessionAction }, handler);
      }
    }

    // Web API: ALWAYS register handlers so Chrome WebView knows this is
    // an active media session (required for background audio policy).
    if ('mediaSession' in navigator) {
      for (const [action, handler] of actionHandlers) {
        try {
          navigator.mediaSession.setActionHandler(action as globalThis.MediaSessionAction, handler);
        } catch {}
      }
    }

    return () => {
      if (isNative) {
        for (const [action] of actionHandlers) {
          MediaSession.setActionHandler({ action: action as CapgoMediaSessionAction }, null).catch(() => {});
        }
      }
      if ('mediaSession' in navigator) {
        for (const [action] of actionHandlers) {
          try {
            navigator.mediaSession.setActionHandler(action as globalThis.MediaSessionAction, null);
          } catch {}
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
        }
        // Always update Web API position so Chrome keeps the session alive
        if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
          try {
            navigator.mediaSession.setPositionState({
              duration,
              playbackRate: audio.playbackRate,
              position: audio.currentTime,
            });
          } catch {}
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
      }
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    };

    const onPause = () => {
      if (isNative) {
        MediaSession.setPlaybackState({ playbackState: 'paused' });
      }
      if ('mediaSession' in navigator) {
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


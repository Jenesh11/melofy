'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { MobilePlayer } from '@/components/player/MobilePlayer';
import { DesktopPlayer } from '@/components/player/DesktopPlayer';
import { PipPlayer } from '@/components/player/PipPlayer';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { useDocPip } from '@/hooks/usePip';
import { useAuth } from '@/lib/firebase/auth-context';
import { buildStreamUrl } from '@/lib/streamUrl';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import { useLyricsPanelStore } from '@/store/useLyricsPanelStore';
import { usePlayerStore, type Track } from '@/store/usePlayerStore';
import { Capacitor } from '@capacitor/core';

interface PipState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  progressPercent: number;
  currentDisplayTime: string;
  durationTime: string;
  isLiked: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  volume: number;
}

export function PlayerShell() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [streamSrc, setStreamSrc] = useState<string | undefined>(undefined);
  const [streamTrackId, setStreamTrackId] = useState<string | null>(null);
  const [streamSrcIssuedAt, setStreamSrcIssuedAt] = useState(0);
  const audioErrorRetryRef = useRef<{ trackId: string | null; attempts: number }>({
    trackId: null,
    attempts: 0,
  });

  const { isOpen: isLyricsOpen, toggle: toggleLyricsPanel } = useLyricsPanelStore();

  const { user } = useAuth();
  const refreshStreamSrc = useCallback(async () => {
    const encodedTrack = usePlayerStore.getState().currentTrack?.url;
    if (!encodedTrack || !user) {
      setStreamSrc(undefined);
      setStreamTrackId(null);
      setStreamSrcIssuedAt(0);
      return null;
    }

    const url = await buildStreamUrl(encodedTrack, user);
    setStreamSrc(url ?? undefined);
    setStreamTrackId(usePlayerStore.getState().currentTrack?.id ?? null);
    setStreamSrcIssuedAt(url ? Date.now() : 0);
    return url;
  }, [user]);

  const playback = useAudioPlayback(streamSrc, {
    refreshStreamSrc,
    streamSrcIssuedAt,
    streamTrackId,
  });
  const { isLiked, toggleLike } = useLikedSongs();

  const pip = useDocPip(playback.currentTrack, playback.isPlaying);

  // Synchronize state and commands with the Tauri PiP window
  const channelRef = useRef<BroadcastChannel | null>(null);
  const latestStateRef = useRef<PipState | null>(null);

  latestStateRef.current = {
    currentTrack: playback.currentTrack,
    isPlaying: playback.isPlaying,
    isBuffering: playback.isBuffering,
    progressPercent: playback.progressPercent,
    currentDisplayTime: playback.currentDisplayTime,
    durationTime: playback.durationTime,
    isLiked: playback.currentTrack ? isLiked(playback.currentTrack.id) : false,
    isShuffle: playback.isShuffle,
    isRepeat: playback.isRepeat,
    volume: playback.volume,
  };

  useEffect(() => {
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (!isTauri) return;

    const channel = new BroadcastChannel('melofy-pip');
    channelRef.current = channel;

    const handleMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || data.type !== 'command') return;

      switch (data.action) {
        case 'request-state':
          if (latestStateRef.current) {
            channel.postMessage({ type: 'state-update', state: latestStateRef.current });
          }
          break;
        case 'togglePlay':
          playback.handleTogglePlay();
          break;
        case 'skipNext':
          playback.handleSkipNext();
          break;
        case 'playPrevious':
          playback.playPrevious();
          break;
        case 'seek':
          if (typeof data.value === 'number') {
            playback.handleSeek([data.value]);
          }
          break;
        case 'volume':
          if (typeof data.value === 'number') {
            playback.setVolume(data.value);
          }
          break;
        case 'toggleLike':
          if (playback.currentTrack) {
            toggleLike(playback.currentTrack);
          }
          break;
        case 'toggleShuffle':
          playback.toggleShuffle();
          break;
        case 'toggleRepeat':
          playback.toggleRepeat();
          break;
        case 'close':
          pip.closePip();
          break;
        default:
          break;
      }
    };

    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
      channelRef.current = null;
    };
  }, [playback, toggleLike, pip]);

  useEffect(() => {
    if (!channelRef.current) return;
    channelRef.current.postMessage({ type: 'state-update', state: latestStateRef.current });
  }, [
    playback.currentTrack,
    playback.isPlaying,
    playback.isBuffering,
    playback.progressPercent,
    playback.currentDisplayTime,
    playback.durationTime,
    playback.isShuffle,
    playback.isRepeat,
    playback.volume,
    isLiked,
  ]);

  useEffect(() => {
    let cancelled = false;

    const buildStreamSrc = async () => {
      const encodedTrack = playback.currentTrack?.url;
      if (!encodedTrack || !user) {
        if (!cancelled) {
          setStreamSrc(undefined);
          setStreamTrackId(null);
          setStreamSrcIssuedAt(0);
        }
        return;
      }

      try {
        const url = await buildStreamUrl(encodedTrack, user);
        if (cancelled) return;
        setStreamSrc(url ?? undefined);
        setStreamTrackId(playback.currentTrack?.id ?? null);
        setStreamSrcIssuedAt(url ? Date.now() : 0);
      } catch (error) {
        if (!cancelled) {
          setStreamSrc(undefined);
          setStreamTrackId(null);
          setStreamSrcIssuedAt(0);
          console.error('[PlayerShell] Failed to prepare stream URL:', error);
          const trackTitle = playback.currentTrack?.title || 'Unknown Track';
          const partyState = usePlayerStore.getState();
          if (partyState.partyId && !partyState.isPartyHost) {
            toast.error(`Failed to stream "${trackTitle}". Waiting for host sync...`);
            usePlayerStore.getState().pause(true);
            return;
          }
          toast.error(`Failed to stream "${trackTitle}". Skipping...`);
          usePlayerStore.getState().playNext(true, true);
        }
      }
    };

    void buildStreamSrc();

    return () => {
      cancelled = true;
    };
  }, [playback.currentTrack?.id, playback.currentTrack?.url, playback.currentTrack?.title, user]);

  useEffect(() => {
    audioErrorRetryRef.current = {
      trackId: playback.currentTrack?.id ?? null,
      attempts: 0,
    };
  }, [playback.currentTrack?.id]);

  const sharedProps = playback.currentTrack ? {
    currentTrack: playback.currentTrack,
    isShuffle: playback.isShuffle,
    toggleShuffle: playback.toggleShuffle,
    isAutoplay: playback.isAutoplay,
    playPrevious: playback.playPrevious,
    handleTogglePlay: playback.handleTogglePlay,
    handleSkipNext: playback.handleSkipNext,
    isPlaying: playback.isPlaying,
    isRepeat: playback.isRepeat,
    toggleRepeat: playback.toggleRepeat,
    isBuffering: playback.isBuffering,
    progressPercent: playback.progressPercent,
    currentDisplayTime: playback.currentDisplayTime,
    durationTime: playback.durationTime,
    isDraggingSlider: playback.isDraggingSlider,
    setIsDraggingSlider: playback.setIsDraggingSlider,
    setSliderValue: playback.setSliderValue,
    handleSeek: playback.handleSeek,
  } : null;

  return (
    <>
      <audio
        ref={playback.audioRef}
        src={Capacitor.isNativePlatform() ? undefined : (streamTrackId === playback.currentTrack?.id ? streamSrc : undefined)}
        onLoadedData={(e) => {
          e.currentTarget.volume = Capacitor.isNativePlatform() ? 1 : playback.volume;
          const pendingProgressSeconds = usePlayerStore.getState().progress / 1000;
          if (
            !Capacitor.isNativePlatform() &&
            pendingProgressSeconds > 0 &&
            e.currentTarget.currentTime < 0.5
          ) {
            e.currentTarget.currentTime = pendingProgressSeconds;
          }
        }}
        onDurationChange={(e) => {
          const audio = e.currentTarget;
          const track = playback.currentTrack;
          if (audio && audio.duration && track) {
            const actualDurationMs = Math.floor(audio.duration * 1000);
            if (
              actualDurationMs > 0 &&
              isFinite(actualDurationMs) &&
              (isNaN(track.duration) || Math.abs(track.duration - actualDurationMs) > 1000)
            ) {
              usePlayerStore.setState((state) => {
                if (state.currentTrack && state.currentTrack.id === track.id) {
                  return {
                    currentTrack: {
                      ...state.currentTrack,
                      duration: actualDurationMs,
                    }
                  };
                }
                return {};
              });
            }
          }
        }}
        onEnded={() => {
          if (!Capacitor.isNativePlatform()) playback.handleTrackEnd();
        }}
        onWaiting={() => {
          if (!Capacitor.isNativePlatform()) playback.setIsBuffering(true);
        }}
        onCanPlay={(e) => {
          if (!Capacitor.isNativePlatform()) {
            playback.setIsBuffering(false);
            if (playback.isPlaying) {
              e.currentTarget.play().catch(() => {});
            }
          }
        }}
        onLoadStart={() => {
          if (!Capacitor.isNativePlatform()) playback.setIsBuffering(true);
        }}
        onPlaying={() => {
          if (!Capacitor.isNativePlatform()) {
            playback.setIsBuffering(false);
            audioErrorRetryRef.current = {
              trackId: playback.currentTrack?.id ?? null,
              attempts: 0,
            };
          }
        }}
        onTimeUpdate={(e) => {
          if (!Capacitor.isNativePlatform() && !playback.isDraggingSlider) {
            playback.setCurrentTime(e.currentTarget.currentTime);
          }
        }}
        onSeeked={() => {
          if (!Capacitor.isNativePlatform()) {
            usePlayerStore.setState((state) => ({
              seekTrigger: (state.seekTrigger || 0) + 1,
            }));
          }
        }}
        autoPlay={!Capacitor.isNativePlatform() && playback.isPlaying}
        onError={(e) => {
          if (!playback.currentTrack?.url) return;
          const error = e.currentTarget.error;
          console.error('[PlayerShell] Audio error:', error);
          const trackId = playback.currentTrack.id;
          const retry = audioErrorRetryRef.current;

          if (
            !Capacitor.isNativePlatform() &&
            retry.trackId === trackId &&
            retry.attempts < 1
          ) {
            retry.attempts += 1;
            playback.setIsBuffering(true);
            const audio = e.currentTarget;
            void refreshStreamSrc()
              .then((freshSrc) => {
                const latestState = usePlayerStore.getState();
                if (!freshSrc || latestState.currentTrack?.id !== trackId) return;

                const resumeAt = latestState.progress / 1000;
                if (audio.src !== freshSrc) {
                  audio.src = freshSrc;
                }
                const restoreResumeTime = () => {
                  if (resumeAt > 0 && audio.currentTime < 0.5) {
                    audio.currentTime = resumeAt;
                  }
                };
                if (audio.readyState >= 1) {
                  restoreResumeTime();
                } else {
                  audio.addEventListener('loadedmetadata', restoreResumeTime, { once: true });
                }
                if (latestState.isPlaying) {
                  audio.play().catch(console.error);
                }
              })
              .catch((refreshError) => {
                console.error('[PlayerShell] Failed to refresh stream after audio error:', refreshError);
              })
              .finally(() => {
                playback.setIsBuffering(false);
              });
            return;
          }

          const trackTitle = playback.currentTrack?.title || 'Unknown Track';
          const partyState = usePlayerStore.getState();
          if (partyState.partyId && !partyState.isPartyHost) {
            toast.error(`Playback issue with "${trackTitle}". Waiting for host sync...`);
            usePlayerStore.getState().pause(true);
            return;
          }
          if (error?.code === 4) {
            toast.error(`Track "${trackTitle}" is currently unavailable or unsupported. Skipping...`);
          } else {
            toast.error(`Playback issue with "${trackTitle}". Skipping...`);
          }
          usePlayerStore.getState().playNext(true, true);
        }}
      />

      {playback.currentTrack && sharedProps ? (
        <>
          <MobilePlayer
            {...sharedProps}
            isExpanded={isExpanded}
            setIsExpanded={setIsExpanded}
          />

          <DesktopPlayer
            {...sharedProps}
            volume={playback.volume}
            setVolume={playback.setVolume}
            handleVolumeWheel={playback.handleVolumeWheel}
            onExpand={() => setIsExpanded(true)}
            onOpenPip={pip.openPip}
            isPipOpen={pip.isPipOpen}
            isLyricsOpen={isLyricsOpen}
            toggleLyrics={toggleLyricsPanel}
          />
        </>
      ) : (
        <div className='h-14 md:h-20 border-t border-white/5 bg-black/60 backdrop-blur-3xl flex items-center justify-center text-zinc-500 text-sm w-full relative mb-16 md:mb-0'>
          Select a track to start listening
        </div>
      )}

      {/* Document PiP portal — renders inside the floating window */}
      {pip.isPipOpen && pip.pipWindow &&
        createPortal(
          <PipPlayer
            currentTrack={playback.currentTrack || null}
            isPlaying={playback.isPlaying}
            isBuffering={playback.isBuffering}
            progressPercent={playback.progressPercent}
            currentDisplayTime={playback.currentDisplayTime}
            durationTime={playback.durationTime}
            isLiked={playback.currentTrack ? isLiked(playback.currentTrack.id) : false}
            isShuffle={playback.isShuffle}
            isRepeat={playback.isRepeat}
            volume={playback.volume}
            setVolume={playback.setVolume}
            toggleLike={toggleLike}
            toggleShuffle={playback.toggleShuffle}
            toggleRepeat={playback.toggleRepeat}
            handleTogglePlay={playback.handleTogglePlay}
            handleSkipNext={playback.handleSkipNext}
            playPrevious={playback.playPrevious}
            handleSeek={playback.handleSeek}
            onClose={pip.closePip}
          />,
          pip.pipWindow.document.body
        )
      }
    </>
  );
}

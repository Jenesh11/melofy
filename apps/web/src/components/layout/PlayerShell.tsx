'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MobilePlayer } from '@/components/player/MobilePlayer';
import { DesktopPlayer } from '@/components/player/DesktopPlayer';
import { PipPlayer } from '@/components/player/PipPlayer';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { useDocPip } from '@/hooks/usePip';
import { useTrackStream } from '@/hooks/useTrackStream';
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
  const { streamSrc, streamTrackId, streamSrcIssuedAt, mediaKey, isRecovering, refreshStreamSrc, recoverStream } = useTrackStream();

  const { isOpen, activeTab, toggle: togglePanel } = useLyricsPanelStore();
  const isLyricsOpen = isOpen && activeTab === 'lyrics';
  const isQueueOpen = isOpen && activeTab === 'queue';
  const toggleLyricsPanel = useCallback(() => togglePanel('lyrics'), [togglePanel]);
  const toggleQueuePanel = useCallback(() => togglePanel('queue'), [togglePanel]);

  const { audioRef, ...playback } = useAudioPlayback(streamSrc, {
    refreshStreamSrc,
    streamSrcIssuedAt,
    streamTrackId,
  });
  const { isLiked, toggleLike } = useLikedSongs();

  const pip = useDocPip(playback.currentTrack, playback.isPlaying);

  // Synchronize state and commands with the Tauri PiP window
  const channelRef = useRef<BroadcastChannel | null>(null);
  const latestStateRef = useRef<PipState | null>(null);

  useEffect(() => {
    latestStateRef.current = {
    currentTrack: playback.currentTrack,
    isPlaying: playback.isPlaying,
    isBuffering: playback.isBuffering || isRecovering,
    progressPercent: playback.progressPercent,
    currentDisplayTime: playback.currentDisplayTime,
    durationTime: playback.durationTime,
    isLiked: playback.currentTrack ? isLiked(playback.currentTrack.id) : false,
    isShuffle: playback.isShuffle,
    isRepeat: playback.isRepeat,
    volume: playback.volume,
  };
  }, [playback, isLiked, isRecovering]);

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

  const isCurrentAudio = (audio: HTMLAudioElement) => {
    const current = usePlayerStore.getState().currentTrack;
    return !Capacitor.isNativePlatform() && audio === audioRef.current && audio.isConnected &&
      current?.id === playback.currentTrack?.id && current?.url === playback.currentTrack?.url &&
      !!streamSrc && audio.getAttribute('src') === streamSrc && (!audio.currentSrc || audio.currentSrc === streamSrc);
  };

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
    isBuffering: playback.isBuffering || isRecovering,
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
        key={mediaKey}
        ref={audioRef}
        src={Capacitor.isNativePlatform() ? undefined : (streamTrackId === playback.currentTrack?.id ? streamSrc : undefined)}
        onLoadedData={(e) => {
          if (!isCurrentAudio(e.currentTarget)) return;
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
          if (!isCurrentAudio(e.currentTarget)) return;
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
        onEnded={(e) => {
          if (isCurrentAudio(e.currentTarget) && e.currentTarget.ended && !e.currentTarget.error && usePlayerStore.getState().isPlaying) playback.handleTrackEnd();
        }}
        onWaiting={() => {
          if (!Capacitor.isNativePlatform()) playback.setIsBuffering(true);
        }}
        onCanPlay={(e) => {
          if (!isCurrentAudio(e.currentTarget)) return;
          if (!Capacitor.isNativePlatform()) {
            playback.setIsBuffering(false);
            if (usePlayerStore.getState().isPlaying) {
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

          }
        }}
        onTimeUpdate={(e) => {
          if (!isCurrentAudio(e.currentTarget)) return;
          // Swapping src (e.g. a refreshed ticket after a stream error) emits a
          // timeupdate at 0 before any data loads. Recording it would erase the
          // playhead that onLoadedData restores, restarting the song.
          if (e.currentTarget.readyState < HTMLMediaElement.HAVE_METADATA) return;
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
          if (!isCurrentAudio(e.currentTarget) || !e.currentTarget.error || e.currentTarget.error.code === 1) return;
          playback.setIsBuffering(false);
          void recoverStream();
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
            isQueueOpen={isQueueOpen}
            toggleQueue={toggleQueuePanel}
          />
        </>
      ) : (
        <>
          {/* Mobile: only reserve room for the fixed bottom navigation. */}
          <div className='h-16 md:hidden' />
          <div className='hidden md:flex h-[84px] bg-canvas items-center justify-center gap-2 text-sm text-muted-foreground w-full'>
            <span className='h-1.5 w-1.5 rounded-full bg-muted-foreground/50' />
            Pick a song to start listening
          </div>
        </>
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

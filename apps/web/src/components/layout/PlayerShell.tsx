'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MobilePlayer } from '@/components/player/MobilePlayer';
import { DesktopPlayer } from '@/components/player/DesktopPlayer';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';

export function PlayerShell() {
  const [isExpanded, setIsExpanded] = useState(false);

  const playback = useAudioPlayback();

  if (!playback.currentTrack) {
    return (
      <div className='h-14 md:h-20 border-t border-white/5 bg-black/60 backdrop-blur-3xl flex items-center justify-center text-zinc-500 text-sm w-full absolute bottom-16 md:relative md:bottom-0'>
        Select a track to start listening
      </div>
    );
  }

  const sharedProps = {
    currentTrack: playback.currentTrack,
    isShuffle: playback.isShuffle,
    toggleShuffle: playback.toggleShuffle,
    isAutoplay: playback.isAutoplay,
    toggleAutoplay: playback.toggleAutoplay,
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
  };

  return (
    <>
      <audio
        ref={playback.audioRef}
        src={
          playback.currentTrack.url
            ? `/api/stream?url=${encodeURIComponent(playback.currentTrack.url)}`
            : undefined
        }
        onTimeUpdate={(e) =>
          !playback.isDraggingSlider &&
          playback.setCurrentTime(e.currentTarget.currentTime)
        }
        onEnded={playback.handleTrackEnd}
        onWaiting={() => playback.setIsBuffering(true)}
        onCanPlay={() => playback.setIsBuffering(false)}
        onLoadStart={() => playback.setIsBuffering(true)}
        onPlaying={() => playback.setIsBuffering(false)}
        autoPlay={playback.isPlaying}
        onError={(e) => {
          if (!playback.currentTrack?.url) return;
          const error = e.currentTarget.error;
          console.error('[PlayerShell] Audio error:', error);
          if (error?.code === 4) {
            toast.error('This track is currently unavailable or unsupported');
          }
        }}
      />

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
      />
    </>
  );
}

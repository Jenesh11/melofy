'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MobilePlayer } from '@/components/player/MobilePlayer';
import { DesktopPlayer } from '@/components/player/DesktopPlayer';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { useAuth } from '@/lib/firebase/auth-context';
import { getFirebaseAuthHeaders } from '@/lib/firebase/client-auth';

export function PlayerShell() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [streamSrc, setStreamSrc] = useState<string | undefined>(undefined);

  const playback = useAudioPlayback();
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const buildStreamSrc = async () => {
      const encodedTrack = playback.currentTrack?.url;
      if (!encodedTrack || !user) {
        if (!cancelled) setStreamSrc(undefined);
        return;
      }

      try {
        const authHeaders = await getFirebaseAuthHeaders(user);
        const ticketRes = await fetch('/api/stream-ticket', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({ url: encodedTrack }),
        });
        if (!ticketRes.ok) {
          throw new Error(`Failed to create stream ticket (${ticketRes.status})`);
        }

        const ticketData = (await ticketRes.json()) as { ticket?: string };
        if (!ticketData.ticket) {
          throw new Error('Missing stream ticket');
        }

        if (cancelled) return;
        const params = new URLSearchParams({
          ticket: ticketData.ticket,
          url: encodedTrack,
        });
        setStreamSrc(`/api/stream?${params.toString()}`);
      } catch (error) {
        if (!cancelled) setStreamSrc(undefined);
        console.error('[PlayerShell] Failed to prepare stream URL:', error);
      }
    };

    void buildStreamSrc();

    return () => {
      cancelled = true;
    };
  }, [playback.currentTrack?.url, user]);

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
        src={streamSrc}
        onLoadedData={(e) => {
          e.currentTarget.volume = playback.volume;
        }}
        onTimeUpdate={(e) =>
          !playback.isDraggingSlider &&
          playback.setCurrentTime(e.currentTarget.currentTime)
        }
        onEnded={playback.handleTrackEnd}
        onWaiting={() => playback.setIsBuffering(true)}
        onCanPlay={(e) => {
          playback.setIsBuffering(false);
          if (playback.isPlaying) {
            e.currentTarget.play().catch(() => {});
          }
        }}
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

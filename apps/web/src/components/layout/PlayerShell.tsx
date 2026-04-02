'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { MobilePlayer } from '@/components/player/MobilePlayer';
import { DesktopPlayer } from '@/components/player/DesktopPlayer';
import { PipPlayer } from '@/components/player/PipPlayer';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { useDocPip } from '@/hooks/usePip';
import { useAuth } from '@/lib/firebase/auth-context';
import { getFirebaseAuthHeaders } from '@/lib/firebase/client-auth';
import { useLikedSongs } from '@/hooks/useLikedSongs';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SyncedLyrics } from '@/components/ui/SyncedLyrics';

export function PlayerShell() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [streamSrc, setStreamSrc] = useState<string | undefined>(undefined);

  const playback = useAudioPlayback();
  const { user } = useAuth();
  const { isLiked, toggleLike } = useLikedSongs();

  const pip = useDocPip(playback.currentTrack, playback.isPlaying);

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

  const sharedProps = playback.currentTrack ? {
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
  } : null;

  return (
    <>
      <audio
        ref={playback.audioRef}
        src={streamSrc}
        onLoadedData={(e) => {
          e.currentTarget.volume = playback.volume;
        }}
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
            toggleLyrics={() => setIsLyricsOpen(!isLyricsOpen)}
          />
        </>
      ) : (
        <div className='h-14 md:h-20 border-t border-white/5 bg-black/60 backdrop-blur-3xl flex items-center justify-center text-zinc-500 text-sm w-full absolute bottom-16 md:relative md:bottom-0'>
          Select a track to start listening
        </div>
      )}

      {/* Lyrics Modal Overlay */}
      <AnimatePresence>
        {isLyricsOpen && playback.currentTrack && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 md:p-8'
          >
            <div
              className='absolute inset-0 cursor-pointer'
              onClick={() => setIsLyricsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className='relative w-full max-w-4xl h-[80vh] bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col'
            >
              <div className='absolute top-4 right-4 z-50'>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setIsLyricsOpen(false)}
                  className='text-white/60 hover:text-white hover:bg-white/10 rounded-full h-12 w-12'
                >
                  <X className='h-8 w-8' />
                </Button>
              </div>

              <div className='flex-1 min-h-0 relative'>
                <SyncedLyrics />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { PipPlayer } from '@/components/player/PipPlayer';
import { Track } from '@/store/usePlayerStore';

export default function PipPage() {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentDisplayTime, setCurrentDisplayTime] = useState('0:00');
  const [durationTime, setDurationTime] = useState('0:00');
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [volume, setVolume] = useState(1);

  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('melofy-pip');
    channelRef.current = channel;

    const handleMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || data.type !== 'state-update') return;

      const state = data.state;
      if (!state) return;

      setCurrentTrack(state.currentTrack);
      setIsPlaying(state.isPlaying);
      setIsBuffering(state.isBuffering);
      setProgressPercent(state.progressPercent);
      setCurrentDisplayTime(state.currentDisplayTime);
      setDurationTime(state.durationTime);
      setIsLiked(state.isLiked);
      setIsShuffle(state.isShuffle);
      setIsRepeat(state.isRepeat);
      setVolume(state.volume);
    };

    channel.addEventListener('message', handleMessage);

    // Request initial state from the main window
    channel.postMessage({ type: 'command', action: 'request-state' });

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
      channelRef.current = null;
    };
  }, []);

  // Optimistic + dispatch: update local state immediately, then notify main window.
  // The authoritative state-update from main window will correct any drift.

  const handleTogglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
    channelRef.current?.postMessage({ type: 'command', action: 'togglePlay' });
  }, []);

  const handleSkipNext = useCallback(() => {
    channelRef.current?.postMessage({ type: 'command', action: 'skipNext' });
  }, []);

  const playPrevious = useCallback(() => {
    channelRef.current?.postMessage({ type: 'command', action: 'playPrevious' });
  }, []);

  const handleSeek = useCallback((val: number[]) => {
    channelRef.current?.postMessage({ type: 'command', action: 'seek', value: val[0] });
  }, []);

  const handleSetVolume = useCallback((val: number) => {
    setVolume(val);
    channelRef.current?.postMessage({ type: 'command', action: 'volume', value: val });
  }, []);

  const toggleLike = useCallback(() => {
    setIsLiked(prev => !prev);
    channelRef.current?.postMessage({ type: 'command', action: 'toggleLike' });
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle(prev => !prev);
    channelRef.current?.postMessage({ type: 'command', action: 'toggleShuffle' });
  }, []);

  const toggleRepeat = useCallback(() => {
    setIsRepeat(prev => !prev);
    channelRef.current?.postMessage({ type: 'command', action: 'toggleRepeat' });
  }, []);

  const handleClose = useCallback(() => {
    channelRef.current?.postMessage({ type: 'command', action: 'close' });
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="w-screen h-screen overflow-hidden bg-transparent select-none"
      style={{
        borderRadius: '6px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <PipPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        isBuffering={isBuffering}
        progressPercent={progressPercent}
        currentDisplayTime={currentDisplayTime}
        durationTime={durationTime}
        isLiked={isLiked}
        isShuffle={isShuffle}
        isRepeat={isRepeat}
        volume={volume}
        setVolume={handleSetVolume}
        toggleLike={toggleLike}
        toggleShuffle={toggleShuffle}
        toggleRepeat={toggleRepeat}
        handleTogglePlay={handleTogglePlay}
        handleSkipNext={handleSkipNext}
        playPrevious={playPrevious}
        handleSeek={handleSeek}
        onClose={handleClose}
      />
    </div>
  );
}

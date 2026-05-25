import { SkipBack, SkipForward, Play, Pause, Loader2, Heart, X, Shuffle, Repeat, Music2, Volume2, VolumeX } from 'lucide-react';
import { Track } from '@/store/usePlayerStore';
import { useEffect, useRef, useState } from 'react';

interface PipPlayerProps {
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
  setVolume: (v: number) => void;
  toggleLike: (track: Track) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  handleTogglePlay: () => void;
  handleSkipNext: () => void;
  playPrevious: () => void;
  handleSeek: (value: number[]) => void;
  onClose: () => void;
}

export function PipPlayer({
  currentTrack,
  isPlaying,
  isBuffering,
  progressPercent,
  currentDisplayTime,
  durationTime,
  isLiked,
  isShuffle,
  isRepeat,
  volume,
  setVolume,
  toggleLike,
  toggleShuffle,
  toggleRepeat,
  handleTogglePlay,
  handleSkipNext,
  playPrevious,
  handleSeek,
  onClose,
}: PipPlayerProps) {
  const bgRef = useRef<HTMLDivElement>(null);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);

  // Update background image when track changes (inline style to avoid reflow)
  useEffect(() => {
    if (bgRef.current) {
      bgRef.current.style.backgroundImage = currentTrack?.artworkUrl ? `url(${currentTrack.artworkUrl})` : 'none';
    }
  }, [currentTrack?.artworkUrl]);

  const hasTrack = !!currentTrack;

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  if (isTauri) {
    return (
      <div
        data-tauri-drag-region
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#fff',
          userSelect: 'none',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '12px 16px 8px 16px',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        }}
      >
        {/* ── Dynamic blurred background ── */}
        <div
          data-tauri-drag-region
          ref={bgRef}
          style={{
            position: 'absolute',
            inset: '-20px',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(36px) saturate(1.8)',
            opacity: hasTrack ? 0.75 : 0.3,
            transform: 'scale(1.1)',
            backgroundImage: hasTrack ? `url(${currentTrack.artworkUrl})` : 'none',
            backgroundColor: '#1b1b22',
            zIndex: 0,
          }}
        />
        {/* Scrim */}
        <div data-tauri-drag-region style={{ position: 'absolute', inset: 0, background: hasTrack ? 'linear-gradient(to bottom, rgba(20,20,25,0.15) 0%, rgba(20,20,25,0.4) 100%)' : 'rgba(20,20,25,0.45)', zIndex: 1 }} />
        {/* Subtle border */}
        <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(255,255,255,0.06)', zIndex: 10, pointerEvents: 'none' }} />

        {/* ── Close button ── */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 20,
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: '50%',
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)',
            padding: 0,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget.style.background = 'rgba(255,255,255,0.18)'); (e.currentTarget.style.color = '#fff'); }}
          onMouseLeave={(e) => { (e.currentTarget.style.background = 'rgba(255,255,255,0.08)'); (e.currentTarget.style.color = 'rgba(255,255,255,0.5)'); }}
          title='Close'
        >
          <X size={11} />
        </button>

        {/* ── Horizontal Main content wrapper ── */}
        <div
          data-tauri-drag-region
          style={{
            position: 'relative',
            zIndex: 5,
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            flex: 1,
            marginTop: 4,
          }}
        >
          {/* ── Artwork ── */}
          <div style={{
            position: 'relative',
            width: 72,
            height: 72,
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.05)',
            flexShrink: 0,
          }}>
            {currentTrack && currentTrack.artworkUrl ? (
              <img
                // eslint-disable-next-line @next/next/no-img-element
                src={currentTrack.artworkUrl}
                alt={currentTrack.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.2)' }}>
                <Music2 size={28} />
              </div>
            )}
          </div>

          {/* ── Title, Artist, & Controls Column ── */}
          <div
            data-tauri-drag-region
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              justifyContent: 'center',
              minWidth: 0,
              gap: 8,
            }}
          >
            {/* Title & Artist Group */}
            <div data-tauri-drag-region style={{ width: '100%', maxWidth: '280px' }}>
              <div data-tauri-drag-region style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.2,
              }}>
                {hasTrack ? currentTrack.title : 'Nothing playing'}
              </div>
              <div data-tauri-drag-region style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.55)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: 1,
                lineHeight: 1.2,
              }}>
                {hasTrack ? currentTrack.artist : 'Melofy'}
              </div>
            </div>

            {/* Row with Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
              {/* Like */}
              <button
                onClick={() => hasTrack && toggleLike(currentTrack)}
                disabled={!hasTrack}
                style={{
                  ...iconBtn(isLiked ? '#ef4444' : 'rgba(255,255,255,0.45)'),
                  opacity: hasTrack ? 1 : 0.3,
                  cursor: hasTrack ? 'pointer' : 'default',
                  padding: 4,
                }}
                title={isLiked ? 'Unlike' : 'Like'}
              >
                <Heart size={13} fill={isLiked ? '#ef4444' : 'none'} />
              </button>

              {/* Prev */}
              <button 
                onClick={playPrevious} 
                disabled={!hasTrack}
                style={{
                  ...iconBtn('rgba(255,255,255,0.75)'),
                  opacity: hasTrack ? 1 : 0.3,
                  cursor: hasTrack ? 'pointer' : 'default',
                  padding: 4,
                }} 
                title='Previous'
              >
                <SkipBack size={16} fill='currentColor' />
              </button>

              {/* Play / Pause */}
              <button
                onClick={handleTogglePlay}
                disabled={!hasTrack || isBuffering}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#fff',
                  color: '#000',
                  border: 'none',
                  cursor: (!hasTrack || isBuffering) ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.3)',
                  flexShrink: 0,
                  opacity: (!hasTrack || isBuffering) ? 0.6 : 1,
                  transition: 'transform 0.1s, opacity 0.15s',
                  padding: 0,
                }}
                onMouseEnter={(e) => { if (hasTrack && !isBuffering) e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {isBuffering ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : isPlaying ? (
                  <Pause size={14} fill='currentColor' />
                ) : (
                  <Play size={14} fill='currentColor' style={{ marginLeft: 2 }} />
                )}
              </button>

              {/* Next */}
              <button 
                onClick={handleSkipNext} 
                disabled={!hasTrack}
                style={{
                  ...iconBtn('rgba(255,255,255,0.75)'),
                  opacity: hasTrack ? 1 : 0.3,
                  cursor: hasTrack ? 'pointer' : 'default',
                  padding: 4,
                }} 
                title='Next'
              >
                <SkipForward size={16} fill='currentColor' />
              </button>

              {/* Shuffle */}
              <button
                onClick={toggleShuffle}
                disabled={!hasTrack}
                style={{
                  ...iconBtn(isShuffle ? '#1db954' : 'rgba(255,255,255,0.45)'),
                  opacity: hasTrack ? 1 : 0.3,
                  cursor: hasTrack ? 'pointer' : 'default',
                  padding: 4,
                }}
                title='Shuffle'
              >
                <Shuffle size={13} />
              </button>

              {/* Repeat */}
              <button
                onClick={toggleRepeat}
                disabled={!hasTrack}
                style={{
                  ...iconBtn(isRepeat ? '#1db954' : 'rgba(255,255,255,0.45)'),
                  opacity: hasTrack ? 1 : 0.3,
                  cursor: hasTrack ? 'pointer' : 'default',
                  padding: 4,
                }}
                title='Repeat'
              >
                <Repeat size={13} />
              </button>

              {/* Volume */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 2, flex: 1, maxWidth: 80 }}>
                <button
                  onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
                  style={{ ...iconBtn('rgba(255,255,255,0.45)'), padding: 2 }}
                  title={volume === 0 ? 'Unmute' : 'Mute'}
                >
                  {volume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} />}
                </button>

                <div
                  style={{ flex: 1, height: 20, display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    setVolume(Math.max(0, Math.min(1, x / rect.width)));
                  }}
                  onMouseDown={() => setIsDraggingVolume(true)}
                  onMouseMove={(e) => {
                    if (!isDraggingVolume) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    setVolume(Math.max(0, Math.min(1, x / rect.width)));
                  }}
                  onMouseUp={() => setIsDraggingVolume(false)}
                  onMouseLeave={() => setIsDraggingVolume(false)}
                >
                  <div style={{ height: 2, width: '100%', background: 'rgba(255,255,255,0.15)', borderRadius: 1, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ height: '100%', width: `${volume * 100}%`, background: 'rgba(255,255,255,0.8)', borderRadius: 1, transition: isDraggingVolume ? 'none' : 'width 0.05s linear' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div style={{ width: '100%', opacity: hasTrack ? 1 : 0.3, marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1, padding: '0 2px' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums' }}>
              {hasTrack ? currentDisplayTime : '0:00'}
            </span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums' }}>
              {hasTrack ? durationTime : '0:00'}
            </span>
          </div>
          
          <div 
            onClick={(e) => {
              if (!hasTrack) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const clickedPercent = (x / rect.width) * 100;
              handleSeek([clickedPercent]);
            }}
            style={{
              height: 12,
              display: 'flex',
              alignItems: 'center',
              cursor: hasTrack ? 'pointer' : 'default',
              position: 'relative',
            }}
          >
            <div style={{
              height: 2,
              width: '100%',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 1,
              overflow: 'hidden',
              position: 'relative',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.max(0, Math.min(100, hasTrack ? progressPercent : 0))}%`,
                background: '#fff',
                borderRadius: 1,
                transition: 'width 0.1s linear',
              }} />
            </div>
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      data-tauri-drag-region
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        userSelect: 'none',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '16px 20px 12px 20px',
      }}
    >
      {/* ── Dynamic blurred background ── */}
      <div
        data-tauri-drag-region
        ref={bgRef}
        style={{
          position: 'absolute',
          inset: '-20px',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(36px) saturate(1.8)',
          opacity: hasTrack ? 0.5 : 0.2,
          transform: 'scale(1.1)',
          backgroundImage: hasTrack ? `url(${currentTrack.artworkUrl})` : 'none',
          backgroundColor: '#111115', // Sleek dark neutral fallback
          zIndex: 0,
        }}
      />
      {/* Scrim */}
      <div data-tauri-drag-region style={{ position: 'absolute', inset: 0, background: hasTrack ? 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.75) 100%)' : 'rgba(0,0,0,0.75)', zIndex: 1 }} />
      {/* Subtle border */}
      <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(255,255,255,0.06)', zIndex: 10, pointerEvents: 'none' }} />

      {/* ── Close button ── */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 20,
          background: 'rgba(255,255,255,0.08)',
          border: 'none',
          borderRadius: '50%',
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.5)',
          padding: 0,
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget.style.background = 'rgba(255,255,255,0.18)'); (e.currentTarget.style.color = '#fff'); }}
        onMouseLeave={(e) => { (e.currentTarget.style.background = 'rgba(255,255,255,0.08)'); (e.currentTarget.style.color = 'rgba(255,255,255,0.5)'); }}
        title='Close'
      >
        <X size={12} />
      </button>

      {/* ── Center Content Wrapper ── */}
      <div
        data-tauri-drag-region
        style={{
          position: 'relative',
          zIndex: 5,
          width: '100%',
          height: '100%',
          maxWidth: '380px',
          maxHeight: '212px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* ── Artwork (Centered, Large & Rounded) ── */}
        <div style={{
          position: 'relative',
          width: 90,
          height: 90,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.05)',
        }}>
          {currentTrack && currentTrack.artworkUrl ? (
            <img
              // eslint-disable-next-line @next/next/no-img-element
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.2)' }}>
              <Music2 size={36} />
            </div>
          )}
        </div>

        {/* ── Title & Artist (Centered, Beautiful Typography) ── */}
        <div data-tauri-drag-region style={{ textAlign: 'center', width: '100%', maxWidth: '340px' }}>
          <div data-tauri-drag-region style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.3,
          }}>
            {hasTrack ? currentTrack.title : 'Nothing playing'}
          </div>
          <div data-tauri-drag-region style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.55)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginTop: 2,
            lineHeight: 1.3,
          }}>
            {hasTrack ? currentTrack.artist : 'Melofy'}
          </div>
        </div>

        {/* ── Primary Controls Row (Grouped and Centered) ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', maxWidth: '360px' }}>
          {/* Like */}
          <button
            onClick={() => hasTrack && toggleLike(currentTrack)}
            disabled={!hasTrack}
            style={{
              ...iconBtn(isLiked ? '#ef4444' : 'rgba(255,255,255,0.45)'),
              opacity: hasTrack ? 1 : 0.3,
              cursor: hasTrack ? 'pointer' : 'default',
            }}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart size={14} fill={isLiked ? '#ef4444' : 'none'} />
          </button>

          {/* Prev */}
          <button 
            onClick={playPrevious} 
            disabled={!hasTrack}
            style={{
              ...iconBtn('rgba(255,255,255,0.75)'),
              opacity: hasTrack ? 1 : 0.3,
              cursor: hasTrack ? 'pointer' : 'default',
            }} 
            title='Previous'
          >
            <SkipBack size={18} fill='currentColor' />
          </button>

          {/* Play / Pause */}
          <button
            onClick={handleTogglePlay}
            disabled={!hasTrack || isBuffering}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#fff',
              color: '#000',
              border: 'none',
              cursor: (!hasTrack || isBuffering) ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              flexShrink: 0,
              opacity: (!hasTrack || isBuffering) ? 0.6 : 1,
              transition: 'transform 0.1s, opacity 0.15s',
              padding: 0,
            }}
            onMouseEnter={(e) => { if (hasTrack && !isBuffering) e.currentTarget.style.transform = 'scale(1.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseDown={(e) => { if (hasTrack) e.currentTarget.style.transform = 'scale(0.94)'; }}
            onMouseUp={(e) => { if (hasTrack) e.currentTarget.style.transform = 'scale(1.08)'; }}
          >
            {isBuffering ? (
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : isPlaying ? (
              <Pause size={16} fill='currentColor' />
            ) : (
              <Play size={16} fill='currentColor' style={{ marginLeft: 2 }} />
            )}
          </button>

          {/* Next */}
          <button 
            onClick={handleSkipNext} 
            disabled={!hasTrack}
            style={{
              ...iconBtn('rgba(255,255,255,0.75)'),
              opacity: hasTrack ? 1 : 0.3,
              cursor: hasTrack ? 'pointer' : 'default',
            }} 
            title='Next'
          >
            <SkipForward size={18} fill='currentColor' />
          </button>

          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            disabled={!hasTrack}
            style={{
              ...iconBtn(isShuffle ? '#1db954' : 'rgba(255,255,255,0.45)'),
              opacity: hasTrack ? 1 : 0.3,
              cursor: hasTrack ? 'pointer' : 'default',
            }}
            title='Shuffle'
          >
            <Shuffle size={14} />
          </button>

          {/* Repeat */}
          <button
            onClick={toggleRepeat}
            disabled={!hasTrack}
            style={{
              ...iconBtn(isRepeat ? '#1db954' : 'rgba(255,255,255,0.45)'),
              opacity: hasTrack ? 1 : 0.3,
              cursor: hasTrack ? 'pointer' : 'default',
            }}
            title='Repeat'
          >
            <Repeat size={14} />
          </button>

          {/* Volume Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 4, flex: 1, maxWidth: 90 }}>
            <button
              onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
              style={{ ...iconBtn('rgba(255,255,255,0.45)'), padding: 4 }}
              title={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>

            <div
              style={{ flex: 1, height: 24, display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                setVolume(Math.max(0, Math.min(1, x / rect.width)));
              }}
              onMouseDown={() => setIsDraggingVolume(true)}
              onMouseMove={(e) => {
                if (!isDraggingVolume) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                setVolume(Math.max(0, Math.min(1, x / rect.width)));
              }}
              onMouseUp={() => setIsDraggingVolume(false)}
              onMouseLeave={() => setIsDraggingVolume(false)}
            >
              <div style={{ height: 3, width: '100%', background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                <div style={{ height: '100%', width: `${volume * 100}%`, background: 'rgba(255,255,255,0.8)', borderRadius: 2, transition: isDraggingVolume ? 'none' : 'width 0.05s linear' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div style={{ width: '100%', maxWidth: '380px', opacity: hasTrack ? 1 : 0.3 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums' }}>
              {hasTrack ? currentDisplayTime : '0:00'}
            </span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums' }}>
              {hasTrack ? durationTime : '0:00'}
            </span>
          </div>
          
          {/* Hit area for progress bar */}
          <div 
            onClick={(e) => {
              if (!hasTrack) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const clickedPercent = (x / rect.width) * 100;
              handleSeek([clickedPercent]);
            }}
            className="group"
            style={{
              height: 16,
              display: 'flex',
              alignItems: 'center',
              cursor: hasTrack ? 'pointer' : 'default',
              position: 'relative',
            }}
          >
            {/* Visual Track */}
            <div style={{
              height: 3,
              width: '100%',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 2,
              overflow: 'hidden',
              position: 'relative',
            }}>
              {/* Fill */}
              <div style={{
                height: '100%',
                width: `${Math.max(0, Math.min(100, hasTrack ? progressPercent : 0))}%`,
                background: '#fff',
                borderRadius: 2,
                transition: 'width 0.1s linear',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Loader spin keyframe injected as a style tag (no external stylesheet) */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Shared icon button style helper
function iconBtn(color: string): React.CSSProperties {
  return {
    background: 'none',
    border: 'none',
    padding: 6,
    borderRadius: 6,
    cursor: 'pointer',
    color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.15s, background 0.15s',
    flexShrink: 0,
  };
}

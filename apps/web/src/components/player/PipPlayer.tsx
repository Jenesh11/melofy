import { SkipBack, SkipForward, Play, Pause, Loader2, Heart, X, Shuffle, Repeat, Music2 } from 'lucide-react';
import { Track } from '@/store/usePlayerStore';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

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

  // Update background image when track changes (inline style to avoid reflow)
  useEffect(() => {
    if (bgRef.current) {
      bgRef.current.style.backgroundImage = currentTrack?.artworkUrl ? `url(${currentTrack.artworkUrl})` : 'none';
    }
  }, [currentTrack?.artworkUrl]);

  const hasTrack = !!currentTrack;

  return (
    <div
      style={{
        width: '460px',
        height: '148px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        color: '#fff',
        userSelect: 'none',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* ── Dynamic blurred background ── */}
      <div
        ref={bgRef}
        style={{
          position: 'absolute',
          inset: '-20px',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(32px) saturate(1.8)',
          opacity: hasTrack ? 0.55 : 0.2,
          transform: 'scale(1.1)',
          backgroundImage: hasTrack ? `url(${currentTrack.artworkUrl})` : 'none',
          backgroundColor: '#18181b', // Neutral dark background fallback
          zIndex: 0,
        }}
      />
      {/* Scrim */}
      <div style={{ position: 'absolute', inset: 0, background: hasTrack ? 'rgba(0,0,0,0.52)' : 'rgba(0,0,0,0.7)', zIndex: 1 }} />
      {/* Subtle border */}
      <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(255,255,255,0.06)', zIndex: 10, pointerEvents: 'none' }} />

      {/* ── Close button ── */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
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

      {/* ── Main content row ── */}
      <div style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px 8px 14px', flex: 1 }}>

        {/* Artwork */}
        <div style={{
          width: 82,
          height: 82,
          borderRadius: 10,
          overflow: 'hidden',
          flexShrink: 0,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.05)',
        }}>
          {hasTrack && currentTrack.artworkUrl ? (
            <img
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.2)' }}>
              <Music2 size={32} />
            </div>
          )}
        </div>

        {/* Info + Controls */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Title & artist */}
          <div style={{ minWidth: 0 }}>
            <div style={{
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
            <div style={{
              fontSize: 12,
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

          {/* Controls row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
              <Heart size={15} fill={isLiked ? '#ef4444' : 'none'} />
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
              <SkipBack size={19} fill='currentColor' />
            </button>

            {/* Play / Pause */}
            <button
              onClick={handleTogglePlay}
              disabled={!hasTrack || isBuffering}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#fff',
                color: '#000',
                border: 'none',
                cursor: (!hasTrack || isBuffering) ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
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
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              ) : isPlaying ? (
                <Pause size={18} fill='currentColor' />
              ) : (
                <Play size={18} fill='currentColor' style={{ marginLeft: 2 }} />
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
              <SkipForward size={19} fill='currentColor' />
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
              <Shuffle size={15} />
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
              <Repeat size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ position: 'relative', zIndex: 5, padding: '0 14px 14px', opacity: hasTrack ? 1 : 0.3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums' }}>
            {hasTrack ? currentDisplayTime : '0:00'}
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums' }}>
            {hasTrack ? durationTime : '0:00'}
          </span>
        </div>
        {/* Larger hit area for progress bar */}
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
            height: 24,
            display: 'flex',
            alignItems: 'center',
            cursor: hasTrack ? 'pointer' : 'default',
            position: 'relative',
            margin: '0 -4px', // Slight overlap on sides
            padding: '0 4px',
          }}
        >
          {/* Visual Track */}
          <div style={{
            height: 4,
            width: '100%',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 2,
            overflow: 'hidden',
            position: 'relative',
            transition: 'height 0.1s ease',
          }}
          onMouseEnter={(e) => { if (hasTrack) e.currentTarget.style.height = '6px'; }}
          onMouseLeave={(e) => { e.currentTarget.style.height = '4px'; }}
          >
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

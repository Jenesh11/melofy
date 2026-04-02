'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { motion } from 'framer-motion';

interface LyricLine {
  text: string;
  timeMs: number;
}

interface LyricsData {
  syncedLyrics: string;
  plainLyrics: string;
}

const parseSyncedLyrics = (lrc: string): LyricLine[] => {
  const lines = lrc.split('\n');
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (!match) continue;

    const min = parseInt(match[1]);
    const sec = parseInt(match[2]);
    const msStr = match[3];
    const ms = msStr.length === 2 ? parseInt(msStr) * 10 : parseInt(msStr);

    const timeMs = min * 60000 + sec * 1000 + ms;
    const text = line.replace(timeRegex, '').trim();

    // even empty lines can be useful for pacing
    result.push({ text, timeMs });
  }

  return result.sort((a, b) => a.timeMs - b.timeMs);
};

// Premium Synced Lyrics Component (with Caching)
export const SyncedLyrics = () => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const progress = usePlayerStore((state) => state.progress);
  const lyricsCache = usePlayerStore((state) => state.lyricsCache);
  const setLyricsCache = usePlayerStore((state) => state.setLyrics);

  const [lyricsLines, setLyricsLines] = useState<LyricLine[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch lyrics whenever the track changes
  useEffect(() => {
    let active = true;

    const fetchLyrics = async () => {
      if (!currentTrack) {
        setLyricsLines(null);
        setPlainLyrics(null);
        return;
      }

      // 1. Check Cache First
      if (lyricsCache[currentTrack.id]) {
        const cachedData = lyricsCache[currentTrack.id];
        if (cachedData.syncedLyrics) {
          setLyricsLines(parseSyncedLyrics(cachedData.syncedLyrics));
        } else if (cachedData.plainLyrics) {
          setPlainLyrics(cachedData.plainLyrics);
        }
        setLoading(false);
        setError(false);
        return;
      }

      setLoading(true);
      setError(false);
      setLyricsLines(null);
      setPlainLyrics(null);

      try {
        const queryParams = new URLSearchParams({
          track_name: currentTrack.title,
          artist_name: currentTrack.artist,
          duration: Math.floor(currentTrack.duration / 1000).toString(),
        });

        const res = await fetch(`/api/lyrics?${queryParams.toString()}`);
        if (!res.ok) {
          setError(true);
          setLoading(false);
          return;
        }

        const data: LyricsData = await res.json();

        if (!active) return;

        // 2. Save result to store cache
        setLyricsCache(currentTrack.id, data);

        if (data.syncedLyrics) {
          const parsed = parseSyncedLyrics(data.syncedLyrics);
          if (parsed.length > 0) {
            setLyricsLines(parsed);
          } else {
            setPlainLyrics(data.plainLyrics);
          }
        } else if (data.plainLyrics) {
          setPlainLyrics(data.plainLyrics);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Failed to fetch lyrics:', err);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchLyrics();

    return () => {
      active = false;
    };
  }, [currentTrack, lyricsCache, setLyricsCache]);

  // Find the currently active line index based on playback progress
  const activeIndex = React.useMemo(() => {
    if (!lyricsLines) return -1;
    let active = -1;
    for (let i = 0; i < lyricsLines.length; i++) {
      // give a slight lead in (e.g. 200ms) for better sync feel
      if (progress >= lyricsLines[i].timeMs - 200) {
        active = i;
      } else {
        break;
      }
    }
    return active;
  }, [progress, lyricsLines]);

  // Auto-scroll to the active line
  useEffect(() => {
    if (activeIndex >= 0 && containerRef.current) {
      const activeElement = document.getElementById(
        `lyric-line-${activeIndex}`,
      );
      if (activeElement) {
        const container = containerRef.current;
        const targetScroll =
          activeElement.offsetTop - container.clientHeight / 2;

        container.scrollTo({
          top: targetScroll,
          behavior: 'smooth',
        });
      }
    }
  }, [activeIndex]);

  if (!currentTrack) return null;

  if (loading) {
    return (
      <div className='flex-1 flex items-center justify-center h-full w-full'>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className='flex flex-col items-center gap-4'
        >
          <div className='h-8 w-8 rounded-full border-t-2 border-primary animate-spin' />
          <p className='text-foreground/40 text-sm font-medium'>Finding lyrics...</p>
        </motion.div>
      </div>
    );
  }

  if (error || (!lyricsLines && !plainLyrics)) {
    return (
      <div className='flex-1 flex items-center justify-center h-full w-full'>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className='text-center space-y-2'
        >
          <p className='text-foreground/60 text-lg font-medium'>
            Looks like we don&apos;t have lyrics for this track yet.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className='flex-1 h-full w-full overflow-y-auto no-scrollbar relative px-4 lg:px-12 py-12 lg:py-20'
      style={{
        maskImage:
          'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
        WebkitMaskImage:
          'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
      }}
    >
      {lyricsLines ? (
        <div className='flex flex-col gap-6 max-w-3xl mx-auto'>
          {lyricsLines.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex;

            return (
              <motion.p
                key={idx}
                id={`lyric-line-${idx}`}
                initial={false}
                animate={{
                  scale: isActive ? 1.08 : 1,
                  opacity: isActive ? 1 : isPast ? 0.3 : 0.5,
                  y: isActive ? 0 : 5,
                }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={`text-2xl md:text-4xl lg:text-5xl font-black tracking-tight cursor-default transition-all duration-300 text-center
                                 ${isActive ? 'text-foreground drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-foreground/50 hover:text-foreground/80'}
                             `}
              >
                {line.text || '♪'}
              </motion.p>
            );
          })}
        </div>
      ) : plainLyrics ? (
        <div className='max-w-2xl mx-auto pt-8'>
          <p className='whitespace-pre-wrap text-foreground/50 text-xl md:text-2xl font-medium leading-relaxed text-center'>
            {plainLyrics}
          </p>
          <div className='mt-12 text-center pb-8'>
            <span className='text-xs font-black tracking-widest uppercase text-foreground/20 bg-foreground/5 px-4 py-2 rounded-full border border-foreground/10'>
              Unsynced Lyrics
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

'use client';

import { motion, useAnimationFrame, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  ChevronRight,
  Heart,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  ChevronDown,
  Users,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';

/* ── Constants ── */
const ARTWORK =
  'https://i.scdn.co/image/ab67616d0000b273ef017e899c0547766997d874';
const TRACK_DURATION = 223; // 3:43

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  iPhone 15 Pro Shell                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

function PhoneFrame({ children, isPlaying }: { children: React.ReactNode; isPlaying: boolean }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['10deg', '-10deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-10deg', '10deg']);

  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ['-50%', '50%']);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ['-50%', '50%']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / rect.width - 0.5);
    y.set(mouseY / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div 
      className='relative mx-auto group perspective-distant' 
      style={{ width: 300, height: 610, perspective: 1200 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className='relative w-full h-full'
        style={{ 
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Titanium outer frame */}
        <div 
          className='absolute inset-0 rounded-[55px] bg-zinc-900 border border-white/15 p-[3px] shadow-2xl transition-all duration-300 group-hover:shadow-[0_40px_80px_rgba(0,0,0,0.5)]'
          style={{ transform: 'translateZ(20px)', transformStyle: 'preserve-3d' }}
        >
          {/* Side buttons */}
          <div className='absolute top-28 -left-[2px] w-[2px] h-6 bg-zinc-700 rounded-l-sm' />
          <div className='absolute top-40 -left-[2px] w-[2px] h-12 bg-zinc-700 rounded-l-sm' />
          <div className='absolute top-56 -left-[2px] w-[2px] h-12 bg-zinc-700 rounded-l-sm' />
          <div className='absolute top-44 -right-[2px] w-[2px] h-20 bg-zinc-700 rounded-r-sm' />

          {/* Screen bezel */}
          <div 
            className='relative w-full h-full rounded-[52px] bg-black overflow-hidden border-[5px] border-black'
            style={{ transform: 'translateZ(1px)' }}
          >
            
            {/* Dynamic Glare Layer */}
            <motion.div 
              className='absolute inset-0 z-50 pointer-events-none mix-blend-overlay'
              style={{
                x: glareX,
                y: glareY,
                background: 'radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%)',
                width: '200%',
                height: '200%',
                left: '-50%',
                top: '-50%'
              }}
            />
            
            {/* ── Dynamic Island (Live Activity style) ── */}
            <motion.div 
              initial={false}
              animate={{ 
                width: isPlaying ? 160 : 90,
                height: isPlaying ? 32 : 28,
                borderRadius: isPlaying ? 24 : 20
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className='absolute top-2.5 left-1/2 -translate-x-1/2 bg-black z-50 flex items-center justify-between px-3 overflow-hidden shadow-lg'
            >
              {isPlaying && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className='flex items-center gap-2'
                >
                  
                  <div className='w-5 h-5 rounded-[4px] overflow-hidden'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ARTWORK} alt='' className='w-full h-full object-cover' />
                  </div>
                </motion.div>
              )}

              {/* Camera / Sensors hole (fixed position to prevent dislocation) */}
              <div className='absolute left-[calc(50%+18px)] top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none'>
                <div className='w-2 h-2 rounded-full bg-zinc-900 shadow-inner' />
                <div className='w-1 h-1 rounded-full bg-blue-500/20 absolute blur-[1px]' />
              </div>

              {isPlaying && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <DynamicIslandEQ />
                </motion.div>
              )}
            </motion.div>

            {/* Status bar */}
            <div className='absolute top-4 w-full flex justify-between px-8 text-[11px] font-bold text-white/90 z-40 tabular-nums'>
              <span>9:41</span>
              <div className='flex items-center gap-1.5'>
                {/* Signal */}
                <div className='flex items-end gap-[1.5px] h-2.5 mb-[0.5px]'>
                  <div className='w-[2.5px] h-[35%] bg-white rounded-[0.5px]' />
                  <div className='w-[2.5px] h-[55%] bg-white rounded-[0.5px]' />
                  <div className='w-[2.5px] h-[75%] bg-white rounded-[0.5px]' />
                  <div className='w-[2.5px] h-full bg-white/30 rounded-[0.5px]' />
                </div>
                {/* WiFi */}
                <svg width='14' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' className='mb-[0.5px]'>
                  <path d='M5 12.5a10 10 0 0 1 14 0' />
                  <path d='M8.5 16a5 5 0 0 1 7 0' />
                  <circle cx='12' cy='19.5' r='1' fill='currentColor' stroke='none' />
                </svg>
                {/* Battery */}
                <div className='relative w-[23px] h-[11.5px] border border-white/35 rounded-[3.5px] p-px flex items-center ml-0.5'>
                  <div className='h-full bg-white rounded-[1.5px]' style={{ width: '65%' }} />
                  <div className='absolute -right-[2.5px] top-1/2 -translate-y-1/2 w-[1.5px] h-[4px] bg-white/35 rounded-r-[1px]' />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className='w-full h-full'>{children}</div>

            {/* Home indicator */}
            <div className='absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/15 rounded-full z-40' />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  High Quality Dynamic Island EQ                                             */
/* ─────────────────────────────────────────────────────────────────────────── */

function DynamicIslandEQ() {
  // 5 bars with iOS Apple Music-style smooth random heights
  const bars = [
    { heights: [3, 5, 3, 4, 3, 6, 3], duration: 1.2 },
    { heights: [4, 8, 5, 10, 6, 9, 4], duration: 1.5 },
    { heights: [6, 12, 8, 14, 10, 12, 6], duration: 1.3 },
    { heights: [5, 10, 6, 9, 5, 11, 5], duration: 1.4 },
    { heights: [3, 4, 3, 5, 3, 4, 3], duration: 1.2 },
  ];

  return (
    <div className='flex items-center justify-center gap-[2.5px] h-4 px-1 shrink-0'>
      {bars.map((bar, i) => (
        <motion.div
          key={i}
          animate={{ height: bar.heights }}
          transition={{
            duration: bar.duration,
            repeat: Infinity,
            repeatType: 'mirror',
            ease: 'easeInOut',
          }}
          className='w-[2.5px] bg-[#ff3b30] rounded-full opacity-90'
          style={{ minHeight: '3px' }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Player Screen (inside the phone)                                           */
/* ─────────────────────────────────────────────────────────────────────────── */

function PlayerScreen({ isPlaying, setIsPlaying }: { isPlaying: boolean; setIsPlaying: (v: boolean) => void }) {
  const [liked, setLiked] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [repeated, setRepeated] = useState(false);
  const [progress, setProgress] = useState(0.035);
  const startRef = useRef<number | null>(null);

  useAnimationFrame((t) => {
    if (!isPlaying) {
      startRef.current = null;
      return;
    }
    if (startRef.current === null)
      startRef.current = t - progress * TRACK_DURATION * 1000;
    const elapsed = (t - startRef.current) / 1000;
    setProgress(Math.min(elapsed / TRACK_DURATION, 1));
  });

  const currentSec = progress * TRACK_DURATION;

  return (
    <div className='flex flex-col h-full relative overflow-hidden'>
      {/* Blurred album art background */}
      <div
        className='absolute inset-0 scale-150 blur-[50px] opacity-40 saturate-150'
        style={{
          backgroundImage: `url(${ARTWORK})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className='absolute inset-0 bg-black/30' />

      {/* Foreground UI */}
      <div className='relative z-10 flex flex-col h-full pt-12 pb-6'>
        {/* Header */}
        <div className='flex items-center justify-between px-5 py-3'>
          <ChevronDown className='w-5 h-5 text-white/40' />
          <span className='text-[10px] font-black tracking-[0.25em] uppercase text-white/60'>
            Now Playing
          </span>
          <div className='flex items-center gap-3 text-white/40'>
            <Users className='w-4 h-4' />
            <Radio className='w-4 h-4' />
          </div>
        </div>

        {/* Album artwork (Removed flex-1 to allow track info to sit right below it) */}
        <div className='px-5 pb-10 pt-4 flex items-start justify-center'>
          <div className='w-full aspect-square rounded-[20px] overflow-hidden shadow-2xl relative border border-white/10'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ARTWORK}
              alt='Blinding Lights — The Weeknd'
              className='w-full h-full object-cover'
            />
            <div className='absolute inset-0 bg-linear-to-t from-black/25 to-transparent' />
          </div>
        </div>

        {/* Track info (Sitting tight under the artwork) */}
        <div className='flex items-center justify-between px-5 mb-4'>
          <div className='min-w-0'>
            <h3 className='text-[17px] font-black text-white tracking-tight truncate'>
              Blinding Lights
            </h3>
            <p className='text-sm text-white/45 font-medium truncate'>The Weeknd</p>
          </div>
          <button onClick={() => setLiked((l) => !l)} className='p-1.5 shrink-0'>
            <Heart
              className={`w-5 h-5 transition-colors ${
                liked ? 'fill-red-500 text-red-500' : 'text-white/25'
              }`}
            />
          </button>
        </div>

        {/* Progress (Inline style from reference) */}
        <div className='px-5 mb-5 flex items-center gap-3 text-[10px] font-bold tabular-nums'>
          <span className='text-white/30'>{fmt(currentSec)}</span>
          <div className='flex-1 h-[6px] rounded-full bg-white/10 relative overflow-hidden'>
            <div
              className='h-full bg-white/80 rounded-full transition-[width] duration-100'
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className='text-white/30'>{fmt(TRACK_DURATION)}</span>
        </div>

        {/* Flexible spacer pushes only the controls to the bottom */}
        <div className='flex-1' />

        {/* Controls */}
        <div className='flex items-center justify-between px-6 pb-12'>
          <button onClick={() => setShuffled(!shuffled)} className='p-2'>
            <Shuffle className={`w-4 h-4 ${shuffled ? 'text-white' : 'text-white/30'}`} />
          </button>
          <button className='p-2 text-white/80'>
            <SkipBack className='w-5 h-5 fill-current' />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className='w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg active:scale-90 transition-transform'
          >
            {isPlaying ? (
              <Pause className='w-5 h-5 fill-black text-black' />
            ) : (
              <Play className='w-5 h-5 fill-black text-black ml-0.5' />
            )}
          </button>
          <button className='p-2 text-white/80'>
            <SkipForward className='w-5 h-5 fill-current' />
          </button>
          <button onClick={() => setRepeated(!repeated)} className='p-2'>
            <Repeat className={`w-4 h-4 ${repeated ? 'text-white' : 'text-white/30'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Hero Section                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

export function LandingHero() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isNative, setIsNative] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  const [winDownloadUrl, setWinDownloadUrl] = useState('https://github.com/Jenesh11/melofy/releases/latest/download/Melofy_x64-setup.exe');

  useEffect(() => {
    const isCapacitorNative = typeof window !== 'undefined' && (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
    if (isCapacitorNative) {
      setTimeout(() => setIsNative(true), 0);
    }
    const isTauriEnv = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (isTauriEnv) {
      setTimeout(() => setIsTauri(true), 0);
    }

    const fetchLatestRelease = async () => {
      try {
        const res = await fetch('https://api.github.com/repos/Jenesh11/melofy/releases/latest');
        if (res.ok) {
          const data = await res.json() as { assets?: { name: string; browser_download_url: string }[] };
          const exeAsset = data.assets?.find((a) => a.name.endsWith('.exe'));
          if (exeAsset) {
            setWinDownloadUrl(exeAsset.browser_download_url);
          }
        }
      } catch (err) {
        console.error('Failed to fetch latest release from GitHub:', err);
      }
    };
    void fetchLatestRelease();
  }, []);
  return (
    <section className='relative min-h-screen flex items-center justify-center py-40 px-6 overflow-hidden'>
      {/* Background — dot grid only */}
      <div className='absolute inset-0 -z-10 pointer-events-none'>
        <div
          className='absolute inset-0 opacity-[0.04]'
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className='max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center'>
        {/* Left — copy */}
        <div className='flex flex-col gap-8 text-center lg:text-left pt-10'>
          <div className='flex flex-col gap-6'>
            <div className='flex items-center justify-center lg:justify-start gap-4 mb-2'>
              <div className='w-12 h-12 flex items-center justify-center overflow-hidden'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src='/logo.png' alt='Melofy Logo' className='w-full h-full object-contain' />
              </div>
              <span className='text-4xl font-black text-foreground tracking-tighter'>Melofy</span>
            </div>

            <h1 className='text-5xl md:text-8xl font-black text-foreground tracking-tighter leading-[0.9] text-balance'>
              Elevate <br />
              <span className='text-transparent bg-clip-text bg-linear-to-r from-primary via-blue-500 to-purple-500'>
                Your Sound.
              </span>
            </h1>
          </div>

          <p className='text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed'>
            Experience sound like never before. Melofy brings millions of songs, podcasts, and
            curated playlists to your ears, everywhere you go.
          </p>

          <div className='flex flex-col gap-6 items-center lg:items-start'>
            <Link href='/login'>
              <Button
                size='lg'
                className='h-14 px-10 rounded-full bg-primary text-primary-foreground font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-primary/20 w-full sm:w-auto'
              >
                Get Started Free
                <ChevronRight className='ml-2 w-5 h-5' />
              </Button>
            </Link>
            
            {!isNative && !isTauri && (
              <div className='flex items-center justify-center lg:justify-start gap-4 mt-2 w-full select-none'>
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground/80 shrink-0">
                  Downloads:
                </span>
                
                <a
                  href={winDownloadUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='group'
                  title='Download for Windows (.exe)'
                >
                  <Button
                    variant='outline'
                    className='w-12 h-12 rounded-full bg-card/20 hover:bg-white/5 transition-all flex items-center justify-center border-border/60 hover:border-foreground/40 shadow-md shadow-black/5 hover:scale-110 active:scale-95 p-0 shrink-0'
                  >
                    <svg className="w-5 h-5 text-sky-400 fill-current" viewBox="0 0 24 24">
                      <path d="M0 3.449L9.75 2.1v9.451H0V3.449zM0 12.45h9.75v9.451L0 20.551v-8.101zM10.8 1.95L24 0v11.55H10.8V1.95zM10.8 12.45H24v11.55l-13.2-1.95v-9.6z"/>
                    </svg>
                  </Button>
                </a>
                
                <a
                  href='https://github.com/Jenesh11/melofy/releases/latest/download/Melofy.apk'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='group'
                  title='Download for Android'
                >
                  <Button
                    variant='outline'
                    className='w-12 h-12 rounded-full bg-card/20 hover:bg-white/5 transition-all flex items-center justify-center border-border/60 hover:border-foreground/40 shadow-md shadow-black/5 hover:scale-110 active:scale-95 p-0 shrink-0'
                  >
                    <svg className="w-5 h-5 fill-current text-[#3DDC84]" viewBox="0 0 24 24">
                      <path d="M17.523 15.3414C17.0396 15.3414 16.6477 14.9495 16.6477 14.4661C16.6477 13.9828 17.0396 13.5909 17.523 13.5909C18.0064 13.5909 18.3983 13.9828 18.3983 14.4661C18.3983 14.9495 18.0064 15.3414 17.523 15.3414ZM6.4773 15.3414C5.9939 15.3414 5.602 14.9495 5.602 14.4661C5.602 13.9828 5.9939 13.5909 6.4773 13.5909C6.9607 13.5909 7.3526 13.9828 7.3526 14.4661C7.3526 14.9495 6.9607 15.3414 6.4773 15.3414ZM17.9152 10.6023L19.7891 7.354C19.9573 7.0622 19.8584 6.6917 19.5667 6.5234C19.2749 6.3551 18.9044 6.454 18.7361 6.7458L16.8341 10.0416C15.4208 9.3977 13.8242 9.0416 12 9.0416C10.1758 9.0416 8.5792 9.3977 7.1659 10.0416L5.2639 6.7458C5.0956 6.454 4.7251 6.3551 4.4333 6.5234C4.1416 6.6917 4.0427 7.0622 4.2109 7.354L6.0848 10.6023C2.5059 12.5295 0.0886 16.2798 0 20.6932H24C23.9114 16.2798 21.4941 12.5295 17.9152 10.6023Z"/>
                    </svg>
                  </Button>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right — phone mockup */}
        <div className='relative hidden lg:flex items-center justify-center py-12'>
          {/* Ambient Glow behind phone */}
          <div className='absolute w-[140%] h-[120%] bg-primary/10 rounded-full blur-[120px] pointer-events-none' />
          
          <div className='relative z-10'>
            <PhoneFrame isPlaying={isPlaying}>
              <PlayerScreen isPlaying={isPlaying} setIsPlaying={setIsPlaying} />
            </PhoneFrame>
          </div>
        </div>
      </div>
    </section>
  );
}

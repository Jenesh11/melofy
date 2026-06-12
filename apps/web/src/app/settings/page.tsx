'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  User,
  LogOut,
  Mail,
  Calendar,
  Sun,
  Moon,
  ChevronLeft,
  Settings,
  Music,
  Sparkles,
  Laptop,
  Smartphone,
  Github,
  HelpCircle,
  Shield,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Switch } from '@/components/ui/Switch';
import { PreMidGuide } from '@/components/settings/PreMidGuide';
import { useTheme, Essence } from '@/lib/theme-context';
import { cn } from '@/lib/utils';
import { DonateButton } from '@/components/common/DonateButton';

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  html_url: string;
  tag_name: string;
  assets?: GitHubAsset[];
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const {
    essence,
    setEssence,
    mode,
    setMode,
    customBg,
    setCustomBg,
    customAccent,
    setCustomAccent,
  } = useTheme();
  const { autoPip, toggleAutoPip } = useSettingsStore();
  const router = useRouter();
  
  const [showDiscordGuide, setShowDiscordGuide] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  const [localVersion, setLocalVersion] = useState<string>('');
  const [latestRelease, setLatestRelease] = useState<GitHubRelease | null>(null);
  const [updateState, setUpdateState] = useState<'idle' | 'checking' | 'up-to-date' | 'update-available' | 'error'>('idle');

  const isNewerVersion = (latest: string, current: string): boolean => {
    const cleanLatest = latest.replace(/^v/, '');
    const cleanCurrent = current.replace(/^v/, '');
    const lParts = cleanLatest.split('.').map(Number);
    const cParts = cleanCurrent.split('.').map(Number);
    for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
      const l = lParts[i] || 0;
      const c = cParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
    }
    return false;
  };

  const checkForUpdates = useCallback(async () => {
    setUpdateState('checking');
    try {
      let currentVersion = '1.0.5'; // fallback
      const isTauriEnv = typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== undefined;
      const isCapacitorNative = typeof window !== 'undefined' && (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

      if (isTauriEnv) {
        try {
          const { getVersion } = await import('@tauri-apps/api/app');
          currentVersion = await getVersion();
        } catch (err) {
          console.error('Failed to get Tauri app version:', err);
        }
      } else if (isCapacitorNative) {
        try {
          const { App } = await import('@capacitor/app');
          const info = await App.getInfo();
          currentVersion = info.version;
        } catch (err) {
          console.error('Failed to get Capacitor app info:', err);
        }
      }
      setLocalVersion(currentVersion);

      const res = await fetch('https://api.github.com/repos/lazyshrey/melofy/releases/latest');
      if (!res.ok) throw new Error('GitHub Releases API error');
      
      const release = await res.json();
      setLatestRelease(release);

      const latestTag = release.tag_name;
      const isNewer = isNewerVersion(latestTag, currentVersion);
      
      if (isNewer) {
        setUpdateState('update-available');
      } else {
        setUpdateState('up-to-date');
      }
    } catch (err) {
      console.error('Update check failed:', err);
      setUpdateState('error');
    }
  }, []);

  const handleDownloadUpdate = async () => {
    if (!latestRelease) return;
    
    let downloadUrl = latestRelease.html_url;
    
    if (isTauri) {
      const exeAsset = latestRelease.assets?.find((a) => a.name.endsWith('.exe'));
      const winAsset = exeAsset || latestRelease.assets?.find((a) => a.name.endsWith('.msi'));
      if (winAsset) {
        downloadUrl = winAsset.browser_download_url;
      }
    } else if (isNative) {
      const apkAsset = latestRelease.assets?.find((a) => a.name.endsWith('.apk'));
      if (apkAsset) {
        downloadUrl = apkAsset.browser_download_url;
      }
    }

    if (isTauri) {
      try {
        const { openUrl } = await import('@tauri-apps/plugin-opener');
        await openUrl(downloadUrl);
      } catch (err) {
        console.error('Failed to open link with Tauri opener:', err);
        window.open(downloadUrl, '_blank');
      }
    } else {
      window.open(downloadUrl, '_blank');
    }
  };

  const handleViewChangelog = async () => {
    if (!latestRelease) return;
    
    const url = latestRelease.html_url;

    if (isTauri) {
      try {
        const { openUrl } = await import('@tauri-apps/plugin-opener');
        await openUrl(url);
      } catch (err) {
        console.error('Failed to open link with Tauri opener:', err);
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_blank');
    }
  };

  useEffect(() => {
    const isCapacitorNative = typeof window !== 'undefined' && (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
    if (isCapacitorNative) {
      setTimeout(() => setIsNative(true), 0);
    }
    const isTauriEnv = typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== undefined;
    if (isTauriEnv) {
      setTimeout(() => setIsTauri(true), 0);
    }

    if (isTauriEnv || isCapacitorNative) {
      void checkForUpdates();
    }
  }, [checkForUpdates]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };

  const themes = [
    { id: 'monochrome', name: 'Monochrome', color: 'var(--foreground)' },
    { id: 'emerald', name: 'Classic', color: '#10b981' },
    { id: 'golden', name: 'Golden', color: '#fbbf24' },
    { id: 'cyan', name: 'Cyan', color: '#22d3ee' },
    { id: 'lavender', name: 'Lavender', color: '#a78bfa' },
    { id: 'rose', name: 'Rose', color: '#f43f5e' },
    { id: 'custom', name: 'Custom Theme', color: customAccent },
  ];

  const exeAsset = latestRelease?.assets?.find((a) => a.name.endsWith('.exe'));
  const exeUrl = exeAsset?.browser_download_url || 'https://github.com/lazyshrey/melofy/releases/latest/download/Melofy_x64-setup.exe';

  if (!user) return null;

  const isCustomTheme = essence === 'custom';

  return (
    <main className='p-4 sm:p-10 md:p-14 h-full max-w-3xl mx-auto flex flex-col gap-8 md:gap-10 pb-24 overflow-y-auto custom-scrollbar'>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className='flex flex-col gap-4 shrink-0'
      >
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => router.back()}
            className='h-11 w-11 rounded-full bg-foreground/5 hover:bg-foreground/10 cursor-pointer transition-colors shrink-0'
          >
            <ChevronLeft className='h-6 w-6' />
          </Button>
          <div className='flex items-center gap-3'>
            <div className='h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0'>
              <Settings className='h-6 w-6 text-primary' />
            </div>
            <h1 className='text-3xl sm:text-4xl font-black text-foreground tracking-tight'>Settings</h1>
          </div>
        </div>
      </motion.header>

      {/* Unified List Container */}
      <div className='flex flex-col gap-8 sm:gap-10 mt-4 w-full'>
        
        {/* Account Section */}
        <section className='space-y-4'>
          <div className='space-y-1'>
            <h2 className='text-xs font-black uppercase tracking-[0.2em] text-muted-foreground'>Account & Profile</h2>
          </div>
          
          <div className='flex items-center justify-between gap-4 py-2.5 w-full'>
            <div className='flex items-center gap-3 sm:gap-4 min-w-0 flex-1'>
              <div className='h-12 w-12 sm:h-14 sm:w-14 rounded-full overflow-hidden border border-primary/20 bg-muted flex items-center justify-center relative shrink-0 shadow-sm'>
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt='Profile'
                    width={56}
                    height={56}
                    referrerPolicy='no-referrer'
                    className='h-full w-full object-cover'
                  />
                ) : (
                  <User className='h-5 w-5 text-muted-foreground' />
                )}
              </div>
              <div className='min-w-0 flex-1'>
                <h3 className='text-sm sm:text-lg font-bold text-foreground leading-tight truncate'>{user.displayName || 'Melofy User'}</h3>
                <div className='flex flex-col gap-0.5 text-xs text-muted-foreground mt-1'>
                  <div className='flex items-center gap-1.5 truncate'>
                    <Mail className='h-3.5 w-3.5 opacity-60 shrink-0' />
                    <span className='truncate'>{user.email}</span>
                  </div>
                  <div className='flex items-center gap-1.5'>
                    <Calendar className='h-3.5 w-3.5 opacity-60 shrink-0' />
                    <span>Joined {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'recently'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <Button
              onClick={handleSignOut}
              variant='outline'
              size='sm'
              className='rounded-full text-xs font-bold h-9 px-3 sm:px-4.5 border-foreground/10 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all cursor-pointer shrink-0'
            >
              <LogOut className='mr-1 sm:mr-1.5 h-3.5 w-3.5' />
              Sign Out
            </Button>
          </div>
        </section>

        <div className='h-px w-full bg-foreground/5' />

        {/* Appearance Section */}
        <section className='space-y-5'>
          <div className='space-y-1'>
            <h2 className='text-xs font-black uppercase tracking-[0.2em] text-muted-foreground'>Appearance</h2>
          </div>
          
          <div className='flex flex-col gap-3.5 divide-y divide-foreground/5'>
            {/* Interface Mode Row */}
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3.5'>
              <div className='min-w-0 space-y-0.5'>
                <div className='flex items-center flex-wrap gap-x-2'>
                  <h4 className={cn('text-sm sm:text-base font-bold text-foreground', isCustomTheme && 'opacity-40')}>
                    Interface Mode
                  </h4>
                  {isCustomTheme && (
                    <span className='text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded'>
                      Overridden
                    </span>
                  )}
                </div>
                <p className='text-xs text-muted-foreground hidden xs:block'>Choose light or dark style preset.</p>
              </div>
              
              <div
                className={cn(
                  'flex p-0.5 bg-foreground/5 rounded-xl shrink-0 border border-foreground/5 transition-opacity self-start sm:self-auto',
                  isCustomTheme && 'opacity-30 pointer-events-none'
                )}
              >
                <button
                  onClick={() => setMode('light')}
                  disabled={isCustomTheme}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all text-xs font-black cursor-pointer',
                    mode === 'light'
                      ? 'bg-background shadow-xs text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Sun className='h-3.5 w-3.5' />
                  <span>LIGHT</span>
                </button>
                <button
                  onClick={() => setMode('dark')}
                  disabled={isCustomTheme}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all text-xs font-black cursor-pointer',
                    mode === 'dark'
                      ? 'bg-background shadow-xs text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Moon className='h-3.5 w-3.5' />
                  <span>DARK</span>
                </button>
              </div>
            </div>

            {/* Theme Accent Row */}
            <div className='flex flex-col gap-4 py-4'>
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                <div className='min-w-0 space-y-0.5'>
                  <h4 className='text-sm sm:text-base font-bold text-foreground'>Theme Accent</h4>
                  <p className='text-xs text-muted-foreground hidden xs:block'>Choose highlight accent color palette.</p>
                </div>
                
                <div className='flex items-center gap-2 shrink-0 flex-wrap justify-start sm:justify-end max-w-full sm:max-w-none'>
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setEssence(t.id as Essence)}
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg transition-all border relative cursor-pointer outline-none shrink-0',
                        essence === t.id
                          ? 'bg-primary/10 border-primary shadow-xs'
                          : 'bg-foreground/5 border-transparent hover:border-foreground/10'
                      )}
                      title={t.name}
                    >
                      <div
                        className='w-3.5 h-3.5 rounded-full shadow-inner'
                        style={{
                          background: t.id === 'custom'
                            ? `linear-gradient(135deg, ${customBg} 0%, ${customAccent} 100%)`
                            : t.color
                        }}
                      />
                      {essence === t.id && (
                        <div className='absolute -top-0.5 -right-0.5 h-2 w-2 bg-primary rounded-full border border-background' />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Color Pickers */}
              <AnimatePresence initial={false}>
                {isCustomTheme && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className='flex flex-wrap gap-5 pt-4 border-t border-foreground/5 w-full mt-1 overflow-hidden'
                  >
                    <div className='flex items-center gap-3'>
                      <span className='text-xs font-bold text-muted-foreground uppercase tracking-wider'>BG Color:</span>
                      <div className='relative flex items-center gap-2 bg-foreground/5 px-3 py-1.5 rounded-lg border border-foreground/5'>
                        <input
                          type='color'
                          value={customBg}
                          onChange={(e) => setCustomBg(e.target.value)}
                          className='w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0'
                        />
                        <span className='text-xs font-mono font-bold text-foreground select-all uppercase'>{customBg}</span>
                      </div>
                    </div>

                    <div className='flex items-center gap-3'>
                      <span className='text-xs font-bold text-muted-foreground uppercase tracking-wider'>Accent Color:</span>
                      <div className='relative flex items-center gap-2 bg-foreground/5 px-3 py-1.5 rounded-lg border border-foreground/5'>
                        <input
                          type='color'
                          value={customAccent}
                          onChange={(e) => setCustomAccent(e.target.value)}
                          className='w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0'
                        />
                        <span className='text-xs font-mono font-bold text-foreground select-all uppercase'>{customAccent}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        <div className='h-px w-full bg-foreground/5' />

        {/* Playback Settings Section */}
        <section className='space-y-4'>
          <div className='space-y-1'>
            <h2 className='text-xs font-black uppercase tracking-[0.2em] text-muted-foreground'>Playback Settings</h2>
          </div>
          
          <div className='flex items-start justify-between gap-4 py-2'>
            <div className='min-w-0 space-y-1 max-w-xl'>
              <h4 className='text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5'>
                <Music className='h-4.5 w-4.5 text-primary shrink-0' />
                Picture-in-Picture Mode
              </h4>
              <p className='text-xs text-muted-foreground leading-normal'>
                Automatically pop open a mini floating player when switching browser tabs.
              </p>
            </div>
            <Switch checked={autoPip} onCheckedChange={toggleAutoPip} className='scale-95 shrink-0 mt-1' />
          </div>
        </section>

        <div className='h-px w-full bg-foreground/5' />

        {/* Integrations Section */}
        <section className='space-y-4'>
          <div className='space-y-1'>
            <h2 className='text-xs font-black uppercase tracking-[0.2em] text-muted-foreground'>Integrations</h2>
          </div>
          
          <div className='flex flex-col gap-2'>
            <button
              onClick={() => setShowDiscordGuide(!showDiscordGuide)}
              className='flex items-center justify-between w-full text-left cursor-pointer outline-none py-2.5 group'
            >
              <div className='min-w-0 space-y-1'>
                <h4 className='text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5'>
                  Discord Rich Presence
                </h4>
                <p className='text-xs text-muted-foreground'>Share what you play with friends via PreMiD presence.</p>
              </div>
              <div className='flex items-center gap-1.5 text-xs font-bold text-primary shrink-0'>
                <span>{showDiscordGuide ? 'COLLAPSE' : 'CONFIGURE'}</span>
                {showDiscordGuide ? <ChevronUp className='h-4 w-4' /> : <ChevronDown className='h-4 w-4' />}
              </div>
            </button>
            
            <AnimatePresence initial={false}>
              {showDiscordGuide && (
                <motion.div
                  key='discord-guide'
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className='overflow-hidden border-t border-foreground/5 mt-2 pt-4'
                >
                  <PreMidGuide />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        <div className='h-px w-full bg-foreground/5' />

        {/* Apps & Updates Section */}
        <section className='space-y-4'>
          <div className='space-y-1'>
            <h2 className='text-xs font-black uppercase tracking-[0.2em] text-muted-foreground'>Apps & Updates</h2>
          </div>

          {(!isTauri && !isNative) && (
            <div className='flex flex-col border border-foreground/5 rounded-xl overflow-hidden divide-y divide-foreground/5 bg-foreground/[0.01]'>
              {/* EXE */}
              <div className='flex flex-col xs:flex-row xs:items-center justify-between gap-4 p-4 hover:bg-foreground/[0.01] transition-colors'>
                <div className='flex items-start gap-3 min-w-0'>
                  <div className='h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 mt-0.5'>
                    <Laptop className='h-5 w-5 text-primary' />
                  </div>
                  <div className='space-y-1 min-w-0'>
                    <h4 className='font-bold text-foreground text-sm flex items-center gap-1.5 truncate'>
                      Windows Desktop App
                      <span className='text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shrink-0'>
                        EXE
                      </span>
                    </h4>
                    <p className='text-xs text-muted-foreground truncate max-w-sm sm:max-w-md'>
                      Frameless player and global media key shortcuts.
                    </p>
                  </div>
                </div>
                <a href={exeUrl} target='_blank' rel='noopener noreferrer' className='self-start xs:self-auto shrink-0'>
                  <Button size='sm' className='rounded-full text-xs font-bold h-8 px-4 cursor-pointer'>
                    Download
                  </Button>
                </a>
              </div>

              {/* MSI */}
              <div className='flex flex-col xs:flex-row xs:items-center justify-between gap-4 p-4 hover:bg-foreground/[0.01] transition-colors'>
                <div className='flex items-start gap-3 min-w-0'>
                  <div className='h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 mt-0.5'>
                    <Laptop className='h-5 w-5 text-primary' />
                  </div>
                  <div className='space-y-1 min-w-0'>
                    <h4 className='font-bold text-foreground text-sm flex items-center gap-1.5 truncate'>
                      Windows Installer
                      <span className='text-[8px] px-1.5 py-0.5 rounded-full bg-foreground/5 text-muted-foreground font-bold shrink-0'>
                        MSI
                      </span>
                    </h4>
                    <p className='text-xs text-muted-foreground truncate max-w-sm sm:max-w-md'>
                      Standard system installer setup package.
                    </p>
                  </div>
                </div>
                <a
                  href='https://github.com/lazyshrey/melofy/releases/latest/download/Melofy_x64.msi'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='self-start xs:self-auto shrink-0'
                >
                  <Button
                    variant='outline'
                    size='sm'
                    className='rounded-full text-xs font-bold h-8 px-4 border-foreground/10 hover:bg-foreground/5 cursor-pointer'
                  >
                    Download
                  </Button>
                </a>
              </div>

              {/* APK */}
              <div className='flex flex-col xs:flex-row xs:items-center justify-between gap-4 p-4 hover:bg-foreground/[0.01] transition-colors'>
                <div className='flex items-start gap-3 min-w-0'>
                  <div className='h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 mt-0.5'>
                    <Smartphone className='h-5 w-5 text-primary' />
                  </div>
                  <div className='space-y-1 min-w-0'>
                    <h4 className='font-bold text-foreground text-sm flex items-center gap-1.5 truncate'>
                      Android Mobile App
                      <span className='text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold shrink-0'>
                        APK
                      </span>
                    </h4>
                    <p className='text-xs text-muted-foreground truncate max-w-sm sm:max-w-md'>
                      Take Melofy player on the go.
                    </p>
                  </div>
                </div>
                <a
                  href='https://github.com/lazyshrey/melofy/releases/latest/download/Melofy.apk'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='self-start xs:self-auto shrink-0'
                >
                  <Button size='sm' className='rounded-full text-xs font-bold h-8 px-4 cursor-pointer'>
                    Download
                  </Button>
                </a>
              </div>
            </div>
          )}

          {/* Update Center (Tauri/Capacitor only) */}
          {(isTauri || isNative) && (
            <div className='flex flex-col gap-4 border border-foreground/5 rounded-xl p-4 bg-foreground/[0.01]'>
              <div className='flex items-center justify-between border-b border-foreground/5 pb-2.5'>
                <span className='text-sm font-bold text-foreground'>Application Updates</span>
                {localVersion && (
                  <span className='text-xs px-2.5 py-0.5 rounded-full bg-foreground/5 text-muted-foreground font-semibold'>
                    v{localVersion}
                  </span>
                )}
              </div>

              {updateState === 'checking' && (
                <div className='flex items-center gap-2.5 text-xs text-muted-foreground py-1.5'>
                  <div className='h-4 w-4 rounded-full border border-primary/20 border-t-primary animate-spin' />
                  <span>Checking for updates...</span>
                </div>
              )}

              {updateState === 'error' && (
                <div className='flex items-center justify-between gap-4 py-1.5'>
                  <span className='text-xs text-red-500 font-semibold'>Failed to fetch update status.</span>
                  <Button
                    onClick={checkForUpdates}
                    variant='outline'
                    size='sm'
                    className='rounded-full text-[10px] font-bold h-7.5 px-3 border-foreground/10 cursor-pointer'
                  >
                    Retry
                  </Button>
                </div>
              )}

              {updateState === 'up-to-date' && (
                <div className='flex items-center justify-between gap-4 py-1.5'>
                  <span className='text-xs text-emerald-500 dark:text-emerald-400 font-bold'>App is up to date!</span>
                  <Button
                    onClick={checkForUpdates}
                    variant='ghost'
                    size='sm'
                    className='rounded-full text-[10px] text-muted-foreground hover:text-foreground font-bold h-7.5 px-3 cursor-pointer'
                  >
                    Check Again
                  </Button>
                </div>
              )}

              {updateState === 'update-available' && (
                <div className='flex flex-col gap-2.5 py-0.5'>
                  <span className='text-xs text-amber-500 font-bold flex items-center'>
                    <div className='h-2 w-2 rounded-full bg-amber-500 animate-ping mr-1.5' />
                    v{latestRelease?.tag_name} is available!
                  </span>
                  <div className='flex gap-2'>
                    <Button
                      onClick={handleDownloadUpdate}
                      size='sm'
                      className='rounded-full font-bold text-[10px] h-7.5 px-3 shadow-sm cursor-pointer'
                    >
                      Install
                    </Button>
                    <Button
                      onClick={handleViewChangelog}
                      variant='outline'
                      size='sm'
                      className='rounded-full font-bold text-[10px] h-7.5 px-3 border-foreground/10 hover:bg-foreground/5 cursor-pointer'
                    >
                      Changelog
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <div className='h-px w-full bg-foreground/5' />

        {/* Support & Resources Section */}
        <section className='space-y-4'>
          <div className='space-y-1'>
            <h2 className='text-xs font-black uppercase tracking-[0.2em] text-muted-foreground'>Support & Info</h2>
          </div>
          
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2.5'>
            <div className='min-w-0 space-y-0.5 max-w-lg'>
              <h4 className='text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5'>
                <Sparkles className='h-4.5 w-4.5 text-primary shrink-0' />
                Support Melofy
              </h4>
              <p className='text-xs text-muted-foreground leading-normal'>
                Help keep Melofy servers online by donating.
              </p>
            </div>
            <DonateButton className='w-auto shrink-0 scale-100 self-start sm:self-auto' />
          </div>

          <div className='grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2'>
            {[
              { href: '/github', label: 'GitHub', icon: Github },
              { href: '/help', label: 'Help Center', icon: HelpCircle },
              { href: '/privacy', label: 'Privacy Policy', icon: Shield },
              { href: '/terms', label: 'Terms of Service', icon: FileText },
            ].map((link) => {
              const LinkIcon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  target='_blank'
                  className='flex items-center gap-2.5 p-3 sm:p-3.5 rounded-xl border border-foreground/5 bg-foreground/[0.01] hover:bg-foreground/5 hover:border-foreground/10 transition-all group min-w-0'
                >
                  <LinkIcon className='h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0' />
                  <span className='text-xs font-bold text-foreground truncate sm:overflow-visible'>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
        
      </div>
    </main>
  );
}

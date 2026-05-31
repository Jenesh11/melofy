'use client';

import { useState, useEffect, useCallback } from 'react';import { useAuth } from '@/lib/firebase/auth-context';
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
  Share2,
  Smartphone,
  Laptop,
  Github,
  HelpCircle,
  Shield,
  FileText,
  Globe,
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
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
  const { essence, setEssence, mode, setMode } = useTheme();
  const { autoPip, toggleAutoPip } = useSettingsStore();
  const router = useRouter();
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
      let currentVersion = '1.0.4'; // fallback
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
    
    let downloadUrl = latestRelease.html_url; // fallback to GitHub Release web page
    
    if (isTauri) {
      const winAsset = latestRelease.assets?.find((a) => a.name.endsWith('.msi'));
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
  ];

  if (!user) return null;

  return (
    <main className='p-6 md:p-12 h-full max-w-4xl mx-auto flex flex-col gap-12 pb-24'>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='flex flex-col gap-4'
      >
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => router.back()}
            className='h-10 w-10 rounded-full bg-foreground/5 hover:bg-foreground/10'
          >
            <ChevronLeft className='h-5 w-5' />
          </Button>
          <div className='flex items-center gap-3'>
            <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20'>
              <Settings className='h-5 w-5 text-primary' />
            </div>
            <h1 className='text-3xl font-black text-foreground tracking-tight'>Settings</h1>
          </div>
        </div>
      </motion.header>

      <div className='flex flex-col gap-16'>
        {/* Account Section */}
        <section className='space-y-6'>
          <header className='flex items-center gap-2 px-2'>
            <User className='h-4 w-4 text-primary' />
            <h2 className='text-xs font-black uppercase tracking-[0.2em] text-muted-foreground'>Account & Profile</h2>
          </header>
          
          <Card className='p-8 bg-card/50 border-border backdrop-blur-3xl rounded-[2.5rem] overflow-hidden relative group'>
            <div className='absolute -bottom-24 -right-24 h-64 w-64 bg-primary/5 blur-[80px] rounded-full' />
            
            <div className='relative z-10 flex flex-col md:flex-row gap-8 items-center'>
              <div className='h-24 w-24 rounded-full overflow-hidden shrink-0 border-4 border-primary/10 shadow-2xl bg-muted flex items-center justify-center relative'>
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt='Profile'
                    width={96}
                    height={96}
                    referrerPolicy='no-referrer'
                    className='h-full w-full object-cover'
                  />
                ) : (
                  <User className='h-10 w-10 text-muted-foreground' />
                )}
              </div>

              <div className='flex flex-col gap-1 flex-1 text-center md:text-left'>
                <h3 className='text-2xl font-black text-foreground'>{user.displayName || 'Melofy User'}</h3>
                <div className='flex flex-wrap justify-center md:justify-start gap-4 mt-1'>
                  <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Mail className='h-3.5 w-3.5 opacity-50' />
                    <span>{user.email}</span>
                  </div>
                  <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Calendar className='h-3.5 w-3.5 opacity-50' />
                    <span>Joined {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'recently'}</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSignOut}
                variant='destructive'
                className='rounded-full px-8 h-12 text-sm font-bold shadow-xl shadow-red-500/10 hover:shadow-red-500/20 active:scale-95 transition-all'
              >
                <LogOut className='mr-2 h-4 w-4' />
                Sign Out
              </Button>
            </div>
          </Card>
        </section>

        <div className='h-px w-full bg-border/50' />

        {/* Preferences Section */}
        <section className='space-y-6'>
          <header className='flex items-center gap-2 px-2'>
            <Sparkles className='h-4 w-4 text-primary' />
            <h2 className='text-xs font-black uppercase tracking-[0.2em] text-muted-foreground'>Preferences</h2>
          </header>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Mode Selector */}
            <Card className='p-6 bg-card/50 border-border backdrop-blur-3xl rounded-[2rem]'>
              <div className='flex flex-col gap-6'>
                <div className='flex flex-col gap-0.5'>
                  <h3 className='font-bold text-foreground text-lg'>Interface Mode</h3>
                  <p className='text-muted-foreground text-xs'>Choose your preferred experience.</p>
                </div>

                <div className='grid grid-cols-2 gap-3 p-1 bg-foreground/5 rounded-2xl'>
                  <button
                    onClick={() => setMode('light')}
                    className={cn(
                      'flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300',
                      mode === 'light' ? 'bg-background shadow-lg text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Sun className='h-4 w-4' />
                    <span className='text-xs uppercase tracking-wider'>Light</span>
                  </button>
                  <button
                    onClick={() => setMode('dark')}
                    className={cn(
                      'flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300',
                      mode === 'dark' ? 'bg-background shadow-lg text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Moon className='h-4 w-4' />
                    <span className='text-xs uppercase tracking-wider'>Dark</span>
                  </button>
                </div>
              </div>
            </Card>

            {/* Essence Selector */}
            <Card className='p-6 bg-card/50 border-border backdrop-blur-3xl rounded-[2rem]'>
              <div className='flex flex-col gap-6'>
                <div className='flex flex-col gap-0.5'>
                  <h3 className='font-bold text-foreground text-lg'>Theme Essence</h3>
                  <p className='text-muted-foreground text-xs'>Personalize your accent color.</p>
                </div>

                <div className='grid grid-cols-3 gap-2'>
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setEssence(t.id as Essence)}
                      className={cn(
                        'flex items-center justify-center p-2 rounded-xl transition-all border group relative',
                        essence === t.id ? 'bg-primary/10 border-primary shadow-lg' : 'bg-foreground/5 border-transparent hover:border-foreground/10'
                      )}
                      title={t.name}
                    >
                      <div className='w-5 h-5 rounded-full shadow-inner' style={{ backgroundColor: t.color }} />
                      {essence === t.id && (
                        <motion.div layoutId='active-essence' className='absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full border-2 border-background' />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Playback Settings */}
            <Card className='hidden md:block p-6 bg-card/50 border-border backdrop-blur-3xl rounded-[2rem] md:col-span-2'>
              <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
                <div className='space-y-1'>
                  <div className='flex items-center gap-2'>
                    <Music className='h-4 w-4 text-primary' />
                    <h3 className='font-bold text-foreground text-lg'>Playback Settings</h3>
                  </div>
                  <p className='text-muted-foreground text-sm max-w-md'>
                    Automatically open a picture-in-picture window when you switch to another tab.
                  </p>
                </div>
                <Switch checked={autoPip} onCheckedChange={toggleAutoPip} />
              </div>
            </Card>
          </div>
        </section>

        <div className='h-px w-full bg-border/50' />

        {/* Extras & Integrations Section */}
        <section className='space-y-6'>
          <header className='flex items-center gap-2 px-2'>
            <Share2 className='h-4 w-4 text-primary' />
            <h2 className='text-xs font-black uppercase tracking-[0.2em] text-muted-foreground'>Extras & Integrations</h2>
          </header>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 items-start'>
            <div className='flex flex-col gap-6'>
              {/* Update Center (Tauri/Capacitor only) */}
              {(isTauri || isNative) && (
                <Card className='p-6 bg-card/50 border-border backdrop-blur-3xl rounded-[2rem] flex flex-col gap-4 relative overflow-hidden'>
                  <div className='absolute -bottom-16 -right-16 h-40 w-40 bg-primary/5 blur-[50px] rounded-full' />
                  
                  <div className='flex items-center justify-between gap-2 mb-2'>
                    <div className='flex items-center gap-2'>
                      <Sparkles className='h-5 w-5 text-primary animate-pulse' />
                      <h3 className='font-bold text-foreground text-lg'>Update Center</h3>
                    </div>
                    {localVersion && (
                      <span className='text-xs px-2.5 py-1 rounded-full bg-foreground/5 text-muted-foreground font-semibold'>
                        v{localVersion}
                      </span>
                    )}
                  </div>

                  {updateState === 'checking' && (
                    <div className='flex flex-col items-center justify-center py-6 gap-3 text-center'>
                      <div className='h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin' />
                      <p className='text-sm text-muted-foreground'>Checking for latest updates...</p>
                    </div>
                  )}

                  {updateState === 'error' && (
                    <div className='flex flex-col gap-3 py-2'>
                      <p className='text-sm text-red-400'>Failed to retrieve the latest version information.</p>
                      <Button onClick={checkForUpdates} variant='outline' className='w-full rounded-full font-bold'>
                        Retry Check
                      </Button>
                    </div>
                  )}

                  {updateState === 'up-to-date' && (
                    <div className='flex flex-col gap-4 py-2'>
                      <div className='flex items-center gap-2.5 text-emerald-400 bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/10'>
                        <span className='text-sm font-bold'>You are running the latest version!</span>
                      </div>
                      <p className='text-xs text-muted-foreground leading-relaxed'>
                        Your app shell is fully up to date. No action is required.
                      </p>
                      <Button onClick={checkForUpdates} variant='ghost' className='w-full rounded-full text-xs text-muted-foreground hover:text-foreground font-bold'>
                        Check Again
                      </Button>
                    </div>
                  )}

                  {updateState === 'update-available' && (
                    <div className='flex flex-col gap-4 py-2 relative z-10'>
                      <div className='flex items-center gap-2.5 text-amber-400 bg-amber-500/10 p-4 rounded-2xl border border-amber-500/10'>
                        <div className='h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping' />
                        <span className='text-sm font-bold'>New version v{latestRelease?.tag_name} is available!</span>
                      </div>

                      <div className='flex flex-col gap-2'>
                        <Button 
                          onClick={handleDownloadUpdate} 
                          className='w-full rounded-full font-bold shadow-xl shadow-primary/20'
                        >
                          Download Update
                        </Button>
                        <Button 
                          onClick={handleViewChangelog} 
                          variant='outline'
                          className='w-full rounded-full font-bold border-border/60 hover:bg-foreground/5'
                        >
                          View Changelog
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Desktop App */}
              {!isTauri && (
                <Card className='p-6 bg-card/50 border-border backdrop-blur-3xl rounded-[2rem] flex flex-col gap-4'>
                  <div className='flex items-center gap-2 mb-2'>
                    <Laptop className='h-5 w-5 text-primary' />
                    <h3 className='font-bold text-foreground text-lg'>Desktop App</h3>
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    Enjoy a seamless frameless player with custom keybindings and desktop sync.
                  </p>
                  <a href='https://github.com/lazyshrey/melofy/releases/latest/download/Melofy_x64.msi' target='_blank' rel='noopener noreferrer'>
                    <Button className='w-full rounded-full font-bold shadow-xl shadow-primary/20'>
                      Download for Windows
                    </Button>
                  </a>
                </Card>
              )}

              {/* Mobile App */}
              {!isNative && !isTauri && (
                <Card className='p-6 bg-card/50 border-border backdrop-blur-3xl rounded-[2rem] flex flex-col gap-4'>
                  <div className='flex items-center gap-2 mb-2'>
                    <Smartphone className='h-5 w-5 text-primary' />
                    <h3 className='font-bold text-foreground text-lg'>Mobile App</h3>
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    Take Melofy on the go with our dedicated Android app.
                  </p>
                  <a href='https://github.com/lazyshrey/melofy/releases/latest/download/Melofy.apk' target='_blank' rel='noopener noreferrer'>
                    <Button className='w-full rounded-full font-bold shadow-xl shadow-primary/20'>
                      Download for Android
                    </Button>
                  </a>
                </Card>
              )}

              {/* Support */}
              <Card className='p-6 bg-card/50 border-border backdrop-blur-3xl rounded-[2rem] flex flex-col gap-4'>
                <div className='flex items-center gap-2 mb-2'>
                  <Sparkles className='h-5 w-5 text-primary' />
                  <h3 className='font-bold text-foreground text-lg'>Support Melofy</h3>
                </div>
                <p className='text-sm text-muted-foreground'>
                  Enjoying Melofy? Consider supporting the development to help keep the music playing.
                </p>
                <DonateButton className="self-center md:self-start w-full" />
              </Card>
            </div>

            <div className='hidden md:flex flex-col'>
              <PreMidGuide />
            </div>
          </div>
        </section>

        <div className='h-px w-full bg-border/50' />

        {/* Legal & Resources Section */}
        <section className='space-y-6'>
          <header className='flex items-center gap-2 px-2'>
            <Globe className='h-4 w-4 text-primary' />
            <h2 className='text-xs font-black uppercase tracking-[0.2em] text-muted-foreground'>Legal & Resources</h2>
          </header>

          <Card className='p-4 bg-card/50 border-border backdrop-blur-3xl rounded-[2rem] overflow-hidden'>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
              <Link href='/github' target='_blank' className='flex items-center gap-3 p-4 rounded-xl hover:bg-foreground/5 transition-all group'>
                <div className='h-10 w-10 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors'>
                  <Github className='h-5 w-5 text-muted-foreground group-hover:text-primary' />
                </div>
                <span className='text-sm font-bold text-foreground'>GitHub</span>
              </Link>
              <Link href='/help' target='_blank' className='flex items-center gap-3 p-4 rounded-xl hover:bg-foreground/5 transition-all group'>
                <div className='h-10 w-10 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors'>
                  <HelpCircle className='h-5 w-5 text-muted-foreground group-hover:text-primary' />
                </div>
                <span className='text-sm font-bold text-foreground'>Help</span>
              </Link>
              <Link href='/privacy' target='_blank' className='flex items-center gap-3 p-4 rounded-xl hover:bg-foreground/5 transition-all group'>
                <div className='h-10 w-10 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors'>
                  <Shield className='h-5 w-5 text-muted-foreground group-hover:text-primary' />
                </div>
                <span className='text-sm font-bold text-foreground'>Privacy</span>
              </Link>
              <Link href='/terms' target='_blank' className='flex items-center gap-3 p-4 rounded-xl hover:bg-foreground/5 transition-all group'>
                <div className='h-10 w-10 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors'>
                  <FileText className='h-5 w-5 text-muted-foreground group-hover:text-primary' />
                </div>
                <span className='text-sm font-bold text-foreground'>Terms</span>
              </Link>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}

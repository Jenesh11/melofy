'use client';

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
  Share2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Switch } from '@/components/ui/Switch';
import { PreMidGuide } from '@/components/settings/PreMidGuide';
import { useTheme, Essence } from '@/lib/theme-context';
import { cn } from '@/lib/utils';

import { DonateButton } from '@/components/common/DonateButton';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { essence, setEssence, mode, setMode } = useTheme();
  const { autoPip, toggleAutoPip } = useSettingsStore();
  const router = useRouter();

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
    <div className='p-6 md:p-12 h-full max-w-6xl mx-auto flex flex-col gap-12 pb-24'>
      {/* Header */}
      <motion.div
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
      </motion.div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-12'>
        {/* Left Column: Account & Appearance */}
        <div className='lg:col-span-2 flex flex-col gap-12'>
          
          {/* Account Section */}
          <section className='space-y-6'>
            <div className='flex items-center gap-2 px-2'>
              <User className='h-4 w-4 text-primary' />
              <h2 className='text-xs font-black uppercase tracking-[0.2em] text-muted-foreground'>Account</h2>
            </div>
            
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

          {/* Appearance Section */}
          <section className='space-y-6'>
             <div className='flex items-center gap-2 px-2'>
              <Sparkles className='h-4 w-4 text-primary' />
              <h2 className='text-xs font-black uppercase tracking-[0.2em] text-muted-foreground'>Appearance</h2>
            </div>

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
            </div>
          </section>

          {/* Player Section */}
          <section className='space-y-6'>
            <div className='flex items-center gap-2 px-2'>
              <Music className='h-4 w-4 text-primary' />
              <h2 className='text-xs font-black uppercase tracking-[0.2em] text-muted-foreground'>Playback Settings</h2>
            </div>
            
            <Card className='p-8 bg-card/50 border-border backdrop-blur-3xl rounded-[2rem]'>
              <div className='flex items-center justify-between'>
                <div className='space-y-1'>
                  <h3 className='font-bold text-foreground text-lg'>Auto Picture-in-Picture</h3>
                  <p className='text-muted-foreground text-sm max-w-md'>
                    Automatically open a mini-player window when you switch to another tab while music is playing.
                  </p>
                </div>
                <Switch checked={autoPip} onCheckedChange={toggleAutoPip} />
              </div>
            </Card>
          </section>
        </div>

        {/* Right Column: Integrations Card (Sticky) */}
        <div className='flex flex-col gap-6 h-fit lg:sticky lg:top-24'>
          <div className='flex items-center gap-2 px-2'>
            <Share2 className='h-4 w-4 text-primary' />
            <h2 className='text-xs font-black uppercase tracking-[0.2em] text-muted-foreground'>Integrations</h2>
          </div>
          <PreMidGuide />

          <div className='flex items-center gap-2 px-2 mt-4'>
            <Sparkles className='h-4 w-4 text-primary' />
            <h2 className='text-xs font-black uppercase tracking-[0.2em] text-muted-foreground'>Support Melofy</h2>
          </div>
          <Card className='p-6 bg-card/50 border-border backdrop-blur-3xl rounded-[2rem] flex flex-col gap-4'>
            <p className='text-sm text-muted-foreground'>
              Enjoying Melofy? Consider supporting the development to help keep the music playing.
            </p>
            <DonateButton className="self-center md:self-start" />
          </Card>
        </div>
      </div>
    </div>
  );
}

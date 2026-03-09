'use client';

import { useAuth } from '@/lib/firebase/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { User, LogOut, Mail, Calendar, Sun, Moon, Laptop } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useTheme } from '@/lib/theme-context';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { essence, setEssence, mode, setMode } = useTheme();
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
    <div className='p-8 h-full max-w-4xl mx-auto flex flex-col'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='mb-12'
      >
        <h1 className='text-4xl font-bold text-foreground mb-2'>Settings</h1>
        <p className='text-muted-foreground'>
          Manage your profile and preferences.
        </p>
      </motion.div>

      {/* Account Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className='p-8 bg-card/50 border-border backdrop-blur-3xl rounded-3xl'>
          <div className='flex flex-col md:flex-row gap-8 items-start md:items-center'>
            <div className='h-32 w-32 rounded-full overflow-hidden shrink-0 border-4 border-primary/20 shadow-2xl bg-muted flex items-center justify-center'>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt='Profile'
                  referrerPolicy='no-referrer'
                  className='h-full w-full object-cover'
                />
              ) : (
                <User className='h-12 w-12 text-muted-foreground' />
              )}
            </div>

            <div className='flex flex-col gap-2 flex-1'>
              <h2 className='text-3xl font-bold text-foreground'>
                {user.displayName || 'Unknown User'}
              </h2>

              <div className='flex items-center gap-2 text-muted-foreground'>
                <Mail className='h-4 w-4' />
                <span>{user.email}</span>
              </div>

              <div className='flex items-center gap-2 text-muted-foreground'>
                <Calendar className='h-4 w-4' />
                <span>
                  Joined{' '}
                  {user.metadata.creationTime
                    ? new Date(user.metadata.creationTime).toLocaleDateString()
                    : 'recently'}
                </span>
              </div>
            </div>

            <Button
              onClick={handleSignOut}
              variant='destructive'
              className='md:ml-auto rounded-full px-8 py-6 text-base font-semibold shadow-xl shadow-red-500/10 hover:shadow-red-500/20 hover:-translate-y-1 transition-all'
            >
              <LogOut className='mr-2 h-5 w-5' />
              Sign Out
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Theme Section */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-8 mt-8'>
        {/* Mode Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className='p-8 bg-card/50 border-border backdrop-blur-3xl rounded-3xl h-full'>
            <div className='flex flex-col gap-6'>
              <div className='flex flex-col gap-1'>
                <h2 className='text-2xl font-bold text-foreground'>
                  Appearance
                </h2>
                <p className='text-muted-foreground text-sm'>
                  Choose between light and dark themes.
                </p>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <button
                  onClick={() => setMode('light')}
                  className={cn(
                    'flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300',
                    mode === 'light'
                      ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(var(--primary),0.1)]'
                      : 'bg-muted/50 border-border hover:border-foreground/20',
                  )}
                >
                  <Sun
                    className={cn(
                      'h-8 w-8',
                      mode === 'light'
                        ? 'text-primary'
                        : 'text-muted-foreground',
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs font-bold uppercase tracking-wider',
                      mode === 'light'
                        ? 'text-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    Light
                  </span>
                </button>
                <button
                  onClick={() => setMode('dark')}
                  className={cn(
                    'flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300',
                    mode === 'dark'
                      ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(var(--primary),0.1)]'
                      : 'bg-muted/50 border-border hover:border-foreground/20',
                  )}
                >
                  <Moon
                    className={cn(
                      'h-8 w-8',
                      mode === 'dark'
                        ? 'text-primary'
                        : 'text-muted-foreground',
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs font-bold uppercase tracking-wider',
                      mode === 'dark'
                        ? 'text-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    Dark
                  </span>
                </button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Essence Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className='p-8 bg-card/50 border-border backdrop-blur-3xl rounded-3xl h-full'>
            <div className='flex flex-col gap-6'>
              <div className='flex flex-col gap-1'>
                <h2 className='text-2xl font-bold text-foreground'>
                  Theme Essence
                </h2>
                <p className='text-muted-foreground text-sm'>
                  Select your primary accent color.
                </p>
              </div>

              <div className='grid grid-cols-3 gap-3'>
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setEssence(t.id as any)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-300 group relative',
                      essence === t.id
                        ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(var(--primary),0.1)]'
                        : 'bg-muted/30 border-border hover:border-foreground/10',
                    )}
                  >
                    <div
                      className='w-6 h-6 rounded-full shadow-inner relative transition-transform duration-300 group-hover:scale-110'
                      style={{ backgroundColor: t.color }}
                    >
                      {essence === t.id && (
                        <motion.div
                          layoutId='active-theme'
                          className='absolute inset-[-3px] rounded-full border-2 border-primary'
                        />
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-[8px] font-black uppercase tracking-widest',
                        essence === t.id
                          ? 'text-primary'
                          : 'text-muted-foreground',
                      )}
                    >
                      {t.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

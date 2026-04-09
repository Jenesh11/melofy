'use client';

import { useAuth } from '@/lib/firebase/auth-context';
import { Sidebar } from '@/components/layout/Sidebar';
import { PlayerShell } from '@/components/layout/PlayerShell';
import { Topbar } from '@/components/layout/Topbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Loader2, Music2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ThemeProvider } from '@/lib/theme-context';
import { cn } from '@/lib/utils';
import { LikedSongsSync } from '@/components/layout/LikedSongsSync';
import { LyricsPanel } from '@/components/layout/LyricsPanel';

export function AppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LikedSongsSync />
      <AppContent>{children}</AppContent>
    </ThemeProvider>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/terms' ||
    pathname === '/privacy' ||
    pathname === '/help' ||
    pathname === '/github';

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      router.push('/login');
    }
  }, [user, loading, isPublicRoute, router]);

  if (loading) {
    return (
      <div className='h-screen w-full flex flex-col items-center justify-center bg-background gap-4'>
        <div className='relative'>
          <Music2 className='h-16 w-16 text-primary animate-pulse' />
          <div className='absolute inset-0 bg-primary/20 blur-2xl rounded-full' />
        </div>
        <div className='flex items-center gap-2 text-zinc-500 font-medium'>
          <Loader2 className='h-4 w-4 animate-spin' />
          <span>Setting the stage for you...</span>
        </div>
      </div>
    );
  }

  // Permissive wrapper ONLY for public routes (Landing Page and Login Page)
  if (!user) {
    if (!isPublicRoute) return null; // Let the redirect happen

    return (
      <div className='h-screen overflow-y-auto overflow-x-hidden bg-background text-foreground custom-scrollbar relative'>
        {children}
      </div>
    );
  }

  return (
    <div className='flex flex-col h-svh overflow-hidden bg-background text-foreground'>
      <div className='flex flex-1 overflow-hidden transition-all duration-300'>
        <div className='hidden md:flex h-full'>
          <Sidebar />
        </div>
        <main className={cn('flex-1 overflow-y-auto custom-scrollbar relative scroll-smooth flex flex-col', pathname === '/playing' ? 'bg-background' : 'bg-linear-to-b from-card/30 via-background to-background')}>
          <div className={cn('shrink-0 sticky top-0 z-50', pathname === '/playing' && 'hidden')}>
            <Topbar />
          </div>
          <div
            className={cn(
              'flex flex-col flex-1',
              pathname === '/playing' ? 'pb-0' : 'pb-32 md:pb-24',
            )}
          >
            {children}
          </div>
        </main>
        <LyricsPanel />
      </div>

      {/* Desktop PlayerShell / Mobile MiniPlayer + BottomNav container */}
      <div className='flex flex-col z-50'>
        <PlayerShell />
        <BottomNavigation />
      </div>
    </div>
  );
}

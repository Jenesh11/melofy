'use client';

import { useAuth } from '@/lib/firebase/auth-context';
import { Sidebar } from '@/components/layout/Sidebar';
import { PlayerShell } from '@/components/layout/PlayerShell';
import { Topbar } from '@/components/layout/Topbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Loader2, Music2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';

import { ThemeProvider } from '@/lib/theme-context';
import { cn } from '@/lib/utils';
import { LikedSongsSync } from '@/components/layout/LikedSongsSync';
import { LyricsPanel } from '@/components/layout/LyricsPanel';
import { OfflineScreen } from '@/components/layout/OfflineScreen';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// Import primary tab page components for always-mounted rendering on mobile.
// These are kept alive in the DOM and shown/hidden with CSS so tab switches
// are instant — no unmounting, no spinner, no refetch.
import HomePageComponent from '@/app/page';
import LibraryPageComponent from '@/app/library/page';
import SearchPageComponent from '@/app/search/page';

// The three primary bottom-nav routes. Only these get the always-mounted treatment.
const MOBILE_TAB_ROUTES = ['/', '/search', '/library'] as const;

export function AppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <OfflineScreen />
      <LikedSongsSync />
      <AppContent>{children}</AppContent>
    </ThemeProvider>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Routes that should NEVER show the app shell (sidebar/player), even when authenticated
  const isStandaloneRoute =
    pathname === '/terms' ||
    pathname === '/privacy' ||
    pathname === '/help' ||
    pathname === '/desktop-login' ||
    pathname === '/github';

  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    isStandaloneRoute;

  // Whether the current route is one of the always-mounted mobile tab pages
  const isMobileTabRoute = (MOBILE_TAB_ROUTES as readonly string[]).includes(pathname);

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      const searchParams = new URLSearchParams(window.location.search);
      const queryString = searchParams.toString();
      const currentUrl = pathname + (queryString ? `?${queryString}` : '');
      router.push(`/login?callbackUrl=${encodeURIComponent(currentUrl)}`);
    }
  }, [user, loading, isPublicRoute, router, pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backButtonHandler = App.addListener('backButton', ({ canGoBack }) => {
      const event = new CustomEvent('hardwareBack', { cancelable: true });
      window.dispatchEvent(event);
      
      if (event.defaultPrevented) {
        return;
      }

      if (pathname !== '/' && pathname !== '/login') {
        if (window.history.length > 1 || canGoBack) {
          window.history.back();
        } else {
          router.push('/');
        }
      } else {
        App.exitApp();
      }
    });

    return () => {
      backButtonHandler.then((h) => h.remove());
    };
  }, []);

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

  // Standalone doc pages render without app shell for ALL users (auth or not)
  if (isStandaloneRoute) {
    return (
      <div className='h-screen overflow-y-auto overflow-x-hidden bg-background text-foreground custom-scrollbar relative'>
        {children}
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
    <div 
      className='flex flex-col h-svh overflow-hidden bg-background text-foreground'
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
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
            {/* ─── MOBILE-ONLY: Always-mounted tab panels ─────────────────────────── */}
            <div
              aria-hidden={pathname !== '/'}
              className={cn(
                'md:hidden flex-col flex-1',
                pathname === '/' ? 'flex' : 'hidden',
              )}
            >
              <HomePageComponent />
            </div>

            <div
              aria-hidden={pathname !== '/search'}
              className={cn(
                'md:hidden flex-col flex-1',
                pathname === '/search' ? 'flex' : 'hidden',
              )}
            >
              <Suspense fallback={null}>
                <SearchPageComponent />
              </Suspense>
            </div>

            <div
              aria-hidden={pathname !== '/library'}
              className={cn(
                'md:hidden flex-col flex-1',
                pathname === '/library' ? 'flex' : 'hidden',
              )}
            >
              <LibraryPageComponent />
            </div>

            {/* ─── Standard {children} renderer ──────────────────────────────────── */}
            <div
              className={cn(
                'flex flex-col flex-1',
                isMobileTabRoute ? 'hidden md:flex' : 'flex'
              )}
            >
              {children}
            </div>
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

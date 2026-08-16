'use client';

import { useAuth } from '@/lib/firebase/auth-context';
import { Sidebar } from '@/components/layout/Sidebar';
import { PlayerShell } from '@/components/layout/PlayerShell';
import { Topbar } from '@/components/layout/Topbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Loader2, Music2, RefreshCw, Search, Settings, Library, X, Minus, Square, ArrowLeft } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense, useRef } from 'react';

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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Disable custom context menu entirely on the Picture-in-Picture (PIP) page
      if (window.location.pathname === '/pip') {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    };

    const handleClick = () => {
      setContextMenu(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
      // Disable Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools)
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
      }
      // Disable Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const menuItemStyle: React.CSSProperties = {
    width: '100%',
    background: 'none',
    border: 'none',
    color: '#fff',
    padding: '6px 12px',
    textAlign: 'left',
    fontSize: '13px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'background 0.15s, color 0.15s',
    fontFamily: 'inherit',
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
    const icon = e.currentTarget.querySelector('svg');
    if (icon) icon.style.color = '#fff';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'none';
    const icon = e.currentTarget.querySelector('svg');
    if (icon) icon.style.color = '';
  };

  // Adjust context menu coordinates to keep the menu fully within the viewport
  const adjustedCoords = (() => {
    if (!contextMenu) return null;
    const menuWidth = 165;
    const menuHeight = 200;
    let left = contextMenu.x;
    let top = contextMenu.y;

    if (typeof window !== 'undefined') {
      if (left + menuWidth > window.innerWidth) {
        left = Math.max(10, window.innerWidth - menuWidth - 10);
      }
      if (top + menuHeight > window.innerHeight) {
        top = Math.max(10, window.innerHeight - menuHeight - 10);
      }
    }
    return { x: left, y: top };
  })();

  return (
    <ThemeProvider>
      <OfflineScreen />
      <LikedSongsSync />
      <AppContent>{children}</AppContent>

      {adjustedCoords && (
        <div
          style={{
            position: 'fixed',
            top: adjustedCoords.y,
            left: adjustedCoords.x,
            zIndex: 99999,
            background: 'rgba(23, 23, 27, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '6px',
            minWidth: '150px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <button
            onClick={() => { router.back(); setContextMenu(null); }}
            style={menuItemStyle}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <ArrowLeft size={14} className="text-zinc-400" />
            <span>Back</span>
          </button>

          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)', margin: '4px 2px' }} />

          <button
            onClick={() => window.location.reload()}
            style={menuItemStyle}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <RefreshCw size={14} className="text-zinc-400" />
            <span>Refresh</span>
          </button>

          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)', margin: '4px 2px' }} />

          <button
            onClick={() => { router.push('/search'); setContextMenu(null); }}
            style={menuItemStyle}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <Search size={14} className="text-zinc-400" />
            <span>Search</span>
          </button>

          <button
            onClick={() => { router.push('/library'); setContextMenu(null); }}
            style={menuItemStyle}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <Library size={14} className="text-zinc-400" />
            <span>Library</span>
          </button>

          <button
            onClick={() => { router.push('/settings'); setContextMenu(null); }}
            style={menuItemStyle}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <Settings size={14} className="text-zinc-400" />
            <span>Settings</span>
          </button>
        </div>
      )}
    </ThemeProvider>
  );
}

const TitleBar = () => {
  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      if (await win.isMaximized()) {
        await win.unmaximize();
      } else {
        await win.maximize();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      data-tauri-drag-region
      style={{
        height: '34px',
        background: 'rgba(10, 10, 12, 0.45)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        color: '#fff',
        userSelect: 'none',
        zIndex: 99999,
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Left side: Logo & Title */}
      <div data-tauri-drag-region style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Melofy" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
        <span data-tauri-drag-region style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.02em', color: 'rgba(255,255,255,0.85)' }}>Melofy</span>
      </div>

      {/* Right side: Window controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '100%' }}>
        <button
          onClick={handleMinimize}
          style={titleBarBtnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
        >
          <Minus size={12} style={{ opacity: 0.8 }} />
        </button>
        <button
          onClick={handleMaximize}
          style={titleBarBtnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
        >
          <Square size={10} style={{ opacity: 0.8 }} />
        </button>
        <button
          onClick={handleClose}
          style={titleBarBtnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
        >
          <X size={12} style={{ opacity: 0.8 }} />
        </button>
      </div>
    </div>
  );
};

const titleBarBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#fff',
  width: '34px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s',
  borderRadius: '4px',
  padding: 0,
};

function AppContent({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, [authLoading]);

  const loading = authLoading && !timedOut;

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [pathname]);

  // Routes that should NEVER show the app shell (sidebar/player), even when authenticated
  const isStandaloneRoute =
    pathname === '/terms' ||
    pathname === '/privacy' ||
    pathname === '/help' ||
    pathname === '/desktop-login' ||
    pathname === '/github' ||
    pathname === '/pip';

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
  }, [pathname, router]);

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

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  const showTitleBar = isTauri && pathname !== '/pip';

  // Standalone doc pages render without app shell for ALL users (auth or not)
  if (isStandaloneRoute) {
    return (
      <div className='h-screen flex flex-col overflow-hidden bg-background text-foreground relative'>
        {showTitleBar && <TitleBar />}
        <div className='flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar'>
          {children}
        </div>
      </div>
    );
  }

  // Permissive wrapper ONLY for public routes (Landing Page and Login Page)
  if (!user) {
    if (!isPublicRoute) return null; // Let the redirect happen

    return (
      <div className='h-screen flex flex-col overflow-hidden bg-background text-foreground relative'>
        {showTitleBar && <TitleBar />}
        <div className='flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar'>
          {children}
        </div>
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
      {showTitleBar && <TitleBar />}
      <div className='flex flex-1 overflow-hidden'>
        <div className='hidden md:flex h-full'>
          <Sidebar />
        </div>

        <main
          ref={mainRef}
          className='flex-1 overflow-y-auto custom-scrollbar relative scroll-smooth flex flex-col bg-background'
        >
          <div className={cn('shrink-0 sticky top-0 z-50', pathname === '/playing' && 'hidden')}>
            <Topbar />
          </div>

          <div
            className={cn(
              'flex flex-col flex-1',
              pathname === '/playing' ? 'pb-0' : 'pb-6 md:pb-10',
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

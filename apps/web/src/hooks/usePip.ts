'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Track } from '@/store/usePlayerStore';
import { useSettingsStore } from '@/store/useSettingsStore';

// Document PiP window dimensions — premium vertical ambient player matching safety height minimums
const PIP_W = 380;
const PIP_H = 240;

// Module-level so openDocPip() can be called from button clicks
let _requestOpen: (() => Promise<void>) | null = null;

/** Open the custom Document PiP window (must be called from a user gesture) */
export async function openPip() {
  if (_requestOpen) await _requestOpen();
}

/** True if Document Picture-in-Picture or native Tauri window is available */
export function isPipSupported() {
  if (typeof window === 'undefined') return false;
  const isTauri = '__TAURI_INTERNALS__' in window;
  return isTauri || 'documentPictureInPicture' in window;
}

export function useDocPip(
  currentTrack: Track | null,
  isPlaying: boolean,
) {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const [isTauriPipOpen, setIsTauriPipOpen] = useState(false);

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  const openTauriWindow = useCallback(async () => {
    try {
      const { Window } = await import('@tauri-apps/api/window');
      const pipWin = new Window('pip');
      await pipWin.show();
      await pipWin.setFocus();
      setIsTauriPipOpen(true);
    } catch (err) {
      console.error('[TauriPiP] failed to open:', err);
    }
  }, []);

  const closeTauriWindow = useCallback(async () => {
    try {
      const { Window } = await import('@tauri-apps/api/window');
      const pipWin = new Window('pip');
      await pipWin.hide();
      setIsTauriPipOpen(false);
    } catch (err) {
      console.error('[TauriPiP] failed to close:', err);
    }
  }, []);

  const openWindow = useCallback(async () => {
    if (isTauri) {
      await openTauriWindow();
      return;
    }

    if (!('documentPictureInPicture' in window)) return;
    // If already open, just focus it
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      return;
    }

    try {
      // @ts-expect-error - Document PiP API is not in core TS types yet
      const win: Window = await window.documentPictureInPicture.requestWindow({
        width: PIP_W,
        height: PIP_H,
        preferInitialWindowPlacement: true,
        disallowReturnToOpener: false,
      });

      // Clone all stylesheets from parent into the PiP window so Tailwind works
      [...document.styleSheets].forEach((sheet) => {
        try {
          const styleEl = document.createElement('style');
          const rules = [...sheet.cssRules].map((r) => r.cssText).join('\n');
          styleEl.textContent = rules;
          win.document.head.appendChild(styleEl);
        } catch {
          // cross-origin sheets — copy by <link> instead
          if (sheet.href) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = sheet.href;
            win.document.head.appendChild(link);
          }
        }
      });

      // Also forward CSS variables from :root
      const rootStyle = getComputedStyle(document.documentElement);
      const vars = [...rootStyle].filter((p) => p.startsWith('--'));
      if (vars.length) {
        const varStyle = document.createElement('style');
        varStyle.textContent = `:root { ${vars.map((v) => `${v}: ${rootStyle.getPropertyValue(v)}`).join('; ')} }`;
        win.document.head.appendChild(varStyle);
      }

      // Base styles for the window body
      const baseStyle = document.createElement('style');
      baseStyle.textContent = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      `;
      win.document.head.appendChild(baseStyle);

      pipWindowRef.current = win;
      setPipWindow(win);

      win.addEventListener('pagehide', () => {
        pipWindowRef.current = null;
        setPipWindow(null);
      });
    } catch (err) {
      console.error('[DocPiP] failed to open:', err);
    }
  }, [isTauri, openTauriWindow]);

  const closeWindow = useCallback(() => {
    if (isTauri) {
      void closeTauriWindow();
      return;
    }

    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
    }
    pipWindowRef.current = null;
    setPipWindow(null);
  }, [isTauri, closeTauriWindow]);

  // Expose openWindow for the module-level helper
  useEffect(() => {
    _requestOpen = openWindow;
    return () => { _requestOpen = null; };
  }, [openWindow]);

  const { autoPip } = useSettingsStore();

  // Auto-open when tab is hidden while playing
  useEffect(() => {
    const onVisibility = async () => {
      if (document.visibilityState === 'hidden' && isPlaying && currentTrack && autoPip) {
        await openWindow();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [isPlaying, currentTrack, openWindow, autoPip]);

  // Handle external synchronization of closed state for Tauri PiP
  useEffect(() => {
    if (!isTauri) return;

    const channel = new BroadcastChannel('melofy-pip');
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'command' && e.data.action === 'close') {
        void closeTauriWindow();
      }
    };
    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [isTauri, closeTauriWindow]);

  return {
    pipWindow,
    openPip: openWindow,
    closePip: closeWindow,
    isPipOpen: isTauri ? isTauriPipOpen : !!pipWindow,
  };
}

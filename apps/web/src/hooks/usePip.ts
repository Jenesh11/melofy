'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Track } from '@/store/usePlayerStore';
import { useSettingsStore } from '@/store/useSettingsStore';

// Document PiP window dimensions — compact Spotify-style horizontal card
const PIP_W = 460;
const PIP_H = 148;

// Module-level so openDocPip() can be called from button clicks
let _requestOpen: (() => Promise<void>) | null = null;

/** Open the custom Document PiP window (must be called from a user gesture) */
export async function openPip() {
  if (_requestOpen) await _requestOpen();
}

/** True if Document Picture-in-Picture is available in this browser (Chrome 116+) */
export function isPipSupported() {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window;
}

export function useDocPip(
  currentTrack: Track | null,
  isPlaying: boolean,
) {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const pipWindowRef = useRef<Window | null>(null);

  const openWindow = useCallback(async () => {
    if (!('documentPictureInPicture' in window)) return;
    // If already open, just focus it
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      return;
    }

    try {
      // @ts-expect-error — Document PiP API is not in core TS types yet
      const win: Window = await window.documentPictureInPicture.requestWindow({
        width: PIP_W,
        height: PIP_H,
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

      win.document.body.style.width = `${PIP_W}px`;
      win.document.body.style.height = `${PIP_H}px`;

      pipWindowRef.current = win;
      setPipWindow(win);

      win.addEventListener('pagehide', () => {
        pipWindowRef.current = null;
        setPipWindow(null);
      });
    } catch (err) {
      console.error('[DocPiP] failed to open:', err);
    }
  }, []);

  const closeWindow = useCallback(() => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
    }
    pipWindowRef.current = null;
    setPipWindow(null);
  }, []);

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

  return {
    pipWindow,
    openPip: openWindow,
    closePip: closeWindow,
    isPipOpen: !!pipWindow,
  };
}

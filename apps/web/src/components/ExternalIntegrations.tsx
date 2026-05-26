'use client';

import { useEffect, useRef, useState } from 'react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';

declare global {
  interface Window {
    melofy?: {
      track: Track | null;
      isPlaying: boolean;
      progress: number;
      partyId: string | null;
      version: string;
    };
  }
}

/**
 * Manages all external system integrations for the Melofy player:
 * 1. PreMiD Browser Integration (exposes state via global window object)
 * 2. Native Discord Rich Presence (via Tauri Rust RPC handler)
 * 3. Windows Taskbar Thumbnail Toolbar (via Tauri taskbar plugin)
 */
export function ExternalIntegrations() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const progress = usePlayerStore((state) => state.progress);
  const partyId = usePlayerStore((state) => state.partyId);

  // References for smart Discord presence update detection (throttling, seeking & metadata loads)
  const lastTrackId = useRef<string | null>(null);
  const lastIsPlaying = useRef<boolean>(false);
  const lastUpdatedTime = useRef<number>(0);
  const lastProgress = useRef<number>(0);
  const lastDuration = useRef<number>(0);
  const lastPartyId = useRef<string | null>(null);

  const [taskbarInitialized, setTaskbarInitialized] = useState(false);

  // 1. PreMiD Browser Exposer Integration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!window.melofy) {
        window.melofy = {
          track: currentTrack,
          isPlaying,
          progress,
          partyId,
          version: '5.0.1',
        };
      } else {
        window.melofy.track = currentTrack;
        window.melofy.isPlaying = isPlaying;
        window.melofy.progress = progress;
        window.melofy.partyId = partyId;
        window.melofy.version = '5.0.1';
      }
      
      // Dispatch event to proactively notify external listeners (like PreMiD)
      window.dispatchEvent(new CustomEvent('melofy_state_update', { detail: window.melofy }));
    }
  }, [currentTrack, isPlaying, progress, partyId]);

  // 2. Tauri Native Discord Rich Presence Integration
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isTauri = '__TAURI_INTERNALS__' in window;
    if (!isTauri) return;

    const now = Date.now();
    const dt = now - lastUpdatedTime.current;
    
    const trackChanged = currentTrack?.id !== lastTrackId.current;
    const playStateChanged = isPlaying !== lastIsPlaying.current;
    const durationChanged = currentTrack?.duration !== lastDuration.current;
    const partyIdChanged = partyId !== lastPartyId.current;
    
    // Calculate if a manual seek occurred: progress jump of more than 2.5 seconds
    // relative to normal elapsed time since the last tick (~200ms ago).
    const expectedProgress = lastProgress.current + (isPlaying ? dt : 0);
    const seeked = Math.abs(progress - expectedProgress) > 2500;

    // We always update the tracking references on every tick to measure consecutive drift
    // and prevent accumulation of natural wall-clock vs audio device sample clock drift.
    lastTrackId.current = currentTrack?.id || null;
    lastIsPlaying.current = isPlaying;
    lastProgress.current = progress;
    lastDuration.current = currentTrack?.duration || 0;
    lastPartyId.current = partyId;
    lastUpdatedTime.current = now;

    if (trackChanged || playStateChanged || seeked || durationChanged || partyIdChanged) {
      if (currentTrack) {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke('update_discord_presence', {
            title: currentTrack.title,
            artist: currentTrack.artist,
            artworkUrl: currentTrack.artworkUrl,
            duration: currentTrack.duration,
            progress: progress,
            isPlaying: isPlaying,
            partyId: partyId,
          }).catch((err) => {
            console.error('[DiscordRPC] failed to update presence:', err);
          });
        });
      } else {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke('clear_discord_presence').catch((err) => {
            console.error('[DiscordRPC] failed to clear presence:', err);
          });
        });
      }
    }
  }, [currentTrack, isPlaying, progress, partyId]);

  // 3. Windows Taskbar Thumbnail Toolbar (Tauri-only)
  // The plugin requires explicit JS-side initialization via invoke, then
  // ongoing playback state updates to sync the button icons.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isTauri = '__TAURI_INTERNALS__' in window;
    if (!isTauri) return;

    const cleanupFns: (() => void)[] = [];

    const setup = async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const { listen } = await import('@tauri-apps/api/event');

      // Initialize the taskbar thumbnail toolbar buttons (must be called once)
      if (!taskbarInitialized) {
        try {
          await invoke('plugin:taskbar|initialize');
          setTaskbarInitialized(true);
          console.log('[Taskbar] Thumbnail toolbar initialized');
        } catch (err) {
          console.error('[Taskbar] Failed to initialize:', err);
          return; // Don't register listeners if init failed
        }
      }

      // Enable navigation buttons (both prev and next)
      // Note: Tauri auto-maps JS camelCase keys to Rust snake_case variables.
      try {
        await invoke('plugin:taskbar|set_navigation_enabled', {
          previousEnabled: true,
          nextEnabled: true,
        });
      } catch (err) {
        console.error('[Taskbar] Failed to enable navigation:', err);
      }

      // Sync initial play state on mount
      // Note: Tauri auto-maps JS camelCase keys to Rust snake_case variables.
      try {
        const store = usePlayerStore.getState;
        await invoke('plugin:taskbar|set_playback_state', {
          isPlaying: store().isPlaying,
        });
      } catch (err) {
        console.error('[Taskbar] Failed to set initial playback state:', err);
      }

      const store = usePlayerStore.getState;

      // Previous track button event listener
      const unlistenPrev = await listen('media-prev', () => {
        store().playPrevious(true);
      });
      cleanupFns.push(unlistenPrev);

      // Play/Pause toggle button event listener
      const unlistenToggle = await listen('media-toggle', () => {
        const { isPlaying, resume, pause } = store();
        if (isPlaying) {
          pause(true);
        } else {
          resume(true);
        }
      });
      cleanupFns.push(unlistenToggle);

      // Next track button event listener
      const unlistenNext = await listen('media-next', () => {
        store().playNext(true);
      });
      cleanupFns.push(unlistenNext);
    };

    setup();

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, []); // Only register once on mount

  // 4. Sync playback state dynamically to taskbar thumbnail buttons on state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('__TAURI_INTERNALS__' in window)) return;
    if (!taskbarInitialized) return;

    import('@tauri-apps/api/core').then(({ invoke }) => {
      // Note: Tauri auto-maps JS camelCase keys to Rust snake_case variables.
      invoke('plugin:taskbar|set_playback_state', {
        isPlaying: isPlaying,
      }).catch((err) => {
        console.error('[Taskbar] Failed to set playback state:', err);
      });
    });
  }, [isPlaying, taskbarInitialized]);

  return null;
}

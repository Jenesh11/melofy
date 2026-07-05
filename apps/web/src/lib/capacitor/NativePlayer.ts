import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface NativePlayerState {
  trackId: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

export interface NativePlayerPlugin {
  play(options: { url: string; time?: number; trackId?: string }): Promise<void>;
  pause(): Promise<void>;
  seekTo(options: { time: number }): Promise<void>;
  /** Pre-arm the next track so the service can auto-advance without the WebView. Pass no url to clear. */
  setNext(options: { url?: string | null; trackId?: string | null }): Promise<void>;
  /** Snapshot of native playback state, used to reconcile JS after a renderer freeze/kill. */
  getState(): Promise<NativePlayerState>;
  addListener(
    eventName: 'timeupdate',
    listenerFunc: (state: { currentTime: number; duration: number }) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
  addListener(
    eventName: 'ended',
    listenerFunc: () => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
  addListener(
    eventName: 'advanced',
    listenerFunc: (state: { trackId: string | null }) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
  addListener(
    eventName: 'buffering',
    listenerFunc: (state: { isBuffering: boolean }) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
}

export const NativePlayer = registerPlugin<NativePlayerPlugin>('NativePlayer');

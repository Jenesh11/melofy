import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface NativePlayerPlugin {
  play(options: { url: string }): Promise<void>;
  pause(): Promise<void>;
  seekTo(options: { time: number }): Promise<void>;
  addListener(
    eventName: 'timeupdate',
    listenerFunc: (state: { currentTime: number; duration: number }) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
  addListener(
    eventName: 'ended',
    listenerFunc: () => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
}

export const NativePlayer = registerPlugin<NativePlayerPlugin>('NativePlayer');

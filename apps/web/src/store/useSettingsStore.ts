import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
  autoPip: boolean;
  
  // Actions
  toggleAutoPip: () => void;
  setAutoPip: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoPip: true,

      toggleAutoPip: () => set((state) => ({ autoPip: !state.autoPip })),
      setAutoPip: (value) => set({ autoPip: value }),
    }),
    {
      name: 'melofy-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

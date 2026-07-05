import { create } from 'zustand';

interface LyricsPanelStore {
  isOpen: boolean;
  activeTab: 'lyrics' | 'queue';
  open: (tab?: 'lyrics' | 'queue') => void;
  close: () => void;
  toggle: (tab?: 'lyrics' | 'queue') => void;
  setActiveTab: (tab: 'lyrics' | 'queue') => void;
}

export const useLyricsPanelStore = create<LyricsPanelStore>((set) => ({
  isOpen: false,
  activeTab: 'lyrics',
  open: (tab) => set((state) => ({
    isOpen: true,
    activeTab: tab ?? state.activeTab,
  })),
  close: () => set({ isOpen: false }),
  toggle: (tab) => set((state) => {
    if (state.isOpen) {
      if (tab && state.activeTab !== tab) {
        return { activeTab: tab };
      }
      return { isOpen: false };
    } else {
      return { isOpen: true, activeTab: tab ?? state.activeTab };
    }
  }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));

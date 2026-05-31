import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarStore {
  isCollapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isCollapsed: false,
      toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      setCollapsed: (collapsed: boolean) => set({ isCollapsed: collapsed }),
    }),
    {
      name: 'melofy-sidebar-state',
    }
  )
);

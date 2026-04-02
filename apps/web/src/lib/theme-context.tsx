'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Essence =
  | 'monochrome'
  | 'emerald'
  | 'golden'
  | 'cyan'
  | 'lavender'
  | 'rose';
type Mode = 'light' | 'dark';

interface ThemeContextType {
  essence: Essence;
  setEssence: (essence: Essence) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [essence, setEssenceState] = useState<Essence>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('melofy-essence') as Essence) || 'monochrome';
    }
    return 'monochrome';
  });
  const [mode, setModeState] = useState<Mode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('melofy-mode') as Mode) || 'dark';
    }
    return 'dark';
  });

  // Apply initial theme on mount and keep sync
  useEffect(() => {
    document.documentElement.setAttribute('data-essence', essence);
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [essence, mode]);

  const setEssence = (newEssence: Essence) => {
    setEssenceState(newEssence);
    localStorage.setItem('melofy-essence', newEssence);
    document.documentElement.setAttribute('data-essence', newEssence);
  };

  const setMode = (newMode: Mode) => {
    setModeState(newMode);
    localStorage.setItem('melofy-mode', newMode);
    if (newMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <ThemeContext.Provider value={{ essence, setEssence, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

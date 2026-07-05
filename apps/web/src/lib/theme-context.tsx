'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Essence =
  | 'monochrome'
  | 'emerald'
  | 'golden'
  | 'cyan'
  | 'lavender'
  | 'rose'
  | 'custom';

type Mode = 'light' | 'dark' | 'amoled';

interface ThemeContextType {
  essence: Essence;
  setEssence: (essence: Essence) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  customBg: string;
  setCustomBg: (bg: string) => void;
  customAccent: string;
  setCustomAccent: (accent: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getContrastYIQ(hexcolor: string) {
  const hex = hexcolor.replace('#', '');
  if (hex.length !== 6) return '#f5f5f5';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#171717' : '#f5f5f5';
}

function adjustColor(hexcolor: string, percent: number) {
  const hex = hexcolor.replace('#', '');
  if (hex.length !== 6) return hexcolor;
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  r = Math.max(0, Math.min(255, r + percent));
  g = Math.max(0, Math.min(255, g + percent));
  b = Math.max(0, Math.min(255, b + percent));

  const rr = r.toString(16).padStart(2, '0');
  const gg = g.toString(16).padStart(2, '0');
  const bb = b.toString(16).padStart(2, '0');

  return `#${rr}${gg}${bb}`;
}

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

  const [customBg, setCustomBgState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('melofy-custom-bg') || '#121212';
    }
    return '#121212';
  });

  const [customAccent, setCustomAccentState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('melofy-custom-accent') || '#fbbf24';
    }
    return '#fbbf24';
  });

  // Apply theme on state change
  useEffect(() => {
    if (essence === 'custom') {
      document.documentElement.setAttribute('data-essence', 'custom');
      
      const fgColor = getContrastYIQ(customBg);
      const primaryFgColor = getContrastYIQ(customAccent);
      
      const isDark = fgColor === '#f5f5f5';
      const cardColor = isDark ? adjustColor(customBg, 12) : adjustColor(customBg, -6);
      const popoverColor = isDark ? adjustColor(customBg, 16) : adjustColor(customBg, -10);
      const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

      document.documentElement.style.setProperty('--background', customBg);
      document.documentElement.style.setProperty('--primary', customAccent);
      document.documentElement.style.setProperty('--foreground', fgColor);
      document.documentElement.style.setProperty('--primary-foreground', primaryFgColor);
      document.documentElement.style.setProperty('--card', cardColor);
      document.documentElement.style.setProperty('--popover', popoverColor);
      document.documentElement.style.setProperty('--border', borderColor);
      document.documentElement.style.setProperty('--input', borderColor);
      document.documentElement.style.setProperty('--ring', customAccent);
    } else {
      // Clean up custom inline variables
      document.documentElement.style.removeProperty('--background');
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--foreground');
      document.documentElement.style.removeProperty('--primary-foreground');
      document.documentElement.style.removeProperty('--card');
      document.documentElement.style.removeProperty('--popover');
      document.documentElement.style.removeProperty('--border');
      document.documentElement.style.removeProperty('--input');
      document.documentElement.style.removeProperty('--ring');

      document.documentElement.setAttribute('data-essence', essence);
      document.documentElement.classList.remove('dark', 'amoled');
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (mode === 'amoled') {
        document.documentElement.classList.add('dark', 'amoled');
      }
    }
  }, [essence, mode, customBg, customAccent]);

  const setEssence = (newEssence: Essence) => {
    setEssenceState(newEssence);
    localStorage.setItem('melofy-essence', newEssence);
  };

  const setMode = (newMode: Mode) => {
    setModeState(newMode);
    localStorage.setItem('melofy-mode', newMode);
  };

  const setCustomBg = (bg: string) => {
    setCustomBgState(bg);
    localStorage.setItem('melofy-custom-bg', bg);
  };

  const setCustomAccent = (accent: string) => {
    setCustomAccentState(accent);
    localStorage.setItem('melofy-custom-accent', accent);
  };

  return (
    <ThemeContext.Provider
      value={{
        essence,
        setEssence,
        mode,
        setMode,
        customBg,
        setCustomBg,
        customAccent,
        setCustomAccent,
      }}
    >
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

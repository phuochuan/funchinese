'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ColorMode = 'light' | 'dark' | 'system';

interface DarkModeContextType {
  mode: ColorMode;
  isDark: boolean;
  setMode: (m: ColorMode) => void;
  toggle: () => void;
}

const DarkModeContext = createContext<DarkModeContextType>({
  mode: 'system',
  isDark: false,
  setMode: () => {},
  toggle: () => {},
});

const STORAGE_KEY = 'fc_color_mode';

function getResolvedIsDark(mode: ColorMode): boolean {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return mode === 'dark';
}

function applyDarkClass(isDark: boolean) {
  const html = document.documentElement;
  if (isDark) {
    html.classList.add('dark');
    html.style.colorScheme = 'dark';
  } else {
    html.classList.remove('dark');
    html.style.colorScheme = 'light';
  }
}

// Re-export from the server-safe module for backward compatibility.
export { getDarkModeScript as DarkModeInitScript } from './darkModeScript';

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>('system');
  const [isDark, setIsDark] = useState(false);

  // Apply theme to DOM + persist to localStorage
  const applyMode = useCallback((m: ColorMode) => {
    const dark = getResolvedIsDark(m);
    applyDarkClass(dark);
    setIsDark(dark);
    try { localStorage.setItem(STORAGE_KEY, m); } catch {}
  }, []);

  // Init: read localStorage, apply immediately
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ColorMode) || 'system';
    setModeState(stored);
    applyMode(stored);

    // Listen for system preference changes when mode = system
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function onSystemChange() {
      const current = localStorage.getItem(STORAGE_KEY) as ColorMode || 'system';
      if (current === 'system') {
        applyMode('system');
      }
    }
    mq.addEventListener('change', onSystemChange);
    return () => mq.removeEventListener('change', onSystemChange);
  }, [applyMode]);

  function setMode(m: ColorMode) {
    setModeState(m);
    applyMode(m);
  }

  function toggle() {
    const next: ColorMode = isDark ? 'light' : 'dark';
    setMode(next);
  }

  return (
    <DarkModeContext.Provider value={{ mode, isDark, setMode, toggle }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  return useContext(DarkModeContext);
}

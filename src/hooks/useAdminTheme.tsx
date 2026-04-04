'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeName = 'red' | 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'pink';

export const THEME_PALETTES: Record<ThemeName, {
  primary: string; onPrimary: string;
  primaryContainer: string; onPrimaryContainer: string;
  primaryFixed: string; primaryFixedDim: string;
  onPrimaryFixed: string; onPrimaryFixedVariant: string;
  inversePrimary: string; surfaceTint: string;
}> = {
  red: {
    primary: "#7C0000",       onPrimary: "#ffffff",
    primaryContainer: "#ffdada", onPrimaryContainer: "#410001",
    primaryFixed: "#ffcccc", primaryFixedDim: "#ffaaaa",
    onPrimaryFixed: "#410001", onPrimaryFixedVariant: "#5e0000",
    inversePrimary: "#ffb3b3", surfaceTint: "#930000",
  },
  blue: {
    primary: "#005684",      onPrimary: "#ffffff",
    primaryContainer: "#cde5ff", onPrimaryContainer: "#001d31",
    primaryFixed: "#d6ebff", primaryFixedDim: "#93ccff",
    onPrimaryFixed: "#001d31", onPrimaryFixedVariant: "#004b74",
    inversePrimary: "#93ccff", surfaceTint: "#006398",
  },
  green: {
    primary: "#006c4e",      onPrimary: "#ffffff",
    primaryContainer: "#83f5c6", onPrimaryContainer: "#002115",
    primaryFixed: "#a3f0d1", primaryFixedDim: "#68dbae",
    onPrimaryFixed: "#002115", onPrimaryFixedVariant: "#00513a",
    inversePrimary: "#68dbae", surfaceTint: "#006c4e",
  },
  purple: {
    primary: "#6B21A8",      onPrimary: "#ffffff",
    primaryContainer: "#f3e8ff", onPrimaryContainer: "#3b0764",
    primaryFixed: "#e9d5ff", primaryFixedDim: "#d8b4fe",
    onPrimaryFixed: "#3b0764", onPrimaryFixedVariant: "#581c87",
    inversePrimary: "#d8b4fe", surfaceTint: "#6B21A8",
  },
  orange: {
    primary: "#C2410C",     onPrimary: "#ffffff",
    primaryContainer: "#ffdab3", onPrimaryContainer: "#431407",
    primaryFixed: "#ffe0c2", primaryFixedDim: "#ffb87a",
    onPrimaryFixed: "#431407", onPrimaryFixedVariant: "#8B2500",
    inversePrimary: "#ffb87a", surfaceTint: "#C2410C",
  },
  teal: {
    primary: "#0D9488",     onPrimary: "#ffffff",
    primaryContainer: "#ccfbf1", onPrimaryContainer: "#042f2e",
    primaryFixed: "#99f6e4", primaryFixedDim: "#5eead4",
    onPrimaryFixed: "#042f2e", onPrimaryFixedVariant: "#115e59",
    inversePrimary: "#5eead4", surfaceTint: "#0D9488",
  },
  pink: {
    primary: "#be185d",     onPrimary: "#ffffff",
    primaryContainer: "#fce7f3", onPrimaryContainer: "#500724",
    primaryFixed: "#fbcfe8", primaryFixedDim: "#f9a8d4",
    onPrimaryFixed: "#500724", onPrimaryFixedVariant: "#831843",
    inversePrimary: "#f9a8d4", surfaceTint: "#be185d",
  },
};

type ThemeContextType = {
  theme: ThemeName;
  setTheme: (t: ThemeName) => Promise<void>;
  loading: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'red',
  setTheme: async () => {},
  loading: true,
});

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('red');
  const [loading, setLoading] = useState(true);

  // Load theme from API on mount
  useEffect(() => {
    fetch('/api/admin/settings/theme')
      .then(r => r.json())
      .then(d => {
        const t = d.theme as ThemeName;
        setThemeState(t);
        applyTheme(t);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function applyTheme(name: ThemeName) {
    const p = THEME_PALETTES[name];
    const root = document.documentElement;
    root.style.setProperty('--primary', p.primary);
    root.style.setProperty('--on-primary', p.onPrimary);
    root.style.setProperty('--primary-container', p.primaryContainer);
    root.style.setProperty('--on-primary-container', p.onPrimaryContainer);
    root.style.setProperty('--primary-fixed', p.primaryFixed);
    root.style.setProperty('--primary-fixed-dim', p.primaryFixedDim);
    root.style.setProperty('--on-primary-fixed', p.onPrimaryFixed);
    root.style.setProperty('--on-primary-fixed-variant', p.onPrimaryFixedVariant);
    root.style.setProperty('--inverse-primary', p.inversePrimary);
    root.style.setProperty('--surface-tint', p.surfaceTint);
    // Cache in sessionStorage for instant theme on next load (before React hydrates)
    try { sessionStorage.setItem('admin_theme', name); } catch {}
  }

  async function setTheme(t: ThemeName) {
    applyTheme(t);
    setThemeState(t);
    try {
      await fetch('/api/admin/settings/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: t }),
      });
    } catch { /* ignore */ }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAdminTheme() {
  return useContext(ThemeContext);
}

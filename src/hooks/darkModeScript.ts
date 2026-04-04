// Dark-mode init script — safe to import from Server Components.
// This file must NOT have 'use client' at the top.

const STORAGE_KEY = 'fc_color_mode';

export function getDarkModeScript(): { __html: string } {
  const code = `
(function() {
  try {
    var mode = localStorage.getItem('${STORAGE_KEY}') || 'system';
    var isDark = (mode === 'system')
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : mode === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  } catch(e) {}
})();
  `.trim();
  return { __html: code };
}

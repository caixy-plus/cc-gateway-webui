import { useState, useEffect, useCallback } from 'react';
import type { ThemeMode } from '@/types';

const STORAGE_KEY = 'cc-gateway-theme';

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'auto';
    } catch {
      return 'auto';
    }
  });

  const applyTheme = useCallback((mode: ThemeMode) => {
    const resolved = mode === 'auto' ? getSystemTheme() : mode;
    document.documentElement.setAttribute('data-theme', resolved);
  }, []);

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      setThemeState(mode);
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {}
      applyTheme(mode);
    },
    [applyTheme]
  );

  useEffect(() => {
    applyTheme(theme);
    const handler = () => {
      if (theme === 'auto') applyTheme('auto');
    };
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, applyTheme]);

  return { theme, setTheme };
}

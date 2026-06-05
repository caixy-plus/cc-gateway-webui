import { useState, useEffect, useCallback } from 'react';
import type { ThemeMode } from '@/types';

const STORAGE_KEY = 'cc-gateway-theme';

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  return mode === 'auto' ? getSystemTheme() : mode;
}

function applyThemeToDocument(resolved: 'dark' | 'light') {
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const mode = (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'auto';
      applyThemeToDocument(resolveTheme(mode));
      return mode;
    } catch {
      applyThemeToDocument(getSystemTheme());
      return 'auto';
    }
  });

  const applyTheme = useCallback((mode: ThemeMode) => {
    applyThemeToDocument(resolveTheme(mode));
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

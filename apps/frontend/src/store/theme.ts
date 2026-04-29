'use client';

import { useEffect, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'eagle-eyes:theme';

function readStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === 'light' || value === 'dark' ? value : null;
}

function systemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

function setTheme(theme: Theme) {
  applyTheme(theme);
  window.localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new Event('eagle-eyes:theme-change'));
}

function subscribe(callback: () => void) {
  window.addEventListener('eagle-eyes:theme-change', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('eagle-eyes:theme-change', callback);
    window.removeEventListener('storage', callback);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    currentTheme,
    () => 'dark' as Theme,
  );

  useEffect(() => {
    if (readStoredTheme() !== null) return;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => applyTheme(systemTheme());
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  return {
    theme,
    setTheme,
    toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
  };
}

export const THEME_STORAGE_KEY = STORAGE_KEY;

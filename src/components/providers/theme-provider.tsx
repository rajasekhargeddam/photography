'use client';
import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { themeStorageKey, type Theme } from '@/config/theme';
const changeEvent = 'photography-theme-change';
function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}
function getServerTheme(): Theme {
  return 'dark';
}
function subscribe(notify: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key !== themeStorageKey && event.key !== null) return;
    document.documentElement.dataset.theme =
      event.newValue === 'light' ? 'light' : 'dark';
    notify();
  }
  window.addEventListener(changeEvent, notify);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(changeEvent, notify);
    window.removeEventListener('storage', onStorage);
  };
}
function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    /* Still usable without storage. */
  }
  window.dispatchEvent(new Event(changeEvent));
}
const ThemeContext = createContext<{
  theme: Theme;
  setTheme: typeof setTheme;
} | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}

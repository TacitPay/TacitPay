import { useCallback, useSyncExternalStore } from 'react';

/**
 * The visitor has three states, not two. "System" is the default and stores
 * nothing at all — the media query in index.css owns that case — so an explicit
 * choice is the only thing that ever reaches localStorage, and clearing it is
 * how you go back to following the OS.
 *
 * Kept as a module-level store rather than a context so both shells can read it
 * without a provider, and so the pre-paint stamp in index.html and this file
 * agree on exactly one key.
 */
export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'tacitpay:theme';

const listeners = new Set<() => void>();

const readStored = (): ThemeChoice => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    // Private windows and blocked site data both throw here. Following the
    // system is the correct answer when we cannot remember a choice.
    return 'system';
  }
};

let choice: ThemeChoice = typeof window === 'undefined' ? 'system' : readStored();

const stamp = (next: ThemeChoice) => {
  const root = document.documentElement;
  if (next === 'system') delete root.dataset.theme;
  else root.dataset.theme = next;
};

export const setTheme = (next: ThemeChoice) => {
  choice = next;
  try {
    if (next === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // A theme we cannot persist still applies for this visit.
  }
  stamp(next);
  listeners.forEach((notify) => notify());
};

/** The choice in effect right now, independent of any render. */
export const getTheme = (): ThemeChoice => choice;

/** system → light → dark → system. */
export const nextTheme = (current: ThemeChoice): ThemeChoice =>
  current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
};

export const useTheme = () => {
  const theme = useSyncExternalStore(
    subscribe,
    () => choice,
    () => 'system' as ThemeChoice,
  );
  // Deliberately reads the store rather than the rendered value: a click that
  // lands before React has re-rendered would otherwise advance from a stale
  // theme and appear to do nothing.
  const cycle = useCallback(() => setTheme(nextTheme(getTheme())), []);
  return { theme, setTheme, cycle };
};

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Dark is the house default: a first visit renders dark no matter what the OS
 * prefers, and the toggle switches between exactly two states. Only an explicit
 * choice reaches localStorage, and it survives reloads. The old third state —
 * "follow the system" — was removed deliberately when dark became the default;
 * the media query in index.css now only covers the no-JS fallback.
 *
 * Kept as a module-level store rather than a context so both shells can read it
 * without a provider, and so the pre-paint stamp in index.html and this file
 * agree on exactly one key and one default.
 */
export type ThemeChoice = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'tacitpay:theme';

const listeners = new Set<() => void>();

const readStored = (): ThemeChoice => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    // Private windows and blocked site data both throw here. The dark default
    // is the correct answer when we cannot remember a choice.
    return 'dark';
  }
};

let choice: ThemeChoice = typeof window === 'undefined' ? 'dark' : readStored();

const stamp = (next: ThemeChoice) => {
  document.documentElement.dataset.theme = next;
  // Keep the browser chrome (the mobile address bar) on the page's own ground.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', next === 'light' ? '#fafafa' : '#09090b');
};

export const setTheme = (next: ThemeChoice) => {
  choice = next;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // A theme we cannot persist still applies for this visit.
  }
  stamp(next);
  listeners.forEach((notify) => notify());
};

/** The choice in effect right now, independent of any render. */
export const getTheme = (): ThemeChoice => choice;

/** dark ↔ light. */
export const nextTheme = (current: ThemeChoice): ThemeChoice =>
  current === 'dark' ? 'light' : 'dark';

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
    () => 'dark' as ThemeChoice,
  );
  // Deliberately reads the store rather than the rendered value: a click that
  // lands before React has re-rendered would otherwise advance from a stale
  // theme and appear to do nothing.
  const cycle = useCallback(() => setTheme(nextTheme(getTheme())), []);
  return { theme, setTheme, cycle };
};

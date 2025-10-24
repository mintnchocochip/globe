export const THEME_STORAGE_KEY = 'globe:theme';

export function getStoredTheme() {
  if (typeof window === 'undefined') return false;

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark') {
    return true;
  }
  if (stored === 'light') {
    return false;
  }

  const mediaPreference =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

  return mediaPreference ? mediaPreference.matches : false;
}

export function persistTheme(isDark) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
}

export function applyTheme(isDark) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.toggle('dark', Boolean(isDark));
  root.style.colorScheme = Boolean(isDark) ? 'dark' : 'light';
}

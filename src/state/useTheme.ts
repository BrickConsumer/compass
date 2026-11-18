import { useLayoutEffect, useSyncExternalStore } from 'react';
import { PAGE_COLOUR, resolveTheme } from '../domain/theme';
import { useCompass } from './store';

const DEVICE_DARK = '(prefers-color-scheme: dark)';
const subscribe = (changed: () => void) => { const q = matchMedia(DEVICE_DARK); q.addEventListener('change', changed); return () => q.removeEventListener('change', changed); };

/** The look in use: the one chosen in Settings, or the device's while it is left to the device. It follows the device live. */
export function useTheme(): 'light' | 'dark' {
  const setting = useCompass((s) => s.settings.theme);
  const deviceDark = useSyncExternalStore(subscribe, () => matchMedia(DEVICE_DARK).matches, () => false);
  return resolveTheme(setting, deviceDark);
}

/** Put a theme on the page. The light theme is the page as it is, so it sets nothing. */
export function applyTheme(theme: 'light' | 'dark'): void {
  const root = document.documentElement;
  if (theme === 'dark') root.dataset.theme = 'dark'; else delete root.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PAGE_COLOUR[theme]);
}

/** Keep the page in the theme in use. Called once, at the root. `index.html` sets it first, before the app loads, so there is no flash. */
export function useThemeOnPage(): void {
  const theme = useTheme();
  useLayoutEffect(() => { applyTheme(theme); }, [theme]);
}

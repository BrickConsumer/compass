import type { Theme } from './types';

/** The three choices, in the order Settings offers them. */
export const THEMES: { id: Theme; label: string }[] = [{ id: 'auto', label: 'Automatic' }, { id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }];

/** A saved value is only a theme if it is one of the three. Anything else, a save from before themes included, is automatic. */
export const storedTheme = (value: unknown): Theme => (value === 'light' || value === 'dark' ? value : 'auto');

/** The look to show: the one chosen, or the device's when it is left to the device. */
export const resolveTheme = (setting: Theme | undefined, deviceDark: boolean): 'light' | 'dark' =>
  setting === 'dark' || (setting !== 'light' && deviceDark) ? 'dark' : 'light';

/** The page's own colour in each theme, for the browser's bar. The same values as `surface-deck` in tokens.css. */
export const PAGE_COLOUR = { light: '#F6F0E4', dark: '#0A1626' } as const;

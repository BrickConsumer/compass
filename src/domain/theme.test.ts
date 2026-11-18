import { describe, expect, it } from 'vitest';
import { PAGE_COLOUR, resolveTheme, storedTheme, THEMES } from './theme';

describe('the theme', () => {
  it('is automatic, light or dark, in that order', () => {
    expect(THEMES.map((t) => t.id)).toEqual(['auto', 'light', 'dark']);
    expect(THEMES.map((t) => t.label)).toEqual(['Automatic', 'Light', 'Dark']);
  });

  it('left to the device, follows the device', () => {
    expect(resolveTheme('auto', true)).toBe('dark');
    expect(resolveTheme('auto', false)).toBe('light');
  });

  it('once chosen, wins over the device either way', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('a save from before themes existed is automatic', () => {
    expect(resolveTheme(undefined, true)).toBe('dark');
    expect(resolveTheme(undefined, false)).toBe('light');
  });

  it('a saved value is only a theme if it is one of the three', () => {
    expect(storedTheme('dark')).toBe('dark');
    expect(storedTheme('light')).toBe('light');
    expect(storedTheme('auto')).toBe('auto');
    for (const odd of [undefined, null, '', 'night', 'DARK', 3, {}, true]) expect(storedTheme(odd)).toBe('auto');
  });

  it("gives the browser's bar the colour of the page", () => {
    expect(PAGE_COLOUR).toEqual({ light: '#F6F0E4', dark: '#0A1626' });
  });
});

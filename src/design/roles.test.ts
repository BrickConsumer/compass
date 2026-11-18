import { describe, expect, it } from 'vitest';
import { PAGE_COLOUR } from '../domain/theme';
import { SUBJECT_COLOURS, SUBJECT_PAINT, type SubjectColour } from '../domain/types';
// @ts-expect-error Node's own types are not installed. This is the one test that reads a file that is not code: the test runner hands over a style sheet as an empty string.
import { readFileSync } from 'node:fs';

const tokens: string = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

/** Every component's source, as text, by its path under `src/`. */
const SOURCES = import.meta.glob<string>('../**/*.tsx', { query: '?raw', import: 'default', eager: true });

/** A colour step by name: `paper-300`, `brass-700`, `var(--color-deep-900)`. */
const STEP = /(?:paper|deep|marine|teal|seafoam|brass|port)-\d{1,3}\b/g;
/** A literal colour written into a class: `bg-[#9CC4CC]`, `rgb(14_36_58/0.18)`. */
const LITERAL = /\[#[0-9A-Fa-f]{3,8}\]|rgba?\([0-9_ ,./%]+\)/g;

/**
 * Colours the user chooses for their boat, and the 3D scene and still image that paint with them, are data and not the
 * interface's own colours. The look-review page lists the same choices.
 */
const PAINTS = ['features/voyage/scene/', 'features/voyage/poster/', 'features/lookdev/'];

describe('colour roles', () => {
  const components = Object.entries(SOURCES).map(([path, text]) => ({ name: path.replace(/^\.\.\//, ''), text })).filter((f) => !PAINTS.some((p) => f.name.startsWith(p)));

  it('finds the components', () => {
    expect(components.length).toBeGreaterThan(25);
    expect(components.some((f) => f.name === 'features/home/TaskRow.tsx')).toBe(true);
  });

  it('no component names a colour step: each colour is a role, so both themes can give it a value', () => {
    const found = components.flatMap((f) => (f.text.match(STEP) ?? []).map((m) => `${f.name}: ${m}`));
    expect(found).toEqual([]);
  });

  it('no component writes a literal colour into a class', () => {
    const found = components.flatMap((f) => (f.text.match(LITERAL) ?? []).map((m) => `${f.name}: ${m}`));
    expect(found).toEqual([]);
  });
});

describe('the two themes', () => {
  // the dark theme is one block that gives the roles new values
  const start = tokens.indexOf(":root[data-theme='dark']"), dark = start < 0 ? '' : tokens.slice(start, tokens.indexOf('\n}', start)), light = start < 0 ? tokens : tokens.slice(0, start);
  const value = (css: string, name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim();

  it('the dark theme is declared, and tells the browser it is dark', () => {
    expect(start).toBeGreaterThan(0);
    expect(dark).toContain('color-scheme: dark');
  });

  it('every role a component can name has a dark value of its own', () => {
    const roles = [...light.matchAll(/(--color-(?:surface|text|line|focus|positive|attention|highlight|track|control|inverse|on|note|rating|faint|strike|backdrop|sea)[a-z-]*):/g)].map((m) => m[1]!);
    expect(roles.length).toBeGreaterThan(30);
    expect(roles.filter((r) => value(dark, r) === undefined)).toEqual([]);
  });

  it('the dark theme changes no colour step, only roles', () => {
    expect(dark.match(/--color-(?:paper|deep|marine|teal|seafoam|brass|port)-\d+\s*:/g) ?? []).toEqual([]);
  });

  it("the page's colour is the one the browser's bar is given", () => {
    expect(value(light, '--color-paper-50')?.toUpperCase()).toBe(PAGE_COLOUR.light);
    expect(value(dark, '--color-surface-deck')?.toUpperCase()).toBe(PAGE_COLOUR.dark);
  });

  it('subject colours are the same in the token file as in the code, in both themes', () => {
    for (const c of Object.keys(SUBJECT_PAINT.light) as SubjectColour[]) {
      for (const part of ['dot', 'tint', 'text'] as const) {
        expect(value(light, `--subject-${c}-${part}`)?.toUpperCase(), `${c} ${part}, light`).toBe(SUBJECT_PAINT.light[c][part]);
        expect(value(dark, `--subject-${c}-${part}`)?.toUpperCase(), `${c} ${part}, dark`).toBe(SUBJECT_PAINT.dark[c][part]);
        expect(SUBJECT_COLOURS[c][part]).toBe(`var(--subject-${c}-${part})`);
      }
    }
  });
});

describe('contrast in the dark theme (WCAG 2.2)', () => {
  const start = tokens.indexOf(":root[data-theme='dark']"), dark = tokens.slice(start, tokens.indexOf('\n}', start));
  const hex = (name: string) => { const v = new RegExp(`--color-${name}:\\s*(#[0-9A-Fa-f]{6});`).exec(dark)?.[1]; if (!v) throw new Error(`${name} has no plain colour in the dark theme`); return v; };
  const lum = (h: string) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))) as [number, number, number]; return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const SURFACES = ['surface-deck', 'surface-sheet', 'surface-well'];

  it('text is at least 4.5 to 1 on every surface it sits on', () => {
    const pairs: [string, string[]][] = [
      ['text', SURFACES], ['text-muted', SURFACES], ['text-subtle', ['surface-sheet', 'surface-well']], ['text-link', SURFACES],
      ['attention', ['surface-sheet', 'surface-well', 'attention-tint']], ['attention-strong', ['surface-sheet']], ['highlight-text', ['surface-deck', 'surface-sheet']],
      ['text-inverse', ['surface-inverse', 'surface-inverse-hover']], ['text-inverse-muted', ['surface-inverse']], ['inverse-highlight', ['surface-inverse']],
      ['on-positive', ['positive']], ['on-attention', ['attention']], ['on-note', ['note']],
    ];
    const short = pairs.flatMap(([ink, grounds]) => grounds.map((g) => ({ pair: `${ink} on ${g}`, ratio: ratio(hex(ink), hex(g)) }))).filter((x) => x.ratio < 4.5);
    expect(short).toEqual([]);
  });

  it('a filled control, a box outline and a mark are at least 3 to 1 against what is behind them', () => {
    const pairs: [string, string[]][] = [
      ['surface-inverse', ['surface-deck', 'surface-sheet']], ['positive', ['surface-deck', 'surface-sheet']], ['control', ['surface-deck', 'surface-sheet']],
      ['focus', SURFACES], ['focus-inverse', ['surface-inverse']], ['rating', ['surface-sheet']], ['inverse-positive', ['surface-inverse']], ['highlight', ['surface-deck', 'surface-sheet']],
    ];
    const short = pairs.flatMap(([mark, grounds]) => grounds.map((g) => ({ pair: `${mark} against ${g}`, ratio: ratio(hex(mark), hex(g)) }))).filter((x) => x.ratio < 3);
    expect(short).toEqual([]);
  });

  it('every subject keeps a dot that reads against navy, and a session mark that reads on its tint', () => {
    for (const c of Object.keys(SUBJECT_PAINT.dark) as SubjectColour[]) {
      const { dot, tint, text } = SUBJECT_PAINT.dark[c];
      for (const g of SURFACES) expect(ratio(dot, hex(g)), `${c} dot on ${g}`).toBeGreaterThanOrEqual(3);
      expect(ratio(text, tint), `${c} mark on its tint`).toBeGreaterThanOrEqual(3);
    }
  });
});


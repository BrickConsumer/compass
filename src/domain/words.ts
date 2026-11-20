/**
 * Words as Compass keeps them where it promises to keep them as typed: the spaces at either end go, a run of spaces
 * or a line break becomes one space, and they are cut at their limit. Nothing else changes, so
 * "Squat, 3 × 5 at 60 kg" stays what was typed. Nothing is read out of the words, so nothing can be judged by them.
 */
export const cleanWords = (text: string, limit: number): string => text.trim().replace(/\s+/g, ' ').slice(0, limit).trim();

/** A record from a save, before anything in it is trusted. */
export type Loose = Record<string, unknown>;
/** What in a saved list is at least an object. A save can be edited by hand, and one entry that is not a record must not stop the app opening. */
export const objects = (value: unknown): Loose[] => (Array.isArray(value) ? value.filter((x): x is Loose => !!x && typeof x === 'object' && !Array.isArray(x)) : []);
/** A saved value if it is words, and nothing if it is anything else. */
export const words = (value: unknown): string => (typeof value === 'string' ? value : '');
/** A saved value if it is a time that can be read, such as when a task was done, and nothing if it is anything else. */
export const time = (value: unknown): string => (typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : '');
/** The first of each id, so nothing can be found twice. */
export function once<T extends { id: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((x) => (seen.has(x.id) ? false : !!seen.add(x.id)));
}

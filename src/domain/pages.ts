import { dayMonth, longDate, shortDay } from './dates';
import type { Progress } from './tasks';
import type { ISODate, Page, PageItem, PageKind, Subject } from './types';

export const PAGE_LIMITS = { title: 80, item: 140, items: 200, text: 20_000 };

/** What a kind of page starts with and what its parts are called. Every page has the same parts; the kind sets nothing else. */
export interface KindInfo { id: PageKind; label: string; hint: string; list: string; add: string; text: string; listFirst: boolean; dated: boolean }
export const PAGE_KINDS: KindInfo[] = [
  { id: 'note', label: 'Note', hint: 'Mostly writing', list: 'List', add: 'Add an item', text: 'Writing', listFirst: false, dated: false },
  { id: 'checklist', label: 'Checklist', hint: 'A list to tick, and to use again', list: 'Items', add: 'Add an item', text: 'Notes', listFirst: true, dated: false },
  { id: 'goal', label: 'Goal', hint: 'Steps, a reason and a date to aim for', list: 'Steps', add: 'Add a step', text: 'Why', listFirst: true, dated: true },
  { id: 'reading', label: 'Reading', hint: 'What to read, and notes on it', list: 'To read', add: 'Add something to read', text: 'Notes', listFirst: true, dated: false },
  { id: 'project', label: 'Project', hint: 'A list, notes and a date', list: 'To do', add: 'Add something to do', text: 'Notes', listFirst: true, dated: true },
];
export const kindOf = (kind: PageKind): KindInfo => PAGE_KINDS.find((k) => k.id === kind) ?? PAGE_KINDS[0]!;

const oneLine = (s: string) => s.trim().replace(/\s+/g, ' ');
export const cleanPageTitle = (title: string): string => oneLine(title).slice(0, PAGE_LIMITS.title);
const cleanItem = (text: string): string => oneLine(text).slice(0, PAGE_LIMITS.item);

export const newPage = (kind: PageKind, id: string, now: string): Page => ({ id, title: 'Untitled', kind, items: [], text: '', createdAt: now, updatedAt: now });

/** The date a page aims for. Only goals and projects show one. */
export const aimOf = (page: Page): ISODate | undefined => (kindOf(page.kind).dated ? page.aimFor : undefined);
/** Only a goal can be reached. */
export const isReached = (page: Page): boolean => page.kind === 'goal' && !!page.reachedOn;

export const listCount = (page: Page): Progress => ({ done: page.items.filter((i) => i.done).length, total: page.items.length });

/** Add an item at the end. An empty one, or one more than the list can hold, changes nothing. */
export function addItem(page: Page, text: string, id: string): Page {
  const clean = cleanItem(text);
  return !clean || page.items.length >= PAGE_LIMITS.items ? page : { ...page, items: [...page.items, { id, text: clean, done: false }] };
}

/** Tick or untick an item. It stays where it is: the order of a list is part of its meaning. */
export const toggleItem = (page: Page, id: string): Page => ({ ...page, items: page.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) });

export const editItem = (page: Page, id: string, text: string): Page => ({ ...page, items: page.items.map((i) => (i.id === id ? { ...i, text: cleanItem(text) || i.text } : i)) });

export function moveItem(page: Page, id: string, direction: -1 | 1): Page {
  const from = page.items.findIndex((i) => i.id === id), to = from + direction;
  if (from < 0 || to < 0 || to >= page.items.length) return page;
  const items = [...page.items];
  [items[from], items[to]] = [items[to]!, items[from]!];
  return { ...page, items };
}

/** Take an item out, and say where it was, so Undo can put it back. */
export function removeItem(page: Page, id: string): { page: Page; item: PageItem; index: number } | null {
  const index = page.items.findIndex((i) => i.id === id), item = page.items[index];
  return item ? { page: { ...page, items: page.items.filter((i) => i.id !== id) }, item, index } : null;
}
export const insertItem = (page: Page, item: PageItem, index: number): Page => ({ ...page, items: [...page.items.slice(0, index).filter((i) => i.id !== item.id), item, ...page.items.slice(index).filter((i) => i.id !== item.id)] });

/** Untick every item, so a list can be used again. Returns what was ticked, for Undo. */
export function untickAll(page: Page): { page: Page; ticked: string[] } {
  return { page: { ...page, items: page.items.map((i) => (i.done ? { ...i, done: false } : i)) }, ticked: page.items.filter((i) => i.done).map((i) => i.id) };
}

const excerpt = (text: string): string => { const t = oneLine(text); return t.length > 90 ? `${t.slice(0, 87).trimEnd()}...` : t; };
const capital = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

/** One line about a page, for the list: its count, the date it aims for, or its first words. */
export function pageLine(page: Page): string {
  if (isReached(page)) return `Reached ${shortDay(page.reachedOn!)}`;
  const c = listCount(page), aim = aimOf(page);
  const count = c.total ? `${c.done} of ${c.total}${page.kind === 'goal' ? (c.total === 1 ? ' step' : ' steps') : ''}` : '';
  const facts = capital([count, aim ? `aim for ${dayMonth(aim)}` : ''].filter(Boolean).join(', ')), words = excerpt(page.text);
  return page.kind === 'note' ? words || facts || 'Nothing written yet' : facts || words || 'Nothing here yet';
}

/** Open pages, most recently changed first, then reached goals, most recently reached first. */
export function sortPages(pages: Page[]): { open: Page[]; reached: Page[] } {
  return {
    open: pages.filter((p) => !isReached(p)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title)),
    reached: pages.filter(isReached).sort((a, b) => b.reachedOn!.localeCompare(a.reachedOn!) || a.title.localeCompare(b.title)),
  };
}

/** Pages whose title holds the words typed. Nothing typed finds nothing. */
export function searchPages(pages: Page[], query: string): Page[] {
  const q = query.trim().toLowerCase();
  return q ? pages.filter((p) => p.title.toLowerCase().includes(q)) : [];
}

/** Every page as plain text, to keep a copy outside the browser. */
export function pagesAsText(pages: Page[], subjects: Subject[], today: ISODate): string {
  const { open, reached } = sortPages(pages);
  const one = (p: Page) => {
    const k = kindOf(p.kind), subject = subjects.find((s) => s.id === p.subjectId), aim = aimOf(p);
    const facts = [k.label, subject?.name, aim && `Aim for ${longDate(aim)}`, isReached(p) && `Reached on ${longDate(p.reachedOn!)}`].filter(Boolean).map((x) => `${x}.`).join(' ');
    const list = p.items.length ? [`${k.list}\n${p.items.map((i) => `[${i.done ? 'x' : ' '}] ${i.text}`).join('\n')}`] : [];
    const text = p.text.trim() ? [p.kind === 'note' ? p.text.trim() : `${k.text}\n${p.text.trim()}`] : [];
    return [`${p.title}\n${'='.repeat(p.title.length)}\n${facts}`, ...(k.listFirst ? [...list, ...text] : [...text, ...list])].join('\n\n');
  };
  return [`My pages, from Compass. ${longDate(today)}.`, ...[...open, ...reached].map(one)].join('\n\n\n') + '\n';
}

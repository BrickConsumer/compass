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

/** A new page. One started from a subject already has its subject, and may have its title. */
export const newPage = (kind: PageKind, id: string, now: string, start: { title?: string; subjectId?: string } = {}): Page => ({
  id, title: cleanPageTitle(start.title ?? '') || 'Untitled', kind, items: [], text: '', ...(start.subjectId ? { subjectId: start.subjectId } : {}), createdAt: now, updatedAt: now,
});

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

/** A subject's own pages, in the order My pages lists them: open ones, most recently changed first, then reached goals. */
export function subjectPages(pages: Page[], subjectId: string): Page[] {
  const { open, reached } = sortPages(pages.filter((p) => p.subjectId === subjectId));
  return [...open, ...reached];
}

/** A page's line on its subject's page: its kind, then what My pages says about it. A list's count is left out, because the row shows it beside the line. */
export function subjectPageLine(page: Page): string {
  const kind = kindOf(page.kind).label;
  if (!page.items.length || isReached(page)) return `${kind}. ${pageLine(page)}`;
  const aim = aimOf(page), rest = aim ? `Aim for ${dayMonth(aim)}` : excerpt(page.text);
  return rest ? `${kind}. ${rest}` : kind;
}

/** A page a subject can start in one press: a kind and, for all but a plain note, a title. */
export interface Starter { id: string; label: string; kind: PageKind; title?: string }
export const STARTERS: Starter[] = [
  { id: 'revision', label: 'Revision checklist', kind: 'checklist', title: 'Revision checklist' },
  { id: 'weak', label: 'Weak areas', kind: 'checklist', title: 'Weak areas' },
  { id: 'formula', label: 'Formula sheet', kind: 'note', title: 'Formula sheet' },
  { id: 'note', label: 'Note', kind: 'note' },
];
/** The starters a subject has not used. One is left out once the subject has a page with its title; a plain note always stays. */
export function startersFor(pages: Page[], subjectId: string): Starter[] {
  const titles = new Set(pages.filter((p) => p.subjectId === subjectId).map((p) => p.title.trim().toLowerCase()));
  return STARTERS.filter((s) => !s.title || !titles.has(s.title.toLowerCase()));
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

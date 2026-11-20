import { dayMonth, isISODate, shortDay } from './dates';
import { formOf } from './interests';
import { kindOf } from './pages';
import type { CompassData } from './seed';

/** The kinds a search can be narrowed to, in the order results are listed. */
export type FoundKind = 'task' | 'study' | 'page' | 'headline' | 'habit' | 'review' | 'fitness' | 'link';
export const FOUND_KINDS: { id: FoundKind; label: string }[] = [
  { id: 'task', label: 'Tasks' }, { id: 'study', label: 'Study' }, { id: 'page', label: 'Pages' }, { id: 'headline', label: 'Headlines' },
  { id: 'habit', label: 'Habits' }, { id: 'review', label: 'Reviews' }, { id: 'fitness', label: 'Fitness' }, { id: 'link', label: 'Links' },
];

/** Search starts at `min` characters. Everything together shows `all` results, one kind shows `kind`. */
export const SEARCH_LIMITS = { min: 2, all: 20, kind: 50, excerpt: 80, query: 100 } as const;

/** Where a result goes: a place in Compass, with anything that place needs to open the thing, or another site. */
export type Opens = { path: string; state?: Record<string, string> } | { url: string };

/** One thing found. `rank` is 0 when its name starts with what was typed, 1 when its name holds every word, 2 when the words are in its writing. */
export interface Found {
  key: string;
  kind: FoundKind;
  /** What it is, in a word or two: "Task", "Company", "Weekly review". */
  type: string;
  title: string;
  /** Where it is kept: a subject, a day, an interest. May be empty. */
  where: string;
  /** The words found, in their sentence, when they are in its writing and not its name. */
  excerpt?: string;
  rank: 0 | 1 | 2;
  to: Opens;
}

/** Lower case, with accents taken off, so "cafe" finds "Café". */
const fold = (text: string): string => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const list = <T>(value: T[] | undefined): T[] => (Array.isArray(value) ? value : []);
/** A day in words, or nothing when it is not a day: a save can hold a date that is not one. */
const day = (date: unknown): string => (typeof date === 'string' && isISODate(date) ? shortDay(date) : '');
const short = (date: unknown): string => (typeof date === 'string' && isISODate(date) ? dayMonth(date) : '');
const sentence = (parts: (string | false | undefined)[]): string => { const s = parts.filter(Boolean).join(', '); return s ? s[0]!.toUpperCase() + s.slice(1) : ''; };
const site = (url: string): string => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };

/** Text folded as a search folds it, with where in the text each folded letter came from: folding can change how long it is. */
function foldedWithPlaces(text: string): { folded: string; from: number[] } {
  let folded = '';
  const from: number[] = [];
  for (let i = 0; i < text.length; i++) for (const letter of fold(text[i]!)) { folded += letter; from.push(i); }
  return { folded, from };
}

/** The words found, in their sentence: one line, cut to a length, with a mark where it was cut. */
function excerptOf(text: string, words: string[]): string {
  const flat = text.replace(/\s+/g, ' ').trim(), { folded, from } = foldedWithPlaces(flat);
  // found as the search found them, accents and all, then placed in the text as it was written
  const found = words.map((w) => folded.indexOf(w)).find((i) => i >= 0), at = found === undefined ? 0 : from[found]!;
  let start = Math.max(0, at - 24);
  // begin at a whole word
  if (start > 0) { const space = flat.indexOf(' ', start); if (space >= 0 && space < at) start = space + 1; }
  let end = Math.min(flat.length, start + SEARCH_LIMITS.excerpt);
  if (end < flat.length) { const space = flat.lastIndexOf(' ', end); if (space > at) end = space; }
  return `${start > 0 ? '…' : ''}${flat.slice(start, end).trim()}${end < flat.length ? '…' : ''}`;
}

interface Candidate {
  key: string; kind: FoundKind; type: string; title: string; where: string; to: Opens;
  /** What is written in it, beyond its name. Words found here are shown in their sentence. */
  body: string[];
  /** What it belongs to: a task's subject, a page's interest. A word found here counts, and is not shown again, since the result says where it is kept. */
  also?: string[];
  /** A date or a time to put the newest first, where it has one. */
  recent: string;
}

/** Everything Compass keeps that can be found, in the order the kinds are listed. Fitness only while it is switched on. */
function candidates(d: CompassData): Candidate[] {
  const subject = (id: string | undefined) => list(d.subjects).find((s) => s.id === id), interest = (id: string | undefined) => list(d.interests).find((i) => i.id === id);
  const out: Candidate[] = [];
  for (const t of list(d.tasks)) {
    const when = t.scope === 'week' ? (short(t.date) ? `week of ${short(t.date)}` : '') : day(t.date);
    out.push({ key: `task:${t.id}`, kind: 'task', type: 'Task', title: str(t.title), where: sentence([subject(t.subjectId)?.name, when, !!t.completedAt && 'done']), to: { path: isISODate(t.date) ? `/?date=${t.date}` : '/', state: { task: t.id } }, body: [str(t.notes)], also: [str(subject(t.subjectId)?.name)], recent: str(t.date) });
  }
  for (const s of list(d.subjects)) out.push({ key: `subject:${s.id}`, kind: 'study', type: 'Subject', title: str(s.name), where: 'Study', to: { path: `/study/${s.id}` }, body: [str(s.topic), str(s.notes)], recent: '' });
  for (const a of list(d.assessments)) {
    const of = subject(a.subjectId), type = str(a.kind) || 'assessment';
    out.push({ key: `assessment:${a.id}`, kind: 'study', type: type[0]!.toUpperCase() + type.slice(1), title: str(a.title), where: sentence([of?.name, day(a.date)]), to: { path: of ? `/study/${of.id}` : '/study' }, body: [], also: [str(of?.name)], recent: str(a.date) });
  }
  for (const f of list(d.feedback)) {
    const of = subject(f.subjectId);
    out.push({ key: `feedback:${f.id}`, kind: 'study', type: 'Feedback', title: str(f.about) || 'Feedback', where: sentence([of?.name, day(f.date)]), to: { path: of ? `/study/${of.id}` : '/study' }, body: [str(f.words), str(f.work)], also: [str(of?.name)], recent: str(f.date) });
  }
  for (const s of list(d.sessions)) {
    const of = subject(s.subjectId);
    out.push({ key: `session:${s.id}`, kind: 'study', type: 'Study session', title: str(s.name), where: of?.name ?? 'Study', to: { path: of ? `/study/${of.id}` : '/study' }, body: [], recent: '' });
  }
  for (const p of list(d.pages)) {
    const parts = list(p.fields), type = (parts.length ? formOf(p.form)?.label : undefined) ?? kindOf(p.kind).label;
    out.push({ key: `page:${p.id}`, kind: 'page', type, title: str(p.title), where: interest(p.interestId)?.name ?? subject(p.subjectId)?.name ?? 'My pages', to: { path: `/pages/${p.id}` }, body: [...parts.map((f) => str(f.text)), str(p.text), ...list(p.items).map((i) => str(i.text))], also: [str(interest(p.interestId)?.name), str(subject(p.subjectId)?.name)], recent: str(p.updatedAt) });
  }
  for (const i of list(d.interests)) out.push({ key: `interest:${i.id}`, kind: 'page', type: 'Interest', title: str(i.name), where: 'My pages', to: { path: '/pages', state: { interest: i.id } }, body: [], recent: '' });
  for (const h of list(d.headlines)) out.push({ key: `headline:${h.id}`, kind: 'headline', type: 'Headline', title: str(h.title), where: sentence([h.source, short(h.date)]), to: { url: h.url }, body: [str(h.source), str(h.tag)], recent: str(h.date) });
  for (const h of list(d.habits)) out.push({ key: `habit:${h.id}`, kind: 'habit', type: 'Habit', title: str(h.name), where: 'Habits', to: { path: '/habits' }, body: [], recent: '' });
  // a review is found once it has been saved; one still being written is on its own page
  for (const r of list(d.reviews).filter((x) => x.savedAt)) out.push({ key: `review:${r.weekStart}`, kind: 'review', type: 'Weekly review', title: `Week of ${short(r.weekStart)}`, where: '', to: { path: '/review', state: { week: r.weekStart } }, body: [str(r.wentWell), str(r.gotInWay), str(r.change)], recent: str(r.weekStart) });
  if (d.settings?.fitness === true) {
    for (const r of list(d.routines)) out.push({ key: `routine:${r.id}`, kind: 'fitness', type: 'Routine', title: str(r.name), where: 'Fitness', to: { path: '/fitness' }, body: list(r.lines).map((l) => str(l.text)), recent: '' });
    for (const w of list(d.workouts)) out.push({ key: `workout:${w.id}`, kind: 'fitness', type: 'Session', title: str(w.name), where: day(w.date), to: { path: `/fitness/${w.id}` }, body: [str(w.note), ...list(w.lines).map((l) => str(l.text))], recent: str(w.date) });
    for (const b of list(d.bests)) out.push({ key: `best:${b.id}`, kind: 'fitness', type: 'Best', title: str(b.name), where: str(b.value), to: { path: '/fitness' }, body: [], also: [str(b.value)], recent: '' });
    for (const m of list(d.measures)) out.push({ key: `measure:${m.id}`, kind: 'fitness', type: 'Measure', title: str(m.name), where: [str(m.value), str(m.unit)].filter(Boolean).join(' '), to: { path: '/fitness' }, body: [], also: [str(m.value), str(m.unit)], recent: '' });
  }
  for (const l of list(d.links)) out.push({ key: `link:${l.id}`, kind: 'link', type: 'Link', title: str(l.name), where: site(l.url), to: { url: l.url }, body: [], recent: '' });
  for (const s of list(d.subjects)) for (const l of list(s.links)) out.push({ key: `link:${s.id}:${l.id}`, kind: 'link', type: 'Link', title: str(l.name), where: str(s.name), to: { url: l.url }, body: [], recent: '' });
  return out;
}

/**
 * Everything that holds every word typed, in any order and any case, with or without accents. Names that start with
 * what was typed come first, then names that hold every word, then things found by what is written in them. Within
 * each, the kinds are in their listed order, and the newest comes first where a thing has a date.
 * Fewer than two characters find nothing, since one letter is in nearly everything.
 */
export function searchAll(data: CompassData, query: string): Found[] {
  const q = fold(query).trim().replace(/\s+/g, ' ').slice(0, SEARCH_LIMITS.query);
  if (q.length < SEARCH_LIMITS.min) return [];
  const words = q.split(' ');
  const found: { f: Found; seq: number; recent: string }[] = [];
  candidates(data).forEach((c, seq) => {
    const title = fold(c.title), bodies = c.body.filter(Boolean), written = bodies.map(fold), belongs = (c.also ?? []).map(fold);
    if (!words.every((w) => title.includes(w) || written.some((b) => b.includes(w)) || belongs.some((b) => b.includes(w)))) return;
    const rank = title.startsWith(q) ? 0 : words.every((w) => title.includes(w)) ? 1 : 2;
    // the words in their sentence: from the first piece of writing that holds a word the name does not
    const missing = words.filter((w) => !title.includes(w)), from = rank === 2 ? written.findIndex((b) => missing.some((w) => b.includes(w))) : -1;
    const { body: _body, also: _also, recent, ...rest } = c;
    found.push({ f: { ...rest, rank, ...(from >= 0 ? { excerpt: excerptOf(bodies[from]!, missing) } : {}) }, seq, recent });
  });
  // the order they were gathered in is the order of the kinds, so it settles what the rank and the date do not
  const typeOf = (key: string) => key.slice(0, key.indexOf(':')), firstOf = new Map<string, number>();
  for (const x of found) if (!firstOf.has(typeOf(x.f.key))) firstOf.set(typeOf(x.f.key), x.seq);
  return found
    .sort((a, b) => a.f.rank - b.f.rank || firstOf.get(typeOf(a.f.key))! - firstOf.get(typeOf(b.f.key))! || b.recent.localeCompare(a.recent) || a.seq - b.seq)
    .map((x) => x.f);
}

/** The kinds that have results, each with its count, in their listed order. */
export const countByKind = (found: Found[]): { id: FoundKind; label: string; count: number }[] =>
  FOUND_KINDS.map((k) => ({ ...k, count: found.filter((f) => f.kind === k.id).length })).filter((k) => k.count > 0);

/** What to show: the first 20 of everything, or the first 50 of one kind, and how many are left out. */
export function shownResults(found: Found[], kind: FoundKind | null): { shown: Found[]; more: number } {
  const of = kind ? found.filter((f) => f.kind === kind) : found, shown = of.slice(0, kind ? SEARCH_LIMITS.kind : SEARCH_LIMITS.all);
  return { shown, more: of.length - shown.length };
}

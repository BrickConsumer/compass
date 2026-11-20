import { isISODate } from './dates';
import { cleanUrl } from './links';
import { sortPages } from './pages';
import type { FormSet, Headline, Interest, ISODate, Page, PageField, PageKind } from './types';
import { cleanWords, objects, once, words } from './words';

export const INTEREST_LIMITS = { max: 8, name: 30, label: 60, field: 2000, headlines: 60, headline: 140, source: 40, tag: 8 } as const;
const L = INTEREST_LIMITS;

/** Where an interest can start from. The first two come with forms; the third is the student's own, with nothing ready-made. */
export const FORM_SETS: { id: FormSet; label: string; hint: string }[] = [
  { id: 'investing', label: 'Investing', hint: 'Companies, a journal and a learning route' },
  { id: 'law', label: 'Law', hint: 'Cases, current affairs and where it could lead' },
  { id: 'none', label: 'Something else', hint: 'Your own pages, with nothing ready-made' },
];

/**
 * A page that an interest can start in one press. One with `fields` is a form: it opens with those headed parts
 * ready to fill in, and there can be many of it. One with a `title` is a single page of that name, offered until
 * the interest has it. A form's parts are words: nothing is a number, a rating or a choice, so nothing is graded.
 */
export interface PageForm { id: string; label: string; hint: string; kind: PageKind; title?: string; fields?: string[]; items?: string[] }

export const FORMS: Record<FormSet, PageForm[]> = {
  investing: [
    { id: 'company', label: 'Company', hint: 'Research on one company', kind: 'note', fields: ['Ticker and industry', 'Business model', 'Revenue and profit, with the period and the source', 'Competitive advantage', 'Risks', 'Valuation', 'Would I buy, and why', 'Confidence, out of 10'] },
    { id: 'trade', label: 'Journal entry', hint: 'One decision, and what it taught', kind: 'note', fields: ['Date', 'Ticker', 'Buy or sell', 'Reason', 'Risk', 'Outcome', 'Lesson learned'] },
    // a reading order, not advice: it ends with looking back before any real money is involved
    { id: 'route', label: 'Learning route', hint: 'Five steps, in order', kind: 'checklist', title: 'Learning route', items: ['Market basics, order types, diversification and risk', 'Reading financial statements and business models', 'Valuation, and comparing companies on a watchlist', 'A paper-trading journal, to test the reasoning', 'Reviewing decisions and lessons before any real money'] },
    { id: 'watchlist', label: 'Watchlist', hint: 'Companies to keep an eye on', kind: 'checklist', title: 'Watchlist' },
    { id: 'invest-books', label: 'Books', hint: 'What to read, and notes on it', kind: 'reading', title: 'Books' },
  ],
  law: [
    { id: 'case', label: 'Case', hint: 'One case, in five parts', kind: 'note', fields: ['Court', 'Facts', 'Decision', 'Why it matters', 'My thoughts'] },
    { id: 'affairs', label: 'Current affairs', hint: 'Something in the news, and what you make of it', kind: 'note', fields: ['What happened', 'Why it matters', 'My thoughts'] },
    { id: 'law-books', label: 'Books', hint: 'What to read, and notes on it', kind: 'reading', title: 'Books' },
    { id: 'places', label: 'Universities and scholarships', hint: 'Places to look into', kind: 'checklist', title: 'Universities and scholarships' },
    { id: 'careers', label: 'Career ideas', hint: 'Where it could lead', kind: 'note', title: 'Career ideas' },
  ],
  none: [],
};

/** What every interest can start, whatever it started from. */
export const PLAIN: PageForm[] = [
  { id: 'note', label: 'Note', hint: 'Mostly writing', kind: 'note' },
  { id: 'checklist', label: 'Checklist', hint: 'A list to tick', kind: 'checklist' },
  { id: 'reading', label: 'Reading', hint: 'What to read, and notes on it', kind: 'reading' },
];

export const formOf = (id: string | undefined): PageForm | undefined => (id ? [...FORMS.investing, ...FORMS.law, ...PLAIN].find((f) => f.id === id) : undefined);
/** True for a form or a titled starter that came with a starting point, which a page remembers; false for the plain kinds. */
export const isReadyMade = (form: PageForm): boolean => !PLAIN.includes(form);

/** What an interest can start: what its starting point came with, a titled one left out once the interest has that page, then the plain kinds. */
export function startersIn(interest: Interest, pages: Page[]): PageForm[] {
  const titles = new Set(pages.filter((p) => p.interestId === interest.id).map((p) => p.title.trim().toLowerCase()));
  return [...FORMS[interest.forms].filter((f) => !f.title || !titles.has(f.title.toLowerCase())), ...PLAIN];
}

/** An interest's pages, in the order My pages lists them: open ones, most recently changed first, then reached goals. */
export function interestPages(pages: Page[], interestId: string): Page[] {
  const { open, reached } = sortPages(pages.filter((p) => p.interestId === interestId));
  return [...open, ...reached];
}

/** An interest's name: what was typed, or the name of where it started from when nothing was. "Something else" needs a name of its own. */
export function interestName(name: string, forms: FormSet): string {
  const typed = cleanWords(name, L.name);
  return typed || (forms === 'none' ? '' : FORM_SETS.find((s) => s.id === forms)!.label);
}

/** Interests from a save: only those with an id and a name. A starting point that is not one of the three is "none". */
export function storedInterests(value: unknown): Interest[] {
  return once(objects(value).flatMap((x): Interest[] => {
    const id = words(x.id), name = cleanWords(words(x.name), L.name), forms = FORM_SETS.some((s) => s.id === x.forms) ? (x.forms as FormSet) : 'none';
    return id && name ? [{ id, name, forms }] : [];
  }));
}

/** A page's parts from a save: only those with an id and a label. A page with none carries no list at all. */
export function storedFields(value: unknown): PageField[] | undefined {
  const fields = once(objects(value).flatMap((x): PageField[] => {
    const id = words(x.id), label = cleanWords(words(x.label), L.label);
    return id && label ? [{ id, label, text: words(x.text).slice(0, L.field) }] : [];
  }));
  return fields.length ? fields : undefined;
}

/** The name of the site a web address is on, as a headline's source shows it. The address must already be a checked one. */
export const siteName = (url: string): string => new URL(url).hostname.replace(/^www\./, '').slice(0, L.source);
/** A headline's source: what was typed, or the name of the site it is on. */
const sourceName = (source: string, url: string): string => cleanWords(source, L.source) || siteName(url);

/**
 * A headline as it is kept, or null when it has no title, no web address or no real date. Only an http or https
 * address is a headline's address, by the same rule as every other link in Compass.
 */
export function cleanHeadline(input: { title: string; url: string; source?: string; date: string; tag?: string }): Omit<Headline, 'id'> | null {
  const title = cleanWords(input.title, L.headline), url = cleanUrl(input.url);
  if (!title || !url || !isISODate(input.date)) return null;
  return { title, url, source: sourceName(input.source ?? '', url), date: input.date as ISODate, tag: cleanWords(input.tag ?? '', L.tag) };
}

/** Headlines from a save, each checked as a new one is: nothing is taken on trust, and nothing that is not a web address is kept. */
export function storedHeadlines(value: unknown): Headline[] {
  return once(objects(value).flatMap((x): Headline[] => {
    const id = words(x.id), clean = cleanHeadline({ title: words(x.title), url: words(x.url), source: words(x.source), date: words(x.date), tag: words(x.tag) });
    return id && clean ? [{ id, ...clean }] : [];
  }));
}

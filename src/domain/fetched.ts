import { addDaysISO, dayMonth, daysBetween, toISO } from './dates';
import { FEED_SOURCES, type FeedItem, type FeedList, type FeedSource, inTime } from './feeds';
import { cleanUrl } from './links';
import type { Headline, ISODate, Page } from './types';

/**
 * Fetched headlines, on the device: which of them name something on the Watchlist, and which Home shows.
 *
 * The list is the same for everyone and holds nothing about anyone. Everything that makes it a student's own is
 * worked out here, from what is kept on the device, and none of it is ever sent.
 */

export const WATCH = {
  /** The most words that are watched for. */
  max: 40,
  min: 2,
  word: 40,
  /** How long a headline that names a watch word comes first. After that it takes its place by its day. */
  days: 7,
} as const;

/** A page is a watchlist when it was started as one, or is called "Watchlist". */
const isWatchlist = (page: Page): boolean => page.form === 'watchlist' || page.title.trim().toLowerCase() === 'watchlist';

/** Whether there is a watchlist page at all, with lines or without. */
export const hasWatchlist = (pages: Page[]): boolean => pages.some(isWatchlist);

/**
 * The words to watch for: the lines of every watchlist page. A line can hold several names with commas between
 * them, such as "Commonwealth Bank, CommBank". Each word is held once, whatever its capitals.
 */
export function watchWords(pages: Page[]): string[] {
  const seen = new Set<string>(), words: string[] = [];
  for (const page of pages) {
    if (!isWatchlist(page)) continue;
    for (const item of page.items) {
      for (const part of item.text.split(',')) {
        const word = part.replace(/\s+/g, ' ').trim(), key = word.toLowerCase();
        if (word.length < WATCH.min || word.length > WATCH.word || seen.has(key)) continue;
        if (words.length >= WATCH.max) return words;
        seen.add(key);
        words.push(word);
      }
    }
  }
  return words;
}

const isWordChar = (ch: string | undefined): boolean => !!ch && /[\p{L}\p{N}]/u.test(ch);
/** A curly apostrophe and a straight one are one character to a reader. */
const plain = (text: string): string => text.replace(/[‘’]/g, "'");
/** Typed all in capitals, as a ticker is. Such a word must appear in capitals: "IT" is not "it". */
const inCapitals = (word: string): boolean => word === word.toUpperCase() && word !== word.toLowerCase();

/** Whether a word stands in a title as whole words. Found by looking for it, so no character in it means anything. */
function stands(title: string, word: string): boolean {
  if (!word) return false;
  for (let from = 0; ;) {
    const at = title.indexOf(word, from);
    if (at < 0) return false;
    if (!isWordChar(title[at - 1]) && !isWordChar(title[at + word.length])) return true;
    from = at + 1;
  }
}

/** The first of the watch words that a title names, as it was typed. Null when it names none. */
export function namedIn(title: string, words: string[]): string | null {
  const exact = plain(title), lower = exact.toLowerCase();
  return words.find((word) => { const w = plain(word); return inCapitals(w) ? stands(exact, w) : stands(lower, w.toLowerCase()); }) ?? null;
}

/** One headline as a page shows it, whether it was saved by hand or fetched. */
export interface Shown {
  key: string;
  kind: 'saved' | 'fetched';
  /** A saved headline's id. */
  id?: string;
  title: string;
  url: string;
  /** Who published it, as shown. */
  source: string;
  /** The day it was published, on this device's calendar. */
  date: ISODate;
  /** The watch word it names. */
  word: string | null;
  /** A saved headline's own tag. */
  tag: string;
  /** Fetched, and from a source whose headlines may be kept by hand. */
  keep: boolean;
}

interface Placed extends Shown { /** When it was published, for a fetched one. */ at: number; /** Where it is among the saved. */ index: number }

const sameAddress = (url: string): string => cleanUrl(url) ?? url;

function placed(saved: Headline[], list: FeedList | null, words: string[], sources: readonly FeedSource[]): Placed[] {
  const mine: Placed[] = saved.map((h, index) => ({
    key: `saved:${h.id}`, kind: 'saved', id: h.id, title: h.title, url: h.url, source: h.source, date: h.date, tag: h.tag, keep: false, at: 0, index,
    word: namedIn(h.title, words) ?? (h.tag ? words.find((w) => w.toLowerCase() === h.tag.toLowerCase()) ?? null : null),
  }));
  const kept = new Set(saved.map((h) => sameAddress(h.url))), known = new Map(sources.filter((s) => s.on).map((s) => [s.id, s]));
  const theirs: Placed[] = (list?.items ?? []).flatMap((item: FeedItem, index): Placed[] => {
    const source = known.get(item.source), at = Date.parse(item.at);
    if (!source || Number.isNaN(at) || kept.has(sameAddress(item.url))) return [];
    return [{ key: `fetched:${item.url}`, kind: 'fetched', title: item.title, url: item.url, source: source.name, date: toISO(new Date(at)), tag: '', keep: source.keep, at, index, word: namedIn(item.title, words) }];
  });
  return [...mine, ...theirs];
}

/** Newest first by day. Of two on a day a saved one is first; then the saved one saved later, or the fetched one published later. */
function newestFirst(a: Placed, b: Placed): number {
  if (a.date !== b.date) return b.date.localeCompare(a.date);
  if (a.kind !== b.kind) return a.kind === 'saved' ? -1 : 1;
  return a.kind === 'saved' ? b.index - a.index : b.at - a.at;
}

const shown = ({ at: _at, index: _index, ...row }: Placed): Shown => row;

/**
 * Every headline, saved and fetched together, in the order Home shows them: first the ones from the last seven days
 * that name a watch word, newest first, then the rest, newest first. A fetched one that was also saved shows once,
 * as the saved one.
 */
export function shownHeadlines(saved: Headline[], list: FeedList | null, words: string[], today: ISODate, sources: readonly FeedSource[] = FEED_SOURCES): Shown[] {
  const since = addDaysISO(today, -WATCH.days), leads = (row: Placed) => row.word !== null && row.date >= since;
  return placed(saved, list, words, sources).sort((a, b) => Number(leads(b)) - Number(leads(a)) || newestFirst(a, b)).map(shown);
}

/** The fetched headlines alone, newest first, without the ones already saved by hand. */
export function fetchedRows(saved: Headline[], list: FeedList | null, words: string[], sources: readonly FeedSource[] = FEED_SOURCES): Shown[] {
  return placed(saved, list, words, sources).filter((row) => row.kind === 'fetched').sort((a, b) => b.at - a.at).map(shown);
}

const HOUR = 3_600_000;

/**
 * A list as it may still be shown at a time. A headline goes once it is thirty days old, as it would from a list
 * that was still being rebuilt, and the headlines of a source that may only be held for a time go once the list is
 * older than that.
 */
export function heldList(list: FeedList | null, now: Date, sources: readonly FeedSource[] = FEED_SOURCES): FeedList | null {
  if (!list) return null;
  const age = now.getTime() - Date.parse(list.checked);
  const over = new Set(sources.filter((s) => s.keepHours !== undefined && age > s.keepHours * HOUR).map((s) => s.id));
  const items = list.items.filter((i) => !over.has(i.source) && inTime(i, now));
  return items.length === list.items.length ? list : { ...list, items };
}

/** A day old or more: the job has not run, or its list has not been reached, for a while. */
export const isStale = (checked: string | null, now: Date): boolean => !!checked && now.getTime() - Date.parse(checked) >= 24 * HOUR;

/** How old the list is, for the corner of the heading. With no list at all, that it could not be fetched. */
export function updatedWords(checked: string | null, now: Date): string {
  if (!checked) return 'Could not be fetched';
  const age = now.getTime() - Date.parse(checked), hours = Math.floor(age / HOUR);
  if (hours < 1) return 'Updated in the last hour';
  if (hours < 24) return hours === 1 ? 'Updated an hour ago' : `Updated ${hours} hours ago`;
  const then = new Date(Date.parse(checked)), day = toISO(then);
  return `Last updated ${dayMonth(day)}${then.getFullYear() === now.getFullYear() ? '' : ` ${then.getFullYear()}`}`;
}

/** A headline's day: today, yesterday, or its date, with the year when that is not this one. */
export function dayWords(date: ISODate, today: ISODate): string {
  const n = daysBetween(today, date);
  if (n === 0) return 'today';
  if (n === -1) return 'yesterday';
  return date.slice(0, 4) === today.slice(0, 4) ? dayMonth(date) : `${dayMonth(date)} ${date.slice(0, 4)}`;
}

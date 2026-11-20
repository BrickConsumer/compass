/**
 * The list of headlines that Compass publishes, and every rule about it.
 *
 * A scheduled job reads a few sources and writes one small public file. Each device with "Fetch headlines" switched
 * on downloads that file and picks from it. The same rules are applied twice: by the job when it writes, and by
 * the app when it reads, since a public file over a network is not taken on trust.
 *
 * This file imports nothing, on purpose. The job runs it in plain Node, exactly as it is written here.
 */

/**
 * Where the list is published: the branch `headlines` of Compass's own public repository. The address has no query,
 * and is the same for everyone.
 */
export const FEED_URL = 'https://raw.githubusercontent.com/BrickConsumer/compass/headlines/headlines.json';

export const FEED = {
  format: 1,
  /** A title longer than this is left out, never cut: a publisher's headline is not altered, and a saved headline holds this many. */
  title: 140,
  /** How long a headline stays in the list after it was published. The Reserve Bank publishes only a few times a month. */
  days: 30,
  perSource: 20,
  max: 60,
  /** The most of the file that the app will read. */
  chars: 200_000,
} as const;

export interface FeedSource {
  id: string;
  /** As it is shown beside a headline. */
  name: string;
  /** Its own site. A headline's address must be on it, or on a part of it. */
  host: string;
  /** Where the job reads it. */
  feed: string;
  kind: 'feed' | 'guardian';
  /** What lets Compass show its headlines, in a few words for the credits. */
  licence: string;
  /** Off means the job does not read it, and the app drops it even when a list holds it. */
  on: boolean;
  /** The longest its headlines may be held, by its terms. They are replaced on every run and never carried over. */
  keepHours?: number;
  /** Whether a student may keep one of its headlines by hand. */
  keep: boolean;
}

/**
 * Every source, with the terms that let it be here set out in docs/fetched-headlines-spec.md, section 4.
 * One is added only once its terms have been read and written down there.
 */
export const FEED_SOURCES: readonly FeedSource[] = [
  { id: 'conversation', name: 'The Conversation', host: 'theconversation.com', feed: 'https://theconversation.com/au/business/articles.atom', kind: 'feed', licence: 'Creative Commons', on: true, keep: true },
  { id: 'rba', name: 'Reserve Bank of Australia', host: 'rba.gov.au', feed: 'https://www.rba.gov.au/rss/rss-cb-media-releases.xml', kind: 'feed', licence: 'CC BY 4.0', on: true, keep: true },
  // built, and off until the four steps in the specification's section 9 are done. Turning it on is more than this switch
  { id: 'guardian', name: 'The Guardian', host: 'theguardian.com', feed: 'https://content.guardianapis.com/search?section=business&order-by=newest&page-size=20', kind: 'guardian', licence: 'Open Platform terms', on: false, keepHours: 24, keep: false },
];

export interface FeedItem { title: string; url: string; /** A source's id. */ source: string; /** When its publisher says it was published. */ at: string }
export interface FeedList {
  format: 1;
  /** When the job last read at least one source. */
  checked: string;
  items: FeedItem[];
  /** When each source was last read, by its id. The job uses it to say when one has gone quiet. The app does not. */
  read?: Record<string, string>;
}
/** A headline as a source gave it, before anything is checked. */
export interface RawItem { title: unknown; url: unknown; at: unknown }

const DAY = 86_400_000;
type Loose = Record<string, unknown>;
const isObject = (value: unknown): value is Loose => !!value && typeof value === 'object' && !Array.isArray(value);
const single = (text: string): string => text.replace(/\s+/g, ' ').trim();
/** A time written one way, to the second. */
const stamp = (ms: number): string => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const newest = (a: FeedItem, b: FeedItem): number => Date.parse(b.at) - Date.parse(a.at);
/**
 * A time that could be a real one for a headline. A date can be written that no calendar can show, thousands of
 * years off, and one of those must never reach a page.
 */
const FROM = Date.UTC(2000, 0, 1), TO = Date.UTC(2100, 0, 1);
const real = (ms: number): boolean => ms >= FROM && ms <= TO;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…' };
/** A character written by a name, such as `&eacute;`. Two letters at least, so the "T;" of "AT&T; and" is not one. */
const NAMED = /&[a-z][a-z0-9]{1,30};/i;
/** The characters that a feed writes as `&amp;` or `&#8217;`, read once and not twice. A name that is not known is left as it is. */
function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z][a-z0-9]{1,30});/gi, (whole, name: string) => {
    if (name[0] !== '#') return ENTITIES[name.toLowerCase()] ?? whole;
    const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
    return code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff) ? String.fromCodePoint(code) : '';
  });
}

interface Element { attrs: string; inner: string; end: number }
/** The next `<name …>…</name>` at or after a place in a feed. Found by looking for it, with no pattern that could run away. */
function element(xml: string, name: string, from = 0): Element | null {
  let at = from;
  for (;;) {
    at = xml.indexOf(`<${name}`, at);
    if (at < 0) return null;
    const after = xml[at + name.length + 1];
    if (after === '>' || after === '/' || after === ' ' || after === '\n' || after === '\t' || after === '\r') break;
    at += name.length + 1;
  }
  const close = xml.indexOf('>', at);
  if (close < 0) return null;
  const attrs = xml.slice(at + name.length + 1, close);
  if (attrs.endsWith('/')) return { attrs, inner: '', end: close + 1 };
  const stop = xml.indexOf(`</${name}>`, close);
  return stop < 0 ? null : { attrs, inner: xml.slice(close + 1, stop), end: stop + name.length + 3 };
}

function attr(attrs: string, name: string): string {
  const found = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(attrs);
  return found ? found[1] ?? found[2] ?? '' : '';
}

/** What an element holds, as words. */
function textOf(el: Element | null | undefined): string {
  if (!el) return '';
  const inner = el.inner.trim();
  return inner.startsWith('<![CDATA[') && inner.endsWith(']]>') ? inner.slice(9, -3) : decode(inner);
}

/** The longest a title can be as a feed writes it, markup and all. A headline holds 140 characters, so anything near this is not one. */
const RAW_TITLE = 2000;

/**
 * A title's words, or nothing when they cannot be read exactly. A headline is shown as its publisher wrote it or not
 * at all: one that would show a character's code in place of the character is left out.
 */
function titleOf(el: Element): string {
  // nothing this long is a headline, and taking the markup out of it could take minutes
  if (el.inner.length > RAW_TITLE) return '';
  const type = attr(el.attrs, 'type'), words = textOf(el);
  // a title marked as html holds markup written out, and only its words are a headline. A "<" that does not begin a
  // tag is one of those words
  const title = single(type === 'html' || type === 'xhtml' ? decode(words.replace(/<\/?[a-z!][^>]*>/gi, '')) : words);
  return NAMED.test(title) ? '' : title;
}

/** An Atom entry's own page: the link that is not the feed, an image or anything else. */
function pageLink(inner: string): string {
  let from = 0;
  for (let n = 0; n < 20; n++) {
    const link = element(inner, 'link', from);
    if (!link) break;
    from = link.end;
    const href = decode(attr(link.attrs, 'href')), rel = attr(link.attrs, 'rel');
    if (href && (!rel || rel === 'alternate')) return href;
  }
  return '';
}

/**
 * The headlines in a feed: Atom's entries, and the items of RSS 1.0 and 2.0. Each is its title, its address and when
 * it was published, as written. Nothing is checked here, and whatever the text holds this never throws.
 */
export function parseFeed(xml: string): { title: string; url: string; at: string }[] {
  if (typeof xml !== 'string') return [];
  const feed = xml.slice(0, 3_000_000), out: { title: string; url: string; at: string }[] = [];
  for (const block of ['entry', 'item'] as const) {
    let from = 0;
    while (out.length < 200) {
      const found = element(feed, block, from);
      if (!found) break;
      from = found.end;
      const title = element(found.inner, 'title'), words = title ? titleOf(title) : '';
      const url = (block === 'entry' ? pageLink(found.inner) : textOf(element(found.inner, 'link'))).trim();
      const when = ['published', 'updated', 'dc:date', 'pubDate'].map((name) => element(found.inner, name)).find((el) => el !== null);
      if (words && url) out.push({ title: words, url, at: single(textOf(when)) });
    }
  }
  return out;
}

/** The headlines in an answer from the Guardian's Content API. */
export function guardianItems(json: unknown): RawItem[] {
  const response = isObject(json) ? json.response : null, results = isObject(response) ? response.results : null;
  return Array.isArray(results) ? results.filter(isObject).slice(0, 200).map((r) => ({ title: r.webTitle, url: r.webUrl, at: r.webPublicationDate })) : [];
}

/** An address, when it is https and on a source's own site or a part of it. Otherwise nothing. */
function ownAddress(text: string, host: string): string | null {
  let url: URL;
  try { url = new URL(text.trim()); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  const name = url.hostname.toLowerCase();
  return name === host || name.endsWith(`.${host}`) ? url.href : null;
}

/**
 * One headline, checked. Its title is kept exactly as published with its spaces made single, and it is left out,
 * never cut, when that is too long. Its address must be on its source's own site.
 */
export function cleanItem(raw: RawItem, source: FeedSource): FeedItem | null {
  if (typeof raw.title !== 'string' || typeof raw.url !== 'string' || typeof raw.at !== 'string') return null;
  const title = single(raw.title), when = Date.parse(raw.at);
  if (!title || title.length > FEED.title || Number.isNaN(when) || !real(when)) return null;
  const url = ownAddress(raw.url, source.host);
  return url ? { title, url, source: source.id, at: stamp(when) } : null;
}

/**
 * The list, from what was just read and the list before it. A feed may hold only its latest, so what an earlier list
 * held from a source stays for its thirty days, unless that source may only be held for a time. `read` has a list
 * for each source that was read and null for one that could not be. With none read there is no list.
 */
export function buildList(previous: FeedList | null, read_: Record<string, FeedItem[] | null | undefined>, now: Date, sources: readonly FeedSource[] = FEED_SOURCES): FeedList | null {
  const live = sources.filter((s) => s.on);
  if (!live.some((s) => Array.isArray(read_[s.id]))) return null;
  const items = live.flatMap((s) => {
    const fresh = read_[s.id] ?? [], earlier = s.keepHours ? [] : previous?.items ?? [], seen = new Set<string>();
    return [...fresh, ...earlier]
      .filter((i) => i.source === s.id && !seen.has(i.url) && !!seen.add(i.url))
      .filter((i) => inTime(i, now))
      .sort(newest).slice(0, FEED.perSource);
  });
  // when each source was last read: now for the ones read in this run, and as it was for the rest
  const read: Record<string, string> = {};
  for (const s of live) {
    const last = Array.isArray(read_[s.id]) ? stamp(now.getTime()) : previous?.read?.[s.id];
    if (last) read[s.id] = last;
  }
  return { format: 1, checked: stamp(now.getTime()), items: items.sort(newest).slice(0, FEED.max), read };
}

/**
 * A published list as it is kept after reading: every item checked as the job checked it, a source that is off or
 * unknown dropped, each address once, twenty of a source and sixty at most. With `now`, the job's rule about time is
 * applied again: an item more than thirty days old, or dated more than a day ahead, is dropped. So a list that has
 * stopped being rebuilt still ages on the device. Null when it is not a list of this format at all.
 */
export function readList(value: unknown, sources: readonly FeedSource[] = FEED_SOURCES, now?: Date): FeedList | null {
  if (!isObject(value) || value.format !== FEED.format || !Array.isArray(value.items) || typeof value.checked !== 'string') return null;
  const checked = Date.parse(value.checked);
  if (Number.isNaN(checked) || !real(checked)) return null;
  const known = new Map(sources.filter((s) => s.on).map((s) => [s.id, s])), seen = new Set<string>(), held = new Map<string, number>(), items: FeedItem[] = [];
  for (const raw of value.items) {
    if (items.length >= FEED.max) break;
    const source = isObject(raw) && typeof raw.source === 'string' ? known.get(raw.source) : undefined;
    const item = source ? cleanItem(raw as unknown as RawItem, source) : null, has = item ? held.get(item.source) ?? 0 : 0;
    if (!item || seen.has(item.url) || has >= FEED.perSource || !inTime(item, now)) continue;
    seen.add(item.url);
    held.set(item.source, has + 1);
    items.push(item);
  }
  const read: Record<string, string> = {};
  if (isObject(value.read)) {
    for (const id of known.keys()) {
      const at = value.read[id], ms = typeof at === 'string' ? Date.parse(at) : NaN;
      if (!Number.isNaN(ms) && real(ms)) read[id] = stamp(ms);
    }
  }
  return { format: 1, checked: stamp(checked), items, ...(Object.keys(read).length ? { read } : {}) };
}

/** Whether a headline is one the list may hold at a time: no more than thirty days old, and not dated more than a day ahead. With no time given, any is. */
export function inTime(item: FeedItem, now?: Date): boolean {
  if (!now) return true;
  const at = Date.parse(item.at);
  return at >= now.getTime() - FEED.days * DAY && at <= now.getTime() + DAY;
}

/** How long a source may go unread before the job says so. Six runs, at one every four hours. */
const QUIET_HOURS = 24;

/**
 * The sources that have gone quiet, by name: switched on, asked for, and not read for a day, or never. One source
 * failing does not stop the list being built, so without this a source that stopped answering would drain out of
 * the list over thirty days with nobody told.
 */
export function quietSources(list: FeedList, now: Date, env: { GUARDIAN_KEY?: string }, sources: readonly FeedSource[] = FEED_SOURCES): string[] {
  return sources.filter((s) => {
    if (!s.on || (s.kind === 'guardian' && !env.GUARDIAN_KEY)) return false;
    const last = Date.parse(list.read?.[s.id] ?? '');
    return Number.isNaN(last) || now.getTime() - last > QUIET_HOURS * 3_600_000;
  }).map((s) => s.name);
}

/**
 * What the job does, with the reading of an address handed in: read every source that is on, and build the list.
 * A source that cannot be read, or answers with something that is not a feed, is left as it was. The Guardian is
 * asked only when it is on and a key is given, and the key goes nowhere but into that one address.
 */
export async function publish(
  previous: FeedList | null, fetchText: (url: string) => Promise<string>, now: Date, env: { GUARDIAN_KEY?: string },
  sources: readonly FeedSource[] = FEED_SOURCES, note: (line: string) => void = () => {},
): Promise<FeedList | null> {
  const read: Record<string, FeedItem[] | null> = {};
  for (const s of sources.filter((x) => x.on)) {
    const key = s.kind === 'guardian' ? env.GUARDIAN_KEY : undefined;
    if (s.kind === 'guardian' && !key) { note(`${s.name}: not asked, since no key was given`); continue; }
    try {
      const text = await fetchText(key ? `${s.feed}&api-key=${encodeURIComponent(key)}` : s.feed);
      const raw: RawItem[] = s.kind === 'guardian' ? guardianItems(JSON.parse(text)) : parseFeed(text);
      read[s.id] = raw.length ? raw.flatMap((r) => cleanItem(r, s) ?? []) : null;
      note(read[s.id] ? `${s.name}: ${read[s.id]!.length} of ${raw.length} read` : `${s.name}: answered with nothing that is a headline`);
    } catch {
      // why it failed is not written down: the address may hold a key
      read[s.id] = null;
      note(`${s.name}: could not be read`);
    }
  }
  return buildList(previous, read, now, sources);
}

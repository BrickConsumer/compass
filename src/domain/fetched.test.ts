import { describe, expect, it } from 'vitest';
import { toISO } from './dates';
import { dayWords, fetchedRows, hasWatchlist, heldList, isStale, namedIn, shownHeadlines, updatedWords, WATCH, watchWords } from './fetched';
import { FEED_SOURCES, type FeedItem, type FeedList } from './feeds';
import type { Headline, ISODate, Page } from './types';

const page = (title: string, lines: string[], more: Partial<Page> = {}): Page => ({ id: `p-${title}`, title, kind: 'checklist', items: lines.map((text, n) => ({ id: `${title}-${n}`, text, done: false })), text: '', createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z', ...more } as Page);
const saved = (id: string, title: string, date: string, more: Partial<Headline> = {}): Headline => ({ id, title, url: `https://example.com/${id}`, source: 'Example', date: date as ISODate, tag: '', ...more });
// a time at noon on a day of this device's own calendar, so the day it falls on is the same wherever the tests run
const noon = (day: string, hour = 12) => new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)), hour).toISOString();
const got = (n: number, title: string, day: string, source = 'conversation', hour = 12): FeedItem => ({ title, url: `https://${source === 'rba' ? 'www.rba.gov.au' : 'theconversation.com'}/f-${n}`, source, at: noon(day, hour) });
const list = (...items: FeedItem[]): FeedList => ({ format: 1, checked: '2026-11-20T04:00:00Z', items });
const TODAY = '2026-11-20' as ISODate;
const titles = (rows: { title: string }[]) => rows.map((r) => r.title);

describe('the words to watch for', () => {
  it('are the lines of a page called Watchlist, whatever its capitals', () => {
    expect(watchWords([page('Watchlist', ['BHP', 'Commonwealth Bank']), page('Shopping', ['Milk'])])).toEqual(['BHP', 'Commonwealth Bank']);
    expect(watchWords([page('  watchLIST ', ['Wesfarmers'])])).toEqual(['Wesfarmers']);
  });
  it('are also the lines of a page started as a Watchlist and since renamed', () => {
    expect(watchWords([page('Shares I follow', ['Telstra'], { form: 'watchlist' })])).toEqual(['Telstra']);
  });
  it('take several names from one line, with commas between them', () => {
    expect(watchWords([page('Watchlist', ['Commonwealth Bank, CommBank ,  CBA', 'BHP'])])).toEqual(['Commonwealth Bank', 'CommBank', 'CBA', 'BHP']);
  });
  it('leave out a word that is too short or too long, and hold each once', () => {
    expect(watchWords([page('Watchlist', ['A', ' ', 'x'.repeat(WATCH.word + 1), 'x'.repeat(WATCH.word), 'BHP', 'bhp', 'BHP'])])).toEqual(['x'.repeat(WATCH.word), 'BHP']);
  });
  it('are forty at most, from every such page in turn', () => {
    const words = watchWords([page('Watchlist', Array.from({ length: 30 }, (_, n) => `Company ${n}`)), page('watchlist', Array.from({ length: 30 }, (_, n) => `Other ${n}`), { id: 'second' })]);
    expect(words).toHaveLength(WATCH.max);
    expect(words[30]).toBe('Other 0');
  });
  it('are none from a Watchlist page with no lines yet, which is still a page that is there', () => {
    expect(watchWords([page('Watchlist', [])])).toEqual([]);
    expect(hasWatchlist([page('Watchlist', [])])).toBe(true);
    expect(hasWatchlist([page('Renamed', [], { form: 'watchlist' })])).toBe(true);
    expect(hasWatchlist([page('Shopping', ['Milk'])])).toBe(false);
    expect(hasWatchlist([])).toBe(false);
  });
  it('are none with no such page', () => {
    expect(watchWords([])).toEqual([]);
    expect(watchWords([page('Watchlists', ['BHP'])])).toEqual([]);
  });
});

describe('a headline that names a word', () => {
  it('holds it as whole words, ignoring capitals', () => {
    expect(namedIn('Why commonwealth bank is raising rates', ['Commonwealth Bank'])).toBe('Commonwealth Bank');
    expect(namedIn('Westpac’s new hazard reports', ['westpac'])).toBe('westpac');
    expect(namedIn('The Commonwealth Bankers’ dinner', ['Commonwealth Bank'])).toBeNull();
    expect(namedIn('A subcommonwealth bank', ['Commonwealth Bank'])).toBeNull();
  });
  it('needs capitals for a word that was typed all in capitals', () => {
    expect(namedIn('Is it time to buy?', ['IT'])).toBeNull();
    expect(namedIn('Why IT spending is up', ['IT'])).toBe('IT');
    expect(namedIn('BHP lifts its dividend', ['BHP'])).toBe('BHP');
    expect(namedIn('bhp lifts its dividend', ['BHP'])).toBeNull();
    expect(namedIn('A2M shares jump', ['A2M'])).toBe('A2M');
  });
  it('treats a curly apostrophe and a straight one as the same', () => {
    expect(namedIn('McDonald’s lifts prices', ["McDonald's"])).toBe("McDonald's");
    expect(namedIn("McDonald's lifts prices", ['McDonald’s'])).toBe('McDonald’s');
  });
  it('reads a word with characters that mean something in a pattern as it is written', () => {
    for (const word of ['C++', 'A.B', '(x)', '*', '[a-z]+', '\\d', 'AT&T', '$AAPL', 'a|b', '^start', 'end$', '?!']) {
      expect(() => namedIn('Learning C++ and AT&T and $AAPL', [word])).not.toThrow();
    }
    expect(namedIn('Learning C++ and AT&T today', ['C++'])).toBe('C++');
    expect(namedIn('Learning C++ and AT&T today', ['AT&T'])).toBe('AT&T');
    expect(namedIn('Learning C and D', ['A.B', '[a-z]+', '\\w+', '.*'])).toBeNull();
  });
  it('gives the first of the words that it names, and none of none', () => {
    expect(namedIn('BHP and Rio Tinto', ['Rio Tinto', 'BHP'])).toBe('Rio Tinto');
    expect(namedIn('BHP and Rio Tinto', [])).toBeNull();
    expect(namedIn('', ['BHP'])).toBeNull();
  });
  it('reads names in other alphabets as words too', () => {
    expect(namedIn('Société Générale reports', ['société générale'])).toBe('société générale');
    expect(namedIn('Générales', ['Générale'])).toBeNull();
  });
});

describe('the headlines Home shows, saved and fetched together', () => {
  it('are newest first by the day they were published', () => {
    const rows = shownHeadlines([saved('s1', 'Saved old', '2026-11-10')], list(got(1, 'Fetched today', '2026-11-20'), got(2, 'Fetched earlier', '2026-11-15')), [], TODAY);
    expect(titles(rows)).toEqual(['Fetched today', 'Fetched earlier', 'Saved old']);
    expect(rows.map((r) => r.kind)).toEqual(['fetched', 'fetched', 'saved']);
  });
  it('put a saved one before a fetched one of the same day, and a later fetched one before an earlier', () => {
    const rows = shownHeadlines([saved('s1', 'Saved', '2026-11-20')], list(got(1, 'Morning', '2026-11-20', 'conversation', 8), got(2, 'Evening', '2026-11-20', 'conversation', 20)), [], TODAY);
    expect(titles(rows)).toEqual(['Saved', 'Evening', 'Morning']);
  });
  it('keep the order saved ones always had among themselves: of two on a day, the one saved later first', () => {
    expect(titles(shownHeadlines([saved('a', 'First saved', '2026-11-18'), saved('b', 'Second saved', '2026-11-18'), saved('c', 'Newer', '2026-11-19')], null, [], TODAY))).toEqual(['Newer', 'Second saved', 'First saved']);
  });
  it('put the ones that name a watch word first, for seven days', () => {
    const rows = shownHeadlines(
      [saved('s1', 'Saved about Telstra', '2026-11-12')],
      list(got(1, 'Nothing watched, today', '2026-11-20'), got(2, 'BHP lifts its dividend', '2026-11-17'), got(3, 'BHP, a fortnight ago', '2026-11-06'), got(4, 'Telstra on the edge of the week', '2026-11-13')),
      ['BHP', 'Telstra'], TODAY,
    );
    expect(titles(rows)).toEqual(['BHP lifts its dividend', 'Telstra on the edge of the week', 'Nothing watched, today', 'Saved about Telstra', 'BHP, a fortnight ago']);
    expect(rows.map((r) => r.word)).toEqual(['BHP', 'Telstra', null, 'Telstra', 'BHP']);
  });
  it('count a saved headline whose tag is a watch word, whatever its capitals', () => {
    const rows = shownHeadlines([saved('s1', 'A quiet result', '2026-11-18', { tag: 'bhp' }), saved('s2', 'Unwatched and newer', '2026-11-19')], null, ['BHP'], TODAY);
    expect(titles(rows)).toEqual(['A quiet result', 'Unwatched and newer']);
    expect(rows[0]!.word).toBe('BHP');
    expect(rows[0]!.tag).toBe('bhp');
  });
  it('show a fetched headline that was also saved once, as the saved one', () => {
    const one = got(1, 'Kept by hand', '2026-11-19');
    const rows = shownHeadlines([saved('s1', 'Kept by hand', '2026-11-19', { url: one.url })], list(one, got(2, 'Another', '2026-11-18')), [], TODAY);
    expect(rows.map((r) => `${r.kind}:${r.title}`)).toEqual(['saved:Kept by hand', 'fetched:Another']);
  });
  it('give each row its publisher by name, its day on this device, and whether it may be kept', () => {
    const [row] = shownHeadlines([], list(got(1, 'A release', '2026-11-19', 'rba')), [], TODAY);
    expect(row).toMatchObject({ kind: 'fetched', source: 'Reserve Bank of Australia', date: '2026-11-19', keep: true, tag: '', word: null, url: 'https://www.rba.gov.au/f-1' });
    expect(row!.key).toBe('fetched:https://www.rba.gov.au/f-1');
    const [mine] = shownHeadlines([saved('s1', 'Mine', '2026-11-19', { source: 'Reuters', tag: 'CBA' })], null, [], TODAY);
    expect(mine).toMatchObject({ kind: 'saved', id: 's1', key: 'saved:s1', source: 'Reuters', tag: 'CBA', keep: false });
  });
  it('take the day from this device’s clock, not from the time as written', () => {
    const lateAtNight = new Date(2026, 10, 19, 23, 30).toISOString(), earlyMorning = new Date(2026, 10, 20, 0, 30).toISOString();
    const rows = shownHeadlines([], list({ ...got(1, 'Late', '2026-11-19'), at: lateAtNight }, { ...got(2, 'Early', '2026-11-20'), at: earlyMorning }), [], TODAY);
    expect(rows.map((r) => r.date)).toEqual([toISO(new Date(earlyMorning)), toISO(new Date(lateAtNight))]);
    expect(rows.map((r) => r.date)).toEqual(['2026-11-20', '2026-11-19']);
  });
  it('drop a source the app does not know, and are the saved ones alone with no list', () => {
    expect(titles(shownHeadlines([saved('s1', 'Saved', '2026-11-19')], list({ ...got(1, 'From nowhere', '2026-11-20'), source: 'nobody' }), [], TODAY))).toEqual(['Saved']);
    expect(titles(shownHeadlines([saved('s1', 'Saved', '2026-11-19')], null, [], TODAY))).toEqual(['Saved']);
    expect(shownHeadlines([], null, [], TODAY)).toEqual([]);
  });
});

describe('the fetched part of the Headlines page', () => {
  it('is every fetched headline, newest first, without the ones saved by hand', () => {
    const one = got(1, 'Kept', '2026-11-19');
    const rows = fetchedRows([saved('s1', 'Kept', '2026-11-19', { url: one.url })], list(got(2, 'Older, about BHP', '2026-11-12'), one, got(3, 'Newest', '2026-11-20')), ['BHP']);
    expect(titles(rows)).toEqual(['Newest', 'Older, about BHP']);
    expect(rows[1]!.word).toBe('BHP');
    expect(fetchedRows([], null, [])).toEqual([]);
  });
});

describe('a list held on the device', () => {
  const guardianOn = FEED_SOURCES.map((s) => (s.id === 'guardian' ? { ...s, on: true } : s));
  const g: FeedItem = { title: 'Guardian', url: 'https://www.theguardian.com/business/1', source: 'guardian', at: '2026-11-19T10:00:00Z' };
  const held: FeedList = { format: 1, checked: '2026-11-20T04:00:00Z', items: [g, got(1, 'Conversation', '2026-11-19')] };
  it('loses a source’s headlines once it is older than that source may be held', () => {
    expect(heldList(held, new Date('2026-11-21T03:59:00Z'), guardianOn)!.items).toHaveLength(2);
    expect(titles(heldList(held, new Date('2026-11-21T04:00:01Z'), guardianOn)!.items)).toEqual(['Conversation']);
  });
  it('is otherwise kept as it is', () => {
    const plain: FeedList = { ...held, items: [got(1, 'Conversation', '2026-11-19')] };
    expect(heldList(plain, new Date('2026-11-30T00:00:00Z'), guardianOn)).toEqual(plain);
    expect(heldList(null, new Date(), guardianOn)).toBeNull();
  });
  it('lets a headline go once it is thirty days old, so a list that is no longer rebuilt does not stay for good', () => {
    const list: FeedList = { format: 1, checked: '2026-11-20T04:00:00Z', items: [{ ...got(1, 'Fresh', '2026-11-19'), at: '2026-11-19T10:00:00Z' }, { ...got(2, 'Stale', '2026-10-01'), at: '2026-10-01T10:00:00Z' }] };
    expect(titles(heldList(list, new Date('2026-11-20T05:00:00Z'))!.items)).toEqual(['Fresh']);
    expect(titles(heldList(list, new Date('2026-12-19T09:59:00Z'))!.items)).toEqual(['Fresh']);
    expect(titles(heldList(list, new Date('2026-12-19T10:00:01Z'))!.items)).toEqual([]);
  });
});

describe('how old the list is, in words', () => {
  const checked = '2026-11-20T04:00:00Z', after = (minutes: number) => new Date(Date.parse(checked) + minutes * 60_000);
  it('says so by the hour for a day', () => {
    expect(updatedWords(checked, after(0))).toBe('Updated in the last hour');
    expect(updatedWords(checked, after(59))).toBe('Updated in the last hour');
    expect(updatedWords(checked, after(60))).toBe('Updated an hour ago');
    expect(updatedWords(checked, after(119))).toBe('Updated an hour ago');
    expect(updatedWords(checked, after(180))).toBe('Updated 3 hours ago');
    expect(updatedWords(checked, after(23 * 60 + 59))).toBe('Updated 23 hours ago');
  });
  it('gives the day once it is a day old, with the year when that is another', () => {
    const day = new Date(2026, 10, 17, 9).toISOString();
    expect(updatedWords(day, new Date(2026, 10, 20, 9))).toBe('Last updated 17 Nov');
    expect(updatedWords(day, new Date(2027, 0, 3, 9))).toBe('Last updated 17 Nov 2026');
    expect(isStale(day, new Date(2026, 10, 18, 8, 59))).toBe(false);
    expect(isStale(day, new Date(2026, 10, 18, 9))).toBe(true);
  });
  it('is not thrown by a clock that is behind', () => {
    expect(updatedWords(checked, after(-500))).toBe('Updated in the last hour');
  });
  it('says it could not be fetched when there is no list', () => {
    expect(updatedWords(null, new Date())).toBe('Could not be fetched');
    expect(isStale(null, new Date())).toBe(false);
  });
});

describe('a headline’s day, in words', () => {
  it('is today, yesterday, or the date, with the year when that is another', () => {
    expect(dayWords('2026-11-20' as ISODate, TODAY)).toBe('today');
    expect(dayWords('2026-11-19' as ISODate, TODAY)).toBe('yesterday');
    expect(dayWords('2026-11-18' as ISODate, TODAY)).toBe('18 Nov');
    expect(dayWords('2026-11-21' as ISODate, TODAY)).toBe('21 Nov');
    expect(dayWords('2025-12-31' as ISODate, TODAY)).toBe('31 Dec 2025');
  });
});

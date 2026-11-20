import { describe, expect, it } from 'vitest';
import { buildList, cleanItem, FEED, FEED_SOURCES, type FeedItem, type FeedList, type FeedSource, guardianItems, parseFeed, publish, quietSources, readList } from './feeds';

const conversation = FEED_SOURCES.find((s) => s.id === 'conversation')!, rba = FEED_SOURCES.find((s) => s.id === 'rba')!, guardian = FEED_SOURCES.find((s) => s.id === 'guardian')!;
const NOW = new Date('2026-11-20T04:00:00Z');
const item = (n: number, source = 'conversation', at = '2026-11-19T10:00:00Z'): FeedItem => ({ title: `Headline ${n}`, url: `https://${source === 'rba' ? 'www.rba.gov.au' : 'theconversation.com'}/a-${n}`, source, at });

// shaped as The Conversation's feed is
const ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xml:lang="en-US" xmlns="http://www.w3.org/2005/Atom">
  <id>tag:example,2011:/au/business/articles</id>
  <link rel="alternate" type="text/html" href="https://theconversation.com"/>
  <link rel="self" type="application/atom+xml" href="https://theconversation.com/au/business/articles.atom"/>
  <title>Business + Economy – The Conversation</title>
  <updated>2026-11-19T19:05:25Z</updated>
  <entry>
    <id>tag:theconversation.com,2011:article/1</id>
    <published>2026-11-19T19:05:25Z</published>
    <updated>2026-11-19T20:00:00Z</updated>
    <link rel="alternate" type="text/html" href="https://theconversation.com/rates-and-what-they-mean-1"/>
    <title>Rates &amp; what they mean: here’s the  short
      version</title>
    <content type="html">&lt;p&gt;A body with a &lt;a href="https://elsewhere.example/x"&gt;link&lt;/a&gt; and a &lt;title&gt;decoy&lt;/title&gt;&lt;/p&gt;</content>
    <author><name>A Writer</name></author>
  </entry>
  <entry>
    <id>tag:theconversation.com,2011:article/2</id>
    <published>2026-11-18T01:00:00Z</published>
    <link rel="alternate" type="text/html" href="https://theconversation.com/second-2"/>
    <title><![CDATA[Why 3 < 4 & other sums]]></title>
  </entry>
</feed>`;

// shaped as the Reserve Bank's feed is
const RDF = `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns="http://purl.org/rss/1.0/">
  <channel rdf:about="https://www.rba.gov.au/rss/rss-cb-media-releases.xml">
    <title>Reserve Bank of Australia | Media Releases</title>
    <link>https://www.rba.gov.au/rss/index.html</link>
    <items><rdf:Seq><rdf:li rdf:resource="https://www.rba.gov.au/media-releases/2026/mr-26-31.html"/></rdf:Seq></items>
    <dc:date>2026-11-06T10:45+11:00</dc:date>
  </channel>
  <item rdf:about="https://www.rba.gov.au/media-releases/2026/mr-26-31.html">
    <title>Statement by the Monetary Policy Board: Monetary Policy Decision</title>
    <link>https://www.rba.gov.au/media-releases/2026/mr-26-31.html</link>
    <description>Media release number 2026-31</description>
    <dc:date>2026-11-06T10:45+11:00</dc:date>
  </item>
</rdf:RDF>`;

describe('reading a feed', () => {
  it('reads the entries of an Atom feed: title, address and when it was published', () => {
    expect(parseFeed(ATOM)).toEqual([
      { title: 'Rates & what they mean: here’s the short version', url: 'https://theconversation.com/rates-and-what-they-mean-1', at: '2026-11-19T19:05:25Z' },
      { title: 'Why 3 < 4 & other sums', url: 'https://theconversation.com/second-2', at: '2026-11-18T01:00:00Z' },
    ]);
  });
  it('reads the items of an RSS feed', () => {
    expect(parseFeed(RDF)).toEqual([{ title: 'Statement by the Monetary Policy Board: Monetary Policy Decision', url: 'https://www.rba.gov.au/media-releases/2026/mr-26-31.html', at: '2026-11-06T10:45+11:00' }]);
  });
  it('reads an RSS 2.0 item with a pubDate', () => {
    const rss = '<rss><channel><title>Feed</title><item><title>One &#8217;quoted&#x2019; title</title><link> https://www.rba.gov.au/x </link><pubDate>Fri, 06 Nov 2026 10:45:00 +1100</pubDate></item></channel></rss>';
    expect(parseFeed(rss)).toEqual([{ title: 'One ’quoted’ title', url: 'https://www.rba.gov.au/x', at: 'Fri, 06 Nov 2026 10:45:00 +1100' }]);
  });
  it('takes a title marked as html down to its words', () => {
    const atom = '<feed><entry><title type="html">A &lt;em&gt;marked&lt;/em&gt; title &amp;amp; more</title><link href="https://theconversation.com/m"/><published>2026-11-19T00:00:00Z</published></entry></feed>';
    expect(parseFeed(atom)[0]!.title).toBe('A marked title & more');
  });
  it('leaves a headline out rather than show it mangled', () => {
    const entry = (title: string) => `<feed><entry>${title}<link href="https://theconversation.com/a"/><published>2026-11-19T00:00:00Z</published></entry></feed>`;
    // a bare "<" in a title marked as html is not markup, and is kept
    expect(parseFeed(entry('<title type="html"><![CDATA[Why 3 < 4 and 5 > 2]]></title>'))[0]!.title).toBe('Why 3 < 4 and 5 > 2');
    // the curly marks that html writes by name are read
    expect(parseFeed(entry('<title type="html">Australia&amp;rsquo;s banks &amp;mdash; a year on</title>'))[0]!.title).toBe('Australia’s banks — a year on');
    // a name this does not know, or one written twice over in plain words, would show as its code
    for (const title of ['Australia&amp;rsquo;s banks', 'A &amp;zwj; B', 'Caf&eacute; prices']) expect(parseFeed(entry(`<title>${title}</title>`)), title).toEqual([]);
    // and the letters that follow an ampersand in ordinary words are not such a name
    expect(parseFeed(entry('<title>AT&amp;T; and R&amp;D; and Q&amp;A</title>'))[0]!.title).toBe('AT&T; and R&D; and Q&A');
  });
  it('is not held up by a title that is nothing but brackets', () => {
    const started = Date.now();
    const feed = `<feed><entry><title type="html">${'<'.repeat(100_000)}</title><link href="https://theconversation.com/x"/><published>2026-11-19T00:00:00Z</published></entry></feed>`;
    expect(parseFeed(feed)).toEqual([]);
    expect(Date.now() - started).toBeLessThan(500);
  });
  it('makes nothing of what is not a feed, and never throws', () => {
    for (const text of ['', 'not xml', '<feed><entry>', '<entry><title>', '<item></item>', '<feed><entry><title>t</title></entry></feed>', '{"json":true}', '<'.repeat(5000)]) expect(parseFeed(text)).toEqual([]);
  });
  it('reads no more than a feed could reasonably hold', () => {
    const many = `<feed>${'<entry><title>t</title><link href="https://theconversation.com/x"/><published>2026-11-19T00:00:00Z</published></entry>'.repeat(5000)}</feed>`;
    expect(parseFeed(many).length).toBeLessThanOrEqual(200);
  });
});

describe("the Guardian's answer", () => {
  it('is read into the same three parts', () => {
    const json = { response: { status: 'ok', results: [{ id: 'business/2026/nov/19/x', webPublicationDate: '2026-11-19T08:00:00Z', webTitle: 'Markets steady', webUrl: 'https://www.theguardian.com/business/2026/nov/19/x' }, { webTitle: 5 }, null] } };
    expect(guardianItems(json)).toEqual([{ title: 'Markets steady', url: 'https://www.theguardian.com/business/2026/nov/19/x', at: '2026-11-19T08:00:00Z' }, { title: 5, url: undefined, at: undefined }]);
  });
  it('is nothing when it is not that shape', () => {
    for (const json of [null, 4, 'x', {}, { response: null }, { response: { results: 'no' } }]) expect(guardianItems(json)).toEqual([]);
  });
});

describe('one headline, checked', () => {
  const good = { title: 'A headline', url: 'https://theconversation.com/a-1', at: '2026-11-19T19:05:25Z' };
  it('is kept as published, with its time written one way', () => {
    expect(cleanItem(good, conversation)).toEqual({ title: 'A headline', url: 'https://theconversation.com/a-1', source: 'conversation', at: '2026-11-19T19:05:25Z' });
    expect(cleanItem({ ...good, at: '2026-11-06T10:45+11:00' }, conversation)!.at).toBe('2026-11-05T23:45:00Z');
  });
  it('has its spaces made single, and is otherwise untouched', () => {
    expect(cleanItem({ ...good, title: '  Two\n  lines\tand “quotes”  ' }, conversation)!.title).toBe('Two lines and “quotes”');
  });
  it('is left out, never cut, when its title is too long or empty', () => {
    expect(cleanItem({ ...good, title: 'x'.repeat(FEED.title) }, conversation)).not.toBeNull();
    expect(cleanItem({ ...good, title: 'x'.repeat(FEED.title + 1) }, conversation)).toBeNull();
    expect(cleanItem({ ...good, title: '   ' }, conversation)).toBeNull();
  });
  it('is left out unless its address is https and on its source’s own site', () => {
    const ok = ['https://theconversation.com/a', 'https://www.theconversation.com/a', 'https://images.theconversation.com/a'];
    const bad = ['http://theconversation.com/a', 'https://theconversation.com.evil.example/a', 'https://eviltheconversation.com/a', 'https://evil.example/theconversation.com', 'javascript:alert(1)', 'data:text/html,x', '//theconversation.com/a', 'theconversation.com/a', 'https://user:pass@theconversation.com/a', 'https://theconversation.com:8443/a', '', ' '];
    for (const url of ok) expect(cleanItem({ ...good, url }, conversation), url).not.toBeNull();
    for (const url of bad) expect(cleanItem({ ...good, url }, conversation), url).toBeNull();
    expect(cleanItem({ ...good, url: 'https://www.rba.gov.au/media-releases/x.html' }, rba)).not.toBeNull();
    expect(cleanItem({ ...good, url: 'https://www.rba.gov.au/x' }, conversation)).toBeNull();
  });
  it('is left out when its time is not one', () => {
    for (const at of ['', 'soon', '2026-13-45', null, 5, {}]) expect(cleanItem({ ...good, at }, conversation)).toBeNull();
  });
  it('is left out when its time is far from any real one', () => {
    for (const at of ['-010000-01-01T00:00:00Z', '0099-01-01T00:00:00Z', '1999-12-31T23:59:59Z', '2100-01-01T00:00:01Z', '+275760-09-13T00:00:00Z']) expect(cleanItem({ ...good, at }, conversation), at).toBeNull();
    expect(cleanItem({ ...good, at: '2000-01-01T00:00:00Z' }, conversation)).not.toBeNull();
  });
  it('is left out when a part is not words at all', () => {
    for (const part of [null, undefined, 5, true, {}, []]) {
      expect(cleanItem({ ...good, title: part }, conversation)).toBeNull();
      expect(cleanItem({ ...good, url: part }, conversation)).toBeNull();
    }
  });
});

describe('building the list', () => {
  it('holds what was read, newest first, with when it was checked', () => {
    const list = buildList(null, { conversation: [item(1, 'conversation', '2026-11-18T00:00:00Z'), item(2, 'conversation', '2026-11-19T00:00:00Z')], rba: [item(3, 'rba', '2026-11-18T12:00:00Z')] }, NOW)!;
    expect(list.format).toBe(1);
    expect(list.checked).toBe('2026-11-20T04:00:00Z');
    expect(list.items.map((i) => i.title)).toEqual(['Headline 2', 'Headline 3', 'Headline 1']);
  });
  it('keeps what an earlier list held, since a feed may hold only its latest', () => {
    const earlier: FeedList = { format: 1, checked: '2026-11-19T00:00:00Z', items: [item(1, 'rba', '2026-11-10T00:00:00Z')] };
    const list = buildList(earlier, { conversation: [], rba: [item(2, 'rba', '2026-11-19T00:00:00Z')] }, NOW)!;
    expect(list.items.map((i) => i.title)).toEqual(['Headline 2', 'Headline 1']);
  });
  it('holds a headline once, by its address, as it was last read', () => {
    const earlier: FeedList = { format: 1, checked: '2026-11-19T00:00:00Z', items: [{ ...item(1), title: 'Old words' }] };
    const list = buildList(earlier, { conversation: [{ ...item(1), title: 'New words' }], rba: [] }, NOW)!;
    expect(list.items).toHaveLength(1);
    expect(list.items[0]!.title).toBe('New words');
  });
  it('lets a headline go after thirty days, and one dated ahead of now is not taken', () => {
    expect(FEED.days).toBe(30);
    const list = buildList(null, { conversation: [item(1, 'conversation', '2026-10-21T04:00:01Z'), item(2, 'conversation', '2026-10-21T03:59:59Z'), item(3, 'conversation', '2026-11-22T00:00:00Z'), item(4, 'conversation', '2026-11-20T20:00:00Z')], rba: [] }, NOW)!;
    expect(list.items.map((i) => i.title)).toEqual(['Headline 4', 'Headline 1']);
  });
  it('holds the newest twenty of a source and sixty in all', () => {
    const many = (source: string) => Array.from({ length: 30 }, (_, n) => item(n, source, new Date(NOW.getTime() - (n + 1) * 3_600_000).toISOString()));
    const list = buildList(null, { conversation: many('conversation'), rba: many('rba') }, NOW)!;
    expect(list.items.filter((i) => i.source === 'conversation')).toHaveLength(FEED.perSource);
    expect(list.items.filter((i) => i.source === 'rba')).toHaveLength(FEED.perSource);
    expect(list.items.find((i) => i.source === 'rba' && i.title === 'Headline 19')).toBeTruthy();
    expect(list.items.find((i) => i.title === 'Headline 20')).toBeUndefined();
    expect(list.items.length).toBeLessThanOrEqual(FEED.max);
  });
  it('keeps a source’s earlier headlines when it could not be read', () => {
    const earlier: FeedList = { format: 1, checked: '2026-11-19T00:00:00Z', items: [item(1, 'rba', '2026-11-18T00:00:00Z'), item(2)] };
    const list = buildList(earlier, { conversation: [item(3)], rba: null }, NOW)!;
    expect(list.items.map((i) => i.title).sort()).toEqual(['Headline 1', 'Headline 2', 'Headline 3']);
  });
  it('notes when each source was last read', () => {
    const first = buildList(null, { conversation: [item(1)], rba: null }, NOW)!;
    expect(first.read).toEqual({ conversation: '2026-11-20T04:00:00Z' });
    const second = buildList(first, { conversation: null, rba: [item(2, 'rba')] }, new Date('2026-11-20T08:00:00Z'))!;
    expect(second.read).toEqual({ conversation: '2026-11-20T04:00:00Z', rba: '2026-11-20T08:00:00Z' });
  });
  it('is not built when nothing could be read', () => {
    const earlier: FeedList = { format: 1, checked: '2026-11-19T00:00:00Z', items: [item(1)] };
    expect(buildList(earlier, { conversation: null, rba: null }, NOW)).toBeNull();
    expect(buildList(earlier, {}, NOW)).toBeNull();
  });
  it('replaces, and never carries over, a source that may only be held for a time', () => {
    const on: FeedSource[] = [conversation, { ...guardian, on: true }];
    const g = (n: number): FeedItem => ({ title: `Guardian ${n}`, url: `https://www.theguardian.com/business/${n}`, source: 'guardian', at: '2026-11-19T10:00:00Z' });
    const earlier: FeedList = { format: 1, checked: '2026-11-19T00:00:00Z', items: [g(1), item(1)] };
    expect(buildList(earlier, { conversation: [], guardian: [g(2)] }, NOW, on)!.items.map((i) => i.title).sort()).toEqual(['Guardian 2', 'Headline 1']);
    // and when it could not be read, what was held from it goes
    expect(buildList(earlier, { conversation: [], guardian: null }, NOW, on)!.items.map((i) => i.title)).toEqual(['Headline 1']);
  });
  it('drops what belongs to a source that is not one of the list’s', () => {
    const earlier: FeedList = { format: 1, checked: '2026-11-19T00:00:00Z', items: [{ ...item(1), source: 'gone' }] };
    expect(buildList(earlier, { conversation: [item(2)] }, NOW)!.items.map((i) => i.title)).toEqual(['Headline 2']);
  });
});

describe('a published list, read back', () => {
  const file = { format: 1, checked: '2026-11-20T04:00:00Z', items: [item(1), item(2, 'rba')] };
  it('is kept when it is what it should be', () => {
    expect(readList(file)).toEqual(file);
    expect(readList(JSON.parse(JSON.stringify(buildList(null, { conversation: [item(1)], rba: [item(2, 'rba')] }, NOW))))!.items).toHaveLength(2);
  });
  it('is not one unless it is an object of this format with a list and a time', () => {
    for (const bad of [null, undefined, 4, 'x', [], {}, { ...file, format: 2 }, { ...file, format: '1' }, { ...file, items: 'no' }, { ...file, items: null }, { ...file, checked: 'whenever' }, { ...file, checked: 5 }, { ...file, checked: '-010000-01-01T00:00:00Z' }, { ...file, checked: '1999-01-01T00:00:00Z' }, { ...file, checked: '2101-01-01T00:00:00Z' }]) expect(readList(bad), JSON.stringify(bad)).toBeNull();
  });
  it('drops an item that is wrong in any part, and keeps the rest', () => {
    const wrong = [null, 5, 'x', [], {}, { ...item(3), source: 'nobody' }, { ...item(3), source: 5 }, { ...item(3), url: 'https://evil.example/a' }, { ...item(3), url: 'javascript:alert(1)' }, { ...item(3), title: '<img src=x onerror=alert(1)>'.repeat(10) }, { ...item(3), title: 7 }, { ...item(3), at: 'never' }, { ...item(3, 'rba'), source: 'conversation' }];
    expect(readList({ ...file, items: [...wrong, item(4)] })!.items.map((i) => i.title)).toEqual(['Headline 4']);
  });
  it('drops a source that is switched off, even when the list holds it', () => {
    const g = { title: 'Guardian', url: 'https://www.theguardian.com/business/1', source: 'guardian', at: '2026-11-19T10:00:00Z' };
    expect(guardian.on).toBe(false);
    expect(readList({ ...file, items: [g, item(1)] })!.items.map((i) => i.title)).toEqual(['Headline 1']);
    expect(readList({ ...file, items: [g] }, [{ ...guardian, on: true }])!.items).toHaveLength(1);
  });
  it('drops an item dated more than a day ahead, when it is told the time', () => {
    const ahead = { ...file, items: [item(1, 'conversation', '2026-11-21T03:00:00Z'), item(2, 'conversation', '2026-11-21T05:00:00Z'), item(3, 'conversation', '2027-01-01T00:00:00Z')] };
    expect(readList(ahead)!.items).toHaveLength(3);
    expect(readList(ahead, FEED_SOURCES, NOW)!.items.map((i) => i.title)).toEqual(['Headline 1']);
  });
  it('lets a headline go after thirty days, when it is told the time, so a list that stops being rebuilt still ages', () => {
    const old = { ...file, items: [item(1, 'conversation', '2026-10-21T04:00:01Z'), item(2, 'conversation', '2026-10-21T03:59:59Z'), item(3, 'conversation', '1999-01-01T00:00:00Z'), item(4, 'conversation', '2000-01-01T00:00:00Z')] };
    expect(readList(old)!.items.map((i) => i.title)).toEqual(['Headline 1', 'Headline 2', 'Headline 4']);
    expect(readList(old, FEED_SOURCES, NOW)!.items.map((i) => i.title)).toEqual(['Headline 1']);
  });
  it('holds twenty of a source and sixty in all, and each address once, however many it is given', () => {
    const many = (source: string) => Array.from({ length: 10_000 }, (_, n) => item(n, source));
    const g = (n: number): FeedItem => ({ title: `Guardian ${n}`, url: `https://www.theguardian.com/business/${n}`, source: 'guardian', at: '2026-11-19T10:00:00Z' });
    expect(readList({ ...file, items: many('conversation') })!.items).toHaveLength(FEED.perSource);
    expect(readList({ ...file, items: [...many('conversation'), ...many('rba')] })!.items).toHaveLength(2 * FEED.perSource);
    expect(readList({ ...file, items: [...many('conversation'), ...many('rba'), ...Array.from({ length: 50 }, (_, n) => g(n))] }, [conversation, rba, { ...guardian, on: true }])!.items).toHaveLength(FEED.max);
    expect(readList({ ...file, items: [item(1), item(1), item(1)] })!.items).toHaveLength(1);
  });
  it('keeps when each source was last read, for the sources it knows', () => {
    expect(readList({ ...file, read: { conversation: '2026-11-20T04:00:00Z', rba: 'never', nobody: '2026-11-20T04:00:00Z', guardian: '2026-11-20T04:00:00Z' } })!.read).toEqual({ conversation: '2026-11-20T04:00:00Z' });
    for (const read of [null, 5, 'x', [], { conversation: 5 }]) expect(readList({ ...file, read })!.read).toBeUndefined();
  });
  it('keeps only the three parts and the source of an item', () => {
    const extra = { ...item(1), html: '<b>x</b>', onclick: 'alert(1)', id: 'x' };
    expect(readList({ ...file, items: [extra], also: 'this' })).toEqual({ format: 1, checked: file.checked, items: [item(1)] });
  });
});

describe('a source that has gone quiet', () => {
  const at = new Date('2026-11-21T04:00:00Z'), list = (read: Record<string, string>): FeedList => ({ format: 1, checked: '2026-11-21T04:00:00Z', items: [], read });
  it('is one that has not been read for a day, or ever', () => {
    expect(quietSources(list({ conversation: '2026-11-21T04:00:00Z', rba: '2026-11-20T03:59:00Z' }), at, {})).toEqual(['Reserve Bank of Australia']);
    expect(quietSources(list({ conversation: '2026-11-21T04:00:00Z', rba: '2026-11-20T04:00:01Z' }), at, {})).toEqual([]);
    expect(quietSources(list({}), at, {})).toEqual(['The Conversation', 'Reserve Bank of Australia']);
    expect(quietSources({ format: 1, checked: '2026-11-21T04:00:00Z', items: [] }, at, {})).toEqual(['The Conversation', 'Reserve Bank of Australia']);
  });
  it('is not a source that is off, or one that needs a key it was not given', () => {
    const on: FeedSource[] = [conversation, { ...guardian, on: true }];
    expect(quietSources(list({ conversation: '2026-11-21T04:00:00Z' }), at, { GUARDIAN_KEY: 'a-key' })).toEqual(['Reserve Bank of Australia']);
    expect(quietSources(list({ conversation: '2026-11-21T04:00:00Z' }), at, {}, on)).toEqual([]);
    expect(quietSources(list({ conversation: '2026-11-21T04:00:00Z' }), at, { GUARDIAN_KEY: 'a-key' }, on)).toEqual(['The Guardian']);
  });
});

describe('the job', () => {
  const texts: Record<string, string> = { [conversation.feed]: ATOM, [rba.feed]: RDF };
  const reader = (answers: Record<string, string | Error>, asked: string[] = []) => async (url: string) => {
    asked.push(url);
    const answer = answers[url];
    if (answer === undefined || answer instanceof Error) throw answer ?? new Error('404');
    return answer;
  };
  it('reads every source that is on and builds the list', async () => {
    const asked: string[] = [], list = (await publish(null, reader(texts, asked), NOW, {}))!;
    expect(asked).toEqual([conversation.feed, rba.feed]);
    expect(list.items.map((i) => i.source)).toEqual(['conversation', 'conversation', 'rba']);
    expect(list.items[2]!.url).toBe('https://www.rba.gov.au/media-releases/2026/mr-26-31.html');
  });
  it('carries on when one source cannot be read, keeping what was held from it', async () => {
    const earlier = (await publish(null, reader(texts), NOW, {}))!;
    const list = (await publish(earlier, reader({ [conversation.feed]: ATOM, [rba.feed]: new Error('down') }), NOW, {}))!;
    expect(list.items.filter((i) => i.source === 'rba')).toHaveLength(1);
  });
  it('treats an answer that is not a feed as a source that could not be read', async () => {
    const earlier = (await publish(null, reader(texts), NOW, {}))!;
    const list = (await publish(earlier, reader({ [conversation.feed]: '<html>Sorry, try later</html>', [rba.feed]: RDF }), NOW, {}))!;
    expect(list.items.filter((i) => i.source === 'conversation')).toHaveLength(2);
  });
  it('builds nothing when no source can be read', async () => {
    expect(await publish(null, reader({}), NOW, {})).toBeNull();
  });
  it('does not ask the Guardian while it is off, key or no key', async () => {
    const asked: string[] = [];
    await publish(null, reader(texts, asked), NOW, { GUARDIAN_KEY: 'a-key' });
    expect(asked.some((u) => u.includes('guardian'))).toBe(false);
  });
  it('asks the Guardian only with a key once it is on, and the key is in nothing it writes', async () => {
    const on: FeedSource[] = [conversation, { ...guardian, on: true }];
    const answer = JSON.stringify({ response: { status: 'ok', results: [{ webPublicationDate: '2026-11-19T08:00:00Z', webTitle: 'Markets steady', webUrl: 'https://www.theguardian.com/business/2026/nov/19/x' }] } });
    const none: string[] = [];
    await publish(null, reader(texts, none), NOW, {}, on);
    expect(none).toEqual([conversation.feed]);
    const asked: string[] = [], list = (await publish(null, async (url) => { asked.push(url); return url.startsWith('https://content.guardianapis.com/') ? answer : ATOM; }, NOW, { GUARDIAN_KEY: 'a secret key' }, on))!;
    expect(asked[1]).toBe(`${guardian.feed}&api-key=a%20secret%20key`);
    expect(list.items.map((i) => i.source)).toContain('guardian');
    expect(JSON.stringify(list)).not.toContain('secret');
  });
});

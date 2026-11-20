import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FEED, type FeedList } from '../domain/feeds';
import { storedSettings } from '../domain/stored';
import { FETCHED_URL, forgetFetched, leavePage, loadHeld, refreshFetched, setFetchedDeps, useFetched } from './fetched';
import { backupData, dataOf, useCompass } from './store';

const s = () => useCompass.getState(), f = () => useFetched.getState();
const LIST: FeedList = { format: 1, checked: '2026-11-20T04:00:00Z', items: [{ title: 'A headline', url: 'https://theconversation.com/a-1', source: 'conversation', at: '2026-11-19T19:05:25Z' }] };

/** What a browser's storage does, kept in a plain object. */
function memory(start: Record<string, string> = {}) {
  const kept = { ...start };
  return { kept, getItem: (k: string) => kept[k] ?? null, setItem: (k: string, v: string) => { kept[k] = v; }, removeItem: (k: string) => { delete kept[k]; } };
}

/** A stand-in for the network: it answers with what it is given, and writes down what it was asked. */
function network(answer: () => Promise<Response> | Response) {
  const asked: { url: string; init: RequestInit | undefined }[] = [];
  const fetch = (async (url: string, init?: RequestInit) => { asked.push({ url, init }); return await answer(); }) as unknown as typeof globalThis.fetch;
  return { asked, fetch };
}
const ok = (body: unknown) => () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status: 200 });

let clock = Date.parse('2026-11-20T05:00:00Z'), store = memory();
beforeEach(() => {
  s().clearAll();
  s().setSettings({ headlines: false });
  forgetFetched();
  clock = Date.parse('2026-11-20T05:00:00Z');
  store = memory();
  setFetchedDeps({ now: () => new Date(clock), storage: store, fetch: network(ok(LIST)).fetch });
});

describe('the switch', () => {
  it('is off to start, and is kept as a setting', () => {
    expect(backupData({}).settings.headlines).toBeUndefined();
    expect(storedSettings({ headlines: true }).headlines).toBe(true);
    expect(storedSettings({ headlines: 'yes' }).headlines).toBeUndefined();
    expect(storedSettings({}).headlines).toBeUndefined();
  });
  it('is this device\'s own: restoring a backup neither turns it on nor off, and Undo leaves it too', () => {
    s().setSettings({ headlines: true });
    const on = JSON.parse(JSON.stringify(dataOf(s())));
    s().setSettings({ headlines: false });
    const before = s().restoreBackup(on);
    expect(s().settings.headlines).toBeFalsy();
    s().undoRestore(before);
    expect(s().settings.headlines).toBeFalsy();
    s().setSettings({ headlines: true });
    s().restoreBackup({ ...on, settings: { ...on.settings, headlines: false } });
    expect(s().settings.headlines).toBe(true);
    const { headlines: _none, ...without } = on.settings;
    s().restoreBackup({ ...on, settings: without });
    expect(s().settings.headlines).toBe(true);
  });
  it('travels in a backup, and outlasts clearing everything as the Fitness switch does', () => {
    s().setSettings({ headlines: true });
    expect(backupData(JSON.parse(JSON.stringify(dataOf(s())))).settings.headlines).toBe(true);
    s().clearAll();
    expect(s().settings.headlines).toBe(true);
    s().setSettings({ headlines: false });
    s().clearAll();
    expect(s().settings.headlines).toBeFalsy();
  });
});

describe('asking for the list', () => {
  it('asks for nothing while the switch is off', async () => {
    const net = network(ok(LIST));
    setFetchedDeps({ fetch: net.fetch });
    await refreshFetched();
    await refreshFetched(true);
    expect(net.asked).toEqual([]);
    expect(f().list).toBeNull();
  });
  it('asks once it is on: a plain download, with no cookies and no referrer', async () => {
    const net = network(ok(LIST));
    setFetchedDeps({ fetch: net.fetch });
    s().setSettings({ headlines: true });
    await refreshFetched();
    expect(net.asked).toHaveLength(1);
    expect(net.asked[0]!.url).toBe(FETCHED_URL);
    expect(new URL(FETCHED_URL).search).toBe('');
    expect(net.asked[0]!.init).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' });
    expect(net.asked[0]!.init!.method ?? 'GET').toBe('GET');
    expect(net.asked[0]!.init!.body).toBeUndefined();
    expect(net.asked[0]!.init!.headers).toBeUndefined();
    expect(f().list).toEqual(LIST);
    expect(f().failed).toBe(false);
  });
  it('asks again only after thirty minutes, unless it is made to', async () => {
    const net = network(ok(LIST));
    setFetchedDeps({ fetch: net.fetch });
    s().setSettings({ headlines: true });
    await refreshFetched();
    clock += 29 * 60_000;
    await refreshFetched();
    expect(net.asked).toHaveLength(1);
    clock += 60_000;
    await refreshFetched();
    expect(net.asked).toHaveLength(2);
    await refreshFetched(true);
    expect(net.asked).toHaveLength(3);
  });
  it('remembers a failed asking across openings, and tries again after five minutes', async () => {
    const net = network(() => new Response('Not Found', { status: 404 }));
    setFetchedDeps({ fetch: net.fetch });
    s().setSettings({ headlines: true });
    await refreshFetched();
    expect(net.asked).toHaveLength(1);
    // Compass is closed and opened again: what was in memory goes, and what is on the device is taken up
    const reopen = () => { useFetched.setState({ list: null, failed: false, askedAt: 0 }); loadHeld(); };
    reopen();
    expect(f().failed).toBe(true);
    await refreshFetched();
    clock += 4 * 60_000 + 59_000;
    reopen();
    await refreshFetched();
    expect(net.asked).toHaveLength(1);
    clock += 1000;
    reopen();
    await refreshFetched();
    expect(net.asked).toHaveLength(2);
  });
  it('does not count an asking cut short by leaving the page as one that failed', async () => {
    // the browser drops a request when its page goes, which looks to the page like the network failing
    let fail: (e: Error) => void = () => {};
    const net = network(() => new Promise<Response>((_, reject) => { fail = reject; }));
    setFetchedDeps({ fetch: net.fetch });
    s().setSettings({ headlines: true });
    const asking = refreshFetched();
    leavePage();
    fail(new TypeError('Failed to fetch'));
    await asking;
    expect(f()).toMatchObject({ list: null, failed: false, askedAt: 0 });
    expect(store.kept['compass:fetched']).toBeUndefined();
    // so the next opening asks straight away
    setFetchedDeps({ fetch: network(ok(LIST)).fetch });
    await refreshFetched();
    expect(f().list).toEqual(LIST);
  });
  it('asks when the last asking is dated ahead of the clock, as after a clock that was wrong is put right', async () => {
    const net = network(ok(LIST));
    setFetchedDeps({ fetch: net.fetch, storage: memory({ 'compass:fetched': JSON.stringify({ list: LIST, askedAt: clock + 365 * 86_400_000 }) }) });
    s().setSettings({ headlines: true });
    loadHeld();
    expect(f().list).toEqual(LIST);
    await refreshFetched();
    expect(net.asked).toHaveLength(1);
  });
  it('keeps what it read on the device, apart from the saved data', async () => {
    s().setSettings({ headlines: true });
    await refreshFetched();
    expect(JSON.parse(store.kept['compass:fetched']!).list).toEqual(LIST);
    expect(JSON.stringify(dataOf(s()))).not.toContain('A headline');
  });
});

describe('an answer that is no good', () => {
  const bad: [string, () => Promise<Response> | Response][] = [
    ['the network is down', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['it is not found', () => new Response('Not Found', { status: 404 })],
    ['it is not JSON', ok('<html>Sorry</html>')],
    ['it is not a list', ok({ format: 2, items: [] })],
    ['it is far too long', ok(JSON.stringify({ ...LIST, padding: 'x'.repeat(FEED.chars) }))],
  ];
  for (const [name, answer] of bad) {
    it(`leaves the list from before when ${name}, and says it failed`, async () => {
      s().setSettings({ headlines: true });
      await refreshFetched();
      setFetchedDeps({ fetch: network(answer).fetch });
      await refreshFetched(true);
      expect(f().list).toEqual(LIST);
      expect(f().failed).toBe(true);
    });
  }
  it('with nothing held, there is no list and it says it failed', async () => {
    setFetchedDeps({ fetch: network(() => Promise.reject(new Error('offline'))).fetch });
    s().setSettings({ headlines: true });
    await refreshFetched();
    expect(f().list).toBeNull();
    expect(f().failed).toBe(true);
  });
  it('is forgiven by the next good one', async () => {
    setFetchedDeps({ fetch: network(() => Promise.reject(new Error('offline'))).fetch });
    s().setSettings({ headlines: true });
    await refreshFetched();
    setFetchedDeps({ fetch: network(ok(LIST)).fetch });
    await refreshFetched(true);
    expect(f()).toMatchObject({ list: LIST, failed: false });
  });
  it('keeps only what is a headline from a list that is partly wrong', async () => {
    const mixed = { ...LIST, items: [...LIST.items, { title: 'Elsewhere', url: 'https://evil.example/x', source: 'conversation', at: LIST.items[0]!.at }, { title: 'Script', url: 'javascript:alert(1)', source: 'conversation', at: LIST.items[0]!.at }, { title: 'Off', url: 'https://www.theguardian.com/business/1', source: 'guardian', at: LIST.items[0]!.at }] };
    setFetchedDeps({ fetch: network(ok(mixed)).fetch });
    s().setSettings({ headlines: true });
    await refreshFetched();
    expect(f().list!.items).toEqual(LIST.items);
  });
});

describe('switching it off', () => {
  it('forgets the list at once, on the device too', async () => {
    s().setSettings({ headlines: true });
    await refreshFetched();
    s().setSettings({ headlines: false });
    forgetFetched();
    expect(f()).toMatchObject({ list: null, failed: false });
    expect(store.kept['compass:fetched']).toBeUndefined();
  });
  it('throws away an answer that was on its way', async () => {
    let answer: (r: Response) => void = () => {};
    setFetchedDeps({ fetch: network(() => new Promise<Response>((resolve) => { answer = resolve; })).fetch });
    s().setSettings({ headlines: true });
    const asking = refreshFetched();
    s().setSettings({ headlines: false });
    forgetFetched();
    answer(new Response(JSON.stringify(LIST), { status: 200 }));
    await asking;
    expect(f().list).toBeNull();
    expect(store.kept['compass:fetched']).toBeUndefined();
  });
});

describe('a browser that will not let its storage be looked at', () => {
  it('still opens Compass: reading the storage is refused there, not only writing to it', async () => {
    const before = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new DOMException('Access is denied for this document.', 'SecurityError'); } });
    vi.resetModules();
    try {
      const fresh = await import('./fetched');
      expect(() => fresh.loadHeld()).not.toThrow();
      expect(() => fresh.forgetFetched()).not.toThrow();
    } finally {
      if (before) Object.defineProperty(globalThis, 'localStorage', before); else delete (globalThis as { localStorage?: unknown }).localStorage;
      vi.resetModules();
    }
  });
});

describe('the list held from last time', () => {
  it('is taken up when Compass opens with the switch on, checked as a fresh one is', () => {
    const tampered = { ...LIST, items: [...LIST.items, { title: 'Elsewhere', url: 'https://evil.example/x', source: 'conversation', at: LIST.items[0]!.at }] };
    setFetchedDeps({ storage: memory({ 'compass:fetched': JSON.stringify({ list: tampered, askedAt: clock - 1000 }) }) });
    s().setSettings({ headlines: true });
    loadHeld();
    expect(f().list).toEqual(LIST);
    expect(f().askedAt).toBe(clock - 1000);
  });
  it('has lost what grew too old while it was held', () => {
    const old = { ...LIST, items: [...LIST.items, { title: 'Long ago', url: 'https://theconversation.com/old', source: 'conversation', at: '2026-10-01T00:00:00Z' }] };
    setFetchedDeps({ storage: memory({ 'compass:fetched': JSON.stringify({ list: old, askedAt: clock }) }) });
    s().setSettings({ headlines: true });
    loadHeld();
    expect(f().list!.items).toEqual(LIST.items);
  });
  it('is left alone while the switch is off, and is nothing when it cannot be read', () => {
    setFetchedDeps({ storage: memory({ 'compass:fetched': JSON.stringify({ list: LIST, askedAt: clock }) }) });
    loadHeld();
    expect(f().list).toBeNull();
    for (const text of ['not json', '5', 'null', '{"list":7}', '{"askedAt":"x"}']) {
      setFetchedDeps({ storage: memory({ 'compass:fetched': text }) });
      s().setSettings({ headlines: true });
      expect(() => loadHeld()).not.toThrow();
      expect(f().list).toBeNull();
    }
  });
  it('does not stop Compass when the device will not let anything be kept', async () => {
    const refusing = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); }, removeItem: () => { throw new Error('denied'); } };
    setFetchedDeps({ storage: refusing });
    s().setSettings({ headlines: true });
    expect(() => loadHeld()).not.toThrow();
    await refreshFetched();
    expect(f().list).toEqual(LIST);
    expect(() => forgetFetched()).not.toThrow();
  });
});

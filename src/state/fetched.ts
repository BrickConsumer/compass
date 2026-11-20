import { create } from 'zustand';
import { heldList } from '../domain/fetched';
import { FEED, FEED_SOURCES, FEED_URL, type FeedList, readList } from '../domain/feeds';
import { useCompass } from './store';

/**
 * The fetched list of headlines, held apart from everything a student keeps.
 *
 * It is the one thing Compass asks of anywhere, and it asks only while "Fetch headlines" is switched on. The request
 * is a plain download of a public file: it carries no cookies, no referrer and nothing about the device or what is
 * on it. What comes back is checked as the job that wrote it checked it, since a file over a network is not taken
 * on trust. The list is not in the saved data, so it is not in a backup and is not found by search.
 */

/** Where the list is asked for. */
export const FETCHED_URL = FEED_URL;
const KEY = 'compass:fetched';
/** The list is rebuilt every four hours, so asking more often than this would only be asking. */
const EVERY = 30 * 60_000;
/** After an asking that brought no list, it is asked for again sooner. */
const AFTER_FAILING = 5 * 60_000;
/** How long an answer is waited for. */
const PATIENCE = 10_000;

interface Fetched {
  list: FeedList | null;
  /** The last asking did not bring a list. What was held before is still shown. */
  failed: boolean;
  /** When the list was last asked for, on this device's clock. */
  askedAt: number;
}

export const useFetched = create<Fetched>(() => ({ list: null, failed: false, askedAt: 0 }));

type Storage = { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void; removeItem: (key: string) => void };
/** The browser's storage, or nothing. A browser that blocks site data refuses even to hand it over, so asking for it is tried, not assumed. */
function deviceStorage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}
interface Deps { fetch: typeof globalThis.fetch; now: () => Date; storage: Storage | null }
const deps: Deps = {
  fetch: (...args) => globalThis.fetch(...args),
  now: () => new Date(),
  storage: deviceStorage(),
};
/** For tests: stand-ins for the network, the clock and the device's storage. */
export const setFetchedDeps = (patch: Partial<Deps>): void => { Object.assign(deps, patch); };

const on = (): boolean => useCompass.getState().settings.headlines === true;
// each asking has a number, so an answer that comes back after the switch went off, or after a later asking, is thrown away
let asking = 0;
// while an asking is on its way: when the list had last been asked for before it
let onItsWay: { before: number } | null = null;

/** Keep what is held, and when it was asked for, so that the next opening does not ask again too soon. */
function keep(): void {
  const { list, failed, askedAt } = useFetched.getState();
  try { deps.storage?.setItem(KEY, JSON.stringify({ list, failed, askedAt })); } catch { /* a device that will not keep it still shows it */ }
}

/** Take up what was held from last time, when the switch is on. The list is checked as a fresh one is. */
export function loadHeld(): void {
  if (!on()) return;
  try {
    const held: unknown = JSON.parse(deps.storage?.getItem(KEY) ?? 'null');
    if (!held || typeof held !== 'object') return;
    const { list, askedAt, failed } = held as { list?: unknown; askedAt?: unknown; failed?: unknown }, now = deps.now();
    const read = heldList(readList(list, FEED_SOURCES, now), now), asked = typeof askedAt === 'number' && Number.isFinite(askedAt) ? askedAt : 0;
    // with neither a list nor a time it was asked for, there is nothing here to take up
    if (read || asked) useFetched.setState({ list: read, failed: failed === true, askedAt: asked });
  } catch { /* nothing held, or nothing that can be read */ }
}

/**
 * Ask for the list, when the switch is on and it has not been asked for in the last half hour, or the last five
 * minutes after an asking that failed. `force` asks anyway. An answer that is not a list, is too long, or does not
 * come changes nothing but `failed`.
 */
export async function refreshFetched(force = false): Promise<void> {
  if (!on()) return;
  const now = deps.now(), at = now.getTime(), { askedAt, failed } = useFetched.getState(), since = at - askedAt;
  // a last asking dated ahead of the clock is one from a clock that was wrong, and holds nothing up
  if (!force && since >= 0 && since < (failed ? AFTER_FAILING : EVERY)) return;
  const mine = ++asking;
  onItsWay = { before: askedAt };
  useFetched.setState({ askedAt: at });
  let list: FeedList | null = null;
  try {
    const answer = await deps.fetch(FETCHED_URL, { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: AbortSignal.timeout(PATIENCE) });
    if (!answer.ok) throw new Error('no list');
    const text = await answer.text();
    if (text.length > FEED.chars) throw new Error('too long');
    list = heldList(readList(JSON.parse(text), FEED_SOURCES, now), now);
  } catch { list = null; }
  if (mine !== asking || !on()) return;
  onItsWay = null;
  if (list) useFetched.setState({ list, failed: false });
  else useFetched.setState((s) => ({ list: heldList(s.list, now), failed: true }));
  keep();
}

/**
 * The page is going: it is being closed, reloaded or left. The browser drops a request that is on its way, which
 * looks to the page like the network failing. It is not that, so the asking is put aside as though it had not been
 * made, and the next opening asks straight away.
 */
export function leavePage(): void {
  if (!onItsWay) return;
  asking++;
  useFetched.setState({ askedAt: onItsWay.before });
  onItsWay = null;
}

/** Forget the list, here and on the device, and throw away any answer still on its way. */
export function forgetFetched(): void {
  asking++;
  onItsWay = null;
  useFetched.setState({ list: null, failed: false, askedAt: 0 });
  try { deps.storage?.removeItem(KEY); } catch { /* nothing to remove */ }
}

/**
 * Start looking after the list: take up what was held, ask for a fresh one, and from then on follow the switch and
 * ask again when the tab is looked at. Called once, when Compass opens.
 */
export function startFetched(): void {
  loadHeld();
  void refreshFetched();
  let was = on();
  useCompass.subscribe(() => {
    const now = on();
    if (now === was) return;
    was = now;
    if (now) { loadHeld(); void refreshFetched(true); } else forgetFetched();
  });
  window.addEventListener('pagehide', leavePage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !on()) return;
    useFetched.setState((s) => ({ list: heldList(s.list, deps.now()) }));
    void refreshFetched();
  });
}

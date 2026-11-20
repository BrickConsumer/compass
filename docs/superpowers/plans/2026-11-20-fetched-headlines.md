# Fetched Headlines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Headlines that arrive by themselves: a scheduled job publishes one public list, and each device downloads it and picks three for Home, with nothing about the student sent anywhere.

**Architecture:** One module with no imports, `src/domain/feeds.ts`, holds the sources and every rule about the list, and is used by both the job (plain Node, no dependencies) and the app. The app keeps the fetched list in a small store of its own, apart from the saved data, and picks from saved and fetched together with pure functions in `src/domain/fetched.ts`.

**Tech Stack:** TypeScript 7, React 19, Zustand 5, Vitest 5, Playwright 1.65, Node 26 (runs `.ts` directly), GitHub Actions.

**Spec:** [docs/fetched-headlines-spec.md](../../fetched-headlines-spec.md)

## Global Constraints

- With the switch off, no request leaves the device and every existing test passes unchanged.
- Nothing kept on the device is ever sent: the request has no cookies, no referrer and no query.
- A title is never altered or cut. One over 140 characters is left out.
- An address is `https` and on its source's own site, or the item is left out. Checked by the job and again by the app.
- The fetched list is not in `compass:v1`, not in a backup and not in search.
- Colour roles only in components (`src/design/roles.test.ts`). Controls are 44 px tall on a phone.
- The repository is public: no key, no founder's detail, in any file.
- The job writes only to the branch `headlines`.

## Review Focus

- A hostile list: markup in a title, a `javascript:` or off-site address, a wrong type in every field, 10,000 items. Expected: bad items dropped, Compass opens, nothing but a publisher's site can be opened.
- Offline, a slow answer, a 404, an answer that is not JSON. Expected: the list from before stays, and the page says so.
- Watch words with characters that mean something in a pattern: `C++`, `A.B`, `(x)`, `*`. Expected: matched as written, and no error.
- The day boundary: a headline published late yesterday in UTC. Expected: "today" and "yesterday" follow the device's clock.
- The switch turned off while a request is in flight. Expected: its answer is thrown away.

---

### Task 1: The list's rules, shared by the job and the app

**Files:** Create `src/domain/feeds.ts`, `src/domain/feeds.test.ts`.

**Interfaces (produces):**

```ts
export const FEED = { format: 1, title: 140, days: 30, perSource: 20, max: 60, chars: 200_000 } as const;
export interface FeedSource { id: string; name: string; host: string; feed: string; licence: string; on: boolean; keepHours?: number; keep: boolean }
export const FEED_SOURCES: readonly FeedSource[];            // conversation, rba, guardian (on: false)
export interface FeedItem { title: string; url: string; source: string; at: string }
export interface FeedList { format: 1; checked: string; items: FeedItem[] }
export function parseFeed(xml: string): { title: string; url: string; at: string }[];   // Atom entries and RSS items
export function guardianItems(json: unknown): { title: string; url: string; at: string }[];
export function cleanItem(raw: { title: unknown; url: unknown; at: unknown }, source: FeedSource): FeedItem | null;
export function buildList(previous: FeedList | null, read: Record<string, FeedItem[] | null>, now: Date): FeedList | null; // null when nothing was read
export function readList(value: unknown, sources?: readonly FeedSource[]): FeedList | null;  // what the app keeps of a published file
```

- [x] Tests first: Atom and RSS 1.0 samples; entities and CDATA decoded; a title over 140 left out; `http:`, another host and a look-alike host (`theconversation.com.evil.example`) left out; 30 days; newest 20 a source and 60 in all; once by address; a source that failed keeps its earlier items; none read gives null; a `keepHours` source is replaced, never carried over; `readList` with a wrong type in every field, an unknown source, a source that is off.
- [x] Implement, with string scanning and no nested quantifiers.

### Task 2: The job

**Files:** Create `scripts/publish-headlines.mjs`, `scripts/push-headlines.sh`, `.github/workflows/headlines.yml`. Test in `src/domain/feeds.test.ts` through `publish`.

**Interfaces (produces):** `export async function publish(previous: FeedList | null, fetchText: (url: string) => Promise<string>, now: Date, env: { GUARDIAN_KEY?: string }): Promise<FeedList | null>` in `feeds.ts`.

- [x] Tests first: every source read; one failing keeps its earlier items; all failing gives null; the Guardian not asked while it is off, asked only with a key once it is on, and the key never in the list.
- [x] The script reads the earlier file if there is one, calls `publish` with `fetch`, writes the file, and exits 1 when nothing was read.
- [x] The workflow: every four hours and by hand; `contents: write`; checks out `main`, then the `headlines` branch (made if missing); commits only `headlines.json`.
- [x] Run the script here against the real feeds and read what it writes.
- [x] Run `push-headlines.sh` against a throwaway repository: a first run, a second, and one with nothing changed.

### Task 3: Picking, on the device

**Files:** Create `src/domain/fetched.ts`, `src/domain/fetched.test.ts`.

**Interfaces (produces):**

```ts
export const WATCH = { max: 40, min: 2, word: 40, days: 7 } as const;
export function watchWords(pages: Page[]): string[];
export function namedIn(title: string, words: string[]): string | null;       // the word it names
export interface Shown { key: string; kind: 'saved' | 'fetched'; id?: string; title: string; url: string; source: string; date: ISODate; at: string; word: string | null; tag: string; keep: boolean }
export function shownHeadlines(saved: Headline[], list: FeedList | null, words: string[], today: ISODate): Shown[];   // every one, in Home's order
export function fetchedRows(saved: Headline[], list: FeedList | null, words: string[]): Shown[];                      // the page's "Fetched", newest first
export function updatedWords(checked: string | null, failed: boolean, now: Date, today: ISODate): string;
export const dayWords: (date: ISODate, today: ISODate) => string;             // today, yesterday, 18 Nov, 18 Nov 2025
```

- [x] Tests first: the order rules in the spec's "Home"; a fetched one also saved shows once; the capitals rule; pattern characters; the 7 days; the device's day for `at`; every row of the states table.

### Task 4: The switch and the fetched store

**Files:** Modify `src/domain/types.ts` (`Settings.headlines?: boolean`), `src/domain/stored.ts`. Create `src/state/fetched.ts`, `src/state/fetched.test.ts`.

**Interfaces (produces):** `FETCHED_URL`, `useFetched` (`{ list, failed, askedAt }`), `refreshFetched(force?)`, `forgetFetched()`; cache key `compass:fetched`.

- [x] Tests first, with `fetch` replaced: off asks for nothing; on asks once, with no credentials and no referrer; again only after 30 minutes; a failure keeps the list; a bad answer keeps the list; off forgets it and throws away an answer in flight; a list held past a `keepHours` loses that source's items.

### Task 5: The pages

**Files:** Modify `src/features/home/HomeHeadlines.tsx`, `src/features/pages/Headlines.tsx`, `src/features/places/SettingsPage.tsx`, `src/state/store.ts` ("Clear everything" and a restored backup both leave the switch as it was), `src/main.tsx` (ask when it opens and when the tab is looked at).

- [x] Settings: "Headlines", the switch (`#fetch-headlines`), its words. `/settings#headlines` goes to it.
- [x] Home: the one list, the corner's words, "All headlines".
- [x] The page: "Fetched" (`[data-fetched]`), "Keep", the watch words, the credits, the states, the line with the switch off.

### Task 6: Browser tests

**Files:** Create `tests/e2e/fetched-headlines.spec.ts`. The list is supplied with `page.route(FETCHED_URL, …)`.

- [x] Off: no request, and the pages as they were. On: one request, the rows on Home and the page, Keep and Undo, the Watchlist's order and label, each state in the table, a hostile list, 390 and 320 px with no sideways scroll, the dark theme, the keyboard alone.

### Task 7: Finish

- [x] Every suite: unit, browser in light and dark, and the CI way.
- [x] Pictures in `docs/screenshots/fetched-headlines/`.
- [x] A fresh reviewer reads the whole change. Each finding fixed with a test that failed first: the specification's section 12 lists them.
- [x] `scripts/take-headlines.sh` and `scripts/headlines-job.test.ts` added in that pass, with the job's fourth step.
- [x] The spec's "As built", the testing report, HANDOFF and next-stages.

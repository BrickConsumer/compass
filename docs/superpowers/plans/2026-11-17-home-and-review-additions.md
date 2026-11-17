# Home and Weekly Review Additions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a greeting, a long-term goal and quick links to Home, and ratings and week-by-week subject levels to the Weekly review, so that Home follows what the review sets.

**Architecture:** New pure rules in `src/domain/` (levels, ratings, links, greeting), each unit-tested first. The Zustand store gains three lists (`links`, `areas`, `levels`) and the actions that change them; older saves get defaults in `merge`. Pages read the store through the domain functions, as every existing page does. Nothing is fetched from anywhere.

**Tech Stack:** React 19.3, TypeScript 7.0, React Router 8.5, Zustand 5.1, date-fns 4.4, Lucide React 1.73, Tailwind CSS 4.3, Motion 14.14, Vitest 5.1, Playwright 1.65.

**Spec:** [docs/home-and-review-additions-spec.md](../../home-and-review-additions-spec.md). Read it first. Section numbers below refer to it. The pictures it embeds are in `docs/screenshots/additions/`. House rules are in [docs/HANDOFF.md](../../HANDOFF.md), section 5.

## Global Constraints

- **Do not commit or push without Oliver's approval.** No destructive git. Tasks end in a checkpoint, not a commit; Task 10 asks for the commit.
- A new user's Home is unchanged: with no name, goal, links or levels, nothing new is shown at any width. The sample has none of them.
- Limits: name 30 characters, goal 60, link name 24, area name 24, six links, six areas, ratings whole numbers 1 to 10.
- No total or average of ratings is worked out or shown. No reminder to review.
- Compass fetches nothing from a link: no icon, no preview, no check.
- Colours, type and radii only from the tokens in `src/design/tokens.css`. No hex values in components (subject dots use `SUBJECT_COLOURS`, as now). Nothing below 12.5 px. Sentence case. No exclamation marks.
- Italic is used for "Bound for" and nowhere else new (the chart rule, art direction section 6).
- Every new control is at least 44 px tall on phones, works by keyboard, and has a spoken name.
- Nothing new moves except a rating segment's fill (140 ms, none under reduced motion). Motion components use `m` from `motion/react-m`.
- Delete uses an Undo toast (`toast(message, { label: 'Undo', run })`), never a confirmation.
- Text boxes whose value is tidied on the way in use `DraftInput` from `src/ui/DraftField.tsx`.
- British English. Copy is exactly as the spec gives it.
- Every existing unit and browser test passes unchanged.
- Commands: `npm test` (unit), `npm run build` (types and build), `PW_CHANNEL=chrome npm run test:e2e` (browser; starts its own server on 5174).

## Review Focus

- **A pasted address that is not a web page** (`javascript:alert(1)`, `mailto:a@b.c`, `ftp://x.y`, a bare word, text with spaces): refused, and never rendered as a link. Tested in Task 4.
- **A subject deleted while it has a level, then Undo:** Home never names a missing subject, and the level is back after Undo. Tested in Task 2.
- **The week's first day changed after levels were set:** the levels are still found, marked as carried over. Tested in Task 2.
- **A name, goal or link name of 200 characters, or only spaces:** cut to its limit or treated as not set; the plate never grows past 420 px. Tested in Tasks 1 and 5.
- **A review holding only ratings whose areas are then removed:** it is not listed as saved, nothing throws, and Undo brings it back. Tested in Task 3.

---

### Task 0: A clean place to work

The fittings work is committed on `boat-fittings` (`641255f`). Another chat has been working in this folder, so this piece is built in a worktree of its own.

- [x] **Step 1:** Use superpowers:using-git-worktrees to make a worktree on a new branch `home-review-additions` cut from `boat-fittings`. Confirm first that `git status --short` in the main checkout lists only the four untracked items in step 2. If it lists anything else, stop and ask.
- [x] **Step 2:** Move these untracked files from the main checkout to the same paths in the worktree: `docs/home-and-review-additions-spec.md`, `docs/screenshots/additions/`, `docs/superpowers/plans/2026-11-17-home-and-review-additions.md`.
- [x] **Step 3:** In the worktree run `npm ci`, then `npm test`, `npm run build` and `PW_CHANNEL=chrome npm run test:e2e`. Expected: all pass. Write down the two test counts; they are the baseline for "passes unchanged".

### Task 1: Records and the saved data

**Files:**
- Modify: `src/domain/types.ts`, `src/domain/seed.ts`, `src/state/store.ts`
- Create: `src/domain/ratings.ts`
- Test: `src/state/store.test.ts`

**Interfaces:**
- Produces, in `types.ts`: `type Level = 'high' | 'medium' | 'normal'`; `type Levels = Record<ISODate, Record<string, Level>>` (week start, then subject id); `interface QuickLink { id: string; name: string; url: string }`; `interface RatingArea { id: string; name: string }`; `Settings.name?: string`; `Boat.boundFor?: string`; `Review.ratings?: Record<string, number>` (area id to 1..10).
- Produces, in `ratings.ts`: `AREA_LIMITS = { max: 6, name: 24 }`; `DEFAULT_AREAS: RatingArea[]` with ids and names `area-study` Study, `area-health` Health, `area-sleep` Sleep, `area-discipline` Discipline.
- Produces, in `seed.ts`: `CompassData` gains `links: QuickLink[]`, `areas: RatingArea[]`, `levels: Levels`.
- Produces, in the store: `setSettings({ name })` and `setBoat({ boundFor })` tidy their text.

- [x] **Step 1: Write the failing tests** in `store.test.ts`

```ts
it('starts with nothing set and the four starting areas', () => {
  expect(s().settings.name).toBeUndefined(); expect(s().boat.boundFor).toBeUndefined();
  expect(s().links).toEqual([]); expect(s().levels).toEqual({});
  expect(s().areas.map((a) => a.name)).toEqual(['Study', 'Health', 'Sleep', 'Discipline']);
  expect(s().reviews[0]!.ratings).toEqual({ 'area-study': 7, 'area-health': 6, 'area-sleep': 5, 'area-discipline': 7 });
});
it('tidies a name and a goal, and clears them when emptied', () => {
  s().setSettings({ name: `  ${'A'.repeat(200)}  ` }); expect(s().settings.name).toHaveLength(30);
  s().setSettings({ name: '   ' }); expect(s().settings.name).toBeUndefined();
  s().setBoat({ boundFor: '  97+   ATAR ' }); expect(s().boat.boundFor).toBe('97+ ATAR');
  s().setBoat({ boundFor: 'x'.repeat(200) }); expect(s().boat.boundFor).toHaveLength(60);
  s().setBoat({ boundFor: '' }); expect(s().boat.boundFor).toBeUndefined();
  expect(s().boat.name).toBe('The Kestrel');
});
it('opens a save from before this piece with nothing lost', () => {
  const old = JSON.parse(JSON.stringify({ ...s(), sample: false }));
  for (const key of ['links', 'areas', 'levels']) delete old[key];
  const merged = useCompass.persist.getOptions().merge!(old, s()) as ReturnType<typeof s>;
  expect(merged.tasks).toHaveLength(s().tasks.length);
  expect(merged.links).toEqual([]); expect(merged.levels).toEqual({}); expect(merged.areas).toEqual(DEFAULT_AREAS);
});
it('falls back when the new lists are unreadable', () => {
  const bad = { ...JSON.parse(JSON.stringify(s())), links: 'x', areas: null, levels: [] };
  const merged = useCompass.persist.getOptions().merge!(bad, s()) as ReturnType<typeof s>;
  expect(merged.links).toEqual([]); expect(merged.areas).toEqual(DEFAULT_AREAS); expect(merged.levels).toEqual({});
});
it('clears the name and the goal with everything else', () => {
  s().setSettings({ name: 'Aditya' }); s().setBoat({ boundFor: 'Law' }); s().clearAll();
  expect(s().settings.name).toBeUndefined(); expect(s().boat.boundFor).toBeUndefined(); expect(s().areas).toEqual(DEFAULT_AREAS);
});
```

- [x] **Step 2:** Run `npx vitest run src/state/store.test.ts`. Expected: the five new tests fail.
- [x] **Step 3: Implement.** Add the types. `seed()` and `empty()` return `links: []`, `areas: DEFAULT_AREAS`, `levels: {}`; the sample's saved review gets the ratings in the test. In the store: add the three lists to `partialize`; in `merge`, an unreadable `links` becomes `[]`, `areas` becomes `DEFAULT_AREAS`, `levels` (anything but a plain object) becomes `{}`. `setSettings` trims a name and cuts it to 30; empty is `undefined`. `setBoat` collapses spaces in `boundFor` with `cleanTitle`, cuts it to 60; empty is `undefined`.
- [x] **Step 4:** Run `npm test` and `npm run build`. Expected: all pass.
- [x] **Step 5: Checkpoint.** No commit.

### Task 2: Subject levels, and the order of lists

**Files:**
- Create: `src/domain/levels.ts`, `src/domain/levels.test.ts`
- Modify: `src/domain/tasks.ts`, `src/state/store.ts`
- Test: `src/domain/tasks.test.ts`, `src/state/store.test.ts`

**Interfaces:**
- Consumes: `Level`, `Levels` (Task 1).
- Produces, in `levels.ts`:
  - `interface Applied { levels: Record<string, Level>; from: ISODate | null; carried: boolean }`
  - `levelsFor(all: Levels, weekStart: ISODate, subjects: Subject[]): Applied`. The record with the latest key on or before `weekStart`; `carried` when that key is earlier; entries for unknown subjects dropped.
  - `withLevel(all: Levels, weekStart: ISODate, subjectId: string, level: Level | null): Levels`. Returns a new object. A week with no record starts from the record `levelsFor` would use. `null` removes the entry.
  - `levelRank(level: Level | undefined): number`. High 0, Medium 1, otherwise 2.
  - `focusOf(subjects: Subject[], applied: Applied): { named: Subject[]; more: number }`. High subjects in list order, four at most.
  - `byLevel(subjects: Subject[], applied: Applied): Subject[]`. High, Medium, the rest; stable.
  - `taskRank(all: Levels, subjects: Subject[], weekStartsOn: 0 | 1): (task: Task) => number`. The rank of the task's subject for the week the task falls in.
- Produces, in `tasks.ts`: `sortTasks(tasks, rank?: (t: Task) => number)`, `tasksForDay(tasks, date, rank?)`, `tasksForWeek(tasks, weekStart, rank?)`. Without `rank` they behave as today.
- Produces, in the store: `setLevel(weekStart: ISODate, subjectId: string, level: Level | null): void`.

- [x] **Step 1: Write the failing tests**

```ts
// levels.test.ts — 2 November 2026 is a Monday
const W45 = '2026-11-02', W46 = '2026-11-09', W47 = '2026-11-16', W48 = '2026-11-23';
const subject = (id: string): Subject => ({ id, name: id, colour: 'marine' }), SUBJECTS = ['eng', 'leg', 'mat', 'eco', 'bus', 'art'].map(subject);
const all: Levels = { [W45]: { eng: 'high', gone: 'high' }, [W47]: { leg: 'high', mat: 'medium' } };

it("uses a week's own record", () => expect(levelsFor(all, W47, SUBJECTS)).toEqual({ levels: { leg: 'high', mat: 'medium' }, from: W47, carried: false }));
it('carries the latest earlier record, and drops subjects that are gone', () => expect(levelsFor(all, W46, SUBJECTS)).toEqual({ levels: { eng: 'high' }, from: W45, carried: true }));
it('never reaches forward', () => expect(levelsFor({ [W48]: { eng: 'high' } }, W47, SUBJECTS)).toEqual({ levels: {}, from: null, carried: false }));
it('still finds levels when the week starts on another day', () => expect(levelsFor(all, '2026-11-22', SUBJECTS)).toMatchObject({ from: W47, carried: true }));
it('starts a new week from what was carried', () => {
  const next = withLevel(all, W46, 'leg', 'medium');
  expect(next[W46]).toEqual({ eng: 'high', gone: 'high', leg: 'medium' }); expect(all[W46]).toBeUndefined();
  expect(withLevel(next, W46, 'eng', null)[W46]).toEqual({ gone: 'high', leg: 'medium' });
});
it('ranks High, Medium, then the rest', () => expect([levelRank('high'), levelRank('medium'), levelRank('normal'), levelRank(undefined)]).toEqual([0, 1, 2, 2]));
it('names four High subjects at most', () => {
  const applied: Applied = { levels: { eng: 'high', leg: 'high', mat: 'high', eco: 'high', bus: 'high', art: 'medium' }, from: W47, carried: false };
  expect(focusOf(SUBJECTS, applied)).toEqual({ named: SUBJECTS.slice(0, 4), more: 1 });
});
it('orders subjects by level and keeps their order within one', () => expect(byLevel(SUBJECTS, levelsFor(all, W47, SUBJECTS)).map((s) => s.id)).toEqual(['leg', 'mat', 'eng', 'eco', 'bus', 'art']));
it("ranks a task by its own week's levels", () => {
  const rank = taskRank(all, SUBJECTS, 1), t = (over: Partial<Task>) => ({ id: 'x', title: 'x', priority: 'normal', scope: 'day', date: '2026-11-18', order: 1, createdAt: '', ...over }) as Task;
  expect(rank(t({ subjectId: 'leg' }))).toBe(0); expect(rank(t({ subjectId: 'eng' }))).toBe(2); expect(rank(t({}))).toBe(2);
  expect(rank(t({ subjectId: 'eng', date: W46, scope: 'week' }))).toBe(0);
});
```

```ts
// tasks.test.ts
it("puts a High subject's task first within a priority, and never above a higher priority", () => {
  const rank = (t: Task) => ({ eng: 0, mat: 1 })[t.subjectId ?? ''] ?? 2;
  const a = task({ title: 'eco high task', priority: 'high', subjectId: 'eco', order: 3 }), b = task({ title: 'maths', subjectId: 'mat', order: 1 }), c = task({ title: 'english', subjectId: 'eng', order: 2 }), d = task({ title: 'none', order: 0 });
  expect(sortTasks([d, b, c, a], rank).map((t) => t.title)).toEqual(['eco high task', 'english', 'maths', 'none']);
  expect(sortTasks([d, b, c, a]).map((t) => t.title)).toEqual(['eco high task', 'none', 'maths', 'english']);
});
```

```ts
// store.test.ts
it('keeps levels week by week, and brings them back with a deleted subject', () => {
  const week = weekStartOf(todayISO(), 1), next = addDaysISO(week, 7);
  s().setLevel(week, 'eng', 'high'); s().setLevel(next, 'bio', 'medium');
  expect(s().levels[week]).toEqual({ eng: 'high' }); expect(s().levels[next]).toEqual({ eng: 'high', bio: 'medium' });
  const removed = s().deleteSubject('eng')!;
  expect(levelsFor(s().levels, week, s().subjects).levels).toEqual({});
  s().restoreSubject(removed);
  expect(levelsFor(s().levels, week, s().subjects).levels).toEqual({ eng: 'high' });
  s().setLevel(week, 'eng', null); expect(s().levels[week]).toEqual({});
  s().clearAll(); expect(s().levels).toEqual({});
});
```

- [x] **Step 2:** Run `npx vitest run src/domain/levels.test.ts src/domain/tasks.test.ts src/state/store.test.ts`. Expected: the new tests fail.
- [x] **Step 3: Implement** `levels.ts`, the optional `rank` in `tasks.ts` (compared after the task's priority and before `order`, for open tasks only), and `setLevel` (it calls `withLevel`).
- [x] **Step 4:** Run `npm test` and `npm run build`. Expected: all pass.
- [x] **Step 5: Checkpoint.**

### Task 3: Ratings, and saving a review that has them

**Files:**
- Modify: `src/domain/ratings.ts`, `src/domain/review.ts`, `src/state/store.ts`
- Create: `src/domain/ratings.test.ts`
- Test: `src/domain/review.test.ts`, `src/state/store.test.ts`

**Interfaces:**
- Consumes: `RatingArea`, `AREA_LIMITS`, `DEFAULT_AREAS`, `Review.ratings` (Task 1).
- Produces, in `ratings.ts`: `cleanRating(n: number): number | null` (rounded; outside 1..10 is `null`); `shownRatings(review: Review | undefined, areas: RatingArea[]): { area: RatingArea; rating: number | null }[]`.
- Produces, in `review.ts`: `isBlank(r: Review, areas: RatingArea[] = []): boolean`, blank when nothing is written and no listed area is rated; `reviewExcerpt(r)` returns `'Rated, nothing written.'` when there are ratings and no words.
- Produces, in the store: `rateReview(weekStart: ISODate, areaId: string, rating: number | null): void`; `addArea(name: string): string | null`; `renameArea(id: string, name: string): void`; `deleteArea(id: string): { area: RatingArea; index: number } | null`; `restoreArea(area: RatingArea, index: number): void`; `moveArea(id: string, direction: -1 | 1): void`. `saveReview` passes the areas to `isBlank`.

- [x] **Step 1: Write the failing tests**

```ts
// ratings.test.ts
it('keeps a rating to a whole number from 1 to 10', () => expect([7, 7.6, 0, 11, -2, NaN].map(cleanRating)).toEqual([7, 8, null, null, null, null]));
it('shows a row for each area, rated or not', () => expect(shownRatings({ weekStart: 'w', wentWell: '', gotInWay: '', change: '', ratings: { 'area-sleep': 5, old: 9 } }, DEFAULT_AREAS).map((r) => r.rating)).toEqual([null, null, 5, null]));
```

```ts
// review.test.ts
it('is not blank once a listed area is rated', () => {
  const rated = review({ ratings: { 'area-study': 7 } });
  expect(isBlank(rated, DEFAULT_AREAS)).toBe(false); expect(isBlank(rated, [])).toBe(true); expect(isBlank(rated)).toBe(true);
  expect(reviewExcerpt(rated)).toBe('Rated, nothing written.');
  expect(reviewExcerpt(review({ ratings: { 'area-study': 7 }, change: 'Start earlier.' }))).toBe('Start earlier.');
});
```

```ts
// store.test.ts
it('rates a week, saves it on ratings alone, and logs its miles once', () => {
  const week = weekStartOf(todayISO(), 1), miles = milesLogged(s().log);
  s().rateReview(addDaysISO(week, 7), 'area-study', 8); expect(s().reviews.some((r) => r.weekStart === addDaysISO(week, 7))).toBe(false);
  s().rateReview(week, 'nowhere', 8); s().rateReview(week, 'area-study', 8.4); s().rateReview(week, 'area-sleep', 3); s().rateReview(week, 'area-sleep', null);
  expect(s().reviews.find((r) => r.weekStart === week)!.ratings).toEqual({ 'area-study': 8 });
  expect(s().saveReview(week)).toBe(true); expect(s().saveReview(week)).toBe(true); expect(milesLogged(s().log)).toBe(miles + 10);
});
it('changes the areas, up to six, and brings a removed one back with its ratings', () => {
  expect(s().addArea('   ')).toBeNull();
  const id = s().addArea(`  ${'Investing'.repeat(5)} `)!; expect(s().areas.at(-1)!.name).toHaveLength(24);
  s().renameArea(id, 'Investing'); s().renameArea(id, '  '); expect(s().areas.at(-1)!.name).toBe('Investing');
  s().addArea('Friends'); expect(s().addArea('One too many')).toBeNull(); expect(s().areas).toHaveLength(6);
  s().moveArea(id, -1); expect(s().areas[3]!.id).toBe(id);
  const last = s().reviews[0]!, removed = s().deleteArea('area-study')!;
  expect(removed.index).toBe(0); expect(shownRatings(last, s().areas).some((r) => r.area.id === 'area-study')).toBe(false);
  s().restoreArea(removed.area, removed.index);
  expect(s().areas[0]!.id).toBe('area-study'); expect(shownRatings(s().reviews[0], s().areas)[0]!.rating).toBe(7);
});
it('does not list a review whose only ratings are for removed areas', () => {
  const week = weekStartOf(todayISO(), 1);
  s().rateReview(week, 'area-sleep', 4); s().saveReview(week); s().deleteArea('area-sleep');
  expect(isBlank(s().reviews.find((r) => r.weekStart === week)!, s().areas)).toBe(true);
});
```

- [x] **Step 2:** Run those three test files. Expected: the new tests fail.
- [x] **Step 3: Implement.** `rateReview` refuses a week still to come (`canReview`) and an unknown area, cleans the number, starts the review if there is none, and removes the entry on `null`. Area names use `cleanTitle` cut to `AREA_LIMITS.name`; an empty rename keeps the last good name. Deleting an area leaves reviews untouched.
- [x] **Step 4:** Run `npm test` and `npm run build`. Expected: all pass.
- [x] **Step 5: Checkpoint.**

### Task 4: Links

**Files:**
- Create: `src/domain/links.ts`, `src/domain/links.test.ts`
- Modify: `src/state/store.ts`
- Test: `src/state/store.test.ts`

**Interfaces:**
- Consumes: `QuickLink` (Task 1).
- Produces, in `links.ts`: `LINK_LIMITS = { max: 6, name: 24 }`; `cleanUrl(raw: string): string | null`; `linkName(name: string, url: string): string`; `searchLinks(links: QuickLink[], query: string): QuickLink[]` (by name, any case; an empty query finds nothing).
- Produces, in the store: `addLink(input: { name: string; url: string }): string | null`; `updateLink(id: string, patch: { name?: string; url?: string }): boolean` (false, and nothing changed, when the address is refused); `deleteLink(id: string): { link: QuickLink; index: number } | null`; `restoreLink(link: QuickLink, index: number): void`; `moveLink(id: string, direction: -1 | 1): void`.

- [x] **Step 1: Write the failing tests**

```ts
// links.test.ts
it('accepts a web address, with or without https', () => {
  expect(cleanUrl('investopedia.com')).toBe('https://investopedia.com/');
  expect(cleanUrl('  HTTP://example.org/a b ')).toBe('http://example.org/a%20b');
  expect(cleanUrl('localhost:5173/x')).toBe('https://localhost:5173/x');
});
it('refuses anything that is not a web page', () => {
  for (const bad of ['', '   ', 'gizmo', 'not a site', 'javascript:alert(1)', 'mailto:a@b.c', 'ftp://x.y', 'data:text/html,hi', 'https://user:pw@example.org']) expect(cleanUrl(bad)).toBeNull();
});
it('names a link after its site when no name is given', () => {
  expect(linkName('', 'https://www.investopedia.com/terms')).toBe('investopedia.com');
  expect(linkName('  Gizmo  ', 'https://x.y/')).toBe('Gizmo'); expect(linkName('n'.repeat(60), 'https://x.y/')).toHaveLength(24);
});
it('finds links by name', () => {
  const links = [{ id: '1', name: 'Gizmo', url: 'https://g.io/' }, { id: '2', name: 'StockAnalysis', url: 'https://s.co/' }];
  expect(searchLinks(links, 'stock').map((l) => l.id)).toEqual(['2']); expect(searchLinks(links, ' ')).toEqual([]);
});
```

```ts
// store.test.ts
it('adds, changes, moves and removes links, six at most', () => {
  expect(s().addLink({ name: 'Bad', url: 'javascript:alert(1)' })).toBeNull();
  const a = s().addLink({ name: '', url: 'investopedia.com' })!, b = s().addLink({ name: 'Gizmo', url: 'https://gizmo.ai' })!;
  expect(s().links.map((l) => l.name)).toEqual(['investopedia.com', 'Gizmo']);
  expect(s().updateLink(b, { url: 'nope' })).toBe(false); expect(s().links[1]!.url).toBe('https://gizmo.ai/');
  expect(s().updateLink(b, { name: '  Flashcards ' })).toBe(true); expect(s().links[1]!.name).toBe('Flashcards');
  s().moveLink(b, -1); expect(s().links[0]!.id).toBe(b);
  const removed = s().deleteLink(b)!; expect(s().links.map((l) => l.id)).toEqual([a]);
  s().restoreLink(removed.link, removed.index); expect(s().links[0]!.id).toBe(b);
  for (let i = 0; i < 6; i++) s().addLink({ name: `n${i}`, url: `site${i}.org` });
  expect(s().links).toHaveLength(6); s().clearAll(); expect(s().links).toEqual([]);
});
```

- [x] **Step 2:** Run `npx vitest run src/domain/links.test.ts src/state/store.test.ts`. Expected: the new tests fail.
- [x] **Step 3: Implement.** `cleanUrl`: trim; put `https://` in front unless it starts with `http://` or `https://` (any case); parse with `new URL`; refuse if that throws, if the protocol is not `http:` or `https:`, if there is a username or password, or if the host has no dot and is not `localhost`; return `href`. An emptied link name falls back to `linkName('', url)`.
- [x] **Step 4:** Run `npm test` and `npm run build`. Expected: all pass.
- [x] **Step 5: Checkpoint.**

### Task 5: Home, with the greeting, the goal, the focus and the order

**Files:**
- Create: `src/domain/greeting.ts`, `src/domain/greeting.test.ts`, `src/state/useHour.ts`, `src/features/home/Focus.tsx`, `tests/e2e/additions.spec.ts`
- Modify: `src/features/home/HomePage.tsx`, `src/features/home/HomeWindow.tsx`, `src/features/home/DaySheet.tsx`, `src/features/home/SideLists.tsx`, `src/features/voyage/VoyagePage.tsx`

**Interfaces:**
- Consumes: `levelsFor`, `focusOf`, `taskRank` (Task 2); `settings.name`, `boat.boundFor` (Task 1).
- Produces: `greeting(hour: number, name: string | undefined): string | null`; `useHour(): number` (rechecked like `useToday`); `Focus({ week, className }: { week: ISODate; className?: string })`, which renders nothing with no High subject; `useHeldOrder(tasks, rank?, holdMs?)`; `DaySheet` and `WeekList` take `rank?: (t: Task) => number`.
- Marks for tests: `[data-greeting]`, `[data-bound]` (one on the plate, one on the line under the sea), `[data-focus]`.
- Produces, in `additions.spec.ts`, for later tasks: `openWith(page: Page, path: string, patch: Record<string, unknown>)`. It opens the sample, merges `patch` into the saved `state` under `compass:v1` (objects such as `boat` and `settings` are merged one level deep, everything else replaced), and reloads.

- [x] **Step 1: Write the failing unit test**

```ts
// greeting.test.ts
it('greets by the hour, and only once there is a name', () => {
  expect([4, 5, 11, 12, 17, 18, 23].map((h) => greeting(h, 'Aditya'))).toEqual(['Good evening, Aditya', 'Good morning, Aditya', 'Good morning, Aditya', 'Good afternoon, Aditya', 'Good afternoon, Aditya', 'Good evening, Aditya', 'Good evening, Aditya']);
  expect(greeting(9, undefined)).toBeNull();
});
```

- [x] **Step 2: Write the failing browser tests** in `additions.spec.ts`. Dates come from `src/domain/dates` (`todayISO`, `weekStartOf`, `addDaysISO`, `isoWeek`).

```ts
const week = weekStartOf(todayISO(), 1);                            // the sample's weeks start on Monday
const saved = (page: Page) => page.getByRole('navigation', { name: 'Saved reviews' });

test('a new user sees none of it', async ({ page }) => {            // 1440 wide and 390 wide
  await openWith(page, '/', {});
  for (const mark of ['[data-greeting]', '[data-bound]', '[data-focus]']) await expect(page.locator(mark)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Links' })).toHaveCount(0);
});
test('a name puts a greeting above the date, and choosing another day keeps it', async ({ page }) => {   // 375, 768 and 1440
  await openWith(page, '/', { settings: { name: 'Aditya' } });
  await expect(page.locator('[data-greeting]')).toHaveText(/^Good (morning|afternoon|evening), Aditya$/);
  // press "Next week": the greeting is still there and the week strip has not moved down
});
test('a goal set on the voyage page shows on the plate', async ({ page }) => {      // 1440
  // on /voyage, fill "Bound for" with a 60-character goal, go Home
  // the plate's [data-bound] reads "Bound for" + the goal; the plate is at most 420 px wide; its aria-label contains "Bound for"
  // on /voyage the goal is shown in full under the boat's name
  // fold the sea on Home: no [data-bound] is visible
});
test('on a phone the goal sits under the name of the boat', async ({ page }) => {   // 390: [data-bound] visible, no sideways scroll
});
test('a High subject is named, and its task comes first within a priority', async ({ page }) => {   // 1440
  await openWith(page, '/', { levels: { [week]: { eng: 'high' } } });
  await expect(page.locator('[data-focus]')).toHaveText(/Focus.*English/);
  await expect(page.locator('[data-focus]')).not.toContainText('from week');
  // reopen "Review English notes" by unticking it: today's open tasks then read, in order,
  // Prepare Economics essay, Review English notes, Finish Mathematics exercises 4.1 to 4.6
});
test('levels from an earlier week are marked as carried over', async ({ page }) => {
  await openWith(page, '/', { levels: { [addDaysISO(week, -14)]: { eng: 'high' } } });
  await expect(page.locator('[data-focus]')).toContainText(`from week ${isoWeek(addDaysISO(week, -14))}`);
});
test("next week's levels do not show this week", async ({ page }) => {
  await openWith(page, '/', { levels: { [addDaysISO(week, 7)]: { chi: 'high' } } });
  await expect(page.locator('[data-focus]')).toHaveCount(0);
  // press "Next week": [data-focus] names Chinese
});
```

- [x] **Step 3:** Run `npx vitest run src/domain/greeting.test.ts` and `PW_CHANNEL=chrome npx playwright test tests/e2e/additions.spec.ts`. Expected: fail.
- [x] **Step 4: Implement,** to spec section 6 and the pictures.
  - Greeting: a `p` above the date in `HomePage`, shown at every width whenever a name is set. Morning is 05:00 to 11:59, afternoon 12:00 to 17:59.
  - Bound for: in `HomeWindow`, a line under the boat's name on the plate (plate `max-w-[420px]`, goal truncated, full text in `title`), and a line under the boat-name link below 1024 px. "Bound for" is `font-display` italic and muted; the goal is the interface face, semibold. The plate's `aria-label` gains ` Bound for {goal}.` While the sea is folded the goal is not shown on Home, at any width.
  - Voyage page: the goal under the boat's name, and a `DraftInput` labelled "Bound for" (`maxLength` 60) under the Name field with the line "Where you are headed in the long run. It is shown under the boat's name."
  - `Focus`: the word "Focus", then each named subject with its dot, then "and N more" when `more > 0`, then "from week N" (`isoWeek(applied.from)`) when carried. It must read aloud as "Focus: English, Legal Studies". On the week's line from 640 px; a line of its own under the week's progress below that.
  - Order: `HomePage` makes `rank = taskRank(levels, subjects, startsOn)` and passes it to `tasksForDay`, `tasksForWeek`, `DaySheet` and `WeekList`. `NextWeek` and the review's priorities are not given it.
- [x] **Step 5:** Run `npm test`, `npm run build`, and the whole browser suite. Expected: all pass, with the baseline tests unchanged.
- [x] **Step 6: Checkpoint.**

### Task 6: The Weekly review, with ratings and subjects

**Files:**
- Create: `src/ui/LevelChips.tsx`, `src/features/review/Ratings.tsx`, `src/features/review/SubjectLevels.tsx`
- Modify: `src/features/review/ReviewPage.tsx`
- Test: `tests/e2e/additions.spec.ts`

**Interfaces:**
- Consumes: `shownRatings`, `isBlank(r, areas)`, `rateReview` (Task 3); `levelsFor`, `setLevel` (Task 2); `chip` from `src/ui/EditorFrame.tsx`.
- Produces: `LevelChips({ value, onChange, label }: { value: Level | undefined; onChange: (level: Level | null) => void; label: string })`, a group named by `label` holding High, Medium and Normal buttons with `aria-pressed`; pressing the pressed one calls `onChange(null)`. `Ratings({ week }: { week: ISODate })`. `SubjectLevels({ week, title }: { week: ISODate; title: string })`, where `week` is the week the levels are for.
- Marks for tests: `li[data-rating="<area id>"]` holding a slider named "<Area>, out of 10"; `li[data-level-row="<subject id>"]`.

- [x] **Step 1: Write the failing browser tests**

```ts
test('the review shows a row to rate for each area', async ({ page }) => {          // 1440, /review
  await expect(page.getByRole('heading', { name: 'How the week went' })).toBeVisible();
  await expect(page.locator('li[data-rating]')).toHaveCount(4);
  // "Previous week": the sample's saved review reads 7, 6, 5, 7
});
test('a week can be rated by keyboard and saved on a rating alone', async ({ page }) => {
  const sleep = page.getByRole('slider', { name: 'Sleep, out of 10' });
  await sleep.focus(); for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await expect(sleep).toHaveValue('3');
  await expect(page.getByText('Write in any of the three, or rate the week, to save it.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save review' }).click();
  await expect(page.getByText('Review saved. 10 nautical miles logged.')).toBeVisible();
  await page.reload(); await expect(page.getByRole('slider', { name: 'Sleep, out of 10' })).toHaveValue('3');
  await expect(saved(page)).toContainText('Rated, nothing written.');
});
test('a level set in this week\'s review is for next week', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Subjects next week' })).toBeVisible();
  await page.getByRole('group', { name: 'English' }).getByRole('button', { name: 'High' }).click();
  // Home this week: no [data-focus]. Home next week: [data-focus] names English.
  // back in the review, pressing High again clears it
});
test('last week\'s review sets this week', async ({ page }) => {
  // "Previous week": the heading is "Subjects this week"; pressing High for Chinese names it on Home today
});
test('levels carried from an earlier week say so', async ({ page }) => {
  await openWith(page, '/review', { levels: { [addDaysISO(week, -14)]: { eng: 'high' } } });
  await expect(page.getByText(`Carried over from week ${isoWeek(addDaysISO(week, -14))}.`)).toBeVisible();
});
test('with no areas the ratings are absent', async ({ page }) => {
  await openWith(page, '/review', { areas: [] });
  await expect(page.getByRole('heading', { name: 'How the week went' })).toHaveCount(0);
});
test('with no subjects the levels are absent', async ({ page }) => {
  // an empty subject list in a save falls back to the sample's, so start with one and delete it in Study
  await openWith(page, '/study/eng', { subjects: [{ id: 'eng', name: 'English', colour: 'rose' }] });
  // "Edit subject", delete it, then on /review there is no heading "Subjects next week"
});
test('the review fits a phone', async ({ page }) => {                // 390: no sideways scroll; each level button is at least 44 px tall
});
```

- [x] **Step 2:** Run the file. Expected: the new tests fail.
- [x] **Step 3: Implement,** to spec section 7 and the pictures.
  - `Ratings` sits between "Assessments" and the reflection form. Heading "How the week went", aside "Out of 10", then "Rate each part of the week. Change the parts in Settings." with Settings linked to `/settings`. Each row: the name, a native `input type="range"` (`min` 0, `max` 10, `step` 1, 0 meaning not rated) drawn as ten segments filled in `deep-700`, and the number or a short dash. Rows are 44 px tall, 50 px on phones. Absent with no areas.
  - `SubjectLevels` sits after the numbered priorities under the same `after >= thisWeek` rule, with `week={after}` and the title "Subjects next week" or "Subjects this week". Under the heading: "High subjects are named on Home, and their tasks come first in each list." Rows are in the subject list's own order. When `carried`, the line "Carried over from week N." Below 640 px the name has its own line. Absent with no subjects.
  - `ReviewPage`: `blank` uses `isBlank(review, areas)`; the hint for a blank review is "Write in any of the three, or rate the week, to save it."
- [x] **Step 4:** Run `npm test`, `npm run build` and the whole browser suite. Expected: all pass.
- [x] **Step 5: Checkpoint.**

### Task 7: Study, ordered by level

**Files:**
- Modify: `src/features/study/StudyPage.tsx`
- Test: `tests/e2e/additions.spec.ts`

**Interfaces:**
- Consumes: `levelsFor`, `byLevel`, `setLevel` (Task 2); `LevelChips` (Task 6).
- Marks for tests: a `[data-level]` holding "High" or "Medium" on a subject's row in the list.

- [x] **Step 1: Write the failing browser tests**

```ts
test('a level set in Study takes effect today', async ({ page }) => {     // 1440, /study/chi
  await page.getByRole('group', { name: 'This week' }).getByRole('button', { name: 'High' }).click();
  const rows = page.getByRole('navigation', { name: 'Subjects' }).locator('a[data-subject]');
  await expect(rows.first()).toHaveAttribute('data-subject', 'chi');
  await expect(rows.first().locator('[data-level]')).toHaveText('High');
  await page.goto('/'); await expect(page.locator('[data-focus]')).toContainText('Chinese');
});
test('with no levels the subjects keep their order', async ({ page }) => {
  // the first row is Biology, and no row has a [data-level]
});
```

- [x] **Step 2:** Run the file. Expected: the new tests fail.
- [x] **Step 3: Implement,** to spec section 8. The list is `byLevel(subjects, levelsFor(levels, thisWeek, subjects))`, and the subject opened by default is its first. High and Medium rows show the word at the right, 13 px, muted. The sheet gains `LevelChips` labelled "This week" under the subject's name, changing this week's level.
- [x] **Step 4:** Run the whole browser suite. Expected: all pass.
- [x] **Step 5: Checkpoint.**

### Task 8: Settings, for the name, the areas and the links

**Files:**
- Create: `src/features/places/AreasSettings.tsx`, `src/features/places/LinksSettings.tsx`
- Modify: `src/features/places/SettingsPage.tsx`
- Test: `tests/e2e/additions.spec.ts`

**Interfaces:**
- Consumes: `setSettings({ name })` (Task 1); the area actions (Task 3); the link actions and `LINK_LIMITS` (Task 4); `AREA_LIMITS`.
- Produces: the Links part has `id="links"`. Opening `/settings#links` scrolls to it and puts the cursor in its "Name" box for a new link.

- [x] **Step 1: Write the failing browser tests**

```ts
test('a name set in Settings greets on Home, and clearing it removes the greeting', async ({ page }) => {
  await page.getByLabel('Your name').fill('Aditya');         // then Home has [data-greeting]; clear it and Home has none
});
test('areas can be added, renamed, moved and removed with Undo', async ({ page }) => {
  // add "Investing": /review shows a fifth row, "Investing, out of 10"
  // remove "Study": a toast "Area removed." with Undo; Undo puts it back first, and last week's 7 is still there
  // at six areas the add row is replaced by "Six is the most."
});
test('a link needs a real address, and takes its site as a name', async ({ page }) => {
  // add address "investopedia.com" with no name: listed as "investopedia.com"
  // add address "javascript:alert(1)": "That does not look like a web address." and nothing is added
  // change a link's address to "nope": the same message, and the last good address is kept
  // remove a link: a toast "Link removed." with Undo
});
test('Settings fits a phone', async ({ page }) => {          // 390: no sideways scroll; every new button at least 44 px tall
});
```

- [x] **Step 2:** Run the file. Expected: the new tests fail.
- [x] **Step 3: Implement,** to spec section 9. Order of parts: You, Calendar, The sea, Weekly review, Links, Your data, Prototype tool. "Your name" is a `DraftInput`, `maxLength` 30. An area row: a name box (`maxLength` 24), Move up, Move down, Remove. A link row: a name box (`maxLength` 24), an address box, Move up, Move down, Remove. Each list ends with a row to add one, replaced at six by "Six is the most." Every icon-only button has a spoken name that includes the item's name.
- [x] **Step 4:** Run the whole browser suite. Expected: all pass.
- [x] **Step 5: Checkpoint.**

### Task 9: Links in the rail, on Home and in search

**Files:**
- Create: `src/features/links/Links.tsx`
- Modify: `src/app/AppShell.tsx`, `src/features/home/HomePage.tsx`
- Test: `tests/e2e/additions.spec.ts`

**Interfaces:**
- Consumes: `links` and `searchLinks` (Task 4); `#links` in Settings (Task 8).
- Produces: `RailLinks()` and `HomeLinks({ className }: { className?: string })`. Both render nothing with no links.
- Marks for tests: `[data-links="rail"]` and `[data-links="home"]`.

- [x] **Step 1: Write the failing browser tests**

```ts
const two = { links: [{ id: 'l1', name: 'Gizmo', url: 'https://gizmo.ai/' }, { id: 'l2', name: 'Investopedia', url: 'https://investopedia.com/' }] };
test('links sit in the rail on a wide screen', async ({ page }) => {          // 1440, any page
  await openWith(page, '/study', two);
  const link = page.locator('[data-links="rail"]').getByRole('link', { name: 'Gizmo, opens in a new tab' });
  await expect(link).toHaveAttribute('href', 'https://gizmo.ai/'); await expect(link).toHaveAttribute('target', '_blank'); await expect(link).toHaveAttribute('rel', /noopener/);
  await expect(page.locator('[data-links="home"]')).toBeHidden();
  // the "Links" label goes to /settings#links
});
test('links sit at the foot of Home on a narrow screen', async ({ page }) => { // 390 and 768
  // [data-links="home"] is the last section of main, holds both links and "Add a link", which goes to /settings#links
});
test('a short window keeps Search and Settings in reach', async ({ page }) => { // 1440 by 520, six links
  // the rail's Settings link can be scrolled into view and clicked
});
test('search finds a link', async ({ page }) => {
  // Ctrl+K, type "invest": a row "Investopedia" marked "Link". Type "add a link": that command goes to /settings#links
});
```

- [x] **Step 2:** Run the file. Expected: the new tests fail.
- [x] **Step 3: Implement,** to spec sections 6 and 10. `RailLinks` goes after the places in the rail and is shown from 1024 px; its "Links" label is a link to `/settings#links`. The rail scrolls when the window is too short for it. `HomeLinks` is the last block on Home, shown below 1024 px, in two columns with "Add a link" as its last row. Every link is an `a` with `target="_blank"`, `rel="noopener noreferrer"`, the Lucide `ArrowUpRight` icon and the spoken name "{name}, opens in a new tab". In the command menu, links found by `searchLinks` are listed with the note "Link" and open with `window.open(url, '_blank', 'noopener,noreferrer')`; "Add a link" joins the commands.
- [x] **Step 4:** Run the whole browser suite. Expected: all pass.
- [x] **Step 5: Checkpoint.**

### Task 10: The whole piece, its pictures and its documents

**Files:**
- Modify: `tests/e2e/additions.spec.ts`, `docs/home-and-review-additions-spec.md`, `docs/testing-report.md`, `docs/HANDOFF.md`, `docs/next-stages.md`
- Create: pictures in `docs/screenshots/additions/`, named `1-home-1440.png` and so on

- [x] **Step 1: Write the last browser test.** With a name, a goal, six links, a High and a Medium subject, and a rated review all set through `openWith`: at 375, 390, 768, 1024 and 1440 px, on `/`, `/review`, `/study`, `/settings` and `/voyage`, `document.documentElement.scrollWidth` equals `clientWidth`, and the page logs no errors.
- [x] **Step 2:** Run `npm test`, `npm run build` and `PW_CHANNEL=chrome npm run test:e2e`. Expected: all pass; every baseline test from Task 0 still passes unchanged. Then `CI=1 PW_CHANNEL=chrome npm run test:e2e`. Expected: the same, with the six sea tests skipped.
- [x] **Step 3: Walk the spec's section 15,** "Done when", line by line in a browser, and section 14 by keyboard alone. Fix what fails.
- [x] **Step 4: Take the pictures** of the built pages: Home at 1440 and 390, the review at 1440 and 390, Settings at 1440, Study at 1440. Compare each with its mock in the same folder and fix meaningful differences.
- [x] **Step 5: Update the documents.** In the spec: the status line, and a new last section "As built" listing every difference from the document. In `testing-report.md`: a section for this piece with the test counts. In `HANDOFF.md`: the branch, the new files in section 5, and the routes that changed. In `next-stages.md`: a new stage for Aditya's plan with its five pieces, this one marked as built, and the open calls from the spec's section 12.
- [x] **Step 6: Ask Oliver to approve the commit.** Show the diff summary and the test results. Commit only on a yes, as one commit on `home-review-additions`. Do not push without being asked.

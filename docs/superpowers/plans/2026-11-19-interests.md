# Interests and Headlines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add interests to My pages (folders, with ready-made forms for Investing and Law) and headlines saved by hand, with the newest three on Home.

**Architecture:** As in the earlier pieces: pure rules in `src/domain/`, tested first; the store gains two lists (`interests`, `headlines`) and four optional fields on a page; pages read the store through the domain functions. An interest's page is an ordinary page that names its interest, so nothing is kept twice. Nothing is fetched from anywhere.

**Tech Stack:** React 19.3, TypeScript 7.0, React Router 8.5, Zustand 5.1, date-fns 4.4, Lucide React 1.73, Tailwind CSS 4.3, Motion 14.14, Vitest 5.1, Playwright 1.65.

**Spec:** [docs/interests-spec.md](../../interests-spec.md). Section numbers below refer to it.

**How this one is run:** Oliver asked on 19 November for the rest of the app to be built without questions, so there was no mock, no review page and no approval gate. The work is still test first, with a fresh reviewer at the end, and it is committed, pushed and merged without asking.

## Global Constraints

- Every web address goes through `cleanUrl`, when typed and when a save is opened. Nothing else may reach an `href`.
- Nothing is fetched from another site. No test sends a request off the machine.
- Words are kept as typed (`cleanWords`). A form's parts are words: no numbers, ratings or choices.
- Limits: 8 interests, a name 30; a part's text 2,000; 60 headlines, a title 140, a source 40, a tag 8. At a limit, the row to add another is not shown.
- The sample gains no interests and no headlines. Every existing count on Home and in My pages stays as it is.
- Colours only from the roles. Nothing below 12.5 px. Sentence case. No exclamation marks. British English.
- Every new control is at least 44 px tall on phones, works by keyboard and has a spoken name. Every link says it opens in a new tab.
- Delete uses an Undo toast. Long words wrap.
- Every existing unit and browser test passes: 350 unit, 206 browser. New tests go in files of their own.
- A browser test waits for what a step depends on before acting: CI's runner is slow.

## Review Focus

- A save edited by hand: an interest with no name, a headline whose address is `javascript:`, a page whose link is not a web address, a part with no label. Dropped, and the app opens.
- A page whose interest was deleted, then Undo: in no interest meanwhile, back in it after, listed once.
- A form started twice, and a titled starter used once: two Company pages, one Watchlist.
- Sixty headlines, and the same headline saved twice: held to the limit, and both kept.
- With nothing saved, Home and the sample's pages are as they were.

---

### Task 1: Rules and records

**Files:** create `src/domain/words.ts`, `src/domain/interests.ts`, `src/domain/interests.test.ts`; modify `src/domain/fitness.ts` (takes `cleanWords` from `words.ts` and exports it on), `src/domain/types.ts`, `src/domain/pages.ts`, `src/domain/seed.ts`.

**Interfaces:**
- `types.ts`: `type FormSet = 'investing' | 'law' | 'none'`; `interface Interest { id: string; name: string; forms: FormSet }`; `interface PageField { id: string; label: string; text: string }`; `Page` gains `interestId?: string`, `form?: string`, `fields?: PageField[]`, `link?: string`; `interface Headline { id: string; title: string; url: string; source: string; date: ISODate; tag: string }`.
- `interests.ts`: `INTEREST_LIMITS = { max: 8, name: 30, field: 2000, headlines: 60, headline: 140, source: 40, tag: 8 }`; `FORM_SETS: { id: FormSet; label: string; hint: string }[]`; `interface PageForm { id: string; label: string; hint: string; kind: PageKind; title?: string; fields?: string[]; items?: string[] }`; `FORMS: Record<FormSet, PageForm[]>`; `PLAIN: PageForm[]` (Note, Checklist, Reading); `formOf(id?: string): PageForm | undefined`; `startersIn(interest: Interest, pages: Page[]): PageForm[]`; `interestPages(pages: Page[], interestId: string): Page[]`; `storedInterests(value: unknown): Interest[]`; `storedFields(value: unknown): PageField[] | undefined`; `cleanHeadline(input: { title: string; url: string; source?: string; date: string; tag?: string }): Omit<Headline, 'id'> | null`; `latestHeadlines(headlines: Headline[], limit?: number): Headline[]` (newest day first, and of two for one day the later saved first); `storedHeadlines(value: unknown): Headline[]`.
- `pages.ts`: `newPage(kind, id, now, start?: { title?: string; subjectId?: string; interestId?: string; form?: PageForm; lineId?: () => string })`; `pageLine` falls back to the first filled part; `pagesAsText` writes a page's parts and its link.
- `seed.ts`: `CompassData` gains `interests: Interest[]` and `headlines: Headline[]`, both empty in the sample and in `empty()`.

- [x] **Step 1: Write the failing tests** in `interests.test.ts`: the two starting points offer what section 4 lists; a titled starter is left out once used and a form never is; `startersIn` ends with Note, Checklist, Reading; an interest's pages in My pages' order; `cleanHeadline` tidies, takes the site's name for a source, and refuses no title, no web address or no date; `latestHeadlines` order; `storedInterests`, `storedFields` and `storedHeadlines` drop what section 3 says; a new page from a form has its parts, its label and its interest; `pageLine` falls back to the first filled part; `pagesAsText` includes the parts.
- [x] **Step 2:** Run `npx vitest run src/domain/interests.test.ts`. Expected: fail.
- [x] **Step 3: Implement.**
- [x] **Step 4:** Run `npm test` and `npm run build`. Expected: pass.

### Task 2: The store

**Files:** modify `src/state/store.ts`; test `src/state/interests.store.test.ts` (new).

**Interfaces:**
- `addInterest(input: { name: string; forms: FormSet }): string | null` (an empty name takes the starting point's label, and "Something else" needs a name); `updateInterest(id: string, patch: { name?: string; forms?: FormSet }): void`; `deleteInterest(id: string): { interest: Interest; index: number; pageIds: string[] } | null`; `restoreInterest(removed): void`.
- `startPage(interestId: string, formId: string): string | null`: a page from that form, kept in that interest.
- `updatePage` takes `interestId?: string | null`; `setPageField(pageId: string, fieldId: string, text: string): void`; `setPageLink(id: string, url: string): boolean`.
- `addHeadline(input): string | null`; `updateHeadline(id: string, patch): boolean`; `deleteHeadline(id: string): { headline: Headline; index: number } | null`; `restoreHeadline(headline: Headline, index: number): void`.
- `partialize` and `merge` carry the two lists; `merge` cleans a page's `link`, `fields`, `form` and `interestId`.

- [x] **Step 1: Write the failing tests:** interests added, renamed, held to 8, deleted and restored with their pages; a page started from a form; a part written and cut at its limit; a page's link set, refused and cleared; headlines added, changed, refused, held to 60, deleted and restored; a save from before this piece; a save edited by hand; "Clear everything".
- [x] **Step 2:** Run the file. Expected: fail.
- [x] **Step 3: Implement.**
- [x] **Step 4:** Run `npm test` and `npm run build`. Expected: pass.

### Task 3: Interests in My pages

**Files:** create `src/features/pages/Interests.tsx`; modify `src/features/pages/PagesPage.tsx`, `src/features/pages/PageEditor.tsx`; test `tests/e2e/interests.spec.ts` (new).

**Interfaces:** `InterestList`, `InterestEditor`, `InterestStarters`. Marks: `[data-interests] li[data-interest="<id>"]`; `[data-add-interest]`; `[data-interest-open="<id>"]` on the list while one is chosen; `button[data-form="<form id>"]`; `[data-field="<label>"]`; `a[data-page-link]`.

- [x] **Step 1: Write the failing browser tests:** an interest is added from Investing and offers its forms; a Company page opens with its eight parts, keeps what is typed and shows its form and its interest; a titled starter goes once used and a form stays; a page is moved into and out of an interest in its editor; an interest is renamed and deleted with Undo, keeping its pages; a page's source link opens in a new tab and refuses what is not a web address; the sample's pages and rows are as they were; no sideways scroll with every part at its longest.
- [x] **Step 2:** Run the file, and `tests/e2e/pages.spec.ts` as the safety net. Expected: the new tests fail, the old ones pass.
- [x] **Step 3: Implement,** to section 4.
- [x] **Step 4:** Run `npm test`, `npm run build` and the whole browser suite. Expected: pass.

### Task 4: Headlines

**Files:** create `src/features/pages/Headlines.tsx`, `src/features/home/HomeHeadlines.tsx`; modify `src/app/routes.tsx`, `src/app/AppShell.tsx`, `src/features/pages/PagesPage.tsx`, `src/features/home/HomePage.tsx`; test `tests/e2e/interests.spec.ts`.

**Interfaces:** `HeadlinesSheet`, `HeadlineEditor`, `HomeHeadlines`. Route `/pages/headlines`. Marks: `[data-headlines] li[data-headline="<id>"]`; `[data-add-headline]`; `[data-home-headlines]`.

- [x] **Step 1: Write the failing browser tests:** a headline is saved with its source taken from the site, shown on its page and on Home, and opens in a new tab; what is not a web address is refused; a headline is changed and deleted with Undo; Home shows the newest three and "All headlines" for more; with none, Home shows nothing; search offers "Save a headline"; nothing is requested from another site.
- [x] **Step 2:** Run the file. Expected: the new tests fail.
- [x] **Step 3: Implement,** to section 5.
- [x] **Step 4:** Run `npm test`, `npm run build` and the whole browser suite, light and dark. Expected: pass.

### Task 5: The whole piece

- [x] **Step 1:** The last browser tests: every part at its longest at 320 to 1440 px, thumb sizes on a phone, the keyboard.
- [x] **Step 2:** `npm test`, `npm run build`, the browser suite in light, in dark and with `CI=1`.
- [x] **Step 3:** Pictures of the built pages in `docs/screenshots/interests/`.
- [x] **Step 4:** A fresh reviewer reads the whole change against the spec. Fix what is critical or important, each with a test that fails first.
- [x] **Step 5:** Documents: the spec's "As built", the testing report, the handoff, next stages.
- [x] **Step 6:** Commit, push, open the pull request and turn on auto-merge.

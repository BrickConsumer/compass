# Search and Backup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** The command menu finds everything Compass keeps, and Settings can download a backup of all of it and restore one.

**Architecture:** Two pure modules, `src/domain/search.ts` and `src/domain/backup.ts`, and a third, `src/domain/stored.ts`, that holds the checks a save passes when it is opened. The store's `merge` becomes a named function, `openSave`, used both when the browser's save is opened and when a backup is restored, so a backup is never trusted more than a save. The menu and Settings only call these.

**Tech Stack:** React 19, TypeScript, Zustand (persisted), Tailwind 4, Vitest, Playwright.

**Spec:** `docs/search-and-backup-spec.md`

## Global Constraints

- Nothing is fetched or sent anywhere. A backup is made with a `Blob` and read with `File.text()`.
- Colour roles only in components (`src/design/roles.test.ts`).
- Every new control is at least 44 px tall on a phone, and no page scrolls sideways from 320 px.
- Fitness records are found only while `settings.fitness === true`.
- A save that was whole opens exactly as it was.
- Unit tests in new files; browser tests in `tests/e2e/search-backup.spec.ts`. Older test files are not edited unless a behaviour they hold is changed on purpose.

## Review Focus

- A backup edited by hand: a boat with no stage, settings that are a list, a log of strings, a key named like a store action, a list that is a number. Compass opens, and only what was broken is lost.
- A file that is JSON but not a backup, an empty file, a file of 6 MB, a backup with `format: 2`. Each is refused in words and nothing changes.
- Restore, then Undo: everything is as it was before, including the Fitness switch.
- Search with Fitness off never shows a routine, a session, a best or a measure.
- A result whose record is deleted while the menu is open, and a query of one character, of only spaces, and of 200 characters.

---

### Task 1: The search rule

**Files:**
- Create: `src/domain/search.ts`, `src/domain/search.test.ts`

**Interfaces:**
- Produces:
  - `type FoundKind = 'task' | 'study' | 'page' | 'headline' | 'habit' | 'review' | 'fitness' | 'link'`
  - `FOUND_KINDS: { id: FoundKind; label: string }[]` in the spec's order: Tasks, Study, Pages, Headlines, Habits, Reviews, Fitness, Links
  - `interface Found { key: string; kind: FoundKind; type: string; title: string; where: string; excerpt?: string; rank: 0 | 1 | 2; to: { path: string; state?: Record<string, string> } | { url: string } }`
  - `searchAll(data: CompassData, query: string): Found[]`, sorted as the spec's "Order"
  - `SEARCH_LIMITS = { min: 2, all: 20, kind: 50, excerpt: 80 }`
  - `countByKind(found: Found[]): { id: FoundKind; label: string; count: number }[]` (only kinds with results)
  - `shownResults(found: Found[], kind: FoundKind | null): { shown: Found[]; more: number }`

- [x] **Step 1: Write the failing tests** in `src/domain/search.test.ts`: fewer than two characters finds nothing; every word must be found, in any order and case, accents folded; a task by title and by notes, with its subject and day; rank 0 before 1 before 2; an excerpt only when found in the writing; each row of the spec's table finds its thing and opens the right place; Fitness only while on; a subject's links; `countByKind` and `shownResults` at their limits.
- [x] **Step 2: Run** `npx vitest run src/domain/search.test.ts`. Expected: FAIL, module not found.
- [x] **Step 3: Implement** `search.ts`.
- [x] **Step 4: Run** the same. Expected: PASS.

### Task 2: Opening a save, made stricter

**Files:**
- Create: `src/domain/stored.ts`, `src/domain/stored.test.ts`
- Modify: `src/state/store.ts` (`merge` becomes `openSave`; `DATA_KEYS`; `partialize` uses it)
- Test: `src/state/backup.store.test.ts`

**Interfaces:**
- Produces:
  - `storedBoat(value: unknown, fallback: Boat): Boat`, `storedSettings(value: unknown): Settings`, `storedLog(value: unknown): LogEntry[]`, `storedHabits(value: unknown): Habit[]`, `storedTicks(value: unknown): string[]`, `storedSessions(value: unknown): Session[]`, `storedReviews(value: unknown): Review[]`, `storedLevels(value: unknown): Levels`, `storedTask(task: Task): Task`
  - in the store: `DATA_KEYS` (every key of `CompassData`), `openSave(saved: unknown, current: CompassStore): CompassStore`

- [x] **Step 1: Write the failing tests:** each `stored*` keeps a whole record unchanged and drops or mends a broken one; `openSave` of the sample, and of a store holding one of every kind of record, deep-equals what was saved; a save holding `"clearAll": 1` leaves `clearAll` a function; a boat with no stage is the starting boat with its name kept.
- [x] **Step 2: Run** them. Expected: FAIL.
- [x] **Step 3: Implement.** `openSave` reads only `DATA_KEYS` from the save.
- [x] **Step 4: Run** `npm test`. Expected: PASS, with every older test unchanged.

### Task 3: The backup file and restoring it

**Files:**
- Create: `src/domain/backup.ts`, `src/domain/backup.test.ts`
- Modify: `src/state/store.ts` (`restoreBackup`, `undoRestore`)
- Test: `src/state/backup.store.test.ts`

**Interfaces:**
- Consumes: `openSave`, `DATA_KEYS` from Task 2.
- Produces:
  - `BACKUP = { app: 'compass', format: 1, maxBytes: 5_000_000 }`, `backupName(today: ISODate): string`
  - `backupText(data: CompassData, now: string): string`
  - `readBackup(text: string): { ok: true; data: Record<string, unknown>; savedAt: string | null } | { ok: false; why: 'not-compass' | 'newer' | 'too-large' }`
  - `REFUSALS: Record<'not-compass' | 'newer' | 'too-large', string>` with the spec's three sentences
  - `backupSummary(data: CompassData): string[]`, such as `['12 tasks', '5 subjects']`, leaving out what there is none of
  - in the store: `dataOf(state): CompassData`, `previewBackup(data: Record<string, unknown>): CompassData`, `restoreBackup(data: Record<string, unknown>): CompassData` (returns what was there before), `undoRestore(before: CompassData): void`

- [x] **Step 1: Write the failing tests:** `backupText` then `readBackup` gives the data back; each refusal; a restore replaces everything and keeps the device's theme; Undo puts everything back; a backup edited by hand restores with only the broken parts lost.
- [x] **Step 2: Run** them. Expected: FAIL.
- [x] **Step 3: Implement.**
- [x] **Step 4: Run** `npm test`. Expected: PASS.

### Task 4: Search in the menu

**Files:**
- Modify: `src/app/AppShell.tsx` (`CommandMenu`), `src/features/home/HomePage.tsx` (opens a task named by `location.state.task`), `src/features/review/ReviewPage.tsx` (opens the week named by `location.state.week`), `src/features/pages/PagesPage.tsx` (chooses the interest named by `location.state.interest`)
- Test: `tests/e2e/search-backup.spec.ts`

**Interfaces:**
- Consumes: `searchAll`, `countByKind`, `shownResults`, `SEARCH_LIMITS`.

- [x] **Step 1: Write the failing browser tests:** a task is found by a word in its notes, shows its subject and day and the words found, and opens on Home with its editor; kinds narrow the results and show counts; a page is found by a part of its form; a headline opens in a new tab that cannot reach back; a review opens on its week; an interest opens chosen; Fitness is found only while on; arrows move through the results and typing returns to the box; nothing found says so.
- [x] **Step 2: Run** them. Expected: FAIL.
- [x] **Step 3: Implement.** Results are buttons after the commands; the kinds are a group named "Show" above them.
- [x] **Step 4: Run** the spec, then the whole suite. Expected: PASS, with the older menu tests unchanged.

### Task 5: Backup in Settings, and the whole piece

**Files:**
- Create: `src/features/places/BackupSettings.tsx`
- Modify: `src/features/places/SettingsPage.tsx`, `src/app/AppShell.tsx` (two commands)
- Test: `tests/e2e/search-backup.spec.ts`

- [x] **Step 1: Write the failing browser tests:** the download is named for the day and holds everything; restoring it on a cleared Compass puts everything back; what a backup holds is said before anything changes, and "Keep what is here" changes nothing; Undo; each refusal; a backup edited by hand; the two commands; widths from 320 to 1440 px; thumb sizes; the keyboard.
- [x] **Step 2: Run** them. Expected: FAIL.
- [x] **Step 3: Implement.**
- [x] **Step 4: Run** `npm test`, `npm run build`, and the browser suite in light, in dark and as CI runs it. Expected: all PASS.
- [x] **Step 5: Pictures** into `docs/screenshots/search-backup/`, a fresh reviewer over the whole change, one fix pass, the documents, and the commit.

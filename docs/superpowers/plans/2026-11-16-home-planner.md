# Home Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Home screen of Compass: the app shell, the calendar week, tasks with daily and weekly progress, upcoming assessments, next week's priorities, and the sea window joined to the day's progress.

**Architecture:** Pure domain functions over one set of records (tasks, assessments, voyage log), held in a Zustand store persisted to local storage. Every list on Home is a selector over that store. The selected date lives in the URL. The sea window from plan 1 reads the selected day's progress.

**Tech Stack:** React 19.3, TypeScript 7.0, React Router 8.5, Zustand 5.1, date-fns 4.4, Lucide React 1.73, Tailwind CSS 4.3, Vitest 5.1.

**Spec:** [docs/home-screen-spec.md](../../home-screen-spec.md) and [docs/compass-art-direction.md](../../compass-art-direction.md). This is plan 2 of 3. The boat's look review is deferred by the founder; Home is built on the scene as it stands.

## Global Constraints

- One set of records. No list keeps its own copy of a task.
- Miles and days at sea never decrease. Each task earns once. The day-clear bonus is earned once per date. Task miles are capped at 40 a day.
- A missed day is one with day-scoped tasks and none completed. The day after opens in a storm that clears with progress. A day with nothing planned is in port.
- No confirmation dialogs: delete and move use an undo toast. No pop-ups.
- Colours, type and radii only from the tokens. Nothing below 12.5 px. Sentence case. Touch targets at least 44 px.
- British English, day before month. Week starts on Monday unless Settings says Sunday.
- No control that looks real and does nothing.
- Do not commit or push without the founders' approval.

## Review Focus

- A week that crosses a month or a year end: labels and week numbers stay right. Tested in Task 1.
- Reopening and re-completing a task: miles are not earned twice and never fall. Tested in Task 2.
- A title of only spaces, or 500 characters: not saved, or trimmed to 140. Tested in Task 3.
- Storage missing or corrupt: the app starts from sample data and does not throw. Tested in Task 3.
- A day with twenty tasks: the bar becomes continuous above 20 and the page scrolls, not the list. Checked in Task 5.

---

### Task 1: Dates
**Files:** Create `src/domain/dates.ts`, test `src/domain/dates.test.ts`.
**Produces:** `toISO`, `addDaysISO`, `weekStartOf(date, weekStartsOn)`, `weekDays(weekStart)`, `weekLabel(weekStart)`, `isoWeek(date)`, `longDate(date)`, `relativeDay(date, today)`, `sheetTitle(date, today)`.
- [ ] Tests: `weekLabel('2026-11-09') === '9 to 15 November'`; `weekLabel('2026-11-30') === '30 November to 6 December'`; `weekLabel('2026-12-28') === '28 December 2026 to 3 January 2027'`; `isoWeek('2026-11-15') === 46`; `sheetTitle` gives Today, Tomorrow, Yesterday, or "Thursday 12".

### Task 2: Tasks, progress and the voyage
**Files:** Create `src/domain/types.ts`, `tasks.ts`, `voyage.ts`, tests beside them.
**Produces:** the types in spec section 5; `sortTasks`, `tasksForDay`, `tasksForWeek`, `allTasksInWeek`, `progress`, `dayMarks`, `carryOver`, `missedDay`, `upcomingAssessments`, `nextWeekPriorities`; `milesLogged`, `daysAtSea`, `earnedStage`, `fittings`, `nextFitting`, `awardsFor(task, tasks, log, today)`.
- [ ] Tests: sort order (open before done; high, normal, low); progress counts; carry-over only for earlier days of the current week; `missedDay` false for an empty day; award once; daily cap of 40; day-clear once per date; stage gates need both miles and days.

### Task 3: Store and sample data
**Files:** Create `src/domain/seed.ts`, `src/state/store.ts`, test `src/state/store.test.ts`.
**Produces:** `useCompass` with `addTask`, `updateTask`, `toggleTask`, `cyclePriority`, `deleteTask`, `restoreTasks`, `moveToDate`, `setBoat`, `setSettings`, `resetSample`, `clearAll`, `setSampleVoyage`. Persisted under `compass:v1`.
- [ ] Tests: add trims and rejects empty titles; toggle logs miles once; delete then restore returns the same record; sample data gives 412 miles and 23 days at sea.

### Task 4: Shell and navigation
**Files:** Create `src/app/AppShell.tsx`, `src/ui/Toast.tsx`, `src/features/places/Places.tsx`, `SettingsPage.tsx`; modify `src/app/routes.tsx`.
- [ ] Rail with labels from 1024, icon rail from 640, bottom bar below. Five destinations plus Settings. Toast region with Undo. Honest destination pages.

### Task 5: Home
**Files:** Create under `src/features/home/`: `HomePage.tsx`, `HomeWindow.tsx`, `DateHeader.tsx`, `WeekStrip.tsx`, `DaySheet.tsx`, `TaskRow.tsx`, `TaskComposer.tsx`, `TaskEditor.tsx`, `SideLists.tsx`; `src/ui/SegmentedProgress.tsx`.
- [ ] The thirteen required interactions of spec section 13, with their keyboard routes.
- [ ] Layout at 375, 390, 768, 1024 and 1440 as in spec section 3.

### Task 6: Verify
- [ ] `npm run build` and `npm test` pass.
- [ ] Each of the thirteen interactions exercised in a browser, persistence across reload, no console errors, no sideways scroll at the five widths. Screenshots saved to `docs/screenshots/home/`.

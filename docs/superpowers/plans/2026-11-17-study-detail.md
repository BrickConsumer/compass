# Study Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a subject's page a current topic, preparation tasks and a link on each assessment, a link on a task, dated teacher feedback, the subject's own pages, and its links.

**Architecture:** As in piece 1: pure rules in `src/domain/`, tested first; the Zustand store gains fields and one list (`feedback`); pages read the store through the domain functions. Nothing new is a second copy: a preparation task is an ordinary task with an `assessmentId`, a feedback task is an ordinary task named by the entry's `taskId`, and a subject's pages are the My pages that carry it. A link that is deleted with its owner comes back on Undo because the id it was found by comes back.

**Tech Stack:** React 19.3, TypeScript 7.0, React Router 8.5, Zustand 5.1, date-fns 4.4, Lucide React 1.73, Tailwind CSS 4.3, Motion 14.14, Vitest 5.1, Playwright 1.65.

**As executed, on 18 November:** every step below was done. Four things were done differently, each for a reason given in the spec's section 16 and the testing report's section 15: the new tests are in files of their own, so the older test files were not edited; a subject's links are changed in place on the page, not in the pop-up frame; a page's row leaves its count out of its line when the count is shown beside it; and the review of the whole change led to seven fixes.

**Spec:** [docs/study-detail-spec.md](../../study-detail-spec.md). Read it first. Section numbers below refer to it. Its pictures are in `docs/screenshots/study-detail/`. House rules are in [docs/HANDOFF.md](../../HANDOFF.md), section 5.

## Global Constraints

- **Do not commit or push without Oliver's approval.** No destructive git. Tasks end in a checkpoint, not a commit; Task 10 asks for the commit.
- **The repository is public.** Nothing personal to a founder goes into a commit, a test or a picture. Samples are invented.
- **Every web address goes through `cleanUrl`** (`src/domain/links.ts`), when it is typed and again when a save is opened. Nothing else may reach an `href` or `window.open`.
- **The topic is never rewritten:** only spaces at either end are removed and line breaks become spaces. Limit 200 characters.
- Limits: feedback "about" 80, "what was said" 2,000, "to work on" 140; six links for each subject, name 24.
- **No sample task is added, changed or made into preparation.** Every count on Home, in Study and in the Weekly review stays as it is.
- One thing in one place: a preparation task is under its assessment and not again under "Tasks".
- Colours, type and radii only from the tokens. No hex values in components (subject colours come from `SUBJECT_COLOURS`). Nothing below 12.5 px. Sentence case. No exclamation marks.
- Every new control is at least 44 px tall on phones, works by keyboard and has a spoken name. Every link says it opens in a new tab.
- Long words wrap (`[overflow-wrap:anywhere]`) wherever the user's own text is shown.
- Delete uses an Undo toast, never a confirmation. No control that looks real and does nothing.
- British English. Copy is exactly as the spec gives it.
- No test sends a request off the machine.
- Every existing unit and browser test passes unchanged: 256 unit, 115 browser.
- Commands: `npm test`, `npm run build`, `PW_CHANNEL=chrome npm run test:e2e`. The shell here refuses compound commands in this folder: run one plain command at a time.

## Review Focus

- **A save edited by hand with something that is not a web address** in a task's link, an assessment's link or a subject's links: dropped when the save is opened, and never an `href`. Tested in Task 1.
- **A preparation task whose assessment, or whose assessment's subject, is deleted, then Undo:** an ordinary task meanwhile, back under the assessment after, and never listed twice. Tested in Tasks 2 and 6.
- **A task ticked beside its feedback, or under its assessment, and again on Home:** one record, its miles once. Tested in Tasks 2 and 4.
- **A topic that is 300 characters, one long word, only spaces, or has line breaks:** kept exactly within the limit, wraps on a phone, and empty means not set. Tested in Tasks 1 and 5.
- **"Make it a task" pressed twice, or after its task was deleted:** one live task at most, and the entry shows its words again once the task is gone. Tested in Task 4.

---

### Task 0: The workspace

The branch `study-detail` already exists in the working folder `.claude/worktrees/home-review-additions`, cut from the piece 1 commit `4ff1357`. The spec, the mock pictures and this plan are untracked files on it.

- [x] **Step 1:** Run `git branch --show-current` (expect `study-detail`) and `git status --short` (expect only `docs/study-detail-spec.md`, `docs/screenshots/study-detail/` and this plan). If anything else is listed, stop and ask.
- [x] **Step 2:** Run `npm test`, `npm run build` and `PW_CHANNEL=chrome npm run test:e2e`. Expected: 256 unit tests pass, the build passes, 115 browser tests pass. If port 5174 is in use, another chat is running its tests: wait and run again.

### Task 1: Records and the saved data

**Files:**
- Modify: `src/domain/types.ts`, `src/domain/study.ts`, `src/domain/seed.ts`, `src/state/store.ts`
- Create: `src/domain/feedback.ts`, `src/domain/feedback.test.ts`
- Test: `src/domain/study.test.ts`, `src/state/store.test.ts`

**Interfaces:**
- Produces, in `types.ts`: `Subject.topic?: string`; `Subject.links?: QuickLink[]`; `Task.link?: string`; `Task.assessmentId?: string`; `Assessment.link?: string`; `interface Feedback { id: string; subjectId: string; date: ISODate; about: string; words: string; work: string; taskId?: string }`.
- Produces, in `study.ts`: `TOPIC_LIMIT = 200`; `cleanTopic(text: string): string`.
- Produces, in `feedback.ts`: `FEEDBACK_LIMITS = { about: 80, words: 2000, work: 140 }`; `cleanFeedback(input: { about?: string; words: string; work?: string }): { about: string; words: string; work: string } | null`; `subjectFeedback(all: Feedback[], subjectId: string): Feedback[]` (newest date first, then the later-added first); `storedFeedback(value: unknown): Feedback[]`.
- Produces, in `seed.ts`: `CompassData.feedback: Feedback[]`. The sample's Biology has `topic: 'Cell structure and transport'` and one entry `{ id: 'fb-1', subjectId: 'bio', date: <five days before today>, about: 'Practical report', words: 'A clear method. Explain what the results mean, not only what they were.', work: 'Say what each result means' }`. `empty()` has no topics and no feedback.
- Produces, in the store: `updateSubject` takes `topic?: string`; `RemovedSubject.feedback: Feedback[]`; `merge` cleans the new fields.

- [x] **Step 1: Write the failing tests**

```ts
// study.test.ts
it('keeps a topic exactly as typed, within its limit', () => {
  expect(cleanTopic('  Module B:  Critical Study of Literature ')).toBe('Module B:  Critical Study of Literature');
  expect(cleanTopic('the role of the RBA\nin monetary policy')).toBe('the role of the RBA in monetary policy');
  expect(cleanTopic('   ')).toBe('');
  expect(cleanTopic('x'.repeat(300))).toHaveLength(200);
});
```

```ts
// feedback.test.ts
const entry = (over: Partial<Feedback> = {}): Feedback => ({ id: 'f1', subjectId: 'eng', date: '2026-11-12', about: '', words: 'Good.', work: '', ...over });

it('tidies an entry and refuses one with nothing said', () => {
  expect(cleanFeedback({ about: '  Essay  ', words: ' The thesis arrives late. ', work: ' Open with it ' })).toEqual({ about: 'Essay', words: 'The thesis arrives late.', work: 'Open with it' });
  expect(cleanFeedback({ about: 'Essay', words: '   ', work: 'x' })).toBeNull();
  const long = cleanFeedback({ about: 'a'.repeat(200), words: 'w'.repeat(5000), work: 'k'.repeat(500) })!;
  expect([long.about.length, long.words.length, long.work.length]).toEqual([80, 2000, 140]);
});
it("lists a subject's feedback newest first", () => {
  const all = [entry({ id: 'a', date: '2026-11-03' }), entry({ id: 'b', date: '2026-11-12' }), entry({ id: 'c', date: '2026-11-12' }), entry({ id: 'd', subjectId: 'mat' })];
  expect(subjectFeedback(all, 'eng').map((f) => f.id)).toEqual(['c', 'b', 'a']);
});
it('keeps only stored feedback that has an id, a subject, a date and words', () => {
  const stored = storedFeedback([null, 'x', { id: 'a' }, { id: 'b', subjectId: 'eng', date: 'soon', words: 'No date.' }, { id: 'c', subjectId: 'eng', date: '2026-11-12', words: '  Kept.  ', about: 7, taskId: 't1' }, { id: 'c', subjectId: 'eng', date: '2026-11-12', words: 'Twice.' }]);
  expect(stored).toEqual([{ id: 'c', subjectId: 'eng', date: '2026-11-12', about: '', words: 'Kept.', work: '', taskId: 't1' }]);
  expect(storedFeedback('nonsense')).toEqual([]);
});
```

```ts
// store.test.ts, in a new describe('study detail: records and the saved data') with beforeEach resetSample
const merge = (saved: unknown) => useCompass.persist.getOptions().merge!(saved, s()) as ReturnType<typeof s>;

it('starts with a topic and one feedback entry on Biology, and no sample task changed', () => {
  expect(s().subjects.find((x) => x.id === 'bio')!.topic).toBe('Cell structure and transport');
  expect(s().feedback.map((f) => f.subjectId)).toEqual(['bio']);
  expect(s().tasks.some((t) => t.assessmentId || t.link)).toBe(false);
  expect(s().tasks.filter((t) => t.scope === 'day' && t.date === todayISO())).toHaveLength(5);
});
it('sets and clears a topic without rewriting it', () => {
  s().updateSubject('eng', { topic: '  the role of the RBA  ' }); expect(s().subjects.find((x) => x.id === 'eng')!.topic).toBe('the role of the RBA');
  s().updateSubject('eng', { topic: '   ' }); expect(s().subjects.find((x) => x.id === 'eng')!.topic).toBeUndefined();
});
it('drops anything that is not a web address from a save', () => {
  const save = JSON.parse(JSON.stringify(s()));
  save.tasks[0].link = 'javascript:alert(1)'; save.tasks[1].link = 'investopedia.com'; save.assessments[0].link = 'data:text/html,hi'; save.assessments[1].link = 'https://example.org/notice.pdf';
  save.subjects[0].links = [null, { id: 'a', name: 'Bad', url: 'file:///etc/hosts' }, { id: 'b', name: 'Fine', url: 'gizmo.ai' }]; save.subjects[1].topic = 5;
  const merged = merge(save);
  expect([merged.tasks[0]!.link, merged.tasks[1]!.link]).toEqual([undefined, 'https://investopedia.com/']);
  expect([merged.assessments[0]!.link, merged.assessments[1]!.link]).toEqual([undefined, 'https://example.org/notice.pdf']);
  expect(merged.subjects[0]!.links).toEqual([{ id: 'b', name: 'Fine', url: 'https://gizmo.ai/' }]);
  expect(merged.subjects[1]!.topic).toBeUndefined();
});
it('opens a save from before this piece with nothing lost', () => {
  const old = JSON.parse(JSON.stringify({ ...s(), sample: false })); delete old.feedback;
  for (const x of old.subjects) { delete x.topic; delete x.links; }
  const merged = merge(old);
  expect(merged.feedback).toEqual([]); expect(merged.tasks).toHaveLength(s().tasks.length); expect(merged.subjects).toHaveLength(5);
});
it('takes feedback away with its subject, and brings it back', () => {
  const removed = s().deleteSubject('bio')!; expect(s().feedback).toEqual([]);
  s().restoreSubject(removed); expect(s().feedback.map((f) => f.id)).toEqual(['fb-1']);
  s().clearAll(); expect(s().feedback).toEqual([]); expect(s().subjects.every((x) => !x.topic)).toBe(true);
});
```

- [x] **Step 2:** Run `npx vitest run src/domain/study.test.ts src/domain/feedback.test.ts src/state/store.test.ts`. Expected: the new tests fail.
- [x] **Step 3: Implement.** `seed()` gives Biology its topic with `SUBJECTS.map`, so `SUBJECTS` itself, which `empty()` uses, has none. In `merge`: each task's and assessment's `link` becomes `cleanUrl(link) ?? undefined` when it is a string and is removed otherwise; each subject's `links` becomes `storedLinks(links)`, or is removed when there are none; a `topic` that is not a string is removed; `feedback` becomes `storedFeedback(feedback)`. Add `feedback` to `partialize`.
- [x] **Step 4:** Run `npm test` and `npm run build`. Expected: all pass.
- [x] **Step 5: Checkpoint.** No commit.

### Task 2: Preparation tasks

**Files:**
- Modify: `src/domain/study.ts`, `src/state/store.ts`
- Test: `src/domain/study.test.ts`, `src/state/store.test.ts`

**Interfaces:**
- Consumes: `Task.assessmentId` (Task 1).
- Produces, in `study.ts`: `isPreparation(task: Task, assessments: Assessment[]): boolean`, true only while the assessment it names exists; `preparationOf(tasks: Task[], assessmentId: string): { open: Task[]; done: Task[] }`, open ones by date with a day's before a week's, done ones latest first; `preparationProgress(tasks: Task[], assessmentId: string): Progress`.
- Produces, in the store: `NewTask.assessmentId?: string`, kept only if that assessment exists; `updateTask` takes `assessmentId?: string | null`, where `null` frees the task.
- `deleteAssessment` and `restoreAssessment` do not change: a deleted assessment's tasks keep its id, so they are ordinary tasks until Undo brings the assessment back.

- [x] **Step 1: Write the failing tests**

```ts
// study.test.ts
const ORAL: Assessment = { id: 'as', title: 'Oral', subjectId: 'eng', date: '2026-11-29', kind: 'presentation' };
const prep = [task('late', { date: '2026-11-23', scope: 'week', assessmentId: 'as' }), task('done', { date: '2026-11-16', assessmentId: 'as', completedAt: '2026-11-16T09:00:00.000Z' }), task('soon', { date: '2026-11-19', assessmentId: 'as' }), task('other', { date: '2026-11-17' })];

it('lists preparation under its assessment, open ones first by date', () => {
  expect(preparationOf(prep, 'as').open.map((t) => t.id)).toEqual(['soon', 'late']);
  expect(preparationOf(prep, 'as').done.map((t) => t.id)).toEqual(['done']);
  expect(preparationProgress(prep, 'as')).toEqual({ done: 1, total: 3 });
  expect(preparationProgress(prep, 'none')).toEqual({ done: 0, total: 0 });
});
it('is preparation only while its assessment exists', () => {
  expect(isPreparation(prep[0]!, [ORAL])).toBe(true); expect(isPreparation(prep[0]!, [])).toBe(false); expect(isPreparation(prep[3]!, [ORAL])).toBe(false);
});
```

```ts
// store.test.ts — 'as-3' is the sample's English oral presentation
it('makes a preparation task an ordinary task that belongs to an assessment', () => {
  const week = weekStartOf(todayISO(), 1), miles = milesLogged(s().log);
  const id = s().addTask({ title: 'Rehearse', date: week, scope: 'week', subjectId: 'eng', assessmentId: 'as-3' })!, mine = () => s().tasks.find((t) => t.id === id)!;
  expect(mine().assessmentId).toBe('as-3');
  s().toggleTask(id); s().toggleTask(id); s().toggleTask(id);
  expect(milesLogged(s().log)).toBe(miles + 2);
  const gone = s().deleteAssessment('as-3')!;
  expect(isPreparation(mine(), s().assessments)).toBe(false);
  s().restoreAssessment(gone); expect(isPreparation(mine(), s().assessments)).toBe(true);
  const removed = s().deleteSubject('eng')!; expect(isPreparation(mine(), s().assessments)).toBe(false); expect(mine().subjectId).toBeUndefined();
  s().restoreSubject(removed); expect(isPreparation(mine(), s().assessments)).toBe(true);
  s().updateTask(id, { assessmentId: null }); expect(mine().assessmentId).toBeUndefined();
  const stray = s().addTask({ title: 'Stray', date: week, scope: 'week', assessmentId: 'nowhere' })!;
  expect(s().tasks.find((t) => t.id === stray)!.assessmentId).toBeUndefined();
});
```

- [x] **Step 2:** Run the two test files. Expected: the new tests fail.
- [x] **Step 3: Implement.**
- [x] **Step 4:** Run `npm test` and `npm run build`. Expected: all pass.
- [x] **Step 5: Checkpoint.**

### Task 3: Links on a task, an assessment and a subject

**Files:**
- Modify: `src/state/store.ts`
- Test: `src/state/store.test.ts`

**Interfaces:**
- Consumes: `cleanUrl`, `linkName`, `LINK_LIMITS` (piece 1); `Task.link`, `Assessment.link`, `Subject.links` (Task 1); the store's `moved` and `putBack` helpers.
- Produces: `NewTask.link?: string` and `addAssessment`'s `link`, each kept only if it is a web address; `setTaskLink(id: string, url: string): boolean` and `setAssessmentLink(id: string, url: string): boolean`, where an empty address clears the link and returns true, and a refused one changes nothing and returns false; `addSubjectLink(subjectId: string, input: { name: string; url: string }): string | null`; `updateSubjectLink(subjectId: string, linkId: string, patch: { name?: string; url?: string }): boolean`; `deleteSubjectLink(subjectId: string, linkId: string): { link: QuickLink; index: number } | null`; `restoreSubjectLink(subjectId: string, link: QuickLink, index: number): void`; `moveSubjectLink(subjectId: string, linkId: string, direction: -1 | 1): void`.

- [x] **Step 1: Write the failing tests**

```ts
it('keeps one web address on a task and on an assessment', () => {
  const id = s().addTask({ title: 'Read', date: todayISO(), scope: 'day', link: 'investopedia.com' })!, mine = () => s().tasks.find((t) => t.id === id)!;
  expect(mine().link).toBe('https://investopedia.com/');
  expect(s().setTaskLink(id, 'javascript:alert(1)')).toBe(false); expect(mine().link).toBe('https://investopedia.com/');
  expect(s().setTaskLink(id, '  ')).toBe(true); expect(mine().link).toBeUndefined();
  const bad = s().addTask({ title: 'Bad', date: todayISO(), scope: 'day', link: 'nope' })!; expect(s().tasks.find((t) => t.id === bad)!.link).toBeUndefined();
  const test = () => s().assessments.find((a) => a.id === 'as-1')!;
  expect(s().setAssessmentLink('as-1', 'example.org/notice.pdf')).toBe(true); expect(test().link).toBe('https://example.org/notice.pdf');
  expect(s().setAssessmentLink('as-1', 'ftp://x.y')).toBe(false); expect(test().link).toBe('https://example.org/notice.pdf');
  expect(s().setAssessmentLink('as-1', '')).toBe(true); expect(test().link).toBeUndefined();
  const quiz = s().addAssessment({ title: 'Quiz', subjectId: 'eng', date: todayISO(), kind: 'test', link: 'nope' })!; expect(s().assessments.find((a) => a.id === quiz)!.link).toBeUndefined();
  const essay = s().addAssessment({ title: 'Essay', subjectId: 'eng', date: todayISO(), kind: 'assignment', link: 'example.org/task' })!; expect(s().assessments.find((a) => a.id === essay)!.link).toBe('https://example.org/task');
});
it("adds, changes, moves and removes a subject's links, six at most", () => {
  const links = () => s().subjects.find((x) => x.id === 'eng')!.links ?? [];
  expect(s().addSubjectLink('eng', { name: 'Bad', url: 'mailto:a@b.c' })).toBeNull(); expect(s().addSubjectLink('nowhere', { name: 'x', url: 'x.org' })).toBeNull();
  const a = s().addSubjectLink('eng', { name: '', url: 'quizlet.com/set' })!, b = s().addSubjectLink('eng', { name: 'Syllabus', url: 'https://example.org/syllabus' })!;
  expect(links().map((l) => l.name)).toEqual(['quizlet.com', 'Syllabus']);
  expect(s().updateSubjectLink('eng', b, { url: 'nope' })).toBe(false); expect(s().updateSubjectLink('eng', a, { name: ' Flashcards ' })).toBe(true); expect(links()[0]!.name).toBe('Flashcards');
  s().moveSubjectLink('eng', b, -1); expect(links()[0]!.id).toBe(b);
  const removed = s().deleteSubjectLink('eng', b)!; expect(links().map((l) => l.id)).toEqual([a]);
  s().restoreSubjectLink('eng', removed.link, removed.index); expect(links()[0]!.id).toBe(b);
  for (let i = 0; i < 6; i++) s().addSubjectLink('eng', { name: `n${i}`, url: `site${i}.org` });
  expect(links()).toHaveLength(6); expect(s().subjects.find((x) => x.id === 'mat')!.links ?? []).toEqual([]);
});
```

- [x] **Step 2:** Run `npx vitest run src/state/store.test.ts`. Expected: the two new tests fail.
- [x] **Step 3: Implement.**
- [x] **Step 4:** Run `npm test` and `npm run build`. Expected: all pass.
- [x] **Step 5: Checkpoint.**

### Task 4: Feedback

**Files:**
- Modify: `src/domain/feedback.ts`, `src/state/store.ts`
- Test: `src/domain/feedback.test.ts`, `src/state/store.test.ts`

**Interfaces:**
- Consumes: `cleanFeedback`, `subjectFeedback`, `Feedback` (Task 1).
- Produces, in `feedback.ts`: `feedbackTask(entry: Feedback, tasks: Task[]): Task | undefined`, the task the entry made, if it still exists.
- Produces, in the store: `addFeedback(input: { subjectId: string; date: ISODate; about?: string; words: string; work?: string }): string | null`; `updateFeedback(id: string, patch: { date?: ISODate; about?: string; words?: string; work?: string }): void`, where empty words keep the last good ones; `deleteFeedback(id: string): Feedback | null`; `restoreFeedback(entry: Feedback): void`; `makeFeedbackTask(id: string): string | null`, which makes a task titled with the entry's `work`, for any time this week, carrying the subject, and returns null when there is nothing to work on or the entry's task still exists.

- [x] **Step 1: Write the failing tests**

```ts
// store.test.ts
it('keeps feedback on a subject', () => {
  expect(s().addFeedback({ subjectId: 'eng', date: todayISO(), words: '  ' })).toBeNull();
  expect(s().addFeedback({ subjectId: 'nowhere', date: todayISO(), words: 'Good.' })).toBeNull();
  const id = s().addFeedback({ subjectId: 'eng', date: todayISO(), about: ' Essay ', words: 'The thesis arrives late.' })!, mine = () => s().feedback.find((f) => f.id === id)!;
  expect(mine()).toMatchObject({ about: 'Essay', words: 'The thesis arrives late.', work: '' });
  s().updateFeedback(id, { words: '   ', work: 'Open with the thesis' }); expect(mine()).toMatchObject({ words: 'The thesis arrives late.', work: 'Open with the thesis' });
  const gone = s().deleteFeedback(id)!; expect(s().feedback.some((f) => f.id === id)).toBe(false);
  s().restoreFeedback(gone); expect(mine().about).toBe('Essay');
});
it('makes what to work on into one task', () => {
  const week = weekStartOf(todayISO(), 1), miles = milesLogged(s().log);
  const f = s().addFeedback({ subjectId: 'eng', date: todayISO(), words: 'The thesis arrives late.', work: 'Open with the thesis' })!, entry = () => s().feedback.find((x) => x.id === f)!;
  const t = s().makeFeedbackTask(f)!;
  expect(s().tasks.find((x) => x.id === t)).toMatchObject({ title: 'Open with the thesis', subjectId: 'eng', scope: 'week', date: week });
  expect(s().makeFeedbackTask(f)).toBeNull(); expect(feedbackTask(entry(), s().tasks)?.id).toBe(t);
  s().toggleTask(t); s().toggleTask(t); s().toggleTask(t); expect(milesLogged(s().log)).toBe(miles + 2);
  const gone = s().deleteTasks([t]); expect(feedbackTask(entry(), s().tasks)).toBeUndefined();
  s().restoreTasks(gone); expect(feedbackTask(entry(), s().tasks)?.id).toBe(t);
  s().deleteTasks([t]); const again = s().makeFeedbackTask(f)!; expect(again).not.toBe(t);
  const plain = s().addFeedback({ subjectId: 'eng', date: todayISO(), words: 'Good.' })!; expect(s().makeFeedbackTask(plain)).toBeNull();
  s().deleteFeedback(f); expect(s().tasks.some((x) => x.id === again)).toBe(true);
});
```

- [x] **Step 2:** Run the two test files. Expected: the new tests fail.
- [x] **Step 3: Implement.**
- [x] **Step 4:** Run `npm test` and `npm run build`. Expected: all pass.
- [x] **Step 5: Checkpoint.**

### Task 5: The topic, and the order of the page

**Files:**
- Modify: `src/features/study/StudyPage.tsx`, `src/features/study/Editors.tsx`
- Create: `tests/e2e/support.ts`, `tests/e2e/study-detail.spec.ts`

**Interfaces:**
- Consumes: `updateSubject({ topic })`, `TOPIC_LIMIT` (Task 1).
- Produces: `SubjectEditor` takes `focus?: 'topic'` and puts the cursor in its Topic box; `tests/e2e/support.ts` exports `openWith(page, path, patch, ready?)`, as in `additions.spec.ts` but waiting for `ready` (default `main`), and `sideways(page)`.
- Marks for tests: `[data-topic]`, the button on the subject's page; `[data-topic-line]`, the line in a subject's row of the list.

- [x] **Step 1: Write the failing browser tests**

```ts
test('a topic is set in the editor and shown exactly as typed', async ({ page }) => {      // 1440, /study/eng
  await expect(page.locator('[data-topic]')).toHaveText('Set the topic');
  await page.locator('[data-topic]').click();
  await expect(page.getByLabel('Topic')).toBeFocused();
  await page.getByLabel('Topic').fill('the role of the RBA  in monetary policy');
  await expect(page.locator('[data-topic]')).toContainText('the role of the RBA  in monetary policy');
  await expect(page.locator('[data-subject="eng"] [data-topic-line]')).toHaveText('the role of the RBA in monetary policy');   // the browser shows one space; the words are unchanged
  // clearing it brings "Set the topic" back, and the row loses its line
});
test('the sample shows a topic on Biology and none elsewhere', async ({ page }) => {
  // [data-subject="bio"] [data-topic-line] reads "Cell structure and transport"; [data-topic-line] has count 1
});
test('tasks come before study sessions', async ({ page }) => {
  // the h3 headings of the sheet, in order, are Assessments, Tasks, Study sessions; Notes is last. Task 9 checks the full order.
});
test('a topic that is one long word wraps on a phone', async ({ page }) => {      // 390
  await openWith(page, '/study/eng', { subjects: [{ id: 'eng', name: 'English', colour: 'rose', topic: 'x'.repeat(200) }] }, '#subject-title');
  expect(await sideways(page)).toBe(0);
});
```

- [x] **Step 2:** Run `PW_CHANNEL=chrome npx playwright test tests/e2e/study-detail.spec.ts`. Expected: fail.
- [x] **Step 3: Implement,** to spec section 6. The topic line is a `button` reading "Topic" then the topic, or "Set the topic"; its spoken name is "Change the topic" or "Set the topic". The editor gains "Topic" under "Name", a `DraftInput` with `maxLength` 200. Today's parts go in the order section 6 gives them: Assessments, Tasks, Study sessions, Notes. Feedback, Pages and Links are added between Tasks and Study sessions by Tasks 7 to 9.
- [x] **Step 4:** Run `npm test`, `npm run build` and the whole browser suite. Expected: all pass, the 115 from before unchanged.
- [x] **Step 5: Checkpoint.**

### Task 6: Preparation and links, on assessments and tasks

**Files:**
- Create: `src/features/study/Preparation.tsx`
- Modify: `src/features/study/StudyPage.tsx`, `src/features/study/Editors.tsx`, `src/features/home/TaskEditor.tsx`, `src/features/home/TaskRow.tsx`, `src/features/home/SideLists.tsx`, `src/features/home/HomePage.tsx`
- Test: `tests/e2e/study-detail.spec.ts`

**Interfaces:**
- Consumes: `isPreparation`, `preparationOf`, `preparationProgress` (Task 2); `setTaskLink`, `setAssessmentLink` (Task 3).
- Produces: `Preparation({ assessment, ahead }: { assessment: Assessment; ahead: boolean })`; `ComingUp` takes `tasks: Task[]`; `TaskComposer` takes `assessmentId?: string`.
- Marks for tests: `[data-preparation="<assessment id>"]`; `[data-prepared]`, the line under "Coming up"; `a[data-task-link]`; `a[data-assessment-link]`.

- [x] **Step 1: Write the failing browser tests**

```ts
test('a preparation task sits under its assessment, on Home in its week, and is counted under Coming up', async ({ page }) => {   // 1440, /study/eng
  const prep = page.locator('[data-preparation="as-3"]');
  await prep.getByPlaceholder('Add a preparation task').fill('Rehearse against a timer');
  await page.keyboard.press('Enter');
  await expect(prep).toContainText('Preparation, 0 of 1');
  // it is not listed again under "Tasks": that list still has 2 rows, and its count still reads "2 open"
  // on Home it is under "Any time this week"; "Coming up" shows [data-prepared] reading "0 of 1 prepared" on the English row only
  // ticking it on Home: the voyage plate gains 2 miles once; back in Study it reads "Preparation, 1 of 1" and the row says "Done"
});
test('deleting the assessment keeps its preparation, and Undo puts it back under it', async ({ page }) => {
  // with one preparation task: delete the assessment in its editor; the task is now under "Tasks"; Undo; it is back under the assessment
});
test('a preparation task can be freed from its assessment', async ({ page }) => {
  // its editor says "Preparation for English oral presentation"; "Not preparation" moves it to "Tasks"
});
test('an assessment and a task each carry one link, and refuse what is not a web address', async ({ page }) => {
  // assessment editor: "Notification link" = "example.org/notice.pdf" → a[data-assessment-link] has that href, target _blank, rel noopener, and the name "Notification, opens in a new tab"
  // then "javascript:alert(1)" and leave the box: "That does not look like a web address.", and the href is unchanged
  // task editor: "Link" = "investopedia.com" → a[data-task-link] on its row, in Study and on Home, named "Link for <title>, opens in a new tab"
});
test('with no preparation an assessment shows no count, here or on Home', async ({ page }) => {
  // the sample: no [data-prepared] on Home, and no "Preparation," text in Study
});
test('a past assessment still shows its preparation, with no row to add more', async ({ page }) => {
  // openWith an English assessment dated last week and one task that names it: behind "1 past", the task is listed under it, and there is no "Add a preparation task"
});
```

- [x] **Step 2:** Run the file. Expected: the new tests fail.
- [x] **Step 3: Implement,** to spec section 6. The subject's "Tasks" list is `subjectTasks` over the tasks that are not preparation. "Add a preparation task" is the `TaskComposer` with `assessmentId`, for any time this week. Links in editors are checked when the box is left or Enter is pressed, with the refused text left in the box, as `LinksSettings` does. The arrow on a task's row is an `a` of its own, outside the title button.
- [x] **Step 4:** Run `npm test`, `npm run build` and the whole browser suite. Expected: all pass.
- [x] **Step 5: Checkpoint.**

### Task 7: Feedback on the page

**Files:**
- Create: `src/features/study/Feedback.tsx`
- Modify: `src/features/study/StudyPage.tsx`
- Test: `tests/e2e/study-detail.spec.ts`

**Interfaces:**
- Consumes: the feedback actions and `feedbackTask` (Task 4); `subjectFeedback`; `EditorFrame`, `TaskRow`.
- Produces: `FeedbackPart({ subject }: { subject: Subject })`, which holds the list and its editor.
- Marks for tests: `li[data-feedback="<id>"]`.

- [x] **Step 1: Write the failing browser tests**

```ts
test('feedback is added, changed and deleted with Undo', async ({ page }) => {      // 1440, /study/eng
  await expect(page.getByText('None yet. Feedback is kept here, with anything to work on.')).toBeVisible();
  // "Add feedback": About "Essay", What was said "The thesis arrives late.", To work on "Open with the thesis"; add
  // the entry shows today's date, "Essay", the words, and "To work on" with "Make it a task"
  // an entry with nothing said cannot be added
  // delete it in its editor: "Feedback deleted." with Undo, which brings it back
});
test('what to work on becomes one task, ticked here or on Home', async ({ page }) => {
  // "Make it a task": the entry now shows a task row "Open with the thesis", and "Make it a task" is gone
  // Home lists it under "Any time this week"; tick it there; back in Study its tick is on
  // delete the task: the entry shows its words and "Make it a task" again
});
test('the sample has one entry on Biology', async ({ page }) => {
  // /study/bio: li[data-feedback] has count 1 and contains "Practical report"
});
```

- [x] **Step 2:** Run the file. Expected: the new tests fail.
- [x] **Step 3: Implement,** to spec section 6. The editor's fields are a date, "About", "What was said" (a text area) and "To work on". An existing entry saves as it is typed; a new one is added with "Add feedback".
- [x] **Step 4:** Run `npm test`, `npm run build` and the whole browser suite. Expected: all pass.
- [x] **Step 5: Checkpoint.**

### Task 8: A subject's pages

**Files:**
- Modify: `src/domain/pages.ts`, `src/state/store.ts`, `src/features/study/StudyPage.tsx`
- Create: `src/features/study/SubjectPages.tsx`
- Test: `src/domain/pages.test.ts`, `src/state/store.test.ts`, `tests/e2e/study-detail.spec.ts`

**Interfaces:**
- Produces, in `pages.ts`: `newPage(kind, id, now, start?: { title?: string; subjectId?: string })`; `subjectPages(pages: Page[], subjectId: string): Page[]`, open pages then reached goals, as `sortPages` orders them; `interface Starter { id: string; label: string; kind: PageKind; title?: string }`; `STARTERS: Starter[]`, with the ids `revision`, `weak`, `formula` and `note`, in that order; `startersFor(pages: Page[], subjectId: string): Starter[]`.
- Produces, in the store: `addPage(kind: PageKind, start?: { title?: string; subjectId?: string }): string`, where an unknown subject is left off.
- Marks for tests: `[data-subject-pages] li[data-page="<id>"]`; `button[data-starter="<starter id>"]`.

- [x] **Step 1: Write the failing tests**

```ts
// pages.test.ts
it('offers the starters a subject has not used, and always a note', () => {
  expect(startersFor([], 'eng').map((s) => s.label)).toEqual(['Revision checklist', 'Weak areas', 'Formula sheet', 'Note']);
  expect(STARTERS.map((s) => [s.kind, s.title])).toEqual([['checklist', 'Revision checklist'], ['checklist', 'Weak areas'], ['note', 'Formula sheet'], ['note', undefined]]);
  const used = [page({ title: 'revision CHECKLIST', subjectId: 'eng' }), page({ title: 'Weak areas', subjectId: 'mat' }), page({ title: 'Untitled', subjectId: 'eng' })];
  expect(startersFor(used, 'eng').map((s) => s.label)).toEqual(['Weak areas', 'Formula sheet', 'Note']);
});
it('starts a page with a title and a subject', () => {
  expect(newPage('checklist', 'p1', NOW, { title: 'Revision checklist', subjectId: 'eng' })).toMatchObject({ kind: 'checklist', title: 'Revision checklist', subjectId: 'eng' });
  expect(newPage('note', 'p2', NOW)).toMatchObject({ title: 'Untitled' }); expect(newPage('note', 'p2', NOW).subjectId).toBeUndefined();
});
it("lists a subject's pages as My pages orders them", () => {
  const all = [page({ id: 'old', subjectId: 'eng', updatedAt: '2026-11-01T08:00:00Z' }), page({ id: 'new', subjectId: 'eng', updatedAt: '2026-11-10T08:00:00Z' }), page({ id: 'other', subjectId: 'mat' }), page({ id: 'none' })];
  expect(subjectPages(all, 'eng').map((p) => p.id)).toEqual(['new', 'old']);
});
```

```ts
// store.test.ts
it('starts a page that already carries a subject', () => {
  const id = s().addPage('checklist', { title: 'Weak areas', subjectId: 'eng' });
  expect(s().pages.find((p) => p.id === id)).toMatchObject({ kind: 'checklist', title: 'Weak areas', subjectId: 'eng' });
  const stray = s().addPage('note', { subjectId: 'nowhere' }); expect(s().pages.find((p) => p.id === stray)!.subjectId).toBeUndefined();
});
```

```ts
// study-detail.spec.ts
test("a subject lists its own pages, and starts new ones", async ({ page }) => {      // 1440, /study/eng
  // the sample's two English pages are listed: "Ideas for the English oral" and "Reading for English", each with its kind
  await page.locator('button[data-starter="revision"]').click();
  await expect(page).toHaveURL(/\/pages\/p-/); await expect(page.locator('#page-title')).toHaveText('Revision checklist');
  // back on /study/eng it is the first row, and the "Revision checklist" starter is gone; "Note" is still there
  // selecting a row opens that page
});
test('a subject with no pages shows the starters alone', async ({ page }) => {
  // /study/chi: "Nothing kept for Chinese yet." and four starters
});
```

- [x] **Step 2:** Run the test files. Expected: the new tests fail.
- [x] **Step 3: Implement,** to spec section 6. A row's line is the kind's label, a full stop, then `pageLine(page)`. A page with items shows `listCount` at the right, with `SegmentedProgress` from 640 px. A starter navigates to `/pages/<id>` with `state: { fresh: id }`, as My pages does, so the "Note" starter opens with its title ready to type.
- [x] **Step 4:** Run `npm test`, `npm run build` and the whole browser suite. Expected: all pass.
- [x] **Step 5: Checkpoint.**

### Task 9: A subject's links

**Files:**
- Create: `src/features/links/LinkList.tsx`, `src/features/study/SubjectLinks.tsx`
- Modify: `src/features/places/LinksSettings.tsx`, `src/features/study/StudyPage.tsx`
- Test: `tests/e2e/study-detail.spec.ts`

**Interfaces:**
- Consumes: the subject link actions (Task 3); `LINK_LIMITS`.
- Produces: `LinkList({ links, onAdd, onUpdate, onDelete, onRestore, onMove, addId }: { links: QuickLink[]; onAdd: (input: { name: string; url: string }) => string | null; onUpdate: (id: string, patch: { name?: string; url?: string }) => boolean; onDelete: (id: string) => { link: QuickLink; index: number } | null; onRestore: (link: QuickLink, index: number) => void; onMove: (id: string, direction: -1 | 1) => void; addId?: string })`: the rows and the add row that `LinksSettings` has today, moved out unchanged. `LinksSettings` becomes that list with the store's own link actions and `addId="new-link-name"`. `SubjectLinksPart({ subject }: { subject: Subject })`.
- Marks for tests: `[data-subject-links] a`.

- [x] **Step 1: Write the failing browser tests**

```ts
test("a subject's links are added, shown and removed with Undo", async ({ page }) => {      // 1440, /study/eng
  // "Add a link": Address "quizlet.com/set", no name; add → [data-subject-links] has a link "quizlet.com, opens in a new tab" with href https://quizlet.com/set, target _blank, rel noopener
  // the action now reads "Edit links"; "mailto:a@b.c" is refused with "That does not look like a web address."
  // remove it: "Link removed." with Undo
  // Maths has no links: its page reads "Add a link"
});
test('six is the most for a subject', async ({ page }) => {
  // openWith six links on English: the editor shows "Six is the most." and no "Add link"
});
test('what is worked on comes first', async ({ page }) => {
  // the h3 headings of the sheet, in order: Assessments, Tasks, Feedback, Pages, Links, Study sessions; Notes is last
});
```

- [x] **Step 2:** Run the file. Expected: the new tests fail. Run `PW_CHANNEL=chrome npx playwright test tests/e2e/additions.spec.ts -g "link"` first and note that it passes: those tests are the safety net for moving the rows out of `LinksSettings`.
- [x] **Step 3: Implement,** to spec section 6. Move the rows out first and run the piece 1 link tests again before adding anything.
- [x] **Step 4:** Run `npm test`, `npm run build` and the whole browser suite. Expected: all pass.
- [x] **Step 5: Checkpoint.**

### Task 10: The whole piece, its pictures and its documents

**Files:**
- Modify: `tests/e2e/study-detail.spec.ts`, `docs/study-detail-spec.md`, `docs/study-spec.md`, `docs/testing-report.md`, `docs/HANDOFF.md`, `docs/next-stages.md`
- Create: pictures in `docs/screenshots/study-detail/`, named `1-subject-1440.png` and so on

- [x] **Step 1: Write the last browser tests.** With a 200-character topic, three preparation tasks, a linked task, two feedback entries with long words, four pages and six links all set through `openWith`: at 375, 390, 768, 1024 and 1440 px, on `/study/eng`, `/study` and `/`, `sideways(page)` is 0 and the page logs no errors. On a phone, every new button and link is at least 44 px tall.
- [x] **Step 2:** Run `npm test`, `npm run build`, `PW_CHANNEL=chrome npm run test:e2e`, then `CI=1 PW_CHANNEL=chrome npm run test:e2e`. Expected: all pass; the 256 unit and 115 browser tests from before pass unchanged; six sea tests are skipped under CI.
- [x] **Step 3: Walk the spec's section 11,** "Done when", line by line in a browser, and section 10 by keyboard alone. Fix what fails.
- [x] **Step 4: Take the pictures** of the built pages with a temporary spec, deleted afterwards: a subject at 1440 and 390, the list of subjects, Home's "Coming up", the feedback editor and the links editor. Compare each with its mock and fix meaningful differences.
- [x] **Step 5: Have the whole change reviewed** by a fresh reviewer against the spec, with this plan's Review Focus, before the documents are finished. Fix what is critical or important, each with a test that fails first.
- [x] **Step 6: Update the documents.** In the spec: the status line, and a last section "As built". In `study-spec.md`: what is now built, and its "Not in this version". In `testing-report.md`: a section for this piece. In `HANDOFF.md`: the branch, the new files and the test counts. In `next-stages.md`: piece 2 marked as built.
- [x] **Step 7: Ask Oliver to approve the commit.** Before asking, read `git status` and check that nothing personal to a founder is in the change. Commit only on a yes, as one commit on `study-detail`. Do not push without being asked.

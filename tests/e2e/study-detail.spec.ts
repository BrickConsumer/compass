import { expect, type Page, test } from '@playwright/test';
import { addDaysISO, todayISO, weekStartOf } from '../../src/domain/dates';
import { openWith, saved, sideways } from './support';

const sheet = (page: Page) => page.locator('section[aria-labelledby="subject-title"]');
const topic = (page: Page) => page.locator('[data-topic]');
const topicBox = (page: Page) => page.getByRole('textbox', { name: 'Topic' });
const row = (page: Page, id: string) => page.locator(`a[data-subject="${id}"]`);

// The topic, and the order of the page

test('a topic is set in the editor and kept exactly as typed', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study/eng', {});
  await expect(topic(page)).toHaveText('Set the topic');
  await topic(page).click();
  await expect(topicBox(page)).toBeFocused();
  await topicBox(page).fill('the role of the RBA  in monetary policy');
  await page.keyboard.press('Escape');
  // an editor takes a moment to leave, and the line is not there to be pressed until it has gone
  await expect(page.getByRole('dialog', { name: 'Edit subject' })).toBeHidden();
  await expect(topic(page)).toContainText('the role of the RBA');
  await expect(topic(page)).toHaveAccessibleName(/Change the topic/);
  // no capital added, and the two spaces are still two
  expect((await saved(page)).subjects.find((s: { id: string }) => s.id === 'eng').topic).toBe('the role of the RBA  in monetary policy');
  await expect(row(page, 'eng').locator('[data-topic-line]')).toContainText('monetary policy');
  // with the topic gone, the page asks for one again and the row loses its line
  await topic(page).click();
  await topicBox(page).fill('');
  await page.keyboard.press('Escape');
  await expect(topic(page)).toHaveText('Set the topic');
  await expect(row(page, 'eng').locator('[data-topic-line]')).toHaveCount(0);
});

test('the sample shows a topic on Biology and none elsewhere', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study', {});
  await expect(row(page, 'bio').locator('[data-topic-line]')).toHaveText('Cell structure and transport');
  await expect(page.locator('[data-topic-line]')).toHaveCount(1);
  await expect(topic(page)).toContainText('Cell structure and transport');
  // the row still says what it said before
  await expect(row(page, 'bio')).toContainText('3 open tasks. Biology test in 4 days.');
});

test('tasks come before study sessions, and notes are last', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study/eng', {});
  const headings = await sheet(page).locator('h3').allTextContents();
  expect(headings.indexOf('Assessments')).toBeLessThan(headings.indexOf('Tasks'));
  expect(headings.indexOf('Tasks')).toBeLessThan(headings.indexOf('Study sessions'));
  const last = (await sheet(page).locator('h3').last().boundingBox())!, notes = (await page.locator('#subject-notes').boundingBox())!;
  expect(notes.y).toBeGreaterThan(last.y);
});

// Preparation and links, on assessments and tasks

const WRONG = 'That does not look like a web address.';
const prep = (page: Page, id = 'as-3') => page.locator(`[data-preparation="${id}"]`);
const ownTasks = (page: Page) => sheet(page).locator('[data-own-tasks]');
const plate = (page: Page) => page.locator('a.absolute[aria-label^="Open the voyage."]');
const miles = async (page: Page) => Number((await plate(page).getAttribute('aria-label'))!.match(/([\d,]+) nautical miles/)![1]!.replace(',', ''));
const addPrep = async (page: Page, title: string) => { await prep(page).getByPlaceholder('Add a preparation task').fill(title); await page.keyboard.press('Enter'); await expect(prep(page).locator('li[data-task]', { hasText: title })).toHaveCount(1); };

test('a preparation task sits under its assessment, on Home in its week, and is counted under Coming up', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study/eng', {});
  await expect(ownTasks(page).locator('li[data-task]')).toHaveCount(2);
  await addPrep(page, 'Rehearse against a timer');
  await expect(prep(page)).toContainText('Preparation, 0 of 1');
  // it is listed once: under its assessment, and not again under "Tasks"
  await expect(ownTasks(page).locator('li[data-task]')).toHaveCount(2);
  await expect(ownTasks(page)).toContainText('2 open');
  // the list of subjects still counts every open task
  await expect(row(page, 'eng')).toContainText('3 open tasks');

  await page.goto('/');
  const before = await miles(page), box = page.getByRole('checkbox', { name: 'Rehearse against a timer' });
  await expect(page.locator('section[aria-labelledby="week-title"] li[data-task]', { hasText: 'Rehearse against a timer' })).toHaveCount(1);
  const prepared = page.locator('section[aria-labelledby="coming-title"] [data-prepared]');
  await expect(prepared).toHaveCount(1);
  await expect(prepared).toContainText('0 of 1 prepared');
  await box.click();
  await expect(prepared).toContainText('1 of 1 prepared');
  await expect.poll(() => miles(page)).toBe(before + 2);
  // it is one record: unticking and ticking again earns nothing more
  await box.click(); await box.click();
  await expect(prepared).toContainText('1 of 1 prepared');
  expect(await miles(page)).toBe(before + 2);

  await page.goto('/study/eng');
  await expect(prep(page)).toContainText('Preparation, 1 of 1');
  await expect(prep(page).locator('li[data-task]')).toContainText('Done');
});

test('deleting the assessment keeps its preparation, and Undo puts it back under it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study/eng', {});
  await addPrep(page, 'Record a practice run');
  await sheet(page).locator('li[data-assessment="as-3"] button').first().click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(prep(page)).toHaveCount(0);
  await expect(ownTasks(page).locator('li[data-task]')).toHaveCount(3);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(prep(page).locator('li[data-task]')).toHaveCount(1);
  await expect(ownTasks(page).locator('li[data-task]')).toHaveCount(2);
});

test('a preparation task can be freed from its assessment', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study/eng', {});
  await addPrep(page, 'Record a practice run');
  await prep(page).getByRole('button', { name: 'Record a practice run', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Edit task' });
  await expect(editor).toContainText('Preparation for English oral presentation');
  await editor.getByRole('button', { name: 'Not preparation' }).click();
  await expect(prep(page).locator('li[data-task]')).toHaveCount(0);
  await expect(ownTasks(page).locator('li[data-task]', { hasText: 'Record a practice run' })).toHaveCount(1);
});

test('an assessment and a task each carry one link, and refuse what is not a web address', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study/eng', {});
  // the assessment's notification
  await sheet(page).locator('li[data-assessment="as-3"] button').first().click();
  const notice = page.getByRole('textbox', { name: 'Notification link' });
  await notice.fill('example.org/notice.pdf');
  await notice.blur();
  const noticeLink = page.locator('a[data-assessment-link]');
  await expect(noticeLink).toHaveAttribute('href', 'https://example.org/notice.pdf');
  await expect(noticeLink).toHaveAttribute('target', '_blank');
  await expect(noticeLink).toHaveAttribute('rel', /noopener/);
  await expect(noticeLink).toHaveAccessibleName('Notification, opens in a new tab');
  await notice.fill('javascript:alert(1)');
  await notice.blur();
  await expect(page.getByText(WRONG)).toBeVisible();
  await expect(noticeLink).toHaveAttribute('href', 'https://example.org/notice.pdf');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Edit assessment' })).toBeHidden();
  // a task's link, on its row here and on Home
  await ownTasks(page).getByRole('button', { name: 'Draft the English oral outline', exact: true }).click();
  const link = page.getByRole('textbox', { name: 'Link', exact: true });
  await link.fill('data:text/html,hi');
  await link.blur();
  await expect(page.getByText(WRONG)).toBeVisible();
  await expect(page.locator('a[data-task-link]')).toHaveCount(0);
  await link.fill('investopedia.com');
  await link.blur();
  const taskLink = sheet(page).locator('a[data-task-link]');
  await expect(taskLink).toHaveAttribute('href', 'https://investopedia.com/');
  await expect(taskLink).toHaveAttribute('target', '_blank');
  await expect(taskLink).toHaveAccessibleName('Link for Draft the English oral outline, opens in a new tab');
  expect((await saved(page)).tasks.filter((t: { link?: string }) => t.link).map((t: { link?: string }) => t.link)).toEqual(['https://investopedia.com/']);
  await page.goto(`/?date=${addDaysISO(todayISO(), 1)}`);
  await expect(page.locator('section[aria-labelledby="day-title"] a[data-task-link]')).toHaveAttribute('href', 'https://investopedia.com/');
});

test('with no preparation an assessment shows no count, here or on Home', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/', {});
  await expect(page.locator('#day-title')).toBeVisible();
  await expect(page.locator('[data-prepared]')).toHaveCount(0);
  await page.goto('/study/eng');
  await expect(prep(page).getByPlaceholder('Add a preparation task')).toHaveCount(1);
  await expect(sheet(page).getByText(/Preparation,/)).toHaveCount(0);
  await expect(page.locator('a[data-assessment-link], a[data-task-link]')).toHaveCount(0);
});

test('a past assessment still shows its preparation, with no row to add more', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const lastWeek = addDaysISO(todayISO(), -7);
  await openWith(page, '/study/eng', {
    assessments: [{ id: 'old', title: 'Old essay', subjectId: 'eng', date: lastWeek, kind: 'assignment' }],
    tasks: [{ id: 't-old', title: 'Plan the old essay', priority: 'normal', scope: 'day', date: lastWeek, order: 1, createdAt: '2026-11-01T08:00:00.000Z', subjectId: 'eng', assessmentId: 'old' }],
  });
  await sheet(page).getByRole('button', { name: '1 past' }).click();
  await expect(prep(page, 'old').locator('li[data-task]')).toContainText('Plan the old essay');
  await expect(page.getByPlaceholder('Add a preparation task')).toHaveCount(0);
  await expect(ownTasks(page).locator('li[data-task]')).toHaveCount(0);
});

// Feedback

const entries = (page: Page) => sheet(page).locator('li[data-feedback]');
const feedbackEditor = (page: Page) => page.getByRole('dialog', { name: /feedback/i });

test('feedback is added, changed and deleted with Undo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study/eng', {});
  await expect(sheet(page).getByText('None yet. Feedback is kept here, with anything to work on.')).toBeVisible();
  await sheet(page).getByRole('button', { name: 'Add feedback' }).click();
  // an entry with nothing said cannot be added
  await feedbackEditor(page).getByRole('textbox', { name: 'About' }).fill('Essay on the set text');
  await feedbackEditor(page).getByRole('button', { name: 'Add feedback' }).click();
  await expect(entries(page)).toHaveCount(0);
  await feedbackEditor(page).getByRole('textbox', { name: 'What was said' }).fill('The argument is clear, but the thesis arrives late.');
  await feedbackEditor(page).getByRole('textbox', { name: 'To work on' }).fill('Open with the thesis');
  await feedbackEditor(page).getByRole('button', { name: 'Add feedback' }).click();
  await expect(entries(page)).toHaveCount(1);
  await expect(entries(page)).toContainText('Essay on the set text');
  await expect(entries(page)).toContainText('The argument is clear, but the thesis arrives late.');
  await expect(entries(page)).toContainText('Open with the thesis');
  await expect(entries(page).getByRole('button', { name: 'Make it a task' })).toBeVisible();
  await expect(sheet(page).getByText('None yet. Feedback is kept here')).toHaveCount(0);
  // changing it saves as it is typed
  await entries(page).getByRole('button', { name: /Essay on the set text/ }).click();
  await feedbackEditor(page).getByRole('textbox', { name: 'About' }).fill('Essay, second draft');
  await expect(entries(page)).toContainText('Essay, second draft');
  // deleting it can be undone
  await feedbackEditor(page).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Feedback deleted.')).toBeVisible();
  await expect(entries(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(entries(page)).toContainText('Essay, second draft');
});

test('what to work on becomes one task, ticked here or on Home', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const entry = { id: 'f-1', subjectId: 'eng', date: todayISO(), about: 'Essay', words: 'The thesis arrives late.', work: 'Open with the thesis' };
  await openWith(page, '/study/eng', { feedback: [entry] });
  await entries(page).getByRole('button', { name: 'Make it a task' }).click();
  await expect(entries(page).getByRole('button', { name: 'Make it a task' })).toHaveCount(0);
  await expect(entries(page).locator('li[data-task]')).toContainText('Open with the thesis');
  // it is an ordinary task, and it is on this page once: beside its feedback, and not again under "Tasks"
  await expect(ownTasks(page).locator('li[data-task]', { hasText: 'Open with the thesis' })).toHaveCount(0);
  await expect(ownTasks(page)).toContainText('2 open');
  await expect(row(page, 'eng')).toContainText('3 open tasks');
  expect((await saved(page)).tasks.filter((t: { title: string }) => t.title === 'Open with the thesis')).toHaveLength(1);
  await page.goto('/');
  await page.getByRole('checkbox', { name: 'Open with the thesis' }).click();
  await page.goto('/study/eng');
  await expect(entries(page).getByRole('checkbox', { name: 'Open with the thesis' })).toBeChecked();
  // with its task deleted, the entry shows its words again. The editor opens beside the row that was pressed
  await entries(page).getByRole('button', { name: 'Open with the thesis', exact: true }).click();
  await expect(entries(page).locator('li[data-task][data-editing="true"]')).toHaveCount(1);
  await page.getByRole('dialog', { name: 'Edit task' }).getByRole('button', { name: 'Delete' }).click();
  await expect(entries(page).getByRole('button', { name: 'Make it a task' })).toBeVisible();
  await expect(entries(page).locator('li[data-task]')).toHaveCount(0);
});

test('the sample has one entry on Biology, and feedback fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWith(page, '/study/bio', {}, '#subject-title');
  await expect(entries(page)).toHaveCount(1);
  await expect(entries(page)).toContainText('Practical report');
  await expect(entries(page)).toContainText('Say what each result means');
  expect(await sideways(page)).toBe(0);
  expect((await entries(page).getByRole('button', { name: 'Make it a task' }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test('a topic that is one long word wraps on a phone, and is cut short in the list', async ({ page }) => {
  const long = { subjects: [{ id: 'eng', name: 'English', colour: 'rose', topic: 'x'.repeat(200) }] };
  await page.setViewportSize({ width: 390, height: 844 });
  await openWith(page, '/study/eng', long, '#subject-title');
  await expect(topic(page)).toContainText('xxxxxxxx');
  expect(await sideways(page)).toBe(0);
  expect((await topic(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study', long);
  expect(await sideways(page)).toBe(0);
});

// A subject's pages

const pagesPart = (page: Page) => sheet(page).locator('[data-subject-pages]');
const pageRows = (page: Page) => pagesPart(page).locator('li[data-page]');
const starters = (page: Page) => pagesPart(page).locator('button[data-starter]');
const pageEditor = (page: Page) => page.getByRole('dialog', { name: 'Edit page' });

test('a subject lists its own pages, and starts new ones', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study/eng', {});
  // the sample's two English pages, the one changed last first, each with its kind
  await expect(pageRows(page)).toHaveCount(2);
  await expect(pageRows(page).nth(0)).toContainText('Reading for English');
  await expect(pageRows(page).nth(0).locator('[data-page-line]')).toHaveText('Reading');
  await expect(pageRows(page).nth(0).locator('[data-count]')).toHaveText('1 of 4');
  await expect(pageRows(page).nth(1)).toContainText('Ideas for the English oral');
  await expect(pageRows(page).nth(1).locator('[data-page-line]')).toContainText('Note. Open with the lighthouse scene');
  await expect(pageRows(page).nth(1).locator('[data-count]')).toHaveCount(0);
  await expect(starters(page)).toHaveText(['Revision checklist', 'Weak areas', 'Formula sheet', 'Note']);
  await page.locator('button[data-starter="revision"]').click();
  await expect(page).toHaveURL(/\/pages\/p-/);
  await expect(page.locator('#page-title')).toHaveText('Revision checklist');
  // it already carries the subject, and it opens ready to fill in, with no editor in the way
  await expect(page.locator('[data-page-facts]')).toContainText('English');
  await expect(page.locator('[data-kind="checklist"]')).toBeVisible();
  await expect(pageEditor(page)).toBeHidden();
  await page.goto('/study/eng');
  await expect(pageRows(page)).toHaveCount(3);
  await expect(pageRows(page).nth(0)).toContainText('Revision checklist');
  await expect(starters(page)).toHaveText(['Weak areas', 'Formula sheet', 'Note']);
  // selecting a row opens that page in My pages
  await pageRows(page).nth(1).getByRole('link').click();
  await expect(page).toHaveURL(/\/pages\/pg-read$/);
  await expect(page.locator('#page-title')).toHaveText('Reading for English');
});

test('a subject with no pages shows the starters alone, and a note opens ready to be named', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study/chi', {});
  await expect(pagesPart(page).getByText('Nothing kept for Chinese yet.')).toBeVisible();
  await expect(pageRows(page)).toHaveCount(0);
  await expect(starters(page)).toHaveCount(4);
  await page.locator('button[data-starter="note"]').click();
  await expect(page).toHaveURL(/\/pages\/p-/);
  const title = pageEditor(page).getByRole('textbox', { name: 'Title' });
  await expect(title).toBeFocused();
  await expect(title).toHaveValue('Untitled');
  await title.fill('Vocabulary');
  await page.keyboard.press('Enter');
  await expect(pageEditor(page)).toBeHidden();
  await expect(page.locator('#page-title')).toHaveText('Vocabulary');
  await page.goto('/study/chi');
  await expect(pageRows(page)).toHaveCount(1);
  await expect(pageRows(page)).toContainText('Vocabulary');
  await expect(pagesPart(page).getByText('Nothing kept for Chinese yet.')).toHaveCount(0);
  // a second note is not a mistake, so "Note" is still offered
  await expect(starters(page)).toHaveCount(4);
});

test("a page's count has its bar from 640 px, and a long title fits a phone", async ({ page }) => {
  const at = `${todayISO()}T08:00:00.000Z`, items = Array.from({ length: 7 }, (_, i) => ({ id: `i-${i}`, text: `Mistake ${i + 1}`, done: i < 3 }));
  const pages = [
    { id: 'pg-a', title: 'Common mistakes', kind: 'checklist', subjectId: 'eng', items, text: '', createdAt: at, updatedAt: at },
    { id: 'pg-b', title: 'W'.repeat(80), kind: 'note', subjectId: 'eng', items: [], text: 'x'.repeat(300), createdAt: at, updatedAt: at },
  ];
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study/eng', { pages });
  const counted = pagesPart(page).locator('li[data-page="pg-a"]');
  await expect(counted.locator('[data-page-line]')).toHaveText('Checklist');
  await expect(counted.locator('[data-count]')).toHaveText('3 of 7');
  await expect(counted.locator('[data-bar]')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await openWith(page, '/study/eng', { pages }, '#subject-title');
  await expect(counted.locator('[data-count]')).toHaveText('3 of 7');
  await expect(counted.locator('[data-bar]')).toBeHidden();
  expect(await sideways(page)).toBe(0);
  for (const control of [...await starters(page).all(), ...await pageRows(page).getByRole('link').all()]) expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

// A subject's links

const subjectLinks = (page: Page) => sheet(page).locator('[data-subject-links] a');
const linksAction = (page: Page) => sheet(page).locator('button[data-edit-links]');
const linksEditor = (page: Page) => sheet(page).locator('[data-links-editor]');
const SAMPLE_SUBJECTS = [
  { id: 'bio', name: 'Biology', colour: 'seafoam' }, { id: 'eco', name: 'Economics', colour: 'brass' }, { id: 'eng', name: 'English', colour: 'rose' },
  { id: 'mat', name: 'Mathematics', colour: 'marine' }, { id: 'chi', name: 'Chinese', colour: 'heather' },
];
const withLinks = (links: unknown[]) => ({ subjects: SAMPLE_SUBJECTS.map((s) => (s.id === 'eng' ? { ...s, links } : s)) });

test("a subject's links are added, shown and removed with Undo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study/eng', {});
  await expect(subjectLinks(page)).toHaveCount(0);
  await expect(linksAction(page)).toHaveText('Add a link');
  await linksAction(page).click();
  // opened to add a first link, the editor starts in its name box
  await expect(linksEditor(page).getByLabel('Name', { exact: true })).toBeFocused();
  await linksEditor(page).getByLabel('Address', { exact: true }).fill('quizlet.com/set');
  await linksEditor(page).getByRole('button', { name: 'Add link' }).click();
  const link = sheet(page).getByRole('link', { name: 'quizlet.com, opens in a new tab' });
  await expect(link).toHaveAttribute('href', 'https://quizlet.com/set');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
  await expect(subjectLinks(page)).toHaveCount(1);
  // something that is not a web page is refused, and never becomes a link
  await linksEditor(page).getByLabel('Address', { exact: true }).fill('mailto:a@b.c');
  await linksEditor(page).getByRole('button', { name: 'Add link' }).click();
  await expect(linksEditor(page).getByText(WRONG)).toBeVisible();
  await expect(subjectLinks(page)).toHaveCount(1);
  // an address changed to something that is not one is refused too, and the link keeps the last good one
  await linksEditor(page).getByLabel('Link 1 address').fill('javascript:alert(1)');
  await page.keyboard.press('Enter');
  await expect(linksEditor(page).getByText(WRONG).first()).toBeVisible();
  await expect(link).toHaveAttribute('href', 'https://quizlet.com/set');
  // closed, the action says what it now does
  await linksAction(page).click();
  await expect(linksEditor(page)).toHaveCount(0);
  await expect(linksAction(page)).toHaveText('Edit links');
  // removing it can be undone while the editor is still open
  await linksAction(page).click();
  await linksEditor(page).getByRole('button', { name: 'Remove quizlet.com' }).click();
  await expect(page.getByText('Link removed.')).toBeVisible();
  await expect(subjectLinks(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(subjectLinks(page)).toHaveCount(1);
  expect((await saved(page)).subjects.find((s: { id: string }) => s.id === 'eng').links).toHaveLength(1);
  // the links are the subject's own: Mathematics has none, and nothing was added to your own links
  await page.goto('/study/mat');
  await expect(subjectLinks(page)).toHaveCount(0);
  await expect(linksAction(page)).toHaveText('Add a link');
  await expect(page.locator('[data-links="rail"]')).toHaveCount(0);
});

test('six is the most for a subject, and they fit a phone', async ({ page }) => {
  const six = Array.from({ length: 6 }, (_, i) => ({ id: `sl${i}`, name: i ? `Site number ${i}` : 'A link with a long name.', url: `https://site${i}.org/a/long/path/to/a/page.html` }));
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study/eng', withLinks(six));
  await expect(subjectLinks(page)).toHaveCount(6);
  await linksAction(page).click();
  await expect(linksEditor(page)).toContainText('Six is the most.');
  await expect(linksEditor(page).getByRole('button', { name: 'Add link' })).toHaveCount(0);
  // the first has nowhere to move up to; moved down, it is second on the page
  await expect(linksEditor(page).getByRole('button', { name: 'Move A link with a long name. up' })).toBeDisabled();
  await linksEditor(page).getByRole('button', { name: 'Move A link with a long name. down' }).click();
  await expect(subjectLinks(page).first()).toHaveAccessibleName('Site number 1, opens in a new tab');
  await expect(subjectLinks(page).nth(1)).toHaveAccessibleName('A link with a long name., opens in a new tab');
  // on a phone, nothing is pushed sideways and everything can be pressed with a thumb
  await page.setViewportSize({ width: 390, height: 844 });
  await openWith(page, '/study/eng', withLinks(six), '#subject-title');
  expect(await sideways(page)).toBe(0);
  for (const a of await subjectLinks(page).all()) expect((await a.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await linksAction(page).click();
  await expect(linksEditor(page)).toBeVisible();
  expect(await sideways(page)).toBe(0);
  for (const control of [linksAction(page), ...await linksEditor(page).getByRole('button').all(), ...await linksEditor(page).getByRole('textbox').all()]) expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test('a save with something that is not a web address among a subject\'s links opens without it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study/eng', withLinks([{ id: 'a', name: 'Bad', url: 'javascript:alert(1)' }, { id: 'b', name: 'Fine', url: 'https://example.org/' }, null]));
  await expect(subjectLinks(page)).toHaveCount(1);
  await expect(subjectLinks(page)).toHaveAttribute('href', 'https://example.org/');
});

test('what is worked on comes first', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study/eng', {});
  expect(await sheet(page).locator('h3').allTextContents()).toEqual(['Assessments', 'Tasks', 'Feedback', 'Pages', 'Links', 'Study sessions']);
  const last = (await sheet(page).locator('h3').last().boundingBox())!, notes = (await page.locator('#subject-notes').boundingBox())!;
  expect(notes.y).toBeGreaterThan(last.y);
});

// The whole piece

const LONG = 'Pneumonoultramicroscopicsilicovolcanoconiosis'.repeat(3);
const NOW = `${todayISO()}T08:00:00.000Z`, THIS_WEEK = weekStartOf(todayISO(), 1);
const made = (id: string, title: string, over: Record<string, unknown> = {}) => ({ id, title, priority: 'normal', scope: 'day', date: todayISO(), order: 1, createdAt: NOW, subjectId: 'eng', ...over });
const listed = (id: string, total: number, done: number) => Array.from({ length: total }, (_, i) => ({ id: `${id}-${i}`, text: `Item ${i + 1}`, done: i < done }));
const kept = (id: string, over: Record<string, unknown>) => ({ id, title: id, kind: 'note', subjectId: 'eng', items: [], text: '', createdAt: NOW, updatedAt: NOW, ...over });
/** Every new part of a subject's page, each at its longest. */
const FULL = {
  subjects: SAMPLE_SUBJECTS.map((s) => (s.id === 'eng' ? {
    ...s, topic: `Module B ${'x'.repeat(191)}`,
    links: Array.from({ length: 6 }, (_, i) => ({ id: `sl${i}`, name: i ? `Site number ${i}` : 'A link with a long name.', url: `https://site${i}.org/a/long/path/to/a/page.html` })),
  } : s)),
  tasks: [
    made('t-p1', 'Draft the outline', { assessmentId: 'as-3', completedAt: NOW }),
    made('t-p2', `Rehearse ${LONG}`.slice(0, 140), { assessmentId: 'as-3', date: addDaysISO(todayISO(), 1), order: 2, link: 'https://example.org/a/long/path/to/a/page.html' }),
    made('t-p3', 'Record a practice run', { assessmentId: 'as-3', scope: 'week', date: addDaysISO(THIS_WEEK, 7), order: 3 }),
    made('t-link', 'A task with a link, and a title that is long enough to need a second line on a phone', { link: 'https://example.org/a/long/path/to/a/page.html', priority: 'high', order: 4 }),
    made('t-fb', 'Open every essay with the thesis', { scope: 'week', date: THIS_WEEK, order: 5 }),
  ],
  assessments: [{ id: 'as-3', title: 'English oral presentation', subjectId: 'eng', date: addDaysISO(todayISO(), 12), kind: 'presentation', link: 'https://example.org/notice.pdf' }],
  feedback: [
    { id: 'f-1', subjectId: 'eng', date: todayISO(), about: LONG.slice(0, 80), words: `${LONG} ${'The thesis arrives late. '.repeat(20)}`.trim(), work: 'Open every essay with the thesis', taskId: 't-fb' },
    { id: 'f-2', subjectId: 'eng', date: addDaysISO(todayISO(), -9), about: 'Short answers', words: 'Quote less and analyse more.', work: LONG.slice(0, 140) },
    // the shortest an entry can be: one word, and nothing else
    { id: 'f-3', subjectId: 'eng', date: addDaysISO(todayISO(), -40), about: '', words: 'Good.', work: '' },
  ],
  pages: [
    kept('pg-a', { title: 'Common mistakes', kind: 'checklist', items: listed('a', 7, 3) }),
    kept('pg-b', { title: 'W'.repeat(80), text: LONG.repeat(2) }),
    kept('pg-c', { title: 'A better mark in the oral', kind: 'goal', items: listed('c', 5, 2), aimFor: addDaysISO(todayISO(), 24), text: 'Because it counts.' }),
    kept('pg-d', { title: 'Everything on the reading list for the year', kind: 'reading', items: listed('d', 25, 11) }),
  ],
};

for (const width of [375, 390, 768, 1024, 1440]) {
  test(`with every new part at its longest, nothing is wider than the screen at ${width} px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await openWith(page, '/study/eng', FULL, '#subject-title');
    // everything is there to be measured: three preparation tasks, three entries, four pages and six links
    await expect(prep(page).locator('li[data-task]')).toHaveCount(3);
    await expect(entries(page)).toHaveCount(3);
    await expect(pageRows(page)).toHaveCount(4);
    await expect(subjectLinks(page)).toHaveCount(6);
    expect(await sideways(page), 'a subject').toBe(0);
    await linksAction(page).click();
    await expect(linksEditor(page)).toBeVisible();
    expect(await sideways(page), 'a subject, changing its links').toBe(0);
    await page.goto('/study');
    await expect(row(page, 'eng')).toBeVisible();
    expect(await sideways(page), 'the subjects').toBe(0);
    await page.goto('/');
    await expect(page.locator('#day-title')).toBeVisible();
    await expect(page.locator('[data-prepared]').first()).toContainText('1 of 3 prepared');
    expect(await sideways(page), 'Home').toBe(0);
    expect(errors).toEqual([]);
  });
}

test('on a phone, every new button and link is tall enough for a thumb', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWith(page, '/study/eng', FULL, '#subject-title');
  await linksAction(page).click();
  await expect(linksEditor(page)).toBeVisible();
  const controls = sheet(page).locator('[data-topic], [data-preparation] a, [data-preparation] button, a[data-task-link], li[data-feedback] button, [data-add-feedback], [data-subject-pages] a, [data-subject-pages] button, [data-links-part] a, [data-links-part] button');
  // only what can be seen and pressed: a row keeps a few controls out of sight until they are wanted
  const shown = controls.filter({ visible: true });
  expect(await shown.count()).toBeGreaterThan(30);
  for (const control of await shown.all()) {
    const box = (await control.boundingBox())!;
    expect(box.height, await control.evaluate((el) => `${el.tagName} ${el.getAttribute('aria-label') ?? el.textContent}`)).toBeGreaterThanOrEqual(44);
  }
});

test('the new parts work by keyboard alone', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study/eng', {});
  // the topic: Enter on its line opens the editor in the topic box, and Escape hands the cursor back to the line
  await topic(page).focus();
  await page.keyboard.press('Enter');
  await expect(topicBox(page)).toBeFocused();
  await page.keyboard.type('Module B');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Edit subject' })).toBeHidden();
  await expect(topic(page)).toContainText('Module B');
  await expect(topic(page)).toBeFocused();
  // a preparation task: typed, added with Enter, and ticked with Space on a real checkbox
  await prep(page).getByPlaceholder('Add a preparation task').focus();
  await page.keyboard.type('Rehearse against a timer');
  await page.keyboard.press('Enter');
  const tick = prep(page).getByRole('checkbox', { name: 'Rehearse against a timer' });
  await tick.focus();
  await page.keyboard.press('Space');
  await expect(tick).toBeChecked();
  await expect(prep(page)).toContainText('Preparation, 1 of 1');
  // feedback: the editor opens in its first box, Tab moves through it, and Enter adds the entry
  await sheet(page).getByRole('button', { name: 'Add feedback' }).focus();
  await page.keyboard.press('Enter');
  await expect(feedbackEditor(page).getByRole('textbox', { name: 'About' })).toBeFocused();
  await page.keyboard.type('Essay');
  await page.keyboard.press('Tab');
  await expect(feedbackEditor(page).getByRole('textbox', { name: 'What was said' })).toBeFocused();
  await page.keyboard.type('The thesis arrives late.');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Open with the thesis');
  await page.keyboard.press('Enter');
  await expect(feedbackEditor(page)).toBeHidden();
  await expect(entries(page)).toHaveCount(1);
  await entries(page).getByRole('button', { name: 'Make it a task' }).focus();
  await page.keyboard.press('Enter');
  await expect(entries(page).getByRole('checkbox', { name: 'Open with the thesis' })).toBeVisible();
  // links: Enter on "Add a link" opens the rows in the name box, and Enter in the address adds the link
  await linksAction(page).focus();
  await page.keyboard.press('Enter');
  await expect(linksEditor(page).getByLabel('Name', { exact: true })).toBeFocused();
  await page.keyboard.type('Flashcards');
  await page.keyboard.press('Tab');
  await page.keyboard.type('example.org/flashcards');
  await page.keyboard.press('Enter');
  await expect(sheet(page).getByRole('link', { name: 'Flashcards, opens in a new tab' })).toHaveAttribute('href', 'https://example.org/flashcards');
  // a starter is a button, and Enter on it opens the new page
  await page.locator('button[data-starter="weak"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#page-title')).toHaveText('Weak areas');
  // every new part has a real heading
  await page.goto('/study/eng');
  for (const name of ['Assessments', 'Tasks', 'Feedback', 'Pages', 'Links', 'Study sessions']) await expect(sheet(page).getByRole('heading', { level: 3, name, exact: true })).toBeVisible();
});

// What the review of the whole change found

test('a link typed in an editor is kept when the editor is closed with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study/eng', {});
  const taskEditor = page.getByRole('dialog', { name: 'Edit task' }), taskLink = sheet(page).locator('a[data-task-link]');
  await ownTasks(page).getByRole('button', { name: 'Draft the English oral outline', exact: true }).click();
  await page.getByRole('textbox', { name: 'Link', exact: true }).fill('example.org/outline');
  await page.keyboard.press('Escape');
  await expect(taskEditor).toBeHidden();
  await expect(taskLink).toHaveAttribute('href', 'https://example.org/outline');
  // something that is not a web address is still not kept, and the last good one stays
  await ownTasks(page).getByRole('button', { name: 'Draft the English oral outline', exact: true }).click();
  await page.getByRole('textbox', { name: 'Link', exact: true }).fill('javascript:alert(1)');
  await page.keyboard.press('Escape');
  await expect(taskEditor).toBeHidden();
  await expect(taskLink).toHaveAttribute('href', 'https://example.org/outline');
  // the same for an assessment's notification
  await sheet(page).locator('li[data-assessment="as-3"] button').first().click();
  await page.getByRole('textbox', { name: 'Notification link' }).fill('example.org/notice.pdf');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Edit assessment' })).toBeHidden();
  await expect(page.locator('a[data-assessment-link]')).toHaveAttribute('href', 'https://example.org/notice.pdf');
  expect((await saved(page)).tasks.filter((t: { link?: string }) => t.link).map((t: { link?: string }) => t.link)).toEqual(['https://example.org/outline']);
});

test('deleting a subject says what goes with it, and Undo brings all of it back', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study/eng', FULL);
  await sheet(page).getByRole('button', { name: 'Edit subject' }).click();
  const editor = page.getByRole('dialog', { name: 'Edit subject' });
  await expect(editor).toContainText('Deleting a subject removes its assessments, feedback and links, and ends its study sessions. Its tasks and pages are kept, without a subject.');
  await editor.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('English deleted.')).toBeVisible();
  await expect(row(page, 'eng')).toHaveCount(0);
  const gone = await saved(page);
  expect(gone.feedback).toEqual([]);
  expect(gone.assessments).toEqual([]);
  expect(gone.tasks).toHaveLength(5);
  await page.getByRole('button', { name: 'Undo' }).click();
  await row(page, 'eng').click();
  await expect(topic(page)).toContainText('Module B');
  await expect(prep(page)).toContainText('Preparation, 1 of 3');
  await expect(page.locator('a[data-assessment-link]')).toHaveAttribute('href', 'https://example.org/notice.pdf');
  await expect(entries(page)).toHaveCount(3);
  await expect(entries(page).getByRole('checkbox', { name: 'Open every essay with the thesis' })).toBeVisible();
  await expect(pageRows(page)).toHaveCount(4);
  await expect(subjectLinks(page)).toHaveCount(6);
});

test('a task that is under an assessment or beside feedback is not also under "Tasks", unless it was moved to another subject', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study/eng', FULL);
  // five tasks carry English: three are preparation and one was made from feedback, so one is left for "Tasks"
  await expect(ownTasks(page).locator('li[data-task]')).toHaveCount(1);
  await expect(ownTasks(page)).toContainText('1 open');
  // moved to Mathematics, a preparation task is on that subject's page, where its count says it is
  await prep(page).getByRole('button', { name: 'Record a practice run', exact: true }).click();
  await page.getByRole('dialog', { name: 'Edit task' }).getByRole('button', { name: 'Mathematics' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Edit task' })).toBeHidden();
  await row(page, 'mat').click();
  await expect(ownTasks(page).locator('li[data-task]', { hasText: 'Record a practice run' })).toHaveCount(1);
});

test('on a phone, changing a topic opens the editor in the topic box', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWith(page, '/study/bio', {}, '#subject-title');
  await expect(topic(page)).toContainText('Cell structure and transport');
  await topic(page).click();
  await expect(topicBox(page)).toBeFocused();
});

test("a long assessment title wraps in its preparation task's editor on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWith(page, '/study/eng', {
    assessments: [{ id: 'as-3', title: 'P'.repeat(80), subjectId: 'eng', date: addDaysISO(todayISO(), 12), kind: 'presentation' }],
    tasks: [made('t-p', 'Rehearse', { assessmentId: 'as-3' })],
  }, '#subject-title');
  await prep(page).getByRole('button', { name: 'Rehearse', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Edit task' });
  await expect(editor).toContainText('Preparation for');
  // nothing in the sheet is wider than the sheet
  expect(await editor.evaluate((d) => { const panel = d.firstElementChild!; return panel.scrollWidth - panel.clientWidth; })).toBe(0);
  expect(await sideways(page)).toBe(0);
});

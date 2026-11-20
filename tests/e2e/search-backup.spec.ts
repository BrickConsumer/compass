import { readFile } from 'node:fs/promises';
import { expect, type FileChooser, type Page, test } from '@playwright/test';
import { addDaysISO, todayISO, weekLabel, weekStartOf } from '../../src/domain/dates';
import { openWith, saved, sideways } from './support';

const wide = (page: Page) => page.setViewportSize({ width: 1440, height: 900 });
const TODAY = todayISO(), NOW = `${TODAY}T08:00:00.000Z`, day = (offset: number) => addDaysISO(TODAY, offset), LAST_WEEK = addDaysISO(weekStartOf(TODAY, 1), -7);

const menu = (page: Page) => page.getByRole('dialog', { name: 'Search and commands' });
const box = (page: Page) => page.getByPlaceholder('Search or jump to');
const found = (page: Page) => menu(page).locator('button[data-found]');
const kinds = (page: Page) => menu(page).getByRole('group', { name: 'Show' });
/** Open the menu and type. The last menu must have gone first, or the keys go to one that is closing. */
async function search(page: Page, words: string) {
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(async () => { await page.keyboard.press('Control+k'); await expect(box(page)).toBeFocused({ timeout: 500 }); }).toPass();
  await box(page).fill(words);
}

const task = (id: string, title: string, over: object = {}) => ({ id, title, priority: 'normal', scope: 'day', date: TODAY, order: 1, createdAt: NOW, ...over });
const note = (id: string, title: string, over: object = {}) => ({ id, title, kind: 'note', items: [], text: '', createdAt: NOW, updatedAt: NOW, ...over });
/** A student's own data, all of it invented: one or two of most things, with "essay" in four kinds of them. */
const DATA = {
  sample: false,
  tasks: [
    task('t1', 'Problem set 4', { date: day(2), subjectId: 'mat', notes: 'Questions 3 to 9. Ask about the chain rule before Friday.' }),
    task('t2', 'Essay plan', { subjectId: 'eng' }),
  ],
  pages: [
    note('p-co', 'Example Carriers', { interestId: 'in-1', form: 'company', fields: [{ id: 'f1', label: 'Risks', text: 'Fuel costs and a thin margin' }] }),
    note('p-essay', 'Essay notes', { text: 'Quotes to use' }),
  ],
  interests: [{ id: 'in-1', name: 'Investing', forms: 'investing' }],
  headlines: [{ id: 'h1', title: 'Port reopens after the storm', url: 'https://example.org/port', source: 'Example Times', date: day(-1), tag: 'XYZ' }],
  reviews: [{ weekStart: LAST_WEEK, wentWell: 'Finished the essay early', gotInWay: '', change: '', savedAt: NOW }],
  habits: [{ id: 'hb1', name: 'Essay for ten minutes', days: [0, 1, 2, 3, 4, 5, 6], order: 1, createdOn: day(-30) }],
  ticks: [],
  // and none of what the sample would otherwise leave behind
  assessments: [], feedback: [], sessions: [], sessionsMade: [], links: [], log: [], routines: [], workouts: [], bests: [], measures: [],
};

// Search

test('a task is found by a word in its notes, and opens on its day with its editor', async ({ page }) => {
  await wide(page);
  await openWith(page, '/', DATA);
  await search(page, 'chain rule');
  await expect(found(page)).toHaveCount(1);
  const row = found(page).first();
  await expect(row).toContainText('Problem set 4');
  await expect(row).toContainText('Task');
  await expect(row).toContainText('Mathematics');
  // the words are shown in their sentence, since they are not in its name
  await expect(row).toContainText('Ask about the chain rule before Friday.');
  await row.click();
  await expect(menu(page)).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`\\?date=${day(2)}$`));
  const editor = page.getByRole('dialog', { name: 'Edit task' });
  await expect(editor).toBeVisible();
  await expect(editor.getByLabel('Title')).toHaveValue('Problem set 4');
  // going back to that day later does not open it again
  await page.keyboard.press('Escape');
  await expect(editor).toBeHidden();
  await page.reload();
  await expect(page.locator('#day-title')).toBeVisible();
  await expect(editor).toBeHidden();
});

test('the kinds narrow what is found, and say how many of each', async ({ page }) => {
  await wide(page);
  await openWith(page, '/', DATA);
  await search(page, 'essay');
  await expect(found(page)).toHaveCount(4);
  await expect(kinds(page).getByRole('button')).toHaveText(['All 4', 'Tasks 1', 'Pages 1', 'Habits 1', 'Reviews 1']);
  await expect(kinds(page).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  // names that start with the words come first, in the order of the kinds; the review holds it only in its writing
  await expect(found(page).locator('[data-found-title]')).toHaveText(['Essay plan', 'Essay notes', 'Essay for ten minutes', /^Week of /]);
  await kinds(page).getByRole('button', { name: 'Pages' }).click();
  await expect(kinds(page).getByRole('button', { name: 'Pages' })).toHaveAttribute('aria-pressed', 'true');
  await expect(found(page)).toHaveCount(1);
  await expect(found(page).first()).toContainText('Essay notes');
  // a kind with nothing in it for the next search gives way to everything
  await box(page).fill('storm');
  await expect(found(page)).toHaveCount(1);
  await expect(kinds(page).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  await expect(found(page).first()).toContainText('Headline');
});

test("a page is found by what is written in a part of its form", async ({ page }) => {
  await wide(page);
  await openWith(page, '/', DATA);
  await search(page, 'fuel');
  await expect(found(page)).toHaveCount(1);
  await expect(found(page).first()).toContainText('Example Carriers');
  await expect(found(page).first()).toContainText('Company · Investing');
  await expect(found(page).first()).toContainText('Fuel costs and a thin margin');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/pages\/p-co$/);
  await expect(page.locator('#page-title')).toHaveText('Example Carriers');
});

test('a headline opens its article in a new tab that cannot reach back', async ({ page }) => {
  await wide(page);
  // nothing leaves the machine: the outside site is answered here
  await page.context().route('https://example.org/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' }));
  await openWith(page, '/', DATA);
  await search(page, 'storm');
  await expect(found(page).first()).toContainText('Example Times');
  const [opened] = await Promise.all([page.context().waitForEvent('page'), found(page).first().click()]);
  await opened.waitForURL('https://example.org/port');
  expect(await opened.evaluate(() => window.opener)).toBeNull();
  await opened.close();
  await expect(menu(page)).toBeHidden();
});

test('a saved review opens on its week, and an interest opens chosen', async ({ page }) => {
  await wide(page);
  await openWith(page, '/', DATA);
  await search(page, 'finished the essay');
  await expect(found(page)).toHaveCount(1);
  await expect(found(page).first()).toContainText('Weekly review');
  await found(page).first().click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.locator('header [aria-live="polite"]')).toHaveText(weekLabel(LAST_WEEK));
  await expect(page.getByLabel('What went well?')).toHaveValue('Finished the essay early');
  await search(page, 'invest');
  await expect(found(page).first()).toContainText('Interest');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/pages$/);
  await expect(page.locator('[data-interest-open="in-1"]')).toBeVisible();
});

test('what Fitness keeps is found only while it is switched on', async ({ page }) => {
  await wide(page);
  const fitness = { routines: [{ id: 'r1', name: 'Legs', days: [1], lines: [{ id: 'l1', text: 'Squat, 3 × 5 at 60 kg' }], createdOn: day(-20) }], workouts: [], bests: [], measures: [] };
  await openWith(page, '/', { ...DATA, ...fitness });
  await search(page, 'squat');
  await expect(menu(page)).toContainText('Nothing matches "squat".');
  await expect(found(page)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await openWith(page, '/', { ...DATA, ...fitness, settings: { fitness: true } });
  await search(page, 'squat');
  await expect(found(page)).toHaveCount(1);
  await expect(found(page).first()).toContainText('Routine');
  await found(page).first().click();
  await expect(page).toHaveURL(/\/fitness$/);
});

test('the arrows move through what is found, and typing goes back to the box', async ({ page }) => {
  await wide(page);
  await openWith(page, '/', DATA);
  await search(page, 'essay');
  await expect(found(page)).toHaveCount(4);
  await page.keyboard.press('ArrowDown');
  await expect(found(page).nth(0)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(found(page).nth(1)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(box(page)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.type('x');
  await expect(box(page)).toBeFocused();
  await expect(box(page)).toHaveValue('essayx');
  await expect(found(page)).toHaveCount(0);
  // Enter on a result that has the keyboard opens that one, not the first
  await box(page).fill('essay');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(found(page).nth(1)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/pages\/p-essay$/);
});

test('one letter finds commands only, and nothing found says so', async ({ page }) => {
  await wide(page);
  await openWith(page, '/', DATA);
  await search(page, 'e');
  await expect(menu(page).getByRole('button', { name: 'Go to Home' })).toBeVisible();
  await expect(found(page)).toHaveCount(0);
  await expect(kinds(page)).toHaveCount(0);
  await box(page).fill('zzzz');
  await expect(menu(page)).toContainText('Nothing matches "zzzz".');
  // a command and a thing found by the same words are both there, the command first
  await box(page).fill('habits');
  await expect(menu(page).getByRole('button', { name: 'Go to Habits' })).toBeVisible();
});

test('with more than twenty found, the menu says how many more, and a kind shows them', async ({ page }) => {
  await wide(page);
  await openWith(page, '/', { ...DATA, tasks: Array.from({ length: 30 }, (_, i) => task(`t${i}`, `Essay ${i + 1}`, { date: day(i) })) });
  await search(page, 'essay');
  await expect(found(page)).toHaveCount(20);
  await expect(menu(page)).toContainText('13 more. Choose a kind to see more of it.');
  await kinds(page).getByRole('button', { name: 'Tasks' }).click();
  await expect(found(page)).toHaveCount(30);
  await expect(menu(page)).not.toContainText('more. Choose');
});

// Backup

const backup = (page: Page) => page.locator('[data-backup]');
const chooser = (page: Page) => backup(page).locator('input[type="file"]');
const asFile = (name: string, text: string) => ({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
/** Download a backup of what this browser holds, and read it. */
async function download(page: Page) {
  const [file] = await Promise.all([page.waitForEvent('download'), backup(page).getByRole('button', { name: 'Download a backup' }).click()]);
  return { name: file.suggestedFilename(), text: await readFile((await file.path())!, 'utf8') };
}

test('a backup is downloaded, named for the day, and holds everything', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (r) => asked.push(r.url()));
  await wide(page);
  await openWith(page, '/settings', DATA);
  await expect(backup(page)).toContainText('It is made on this device and sent nowhere.');
  const { name, text } = await download(page);
  expect(name).toBe(`compass-backup-${TODAY}.json`);
  const file = JSON.parse(text);
  expect(file).toMatchObject({ app: 'compass', format: 1 });
  expect(Number.isNaN(Date.parse(file.savedAt))).toBe(false);
  // everything the browser holds, as it holds it
  expect(file.data).toEqual(await saved(page));
  expect(file.data.tasks.map((t: { title: string }) => t.title)).toEqual(['Problem set 4', 'Essay plan']);
  expect(file.data.headlines).toHaveLength(1);
  // made here and sent nowhere
  expect(asked.filter((url) => !url.startsWith('http://localhost:') && !url.startsWith('data:') && !url.startsWith('blob:'))).toEqual([]);
});

test('restoring says what the backup holds first, replaces everything, and can be undone', async ({ page }) => {
  await wide(page);
  await openWith(page, '/settings', DATA);
  const { text } = await download(page);
  // another Compass, holding the sample
  await openWith(page, '/settings', {});
  const sample = await saved(page);
  await chooser(page).setInputFiles(asFile('compass-backup.json', text));
  const offer = backup(page).locator('[data-backup-offer]');
  await expect(offer).toContainText('This backup was saved on');
  await expect(offer).toContainText('It holds 2 tasks, 5 subjects, 1 habit, 1 weekly review, 2 pages, 1 interest and 1 headline.');
  await expect(offer).toContainText('Restoring it replaces everything on this device.');
  // nothing has changed yet, and saying no changes nothing
  expect(await saved(page)).toEqual(sample);
  await offer.getByRole('button', { name: 'Keep what is here' }).click();
  await expect(offer).toBeHidden();
  expect(await saved(page)).toEqual(sample);
  await chooser(page).setInputFiles(asFile('compass-backup.json', text));
  await offer.getByRole('button', { name: 'Replace everything with this backup' }).click();
  await expect(page.getByText('Backup restored.')).toBeVisible();
  await expect(offer).toBeHidden();
  await expect.poll(async () => (await saved(page)).tasks.map((t: { title: string }) => t.title)).toEqual(['Problem set 4', 'Essay plan']);
  expect((await saved(page)).sample).toBe(false);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(async () => await saved(page)).toEqual(sample);
});

test('a restored backup is there after a reload, on Home and in My pages', async ({ page }) => {
  await wide(page);
  await openWith(page, '/settings', DATA);
  const { text } = await download(page);
  await openWith(page, '/settings', {});
  await chooser(page).setInputFiles(asFile('compass-backup.json', text));
  await backup(page).getByRole('button', { name: 'Replace everything with this backup' }).click();
  await expect(page.getByText('Backup restored.')).toBeVisible();
  await page.goto('/');
  await expect(page.locator('#day-title')).toBeVisible();
  await expect(page.getByText('Essay plan')).toBeVisible();
  await expect(page.locator('[data-home-headlines]')).toContainText('Port reopens after the storm');
  await page.goto('/pages/p-co');
  await expect(page.locator('#page-title')).toHaveText('Example Carriers');
  await expect(page.locator('[data-field="Risks"] textarea')).toHaveValue('Fuel costs and a thin margin');
});

test('a file that is not a backup is refused in words, and nothing changes', async ({ page }) => {
  await wide(page);
  await openWith(page, '/settings', {});
  const before = await saved(page), refusal = backup(page).getByRole('alert');
  await chooser(page).setInputFiles(asFile('notes.json', 'hello'));
  await expect(refusal).toHaveText('That file is not a Compass backup.');
  await chooser(page).setInputFiles(asFile('other.json', JSON.stringify({ app: 'something else', data: {} })));
  await expect(refusal).toHaveText('That file is not a Compass backup.');
  await chooser(page).setInputFiles(asFile('newer.json', JSON.stringify({ app: 'compass', format: 2, data: {} })));
  await expect(refusal).toHaveText('That backup is from a newer version of Compass.');
  await chooser(page).setInputFiles(asFile('huge.json', ' '.repeat(5_000_001)));
  await expect(refusal).toHaveText('That file is too large to be a Compass backup.');
  await expect(backup(page).locator('[data-backup-offer]')).toHaveCount(0);
  expect(await saved(page)).toEqual(before);
  // a good file after a bad one clears the refusal
  await chooser(page).setInputFiles(asFile('good.json', JSON.stringify({ app: 'compass', format: 1, savedAt: NOW, data: before })));
  await expect(backup(page).locator('[data-backup-offer]')).toBeVisible();
  await expect(refusal).toHaveCount(0);
});

test('a backup edited by hand restores with only what was broken lost, and Compass still opens', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await wide(page);
  await openWith(page, '/settings', DATA);
  const file = JSON.parse((await download(page)).text);
  file.data.tasks.push('nonsense', { id: 'bad', title: 'No day' }, { id: 't9', title: 'Odd', date: TODAY, priority: 'urgent' });
  file.data.boat = { name: 'Edited by hand' };
  file.data.settings = { weekStartsOn: 'monday', theme: 'neon', name: 7 };
  file.data.pages[0].items = [null, 7];
  file.data.pages[0].link = 'javascript:alert(1)';
  file.data.headlines.push({ id: 'h-bad', title: 'Bad', url: 'file:///etc/hosts', date: TODAY });
  file.data.log = ['x'];
  file.data.clearAll = 'gone';
  file.data.levels = 4;
  await openWith(page, '/settings', {});
  await chooser(page).setInputFiles(asFile('edited.json', JSON.stringify(file)));
  await backup(page).getByRole('button', { name: 'Replace everything with this backup' }).click();
  await expect(page.getByText('Backup restored.')).toBeVisible();
  const now = await saved(page);
  expect(now.tasks.map((t: { id: string }) => t.id)).toEqual(['t1', 't2', 't9']);
  expect(now.tasks[2]).toMatchObject({ priority: 'normal', scope: 'day' });
  expect(now.boat).toMatchObject({ name: 'Edited by hand', stage: 'dinghy' });
  expect(now.headlines).toHaveLength(1);
  expect(now.pages[0].link).toBeUndefined();
  expect(now.clearAll).toBeUndefined();
  // every place still opens
  for (const path of ['/', '/voyage', '/study', '/habits', '/review', '/pages', '/pages/p-co', '/pages/headlines', '/settings']) {
    await page.goto(path);
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.getByText('Unexpected Application Error')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
  // and "Clear everything" still does what it does
  await page.getByRole('button', { name: 'Clear everything', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, clear everything' }).click();
  await expect.poll(async () => (await saved(page)).tasks).toEqual([]);
});

test('search offers the two backup commands', async ({ page }) => {
  await wide(page);
  await openWith(page, '/', DATA);
  await search(page, 'backup');
  await expect(menu(page).getByRole('button')).toHaveText(['Download a backup', 'Restore from a backup']);
  // each goes to where backups are in Settings, with the keyboard on its button: nothing is downloaded by pressing Enter in a search
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/settings#data$/);
  await expect(backup(page).getByRole('button', { name: 'Download a backup' })).toBeFocused();
  await search(page, 'restore');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/settings#restore$/);
  await expect(backup(page).getByRole('button', { name: 'Restore from a backup' })).toBeFocused();
});

// The whole piece: at its longest, under a thumb, and by keyboard

const LONG = 'Pneumonoultramicroscopicsilicovolcanoconiosis'.repeat(3);
const FULL = {
  ...DATA,
  tasks: Array.from({ length: 30 }, (_, i) => task(`t${i}`, i % 2 ? `${LONG.slice(0, 120)} essay` : `Essay ${i} with a good many ordinary words in its title, enough to wrap`, { subjectId: 'mat', date: day(i), notes: `${LONG} essay ${LONG}` })),
  pages: [note('p-long', `Essay ${LONG.slice(0, 70)}`, { text: `${LONG} essay` }), ...DATA.pages],
  headlines: [{ id: 'h1', title: `Essay ${LONG.slice(0, 120)}`, url: 'https://example.org/port', source: 'S'.repeat(40), date: day(-1), tag: 'ABCDEFGH' }],
};

for (const width of [320, 375, 390, 768, 1024, 1440]) {
  test(`with a long search and a backup on offer, nothing is wider than the screen at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openWith(page, '/settings', FULL);
    await chooser(page).setInputFiles(asFile('good.json', JSON.stringify({ app: 'compass', format: 1, savedAt: NOW, data: await saved(page) })));
    await expect(backup(page).locator('[data-backup-offer]')).toBeVisible();
    expect(await sideways(page), 'Settings').toBe(0);
    await chooser(page).setInputFiles(asFile('bad.json', 'no'));
    await expect(backup(page).getByRole('alert')).toBeVisible();
    expect(await sideways(page), 'a refusal').toBe(0);
    // the menu is opened from Home on a phone, by its round button
    await page.goto('/');
    await expect(page.locator('#day-title')).toBeVisible();
    if (width < 640) await page.getByRole('button', { name: 'Search', exact: true }).click();
    else await expect(async () => { await page.keyboard.press('Control+k'); await expect(box(page)).toBeFocused({ timeout: 500 }); }).toPass();
    await box(page).fill('essay');
    await expect(found(page)).toHaveCount(20);
    const inside = await menu(page).evaluate((d) => ({ dialog: d.scrollWidth - d.clientWidth, list: d.querySelector('ul')!.scrollWidth - d.querySelector('ul')!.clientWidth, right: d.getBoundingClientRect().right, screen: window.innerWidth }));
    expect(inside.dialog, 'the menu').toBe(0);
    expect(inside.list, 'its list').toBe(0);
    expect(inside.right).toBeLessThanOrEqual(inside.screen);
    // Home itself is measured from 375 px, as its own tests measure it: at 320 px its heading is wider than the screen with or without the menu
    if (width >= 375) expect(await sideways(page), 'behind the menu').toBe(0);
  });
}

test('on a phone, the kinds, the results and the backup buttons are tall enough for a thumb', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const tall = async (controls: ReturnType<Page['locator']>, atLeast: number) => {
    const shown = controls.filter({ visible: true });
    expect(await shown.count()).toBeGreaterThan(atLeast);
    for (const control of await shown.all()) {
      const size = (await control.boundingBox())!;
      expect(Math.round(size.height), await control.evaluate((el) => `${el.tagName} ${el.getAttribute('aria-label') ?? el.textContent}`)).toBeGreaterThanOrEqual(44);
    }
  };
  await openWith(page, '/settings', DATA);
  await chooser(page).setInputFiles(asFile('good.json', JSON.stringify({ app: 'compass', format: 1, savedAt: NOW, data: await saved(page) })));
  await expect(backup(page).locator('[data-backup-offer]')).toBeVisible();
  await tall(backup(page).locator('button'), 3);
  await page.goto('/');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await box(page).fill('essay');
  await expect(found(page)).toHaveCount(4);
  await tall(menu(page).locator('button'), 8);
});

test('a backup is restored by keyboard alone', async ({ page }) => {
  // Listened for from the start. The browser's file box is only handed to the test once something is listening, and
  // a listener added in the same breath as the key press can be too late for it.
  let picker: FileChooser | undefined;
  page.on('filechooser', (chooser) => { picker = chooser; });
  await wide(page);
  await openWith(page, '/settings', DATA);
  const { text } = await download(page);
  await openWith(page, '/settings', {});
  await backup(page).getByRole('button', { name: 'Restore from a backup' }).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => !!picker).toBe(true);
  await picker!.setFiles(asFile('compass-backup.json', text));
  await expect(backup(page).locator('[data-backup-offer]')).toBeVisible();
  // the two answers come straight after the button that asked for the file
  await page.keyboard.press('Tab');
  await expect(backup(page).getByRole('button', { name: 'Replace everything with this backup' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Backup restored.')).toBeVisible();
  await expect.poll(async () => (await saved(page)).tasks.length).toBe(2);
});

// Found by the review of the whole change

const WEEK = weekStartOf(TODAY, 1);
/** One of everything Compass keeps, all invented, with Fitness switched on. */
const RICH = {
  ...DATA,
  subjects: [{ id: 'mat', name: 'Mathematics', colour: 'marine', notes: 'Bring a calculator', topic: 'Calculus', links: [{ id: 'sl1', name: 'Flashcards', url: 'https://example.org/cards' }] }, { id: 'eng', name: 'English', colour: 'rose' }],
  tasks: [...DATA.tasks, task('t3', 'Finished one', { subjectId: 'mat', completedAt: NOW, milesAwarded: true, link: 'https://example.org/t', assessmentId: 'a1', sessionId: 's1', scope: 'week', date: WEEK, priority: 'high' })],
  assessments: [{ id: 'a1', title: 'Calculus test', subjectId: 'mat', date: day(5), kind: 'test', link: 'https://example.org/notice' }],
  feedback: [{ id: 'f1', subjectId: 'mat', date: day(-3), about: 'Problem set 3', words: 'Show each step.', work: 'Redo question 4', taskId: 't1' }],
  sessions: [{ id: 's1', subjectId: 'mat', name: 'Maths practice', days: [1, 3], createdOn: day(-20) }],
  links: [{ id: 'l1', name: 'School portal', url: 'https://portal.example.org/' }],
  areas: [{ id: 'ar1', name: 'Sleep' }],
  levels: { [WEEK]: { mat: 'high' } },
  ticks: [`hb1|${day(-1)}`],
  log: [{ id: 'task:t3', date: day(-1), source: 'task', sourceId: 't3', miles: 3 }],
  reviews: [{ weekStart: LAST_WEEK, wentWell: 'Finished the essay early', gotInWay: 'Late nights', change: 'Earlier', savedAt: NOW, ratings: { ar1: 7 } }],
  pages: [...DATA.pages, note('p-goal', 'Run 5 km', { kind: 'goal', subjectId: 'mat', aimFor: day(30), reachedOn: day(-1), link: 'https://example.org/plan', items: [{ id: 'i1', text: 'Three runs a week', done: true }] })],
  routines: [{ id: 'r1', name: 'Legs', days: [0, 1, 2, 3, 4, 5, 6], lines: [{ id: 'rl1', text: 'Squat, 3 × 5' }], createdOn: day(-20) }],
  workouts: [{ id: 'w1', routineId: 'r1', name: 'Legs', date: TODAY, lines: [{ id: 'wl1', text: 'Squat, 3 × 5', done: true }], note: 'Felt fine', finishedAt: NOW, milesAwarded: true }],
  bests: [{ id: 'b1', name: 'Squat', value: '60 kg', date: day(-2), was: { value: '55 kg', date: day(-9) } }],
  measures: [{ id: 'm1', name: 'Resting pulse', value: '58', unit: 'bpm', date: day(-2) }],
  boat: { name: 'Wren', hull: '#0E243A', sail: '#FCF8EE', pennant: '#AB3935', stage: 'sloop', seen: ['dinghy'], boundFor: 'A place at university' },
  settings: { fitness: true, name: 'Sam' },
};
const EVERYWHERE = ['/', '/voyage', '/study', '/study/mat', '/habits', '/review', '/pages', '/pages/p-co', '/pages/p-goal', '/pages/headlines', '/fitness', '/fitness/w1', '/settings'];
/** What a record cannot be kept without. Everything else about it is made the wrong kind of thing. */
const KEPT = new Set(['id', 'title', 'name', 'date', 'weekStart', 'subjectId', 'url', 'words', 'value', 'label', 'text']);
const spoil = (value: unknown, bad: unknown): unknown => (Array.isArray(value)
  ? value.map((x) => spoil(x, bad))
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, KEPT.has(k) ? v : Array.isArray(v) && v.some((x) => x && typeof x === 'object') ? spoil(v, bad) : bad]))
    : value);

test('with something of the wrong kind in every part of every record, every place still opens', async ({ page }) => {
  test.slow();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await wide(page);
  // the data whole, first: every place opens with one of everything in it
  await openWith(page, '/', RICH);
  for (const path of EVERYWHERE) {
    await page.goto(path);
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.getByText('This page could not be shown')).toHaveCount(0);
  }
  await page.goto('/fitness/w1');
  await expect(page.locator('#session-title')).toHaveText('Legs');
  expect(errors, 'whole').toEqual([]);
  for (const bad of [true, 7, {}, [], [TODAY], 'x', null]) {
    const spoiled = Object.fromEntries(Object.entries(RICH).map(([key, value]) => [key, key === 'sample' ? value : key === 'settings' ? { ...(spoil(value, bad) as object), fitness: true } : spoil(value, bad)]));
    await openWith(page, '/', spoiled);
    for (const path of EVERYWHERE) {
      await page.goto(path);
      await expect(page.locator('main').first(), `${JSON.stringify(bad)} at ${path}`).toBeVisible();
      await expect(page.getByText('This page could not be shown'), `${JSON.stringify(bad)} at ${path}`).toHaveCount(0);
      await expect(page.getByText('Unexpected Application Error'), `${JSON.stringify(bad)} at ${path}`).toHaveCount(0);
    }
    expect(errors, JSON.stringify(bad)).toEqual([]);
    // nothing a record cannot be kept without was touched, so every record is still there
    const now = await saved(page);
    expect([now.tasks.length, now.pages.length, now.subjects.length, now.assessments.length, now.workouts.length], JSON.stringify(bad)).toEqual([3, 3, 2, 1, 1]);
  }
});

test('a task marked done with something that is not a time restores as not done, and Home opens', async ({ page }) => {
  await wide(page);
  await openWith(page, '/settings', {});
  const file = { app: 'compass', format: 1, savedAt: NOW, data: { ...(await saved(page)), sample: false, tasks: [{ id: 'a', title: 'One', date: TODAY, completedAt: true }, { id: 'b', title: 'Two', date: TODAY, completedAt: true }], reviews: [{ weekStart: WEEK, wentWell: 'x', savedAt: 'last Sunday' }], pages: [{ id: 'p', title: 'A goal', kind: 'goal', aimFor: [TODAY] }] } };
  await chooser(page).setInputFiles(asFile('edited.json', JSON.stringify(file)));
  await backup(page).getByRole('button', { name: 'Replace everything with this backup' }).click();
  await expect(page.getByText('Backup restored.')).toBeVisible();
  for (const path of ['/', '/review', '/pages/p']) {
    await page.goto(path);
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.getByText('This page could not be shown')).toHaveCount(0);
  }
  await page.goto('/');
  await expect(page.locator('li[data-task]')).toHaveCount(2);
  await expect(page.locator('li[data-task] [aria-checked="true"], li[data-task] input:checked')).toHaveCount(0);
});

test('a page that cannot be shown says so, and the way to everywhere else stays', async ({ page }) => {
  // Home is made to fail as it is drawn, by breaking one thing its editors ask the browser. Settings does not ask it.
  await page.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => { if (query === '(min-width: 640px)') throw new Error('broken on purpose'); return real(query); };
  });
  await wide(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'This page could not be shown' })).toBeVisible();
  await expect(page.getByText('Unexpected Application Error')).toHaveCount(0);
  // the rail is still there, and so is the way to a backup
  await expect(page.getByRole('link', { name: 'Study' }).first()).toBeVisible();
  await page.getByRole('main').getByRole('link', { name: 'Go to Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expect(backup(page).getByRole('button', { name: 'Download a backup' })).toBeVisible();
});

test('when the browser cannot keep a restored backup, it says so and what was here stays', async ({ page }) => {
  await wide(page);
  await openWith(page, '/settings', DATA);
  const { text } = await download(page);
  await openWith(page, '/settings', {});
  const before = await saved(page);
  await chooser(page).setInputFiles(asFile('compass-backup.json', text));
  await expect(backup(page).locator('[data-backup-offer]')).toBeVisible();
  // from here the browser refuses to save anything, as it does when its storage is full
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); }; });
  await backup(page).getByRole('button', { name: 'Replace everything with this backup' }).click();
  await expect(backup(page).getByRole('alert')).toHaveText('This device could not keep that backup, so nothing was changed.');
  await expect(page.getByText('Backup restored.')).toHaveCount(0);
  expect(await saved(page)).toEqual(before);
  // and what is on screen is what was here: the sample, not the backup
  await page.getByRole('link', { name: 'Home' }).first().click();
  await expect(page.locator('#day-title')).toBeVisible();
  await expect(page.getByText('Essay plan')).toHaveCount(0);
});

test('what a backup holds is announced, and each answer puts the keyboard back on the button that asked', async ({ page }) => {
  await wide(page);
  await openWith(page, '/settings', DATA);
  const { text } = await download(page);
  const status = backup(page).getByRole('status');
  // the place the announcement is made is there before there is anything to announce, so that it is heard
  await expect(status).toHaveCount(1);
  await expect(status).toHaveText('');
  await chooser(page).setInputFiles(asFile('compass-backup.json', text));
  await expect(status).toContainText('It holds 2 tasks, 5 subjects, 1 habit, 1 weekly review, 2 pages, 1 interest and 1 headline.');
  const ask = backup(page).getByRole('button', { name: 'Restore from a backup' });
  await backup(page).getByRole('button', { name: 'Keep what is here' }).click();
  await expect(ask).toBeFocused();
  await expect(status).toHaveText('');
  await chooser(page).setInputFiles(asFile('compass-backup.json', text));
  await backup(page).getByRole('button', { name: 'Replace everything with this backup' }).click();
  await expect(page.getByText('Backup restored.')).toBeVisible();
  await expect(ask).toBeFocused();
});

test('a letter typed while a kind has the keyboard goes to the box', async ({ page }) => {
  await wide(page);
  await openWith(page, '/', DATA);
  await search(page, 'essay');
  await kinds(page).getByRole('button', { name: 'Pages' }).click();
  await expect(found(page)).toHaveCount(1);
  await page.keyboard.type('s');
  await expect(box(page)).toBeFocused();
  await expect(box(page)).toHaveValue('essays');
});

test('"bio test" finds a Biology task called "Revise for the test"', async ({ page }) => {
  await wide(page);
  await openWith(page, '/', { ...DATA, tasks: [task('t1', 'Revise for the test', { subjectId: 'bio' }), task('t2', 'Revise for the test', { subjectId: 'eco' })] });
  await search(page, 'bio test');
  await kinds(page).getByRole('button', { name: 'Tasks' }).click();
  await expect(found(page)).toHaveCount(1);
  await expect(found(page).first()).toContainText('Task · Biology');
});

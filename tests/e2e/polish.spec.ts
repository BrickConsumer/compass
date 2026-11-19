import { expect, type Page, test } from '@playwright/test';
import { addDaysISO, todayISO, weekdayOf } from '../../src/domain/dates';
import { openWith, saved, sideways } from './support';

const wide = (page: Page) => page.setViewportSize({ width: 1440, height: 900 });
const phone = (page: Page) => page.setViewportSize({ width: 390, height: 844 });
const TODAY = todayISO(), NOW = `${TODAY}T08:00:00.000Z`, day = (offset: number) => addDaysISO(TODAY, offset);
const task = (id: string, title: string, over: object = {}) => ({ id, title, priority: 'normal', scope: 'day', date: TODAY, order: 1, createdAt: NOW, ...over });
/** A week that began before today whatever day the tests are run on, so that yesterday is always earlier this week. */
const EARLIER = { settings: { weekStartsOn: weekdayOf(TODAY) === 1 ? 0 : 1 }, tasks: [task('t-old', 'Left from yesterday', { date: day(-1) }), task('t-now', 'For today')] };
const height = async (control: ReturnType<Page['locator']>) => Math.round((await control.boundingBox())!.height);

// Small faults noted while the five pieces were built, each put right

test('Home is no wider than a 320 px screen, with everything it can show', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await openWith(page, '/', {});
  await expect(page.locator('#day-title')).toBeVisible();
  expect(await sideways(page), 'the sample').toBe(0);
  // a name for the greeting, Fitness, links and headlines: everything Home can gain
  await openWith(page, '/', {
    settings: { name: 'Bartholomew-Alexander', fitness: true },
    links: [{ id: 'l1', name: 'School portal', url: 'https://portal.example.org/' }],
    headlines: [{ id: 'h1', title: 'Port reopens after the storm', url: 'https://example.org/port', source: 'Example Times', date: day(-1), tag: 'XYZ' }],
  });
  await expect(page.locator('[data-greeting]')).toBeVisible();
  expect(await sideways(page), 'with everything').toBe(0);
  // the longest date there is, on the narrowest screen: a Wednesday late in September
  await page.goto('/?date=2026-09-30');
  // what is read is what is shown: the other lengths of the date are in the page, hidden
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveText('Wed 30 Sep', { useInnerText: true });
  expect(await sideways(page), 'the longest date').toBe(0);
  // one length at a time, on either side of where it changes
  await page.setViewportSize({ width: 359, height: 700 });
  await expect(heading).toHaveText('Wed 30 Sep', { useInnerText: true });
  expect(await sideways(page), 'at 359').toBe(0);
  // from 360 px there is room for the month in full
  await page.setViewportSize({ width: 360, height: 700 });
  await expect(heading).toHaveText('Wed 30 September', { useInnerText: true });
  expect(await sideways(page), 'at 360').toBe(0);
  await page.setViewportSize({ width: 375, height: 700 });
  await expect(heading).toHaveText('Wed 30 September', { useInnerText: true });
  expect(await sideways(page), 'at 375').toBe(0);
});

test('on a phone, "Move it to today" and a toast\'s Undo are tall enough for a thumb', async ({ page }) => {
  await phone(page);
  await openWith(page, '/', EARLIER);
  const move = page.getByRole('button', { name: 'Move it to today' });
  await expect(move).toBeVisible();
  expect(await height(move)).toBeGreaterThanOrEqual(44);
  await move.click();
  const undo = page.getByRole('button', { name: 'Undo' });
  await expect(undo).toBeVisible();
  expect(await height(undo)).toBeGreaterThanOrEqual(44);
  // a pointer needs less, and the toast stays as slim as it was
  await wide(page);
  await openWith(page, '/', EARLIER);
  await page.getByRole('button', { name: 'Move it to today' }).click();
  await expect(undo).toBeVisible();
  expect(await height(undo)).toBeLessThan(44);
});

test('on a phone, an editor that makes something new opens ready to type, the second time as well', async ({ page }) => {
  await phone(page);
  await openWith(page, '/pages/headlines', {});
  for (const title of ['First headline', 'Second headline']) {
    await page.locator('[data-add-headline]').click();
    const editor = page.getByRole('dialog', { name: 'Save a headline' });
    await expect(editor.getByLabel('Headline')).toBeFocused();
    await editor.getByLabel('Headline').fill(title);
    await expect(editor.getByRole('button', { name: 'Save headline' })).toBeDisabled();
    await editor.getByLabel('Address').fill('example.org/a');
    // ready while the cursor is still in the address: on a phone, a press on a button that is not ready does not leave the box
    await expect(editor.getByLabel('Address')).toBeFocused();
    await expect(editor.getByRole('button', { name: 'Save headline' })).toBeEnabled();
    await editor.getByRole('button', { name: 'Save headline' }).click();
    await expect(editor).toBeHidden();
  }
  await expect(page.locator('section[data-headlines] li[data-headline]')).toHaveCount(2);
  // and a best, in Fitness
  await openWith(page, '/fitness', { settings: { fitness: true }, bests: [] });
  for (const name of ['5 km', 'Plank']) {
    await page.locator('[data-add-kept="bests"]').click();
    const editor = page.getByRole('dialog', { name: 'Add a best' });
    await expect(editor.getByLabel('Name')).toBeFocused();
    await editor.getByLabel('Name').fill(name);
    await editor.getByLabel('Value').fill('24:10');
    await editor.getByRole('button', { name: 'Add best' }).click();
    await expect(editor).toBeHidden();
  }
  await expect(page.locator('[data-kept="bests"] li[data-kept-row]')).toHaveCount(2);
  // opening something that is already there to look at it still leaves the keyboard down
  await page.locator('[data-kept="bests"] li[data-kept-row]').first().getByRole('button').click();
  await expect(page.getByRole('dialog', { name: 'Edit best' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Edit best' }).getByLabel('Name')).not.toBeFocused();
});

test('changing a line of a list, or deleting one, leaves the keyboard on the list', async ({ page }) => {
  await wide(page);
  await openWith(page, '/pages/pg-trip', {});
  const items = page.locator('[data-page-list] li[data-item]');
  await expect(items).toHaveCount(5);
  // Enter keeps the change and the keyboard stays on that line
  await items.nth(1).getByRole('button').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.type(' and hat');
  await page.keyboard.press('Enter');
  await expect(items.nth(1)).toContainText('Waterproof jacket and hat');
  await expect(items.nth(1).getByRole('button')).toBeFocused();
  // Escape leaves the words as they were, and the keyboard there too
  await page.keyboard.press('Enter');
  await page.keyboard.type(' nonsense');
  await page.keyboard.press('Escape');
  await expect(items.nth(1)).toContainText('Waterproof jacket and hat');
  await expect(items.nth(1)).not.toContainText('nonsense');
  await expect(items.nth(1).getByRole('button')).toBeFocused();
  // deleting a line moves to the one that takes its place
  await page.keyboard.press('Delete');
  await expect(items).toHaveCount(4);
  await expect(items.nth(1).getByRole('button')).toBeFocused();
  await expect(items.nth(1)).toContainText('Notebook and two pencils');
  // and deleting the last line moves to the one before it
  await items.nth(3).getByRole('button').focus();
  await page.keyboard.press('Delete');
  await expect(items).toHaveCount(3);
  await expect(items.nth(2).getByRole('button')).toBeFocused();
});

test('"Clear everything" asks with the keyboard on the safe answer, and gives it back after either', async ({ page }) => {
  await wide(page);
  await openWith(page, '/settings', {});
  const clear = page.getByRole('button', { name: 'Clear everything', exact: true });
  await clear.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Keep it' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(clear).toBeFocused();
  expect((await saved(page)).tasks.length).toBeGreaterThan(0);
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Yes, clear everything' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Everything cleared.')).toBeVisible();
  await expect(clear).toBeFocused();
  expect((await saved(page)).tasks).toEqual([]);
});

test('two tabs open at once keep up with each other, and neither writes over the other', async ({ page, context }) => {
  await wide(page);
  await openWith(page, '/', { sample: false, tasks: [] });
  const other = await context.newPage();
  await other.setViewportSize({ width: 1440, height: 900 });
  await other.goto('/');
  await expect(other.locator('#day-title')).toBeVisible();
  // a task added in one tab shows in the other, without a reload
  await page.locator('#composer-day').fill('Added in the first tab');
  await page.keyboard.press('Enter');
  await expect(other.getByText('Added in the first tab')).toBeVisible();
  // and one added there is added to it, not put in its place
  await other.locator('#composer-day').fill('Added in the second tab');
  await other.keyboard.press('Enter');
  await expect(page.getByText('Added in the second tab')).toBeVisible();
  await expect(page.getByText('Added in the first tab')).toBeVisible();
  expect((await saved(page)).tasks.map((t: { title: string }) => t.title)).toEqual(['Added in the first tab', 'Added in the second tab']);
  // ticking in one is ticked in the other
  await page.getByRole('checkbox', { name: 'Added in the second tab' }).click();
  await expect(other.getByRole('checkbox', { name: 'Added in the second tab' })).toBeChecked();
  await other.close();
});

test('the parts of Fitness under the week are headings of their own', async ({ page }) => {
  await wide(page);
  await openWith(page, '/fitness', { settings: { fitness: true } });
  for (const name of ['Recent', 'Routines', 'Bests', 'Measures']) await expect(page.getByRole('heading', { name, exact: true, level: 2 })).toBeVisible();
});

test('a date in the address that Compass cannot do its sums on is taken as today', async ({ page }) => {
  await wide(page);
  await openWith(page, '/', {});
  for (const bad of ['9999-12-31', '0001-01-01', '2026-02-30', 'tomorrow']) {
    await page.goto(`/?date=${bad}`);
    await expect(page.locator('#day-title')).toHaveText(/^Today/);
    await expect(page.getByText('This page could not be shown')).toHaveCount(0);
  }
});

test('an editor opened a second time takes the cursor again, on a wide screen too', async ({ page }) => {
  await wide(page);
  await openWith(page, '/pages/headlines', {});
  const editor = page.getByRole('dialog', { name: 'Save a headline' });
  for (const time of ['first', 'second', 'third']) {
    await page.locator('[data-add-headline]').click();
    await expect(editor.getByLabel('Headline'), time).toBeFocused();
    await page.keyboard.type('Typed straight away');
    await expect(editor.getByLabel('Headline'), time).toHaveValue('Typed straight away');
    await page.keyboard.press('Escape');
    await expect(editor).toBeHidden();
  }
  // the same frame is behind every editor: a task's, opened twice from its row
  await page.goto('/');
  await expect(page.locator('#day-title')).toBeVisible();
  const row = page.locator('li[data-task]').first(), task = page.getByRole('dialog', { name: 'Edit task' });
  for (const time of ['first', 'second']) {
    await row.getByRole('button').first().click();
    await expect(task.getByLabel('Title'), time).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(task).toBeHidden();
  }
});

// Found by the review of this change

test('a key held down on a line of a list does its work once', async ({ page }) => {
  await wide(page);
  await openWith(page, '/pages/pg-trip', {});
  const items = page.locator('[data-page-list] li[data-item]');
  await expect(items).toHaveCount(5);
  // Delete held down removes the line it was pressed on, and not the ones that move up under the keyboard
  await items.nth(1).getByRole('button').focus();
  await page.keyboard.down('Delete');
  await page.keyboard.down('Delete');
  await page.keyboard.down('Delete');
  await page.keyboard.up('Delete');
  await expect(items).toHaveCount(4);
  // Enter held down opens the line to be changed, and leaves it open
  await items.nth(0).getByRole('button').focus();
  await page.keyboard.down('Enter');
  await page.keyboard.down('Enter');
  await page.keyboard.up('Enter');
  await expect(items.nth(0).getByRole('textbox')).toBeFocused();
  await page.keyboard.press('Escape');
});

test('deleting a line with the mouse does not move the keyboard to the next line', async ({ page }) => {
  await wide(page);
  await openWith(page, '/pages/pg-trip', {});
  const items = page.locator('[data-page-list] li[data-item]');
  await items.nth(1).getByRole('button').click();
  await items.nth(1).getByRole('button', { name: 'Delete item' }).click();
  await expect(items).toHaveCount(4);
  await expect(page.getByText('Item deleted.')).toBeVisible();
  // nothing on the list is ringed as if a key had been pressed there
  expect(await page.evaluate(() => document.activeElement?.closest('[data-item]') === null)).toBe(true);
});

test('the voyage open in a tab behind does not mark something new as seen', async ({ page, context }) => {
  await wide(page);
  await openWith(page, '/', {});
  const behind = await context.newPage();
  // this tab is told it is not the one being looked at, as a tab behind another is
  await behind.addInitScript(() => { Object.defineProperty(Document.prototype, 'hidden', { get: () => true }); });
  await behind.setViewportSize({ width: 1440, height: 900 });
  await behind.goto('/voyage');
  await expect(behind.getByRole('heading', { level: 1 })).toBeVisible();
  // enough miles for a new fitting, set in the tab in front
  await page.goto('/settings');
  await page.getByLabel('Nautical miles').fill('520');
  await page.getByLabel('Days at sea').fill('24');
  await page.getByRole('button', { name: 'Set the voyage' }).click();
  await page.getByRole('link', { name: 'Home' }).first().click();
  await expect(page.locator('#day-title')).toBeVisible();
  // the news stays until the voyage is opened by someone looking at it
  await expect(page.locator('a[aria-label^="Open the voyage."]')).toContainText('New: name on the quarter');
  await page.waitForTimeout(600);
  await expect(page.locator('a[aria-label^="Open the voyage."]')).toContainText('New: name on the quarter');
  expect((await saved(page)).boat.seen).not.toContain('name');
  await behind.close();
});

test('with every subject deleted, they stay deleted after a reload and every place still opens', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await wide(page);
  await openWith(page, '/study', { sample: false, subjects: [], tasks: [task('t1', 'A task with no subject')], assessments: [], feedback: [], sessions: [], levels: {} });
  expect((await saved(page)).subjects).toEqual([]);
  for (const path of ['/', '/study', '/habits', '/review', '/pages', '/pages/pg-trip', '/settings', '/voyage']) {
    await page.goto(path);
    await expect(page.locator('main').first(), path).toBeVisible();
    await expect(page.getByText('This page could not be shown'), path).toHaveCount(0);
  }
  // a subject can still be added from nothing
  await page.goto('/study');
  await page.getByLabel('Add a subject').fill('Geography');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await saved(page)).subjects.map((x: { name: string }) => x.name)).toEqual(['Geography']);
  expect(errors).toEqual([]);
});

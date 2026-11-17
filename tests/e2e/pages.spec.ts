import { readFile } from 'node:fs/promises';
import { expect, type Page, test } from '@playwright/test';

async function open(page: Page, path = '/pages') {
  await page.goto('/pages');
  await page.evaluate(() => localStorage.clear());
  await page.goto(path);
  await expect(page.getByRole('heading').first()).toBeVisible();
}

const wide = { width: 1440, height: 900 };
const title = (page: Page) => page.locator('#page-title');
const count = (page: Page) => page.locator('[data-list-count]');
const item = (page: Page, id: string) => page.locator(`[data-item="${id}"]`);
const words = (page: Page, id: string) => item(page, id).locator('button[aria-keyshortcuts]');
const listed = (page: Page) => page.locator('[data-open-pages] a');
const undo = (page: Page) => page.getByRole('button', { name: 'Undo' });
const closed = (page: Page) => expect(page.locator('dialog[open]')).toHaveCount(0);

test('My pages lists the pages beside the one most recently changed', async ({ page }) => {
  await page.setViewportSize(wide);
  await open(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My pages');
  await expect(listed(page)).toHaveCount(5);
  await expect(listed(page).first()).toContainText('A B in Mathematics');
  await expect(listed(page).first()).toContainText('1 of 3 steps, aim for');
  await expect(listed(page).first()).toHaveAttribute('aria-current', 'page');
  await expect(title(page)).toHaveText('A B in Mathematics');
  await expect(page.locator('[data-page-facts]')).toContainText('Mathematics, aim for');
  await expect(page.getByRole('heading', { name: 'Steps' })).toBeVisible();
  await expect(count(page)).toHaveText('1 of 3');
  await expect(page.getByLabel('Why')).toHaveValue(/algebra/);
});

test('ticking an item counts on its page, stays where it is, and earns nothing', async ({ page }) => {
  await page.setViewportSize(wide);
  await open(page, '/pages/pg-trip');
  await expect(count(page)).toHaveText('2 of 5');
  await item(page, 'pg-trip-4').getByRole('checkbox').check();
  await expect(count(page)).toHaveText('3 of 5');
  await expect(page.locator('[data-page="pg-trip"]')).toContainText('3 of 5');
  // the fourth item is still fourth
  await expect(page.locator('[data-page-list] li').nth(3)).toHaveAttribute('data-done', 'true');
  // the box is the task's box made smaller
  expect((await item(page, 'pg-trip-1').getByRole('checkbox').boundingBox())!.width).toBe(18);
  await page.goto('/');
  await expect(page.locator('a[aria-label^="Open the voyage."]')).toHaveAttribute('aria-label', /412 nautical miles/);
  await expect(page.getByText('Packed lunch and water')).toHaveCount(0);
});

test('items are added, changed in place, moved, and deleted with Undo', async ({ page }) => {
  await page.setViewportSize(wide);
  await open(page, '/pages/pg-trip');
  const add = page.getByLabel('Add an item'), rows = page.locator('[data-page-list] li');
  await add.fill('   ');
  await add.press('Enter');
  await expect(rows).toHaveCount(5);
  await add.pressSequentially('Sun cream');
  await add.press('Enter');
  await expect(rows).toHaveCount(6);
  await expect(add).toBeFocused();
  await expect(add).toHaveValue('');
  await expect(rows.last()).toContainText('Sun cream');

  // change the words in place
  await words(page, 'pg-trip-3').click();
  const box = page.getByLabel('Change Notebook and two pencils');
  await expect(box).toBeFocused();
  await box.fill('Notebook and a pen');
  await box.press('Enter');
  await expect(item(page, 'pg-trip-3')).toContainText('Notebook and a pen');

  // move it up, then delete it and take that back
  await words(page, 'pg-trip-3').click();
  await page.getByRole('button', { name: 'Move up' }).click();
  // the words are in a box while they are being changed, so the row is known by its id
  await expect(rows.nth(1)).toHaveAttribute('data-item', 'pg-trip-3');
  await expect(page.getByLabel('Change Notebook and a pen')).toBeFocused();
  await page.getByRole('button', { name: 'Delete item' }).click();
  await expect(rows).toHaveCount(5);
  await undo(page).click();
  await expect(rows).toHaveCount(6);
  await expect(rows.nth(1)).toContainText('Notebook and a pen');
  await page.reload();
  await expect(rows.nth(1)).toContainText('Notebook and a pen');
});

test('a checklist is unticked in one go, so it can be used again', async ({ page }) => {
  await page.setViewportSize(wide);
  await open(page, '/pages/pg-trip');
  await page.locator('[data-untick]').click();
  await expect(count(page)).toHaveText('0 of 5');
  await expect(page.locator('[data-untick]')).toHaveCount(0);
  await undo(page).click();
  await expect(count(page)).toHaveText('2 of 5');
  // only a checklist offers it
  await page.locator('[data-page="pg-goal"]').click();
  await expect(count(page)).toHaveText('1 of 3');
  await expect(page.locator('[data-untick]')).toHaveCount(0);
});

test('a new page starts from a kind, with its title ready to type', async ({ page }) => {
  await page.setViewportSize(wide);
  await open(page);
  await page.locator('[data-new-page]').click();
  await expect(page.locator('[data-kinds] button')).toHaveCount(5);
  await page.locator('[data-kinds] [data-kind="goal"]').click();
  await expect(page).toHaveURL(/\/pages\/p-/);
  const name = page.getByLabel('Title', { exact: true });
  await expect(name).toBeFocused();
  // typed a key at a time: "Untitled" is replaced, and the spaces between words are kept
  await page.keyboard.type('Run five kilometres');
  await expect(title(page)).toHaveText('Run five kilometres');
  await page.getByRole('button', { name: 'Biology' }).click();
  await page.getByLabel('A date to aim for').fill('2026-12-20');
  await page.keyboard.press('Escape');
  await closed(page);
  await expect(page.locator('[data-page-facts]')).toHaveText('Biology, aim for Sunday 20 December');
  await expect(listed(page)).toHaveCount(6);
  await expect(listed(page).first()).toContainText('Run five kilometres');
  await expect(page.getByRole('heading', { name: 'Steps' })).toBeVisible();
  await expect(page.getByLabel('Why')).toBeVisible();

  // going away and back does not open the editor again
  await page.reload();
  await expect(title(page)).toHaveText('Run five kilometres');
  await closed(page);
});

test('a note is mostly writing, and its list waits until it is asked for', async ({ page }) => {
  await page.setViewportSize(wide);
  await open(page, '/pages/pg-oral');
  const writing = page.getByLabel('Writing');
  await expect(writing).toHaveValue(/lighthouse/);
  await expect(page.locator('[data-page-list]')).toHaveCount(0);
  await writing.fill('Open with the letter instead.');
  await expect(page.locator('[data-page="pg-oral"]')).toContainText('Open with the letter instead.');
  await page.locator('[data-add-list]').click();
  await page.getByLabel('Add an item').fill('Time it');
  await page.getByLabel('Add an item').press('Enter');
  await page.reload();
  await expect(page.getByLabel('Writing')).toHaveValue('Open with the letter instead.');
  await expect(page.locator('[data-page-list] li')).toHaveCount(1);
});

test('a goal is marked as reached, kept below the open pages, and can be reopened', async ({ page }) => {
  await page.setViewportSize(wide);
  await open(page, '/pages/pg-goal');
  await page.getByRole('button', { name: 'Mark as reached' }).click();
  await expect(page.locator('[data-page-facts]')).toContainText('reached');
  await expect(listed(page)).toHaveCount(4);
  await expect(page.locator('[data-reached-pages] a')).toHaveCount(1);
  await expect(page.locator('[data-reached-pages] a')).toContainText('Reached');
  await page.getByRole('button', { name: 'Reopen this goal' }).click();
  await expect(listed(page)).toHaveCount(5);
  await expect(page.locator('[data-reached-pages]')).toHaveCount(0);
  // other kinds of page cannot be reached
  await page.locator('[data-page="pg-trip"]').click();
  await expect(page.getByRole('button', { name: 'Mark as reached' })).toHaveCount(0);
});

test('a page changes kind, and is deleted with Undo', async ({ page }) => {
  await page.setViewportSize(wide);
  await open(page, '/pages/pg-read');
  await page.locator('[data-edit-page]').click();
  await expect(page.getByLabel('A date to aim for')).toHaveCount(0);
  await page.getByRole('button', { name: 'Project', exact: true }).click();
  await expect(page.getByLabel('A date to aim for')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'To do' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete page' }).click();
  await expect(page).toHaveURL(/\/pages$/);
  await expect(listed(page)).toHaveCount(4);
  await expect(page.getByText('Reading for English deleted.')).toBeVisible();
  await undo(page).click();
  await expect(listed(page)).toHaveCount(5);
  await expect(page.locator('[data-page="pg-read"]')).toContainText('1 of 4');
});

test('search finds a page by its title', async ({ page }) => {
  await page.setViewportSize(wide);
  await open(page, '/');
  await expect(page.locator('#day-title')).toBeVisible();
  await expect(async () => { await page.keyboard.press('Control+k'); await expect(page.getByPlaceholder('Search or jump to')).toBeFocused({ timeout: 500 }); }).toPass();
  await page.keyboard.type('field');
  await expect(page.getByRole('button', { name: /Biology field trip/ })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/pages\/pg-trip$/);
  await expect(title(page)).toHaveText('Biology field trip');
});

test('the pages are exported as one text file', async ({ page }) => {
  await page.setViewportSize(wide);
  await open(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-export]').click()]);
  expect(download.suggestedFilename()).toMatch(/^compass-pages-\d{4}-\d{2}-\d{2}\.txt$/);
  const text = await readFile((await download.path())!, 'utf8');
  expect(text).toContain('Biology field trip\n==================\nChecklist. Biology.');
  expect(text).toContain('[x] Permission slip, signed');
  expect(text).toContain('[ ] Phone charger');
  expect(text).toContain('Open with the lighthouse scene, then the letter.');
});

test('with no pages, the five ways to start are offered', async ({ page }) => {
  await page.setViewportSize(wide);
  await open(page, '/settings');
  await page.getByRole('button', { name: 'Clear everything' }).click();
  await page.getByRole('button', { name: 'Yes, clear everything' }).click();
  await page.goto('/pages');
  await expect(page.getByText('No pages yet.')).toBeVisible();
  await expect(page.locator('[data-kinds] button')).toHaveCount(5);
  await expect(page.locator('[data-export]')).toHaveCount(0);
  await page.locator('[data-kinds] [data-kind="note"]').click();
  // the editor opens a moment after the page is made: keys pressed before it has would go nowhere
  await expect(page.getByLabel('Title', { exact: true })).toBeFocused();
  await page.keyboard.type('First note');
  await page.keyboard.press('Escape');
  await closed(page);
  await expect(listed(page)).toHaveCount(1);
  await expect(listed(page).first()).toContainText('First note');
  await expect(listed(page).first()).toContainText('Nothing written yet');
});

test('on a phone the list comes first and a page opens on its own', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(title(page)).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('[data-page="pg-trip"]').click();
  await expect(title(page)).toHaveText('Biology field trip');
  await expect(page.getByRole('heading', { level: 1 })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  // a thumb gets a bigger box than a pointer does
  expect((await item(page, 'pg-trip-1').getByRole('checkbox').boundingBox())!.width).toBe(22);
  await item(page, 'pg-trip-3').getByRole('checkbox').check();
  await expect(count(page)).toHaveText('3 of 5');
  await page.getByRole('link', { name: 'All pages' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(listed(page).first()).toContainText('Biology field trip');
});

test('with more than eight pages, the list can be narrowed to one kind', async ({ page }) => {
  await page.setViewportSize(wide);
  await open(page);
  const show = page.getByRole('group', { name: 'Show' });
  await expect(show).toHaveCount(0);
  for (let i = 0; i < 4; i++) {
    await page.locator('[data-new-page]').click();
    await page.locator('[data-kinds] [data-kind="checklist"]').click();
    await expect(page.getByLabel('Title', { exact: true })).toBeFocused();
    await page.keyboard.type(`List ${i + 1}`);
    await page.keyboard.press('Escape');
    await closed(page);
  }
  await expect(listed(page)).toHaveCount(9);
  await show.getByRole('button', { name: 'Goal' }).click();
  await expect(listed(page)).toHaveCount(1);
  await show.getByRole('button', { name: 'Checklist' }).click();
  await expect(listed(page)).toHaveCount(5);
  await show.getByRole('button', { name: 'All' }).click();
  await expect(listed(page)).toHaveCount(9);
});

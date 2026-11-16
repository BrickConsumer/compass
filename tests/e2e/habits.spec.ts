import { expect, type Page, test } from '@playwright/test';

async function open(page: Page, path = '/') {
  await page.goto(path);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

const plate = (page: Page) => page.locator('a[aria-label^="Open the voyage."]');

test('on a wide screen the day\'s habits are a line between the week and the lists', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  const line = page.locator('[data-habits="line"]');
  await expect(line).toBeVisible();
  await expect(page.locator('[data-habits="foot"]')).toBeHidden();
  await expect(line).toContainText('Habits, 2 of 4');
  // below the week strip, above the day's sheet, and on the first screen
  const strip = (await page.locator('[aria-label="Days of the week"]').boundingBox())!, sheet = (await page.locator('section[aria-labelledby="day-title"]').boundingBox())!, box = (await line.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(strip.y + strip.height - 1);
  expect(box.y + box.height).toBeLessThanOrEqual(sheet.y + 1);
  expect(box.y + box.height).toBeLessThan(900);
});

test('ticking a habit counts it, logs one mile, and unticking takes nothing back', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  const line = page.locator('[data-habits="line"]'), read = line.getByRole('checkbox', { name: /^Read for 20 minutes/ });
  await expect(plate(page)).toHaveAttribute('aria-label', /412 nautical miles logged/);
  await read.check();
  await expect(line).toContainText('Habits, 3 of 4');
  await expect(plate(page)).toHaveAttribute('aria-label', /413 nautical miles logged/);
  await read.uncheck();
  await expect(line).toContainText('Habits, 2 of 4');
  await expect(plate(page)).toHaveAttribute('aria-label', /413 nautical miles logged/);
  await read.check();
  await line.getByRole('checkbox', { name: /^Plan tomorrow/ }).check();
  await expect(line).toContainText('Habits, all four done');
  // the day's tasks are counted apart from its habits
  await expect(page.locator('#day-title + p')).toHaveText('3 of 5 done');
  await page.reload();
  await expect(page.locator('[data-habits="line"]')).toContainText('Habits, all four done');
});

test('a day still to come shows its habits but they cannot be ticked', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await page.getByRole('button', { name: 'Next week' }).click();
  const line = page.locator('[data-habits="line"]');
  await expect(line).toContainText(/Habits, 0 of \d/);
  for (const box of await line.getByRole('checkbox').all()) await expect(box).toBeDisabled();
});

test('on a narrower screen and on a phone the habits are at the foot of the day\'s sheet', async ({ page }) => {
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await open(page);
    const foot = page.locator('section[aria-labelledby="day-title"] [data-habits="foot"]');
    await expect(foot).toBeVisible();
    await expect(page.locator('[data-habits="line"]')).toBeHidden();
    await foot.getByRole('checkbox', { name: /^Read for 20 minutes/ }).check();
    await expect(foot).toContainText('Habits, 3 of 4');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  }
});

test('the Habits page shows the week, counts each habit, and keeps earlier weeks as the record', async ({ page }) => {
  await open(page, '/habits');
  const rows = page.locator('li[data-habit-row]');
  await expect(rows).toHaveCount(4);
  await expect(page.locator('[data-week-count]')).toContainText(/\d+ of \d+ done/);
  const read = rows.filter({ hasText: 'Read for 20 minutes' });
  const before = await read.locator('[data-count]').innerText();
  // today's tick is the last one that is not disabled
  await read.getByRole('checkbox').and(page.locator(':enabled')).last().check();
  await expect(read.locator('[data-count]')).not.toHaveText(before);
  // last week: every day of it has come, so every due day can be ticked
  await page.getByRole('button', { name: 'Previous week' }).click();
  await expect(page.getByRole('heading', { level: 2 })).toContainText(/^Week \d+$/);
  await expect(read.locator('[data-count]')).toHaveText(/\d of 7/);
  await expect(read.getByRole('checkbox').and(page.locator(':disabled'))).toHaveCount(0);
  await page.getByRole('button', { name: 'This week' }).click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('This week');
});

test('habits can be added, renamed, given their days, and deleted with Undo', async ({ page }) => {
  await open(page, '/habits');
  const rows = page.locator('li[data-habit-row]');
  await page.getByLabel('Add a habit').fill('  Stretch for ten minutes ');
  await page.keyboard.press('Enter');
  await expect(rows).toHaveCount(5);
  const row = rows.filter({ hasText: 'Stretch for ten minutes' });
  await expect(row).toContainText('Every day');
  // an empty name adds nothing
  await page.getByLabel('Add a habit').fill('   ');
  await page.keyboard.press('Enter');
  await expect(rows).toHaveCount(5);

  await row.locator('button').first().click();
  const editor = page.getByRole('dialog', { name: 'Edit habit' });
  await editor.getByLabel('Name').fill('Stretch');
  await editor.getByRole('button', { name: 'Weekdays' }).click();
  await expect(rows.filter({ hasText: 'Stretch' })).toContainText('Weekdays');
  await page.keyboard.press('Escape');
  await expect(editor).toBeHidden();

  await rows.filter({ hasText: 'Exercise' }).locator('button').first().click();
  await page.getByRole('dialog', { name: 'Edit habit' }).getByRole('button', { name: 'Delete' }).click();
  await expect(rows).toHaveCount(4);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(rows).toHaveCount(5);
  await page.reload();
  await expect(page.locator('li[data-habit-row]')).toHaveCount(5);
});

test('a new habit shows on Home, and a day with no habits shows nothing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/settings');
  await page.getByRole('button', { name: 'Clear everything', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, clear everything' }).click();
  await page.goto('/');
  await expect(page.locator('#day-title')).toBeVisible();
  await expect(page.locator('[data-habits]')).toHaveCount(0);
  await page.goto('/habits');
  await expect(page.getByText('No habits yet. Add one below')).toBeVisible();
  await page.getByLabel('Add a habit').fill('Read for 20 minutes');
  await page.keyboard.press('Enter');
  await page.goto('/');
  await expect(page.locator('[data-habits="line"]')).toContainText('Habits, 0 of 1');
});

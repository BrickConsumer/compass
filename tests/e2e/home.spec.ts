import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  // the page is drawn a moment before its keyboard shortcuts are listening
  await expect(page.locator('#day-title')).toBeVisible();
});

const dayCount = (page: import('@playwright/test').Page) => page.locator('#day-title + p');

test('Home loads from the sample without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await expect(dayCount(page)).toHaveText('3 of 5 done');
  await expect(page.locator('section[aria-labelledby="week-title"] li[data-task]')).toHaveCount(4);
  await expect(page.locator('section[aria-labelledby="coming-title"] li')).toHaveCount(3);
  await expect(page.locator('section[aria-labelledby="next-title"] ol li')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('weeks and dates: buttons, arrow keys across a week, and T for today', async ({ page }) => {
  const label = page.locator('header [aria-live]'), start = await label.innerText();
  await page.getByRole('button', { name: 'Next week' }).click();
  await expect(label).not.toHaveText(start);
  await page.getByRole('button', { name: 'Previous week' }).click();
  await expect(label).toHaveText(start);
  const days = page.locator('[data-date]');
  // a day of this week that is not today, since choosing today leaves the address clean. It is found by its date,
  // because the week that has just slid away can still be on the page for a moment
  const other = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + (d.getDay() === 0 ? -1 : 1)); return d.toLocaleDateString('en-CA'); });
  const day = page.locator(`[data-date="${other}"]`);
  await day.click();
  await expect(day).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/date=\d{4}-\d{2}-\d{2}/);
  await days.nth(0).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(label).not.toHaveText(start);
  await page.keyboard.press('t');
  await expect(label).toHaveText(start);
  await expect(page).not.toHaveURL(/date=/);
});

test('tasks: add, edit, complete, reopen, change priority, delete and undo', async ({ page }) => {
  await expect(async () => { await page.keyboard.press('n'); await expect(page.locator('#composer-day')).toBeFocused({ timeout: 500 }); }).toPass();
  await page.keyboard.type('Revise Chinese characters');
  await page.keyboard.press('Enter');
  await expect(dayCount(page)).toHaveText('3 of 6 done');
  await page.keyboard.type('   ');
  await page.keyboard.press('Enter');
  await expect(dayCount(page)).toHaveText('3 of 6 done');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Revise Chinese characters', exact: true }).click();
  await page.getByLabel('Title').fill('Revise Chinese characters, unit 6');
  await page.getByRole('button', { name: 'Chinese', exact: true }).click();
  await page.keyboard.press('Escape');
  const row = page.locator('li[data-task]', { hasText: 'Revise Chinese characters, unit 6' });
  await expect(row).toContainText('Chinese');

  await row.getByRole('checkbox').check();
  await expect(dayCount(page)).toHaveText('4 of 6 done');
  await row.getByRole('checkbox').uncheck();
  await expect(dayCount(page)).toHaveText('3 of 6 done');

  const flag = row.getByRole('button', { name: /Change priority/ });
  await flag.click();
  await expect(flag).toHaveAttribute('aria-label', /^Priority low/);

  await row.locator('button').first().focus();
  await page.keyboard.press('Delete');
  await expect(row).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(row).toHaveCount(1);

  await page.reload();
  await expect(row).toHaveCount(1);
});

test('miles are earned once and never fall', async ({ page }) => {
  const plate = page.locator('a[aria-label^="Open the voyage"]').first();
  await expect(plate).toHaveAttribute('aria-label', /412 nautical miles logged, 23 days at sea/);
  const box = page.locator('li[data-task]', { hasText: 'Finish Mathematics exercises' }).getByRole('checkbox');
  await box.check();
  await expect(plate).toHaveAttribute('aria-label', /414 nautical miles logged, 24 days at sea/);
  await box.uncheck();
  await box.check();
  await expect(plate).toHaveAttribute('aria-label', /414 nautical miles logged/);
});

test('an assessment takes the calendar to its date, and the boat opens and closes', async ({ page }) => {
  await page.locator('section[aria-labelledby="coming-title"] li button').first().click();
  await expect(page.locator('section[aria-labelledby="day-title"]')).toContainText('Biology test');
  await page.keyboard.press('t');
  await page.keyboard.press('v');
  await expect(page).toHaveURL(/\/voyage$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Kestrel');
  // as on Home, the page is drawn a moment before its shortcuts are listening
  await expect(async () => { await page.keyboard.press('Escape'); await expect(page).toHaveURL(/\/$/, { timeout: 500 }); }).toPass();
});

for (const width of [375, 390, 768, 1024, 1440]) {
  test(`no sideways scroll at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
}

test('an editor opens ready to type, and keeps the spaces between words', async ({ page }) => {
  const row = page.locator('section[aria-labelledby="day-title"] [data-task]').first(), id = await row.getAttribute('data-task');
  await row.locator('button[aria-keyshortcuts]').click();
  const title = page.getByLabel('Title', { exact: true });
  // focus is on the title, not on the Close button that comes before it
  await expect(title).toBeFocused();
  await title.evaluate((el: HTMLInputElement) => el.setSelectionRange(el.value.length, el.value.length));
  // typed a key at a time: a space at the end must still be there when the next letter arrives
  await page.keyboard.type(' and plan it');
  await expect(title).toHaveValue(/\S and plan it$/);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.locator(`[data-task="${id}"]`)).toContainText(' and plan it');
});

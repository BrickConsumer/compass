import { expect, type Page, test } from '@playwright/test';

async function open(page: Page, path = '/review') {
  await page.goto(path);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

const plate = (page: Page) => page.locator('a[aria-label^="Open the voyage."]');
const state = (page: Page) => page.locator('[data-review-state]');
const saved = (page: Page) => page.getByRole('navigation', { name: 'Saved reviews' });

test('the review opens on this week, with what the week held', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Weekly review');
  await expect(page.locator('#review-week')).toHaveText('This week');
  await expect(state(page)).toHaveText('Not saved yet');
  const figures = page.locator('[data-figures]');
  await expect(figures).toContainText('Tasks done');
  await expect(figures).toContainText('Habits ticked');
  await expect(figures).toContainText('Miles logged');
  await expect(page.locator('[data-days] li')).toHaveCount(7);
  await expect(page.locator('[data-habit-summary] li')).toHaveCount(4);
  // a week still to come has nothing to look back on
  await expect(page.getByRole('button', { name: 'Next week' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'This week', exact: true })).toBeDisabled();
  // the sample has last week's review already saved
  await expect(saved(page).getByRole('button')).toHaveCount(1);
});

test('the figures follow the tasks, so ticking one on Home changes the review', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  const tasks = page.locator('[data-figures] > div').first();
  const before = Number((await tasks.locator('dd > span').first().textContent())!);
  await page.goto('/');
  await page.locator('section[aria-labelledby="day-title"] [data-task][data-done="false"]').first().getByRole('checkbox').check();
  await page.goto('/review');
  await expect(tasks.locator('dd > span').first()).toHaveText(String(before + 1));
});

test('saving a review needs something written, logs ten miles once, and lists it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/');
  await expect(plate(page)).toHaveAttribute('aria-label', /412 nautical miles/);
  await page.goto('/review');
  const save = page.getByRole('button', { name: 'Save review' });
  await expect(save).toBeDisabled();
  await page.getByLabel('What went well?').fill('Finished the essay plan a day early.');
  await expect(save).toBeEnabled();
  await expect(page.getByText('Saving logs 10 nautical miles.')).toBeVisible();
  await save.click();
  await expect(page.getByText('Review saved. 10 nautical miles logged.')).toBeVisible();
  await expect(state(page)).toContainText('Saved');
  await expect(save).toHaveCount(0);
  await expect(page.locator('[data-saved]')).toBeVisible();
  await expect(saved(page).getByRole('button')).toHaveCount(2);
  await expect(saved(page).getByRole('button').first()).toContainText('Finished the essay plan a day early.');

  // it can still be changed, and it is kept across a reload with no second award
  await page.getByLabel('What got in the way?').fill('Two late nights.');
  await page.reload();
  await expect(page.getByLabel('What got in the way?')).toHaveValue('Two late nights.');
  await expect(state(page)).toContainText('Saved');
  await page.goto('/');
  await expect(plate(page)).toHaveAttribute('aria-label', /422 nautical miles/);
});

test('what is written is kept as it is typed, before it is saved', async ({ page }) => {
  await open(page);
  await page.getByLabel('What will you do differently next week?').fill('Start the essay on Monday.');
  await page.reload();
  await expect(page.getByLabel('What will you do differently next week?')).toHaveValue('Start the essay on Monday.');
  await expect(state(page)).toHaveText('Not saved yet');
  await expect(saved(page).getByRole('button')).toHaveCount(1);
});

test('a saved review opens from the list, and reads back what was written', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await saved(page).getByRole('button').first().click();
  await expect(page.locator('#review-week')).toHaveText('Last week');
  await expect(state(page)).toContainText('Saved');
  await expect(page.getByLabel('What went well?')).toHaveValue('Kept up with Biology revision most days.');
  await expect(saved(page).getByRole('button').first()).toHaveAttribute('aria-current', 'true');
  // the week after last week is this one
  await expect(page.getByRole('heading', { name: 'Priorities for this week' })).toBeVisible();
  await page.getByRole('button', { name: 'This week', exact: true }).click();
  await expect(page.locator('#review-week')).toHaveText('This week');
  await expect(page.getByLabel('What went well?')).toHaveValue('');
});

test("a priority set in the review is the same task as Home's next week", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await expect(page.getByRole('heading', { name: 'Priorities for next week' })).toBeVisible();
  const list = page.locator('ol[aria-labelledby="review-next"]');
  const count = await list.locator('[data-task]').count();
  await page.getByLabel('Add a priority').fill('Plan the History essay');
  await page.getByLabel('Add a priority').press('Enter');
  await expect(list.locator('[data-task]')).toHaveCount(count + 1);
  await page.goto('/');
  const next = page.locator('section[aria-labelledby="next-title"]');
  const more = next.getByRole('button', { name: /more$/ });
  if (await more.count()) await more.click();
  await expect(next).toContainText('Plan the History essay');
});

test('an older week can be written and saved, with no miles and no plan to set', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Previous week' }).click();
  await expect(page.locator('#review-week')).toHaveText(/^Week \d+$/);
  await expect(page.getByRole('heading', { name: /^Priorities for/ })).toHaveCount(0);
  await page.getByLabel('What went well?').fill('A while ago now.');
  await expect(page.getByText('This week is too far back to log miles.')).toBeVisible();
  await page.getByRole('button', { name: 'Save review' }).click();
  await expect(page.getByText('Review saved.', { exact: true })).toBeVisible();
  await page.goto('/');
  await expect(plate(page)).toHaveAttribute('aria-label', /412 nautical miles/);
});

test('on a phone the review fits the screen, with saved reviews after it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const sheet = (await page.locator('section[aria-labelledby="review-week"]').boundingBox())!, list = (await saved(page).boundingBox())!;
  expect(list.y).toBeGreaterThanOrEqual(sheet.y + sheet.height);
  await saved(page).getByRole('button').first().click();
  await expect(page.locator('#review-week')).toHaveText('Last week');
});

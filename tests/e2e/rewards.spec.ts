import { expect, type Page, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#day-title')).toBeVisible();
});

/** The prototype tool in Settings stands in for weeks of finished tasks. */
async function setVoyage(page: Page, miles: number, days: number) {
  await page.goto('/settings');
  await page.getByLabel('Nautical miles').fill(String(miles));
  await page.getByLabel('Days at sea').fill(String(days));
  await page.getByRole('button', { name: 'Set the voyage' }).click();
  await page.goto('/');
  await expect(page.locator('#day-title')).toBeVisible();
}

const plate = (page: Page) => page.locator('a[aria-label^="Open the voyage."]');

test('with nothing new, the plate shows how far the next fitting is', async ({ page }) => {
  await expect(plate(page)).toContainText('88 more for a name on the quarter');
  await expect(page.locator('[data-news]')).toHaveCount(0);
});

test('a new fitting is announced on the plate until the voyage is opened, where it is marked as new', async ({ page }) => {
  await setVoyage(page, 520, 24);
  await expect(plate(page)).toContainText('New: name on the quarter');
  await expect(plate(page)).toHaveAttribute('aria-label', /New: name on the quarter\.$/);
  // it stays through a reload: nothing has been seen yet
  await page.reload();
  await expect(plate(page)).toContainText('New: name on the quarter');

  await plate(page).click();
  await expect(page).toHaveURL(/\/voyage$/);
  const row = page.locator('li', { hasText: 'Name lettered on the quarter' });
  await expect(row).toContainText('New');
  await expect(page.locator('li', { hasText: 'Brass portlights' })).not.toContainText('New');

  await page.getByRole('link', { name: 'Home' }).first().click();
  await expect(page.locator('#day-title')).toBeVisible();
  await expect(page.locator('[data-news]')).toHaveCount(0);
  await expect(plate(page)).toContainText('more for flags to dress ship');
});

test('a new boat is offered, not swapped in: the plate says it is ready and the voyage lets you sail it', async ({ page }) => {
  await setVoyage(page, 1000, 40);
  await expect(plate(page)).toContainText('The cutter is ready');
  // still the sloop on Home
  await expect(page.getByRole('img', { name: /The Kestrel, a sloop/ }).first()).toBeVisible();

  await plate(page).click();
  const ready = page.locator('[data-ready]');
  await expect(ready).toContainText('The cutter is ready. You are still sailing the sloop.');
  // the new boat is the one on show
  await expect(page.getByRole('img', { name: /The Kestrel, a cutter/ }).first()).toBeVisible();
  await ready.getByRole('button', { name: 'Sail the cutter' }).click();
  await expect(ready).toHaveCount(0);
  await expect(page.getByText('You are sailing the cutter.')).toBeVisible();

  await page.getByRole('link', { name: 'Home' }).first().click();
  await expect(page.getByRole('img', { name: /The Kestrel, a cutter/ }).first()).toBeVisible();
  await expect(page.locator('[data-news]')).toHaveCount(0);
});

test('on a phone the announcement takes the place of the miles under the window', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setVoyage(page, 520, 24);
  const caption = page.locator('a[href="/voyage"]:visible', { hasText: 'The Kestrel' });
  await expect(caption).toContainText('New: name on the quarter');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

import { expect, test } from '@playwright/test';

test('the look review page loads the live scene without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/lookdev');
  const windows = page.locator('[data-scene]');
  await expect(windows).toHaveCount(2);
  // the still image is there from the first paint, with a description for assistive technology
  await expect(page.getByRole('img', { name: 'The Kestrel, a sloop, under sail in clear daylight.' }).first()).toBeVisible();
  await expect(windows.first()).toHaveAttribute('data-scene', 'live', { timeout: 15_000 });
  expect(errors).toEqual([]);
});

test('without WebGL the still image stays and nothing breaks', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
      return kind.startsWith('webgl') ? null : (original as (...a: unknown[]) => unknown).call(this, kind, ...rest);
    } as typeof original;
  });
  await page.goto('/lookdev');
  await page.waitForTimeout(2500);
  await expect(page.locator('[data-scene]').first()).toHaveAttribute('data-scene', 'still');
  await expect(page.locator('[data-scene] canvas')).toHaveCount(0);
  await expect(page.getByRole('img', { name: /The Kestrel, a sloop/ }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('the still image follows the day, a rest day is in port, and a missed day brings a storm', async ({ page }) => {
  await page.goto('/lookdev');
  await page.getByLabel('Still image only').check();
  await page.locator('#done').fill('5');
  await expect(page.getByRole('img', { name: 'The Kestrel, a sloop, under full sail at golden hour.' }).first()).toBeVisible();
  await page.locator('#done').fill('0');
  await expect(page.getByRole('img', { name: 'The Kestrel, a sloop, on still water at dawn.' }).first()).toBeVisible();
  await page.getByLabel('Yesterday was missed (storm)').check();
  await expect(page.getByRole('img', { name: 'The Kestrel, a sloop, riding out a storm.' }).first()).toBeVisible();
  await page.locator('#done').fill('5');
  await expect(page.getByRole('img', { name: 'The Kestrel, a sloop, under full sail at golden hour.' }).first()).toBeVisible();
  await page.getByLabel('Nothing planned (in port)').check();
  await expect(page.getByRole('img', { name: 'The Kestrel, a sloop, moored in port and taking on supplies.' }).first()).toBeVisible();
});

test('with reduced motion the scene holds still', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1320, height: 900 } });
  const page = await context.newPage();
  await page.goto('/lookdev');
  const first = page.locator('[data-scene]').first();
  await expect(first).toHaveAttribute('data-scene', 'live', { timeout: 15_000 });
  await page.waitForTimeout(800);
  const a = await first.screenshot();
  await page.waitForTimeout(900);
  const b = await first.screenshot();
  expect(a.equals(b)).toBe(true);
  await context.close();
});

test('the page does not scroll sideways at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/lookdev');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

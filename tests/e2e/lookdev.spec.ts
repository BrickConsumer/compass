import { expect, test } from '@playwright/test';

test('the look review page loads the live scene without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/lookdev');
  const windows = page.locator('[data-scene]');
  await expect(windows).toHaveCount(2);
  // the still image is there from the first paint, with a description for assistive technology
  // by day in the light theme, by night in the dark one
  await expect(page.getByRole('img', { name: /^The Kestrel, a sloop, under sail (in clear daylight|beneath the stars)\.$/ }).first()).toBeVisible();
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
  // this test is about the day's sky, whatever theme the suite is run in
  await page.getByLabel("Night (the dark theme's sea)").uncheck();
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
  // The picture inside the window's rounded corners. On a busy machine the browser smooths those corners a shade
  // differently from one moment to the next, which is nothing to do with the scene.
  const box = (await first.boundingBox())!, clip = { x: box.x + 32, y: box.y + 32, width: box.width - 64, height: box.height - 64 };
  // Two pictures 900 ms apart must be the same. A CI runner draws the sea in software and can still be settling
  // when the scene first says it is live, so the pair is taken again until it matches. A scene that kept moving
  // would never match, so this still fails for the fault it is here to catch.
  await expect(async () => {
    const a = await page.screenshot({ clip });
    await page.waitForTimeout(900);
    const b = await page.screenshot({ clip });
    expect(a.equals(b)).toBe(true);
  }).toPass({ timeout: 20_000 });
  await context.close();
});

test('the page does not scroll sideways at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/lookdev');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('every fitting can be put on and taken off, on the live boat and the still one', async ({ page }) => {
  // Each fitting rebuilds the boat. A CI runner draws it in software, where this test has taken 20 to 31 seconds
  // against a limit of 30, so it is given three times as long.
  test.slow();
  const errors: string[] = [];
  // "GL Driver Message" is the graphics driver remarking on its own speed. A CI runner draws in software and says it
  // whenever the picture is read back ("GPU stall due to ReadPixels"). It is not a fault of the page.
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !m.text().includes('THREE.Clock') && !m.text().includes('GL Driver Message')) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/lookdev');
  const first = page.locator('[data-scene]').first();
  await expect(first).toHaveAttribute('data-scene', 'live', { timeout: 15_000 });
  const fittings = ['Flags to dress ship', 'Ratlines and lazy jacks', 'Stern lantern', 'Tender on deck', 'Topsail', 'Gilded stripe'];
  // the biggest boat carries all of them
  await page.getByRole('button', { name: 'Schooner', exact: true }).click();
  for (const name of fittings) await expect(page.getByLabel(name)).toBeChecked();
  for (const name of fittings) await page.getByLabel(name).uncheck();
  await expect(first).toHaveAttribute('data-scene', 'live', { timeout: 15_000 });
  for (const name of fittings) await page.getByLabel(name).check();
  await page.getByLabel('Nothing planned (in port)').check();
  await expect(first).toHaveAttribute('data-scene', 'live', { timeout: 15_000 });
  await page.waitForTimeout(600);
  // the still image draws the flags too: one path for each flag, in the flags' own colours
  await page.getByLabel('Still image only').check();
  const flags = () => page.locator('[data-scene]').first().locator('path[fill="#AB3935"], path[fill="#E9C45B"], path[fill="#1A619B"], path[fill="#FCF8EE"], path[fill="#2E7F62"]').count();
  const dressed = await flags();
  expect(dressed).toBeGreaterThanOrEqual(12);
  await page.getByLabel('Flags to dress ship').uncheck();
  const undressed = await flags();
  expect(undressed).toBeLessThan(dressed);
  // the flags are for port: under sail the boat is the same with them earned or not
  await page.getByLabel('Nothing planned (in port)').uncheck();
  const atSea = await flags();
  await page.getByLabel('Flags to dress ship').check();
  expect(await flags()).toBe(atSea);
  expect(errors).toEqual([]);
});

import { type BrowserContext, expect, type Page, test } from '@playwright/test';

// These tests measure the sea itself: its frame rate, which tier a device settles on, and how much it draws.
// The answers depend on the graphics card. A CI runner has none and draws in software, far slower than any real device,
// so there the scene steps down and the numbers mean nothing. They are run on a real machine instead:
// PW_CHANNEL=chrome npm run test:e2e
test.skip(!!process.env.CI, 'Measures the sea on real graphics hardware, which a CI runner does not have.');

/** Count the frames the sea actually draws, by watching WebGL draw calls from outside the app. */
const countFrames = () => {
  const w = window as unknown as { __frames: number; __draws: number };
  w.__frames = 0; w.__draws = 0;
  let drew = false;
  const proto = WebGL2RenderingContext.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
  for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
    const original = proto[name]!;
    proto[name] = function (this: unknown, ...args: unknown[]) { drew = true; w.__draws += 1; return original.apply(this, args); };
  }
  const loop = () => { if (drew) { w.__frames += 1; drew = false; } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
};
const frames = (page: Page) => page.evaluate(() => (window as unknown as { __frames: number }).__frames);
const framesOver = async (page: Page, ms: number) => { const before = await frames(page); await page.waitForTimeout(ms); return (await frames(page)) - before; };
/** Draw calls in an average frame, measured over a second. */
const drawsPerFrame = async (page: Page) => {
  const read = () => page.evaluate(() => { const w = window as unknown as { __frames: number; __draws: number }; return [w.__frames, w.__draws] as const; });
  const a = await read(); await page.waitForTimeout(1000); const b = await read();
  return (b[1] - a[1]) / Math.max(1, b[0] - a[0]);
};

async function open(context: BrowserContext, path: string) {
  const page = await context.newPage();
  await page.addInitScript(countFrames);
  await page.goto(path);
  await expect(page.locator('[data-scene]').first()).toHaveAttribute('data-scene', 'live', { timeout: 15_000 });
  // let the shaders compile and the first frames settle
  await page.waitForTimeout(1500);
  return page;
}

test('a phone gets the low tier, capped near 30 frames a second', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await open(context, '/');
  await expect(page.locator('[data-scene]')).toHaveAttribute('data-tier', 'low');
  const drawn = await framesOver(page, 2000);
  // 30 a second is 60 in two seconds; a display-rate loop would draw 120
  expect(drawn).toBeGreaterThan(20);
  expect(drawn).toBeLessThan(75);
  await context.close();
});

test('a laptop starts on the high tier', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1320, height: 900 } });
  const page = await open(context, '/');
  await expect(page.locator('[data-scene]')).toHaveAttribute('data-tier', 'high');
  await context.close();
});

test('scrolled out of view the sea draws nothing, and it starts again when it comes back', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true });
  const page = await open(context, '/');
  const sea = page.locator('[data-scene]');
  expect(await framesOver(page, 600)).toBeGreaterThan(5);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(sea).toHaveAttribute('data-asleep', '');
  await page.waitForTimeout(300);
  expect(await framesOver(page, 1000)).toBe(0);

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(sea).not.toHaveAttribute('data-asleep', '');
  expect(await framesOver(page, 800)).toBeGreaterThan(5);
  await context.close();
});

test('the look review can force either tier', async ({ page }) => {
  await page.goto('/lookdev');
  const windows = page.locator('[data-scene]');
  await expect(windows.first()).toHaveAttribute('data-scene', 'live', { timeout: 15_000 });
  await expect(windows.first()).toHaveAttribute('data-tier', 'high');
  await page.getByRole('button', { name: 'Low', exact: true }).click();
  await expect(windows.first()).toHaveAttribute('data-tier', 'low');
  await expect(windows.nth(1)).toHaveAttribute('data-tier', 'low');
  await page.getByRole('button', { name: 'Automatic', exact: true }).click();
  await expect(windows.first()).toHaveAttribute('data-tier', 'high');
});

test('a device that cannot keep up is stepped down to the low tier', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1320, height: 900 } });
  const page = await open(context, '/');
  const sea = page.locator('[data-scene]');
  await expect(sea).toHaveAttribute('data-tier', 'high');
  // make every frame take about 30 ms, as a slow device would
  await page.evaluate(() => {
    const burn = () => { const end = performance.now() + 28; while (performance.now() < end) { /* busy */ } requestAnimationFrame(burn); };
    requestAnimationFrame(burn);
  });
  await expect(sea).toHaveAttribute('data-tier', 'low', { timeout: 10_000 });
  await context.close();
});

test('a frame stays within the budget of 40 draw calls, at sea and in port', async ({ browser }) => {
  // a laptop, so the shadow pass is counted too
  const context = await browser.newContext({ viewport: { width: 1320, height: 900 } });
  const atSea = await open(context, '/');
  await expect(atSea.locator('[data-scene]')).toHaveAttribute('data-tier', 'high');
  expect(await drawsPerFrame(atSea)).toBeLessThanOrEqual(40);
  await atSea.close();
  // a day with nothing planned is spent in port, with the pier, the shore and the figures
  const inPort = await open(context, '/?date=2031-03-05');
  await expect(inPort.getByRole('img', { name: /moored in port/ }).first()).toBeVisible();
  const draws = await drawsPerFrame(inPort);
  expect(draws).toBeGreaterThan(5);
  expect(draws).toBeLessThanOrEqual(40);
  await context.close();
});

test('every water stays within the same budget, at sea and in port', async ({ browser }) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({ viewport: { width: 1320, height: 900 } });
  // reach every water, then sail in each in turn
  const setup = await context.newPage();
  await setup.goto('/settings');
  await setup.getByLabel('Nautical miles').fill('3400');
  await setup.getByLabel('Days at sea').fill('130');
  await setup.getByRole('button', { name: 'Set the voyage' }).click();
  for (const [name, where, id] of [['Coral shallows', 'in the coral shallows', 'coral'], ['Northern fjords', 'in the northern fjords', 'fjords'], ['The ice', 'among the ice', 'ice']] as const) {
    await setup.goto('/voyage');
    await setup.getByRole('group', { name: 'Waters' }).getByRole('button', { name: new RegExp(`^${name}`) }).click();
    const sail = setup.locator('[data-water-line]').getByRole('button', { name: `Sail ${where}` });
    if (await sail.count()) await sail.click();
    await expect(setup.locator('[data-water-line]')).toContainText(`You are sailing ${where}.`);
    const atSea = await open(context, '/');
    await expect(atSea.locator('[data-scene]').first()).toHaveAttribute('data-water', id);
    expect(await drawsPerFrame(atSea), `${id} at sea`).toBeLessThanOrEqual(40);
    await atSea.close();
    const inPort = await open(context, '/?date=2031-03-05');
    await expect(inPort.getByRole('img', { name: /moored in port/ }).first()).toBeVisible();
    expect(await drawsPerFrame(inPort), `${id} in port`).toBeLessThanOrEqual(40);
    await inPort.close();
  }
  await context.close();
});


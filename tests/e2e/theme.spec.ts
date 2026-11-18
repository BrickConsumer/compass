import { expect, type Page, test } from '@playwright/test';

const DARK_PAGE = 'rgb(10, 22, 38)', LIGHT_PAGE = 'rgb(246, 240, 228)';
const pageColour = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
const themeColour = (page: Page) => page.locator('meta[name="theme-color"]').getAttribute('content');
const html = (page: Page) => page.locator('html');
const sea = (page: Page) => page.locator('[data-scene]').first();

async function fresh(page: Page, path = '/') {
  await page.goto(path);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/** WCAG contrast between an element's text and whatever is painted behind it, worked out on the page itself. */
async function contrast(page: Page, selector: string): Promise<number> {
  return page.locator(selector).first().evaluate((el) => {
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    // any colour the browser understands, as red, green, blue and alpha
    const rgba = (css: string) => { g.clearRect(0, 0, 1, 1); g.fillStyle = css; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return [d[0]!, d[1]!, d[2]!, d[3]! / 255] as const; };
    const lum = (r: number, gr: number, b: number) => { const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(gr) + 0.0722 * f(b); };
    // the nearest solid background behind the element
    let ground: readonly [number, number, number, number] = [255, 255, 255, 1];
    for (let n: Element | null = el; n; n = n.parentElement) { const b = rgba(getComputedStyle(n).backgroundColor); if (b[3] > 0.99) { ground = b; break; } }
    const ink = rgba(getComputedStyle(el).color), a = ink[3];
    const mixed = [0, 1, 2].map((i) => ink[i]! * a + ground[i]! * (1 - a)) as [number, number, number];
    const x = lum(...mixed), y = lum(ground[0], ground[1], ground[2]);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  });
}

test.describe('on a device set to dark', () => {
  test.use({ colorScheme: 'dark' });

  test('the page is dark before the app has loaded, so it never flashes ivory', async ({ page }) => {
    // hold the app back: only what index.html does by itself has run
    await page.route('**/src/main.tsx*', (route) => route.abort());
    await page.goto('/');
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    expect(await pageColour(page)).toBe(DARK_PAGE);
    expect(await themeColour(page)).toBe('#0A1626');
    await expect(page.locator('#root')).toBeEmpty();
  });

  test('the planner is dark and the sea is at night, with nothing set in Compass', async ({ page }) => {
    await fresh(page);
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    expect(await pageColour(page)).toBe(DARK_PAGE);
    await expect(sea(page)).toHaveAttribute('data-sky', 'night');
    // three of five done: under the stars, on the way to moonrise
    await expect(page.getByRole('img', { name: 'The Kestrel, a sloop, under sail beneath the stars.' }).first()).toBeVisible();
    await page.goto('/settings');
    await expect(page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Automatic' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('choosing Light wins over the device, is kept after a reload, and Automatic gives the device back its say', async ({ page }) => {
    await fresh(page, '/settings');
    const theme = page.getByRole('group', { name: 'Theme' });
    await theme.getByRole('button', { name: 'Light' }).click();
    await expect(html(page)).not.toHaveAttribute('data-theme', 'dark');
    expect(await pageColour(page)).toBe(LIGHT_PAGE);
    expect(await themeColour(page)).toBe('#F6F0E4');
    await page.reload();
    await expect(theme.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');
    expect(await pageColour(page)).toBe(LIGHT_PAGE);
    await page.goto('/');
    await expect(sea(page)).toHaveAttribute('data-sky', 'day');
    await expect(page.getByRole('img', { name: 'The Kestrel, a sloop, under sail in clear daylight.' }).first()).toBeVisible();
    await page.goto('/settings');
    await theme.getByRole('button', { name: 'Automatic' }).click();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  });

  test('the dark theme has dusk with nothing done, stars part-way and moonrise when everything is done', async ({ page }) => {
    await page.goto('/lookdev');
    await page.getByLabel('Still image only').check();
    await expect(page.getByLabel("Night (the dark theme's sea)")).toBeChecked();
    await page.locator('#done').fill('0');
    await expect(page.getByRole('img', { name: 'The Kestrel, a sloop, on still water at dusk.' }).first()).toBeVisible();
    await page.locator('#done').fill('3');
    await expect(page.getByRole('img', { name: 'The Kestrel, a sloop, under sail beneath the stars.' }).first()).toBeVisible();
    await page.locator('#done').fill('5');
    await expect(page.getByRole('img', { name: 'The Kestrel, a sloop, under full sail by moonlight.' }).first()).toBeVisible();
    await page.getByLabel('Nothing planned (in port)').check();
    await expect(page.getByRole('img', { name: 'The Kestrel, a sloop, moored in port for the evening.' }).first()).toBeVisible();
    // the still image has its stars, and by day it has none
    const stars = () => sea(page).locator('circle[fill="#dfe7fa"]').count();
    expect(await stars()).toBeGreaterThan(40);
    await page.getByLabel("Night (the dark theme's sea)").uncheck();
    expect(await stars()).toBe(0);
    await expect(page.getByRole('img', { name: 'The Kestrel, a sloop, moored in port and taking on supplies.' }).first()).toBeVisible();
  });

  test('the live scene shows the night and holds together', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !m.text().includes('THREE.Clock')) errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/lookdev');
    await expect(sea(page)).toHaveAttribute('data-scene', 'live', { timeout: 15_000 });
    await expect(sea(page)).toHaveAttribute('data-sky', 'night');
    for (const done of ['0', '3', '5']) { await page.locator('#done').fill(done); await page.waitForTimeout(300); }
    await page.getByLabel('Yesterday was missed (storm)').check();
    await page.getByLabel('Nothing planned (in port)').check();
    await page.getByLabel("Night (the dark theme's sea)").uncheck();
    await expect(sea(page)).toHaveAttribute('data-sky', 'day');
    await expect(sea(page)).toHaveAttribute('data-scene', 'live', { timeout: 15_000 });
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });

  for (const [width, height] of [[1440, 900], [390, 844]] as const) {
    test(`text meets its contrast on the real page at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await fresh(page);
      const pairs: [string, string, number][] = [
        ['the date', '#day-title', 4.5],
        ['the week count', 'header [aria-live]', 4.5],
        ['a task', 'section[aria-labelledby="day-title"] [data-task][data-done="false"] button[aria-keyshortcuts]', 4.5],
        ['a done task', 'section[aria-labelledby="day-title"] [data-task][data-done="true"] button[aria-keyshortcuts]', 4.5],
        ['the selected day', '[data-date][aria-pressed="true"]', 4.5],
        ['a day not selected', '[data-date][aria-pressed="false"]', 4.5],
        ['the count for the day', '#day-title + p', 4.5],
      ];
      const short: string[] = [];
      for (const [what, selector, needs] of pairs) { const r = await contrast(page, selector); if (r < needs) short.push(`${what}: ${r.toFixed(2)}, needs ${needs}`); }
      await page.goto('/review');
      for (const [what, selector] of [['a muted line', 'main header p'], ['a figure', '[data-figures] dd > span'], ['a link', 'main a[href="/settings#review"], main a']] as const) { const r = await contrast(page, selector); if (r < 4.5) short.push(`review, ${what}: ${r.toFixed(2)}`); }
      expect(short).toEqual([]);
    });
  }

  test('no screen scrolls sideways in the dark theme', async ({ page }) => {
    await fresh(page);
    for (const width of [375, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/', '/study', '/habits', '/review', '/pages', '/voyage', '/settings']) {
        await page.goto(path);
        await expect(page.getByRole('heading').first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${path} at ${width}`).toBeLessThanOrEqual(0);
      }
    }
  });
});

test.describe('on a device set to light', () => {
  test.use({ colorScheme: 'light' });

  test('nothing is dark until Dark is chosen, and then it is kept', async ({ page }) => {
    await fresh(page, '/settings');
    await expect(html(page)).not.toHaveAttribute('data-theme', 'dark');
    expect(await pageColour(page)).toBe(LIGHT_PAGE);
    const theme = page.getByRole('group', { name: 'Theme' });
    await expect(theme.getByRole('button')).toHaveText(['Automatic', 'Light', 'Dark']);
    await theme.getByRole('button', { name: 'Dark' }).click();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    expect(await pageColour(page)).toBe(DARK_PAGE);
    expect(await themeColour(page)).toBe('#0A1626');
    await page.reload();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    await expect(theme.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/');
    await expect(sea(page)).toHaveAttribute('data-sky', 'night');
  });

  test('the theme belongs to the device: clearing everything leaves it', async ({ page }) => {
    await fresh(page, '/settings');
    await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Dark' }).click();
    await page.getByRole('button', { name: 'Clear everything' }).click();
    await page.getByRole('button', { name: 'Yes, clear everything' }).click();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Reset the sample data' }).click();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  });

  test('the theme can be changed from the command menu', async ({ page }) => {
    await fresh(page);
    await expect(page.locator('#day-title')).toBeVisible();
    const menu = async (words: string) => {
      // the menu from the last command must have gone, or the keys go to a menu that is closing
      await expect(page.locator('dialog[open]')).toHaveCount(0);
      await expect(async () => { await page.keyboard.press('Control+k'); await expect(page.getByPlaceholder('Search or jump to')).toBeFocused({ timeout: 500 }); }).toPass();
      await page.keyboard.type(words);
      await page.keyboard.press('Enter');
    };
    await menu('dark theme');
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    await menu('light theme');
    await expect(html(page)).not.toHaveAttribute('data-theme', 'dark');
    await menu('follow the device');
    await expect(html(page)).not.toHaveAttribute('data-theme', 'dark');
  });

  test('the look review can show the night whatever the theme', async ({ page }) => {
    await page.goto('/lookdev');
    const night = page.getByLabel("Night (the dark theme's sea)");
    await expect(night).not.toBeChecked();
    await expect(sea(page)).toHaveAttribute('data-sky', 'day');
    await night.check();
    await expect(sea(page)).toHaveAttribute('data-sky', 'night');
    await expect(html(page)).not.toHaveAttribute('data-theme', 'dark');
  });
});

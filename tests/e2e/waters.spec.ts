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
const sea = (page: Page) => page.locator('[data-scene]').first();
const waters = (page: Page) => page.getByRole('group', { name: 'Waters' });

test('a voyage starts in home waters, and the sea says nothing about where', async ({ page }) => {
  await expect(sea(page)).toHaveAttribute('data-water', 'home');
  await expect(page.getByRole('img', { name: /The Kestrel, a sloop/ }).first()).not.toHaveAccessibleName(/waters|shallows|fjords|ice/);
  await plate(page).click();
  await expect(waters(page).getByRole('button', { name: 'Home waters' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-water-line]')).toHaveText('You are sailing in home waters. 388 more miles to the coral shallows.');
});

test('a new water is news on Home, offered in the voyage, and sailed only when it is chosen', async ({ page }) => {
  await setVoyage(page, 900, 30);
  await expect(plate(page)).toContainText('New waters: the coral shallows');
  // reaching a water does not move the boat there
  await expect(sea(page)).toHaveAttribute('data-water', 'home');
  await page.reload();
  await expect(plate(page)).toContainText('New waters: the coral shallows');

  await plate(page).click();
  const reached = page.locator('[data-reached]');
  await expect(reached).toContainText('You have reached the coral shallows. You are still in home waters.');
  // the new water is the one on show, and it is not a preview
  await expect(sea(page)).toHaveAttribute('data-water', 'coral');
  await expect(page.getByText(/^Preview\./)).toHaveCount(0);
  await expect(waters(page).getByRole('button', { name: /^Coral shallows/ })).toContainText('New');

  await reached.getByRole('button', { name: 'Sail in the coral shallows' }).click();
  await expect(reached).toHaveCount(0);
  await expect(page.locator('[data-water-line]')).toContainText('You are sailing in the coral shallows. 1,100 more miles to the northern fjords.');

  await page.getByRole('link', { name: 'Home' }).first().click();
  await expect(page.locator('#day-title')).toBeVisible();
  await expect(sea(page)).toHaveAttribute('data-water', 'coral');
  await expect(page.getByRole('img', { name: /The Kestrel, a sloop, .*in the coral shallows\.$/ }).first()).toBeVisible();
  await expect(plate(page)).not.toContainText('New waters');
  // and it is kept
  await page.reload();
  await expect(sea(page)).toHaveAttribute('data-water', 'coral');
});

test('a water not yet reached can be looked at, and cannot be sailed', async ({ page }) => {
  await plate(page).click();
  await waters(page).getByRole('button', { name: 'Northern fjords (preview)' }).click();
  await expect(sea(page)).toHaveAttribute('data-water', 'fjords');
  await expect(page.getByText('Preview. Not reached yet.')).toBeVisible();
  await expect(page.locator('[data-water-line]')).toHaveText('Northern fjords are reached at 2,000 miles.');
  await expect(page.locator('[data-water-line]').getByRole('button')).toHaveCount(0);
  await waters(page).getByRole('button', { name: 'The ice (preview)' }).click();
  await expect(page.locator('[data-water-line]')).toHaveText('The ice is reached at 3,300 miles.');
  // looking is not choosing
  await page.getByRole('link', { name: 'Home' }).first().click();
  await expect(sea(page)).toHaveAttribute('data-water', 'home');
});

test('any water that has been reached can be chosen, home waters among them', async ({ page }) => {
  await setVoyage(page, 3400, 130);
  await page.goto('/voyage');
  for (const name of ['Home waters', 'Coral shallows', 'Northern fjords', 'The ice']) await expect(waters(page).getByRole('button', { name: new RegExp(`^${name}`) })).not.toContainText('preview');
  // the furthest one reached is shown first
  await expect(sea(page)).toHaveAttribute('data-water', 'ice');
  await waters(page).getByRole('button', { name: /^Northern fjords/ }).click();
  await page.locator('[data-water-line]').getByRole('button', { name: 'Sail in the northern fjords' }).click();
  // every water is reached, so there are no more miles to tell
  await expect(page.locator('[data-water-line]')).toHaveText('You are sailing in the northern fjords.');
  await waters(page).getByRole('button', { name: /^The ice/ }).click();
  await page.locator('[data-water-line]').getByRole('button', { name: 'Sail among the ice' }).click();
  await expect(page.locator('[data-water-line]')).toHaveText('You are sailing among the ice.');
  await waters(page).getByRole('button', { name: 'Home waters' }).click();
  await page.locator('[data-water-line]').getByRole('button', { name: 'Sail in home waters' }).click();
  await page.goto('/');
  await expect(sea(page)).toHaveAttribute('data-water', 'home');
});

test('the still image is a different picture in each water, by day and at night, at sea and in port', async ({ page }) => {
  await page.goto('/lookdev');
  await page.getByLabel('Still image only').check();
  const picture = page.locator('section[aria-label="Desktop window"] svg[role="img"]');
  const seen = new Set<string>();
  for (const night of [false, true]) for (const port of [false, true]) {
    await page.getByLabel("Night (the dark theme's sea)").setChecked(night);
    await page.getByLabel('Nothing planned (in port)').setChecked(port);
    for (const [name, where] of [['Home waters', null], ['Coral shallows', 'in the coral shallows'], ['Northern fjords', 'in the northern fjords'], ['The ice', 'among the ice']] as const) {
      await page.getByRole('group', { name: 'Waters' }).getByRole('button', { name }).click();
      if (where) await expect(picture).toHaveAccessibleName(new RegExp(`, ${where}\\.$`));
      else await expect(picture).not.toHaveAccessibleName(/shallows|fjords|ice/);
      const markup = await picture.innerHTML();
      expect(markup, `${name}, night ${night}, port ${port}`).not.toMatch(/NaN|undefined/);
      seen.add(markup);
    }
  }
  expect(seen.size).toBe(16);
});

test('each water draws live, by day and at night, at sea and in port, with nothing in the console', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !m.text().includes('THREE.Clock'))) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/lookdev');
  const window = page.locator('section[aria-label="Desktop window"] [data-scene]');
  for (const [name, id] of [['Coral shallows', 'coral'], ['Northern fjords', 'fjords'], ['The ice', 'ice'], ['Home waters', 'home']] as const) {
    await page.getByRole('group', { name: 'Waters' }).getByRole('button', { name }).click();
    await expect(window).toHaveAttribute('data-water', id);
    for (const [night, port] of [[false, false], [true, false], [true, true], [false, true]] as const) {
      await page.getByLabel("Night (the dark theme's sea)").setChecked(night);
      await page.getByLabel('Nothing planned (in port)').setChecked(port);
      await expect(window).toHaveAttribute('data-scene', 'live', { timeout: 20_000 });
      await page.waitForTimeout(350);
    }
  }
  expect(errors).toEqual([]);
});

for (const width of [375, 390, 768, 1024, 1440]) {
  test(`the voyage with its waters is no wider than the screen at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await setVoyage(page, 900, 30);
    await page.goto('/voyage');
    await expect(waters(page)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
}

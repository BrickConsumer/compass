import { expect, type Page, test } from '@playwright/test';

async function home(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#day-title')).toBeVisible();
}

const dayRows = (page: Page) => page.locator('section[aria-labelledby="day-title"] li[data-task]');
const weekLabel = (page: Page) => page.locator('header [aria-live]');

test('? shows every shortcut, and Escape puts it away', async ({ page }) => {
  await home(page);
  const list = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(async () => { await page.keyboard.press('?'); await expect(list).toBeVisible({ timeout: 500 }); }).toPass();
  await expect(list).toContainText('New task on the selected day');
  await expect(list).toContainText('Previous and next week');
  await expect(list).toContainText('Complete or reopen');
  // single keys do nothing while it is open
  await page.keyboard.press('v');
  await expect(page).toHaveURL(/\/$/);
  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();
});

test('on a wide screen the editor is a popover beside its row, with nothing to confirm', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await home(page);
  const row = dayRows(page).first(), title = row.locator('button').first();
  await title.click();
  const editor = page.locator('dialog[aria-labelledby="editor-title"]');
  await expect(editor).toHaveAttribute('data-placed', 'beside');
  await expect(row).toHaveAttribute('data-editing', 'true');
  const r = (await row.boundingBox())!, e = (await editor.boundingBox())!;
  // to the right of the row, not over it, and wholly on screen
  expect(e.x).toBeGreaterThanOrEqual(r.x + r.width);
  expect(e.y).toBeGreaterThanOrEqual(0);
  expect(e.y + e.height).toBeLessThanOrEqual(900);
  expect(e.x + e.width).toBeLessThanOrEqual(1440);
  await expect(editor.getByRole('button', { name: 'Done' })).toBeHidden();

  // a change saves as it is made
  await editor.getByLabel('Title').fill('Prepare the Economics essay plan');
  await expect(row).toContainText('Prepare the Economics essay plan');
  await page.keyboard.press('Escape');
  await expect(editor).toBeHidden();
  await expect(row).not.toHaveAttribute('data-editing', 'true');
  await expect(title).toBeFocused();
});

test('a click outside the popover closes it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await home(page);
  await dayRows(page).first().locator('button').first().click();
  const editor = page.locator('dialog[aria-labelledby="editor-title"]');
  await expect(editor).toBeVisible();
  await page.mouse.click(120, 600);
  await expect(editor).toBeHidden();
});

test('on a phone the editor is a sheet: a short drag settles back, a long one closes it', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await home(page);
  await dayRows(page).first().locator('button').first().click();
  const editor = page.locator('dialog[aria-labelledby="editor-title"]'), grip = page.locator('[data-grip]');
  await expect(editor.getByRole('button', { name: 'Done' })).toBeVisible();
  await page.waitForTimeout(500);
  const drag = async (by: number) => { const g = (await grip.boundingBox())!; await page.mouse.move(g.x + 120, g.y + 18); await page.mouse.down(); await page.mouse.move(g.x + 120, g.y + 18 + by, { steps: 8 }); await page.waitForTimeout(250); await page.mouse.up(); };
  await drag(40);
  await page.waitForTimeout(500);
  await expect(editor).toBeVisible();
  await drag(190);
  await expect(editor).toBeHidden();
  await context.close();
});

test('the week strip follows a drag: a short one settles back, a long one changes the week', async ({ page }) => {
  await home(page);
  const strip = page.locator('[role="group"][aria-label="Days of the week"]'), start = await weekLabel(page).innerText();
  const drag = async (by: number) => { const s = (await strip.boundingBox())!; await page.mouse.move(s.x + s.width / 2, s.y + 40); await page.mouse.down(); await page.mouse.move(s.x + s.width / 2 + by, s.y + 40, { steps: 8 }); await page.waitForTimeout(250); await page.mouse.up(); };
  await drag(-24);
  await page.waitForTimeout(400);
  await expect(weekLabel(page)).toHaveText(start);
  await drag(-140);
  await expect(weekLabel(page)).not.toHaveText(start);
  // dragging the other way comes back, and only one week is ever on show
  await page.waitForTimeout(500);
  await drag(140);
  await expect(weekLabel(page)).toHaveText(start);
  await expect(page.locator('[data-date]')).toHaveCount(7);
});

test('a finished task waits a moment, then moves below the open ones', async ({ page }) => {
  await home(page);
  const first = dayRows(page).first(), title = await first.locator('button').first().innerText();
  await first.getByRole('checkbox').check();
  // it holds its place first, so several can be ticked in a row
  await expect(dayRows(page).first()).toContainText(title);
  await expect(dayRows(page).first()).not.toContainText(title, { timeout: 3000 });
  await expect(dayRows(page)).toHaveCount(5);
});

test('with reduced motion everything still works', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1320, height: 900 } });
  const page = await context.newPage();
  await home(page);
  const start = await weekLabel(page).innerText();
  await page.getByRole('button', { name: 'Next week' }).click();
  await expect(weekLabel(page)).not.toHaveText(start);
  await expect(page.locator('[data-date]')).toHaveCount(7);
  await page.keyboard.press('t');
  await dayRows(page).first().locator('button').first().click();
  const editor = page.locator('dialog[aria-labelledby="editor-title"]');
  await expect(editor).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(editor).toBeHidden();
  await context.close();
});

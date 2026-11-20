import { expect, type Page } from '@playwright/test';

/**
 * Open a page on the sample, after changing the saved data in this browser.
 * Objects such as `boat` and `settings` are merged one level deep; everything else, lists included, is replaced.
 * `ready` is what to wait for: on a phone a subject opens on its own, with no page heading.
 */
export async function openWith(page: Page, path: string, patch: Record<string, unknown>, ready = 'main') {
  await page.goto(path);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => localStorage.getItem('compass:v1') !== null);
  await page.evaluate((changes) => {
    const saved = JSON.parse(localStorage.getItem('compass:v1')!);
    for (const [key, value] of Object.entries(changes)) {
      const old = saved.state[key], plain = (x: unknown) => !!x && typeof x === 'object' && !Array.isArray(x);
      saved.state[key] = plain(old) && plain(value) ? { ...old, ...(value as object) } : value;
    }
    localStorage.setItem('compass:v1', JSON.stringify(saved));
  }, patch);
  await page.reload();
  await expect(page.locator(ready).first()).toBeVisible();
}

/** How far the page can be scrolled sideways. It should always be nothing. */
export const sideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** What is saved in this browser, read back to check what was really kept. */
export const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('compass:v1')!).state);

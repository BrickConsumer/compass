import { expect, type Page, test } from '@playwright/test';
import { addDaysISO, todayISO, weekStartOf } from '../../src/domain/dates';
import { openWith, sideways } from './support';

/**
 * Home on a wide screen is seen whole. With something in every part of it, nothing is below the fold of a laptop's
 * window, so the day, the week, what is coming and the headlines are read without scrolling. A day with a great many
 * tasks is still longer than a screen, and scrolls.
 */

const TODAY = todayISO(), WEEK = weekStartOf(TODAY, 1), NEXT = addDaysISO(WEEK, 7), NOW = '2026-11-01T00:00:00.000Z';
const task = (id: string, title: string, over: object = {}) => ({ id, title, priority: 'normal', scope: 'day', date: TODAY, order: 1, createdAt: NOW, ...over });
const headline = (id: string, title: string, offset: number) => ({ id, title, url: `https://example.org/${id}`, source: 'Example Times', date: addDaysISO(TODAY, offset), tag: '' });

/** A Home with something in every part: a few tasks today, four for the week, three for next week, three assessments, three headlines, and a name. */
const FULL = {
  settings: { name: 'Sam' },
  tasks: [
    task('d1', 'Chinese listening practice', { priority: 'low', subjectId: 'chi' }),
    task('d2', 'Finish the Economics essay plan', { priority: 'high' }),
    task('d3', 'Read chapter 4', {}),
    ...['Book a library study room', 'Organise Biology notes', 'Return the Economics library books', 'Chinese vocabulary, unit 5'].map((title, n) => task(`w${n}`, title, { scope: 'week', date: WEEK, order: n + 1 })),
    ...['Start the History source analysis', 'Plan the group presentation', 'Past paper, section B'].map((title, n) => task(`n${n}`, title, { scope: 'week', date: NEXT, order: n + 1 })),
  ],
  assessments: [
    { id: 'a1', title: 'Economics essay', date: addDaysISO(TODAY, 3), kind: 'assignment' },
    { id: 'a2', title: 'Mathematics topic test', date: addDaysISO(TODAY, 8), kind: 'test' },
    { id: 'a3', title: 'English oral presentation', date: addDaysISO(TODAY, 15), kind: 'presentation' },
  ],
  headlines: [
    headline('h1', 'Westpac’s new hazard risk reports should sound a warning for homeowners', -1),
    headline('h2', 'If Australians don’t trust the bank on inflation, the pain may have to get worse', -3),
    headline('h3', 'With AI blamed for mass layoffs, here’s how workers can get a fairer go', 0),
  ],
};

/** How far the page can still be scrolled down. Nothing, when all of it is in view. */
const below = (page: Page) => page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
const titles = (page: Page) => page.locator('main h2').allTextContents();

test('on a wide screen, a Home with something in every part is seen whole, without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1420, height: 922 });
  await openWith(page, '/', FULL);
  await expect(page.locator('[data-home-headlines] li')).toHaveCount(3);
  expect(await titles(page)).toEqual(expect.arrayContaining(['Any time this week', 'Next week', 'Coming up', 'Headlines']));
  expect(await below(page)).toBe(0);
  expect(await sideways(page)).toBe(0);
  // each part's last line is on the screen, not only the page's end
  for (const part of ['#week-title', '#next-title', '#coming-title', '#home-headlines-title']) {
    const box = await page.locator('section', { has: page.locator(part) }).last().boundingBox();
    expect(box!.y + box!.height, part).toBeLessThanOrEqual(922);
  }
});

test('the sample’s Home is seen whole on a 1440 by 900 screen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/', {});
  await expect(page.locator('#day-title')).toBeVisible();
  expect(await below(page)).toBe(0);
});

test('the sea is still a window of its own on a wide screen, with the plate inside it', async ({ page }) => {
  await page.setViewportSize({ width: 1420, height: 922 });
  await openWith(page, '/', FULL);
  const sea = (await page.locator('main > div').first().boundingBox())!, plate = (await page.getByRole('link', { name: /^Open the voyage\./ }).boundingBox())!;
  expect(sea.height).toBeGreaterThanOrEqual(160);
  expect(plate.y).toBeGreaterThanOrEqual(sea.y);
  expect(plate.y + plate.height).toBeLessThanOrEqual(sea.y + sea.height);
});

test('a phone’s Home is laid out as it was: controls a thumb can press, and the day’s tasks first', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWith(page, '/', FULL);
  const row = (await page.locator('li[data-task]').first().boundingBox())!;
  expect(row.height).toBeGreaterThanOrEqual(54);
  const day = (await page.locator('[data-date]').first().boundingBox())!;
  expect(day.height).toBe(68);
  expect(await sideways(page)).toBe(0);
});

// A long day: the Today card scrolls by itself, and the page stays where it is

const LONG = { ...FULL, tasks: [...FULL.tasks, ...Array.from({ length: 30 }, (_, n) => task(`x${n}`, `One more thing to do, number ${n + 1}`, { order: n + 10 }))] };
const card = (page: Page) => page.locator('section[data-day-sheet]');
const list = (page: Page) => page.locator('[data-day-scroll]');
const scrolled = (page: Page) => list(page).evaluate((el) => ({ top: el.scrollTop, room: el.scrollHeight - el.clientHeight }));
/** Where the parts of Home that are not the Today card sit on the page. */
const places = (page: Page) => page.evaluate(() => ['#week-title', '#next-title', '#coming-title', '#home-headlines-title', '[data-date]'].map((part) => { const b = document.querySelector(part)!.getBoundingClientRect(); return [part, Math.round(b.x), Math.round(b.y)]; }));

test('on a wide screen a long day scrolls inside the Today card, and everything else stays where it was', async ({ page }) => {
  await page.setViewportSize({ width: 1420, height: 922 });
  await openWith(page, '/', FULL);
  await expect(page.locator('[data-home-headlines] li')).toHaveCount(3);
  const before = await places(page);
  expect((await scrolled(page)).room).toBe(0);
  await openWith(page, '/', LONG);
  await expect(card(page).locator('li[data-task]')).toHaveCount(33);
  // the page is no longer than the screen, and nothing beside the card has moved
  expect(await below(page)).toBe(0);
  expect(await places(page)).toEqual(before);
  // the card reaches the foot of the screen and no further, with its heading still at its top
  const box = (await card(page).boundingBox())!;
  expect(Math.round(box.y + box.height)).toBeLessThanOrEqual(922 + 20);
  await expect(page.locator('#day-title')).toBeInViewport();
  // the list has somewhere to go, and the wheel takes it there without moving the page
  expect((await scrolled(page)).room).toBeGreaterThan(400);
  await list(page).hover();
  await page.mouse.wheel(0, 300);
  await expect.poll(async () => (await scrolled(page)).top).toBeGreaterThan(200);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator('#day-title')).toBeInViewport();
  // right to the end: the last task, the row that adds another, and the day's habits
  await list(page).evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(card(page).locator('li[data-task]').last()).toBeInViewport();
  await expect(page.locator('#composer-day')).toBeInViewport();
  await expect(card(page).locator('[data-habits="foot"]')).toBeInViewport();
});

test('adding to a long day keeps the row that adds in view, by keyboard alone', async ({ page }) => {
  await page.setViewportSize({ width: 1420, height: 922 });
  await openWith(page, '/', LONG);
  await expect(card(page).locator('li[data-task]')).toHaveCount(33);
  await page.keyboard.press('n');
  await expect(page.locator('#composer-day')).toBeFocused();
  await expect(page.locator('#composer-day')).toBeInViewport({ ratio: 1 });
  for (const title of ['And another', 'And one more', 'And the last']) {
    await page.keyboard.type(title);
    await page.keyboard.press('Enter');
    await expect(card(page).locator('li[data-task]', { hasText: title })).toHaveCount(1);
    await expect(page.locator('#composer-day')).toBeFocused();
    await expect(page.locator('#composer-day')).toBeInViewport({ ratio: 1 });
  }
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('rows ease in and out at the card’s edges as it scrolls, and a rule shows under its heading once it has moved', async ({ page }) => {
  await page.setViewportSize({ width: 1420, height: 922 });
  await openWith(page, '/', LONG);
  await expect(card(page).locator('li[data-task]')).toHaveCount(33);
  const cell = card(page).locator('li[data-task] > button').first(), rule = card(page).locator('[data-day-rule]'), more = card(page).locator('[data-day-more]');
  const opacity = (part: typeof cell) => part.evaluate((el) => Number(getComputedStyle(el).opacity));
  expect(await cell.evaluate((el) => getComputedStyle(el).animationName)).toBe('day-row');
  // at rest at the top: the first row is whole, there is no rule yet, and the foot says there is more below
  expect(await opacity(cell)).toBe(1);
  expect(await opacity(rule)).toBe(0);
  expect(await opacity(more)).toBe(1);
  // part-way out under the heading, the first row is fading and has begun to move
  await list(page).evaluate((el) => el.scrollTo(0, 30));
  await expect.poll(() => opacity(cell)).toBeLessThan(1);
  expect(await opacity(cell)).toBeGreaterThan(0);
  expect(await cell.evaluate((el) => getComputedStyle(el).transform)).not.toBe('none');
  expect(await opacity(rule)).toBe(1);
  // at the very end there is nothing more below
  await list(page).evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect.poll(() => opacity(more)).toBe(0);
});

test('with reduced motion the rows do not move as the card scrolls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1420, height: 922 });
  await openWith(page, '/', LONG);
  const cell = card(page).locator('li[data-task] > button').first();
  expect(await cell.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  await list(page).evaluate((el) => el.scrollTo(0, 30));
  expect(await cell.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
  // the card still scrolls by itself
  expect((await scrolled(page)).top).toBe(30);
  expect(await below(page)).toBe(0);
});

test('a short day’s card does not scroll, and has neither rule nor fade', async ({ page }) => {
  await page.setViewportSize({ width: 1420, height: 922 });
  await openWith(page, '/', FULL);
  expect((await scrolled(page)).room).toBe(0);
  for (const part of ['[data-day-rule]', '[data-day-more]']) expect(await card(page).locator(part).evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(0);
});

test('on a phone a long day is part of the page, which scrolls as it always did', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWith(page, '/', LONG);
  await expect(card(page).locator('li[data-task]')).toHaveCount(33);
  expect((await scrolled(page)).room).toBe(0);
  expect(await below(page)).toBeGreaterThan(800);
  expect(await card(page).locator('li[data-task] > button').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  expect(await sideways(page)).toBe(0);
});

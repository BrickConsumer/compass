import { expect, type Page, test } from '@playwright/test';
import { addDaysISO, dayMonth, longDate, shortDay, todayISO, weekdayOf, weekLabel, weekStartOf } from '../../src/domain/dates';
import { openWith, saved, sideways } from './support';

/** Open a page on the sample with Fitness switched on, and anything else changed. */
const fit = (page: Page, path: string, patch: Record<string, unknown> = {}) => openWith(page, path, { settings: { fitness: true }, ...patch });
// only one of the two is shown at a time: the rail from 640 px, the bar below it
const rail = (page: Page) => page.getByRole('navigation', { name: 'Main' }).first();
const bar = (page: Page) => page.getByRole('navigation', { name: 'Main' }).last();
const place = (page: Page) => page.locator('main[data-fitness]');
const wide = (page: Page) => page.setViewportSize({ width: 1440, height: 900 });
const phone = (page: Page) => page.setViewportSize({ width: 390, height: 844 });
const search = async (page: Page, words: string) => {
  await expect(async () => { await page.keyboard.press('Control+k'); await expect(page.getByPlaceholder('Search or jump to')).toBeFocused({ timeout: 500 }); }).toPass();
  await page.getByPlaceholder('Search or jump to').fill(words);
};

// The switch, the rail, the bar, search, and the place's frame

test('Fitness is off at first, and nothing of it shows', async ({ page }) => {
  await wide(page);
  await openWith(page, '/', {});
  await expect(rail(page).locator('ul').first().getByRole('link')).toHaveCount(5);
  await expect(rail(page).getByRole('link', { name: 'Fitness' })).toHaveCount(0);
  await expect(page.locator('[data-training]')).toHaveCount(0);
  await page.goto('/review');
  await expect(page.locator('[data-figures] dt')).toHaveCount(3);
  await phone(page);
  await expect(bar(page).getByRole('link')).toHaveCount(5);
  await page.goto('/fitness');
  await expect(place(page)).toHaveAttribute('data-fitness', 'off');
  await expect(place(page)).toContainText('Fitness is switched off. It is a place for your training week, what you did and anything you choose to measure.');
});

test('the switch shows the place and hides it again, keeping what is in it', async ({ page }) => {
  await wide(page);
  await openWith(page, '/settings', {});
  const parts = await page.locator('main h2').allTextContents();
  expect(parts.indexOf('Fitness')).toBe(parts.indexOf('Appearance') + 1);
  expect(parts.indexOf('The sea')).toBe(parts.indexOf('Fitness') + 1);
  await page.getByRole('checkbox', { name: /Show Fitness/ }).check();
  const places = rail(page).locator('ul').first().getByRole('link');
  await expect(places).toHaveCount(6);
  await expect(places.last()).toHaveText('Fitness');
  await places.last().click();
  await expect(page).toHaveURL(/\/fitness$/);
  await expect(place(page)).toHaveAttribute('data-fitness', 'on');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fitness');
  await page.goto('/settings');
  await page.getByRole('checkbox', { name: /Show Fitness/ }).uncheck();
  await expect(rail(page).getByRole('link', { name: 'Fitness' })).toHaveCount(0);
  const kept = await saved(page);
  expect([kept.routines.length, kept.workouts.length, kept.settings.fitness]).toEqual([4, 4, false]);
});

test('"Switch on Fitness" on the place itself switches it on', async ({ page }) => {
  await wide(page);
  await openWith(page, '/fitness', {});
  await page.getByRole('button', { name: 'Switch on Fitness' }).click();
  await expect(place(page)).toHaveAttribute('data-fitness', 'on');
  expect((await saved(page)).settings.fitness).toBe(true);
});

test("the phone's bar has six places with Fitness on", async ({ page }) => {
  await phone(page);
  await fit(page, '/fitness');
  const links = bar(page).getByRole('link');
  await expect(links).toHaveCount(6);
  await expect(links.last()).toHaveText('Fitness');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const box of await links.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height }; }))) {
      expect(box.h).toBeGreaterThanOrEqual(44);
      expect(box.w).toBeGreaterThanOrEqual(53);
    }
    expect(await sideways(page)).toBe(0);
  }
});

test('search goes to Fitness, or switches it on', async ({ page }) => {
  await wide(page);
  await openWith(page, '/', {});
  const results = page.getByRole('dialog', { name: 'Search and commands' }).getByRole('button');
  await search(page, 'fitness');
  await expect(results).toHaveText(['Switch on Fitness']);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/fitness$/);
  await expect(place(page)).toHaveAttribute('data-fitness', 'on');
  await search(page, 'fitness');
  await expect(results).toHaveText(['Go to Fitness']);
});

test('the place says what a session earns, and pages through the weeks', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness');
  await expect(place(page)).toContainText('Your training week and what you did. Finishing a session logs 2 nautical miles, for one session a day. A missed one takes nothing away.');
  const thisWeek = page.getByRole('button', { name: 'This week' }), head = place(page).locator('header'), week = weekStartOf(todayISO(), 1);
  await expect(thisWeek).toBeDisabled();
  await expect(head).toContainText(weekLabel(week));
  await page.getByRole('button', { name: 'Previous week' }).click();
  await expect(head).toContainText(weekLabel(addDaysISO(week, -7)));
  await thisWeek.click();
  await expect(head).toContainText(weekLabel(week));
});

// Routines

const TODAY = todayISO(), day = (offset: number) => addDaysISO(TODAY, offset);
const lines = (id: string, texts: string[]) => texts.map((text, i) => ({ id: `${id}-${i + 1}`, text }));
/** A routine with days of its own, for tests that must not depend on what day it is. */
const routine = (id: string, name: string, days: number[], texts: string[] = ['One', 'Two']) => ({ id, name, days, lines: lines(id, texts), createdOn: day(-28) });
const GYM = routine('rt-gym', 'Gym', [1, 5], ['Squat, 3 × 5 at 60 kg', 'Bench press, 3 × 8 at 40 kg', 'Plank, 3 × 40 seconds']);
const routineRow = (page: Page, id: string) => page.locator(`li[data-routine="${id}"]`);
const editor = (page: Page) => page.getByRole('dialog', { name: 'Edit routine' });

test('a routine is added by name and opens ready for its first line', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness');
  await page.locator('#new-routine').fill('Swim squad');
  await page.keyboard.press('Enter');
  await expect(editor(page)).toBeVisible();
  const line = page.locator('#new-routine-line');
  await expect(line).toBeFocused();
  await line.fill('400 m warm up');
  await line.press('Enter');
  await line.fill('8 × 100 m');
  await line.press('Enter');
  await page.keyboard.press('Escape');
  await expect(editor(page)).toBeHidden();
  const row = page.locator('li[data-routine]').last();
  await expect(row).toContainText('Swim squad');
  await expect(row.locator('[data-routine-line]')).toHaveText('No fixed day. 2 lines');
  await expect(row.locator('[data-last-done]')).toHaveText('Not done yet');
  await expect(page.locator('#new-routine')).toHaveValue('');
});

test("a routine's days and lines are changed in its editor", async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness', { routines: [GYM], workouts: [] });
  const row = routineRow(page, 'rt-gym'), summary = row.locator('[data-routine-line]');
  await expect(summary).toHaveText('Mon, Fri. 3 lines');
  await row.getByRole('button').click();
  const days = editor(page).getByRole('group', { name: 'Days' }).getByRole('button');
  await expect(days).toHaveText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  await expect(editor(page).getByRole('button', { pressed: true })).toHaveText(['Mon', 'Fri']);
  await expect(editor(page)).toContainText('Leave every day off for a routine with no fixed day.');
  await days.nth(0).click();
  await days.nth(4).click();
  await expect(summary).toHaveText('No fixed day. 3 lines');
  await days.nth(2).click();
  await expect(summary).toHaveText('Wed. 3 lines');
  // a line is pressed to change it, and moved or deleted from there
  const list = editor(page).locator('[data-item]');
  await list.first().getByRole('button').click();
  const box = page.getByLabel('Change Squat, 3 × 5 at 60 kg');
  await box.fill('Squat, 3 × 5 at 62.5 kg');
  await box.press('Enter');
  await expect(list.first()).toContainText('Squat, 3 × 5 at 62.5 kg');
  await list.first().getByRole('button').click();
  await page.getByRole('button', { name: 'Move down' }).click();
  await expect(list.nth(1)).toHaveAttribute('data-item', 'rt-gym-1');
  // a line deleted here goes at once: the editor shuts out the page behind it, where Undo would be
  await page.getByRole('button', { name: 'Delete line' }).click();
  await expect(list).toHaveCount(2);
  await expect(page.locator('[role="status"]')).toBeEmpty();
  await expect(editor(page)).toContainText('A line is kept as you type it. Sessions already done keep the lines they had.');
  expect((await saved(page)).routines[0].lines.map((l: { text: string }) => l.text)).toEqual(['Bench press, 3 × 8 at 40 kg', 'Plank, 3 × 40 seconds']);
});

test('deleting a routine offers Undo, and keeps the sessions done from it', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness');
  const rows = page.locator('li[data-routine]');
  await expect(rows).toHaveCount(4);
  await routineRow(page, 'rt-intervals').getByRole('button').click();
  await editor(page).getByRole('button', { name: 'Delete routine' }).click();
  await expect(page.getByText('Routine deleted.')).toBeVisible();
  await expect(rows).toHaveCount(3);
  expect((await saved(page)).workouts).toHaveLength(4);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(1)).toHaveAttribute('data-routine', 'rt-intervals');
});

test('the list says when each routine was last done', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness');
  const last = routineRow(page, 'rt-strength').locator('[data-last-done]');
  await expect(last).toHaveText(`Last done ${shortDay(day(-2))}`);
  await phone(page);
  await expect(last).toBeHidden();
  expect(await sideways(page)).toBe(0);
});

test('at twenty routines the box to add one is gone', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness', { routines: Array.from({ length: 20 }, (_, i) => routine(`rt-${i}`, `Routine ${i}`, [])), workouts: [] });
  await expect(page.locator('li[data-routine]')).toHaveCount(20);
  await expect(page.locator('#new-routine')).toHaveCount(0);
});

// This week, and a session

type TestRoutine = ReturnType<typeof routine>;
/** A finished session from a routine, every line ticked, that has had its miles. */
const done = (id: string, from: TestRoutine, offset: number, note = '') => ({ id, routineId: from.id, name: from.name, date: day(offset), lines: from.lines.map((l) => ({ ...l, done: true })), note, finishedAt: `${day(offset)}T18:00:00.000Z`, milesAwarded: true });
const sessionRow = (page: Page, date: string) => page.locator(`li[data-session][data-day="${date}"]`);
const openSession = (page: Page) => page.locator('section[data-workout]');
const count = (page: Page) => page.locator('[data-session-count]');
const weekCount = (page: Page) => page.locator('[data-week-count]');
const offersBox = (page: Page) => page.locator('[data-offers]');
const plate = (page: Page) => page.locator('a[aria-label^="Open the voyage."]').first();
const start = (page: Page) => sessionRow(page, TODAY).getByRole('button', { name: /^Start/ });
const weeksBack = async (page: Page, n: number) => { for (let i = 0; i < n; i++) await page.getByRole('button', { name: 'Previous week' }).click(); };
/** The week that holds a day, shown: the sample is placed around today, so a day two days back may be last week. */
const showWeekOf = async (page: Page, date: string) => { if (date < weekStartOf(TODAY, 1)) await weeksBack(page, 1); };

test('this week lists each session in its state', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness');
  const due = sessionRow(page, TODAY), rows = page.locator('li[data-session]');
  await expect(due).toHaveAttribute('data-state', 'due');
  await expect(due).toContainText('Intervals');
  await expect(due).toContainText('Today. 6 lines');
  await expect(start(page)).toBeVisible();
  // next week every session is still to come, and nothing can be pressed
  await page.getByRole('button', { name: 'Next week' }).click();
  await expect(rows).toHaveCount(4);
  expect(await rows.evaluateAll((els) => els.map((el) => el.getAttribute('data-state')))).toEqual(['ahead', 'ahead', 'ahead', 'ahead']);
  await expect(rows.getByRole('button')).toHaveCount(0);
  await expect(rows.first()).toContainText('Still to come');
  await expect(weekCount(page)).toHaveText('0 of 4 sessions done');
  // three weeks back nothing was started, so each set session can still be logged
  await page.getByRole('button', { name: 'This week' }).click();
  await weeksBack(page, 3);
  await expect(rows).toHaveCount(4);
  expect(await rows.evaluateAll((els) => els.map((el) => el.getAttribute('data-state')))).toEqual(['past', 'past', 'past', 'past']);
  await expect(rows.getByRole('button', { name: /Log it/ })).toHaveCount(4);
  // the session done two days ago shows its note and its count, and its ring is a mark, not a control
  await page.getByRole('button', { name: 'This week' }).click();
  await showWeekOf(page, day(-2));
  const finished = sessionRow(page, day(-2));
  await expect(finished).toHaveAttribute('data-state', 'finished');
  await expect(finished).toContainText('Squat felt easier than last week.');
  await expect(finished).toContainText('5 of 5');
  await expect(finished).toContainText('Finished');
  await expect(finished.getByRole('checkbox')).toHaveCount(0);
});

test('"Start" opens a session to tick, and everything is kept as it is done', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness');
  await start(page).click();
  await expect(page).toHaveURL(/\/fitness\/wk-/);
  const sheet = openSession(page), row = sessionRow(page, TODAY);
  await expect(sheet.getByRole('heading', { name: 'Intervals' })).toBeFocused();
  await expect(sheet).toContainText(`Today, ${longDate(TODAY)}`);
  await expect(count(page)).toHaveText('0 of 6');
  await sheet.getByRole('checkbox', { name: 'Warm up, 10 minutes easy' }).check();
  await sheet.getByRole('checkbox', { name: 'Drills: high knees and strides' }).check();
  await expect(count(page)).toHaveText('2 of 6');
  const add = sheet.getByLabel('Add a line for today');
  await add.fill('Strides');
  await add.press('Enter');
  // "Drills: high knees and strides" has the word in it too, so this one is asked for exactly
  await sheet.getByRole('checkbox', { name: 'Strides', exact: true }).check();
  await expect(count(page)).toHaveText('3 of 7');
  await sheet.getByLabel('Notes').fill('Held 92 seconds.');
  await page.reload();
  await expect(count(page)).toHaveText('3 of 7');
  await expect(sheet.getByLabel('Notes')).toHaveValue('Held 92 seconds.');
  await expect(row).toHaveAttribute('data-state', 'started');
  await expect(row).toContainText('Started. 3 of 7 so far.');
  // closing leaves it started, and the routine it came from has the lines it had
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(page).toHaveURL(/\/fitness$/);
  await expect(sheet).toHaveCount(0);
  await expect(row).toHaveAttribute('data-state', 'started');
  expect((await saved(page)).routines[1].lines).toHaveLength(6);
  await row.getByRole('button', { name: /Open/ }).click();
  await expect(count(page)).toHaveText('3 of 7');
});

test('finishing logs 2 nautical miles, for one session a day', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness');
  await expect(weekCount(page)).toContainText('sessions done');
  const before = await weekCount(page).innerText();
  await start(page).click();
  await openSession(page).getByRole('button', { name: 'Finish session' }).click();
  await expect(page.getByText('Session finished. 2 nautical miles logged.')).toBeVisible();
  await expect(openSession(page)).toHaveCount(0);
  await expect(sessionRow(page, TODAY)).toHaveAttribute('data-state', 'finished');
  expect(await weekCount(page).innerText()).not.toBe(before);
  // a second session the same day is kept, and earns nothing
  await expect(offersBox(page)).toContainText('Start another');
  await offersBox(page).locator('button[data-offer="rt-stretch"]').click();
  await openSession(page).getByRole('button', { name: 'Finish session' }).click();
  await expect(page.getByText('Session finished.', { exact: true })).toBeVisible();
  await expect(sessionRow(page, TODAY)).toHaveCount(2);
  await page.goto('/');
  await expect(plate(page)).toHaveAttribute('aria-label', /414 nautical miles logged/);
});

test('a finished session can be changed, reopened and deleted', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness');
  await showWeekOf(page, day(-2));
  const row = sessionRow(page, day(-2)), sheet = openSession(page);
  await row.getByRole('button').first().click();
  await expect(sheet).toContainText('Finished');
  await expect(sheet.getByRole('button', { name: 'Finish session' })).toHaveCount(0);
  await sheet.getByRole('checkbox', { name: 'Plank, 3 × 40 seconds' }).uncheck();
  await expect(count(page)).toHaveText('4 of 5');
  await sheet.getByRole('button', { name: 'Reopen' }).click();
  await expect(row).toHaveAttribute('data-state', 'started');
  // the sample's sessions have had their miles, so finishing one again logs none
  await sheet.getByRole('button', { name: 'Finish session' }).click();
  await expect(page.getByText('Session finished.', { exact: true })).toBeVisible();
  await row.getByRole('button').first().click();
  await sheet.getByRole('button', { name: 'Delete session' }).click();
  await expect(page.getByText('Session deleted.')).toBeVisible();
  // its day is one Strength is set for, so the day shows the set session again
  await expect(row).toHaveAttribute('data-state', 'past');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(row).toHaveAttribute('data-state', 'finished');
  expect((await saved(page)).log.some((e: { source: string }) => e.source === 'workout')).toBe(false);
});

test('"Not today" puts a session away, with Undo', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness');
  await start(page).click();
  const sheet = openSession(page), row = sessionRow(page, TODAY);
  await sheet.getByRole('checkbox', { name: 'Warm up, 10 minutes easy' }).check();
  await sheet.getByRole('button', { name: 'Not today' }).click();
  await expect(page.getByText('Session put away.')).toBeVisible();
  await expect(sheet).toHaveCount(0);
  await expect(row).toHaveAttribute('data-state', 'due');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(row).toHaveAttribute('data-state', 'started');
  await expect(row).toContainText('Started. 1 of 6 so far.');
});

test('a set session whose day has passed can be logged late', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness');
  await weeksBack(page, 3);
  const first = page.locator('li[data-session]').first(), date = (await first.getAttribute('data-day'))!, sheet = openSession(page);
  await first.getByRole('button', { name: /Log it/ }).click();
  await expect(sheet).toContainText(longDate(date));
  await expect(sheet).not.toContainText('Today,');
  await expect(sheet.getByRole('button', { name: 'Remove it' })).toBeVisible();
  await expect(sheet.getByLabel('Add a line', { exact: true })).toBeVisible();
  await sheet.getByRole('button', { name: 'Finish session' }).click();
  await expect(page.getByText('Session finished. 2 nautical miles logged.')).toBeVisible();
  const kept = await saved(page), last = kept.log.at(-1);
  expect([last.source, last.date]).toEqual(['workout', TODAY]);
  expect(kept.workouts.at(-1).date).toBe(date);
});

test('a session finished with no line ticked shows no count', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness');
  await start(page).click();
  await openSession(page).getByRole('button', { name: 'Finish session' }).click();
  const row = sessionRow(page, TODAY);
  await expect(row).toHaveAttribute('data-state', 'finished');
  await expect(row).not.toContainText('0 of 6');
});

test('a line in a session is changed and deleted as a page item is, with Undo', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness');
  await start(page).click();
  const sheet = openSession(page), list = sheet.locator('[data-item]');
  await list.first().getByRole('button').click();
  await page.getByRole('button', { name: 'Delete line' }).click();
  await expect(list).toHaveCount(5);
  await expect(page.getByText('Line deleted.')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(list).toHaveCount(6);
  await expect(list.first()).toContainText('Warm up, 10 minutes easy');
});

test('a rest day says so, and offers the routine not done for longest first', async ({ page }) => {
  await wide(page);
  const strength = routine('rt-strength', 'Strength', [weekdayOf(day(-2)), weekdayOf(day(2))]), long = routine('rt-long', 'Long run', [weekdayOf(day(3))]);
  const intervals = routine('rt-intervals', 'Intervals', []), stretch = routine('rt-stretch', 'Stretch', []);
  const workouts = [done('w1', strength, -2), done('w2', long, -4), done('w3', intervals, -7), done('w4', stretch, -9)];
  await fit(page, '/fitness', { routines: [strength, intervals, long, stretch], workouts });
  const rest = page.locator('li[data-rest]');
  await expect(rest).toContainText('Rest day');
  await expect(rest).toContainText('Nothing is set for today.');
  await expect(offersBox(page)).toContainText('Start one anyway');
  await expect(offersBox(page).locator('button[data-offer]')).toHaveText(['Stretch', 'Intervals', 'Long run', 'Strength']);
  await expect(offersBox(page)).toContainText('The one you have not done for longest comes first. Stretch was last done 9 days ago.');
  // the rest day is not a session, so the count leaves it out
  await expect(weekCount(page)).not.toContainText('No sessions');
  // with no routine that has a fixed day, no day is called a rest day
  await fit(page, '/fitness', { routines: [intervals, stretch], workouts: [] });
  await expect(page.locator('li[data-rest]')).toHaveCount(0);
  await expect(offersBox(page)).toContainText('Start one');
  await expect(offersBox(page)).not.toContainText('anyway');
  await expect(weekCount(page)).toHaveText('No sessions set');
  await offersBox(page).locator('button[data-offer="rt-stretch"]').click();
  await expect(openSession(page).getByRole('heading', { name: 'Stretch' })).toBeVisible();
});

test('the address of a session that is gone shows the place with nothing open', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness/wk-nowhere');
  await expect(place(page)).toHaveAttribute('data-fitness', 'on');
  await expect(openSession(page)).toHaveCount(0);
  await expect(page.locator('li[data-session]').first()).toBeVisible();
});

test('a session with no lines can still be finished', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness', { routines: [routine('rt-swim', 'Swim', [], [])], workouts: [] });
  await offersBox(page).locator('button[data-offer="rt-swim"]').click();
  const sheet = openSession(page);
  await expect(sheet).toContainText('No lines. Add one, or finish it as it is.');
  await expect(count(page)).toHaveText('');
  await sheet.getByRole('button', { name: 'Finish session' }).click();
  await expect(page.getByText('Session finished. 2 nautical miles logged.')).toBeVisible();
});

test('with no routines the place says how to begin', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness', { routines: [], workouts: [] });
  await expect(place(page)).toContainText('No routines yet. A routine is a checklist you write once, such as a run or a gym session. Add one under Routines.');
  await expect(weekCount(page)).toHaveText('No routines yet');
  await expect(offersBox(page)).toHaveCount(0);
});

// Recent, bests and measures

const recent = (page: Page) => page.locator('[data-recent] li[data-workout-row]');
const kept = (page: Page, list: 'bests' | 'measures') => page.locator(`[data-kept="${list}"]`);
const keptRows = (page: Page, list: 'bests' | 'measures') => kept(page, list).locator('li[data-kept-row]');

test('Recent lists the last three finished sessions, and all of them when asked', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness');
  await expect(recent(page)).toHaveCount(3);
  await expect(recent(page).nth(0)).toContainText('Strength');
  await expect(recent(page).nth(0)).toContainText('Squat felt easier than last week.');
  await expect(recent(page).nth(1)).toContainText('Long run');
  await expect(recent(page).nth(1)).toContainText('9 km by the river. Legs heavy at the start.');
  await expect(recent(page).nth(2)).toContainText('Intervals');
  await expect(recent(page).nth(2)).toContainText('5 of 6');
  await page.getByRole('button', { name: 'All sessions' }).click();
  await expect(recent(page)).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Show fewer' })).toBeVisible();
  await recent(page).first().getByRole('button').click();
  await expect(openSession(page).getByRole('heading', { name: 'Strength' })).toBeVisible();
  await fit(page, '/fitness', { workouts: [] });
  await expect(page.locator('[data-recent]')).toContainText('None yet. A finished session is kept here, with its note.');
  await expect(page.getByRole('button', { name: 'All sessions' })).toHaveCount(0);
});

test('a best is added, corrected and beaten, and a new one can be taken back', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness');
  const rows = keptRows(page, 'bests'), row = rows.last();
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText('5 km');
  await expect(rows.first()).toContainText('24:10');
  await expect(rows.first()).toContainText(`${dayMonth(day(-11))}. Was 24:52`);
  // it is added once it has a name and a value
  await page.locator('[data-add-kept="bests"]').click();
  const add = page.getByRole('dialog', { name: 'Add a best' }), addButton = add.getByRole('button', { name: 'Add best' });
  await expect(addButton).toBeDisabled();
  await add.getByLabel('Name').fill('10 km');
  await expect(addButton).toBeDisabled();
  await add.getByLabel('Value').fill('52:30');
  await addButton.click();
  await expect(rows).toHaveCount(4);
  await expect(row).toContainText('52:30');
  // a correction changes the value and keeps no "Was"
  await row.getByRole('button').click();
  const edit = page.getByRole('dialog', { name: 'Edit best' });
  await edit.getByLabel('Value', { exact: true }).fill('52:03');
  await expect(row).toContainText('52:03');
  await expect(row).not.toContainText('Was');
  // a new best keeps the one it beat, and can be taken back
  await page.locator('#kept-new').fill('51:40');
  await page.locator('#kept-new').press('Enter');
  await expect(edit).toBeHidden();
  await expect(page.getByText('New best kept.')).toBeVisible();
  await expect(row).toContainText('51:40');
  await expect(row).toContainText('Was 52:03');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(row).toContainText('52:03');
  await expect(row).not.toContainText('Was');
  await row.getByRole('button').click();
  await edit.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Best deleted.')).toBeVisible();
  await expect(rows).toHaveCount(3);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(rows).toHaveCount(4);
  // none of it moves the boat
  expect((await saved(page)).log.some((e: { source: string }) => e.source !== 'sample')).toBe(false);
});

test('a measure has its own unit, and nothing about it is suggested', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness');
  const rows = keptRows(page, 'measures');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Resting heart rate');
  await expect(rows.first()).toContainText('58 bpm');
  await expect(rows.first()).toContainText(`${dayMonth(day(-3))}. Was 61`);
  await expect(kept(page, 'measures')).toContainText('Only what you add yourself. Nothing here has a target, and none of it moves the boat.');
  await page.locator('[data-add-kept="measures"]').click();
  const add = page.getByRole('dialog', { name: 'Add a measure' });
  // nothing is filled in but the date, and no box holds an example of what to measure
  for (const name of ['Name', 'Unit', 'Value']) { await expect(add.getByLabel(name)).toHaveValue(''); await expect(add.getByLabel(name)).not.toHaveAttribute('placeholder'); }
  await expect(add.getByLabel('Date')).toHaveValue(TODAY);
  await add.getByLabel('Name').fill('Sleep');
  await add.getByLabel('Unit').fill('hours');
  await add.getByLabel('Value').fill('7.5');
  await add.getByRole('button', { name: 'Add measure' }).click();
  await expect(rows.last()).toContainText('7.5 hours');
  await rows.last().getByRole('button').click();
  await page.locator('#kept-new').fill('8');
  await page.getByRole('dialog', { name: 'Edit measure' }).getByRole('button', { name: 'Keep' }).click();
  await expect(page.getByText('New reading kept.')).toBeVisible();
  await expect(rows.last()).toContainText('8 hours');
  await expect(rows.last()).toContainText('Was 7.5');
});

test('with none, bests say what they are for, and a full list has no row to add to it', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness', { bests: [], measures: [] });
  await expect(kept(page, 'bests')).toContainText('None yet. Keep a time, a distance or a weight here, and the one it beat.');
  await expect(kept(page, 'measures')).toContainText('Only what you add yourself.');
  const one = (id: string, extra: object = {}) => ({ id, name: `Name ${id}`, value: '1', date: TODAY, ...extra });
  await fit(page, '/fitness', { bests: Array.from({ length: 20 }, (_, i) => one(`b${i}`)), measures: Array.from({ length: 12 }, (_, i) => one(`m${i}`, { unit: 'x' })) });
  await expect(keptRows(page, 'bests')).toHaveCount(20);
  await expect(keptRows(page, 'measures')).toHaveCount(12);
  await expect(page.locator('[data-add-kept]')).toHaveCount(0);
});

// Home, and the Weekly review

const trainingRing = (page: Page, name: string, date = TODAY) => page.getByRole('checkbox', { name: `Training: ${name}, ${longDate(date)}` });
const daySheet = (page: Page) => page.locator('section[aria-labelledby="day-title"]');

test("today's training is at the end of the habits line, and under the habits on a phone", async ({ page }) => {
  await wide(page);
  await fit(page, '/');
  const line = page.locator('[data-habits="line"]'), training = line.locator('[data-training="line"]');
  await expect(training).toContainText('Training');
  await expect(training).toContainText('Intervals');
  const lastHabit = (await line.locator('[data-habit]').last().boundingBox())!, box = (await training.boundingBox())!;
  expect(box.x).toBeGreaterThan(lastHabit.x + lastHabit.width);
  // training is not a task: the day's count is what it was
  await expect(daySheet(page)).toContainText('3 of 5 done');
  await phone(page);
  const foot = page.locator('[data-training="foot"]');
  await expect(foot).toContainText('Intervals');
  await expect(foot).toBeVisible();
  // both are measured in one go: Home is still settling after the resize, and two readings taken apart can straddle a shift
  const gap = await page.evaluate(() => document.querySelector('[data-training="foot"]')!.getBoundingClientRect().top - document.querySelector('[data-habits="foot"]')!.getBoundingClientRect().bottom);
  expect(gap).toBeGreaterThanOrEqual(0);
  expect(await sideways(page)).toBe(0);
});

test('the ring finishes a session as it stands, and reopens it', async ({ page }) => {
  await wide(page);
  await fit(page, '/');
  const ring = trainingRing(page, 'Intervals');
  await ring.check();
  await expect(plate(page)).toHaveAttribute('aria-label', /414 nautical miles logged/);
  // the ring is the answer: nothing else is said, and the day's tasks are as they were
  await expect(page.locator('[role="status"]')).toBeEmpty();
  await expect(daySheet(page)).toContainText('3 of 5 done');
  await page.goto('/fitness');
  const row = sessionRow(page, TODAY);
  await expect(row).toHaveAttribute('data-state', 'finished');
  await expect(row).not.toContainText('of 6');
  await page.goto('/');
  await expect(ring).toBeChecked();
  await ring.uncheck();
  await expect(plate(page)).toHaveAttribute('aria-label', /414 nautical miles logged/);
  expect((await saved(page)).workouts.at(-1).finishedAt).toBeUndefined();
});

test('the name opens the session in Fitness, and starts it first', async ({ page }) => {
  await wide(page);
  await fit(page, '/');
  await page.getByRole('button', { name: 'Open Intervals in Fitness' }).click();
  await expect(page).toHaveURL(/\/fitness\/wk-/);
  await expect(count(page)).toHaveText('0 of 6');
});

test('a day to come cannot be ticked, and a day that has passed can', async ({ page }) => {
  await wide(page);
  await fit(page, `/?date=${day(2)}`);
  await expect(trainingRing(page, 'Strength', day(2))).toBeDisabled();
  // its name goes to Fitness and starts nothing
  await page.getByRole('button', { name: 'Open Strength in Fitness' }).click();
  await expect(page).toHaveURL(/\/fitness$/);
  expect((await saved(page)).workouts).toHaveLength(4);
  // five days back is a Strength day with no session in the sample
  await page.goto(`/?date=${day(-5)}`);
  await trainingRing(page, 'Strength', day(-5)).check();
  await expect(trainingRing(page, 'Strength', day(-5))).toBeChecked();
  const kept = await saved(page);
  expect(kept.workouts).toHaveLength(5);
  expect([kept.workouts[4].date, !!kept.workouts[4].finishedAt]).toEqual([day(-5), true]);
});

test('a day with training and no habits shows the training alone, and a day with neither shows nothing', async ({ page }) => {
  await wide(page);
  await fit(page, '/', { habits: [], ticks: [] });
  const line = page.locator('[data-habits="line"]');
  await expect(line.locator('[data-training="line"]')).toContainText('Intervals');
  await expect(line.locator('[data-habit]')).toHaveCount(0);
  await expect(line).not.toContainText('Habits');
  // tomorrow has nothing set
  await page.goto(`/?date=${day(1)}`);
  await expect(daySheet(page)).toBeVisible();
  await expect(page.locator('[data-habits], [data-training]')).toHaveCount(0);
});

test('more than three sessions in a day are a step away', async ({ page }) => {
  await wide(page);
  const five = Array.from({ length: 5 }, (_, i) => routine(`rt-${i}`, `Routine ${i}`, [weekdayOf(TODAY)]));
  await fit(page, '/', { routines: five, workouts: [] });
  const training = page.locator('[data-training="line"]');
  await expect(training.locator('[data-training-item]')).toHaveCount(3);
  await training.getByRole('link', { name: '2 more' }).click();
  await expect(page).toHaveURL(/\/fitness$/);
});

test('the Weekly review counts training sessions, only while Fitness is on', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness');
  const [, finished, total] = (await weekCount(page).innerText()).match(/^(\d+) of (\d+)/)!;
  await page.goto('/review');
  const figure = page.locator('[data-figure="training"]'), figures = page.locator('[data-figures] > div');
  await expect(figure).toContainText('Training sessions');
  await expect(figure.locator('dd')).toContainText(`${finished}of ${total}`);
  await expect(figures).toHaveCount(4);
  // on a phone the four are two rows of two
  await phone(page);
  expect(new Set(await figures.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))).size).toBe(2);
  expect(await sideways(page)).toBe(0);
  // a week with no sessions says so, and with Fitness off the figure is not there
  await fit(page, '/review', { routines: [], workouts: [] });
  await expect(figure).toContainText('None set');
  await openWith(page, '/review', {});
  await expect(figures).toHaveCount(3);
  await expect(figure).toHaveCount(0);
});

// The whole piece: every part at its longest, a thumb's reach, and the keyboard

const LONG = 'Pneumonoultramicroscopicsilicovolcanoconiosis'.repeat(4).slice(0, 140);
const longest = { id: 'rt-longest', name: 'W'.repeat(40), days: [weekdayOf(TODAY)], createdOn: day(-28), lines: Array.from({ length: 6 }, (_, i) => ({ id: `lw-${i}`, text: LONG })) };
const alsoToday = [routine('rt-b', 'Second today', [weekdayOf(TODAY)]), routine('rt-c', 'Third today', [weekdayOf(TODAY)])];
const FULL = {
  routines: [longest, ...alsoToday],
  workouts: [
    { id: 'wk-open', routineId: longest.id, name: longest.name, date: TODAY, lines: longest.lines.map((l, i) => ({ ...l, done: i < 2 })), note: `${LONG} `.repeat(14).slice(0, 2000) },
    done('wk-past', alsoToday[0]!, -3, `${LONG} ${'Felt strong. '.repeat(12)}`.trim()),
  ],
  bests: Array.from({ length: 20 }, (_, i) => ({ id: `b${i}`, name: 'B'.repeat(40), value: '9'.repeat(24), date: TODAY, was: { value: '8'.repeat(24), date: day(-9) } })),
  measures: Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, name: 'M'.repeat(40), unit: 'u'.repeat(12), value: '7'.repeat(12), date: TODAY, was: { value: '6'.repeat(12), date: day(-9) } })),
};

for (const width of [320, 375, 390, 768, 1024, 1440]) {
  test(`with every part of Fitness at its longest, nothing is wider than the screen at ${width} px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await fit(page, '/fitness', FULL);
    // everything is there to be measured: three sessions today, twenty bests and twelve measures
    await expect(sessionRow(page, TODAY)).toHaveCount(3);
    await expect(keptRows(page, 'bests')).toHaveCount(20);
    await expect(keptRows(page, 'measures')).toHaveCount(12);
    expect(await sideways(page), 'the place').toBe(0);
    await page.goto('/fitness/wk-open');
    await expect(openSession(page)).toBeVisible();
    await expect(count(page)).toHaveText('2 of 6');
    expect(await sideways(page), 'a session').toBe(0);
    // Home is measured from 375 px, as its own tests measure it. At 320 px its date and two round buttons are wider than
    // the screen with or without Fitness, which is an older fault of Home's heading and not of anything here
    if (width >= 375) {
      await page.goto('/');
      await expect(page.locator('#day-title')).toBeVisible();
      await expect(page.locator('[data-training-item]').filter({ visible: true })).toHaveCount(3);
      expect(await sideways(page), 'Home').toBe(0);
    }
    await page.goto('/review');
    await expect(page.locator('[data-figure="training"]')).toBeVisible();
    expect(await sideways(page), 'the review').toBe(0);
    if (width < 375) {
      // so that nothing of Fitness can hide behind the older fault: Home is no wider with it than without it
      await page.goto('/');
      await expect(page.locator('[data-training-item]').filter({ visible: true })).toHaveCount(3);
      const withFitness = await sideways(page);
      await openWith(page, '/', FULL);
      await expect(page.locator('[data-training-item]')).toHaveCount(0);
      expect(withFitness, 'Home with Fitness, against Home without').toBeLessThanOrEqual(await sideways(page));
    }
    expect(errors).toEqual([]);
  });
}

test('on a phone, every button, link and box to tick in Fitness is tall enough for a thumb', async ({ page }) => {
  await phone(page);
  await fit(page, '/fitness/wk-open', FULL);
  await expect(openSession(page)).toBeVisible();
  // a box to tick is small by design; what a thumb presses is the label around it
  const tall = async (controls: ReturnType<Page['locator']>, atLeast: number) => {
    const shown = controls.filter({ visible: true });
    expect(await shown.count()).toBeGreaterThan(atLeast);
    for (const control of await shown.all()) {
      const box = (await control.boundingBox())!;
      expect(box.height, await control.evaluate((el) => `${el.tagName} ${el.getAttribute('aria-label') ?? el.textContent}`)).toBeGreaterThanOrEqual(44);
    }
  };
  // How many there are depends on the day of the week: a routine set for today is in the week, and not on offer as
  // well. The counts only make sure the controls were found at all, so they are set below any day's.
  await tall(place(page).locator('button, a, label:has(input[type="checkbox"]), input:not([type="checkbox"]), textarea'), 30);
  await page.goto('/');
  await expect(page.locator('[data-training="foot"]')).toBeVisible();
  await tall(page.locator('[data-training="foot"]').locator('button, a, label:has(input[type="checkbox"])'), 1);
});

test('a session is started, ticked and finished by keyboard alone', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness');
  await start(page).focus();
  await page.keyboard.press('Enter');
  const sheet = openSession(page);
  await expect(sheet.getByRole('heading', { name: 'Intervals' })).toBeFocused();
  // from its name: the Close mark, then the first line's box
  await page.keyboard.press('Tab');
  await expect(sheet.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await expect(count(page)).toHaveText('1 of 6');
  // on a line's words, Space ticks it and Enter opens it to be changed
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await expect(count(page)).toHaveText('2 of 6');
  await sheet.getByRole('button', { name: 'Finish session' }).focus();
  await page.keyboard.press('Enter');
  await expect(sessionRow(page, TODAY)).toHaveAttribute('data-state', 'finished');
  // a routine's days are pressed by keyboard too, and say whether they are on
  await routineRow(page, 'rt-stretch').getByRole('button').focus();
  await page.keyboard.press('Enter');
  const monday = editor(page).getByRole('button', { name: 'Mon' });
  await expect(monday).toHaveAttribute('aria-pressed', 'false');
  await monday.focus();
  await page.keyboard.press('Space');
  await expect(monday).toHaveAttribute('aria-pressed', 'true');
});

// What the review of the whole change found

test('a ring on Home pressed by keyboard keeps focus, the first time and after', async ({ page }) => {
  await wide(page);
  await fit(page, '/');
  const ring = trainingRing(page, 'Intervals');
  await ring.focus();
  await page.keyboard.press('Space');
  await expect(ring).toBeChecked();
  await expect(ring).toBeFocused();
  await page.keyboard.press('Space');
  await expect(ring).not.toBeChecked();
  await expect(ring).toBeFocused();
});

test("a session's row says where it stands to a screen reader", async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness');
  await start(page).click();
  await openSession(page).getByRole('checkbox', { name: 'Warm up, 10 minutes easy' }).check();
  await expect(sessionRow(page, TODAY).getByRole('button')).toHaveAccessibleName(`Open Intervals, ${longDate(TODAY)}. Started, 1 of 6 so far.`);
  await showWeekOf(page, day(-2));
  await expect(sessionRow(page, day(-2)).getByRole('button')).toHaveAccessibleName(`Open Strength, ${longDate(day(-2))}. Finished, 5 of 5.`);
});

test('the routines that can be started say so in their names', async ({ page }) => {
  await wide(page);
  await fit(page, '/fitness');
  await expect(offersBox(page).getByRole('button', { name: 'Start Stretch', exact: true })).toBeVisible();
  await expect(offersBox(page).locator('button[data-offer]')).toHaveText(['Stretch', 'Long run', 'Strength']);
});

test('a stray Backspace or Delete does not remove a line where there is no Undo', async ({ page }) => {
  await wide(page);
  // with no fixed day, so that it is on offer whatever day the tests are run on: set for today it would be in the week instead
  await fit(page, '/fitness', { routines: [{ ...GYM, days: [] }], workouts: [] });
  await routineRow(page, 'rt-gym').getByRole('button').click();
  const list = editor(page).locator('[data-item]');
  await list.first().getByRole('button').focus();
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Delete');
  await expect(list).toHaveCount(3);
  // in a session a line can be put back, so the keys still work there
  await page.keyboard.press('Escape');
  await expect(editor(page)).toBeHidden();
  await offersBox(page).locator('button[data-offer="rt-gym"]').click();
  const lines = openSession(page).locator('[data-item]');
  await lines.first().getByRole('button').focus();
  await page.keyboard.press('Delete');
  await expect(lines).toHaveCount(2);
  await expect(page.getByText('Line deleted.')).toBeVisible();
});

test('closing a session gives focus back to the week, and Back does not open it again', async ({ page }) => {
  await wide(page);
  await fit(page, '/');
  await rail(page).getByRole('link', { name: 'Fitness' }).click();
  await start(page).click();
  await openSession(page).getByRole('button', { name: 'Finish session' }).click();
  await expect(openSession(page)).toHaveCount(0);
  await expect(sessionRow(page, TODAY).getByRole('button')).toBeFocused();
  // closing was one step back to the place, so the next Back leaves it, and never reopens the session
  await expect(page).toHaveURL(/\/fitness$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#day-title')).toBeVisible();
  // opened from Home, a session's address gives way to the place's when it closes, and Back is Home again
  await page.getByRole('button', { name: 'Open Intervals in Fitness' }).click();
  await openSession(page).getByRole('button', { name: 'Close' }).click();
  await expect(page).toHaveURL(/\/fitness$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  // opening a second session while one is open takes its place: closing it shows no session
  await page.goto('/fitness');
  await offersBox(page).locator('button[data-offer="rt-long"]').click();
  await expect(openSession(page).getByRole('heading', { name: 'Long run' })).toBeVisible();
  // the newest in Recent is the Intervals session finished at the start of this test
  await page.locator('[data-recent] li[data-workout-row]').first().getByRole('button').click();
  await expect(openSession(page).getByRole('heading', { name: 'Intervals' })).toBeVisible();
  await openSession(page).getByRole('button', { name: 'Close' }).click();
  await expect(openSession(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/fitness$/);
  // a session that is put away has no row to go back to, so the week's heading takes focus
  await page.goto('/fitness');
  await offersBox(page).locator('button[data-offer="rt-stretch"]').click();
  await openSession(page).getByRole('button', { name: 'Not today' }).click();
  await expect(page.locator('#fitness-week')).toBeFocused();
});

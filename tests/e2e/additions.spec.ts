import { expect, type Page, test } from '@playwright/test';
import { addDaysISO, isoWeek, todayISO, weekStartOf } from '../../src/domain/dates';

// the sample's weeks start on Monday
const week = weekStartOf(todayISO(), 1);
// 59 characters, one short of the longest goal that is kept
const GOAL = 'Law at UNSW or USYD, by way of an ATAR of ninety-seven plus';

/**
 * Open a page on the sample, after changing the saved data in this browser.
 * Objects such as `boat` and `settings` are merged one level deep; everything else is replaced.
 */
async function openWith(page: Page, path: string, patch: Record<string, unknown>) {
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
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

const sideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const plate = (page: Page) => page.locator('a.absolute[aria-label^="Open the voyage."]');
const focus = (page: Page) => page.locator('[data-focus]:visible');

for (const width of [1440, 390]) {
  test(`a new user sees none of it at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openWith(page, '/', {});
    for (const mark of ['[data-greeting]', '[data-bound]', '[data-focus]', '[data-links]']) await expect(page.locator(mark)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Links' })).toHaveCount(0);
  });
}

for (const width of [375, 768, 1440]) {
  test(`a name puts a greeting above the date at ${width} px, and choosing another day keeps it`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openWith(page, '/', { settings: { name: 'Aditya' } });
    const greeting = page.locator('[data-greeting]'), date = page.getByRole('heading', { level: 1 });
    await expect(greeting).toHaveText(/^Good (morning|afternoon|evening), Aditya$/);
    const before = (await date.boundingBox())!, above = (await greeting.boundingBox())!;
    expect(above.y + above.height).toBeLessThanOrEqual(before.y + 1);
    expect(await sideways(page)).toBe(0);
    await page.getByRole('button', { name: 'Next week' }).click();
    await expect(greeting).toBeVisible();
    // the page does not jump: the date sits where it sat
    expect((await date.boundingBox())!.y).toBe(before.y);
    // the week slides in from the side; once it has settled nothing is wider than the screen
    await expect.poll(() => sideways(page)).toBe(0);
  });
}

test('a goal set on the voyage page shows on the plate', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/voyage', {});
  await page.getByLabel('Bound for').fill(GOAL);
  await expect(page.locator('[data-bound]')).toContainText(GOAL);
  await page.goto('/');
  const bound = plate(page).locator('[data-bound]');
  await expect(bound).toContainText('Bound for');
  await expect(bound).toContainText(GOAL);
  await expect(plate(page)).toHaveAttribute('aria-label', new RegExp(`Bound for ${GOAL}\\.`));
  expect((await plate(page).boundingBox())!.width).toBeLessThanOrEqual(420);
  // only the words "Bound for" are italic: the goal is the plan, so it is upright
  expect(await bound.locator('i').evaluate((el) => getComputedStyle(el).fontStyle)).toBe('italic');
  await expect(bound.locator('i')).toHaveText('Bound for');
  // folding the sea away takes the goal with it
  await page.getByRole('button', { name: 'Hide the sea' }).click();
  await expect(page.locator('[data-bound]:visible')).toHaveCount(0);
});

test('on a phone the goal sits under the name of the boat', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWith(page, '/', { boat: { boundFor: GOAL } });
  const shown = page.locator('[data-bound]:visible');
  await expect(shown).toHaveCount(1);
  await expect(shown).toContainText(GOAL);
  expect(await sideways(page)).toBe(0);
});

test('a High subject is named, and its task comes first within a priority', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/', { levels: { [week]: { eng: 'high', mat: 'medium' } } });
  await expect(focus(page)).toHaveText(/Focus.*English/);
  // Medium only changes the order; it is not named
  await expect(focus(page)).not.toContainText('Mathematics');
  await expect(focus(page)).not.toContainText('from week');
  // it is real text for a screen reader, not a label on an empty group, which some of them skip
  await expect(focus(page).locator('.sr-only')).toHaveText('Focus: English');
  await expect(focus(page)).not.toHaveAttribute('role', 'group');
  // reopen an English task: it now sits above Mathematics, and below the High-priority task
  await page.getByRole('checkbox', { name: 'Review English notes' }).click();
  const open = page.locator('section[aria-labelledby="day-title"] li[data-done="false"]');
  await expect(open).toHaveCount(3);
  await expect(open.nth(0)).toContainText('Prepare Economics essay');
  await expect(open.nth(1)).toContainText('Review English notes');
  await expect(open.nth(2)).toContainText('Finish Mathematics exercises');
});

test('with no levels a reopened task keeps its own place', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/', {});
  await page.getByRole('checkbox', { name: 'Review English notes' }).click();
  const open = page.locator('section[aria-labelledby="day-title"] li[data-done="false"]');
  await expect(open.nth(1)).toContainText('Finish Mathematics exercises');
  await expect(open.nth(2)).toContainText('Review English notes');
});

test('the focus has a line of its own on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWith(page, '/', { levels: { [week]: { eng: 'high', bio: 'high' } } });
  await expect(focus(page)).toHaveCount(1);
  await expect(focus(page).locator('.sr-only')).toHaveText('Focus: Biology, English');
  expect(await sideways(page)).toBe(0);
});

test('more than four High subjects are counted, not all named', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/', { levels: { [week]: { bio: 'high', eco: 'high', eng: 'high', mat: 'high', chi: 'high' } } });
  await expect(focus(page)).toContainText('and 1 more');
  await expect(focus(page)).not.toContainText('Chinese');
});

test('levels from an earlier week are marked as carried over', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const earlier = addDaysISO(week, -14);
  await openWith(page, '/', { levels: { [earlier]: { eng: 'high' } } });
  await expect(focus(page)).toContainText(`from week ${isoWeek(earlier)}`);
  await expect(focus(page).locator('.sr-only')).toHaveText(`Focus: English, from week ${isoWeek(earlier)}`);
});

test("next week's levels do not show this week", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/', { levels: { [addDaysISO(week, 7)]: { chi: 'high' } } });
  await expect(focus(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Next week' }).click();
  await expect(focus(page)).toContainText('Chinese');
});

// The Weekly review

const saved = (page: Page) => page.getByRole('navigation', { name: 'Saved reviews' });
const slider = (page: Page, area: string) => page.getByRole('slider', { name: `${area}, out of 10` });
const level = (page: Page, subject: string, name: string) => page.getByRole('group', { name: subject }).getByRole('button', { name });
const HINT = 'Write in any of the three, or rate the week, to save it.';

test('the review shows a row to rate for each area', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/review', {});
  await expect(page.getByRole('heading', { name: 'How the week went' })).toBeVisible();
  await expect(page.locator('li[data-rating]')).toHaveCount(4);
  await expect(slider(page, 'Study')).toHaveValue('0');
  await expect(slider(page, 'Study')).toHaveAttribute('aria-valuetext', 'Not rated');
  // the sample's saved review, last week, is rated
  await page.getByRole('button', { name: 'Previous week' }).click();
  for (const [area, n] of [['Study', '7'], ['Health', '6'], ['Sleep', '5'], ['Discipline', '7']] as const) await expect(slider(page, area)).toHaveValue(n);
  await expect(slider(page, 'Sleep')).toHaveAttribute('aria-valuetext', '5 out of 10');
});

test('a week can be rated by keyboard and saved on a rating alone', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/review', {});
  await expect(page.getByText(HINT)).toBeVisible();
  await slider(page, 'Sleep').focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await expect(slider(page, 'Sleep')).toHaveValue('3');
  await expect(page.getByText(HINT)).toHaveCount(0);
  await page.getByRole('button', { name: 'Save review' }).click();
  await expect(page.getByText('Review saved. 10 nautical miles logged.')).toBeVisible();
  await page.reload();
  await expect(slider(page, 'Sleep')).toHaveValue('3');
  await expect(saved(page)).toContainText('Rated, nothing written.');
  // taking it back to nothing clears it
  await slider(page, 'Sleep').focus();
  await page.keyboard.press('Home');
  await expect(slider(page, 'Sleep')).toHaveValue('0');
});

test('a rating can be set and cleared by pressing its bar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/review', {});
  const segments = page.locator('li[data-rating="area-health"] [data-segment]');
  await expect(segments).toHaveCount(10);
  await segments.nth(5).click();
  await expect(slider(page, 'Health')).toHaveValue('6');
  await segments.nth(8).click();
  await expect(slider(page, 'Health')).toHaveValue('9');
  // pressing the one that is set clears it, so touch has a way back to nothing
  await segments.nth(8).click();
  await expect(slider(page, 'Health')).toHaveValue('0');
});

test("a level set in this week's review is for next week", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/review', {});
  await expect(page.getByRole('heading', { name: 'Subjects next week' })).toBeVisible();
  await level(page, 'English', 'High').click();
  await expect(level(page, 'English', 'High')).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/');
  await expect(focus(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Next week' }).click();
  await expect(focus(page)).toContainText('English');
  // pressing the level that is set clears it
  await page.goto('/review');
  await level(page, 'English', 'High').click();
  await expect(level(page, 'English', 'High')).toHaveAttribute('aria-pressed', 'false');
  await page.goto('/');
  await page.getByRole('button', { name: 'Next week' }).click();
  await expect(page.locator('#day-title')).toBeVisible();
  await expect(focus(page)).toHaveCount(0);
});

test("last week's review sets this week", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/review', {});
  await page.getByRole('button', { name: 'Previous week' }).click();
  await expect(page.getByRole('heading', { name: 'Subjects this week' })).toBeVisible();
  await level(page, 'Chinese', 'High').click();
  await page.goto('/');
  await expect(focus(page)).toContainText('Chinese');
});

test('levels carried from an earlier week say so', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const earlier = addDaysISO(week, -14);
  await openWith(page, '/review', { levels: { [earlier]: { eng: 'high' } } });
  await expect(page.getByText(`Carried over from week ${isoWeek(earlier)}.`)).toBeVisible();
  await expect(level(page, 'English', 'High')).toHaveAttribute('aria-pressed', 'true');
  // changing one starts next week's own record from what was carried, and the line goes
  await level(page, 'Biology', 'Medium').click();
  await expect(page.getByText(/Carried over from week/)).toHaveCount(0);
  await expect(level(page, 'English', 'High')).toHaveAttribute('aria-pressed', 'true');
});

test('with no areas the ratings are absent', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/review', { areas: [] });
  await expect(page.getByRole('heading', { name: 'Reflection' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How the week went' })).toHaveCount(0);
});

test('with no subjects the levels are absent', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // an empty subject list in a save falls back to the sample's, so start with one and delete it
  await openWith(page, '/study/eng', { subjects: [{ id: 'eng', name: 'English', colour: 'rose' }] });
  await page.locator('[data-edit-subject]').click();
  await page.getByRole('button', { name: 'Delete' }).click();
  // by the rail, so the page is not reloaded
  await page.getByRole('navigation', { name: 'Main' }).first().getByRole('link', { name: 'Weekly review' }).click();
  await expect(page.getByRole('heading', { name: 'Reflection' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Subjects/ })).toHaveCount(0);
});

// Study

test('a level set in Study takes effect today', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study/chi', {});
  await level(page, 'This week', 'High').click();
  await expect(level(page, 'This week', 'High')).toHaveAttribute('aria-pressed', 'true');
  const rows = page.getByRole('navigation', { name: 'Subjects' }).locator('a[data-subject]');
  await expect(rows.first()).toHaveAttribute('data-subject', 'chi');
  await expect(rows.first().locator('[data-level]')).toHaveText('High');
  await expect(rows.nth(1)).toHaveAttribute('data-subject', 'bio');
  // Medium sorts after High and before the rest
  await page.goto('/study/mat');
  await level(page, 'This week', 'Medium').click();
  await expect(rows.nth(1)).toHaveAttribute('data-subject', 'mat');
  await expect(rows.nth(1).locator('[data-level]')).toHaveText('Medium');
  await page.goto('/');
  await expect(focus(page).locator('.sr-only')).toHaveText('Focus: Chinese');
});

test('with no levels the subjects keep their order, and the first is open', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study', {});
  const rows = page.getByRole('navigation', { name: 'Subjects' }).locator('a[data-subject]');
  await expect(rows.first()).toHaveAttribute('data-subject', 'bio');
  await expect(page.locator('[data-level]')).toHaveCount(0);
  await expect(page.locator('#subject-title')).toHaveText('Biology');
});

test('the subject opened first is the one that matters most', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study', { levels: { [week]: { eng: 'high' } } });
  await expect(page.locator('#subject-title')).toHaveText('English');
});

// Settings

const WRONG = 'That does not look like a web address.';

test('a name set in Settings greets on Home, and clearing it removes the greeting', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/settings', {});
  await page.getByLabel('Your name').fill('Aditya');
  await page.goto('/');
  await expect(page.locator('[data-greeting]')).toContainText('Aditya');
  await page.goto('/settings');
  await expect(page.getByLabel('Your name')).toHaveValue('Aditya');
  await page.getByLabel('Your name').fill('');
  await page.goto('/');
  await expect(page.locator('#day-title')).toBeVisible();
  await expect(page.locator('[data-greeting]')).toHaveCount(0);
});

test('areas can be added, renamed, moved and removed with Undo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/settings', {});
  const areas = page.locator('[data-areas] li');
  await expect(areas).toHaveCount(4);
  await page.getByLabel('New area').fill('Investing');
  await page.getByRole('button', { name: 'Add area' }).click();
  await expect(areas).toHaveCount(5);
  await expect(page.getByLabel('New area')).toHaveValue('');
  await page.getByLabel('Area 3 name').fill('Rest');
  await page.getByRole('button', { name: 'Move Investing up' }).click();
  await expect(page.getByLabel('Area 4 name')).toHaveValue('Investing');
  // the review follows: five rows, in the new order, under the new name
  await page.goto('/review');
  await expect(page.locator('li[data-rating]')).toHaveCount(5);
  await expect(slider(page, 'Rest')).toHaveCount(1);
  await expect(page.locator('li[data-rating]').nth(3)).toContainText('Investing');
  // removing one can be undone, and its ratings come back with it
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Remove Study' }).click();
  await expect(page.getByText('Area removed.')).toBeVisible();
  await expect(areas).toHaveCount(4);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(areas).toHaveCount(5);
  await expect(page.getByLabel('Area 1 name')).toHaveValue('Study');
  await page.goto('/review');
  await page.getByRole('button', { name: 'Previous week' }).click();
  await expect(slider(page, 'Study')).toHaveValue('7');
  // six is the most
  await page.goto('/settings');
  await page.getByLabel('New area').fill('Friends');
  await page.getByRole('button', { name: 'Add area' }).click();
  await expect(areas).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Add area' })).toHaveCount(0);
  await expect(page.locator('[data-areas]')).toContainText('Six is the most.');
});

test('a link needs a real address, and takes its site as a name', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/settings', {});
  const links = page.locator('[data-links-settings] li'), address = page.getByLabel('Address', { exact: true });
  await expect(links).toHaveCount(0);
  await address.fill('investopedia.com');
  await page.getByRole('button', { name: 'Add link' }).click();
  await expect(links).toHaveCount(1);
  await expect(page.getByLabel('Link 1 name')).toHaveValue('investopedia.com');
  await expect(page.getByLabel('Link 1 address')).toHaveValue('https://investopedia.com/');
  await expect(address).toHaveValue('');
  // something that is not a web page is refused, and never becomes a link
  await address.fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Add link' }).click();
  await expect(page.getByText(WRONG)).toBeVisible();
  await expect(links).toHaveCount(1);
  await address.fill('');
  // a bad change says so, and the last good address is kept
  await page.getByLabel('Link 1 address').fill('nope');
  await page.getByLabel('Link 1 address').blur();
  await expect(links.first().getByText(WRONG)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Link 1 address')).toHaveValue('https://investopedia.com/');
  await page.getByLabel('Link 1 name').fill('Investopedia');
  await page.getByRole('button', { name: 'Remove Investopedia' }).click();
  await expect(page.getByText('Link removed.')).toBeVisible();
  await expect(links).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(links).toHaveCount(1);
  await expect(page.getByLabel('Link 1 name')).toHaveValue('Investopedia');
});

test('six links is the most, and the link from elsewhere lands on the right part', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/', { links: [{ id: 'l1', name: 'Gizmo', url: 'https://gizmo.ai/' }] });
  await page.goto('/settings#links');
  await expect(page.locator('#new-link-name')).toBeFocused();
  // a lone link has nowhere to move, so the buttons say so rather than doing nothing
  await expect(page.getByRole('button', { name: 'Move Gizmo up' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Move Gizmo down' })).toBeDisabled();
  const six = Array.from({ length: 6 }, (_, i) => ({ id: `l${i}`, name: `Site ${i}`, url: `https://site${i}.org/` }));
  await openWith(page, '/settings', { links: six });
  await expect(page.locator('[data-links-settings] li')).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Add link' })).toHaveCount(0);
  await expect(page.locator('[data-links-settings]')).toContainText('Six is the most.');
});

test('Settings fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // the link's name is 24 characters, the longest that is kept
  await openWith(page, '/settings', { links: [{ id: 'l1', name: 'A link with a long name.', url: 'https://www.investopedia.com/terms/a/a-very-long-address-indeed.asp' }] });
  expect(await sideways(page)).toBe(0);
  for (const name of ['Move Study up', 'Move Study down', 'Remove Study', 'Add area', 'Remove A link with a long name.', 'Add link']) {
    const box = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
    expect(box.height, name).toBeGreaterThanOrEqual(44);
    expect(box.width, name).toBeGreaterThanOrEqual(44);
  }
});

// Links on screen

const TWO = { links: [{ id: 'l1', name: 'Gizmo', url: 'https://gizmo.ai/' }, { id: 'l2', name: 'Investopedia', url: 'https://investopedia.com/' }] };
const rail = (page: Page) => page.locator('[data-links="rail"]');
const foot = (page: Page) => page.locator('[data-links="home"]');

test('links sit in the rail on a wide screen, on every page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWith(page, '/study', TWO);
  const link = rail(page).getByRole('link', { name: 'Gizmo, opens in a new tab' });
  await expect(link).toHaveAttribute('href', 'https://gizmo.ai/');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
  await expect(rail(page).getByRole('link', { name: /opens in a new tab/ })).toHaveCount(2);
  // on Home the rail has them, so the foot of the page does not
  await page.goto('/');
  await expect(rail(page)).toBeVisible();
  await expect(foot(page)).toBeHidden();
  // the label is the way to change them
  await rail(page).getByRole('link', { name: 'Links' }).click();
  await expect(page).toHaveURL(/\/settings#links$/);
  await expect(page.locator('#new-link-name')).toBeFocused();
});

for (const width of [390, 768]) {
  test(`links sit at the foot of Home at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openWith(page, '/', TWO);
    await expect(rail(page)).toBeHidden();
    await expect(foot(page).getByRole('heading', { name: 'Links' })).toBeVisible();
    await expect(foot(page).getByRole('link', { name: 'Investopedia, opens in a new tab' })).toHaveAttribute('href', 'https://investopedia.com/');
    // it comes after everything else on the page
    for (const title of ['day-title', 'week-title', 'coming-title', 'next-title']) {
      const above = (await page.locator(`section[aria-labelledby="${title}"]`).boundingBox())!;
      expect((await foot(page).boundingBox())!.y, title).toBeGreaterThanOrEqual(above.y + above.height - 1);
    }
    for (const name of ['Gizmo, opens in a new tab', 'Investopedia, opens in a new tab']) expect((await foot(page).getByRole('link', { name }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await sideways(page)).toBe(0);
    await foot(page).getByRole('link', { name: 'Add a link' }).click();
    await expect(page).toHaveURL(/\/settings#links$/);
    await expect(page.locator('#new-link-name')).toBeFocused();
  });
}

for (const [width, height] of [[1366, 657], [1280, 720], [1440, 520]] as const) {
  test(`a short window keeps Search and Settings in sight at ${width} by ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const six = Array.from({ length: 6 }, (_, i) => ({ id: `l${i}`, name: `Site ${i}`, url: `https://site${i}.org/` }));
    await openWith(page, '/', { links: six });
    const nav = page.getByRole('navigation', { name: 'Main' }).first(), settings = nav.getByRole('link', { name: 'Settings' });
    // without scrolling anything: the foot of the rail stays put, and the places and links scroll above it
    await expect(settings).toBeInViewport({ ratio: 1 });
    await expect(nav.getByRole('button', { name: /Search/ })).toBeInViewport({ ratio: 1 });
    const last = rail(page).getByRole('link', { name: 'Site 5, opens in a new tab' });
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ ratio: 1 });
    await expect(settings).toBeInViewport({ ratio: 1 });
    await settings.click();
    await expect(page).toHaveURL(/\/settings$/);
  });
}

test('a name or a goal that is one long word wraps, and does not push the page sideways', async ({ page }) => {
  for (const width of [375, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await openWith(page, '/', { settings: { name: 'W'.repeat(30) }, boat: { boundFor: 'x'.repeat(60) } });
    await expect(page.locator('[data-greeting]')).toBeVisible();
    expect(await sideways(page), `Home at ${width}`).toBe(0);
    await page.goto('/voyage');
    await expect(page.locator('[data-bound]')).toBeVisible();
    expect(await sideways(page), `the voyage at ${width}`).toBe(0);
  }
});

test('search finds a link, and offers to add one', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // nothing leaves the machine: the outside site is answered here
  await page.context().route('https://investopedia.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' }));
  await openWith(page, '/', TWO);
  await page.keyboard.press('Control+k');
  const menu = page.getByRole('dialog', { name: 'Search and commands' });
  await menu.getByRole('textbox').fill('invest');
  const found = menu.getByRole('button', { name: /Investopedia/ });
  await expect(found).toContainText('Link');
  const [opened] = await Promise.all([page.context().waitForEvent('page'), found.click()]);
  await opened.waitForURL('https://investopedia.com/');
  // the new tab cannot reach back into Compass
  expect(await opened.evaluate(() => window.opener)).toBeNull();
  await opened.close();
  await page.keyboard.press('Control+k');
  await menu.getByRole('textbox').fill('add a link');
  await menu.getByRole('button', { name: 'Add a link' }).click();
  await expect(page).toHaveURL(/\/settings#links$/);
  await expect(page.locator('#new-link-name')).toBeFocused();
});

// The whole piece

const EVERYTHING = {
  settings: { name: 'Aditya' },
  boat: { boundFor: GOAL },
  links: Array.from({ length: 6 }, (_, i) => ({ id: `l${i}`, name: i ? `Site number ${i}` : 'A link with a long name.', url: `https://site${i}.org/a/long/path/to/a/page.html` })),
  levels: { [week]: { bio: 'high', eco: 'high', eng: 'high', mat: 'high', chi: 'medium' }, [addDaysISO(week, 7)]: { eng: 'high', mat: 'medium' } },
};

for (const width of [375, 390, 768, 1024, 1440]) {
  test(`with everything set, nothing is wider than the screen at ${width} px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await openWith(page, '/', EVERYTHING);
    for (const path of ['/', '/review', '/study', '/settings', '/voyage']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await sideways(page), path).toBe(0);
    }
    expect(errors).toEqual([]);
  });
}

test('the review fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWith(page, '/review', { levels: { [addDaysISO(week, 7)]: { eng: 'high' } } });
  expect(await sideways(page)).toBe(0);
  for (const name of ['High', 'Medium', 'Normal']) expect((await level(page, 'English', name).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect((await page.locator('li[data-rating="area-study"]').boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

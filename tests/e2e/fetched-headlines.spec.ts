import { expect, type Page, type Request, test } from '@playwright/test';
import { addDaysISO, dayMonth, todayISO, toISO } from '../../src/domain/dates';
import { FEED_URL } from '../../src/domain/feeds';
import { openWith, saved, sideways } from './support';

/**
 * Fetched headlines. The list is never asked of the real network here: each test hands the page the list it should
 * get, or refuses it. Times are set from this device's own calendar, so no test depends on the hour it runs at.
 */

const wide = (page: Page) => page.setViewportSize({ width: 1440, height: 900 });
const TODAY = todayISO(), HOUR = 3_600_000;
/** A time on a day of this device's calendar, counted from today. Noon unless an hour is given. */
const at = (offset: number, hour = 12) => { const d = addDaysISO(TODAY, offset); return new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)), hour).toISOString(); };
const item = (n: number, title: string, offset: number, source: 'conversation' | 'rba' = 'conversation', hour = 12) => ({ title, url: `https://${source === 'rba' ? 'www.rba.gov.au' : 'theconversation.com'}/f-${n}`, source, at: at(offset, hour) });
const list = (items: object[], checked = new Date().toISOString()) => ({ format: 1, checked, items });
const mine = (id: string, title: string, offset: number, over: object = {}) => ({ id, title, url: `https://example.org/${id}`, source: 'Example Times', date: addDaysISO(TODAY, offset), tag: '', ...over });
const watchlist = (...lines: string[]) => ({ id: 'watch', title: 'Watchlist', kind: 'checklist', items: lines.map((text, n) => ({ id: `w${n}`, text, done: false })), text: '', createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z' });
const ON = { settings: { headlines: true } };

/** Hand the page this list whenever it asks, and write down each asking. A number is answered as that status; null refuses the connection. */
async function serve(page: Page, body: object | string | number | null) {
  const asked: Request[] = [];
  await page.context().route(FEED_URL, async (route) => {
    asked.push(route.request());
    if (body === null) return route.abort('internetdisconnected');
    if (typeof body === 'number') return route.fulfill({ status: body, headers: { 'access-control-allow-origin': '*' }, body: 'no' });
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  });
  return asked;
}
/** Every request the page makes that is not to Compass itself. */
function outside(page: Page) {
  const seen: string[] = [];
  page.on('request', (r) => { if (/^https?:/.test(r.url()) && !r.url().startsWith('http://localhost')) seen.push(r.url()); });
  return seen;
}

const home = (page: Page) => page.locator('[data-home-headlines]');
const homeRows = (page: Page) => home(page).locator('li');
const sheet = (page: Page) => page.locator('section[data-headlines]');
const fetched = (page: Page) => page.locator('section[data-fetched]');
const fetchedRows = (page: Page) => fetched(page).locator('li[data-fetched-row]');
const savedRows = (page: Page) => sheet(page).locator('li[data-headline]');
const toggle = (page: Page) => page.locator('#fetch-headlines');

// The switch, and what leaves the device

test('with the switch off, which is how Compass starts, nothing is asked of anywhere', async ({ page }) => {
  await wide(page);
  const asked = await serve(page, list([item(1, 'Never shown', 0)])), elsewhere = outside(page);
  await openWith(page, '/', { headlines: [mine('s1', 'Saved by hand', -1)] });
  await expect(home(page)).toContainText('Saved by you');
  await expect(home(page)).toContainText('Example Times, yesterday');
  await expect(home(page).locator('[data-saved-by-you]')).toHaveCount(0);
  await page.goto('/pages/headlines');
  await expect(sheet(page)).toContainText('Compass fetches nothing');
  await expect(fetched(page)).toHaveCount(0);
  await page.goto('/settings');
  await expect(toggle(page)).not.toBeChecked();
  await page.goto('/voyage');
  await expect(page.locator('main')).toBeVisible();
  expect(asked).toHaveLength(0);
  expect(elsewhere).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('compass:fetched'))).toBeNull();
});

test('the Headlines page says that headlines can be fetched, and leads to the switch', async ({ page }) => {
  await wide(page);
  await serve(page, list([item(1, 'Rates on hold again', 0)]));
  await openWith(page, '/pages/headlines', {});
  await page.locator('[data-fetch-offer]').getByRole('link', { name: 'Switch it on in Settings' }).click();
  await expect(page).toHaveURL(/\/settings#headlines$/);
  await expect(toggle(page)).toBeFocused();
  await expect(page.getByText('Nothing about you is sent.')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(toggle(page)).toBeChecked();
  await page.goto('/pages/headlines');
  await expect(fetchedRows(page)).toHaveCount(1);
  await expect(page.locator('[data-fetch-offer]')).toHaveCount(0);
});

test('switching it on asks for the list once: a plain download that carries nothing about the student', async ({ page }) => {
  await wide(page);
  const asked = await serve(page, list([item(1, 'Rates on hold again', 0)])), elsewhere = outside(page);
  // a cookie for the list's own site, as a student signed in to GitHub would have: it must not go with the request
  await page.context().addCookies([{ name: 'user_session', value: 'a-signed-in-student', domain: 'raw.githubusercontent.com', path: '/', secure: true, sameSite: 'None' }]);
  await openWith(page, '/settings', { settings: { name: 'Sam' }, headlines: [mine('s1', 'A private note to self', -1)], pages: [watchlist('Telstra')] });
  await toggle(page).check();
  await expect.poll(() => asked.length).toBe(1);
  const request = asked[0]!, headers = await request.allHeaders();
  expect(request.method()).toBe('GET');
  expect(request.url()).toBe(FEED_URL);
  expect(new URL(request.url()).search).toBe('');
  expect(request.postData()).toBeNull();
  expect(headers.cookie).toBeUndefined();
  expect(headers.referer).toBeUndefined();
  expect(headers.authorization).toBeUndefined();
  expect(JSON.stringify(headers)).not.toMatch(/Sam|Telstra|private note|signed-in/);
  // going from place to place, and opening Compass again, does not ask again inside half an hour
  await expect.poll(() => page.evaluate(() => localStorage.getItem('compass:fetched'))).toContain('Rates on hold');
  await page.goto('/');
  await expect(homeRows(page)).toHaveCount(2);
  await page.goto('/pages/headlines');
  await expect(fetchedRows(page)).toHaveCount(1);
  await page.reload();
  await expect(fetchedRows(page)).toHaveCount(1);
  expect(asked).toHaveLength(1);
  expect(elsewhere).toEqual([FEED_URL]);
});

test('the fetched list is kept apart from what is saved: not in the save, and not found by search', async ({ page }) => {
  await wide(page);
  await serve(page, list([item(1, 'Quokka exports reach a record', 0)]));
  await openWith(page, '/', ON);
  await expect(home(page)).toContainText('Quokka exports reach a record');
  expect(JSON.stringify(await saved(page))).not.toContain('Quokka');
  expect(await page.evaluate(() => localStorage.getItem('compass:fetched'))).toContain('Quokka');
  const box = page.getByPlaceholder('Search or jump to');
  await expect(async () => { await page.keyboard.press('Control+k'); await expect(box).toBeFocused({ timeout: 500 }); }).toPass();
  await box.fill('Quokka');
  await expect(page.getByRole('dialog', { name: 'Search and commands' })).toContainText('Quokka');
  await expect(page.locator('button[data-found]')).toHaveCount(0);
});

test('switching it off forgets the list at once, and the pages are as they were', async ({ page }) => {
  await wide(page);
  await serve(page, list([item(1, 'Rates on hold again', 0)]));
  await openWith(page, '/settings', { ...ON, headlines: [mine('s1', 'Saved by hand', -3)] });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('compass:fetched'))).toContain('Rates on hold');
  await toggle(page).uncheck();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('compass:fetched'))).toBeNull();
  await page.goto('/');
  await expect(homeRows(page)).toHaveCount(1);
  await expect(home(page)).toContainText('Saved by you');
  await expect(home(page)).not.toContainText('Rates on hold');
});

test('an answer that arrives after the switch went off is thrown away', async ({ page }) => {
  await wide(page);
  let let_go: () => void = () => {};
  const held = new Promise<void>((resolve) => { let_go = resolve; });
  await page.context().route(FEED_URL, async (route) => {
    await held;
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(list([item(1, 'Too late', 0)])) });
  });
  await openWith(page, '/settings', {});
  const sent = page.waitForRequest(FEED_URL);
  await toggle(page).check();
  await sent;
  await toggle(page).uncheck();
  const answered = page.waitForResponse(FEED_URL);
  let_go();
  await answered;
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => localStorage.getItem('compass:fetched'))).toBeNull();
  await page.goto('/pages/headlines');
  await expect(fetched(page)).toHaveCount(0);
  await expect(sheet(page)).not.toContainText('Too late');
});

test('restoring a backup that had the switch on does not turn it on here, and asks for nothing', async ({ page }) => {
  await wide(page);
  const asked = await serve(page, list([item(1, 'Never asked for', 0)]));
  await openWith(page, '/settings', {});
  const theirs = { ...(await saved(page)), headlines: [mine('s1', 'From the other device', -1)] };
  theirs.settings = { ...theirs.settings, headlines: true };
  await page.locator('[data-backup] input[type="file"]').setInputFiles({ name: 'compass-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app: 'compass', format: 1, savedAt: new Date().toISOString(), data: theirs })) });
  await page.locator('[data-backup]').getByRole('button', { name: 'Replace everything with this backup' }).click();
  await expect(page.getByText('Backup restored.')).toBeVisible();
  await expect(toggle(page)).not.toBeChecked();
  await page.goto('/');
  await expect(home(page)).toContainText('From the other device');
  await expect(home(page)).toContainText('Saved by you');
  expect(asked).toHaveLength(0);
  expect((await saved(page)).settings.headlines).toBeFalsy();
});

test('"Clear everything" keeps the switch as it is, and the fetched list with it', async ({ page }) => {
  await wide(page);
  await serve(page, list([item(1, 'Still fetched', 0)]));
  await openWith(page, '/settings', { ...ON, headlines: [mine('s1', 'Saved by hand', -1)] });
  await page.getByRole('button', { name: 'Clear everything' }).click();
  await page.getByRole('button', { name: 'Yes, clear everything' }).click();
  await expect(page.getByText('Everything cleared.')).toBeVisible();
  await expect(toggle(page)).toBeChecked();
  await page.goto('/');
  await expect(homeRows(page)).toHaveCount(1);
  await expect(home(page)).toContainText('Still fetched');
});

test('the list is asked for again when the tab is looked at, once half an hour has passed', async ({ page }) => {
  await wide(page);
  const asked = await serve(page, list([item(1, 'Rates on hold again', 0)]));
  await page.clock.install();
  await openWith(page, '/', ON);
  await expect(homeRows(page)).toHaveCount(1);
  expect(asked).toHaveLength(1);
  const look = () => page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.fastForward('29:00');
  await look();
  await page.waitForTimeout(200);
  expect(asked).toHaveLength(1);
  await page.clock.fastForward('02:00');
  await look();
  await expect.poll(() => asked.length).toBe(2);
});

// Home: one list of three

test('Home shows three from saved and fetched together, newest first, and each row says where it is from', async ({ page }) => {
  await wide(page);
  await serve(page, list([item(1, 'Fetched this morning', 0, 'conversation', 8), item(2, 'A release from the bank', -1, 'rba'), item(3, 'Fetched last week', -6)], new Date(Date.now() - 3 * HOUR - 300_000).toISOString()));
  await openWith(page, '/', { ...ON, headlines: [mine('s1', 'Saved today', 0), mine('s2', 'Saved long ago', -20)] });
  await expect(homeRows(page)).toHaveCount(3);
  await expect(homeRows(page).nth(0)).toContainText('Saved today');
  await expect(homeRows(page).nth(0)).toContainText('Example Times, today');
  await expect(homeRows(page).nth(0).locator('[data-saved-by-you]')).toHaveText('Saved by you');
  await expect(homeRows(page).nth(1)).toContainText('Fetched this morning');
  await expect(homeRows(page).nth(1)).toContainText('The Conversation, today');
  await expect(homeRows(page).nth(1).locator('[data-saved-by-you]')).toHaveCount(0);
  await expect(homeRows(page).nth(2)).toContainText('A release from the bank');
  await expect(homeRows(page).nth(2)).toContainText('Reserve Bank of Australia, yesterday');
  await expect(home(page).locator('[data-headlines-updated]')).toHaveText('Updated 3 hours ago');
  const link = homeRows(page).nth(1).getByRole('link');
  await expect(link).toHaveAttribute('href', 'https://theconversation.com/f-1');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
  await expect(link).toHaveAccessibleName('Fetched this morning, opens in a new tab');
  await home(page).getByRole('link', { name: 'All headlines' }).click();
  await expect(page).toHaveURL(/\/pages\/headlines$/);
});

test('headlines that name a line of the Watchlist come first, and show which line', async ({ page }) => {
  await wide(page);
  await serve(page, list([item(1, 'Nothing watched, and newest', 0), item(2, 'Westpac’s new hazard reports', -2), item(3, 'Why IT spending is up', -3), item(4, 'Is it time to buy?', -1), item(5, 'BHP, a fortnight ago', -14)]));
  await openWith(page, '/', { ...ON, pages: [watchlist('Westpac, WBC', 'IT', 'BHP')] });
  await expect(homeRows(page)).toHaveCount(3);
  await expect(homeRows(page).nth(0)).toContainText('Westpac’s new hazard reports');
  await expect(homeRows(page).nth(0).locator('[data-headline-mark]')).toHaveText('Westpac');
  await expect(homeRows(page).nth(1)).toContainText('Why IT spending is up');
  await expect(homeRows(page).nth(1).locator('[data-headline-mark]')).toHaveText('IT');
  // "it" is not IT, and a watched headline older than a week takes its place by its day
  await expect(homeRows(page).nth(2)).toContainText('Nothing watched, and newest');
  await expect(homeRows(page).nth(2).locator('[data-headline-mark]')).toHaveCount(0);
  await page.goto('/pages/headlines');
  await expect(fetched(page).locator('[data-watching]')).toContainText('Watching for Westpac, WBC, IT, BHP');
  await expect(fetchedRows(page).first()).toContainText('Nothing watched, and newest');
});

test('a Watchlist page with no lines yet is told apart from having none', async ({ page }) => {
  await wide(page);
  await serve(page, list([item(1, 'A headline', 0)]));
  await openWith(page, '/pages/headlines', { ...ON, pages: [watchlist()] });
  await expect(fetched(page).locator('[data-watching]')).toHaveText('Your Watchlist page has no lines yet. Add a name to it as headlines write it, Commonwealth Bank and not CBA, and headlines that name it come first on Home.');
});

test('a fetched headline that was also saved by hand shows once, as the saved one', async ({ page }) => {
  await wide(page);
  const one = item(1, 'Kept by hand', -1);
  await serve(page, list([one, item(2, 'Another', -2)]));
  await openWith(page, '/', { ...ON, headlines: [mine('s1', 'Kept by hand', -1, { url: one.url, source: 'The Conversation' })] });
  await expect(homeRows(page)).toHaveCount(2);
  await expect(homeRows(page).filter({ hasText: 'Kept by hand' })).toHaveCount(1);
  await expect(homeRows(page).filter({ hasText: 'Kept by hand' }).locator('[data-saved-by-you]')).toBeVisible();
});

// The Headlines page

test('the page lists every fetched headline, newest first, then the saved ones, and credits the publishers', async ({ page }) => {
  await wide(page);
  await serve(page, list([item(2, 'Older', -5), item(1, 'Newest', 0, 'conversation', 9), item(3, 'A release', -2, 'rba')]));
  await openWith(page, '/pages/headlines', { ...ON, headlines: [mine('s1', 'Saved by hand', -1)] });
  await expect(fetched(page).getByRole('heading', { name: 'Fetched' })).toBeVisible();
  await expect(fetchedRows(page)).toHaveCount(3);
  await expect(fetchedRows(page).nth(0)).toContainText('Newest');
  await expect(fetchedRows(page).nth(1)).toContainText('A release');
  await expect(fetchedRows(page).nth(1)).toContainText(`Reserve Bank of Australia, ${dayMonth(addDaysISO(TODAY, -2))}`);
  await expect(fetchedRows(page).nth(2)).toContainText('Older');
  await expect(fetched(page).locator('[data-headlines-updated]')).toHaveText('Updated in the last hour');
  await expect(fetched(page).locator('[data-credits]')).toHaveText('From The Conversation (Creative Commons) and the Reserve Bank of Australia (CC BY 4.0). Each opens on its publisher\'s site. It is the same list for everyone, and nothing about you is sent.');
  await expect(fetched(page).locator('[data-watching]')).toContainText('Make a page called Watchlist');
  await expect(sheet(page).getByRole('heading', { name: 'Saved by you' })).toBeVisible();
  await expect(savedRows(page)).toHaveCount(1);
  await expect(savedRows(page).first().getByRole('button', { name: 'Edit Saved by hand' })).toBeVisible();
  await expect(sheet(page)).not.toContainText('Compass fetches nothing');
  // a fetched row is not one that can be changed
  await expect(fetchedRows(page).first().getByRole('button', { name: /^Edit/ })).toHaveCount(0);
});

test('the page shows the newest eight fetched headlines, and the rest when asked, so the saved ones are never far down', async ({ page }) => {
  await wide(page);
  await serve(page, list(Array.from({ length: 12 }, (_, n) => item(n, `Fetched ${n}`, -n))));
  await openWith(page, '/pages/headlines', { ...ON, headlines: [mine('s1', 'Saved by hand', -1)] });
  await expect(fetchedRows(page)).toHaveCount(8);
  await expect(fetchedRows(page).last()).toContainText('Fetched 7');
  const more = fetched(page).locator('[data-fetched-more]');
  await expect(more).toHaveText('Show all 12');
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await more.press('Enter');
  await expect(fetchedRows(page)).toHaveCount(12);
  await expect(more).toHaveText('Show fewer');
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  await expect(more).toBeFocused();
  await more.click();
  await expect(fetchedRows(page)).toHaveCount(8);
  // with eight or fewer there is nothing more to show
  await fetchedRows(page).first().locator('[data-keep]').click();
  await fetchedRows(page).first().locator('[data-keep]').click();
  await fetchedRows(page).first().locator('[data-keep]').click();
  await fetchedRows(page).first().locator('[data-keep]').click();
  await expect(fetchedRows(page)).toHaveCount(8);
  await expect(more).toHaveCount(0);
});

test('Keep saves a fetched headline by hand, with the line it names as its tag, and Undo takes it back', async ({ page }) => {
  await wide(page);
  await serve(page, list([item(1, 'BHP lifts its dividend', -1), item(2, 'Another', -2)]));
  await openWith(page, '/pages/headlines', { ...ON, pages: [watchlist('BHP')] });
  await fetchedRows(page).first().getByRole('button', { name: 'Keep BHP lifts its dividend' }).click();
  await expect(page.getByText('Headline saved.')).toBeVisible();
  await expect(fetchedRows(page)).toHaveCount(1);
  await expect(savedRows(page)).toHaveCount(1);
  await expect(savedRows(page).first()).toContainText('The Conversation, yesterday');
  expect((await saved(page)).headlines).toEqual([expect.objectContaining({ title: 'BHP lifts its dividend', url: 'https://theconversation.com/f-1', source: 'The Conversation', date: addDaysISO(TODAY, -1), tag: 'BHP' })]);
  // it stays when the list no longer holds it
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(savedRows(page)).toHaveCount(0);
  await expect(fetchedRows(page)).toHaveCount(2);
  expect((await saved(page)).headlines).toEqual([]);
});

test('with sixty saved, Keep says that sixty is the most and saves nothing', async ({ page }) => {
  await wide(page);
  await serve(page, list([item(1, 'One more', 0)]));
  await openWith(page, '/pages/headlines', { ...ON, headlines: Array.from({ length: 60 }, (_, n) => mine(`s${n}`, `Saved ${n}`, -n)) });
  await fetchedRows(page).first().getByRole('button', { name: 'Keep One more' }).click();
  await expect(page.getByText('60 headlines are saved, which is the most.')).toBeVisible();
  await expect(fetchedRows(page)).toHaveCount(1);
  expect((await saved(page)).headlines).toHaveLength(60);
});

test('by keyboard alone a headline is kept, and the keyboard stays in the list', async ({ page }) => {
  await wide(page);
  await serve(page, list([item(1, 'First', 0, 'conversation', 10), item(2, 'Second', -1), item(3, 'Third', -2)]));
  await openWith(page, '/pages/headlines', ON);
  await fetchedRows(page).nth(1).getByRole('button', { name: 'Keep Second' }).focus();
  await page.keyboard.press('Enter');
  await expect(fetchedRows(page)).toHaveCount(2);
  await expect(fetchedRows(page).nth(1).getByRole('button', { name: 'Keep Third' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(fetchedRows(page).nth(0).getByRole('button', { name: 'Keep First' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(fetchedRows(page)).toHaveCount(0);
  await expect(fetched(page).getByRole('heading', { name: 'Fetched' })).toBeFocused();
  await expect(fetched(page).locator('[data-fetched-said]')).toHaveText('You have saved every headline in the list.');
  await expect(savedRows(page)).toHaveCount(3);
});

// When the list is old, empty or cannot be read

test('a list that is days old says when it was last updated', async ({ page }) => {
  await wide(page);
  const then = new Date(Date.now() - 3 * 24 * HOUR);
  await serve(page, list([item(1, 'Still here', -4)], then.toISOString()));
  await openWith(page, '/', ON);
  await expect(home(page).locator('[data-headlines-updated]')).toHaveText(`Last updated ${dayMonth(toISO(then))}`);
  await expect(homeRows(page)).toHaveCount(1);
  await page.goto('/pages/headlines');
  await expect(fetched(page).locator('[data-fetched-said]')).toHaveText('The list has not been updated for a while.');
  await expect(fetchedRows(page)).toHaveCount(1);
});

for (const [name, answer] of [['the connection is refused', null], ['the list is not found', 404], ['the answer is not a list', '<html>Sorry</html>'], ['the list is of a format this Compass does not know', { format: 2, checked: new Date().toISOString(), items: [] }]] as const) {
  test(`when ${name} and nothing is held, Home and the page say that the list could not be reached`, async ({ page }) => {
    await wide(page);
    await serve(page, answer);
    await openWith(page, '/', { ...ON, headlines: [mine('s1', 'Saved by hand', -1)] });
    await expect(home(page).locator('[data-headlines-updated]')).toHaveText('Could not be fetched');
    await expect(homeRows(page)).toHaveCount(1);
    await page.goto('/pages/headlines');
    await expect(fetched(page).locator('[data-fetched-said]')).toHaveText('Compass could not reach the list just now. Your saved headlines are below.');
    await expect(fetchedRows(page)).toHaveCount(0);
    await expect(savedRows(page)).toHaveCount(1);
  });
}

test('with nothing saved and no list to be had, Home still says why there are no headlines', async ({ page }) => {
  await wide(page);
  await serve(page, null);
  await openWith(page, '/', ON);
  await expect(home(page)).toContainText('Compass could not reach the list of headlines just now.');
  await expect(homeRows(page)).toHaveCount(0);
});

test('when the list cannot be read, the one held from before is still shown, with its age', async ({ page }) => {
  await wide(page);
  const asked = await serve(page, null), checked = new Date(Date.now() - 5 * HOUR - 300_000).toISOString();
  await openWith(page, '/', {});
  // what the last visit left: a list, asked for two hours ago
  await page.evaluate(([held, on]) => {
    localStorage.setItem('compass:fetched', held!);
    const kept = JSON.parse(localStorage.getItem('compass:v1')!);
    kept.state.settings = { ...kept.state.settings, ...JSON.parse(on!) };
    localStorage.setItem('compass:v1', JSON.stringify(kept));
  }, [JSON.stringify({ list: list([item(1, 'Held from before', -1)], checked), askedAt: Date.now() - 2 * HOUR }), JSON.stringify(ON.settings)]);
  await page.reload();
  await expect(homeRows(page)).toHaveCount(1);
  await expect(home(page)).toContainText('Held from before');
  await expect(home(page).locator('[data-headlines-updated]')).toHaveText('Updated 5 hours ago');
  expect(asked.length).toBeGreaterThan(0);
  await page.goto('/pages/headlines');
  await expect(fetched(page).locator('[data-fetched-said]')).toHaveText('Compass could not reach the list just now.');
  await expect(fetchedRows(page)).toHaveCount(1);
});

test('an empty list says so on the page, and Home shows nothing about it', async ({ page }) => {
  await wide(page);
  await serve(page, list([]));
  await openWith(page, '/pages/headlines', ON);
  await expect(fetched(page).locator('[data-fetched-said]')).toHaveText('No headlines in the list just now.');
  await page.goto('/');
  await expect(page.locator('#day-title')).toBeVisible();
  await expect(home(page)).toHaveCount(0);
});

// A list that is not what it should be

test('a hostile list can open nothing but a publisher’s own site, and never stops Compass opening', async ({ page }) => {
  await wide(page);
  let dialogs = 0;
  page.on('dialog', (d) => { dialogs++; void d.dismiss(); });
  const good = item(1, 'A real headline', 0), when = good.at;
  const hostile = [
    { title: 'Script address', url: 'javascript:alert(1)', source: 'conversation', at: when },
    { title: 'Elsewhere', url: 'https://evil.example/x', source: 'conversation', at: when },
    { title: 'Look-alike', url: 'https://theconversation.com.evil.example/x', source: 'conversation', at: when },
    { title: 'Not secure', url: 'http://theconversation.com/x', source: 'conversation', at: when },
    { title: 'Wrong site for its source', url: 'https://www.rba.gov.au/x', source: 'conversation', at: when },
    { title: 'From nobody', url: 'https://theconversation.com/n', source: 'nobody', at: when },
    { title: 'Switched off', url: 'https://www.theguardian.com/business/1', source: 'guardian', at: when },
    { title: 'x'.repeat(141), url: 'https://theconversation.com/long', source: 'conversation', at: when },
    { title: '', url: 'https://theconversation.com/empty', source: 'conversation', at: when },
    { title: 'No time', url: 'https://theconversation.com/t', source: 'conversation', at: 'never' },
    { title: 7, url: 8, source: 9, at: 10 }, null, 'words', [[]],
    { title: '<img src=x onerror=alert(1)><script>alert(2)</script>', url: 'https://theconversation.com/markup', source: 'conversation', at: when },
    good,
    ...Array.from({ length: 500 }, (_, n) => item(100 + n, `Filler ${n}`, -1)),
    ...Array.from({ length: 500 }, (_, n) => item(1000 + n, `Release ${n}`, -2, 'rba')),
  ];
  await serve(page, list(hostile));
  await openWith(page, '/pages/headlines', ON);
  // twenty of each source at most, however many the list holds
  await fetched(page).locator('[data-fetched-more]').click();
  await expect(fetchedRows(page)).toHaveCount(40);
  await expect(fetchedRows(page).filter({ hasText: 'A real headline' })).toHaveCount(1);
  // markup in a title is shown as the words it is, and is never made into anything
  await expect(fetchedRows(page).filter({ hasText: '<img src=x onerror=alert(1)>' })).toHaveCount(1);
  await expect(fetched(page).locator('img, script')).toHaveCount(0);
  const hrefs = await fetched(page).locator('li a').evaluateAll((links) => links.map((a) => new URL((a as HTMLAnchorElement).href).host));
  expect(new Set(hrefs)).toEqual(new Set(['theconversation.com', 'www.rba.gov.au']));
  for (const gone of ['Script address', 'Elsewhere', 'Look-alike', 'Not secure', 'Wrong site', 'From nobody', 'Switched off', 'No time']) await expect(fetched(page)).not.toContainText(gone);
  await page.goto('/');
  await expect(homeRows(page)).toHaveCount(3);
  expect(dialogs).toBe(0);
});

for (const [name, body] of [
  ['a headline dated ten thousand years before any calendar', () => list([{ ...item(1, 'From no time at all', 0), at: '-010000-01-01T00:00:00Z' }, item(2, 'An honest headline', 0)])],
  ['a list that says it was checked then', () => list([item(2, 'An honest headline', 0)], '-010000-01-01T00:00:00Z')],
  ['a headline from long before the list could hold it', () => list([{ ...item(1, 'From no time at all', 0), at: '1999-01-01T00:00:00Z' }, item(2, 'An honest headline', 0)])],
] as const) {
  test(`${name} never stops Home or the Headlines page`, async ({ page }) => {
    await wide(page);
    await serve(page, body());
    await openWith(page, '/', { ...ON, headlines: [mine('s1', 'Saved by hand', -1)] });
    await expect(page.locator('#day-title')).toBeVisible();
    await expect(page.getByText('This page could not be shown')).toHaveCount(0);
    await expect(home(page)).toContainText('Saved by hand');
    await expect(home(page)).not.toContainText('From no time at all');
    await page.goto('/pages/headlines');
    await expect(sheet(page).getByRole('heading', { name: 'Headlines' })).toBeVisible();
    await expect(page.getByText('This page could not be shown')).toHaveCount(0);
    await expect(sheet(page)).not.toContainText('From no time at all');
    // and the same thing planted on the device does no more
    await page.evaluate((held) => localStorage.setItem('compass:fetched', held), JSON.stringify({ list: body(), askedAt: Date.now(), failed: false }));
    await page.reload();
    await expect(sheet(page).getByRole('heading', { name: 'Headlines' })).toBeVisible();
    await expect(page.getByText('This page could not be shown')).toHaveCount(0);
  });
}

test('Compass opens in a browser that will not let its storage be looked at', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Access is denied for this document.', 'SecurityError'); } }); });
  await page.goto('/');
  await expect(page.locator('#day-title')).toBeVisible();
  await page.goto('/settings');
  await expect(page.getByText('This browser is not letting Compass save')).toBeVisible();
  await expect(toggle(page)).not.toBeChecked();
});

test('what is held on the device is checked again when Compass opens', async ({ page }) => {
  await wide(page);
  await serve(page, null);
  await openWith(page, '/', {});
  await page.evaluate(([held, on]) => {
    localStorage.setItem('compass:fetched', held!);
    const kept = JSON.parse(localStorage.getItem('compass:v1')!);
    kept.state.settings = { ...kept.state.settings, ...JSON.parse(on!) };
    localStorage.setItem('compass:v1', JSON.stringify(kept));
  }, [JSON.stringify({ list: list([{ title: 'Planted', url: 'https://evil.example/x', source: 'conversation', at: at(0) }, item(1, 'Honest', 0)]), askedAt: Date.now() }), JSON.stringify(ON.settings)]);
  await page.reload();
  await expect(homeRows(page)).toHaveCount(1);
  await expect(home(page)).toContainText('Honest');
  await expect(home(page)).not.toContainText('Planted');
  // and something that is not a list at all is no list
  await page.evaluate(() => localStorage.setItem('compass:fetched', '{"list":"<script>alert(1)</script>","askedAt":"soon"}'));
  await page.reload();
  await expect(page.locator('#day-title')).toBeVisible();
  await expect(homeRows(page)).toHaveCount(0);
});

// Two tabs, and small screens

test('a second tab takes up the switch, and its list, when the first turns it on', async ({ page }) => {
  await wide(page);
  await serve(page, list([item(1, 'Seen in both tabs', 0)]));
  await openWith(page, '/settings', {});
  const second = await page.context().newPage();
  await second.setViewportSize({ width: 1440, height: 900 });
  await second.goto('/pages/headlines');
  await expect(second.locator('section[data-fetched]')).toHaveCount(0);
  await toggle(page).check();
  await expect(second.locator('section[data-fetched] li[data-fetched-row]')).toHaveCount(1);
  await toggle(page).uncheck();
  await expect(second.locator('section[data-fetched]')).toHaveCount(0);
  await second.close();
});

for (const width of [390, 320]) {
  test(`at ${width} px, long headlines and long watch words wrap and nothing scrolls sideways`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const long = `Pneumonoultramicroscopicsilicovolcanoconiosis${'x'.repeat(60)} and a headline that runs on`;
    // forty capitals with nowhere to break: the longest a watch word can be
    const word = 'COMMONWEALTHBANKOFAUSTRALIAHOLDINGSGROUP';
    await serve(page, list([item(1, long, 0), item(2, `${word} reports`, -1), item(3, 'Short', -2, 'rba')]));
    await openWith(page, '/', { ...ON, pages: [watchlist(word, 'Short')], headlines: [mine('s1', 'Saved', -1, { source: 'S'.repeat(40) })] });
    await expect(homeRows(page)).toHaveCount(3);
    expect(await sideways(page)).toBe(0);
    await page.goto('/pages/headlines');
    await expect(fetchedRows(page)).toHaveCount(3);
    expect(await sideways(page)).toBe(0);
    // a thumb can press Keep, and the link to the article
    for (const control of [fetchedRows(page).first().locator('[data-keep]'), fetchedRows(page).first().getByRole('link')]) expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.goto('/settings');
    await expect(toggle(page)).toBeVisible();
    expect(await sideways(page)).toBe(0);
  });
}

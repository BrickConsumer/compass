import { expect, type Page, test } from '@playwright/test';
import { addDaysISO, dayMonth, todayISO } from '../../src/domain/dates';
import { openWith, saved, sideways } from './support';

const wide = (page: Page) => page.setViewportSize({ width: 1440, height: 900 });
const phone = (page: Page) => page.setViewportSize({ width: 390, height: 844 });
const nav = (page: Page) => page.getByRole('navigation', { name: 'My pages' });
const interestRow = (page: Page, name: string) => page.locator('[data-interests] li[data-interest]', { hasText: name });
const within = (page: Page) => page.locator('[data-interest-open]');
const starters = (page: Page) => page.locator('[data-starters] button[data-form]');
const rows = (page: Page) => nav(page).locator('a[data-page]');
const pageEditor = (page: Page) => page.getByRole('dialog', { name: 'Edit page' });

/** Add an interest from one of the three starting points, with a name of its own if one is given. It opens once added. */
async function addInterest(page: Page, from: 'Investing' | 'Law' | 'Something else', name?: string) {
  await page.locator('[data-add-interest]').click();
  const editor = page.getByRole('dialog', { name: 'Add an interest' });
  await editor.getByRole('button', { name: from, exact: true }).click();
  if (name) await editor.getByLabel('Name').fill(name);
  await editor.getByRole('button', { name: 'Add interest' }).click();
  await expect(editor).toBeHidden();
  await expect(within(page)).toBeVisible();
}
/** Start a page from a form that has no title of its own, and name it. */
async function startNamed(page: Page, form: string, title: string) {
  await page.locator(`button[data-form="${form}"]`).click();
  await expect(pageEditor(page)).toBeVisible();
  await pageEditor(page).getByLabel('Title').fill(title);
  await page.keyboard.press('Escape');
  await expect(pageEditor(page)).toBeHidden();
  await expect(page.locator('#page-title')).toHaveText(title);
}

// Interests in My pages

test('My pages gains one part for interests, and the sample is as it was', async ({ page }) => {
  await wide(page);
  await openWith(page, '/pages', {});
  await expect(page.locator('[data-interests]')).toContainText('Interests');
  await expect(page.locator('[data-interests] li[data-interest]')).toHaveCount(0);
  await expect(page.locator('[data-headlines-row]')).toContainText('None saved');
  await expect(page.locator('[data-add-interest]')).toBeVisible();
  await expect(rows(page)).toHaveCount(5);
  await expect(page.locator('#page-title')).toHaveText('A B in Mathematics');
  await expect(page.locator('[data-fields]')).toHaveCount(0);
  await page.goto('/');
  await expect(page.locator('#day-title')).toBeVisible();
  await expect(page.locator('[data-home-headlines]')).toHaveCount(0);
});

test('an interest is added from Investing, and offers what it starts with', async ({ page }) => {
  await wide(page);
  await openWith(page, '/pages', {});
  // "Something else" needs a name of its own; the two that come with forms bring theirs
  await page.locator('[data-add-interest]').click();
  const editor = page.getByRole('dialog', { name: 'Add an interest' });
  await expect(editor.getByRole('button', { name: 'Add interest' })).toBeDisabled();
  await editor.getByRole('button', { name: 'Investing', exact: true }).click();
  await expect(editor).toContainText('Companies, a journal and a learning route');
  await editor.getByRole('button', { name: 'Add interest' }).click();
  await expect(within(page).getByRole('heading', { name: 'Investing' })).toBeVisible();
  await expect(within(page)).toContainText('Nothing kept in Investing yet.');
  await expect(starters(page)).toHaveText(['Company', 'Journal entry', 'Learning route', 'Watchlist', 'Books', 'Note', 'Checklist', 'Reading']);
  await within(page).getByRole('button', { name: 'All pages' }).click();
  await expect(interestRow(page, 'Investing')).toContainText('No pages');
  await expect(rows(page)).toHaveCount(5);
  expect((await saved(page)).interests).toHaveLength(1);
});

test('a Company page opens with its eight parts, and keeps what is written in them', async ({ page }) => {
  await wide(page);
  await openWith(page, '/pages', {});
  await addInterest(page, 'Investing');
  await startNamed(page, 'company', 'Example Carriers');
  const parts = page.locator('[data-fields] [data-field]');
  await expect(parts).toHaveCount(8);
  await expect(parts.first()).toContainText('Ticker and industry');
  await expect(page.locator('[data-page-facts]')).toContainText('Company, Investing');
  await page.getByLabel('Risks').fill('One customer is half of sales.');
  await page.getByLabel('Confidence, out of 10').fill('6, until the next report');
  await page.reload();
  await expect(page.getByLabel('Risks')).toHaveValue('One customer is half of sales.');
  await expect(page.getByLabel('Confidence, out of 10')).toHaveValue('6, until the next report');
  // in the list its line is the first part that has something in it
  await expect(rows(page).first()).toContainText('One customer is half of sales.');
  const kept = (await saved(page)).pages.at(-1);
  expect([kept.form, kept.kind, kept.fields.length, kept.interestId]).toEqual(['company', 'note', 8, (await saved(page)).interests[0].id]);
});

test('a titled starter goes once it is used, and a form stays', async ({ page }) => {
  await wide(page);
  await openWith(page, '/pages', {});
  await addInterest(page, 'Investing');
  await page.locator('button[data-form="route"]').click();
  await expect(page.locator('#page-title')).toHaveText('Learning route');
  await expect(page.locator('[data-page-list] li')).toHaveCount(5);
  await expect(page.locator('[data-page-list] li').first()).toContainText('Market basics, order types, diversification and risk');
  await expect(starters(page)).toHaveText(['Company', 'Journal entry', 'Watchlist', 'Books', 'Note', 'Checklist', 'Reading']);
  await startNamed(page, 'company', 'First company');
  await startNamed(page, 'company', 'Second company');
  // the list is the interest's own: the route and the two companies, and none of the sample's pages
  await expect(rows(page)).toHaveCount(3);
  await expect(page.locator('button[data-form="company"]')).toBeVisible();
});

test('a page is put in an interest and taken out, in its editor', async ({ page }) => {
  await wide(page);
  await openWith(page, '/pages', {});
  await addInterest(page, 'Something else', 'Chess');
  await expect(starters(page)).toHaveText(['Note', 'Checklist', 'Reading']);
  await within(page).getByRole('button', { name: 'All pages' }).click();
  await page.locator('a[data-page="pg-trip"]').click();
  await expect(page.locator('#page-title')).toHaveText('Biology field trip');
  await page.locator('[data-edit-page]').click();
  await pageEditor(page).getByRole('group', { name: 'Interest' }).getByRole('button', { name: 'Chess' }).click();
  await page.keyboard.press('Escape');
  await expect(pageEditor(page)).toBeHidden();
  await expect(page.locator('[data-page-facts]')).toContainText('Chess');
  await expect(interestRow(page, 'Chess')).toContainText('1 page');
  await page.locator('[data-edit-page]').click();
  await pageEditor(page).getByRole('group', { name: 'Interest' }).getByRole('button', { name: 'None' }).click();
  await page.keyboard.press('Escape');
  await expect(interestRow(page, 'Chess')).toContainText('No pages');
});

test('an interest is renamed and deleted with Undo, and its pages are kept', async ({ page }) => {
  await wide(page);
  await openWith(page, '/pages', {});
  await addInterest(page, 'Law');
  await startNamed(page, 'case', 'The lighthouse case');
  await expect(page.locator('[data-fields] [data-field]')).toHaveText(['Court', 'Facts', 'Decision', 'Why it matters', 'My thoughts'].map((l) => new RegExp(`^${l}`)));
  await page.locator('[data-edit-interest]').click();
  const editor = page.getByRole('dialog', { name: 'Edit interest' });
  await editor.getByLabel('Name').fill('Mooting');
  await page.keyboard.press('Escape');
  await expect(editor).toBeHidden();
  await expect(within(page).getByRole('heading', { name: 'Mooting' })).toBeVisible();
  await page.locator('[data-edit-interest]').click();
  await editor.getByRole('button', { name: 'Delete interest' }).click();
  await expect(page.getByText('Mooting deleted. Its pages are kept.')).toBeVisible();
  // back among all the pages, where the case still is, in no interest
  await expect(within(page)).toHaveCount(0);
  await expect(page.locator('[data-interests] li[data-interest]')).toHaveCount(0);
  await expect(rows(page).filter({ hasText: 'The lighthouse case' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(interestRow(page, 'Mooting')).toContainText('1 page');
});

test("a page's source link opens in a new tab, and refuses what is not a web address", async ({ page }) => {
  await wide(page);
  await openWith(page, '/pages/pg-trip', {});
  await page.locator('[data-edit-page]').click();
  const box = pageEditor(page).getByLabel('Source link');
  await box.fill('example.org/trip');
  await box.press('Enter');
  const link = page.locator('a[data-page-link]');
  await expect(link).toHaveAttribute('href', 'https://example.org/trip');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
  await expect(link).toHaveAccessibleName('Source for Biology field trip, opens in a new tab');
  await box.fill('javascript:alert(1)');
  await box.press('Enter');
  await expect(pageEditor(page)).toContainText('That does not look like a web address.');
  await expect(link).toHaveAttribute('href', 'https://example.org/trip');
  await box.fill('');
  await box.press('Enter');
  await expect(link).toHaveCount(0);
});

test('on a phone an interest opens in the list, and nothing scrolls sideways', async ({ page }) => {
  await phone(page);
  await openWith(page, '/pages', {});
  await addInterest(page, 'Law', 'Law and where it could lead me');
  await expect(within(page)).toBeVisible();
  expect(await sideways(page)).toBe(0);
  await page.locator('button[data-form="affairs"]').click();
  await expect(pageEditor(page)).toBeVisible();
  await pageEditor(page).getByLabel('Title').fill('A ruling in the news');
  await pageEditor(page).getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('[data-fields] [data-field]')).toHaveCount(3);
  expect(await sideways(page)).toBe(0);
});

// Headlines

const TODAY = todayISO(), day = (offset: number) => addDaysISO(TODAY, offset);
const headline = (id: string, title: string, offset: number, over: object = {}) => ({ id, title, url: `https://example.org/${id}`, source: 'Example Times', date: day(offset), tag: '', ...over });
const sheet = (page: Page) => page.locator('section[data-headlines]');
const headlineRows = (page: Page) => sheet(page).locator('li[data-headline]');
const homeHeadlines = (page: Page) => page.locator('[data-home-headlines]');
const headlineEditor = (page: Page, name: 'Save a headline' | 'Edit headline') => page.getByRole('dialog', { name });

test('a headline is saved with its source taken from its site, and shows on its page and on Home', async ({ page }) => {
  await wide(page);
  await openWith(page, '/pages/headlines', {});
  await expect(sheet(page).getByRole('heading', { name: 'Headlines' })).toBeVisible();
  await expect(sheet(page)).toContainText('Saved by you');
  await expect(sheet(page)).toContainText('None saved yet.');
  await page.locator('[data-add-headline]').click();
  const editor = headlineEditor(page, 'Save a headline'), save = editor.getByRole('button', { name: 'Save headline' });
  await expect(save).toBeDisabled();
  await editor.getByLabel('Headline').fill('Lender lifts half-year profit as margins hold');
  await expect(save).toBeDisabled();
  await editor.getByLabel('Address').fill('example.org/news/1');
  await editor.getByLabel('Address').press('Tab');
  await editor.getByLabel('Tag').fill('ABC');
  await save.click();
  await expect(editor).toBeHidden();
  const link = headlineRows(page).first().getByRole('link');
  await expect(link).toHaveAccessibleName('Lender lifts half-year profit as margins hold, opens in a new tab');
  await expect(link).toHaveAttribute('href', 'https://example.org/news/1');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
  await expect(headlineRows(page).first()).toContainText('ABC');
  await expect(headlineRows(page).first()).toContainText(`example.org, ${dayMonth(TODAY)}`);
  await expect(page.locator('[data-headlines-row]')).toContainText('1 saved');
  await page.goto('/');
  await expect(homeHeadlines(page)).toContainText('Headlines');
  await expect(homeHeadlines(page)).toContainText('Saved by you');
  await expect(homeHeadlines(page).getByRole('link', { name: /Lender lifts/ })).toHaveAttribute('href', 'https://example.org/news/1');
  await expect(homeHeadlines(page).getByRole('link', { name: 'All headlines' })).toHaveCount(0);
});

test('a headline needs a web address, and anything else is refused', async ({ page }) => {
  await wide(page);
  await openWith(page, '/pages/headlines', {});
  await page.locator('[data-add-headline]').click();
  const editor = headlineEditor(page, 'Save a headline');
  await editor.getByLabel('Headline').fill('A headline');
  await editor.getByLabel('Address').fill('javascript:alert(1)');
  await editor.getByLabel('Address').press('Tab');
  await expect(editor).toContainText('That does not look like a web address.');
  await expect(editor.getByRole('button', { name: 'Save headline' })).toBeDisabled();
  expect((await saved(page)).headlines).toEqual([]);
});

test('a headline is changed and deleted with Undo', async ({ page }) => {
  await wide(page);
  await openWith(page, '/pages/headlines', { headlines: [headline('h1', 'Miner cuts guidance after a wet quarter', -1, { tag: 'XYZ' })] });
  await headlineRows(page).first().getByRole('button', { name: /^Edit/ }).click();
  const editor = headlineEditor(page, 'Edit headline');
  await editor.getByLabel('Headline').fill('Miner cuts guidance again');
  await editor.getByLabel('Source').fill('Sample Wire');
  await page.keyboard.press('Escape');
  await expect(editor).toBeHidden();
  await expect(headlineRows(page).first()).toContainText('Miner cuts guidance again');
  await expect(headlineRows(page).first()).toContainText(`Sample Wire, ${dayMonth(day(-1))}`);
  await headlineRows(page).first().getByRole('button', { name: /^Edit/ }).click();
  await editor.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Headline deleted.')).toBeVisible();
  await expect(headlineRows(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(headlineRows(page)).toHaveCount(1);
});

test('Home shows the newest three, and "All headlines" when there are more', async ({ page }) => {
  await wide(page);
  const four = [headline('h1', 'Oldest', -9), headline('h2', 'Newest', 0), headline('h3', 'Second', -2), headline('h4', 'Third', -5)];
  await openWith(page, '/', { headlines: four });
  await expect(homeHeadlines(page).locator('li[data-headline]')).toHaveText([/Newest/, /Second/, /Third/]);
  // it sits under "Any time this week"
  const week = (await page.locator('section[aria-labelledby="week-title"]').boundingBox())!, box = (await homeHeadlines(page).boundingBox())!;
  expect(box.y).toBeGreaterThan(week.y + week.height - 1);
  await homeHeadlines(page).getByRole('link', { name: 'All headlines' }).click();
  await expect(page).toHaveURL(/\/pages\/headlines$/);
  await expect(headlineRows(page)).toHaveText([/Newest/, /Second/, /Third/, /Oldest/]);
  await phone(page);
  await page.goto('/');
  await expect(homeHeadlines(page)).toBeVisible();
  expect(await sideways(page)).toBe(0);
});

test('search offers "Save a headline", which opens its editor', async ({ page }) => {
  await wide(page);
  await openWith(page, '/', {});
  await expect(async () => { await page.keyboard.press('Control+k'); await expect(page.getByPlaceholder('Search or jump to')).toBeFocused({ timeout: 500 }); }).toPass();
  await page.getByPlaceholder('Search or jump to').fill('headline');
  await expect(page.getByRole('dialog', { name: 'Search and commands' }).getByRole('button')).toHaveText(['Save a headline']);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/pages\/headlines$/);
  await expect(headlineEditor(page, 'Save a headline')).toBeVisible();
});

test('nothing is asked of any other site', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (r) => asked.push(r.url()));
  await wide(page);
  await openWith(page, '/', { headlines: [headline('h1', 'A headline', 0), headline('h2', 'Another', -1)] });
  await expect(homeHeadlines(page)).toBeVisible();
  await page.goto('/pages/headlines');
  await expect(headlineRows(page)).toHaveCount(2);
  const elsewhere = asked.filter((url) => !url.startsWith('http://localhost:') && !url.startsWith('data:') && !url.startsWith('blob:'));
  expect(elsewhere).toEqual([]);
});

// The whole piece: every part at its longest, a thumb's reach, and the keyboard

const LONG = 'Pneumonoultramicroscopicsilicovolcanoconiosis'.repeat(4);
const NOW = `${TODAY}T08:00:00.000Z`;
const FULL = {
  interests: Array.from({ length: 8 }, (_, i) => ({ id: `in-${i}`, name: i === 0 ? LONG.slice(0, 30) : `Interest number ${i}`, forms: i === 0 ? 'investing' : 'none' })),
  pages: [
    { id: 'p-form', title: 'W'.repeat(80), kind: 'note', items: [], text: LONG, interestId: 'in-0', form: 'company', link: 'https://example.org/a-very-long-address-that-goes-on',
      fields: ['Ticker and industry', 'Business model', 'Revenue and profit, with the period and the source', 'Competitive advantage', 'Risks', 'Valuation', 'Would I buy, and why', 'Confidence, out of 10'].map((label, i) => ({ id: `f${i}`, label, text: `${LONG} and then some more words to fill the part.` })),
      createdAt: NOW, updatedAt: NOW },
    { id: 'p-list', title: 'Watchlist', kind: 'checklist', items: [{ id: 'i1', text: LONG.slice(0, 140), done: false }], text: '', interestId: 'in-0', createdAt: NOW, updatedAt: NOW },
  ],
  headlines: Array.from({ length: 60 }, (_, i) => ({ id: `h${i}`, title: i % 2 ? LONG.slice(0, 140) : `Headline number ${i} with a good many ordinary words in it to wrap`, url: 'https://example.org/x', source: i % 2 ? 'S'.repeat(40) : 'Example Times', date: day(-i), tag: i % 3 ? 'ABCDEFGH' : '' })),
};

for (const width of [320, 375, 390, 768, 1024, 1440]) {
  test(`with interests and headlines at their longest, nothing is wider than the screen at ${width} px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await openWith(page, '/pages', FULL);
    await expect(page.locator('[data-interests] li[data-interest]')).toHaveCount(8);
    // eight is the most, so there is no row to add a ninth
    await expect(page.locator('[data-add-interest]')).toHaveCount(0);
    expect(await sideways(page), 'the list').toBe(0);
    await page.locator('[data-interests] li[data-interest]').first().getByRole('button').click();
    await expect(within(page)).toBeVisible();
    await expect(starters(page).first()).toBeVisible();
    expect(await sideways(page), 'an interest').toBe(0);
    await page.goto('/pages/p-form');
    await expect(page.locator('[data-fields] [data-field]')).toHaveCount(8);
    expect(await sideways(page), 'a form').toBe(0);
    await page.goto('/pages/headlines');
    await expect(headlineRows(page)).toHaveCount(60);
    // sixty is the most, so there is no row to save another
    await expect(page.locator('[data-add-headline]')).toHaveCount(0);
    expect(await sideways(page), 'the headlines').toBe(0);
    if (width >= 375) {
      // Home is measured from 375 px, as its own tests measure it: at 320 px its heading is wider than the screen with nothing saved at all
      await page.goto('/');
      await expect(homeHeadlines(page).locator('li[data-headline]')).toHaveCount(3);
      expect(await sideways(page), 'Home').toBe(0);
    }
    expect(errors).toEqual([]);
  });
}

test('on a phone, every new button, link and box is tall enough for a thumb', async ({ page }) => {
  await phone(page);
  const tall = async (controls: ReturnType<Page['locator']>, atLeast: number) => {
    const shown = controls.filter({ visible: true });
    expect(await shown.count()).toBeGreaterThan(atLeast);
    for (const control of await shown.all()) {
      const box = (await control.boundingBox())!;
      expect(box.height, await control.evaluate((el) => `${el.tagName} ${el.getAttribute('aria-label') ?? el.textContent}`)).toBeGreaterThanOrEqual(44);
    }
  };
  await openWith(page, '/pages', { ...FULL, interests: FULL.interests.slice(0, 3), headlines: FULL.headlines.slice(0, 5) });
  await tall(page.locator('[data-interests]').locator('button, a'), 4);
  await page.locator('[data-interests] li[data-interest]').first().getByRole('button').click();
  await expect(within(page)).toBeVisible();
  await tall(nav(page).locator('button, a'), 8);
  await page.goto('/pages/p-form');
  await expect(page.locator('[data-fields]')).toBeVisible();
  await tall(page.locator('section[aria-labelledby="page-title"]').locator('button, a, textarea'), 9);
  await page.goto('/pages/headlines');
  await expect(headlineRows(page)).toHaveCount(5);
  await tall(sheet(page).locator('button, a'), 10);
  await page.goto('/');
  await expect(homeHeadlines(page)).toBeVisible();
  await tall(homeHeadlines(page).locator('button, a'), 3);
});

test('an interest and a form are made by keyboard alone', async ({ page }) => {
  await wide(page);
  await openWith(page, '/pages', {});
  await page.locator('[data-add-interest]').focus();
  await page.keyboard.press('Enter');
  const editor = page.getByRole('dialog', { name: 'Add an interest' });
  await expect(editor.getByLabel('Name')).toBeFocused();
  await editor.getByRole('button', { name: 'Law', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(editor.getByRole('button', { name: 'Law', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await editor.getByRole('button', { name: 'Add interest' }).focus();
  await page.keyboard.press('Enter');
  // the editor shuts out the page until it has gone, so nothing behind it can take the keyboard before then
  await expect(editor).toBeHidden();
  await expect(within(page).getByRole('heading', { name: 'Law' })).toBeVisible();
  await page.locator('button[data-form="case"]').focus();
  await page.keyboard.press('Enter');
  // a new page opens its editor with its title ready to type
  await expect(pageEditor(page).getByLabel('Title')).toBeFocused();
  await page.keyboard.type('A case by keyboard');
  await page.keyboard.press('Escape');
  await expect(page.locator('#page-title')).toHaveText('A case by keyboard');
  await expect(pageEditor(page)).toBeHidden();
  await expect(page.locator('[data-field="Court"]')).toHaveCount(1);
  const court = page.locator('[data-field="Court"] textarea');
  await court.focus();
  await page.keyboard.type('The High Court');
  await expect(court).toHaveValue('The High Court');
});

// Found by the review of the whole change

const openSearch = async (page: Page) => {
  await expect(async () => { await page.keyboard.press('Control+k'); await expect(page.getByPlaceholder('Search or jump to')).toBeFocused({ timeout: 500 }); }).toPass();
};

test('opening an interest, leaving it, adding one and deleting one each leave the keyboard somewhere', async ({ page }) => {
  await wide(page);
  await openWith(page, '/pages', { interests: [{ id: 'in-a', name: 'Chess', forms: 'none' }] });
  await interestRow(page, 'Chess').getByRole('button').focus();
  await page.keyboard.press('Enter');
  // the list has changed to the interest's own, and its name says so
  await expect(within(page).getByRole('heading', { name: 'Chess' })).toBeFocused();
  await within(page).getByRole('button', { name: 'All pages' }).focus();
  await page.keyboard.press('Enter');
  await expect(interestRow(page, 'Chess').getByRole('button')).toBeFocused();
  // adding one opens it, with the keyboard on its name once the editor has gone
  await page.locator('[data-add-interest]').focus();
  await page.keyboard.press('Enter');
  const editor = page.getByRole('dialog', { name: 'Add an interest' });
  await expect(editor.getByLabel('Name')).toBeFocused();
  await page.keyboard.type('Rowing');
  await page.keyboard.press('Enter');
  await expect(editor).toBeHidden();
  await expect(within(page).getByRole('heading', { name: 'Rowing' })).toBeFocused();
  // and deleting it goes back to the list of interests
  await within(page).getByRole('button', { name: 'Edit Rowing' }).focus();
  await page.keyboard.press('Enter');
  const edit = page.getByRole('dialog', { name: 'Edit interest' });
  await edit.getByRole('button', { name: 'Delete interest' }).focus();
  await page.keyboard.press('Enter');
  await expect(edit).toBeHidden();
  await expect(page.locator('[data-interests]').getByRole('heading', { name: 'Interests' })).toBeFocused();
});

test('at sixty headlines, "Save a headline" in search says why it cannot', async ({ page }) => {
  await wide(page);
  await openWith(page, '/', { headlines: FULL.headlines });
  await openSearch(page);
  await page.getByPlaceholder('Search or jump to').fill('headline');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/pages\/headlines$/);
  await expect(page.getByText('60 headlines are saved, which is the most. Delete one to save another.')).toBeVisible();
  await expect(headlineRows(page)).toHaveCount(60);
  await expect(headlineEditor(page, 'Save a headline')).toBeHidden();
});

test('a double press starts one page and adds one interest', async ({ page }) => {
  await wide(page);
  await openWith(page, '/pages', { interests: [{ id: 'in-a', name: 'Investing', forms: 'investing' }] });
  await interestRow(page, 'Investing').getByRole('button').click();
  await expect(starters(page).first()).toBeVisible();
  // the Watchlist's button goes once it is used, and the next one moves into its place under the same finger
  const chipBox = (await page.locator('button[data-form="watchlist"]').boundingBox())!;
  await page.mouse.dblclick(chipBox.x + chipBox.width / 2, chipBox.y + chipBox.height / 2);
  await expect(page.locator('#page-title')).toHaveText('Watchlist');
  await expect(pageEditor(page)).toBeHidden();
  expect((await saved(page)).pages.filter((x: { interestId?: string }) => x.interestId === 'in-a').map((x: { title: string }) => x.title)).toEqual(['Watchlist']);
  // a form's button stays where it is, and two quick presses are still one page
  const company = (await page.locator('button[data-form="company"]').boundingBox())!;
  await page.mouse.dblclick(company.x + company.width / 2, company.y + company.height / 2);
  // the new page's row pushes the others down under the pointer: the second press opens none of them, and the new page stays open
  await expect(page.locator('#page-title')).toHaveText('Untitled');
  await expect(pageEditor(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(pageEditor(page)).toBeHidden();
  expect((await saved(page)).pages.filter((x: { interestId?: string }) => x.interestId === 'in-a')).toHaveLength(2);
  await within(page).getByRole('button', { name: 'All pages' }).click();
  await page.locator('[data-add-interest]').click();
  const editor = page.getByRole('dialog', { name: 'Add an interest' });
  await editor.getByRole('button', { name: 'Law', exact: true }).click();
  const add = (await editor.getByRole('button', { name: 'Add interest' }).boundingBox())!;
  await page.mouse.dblclick(add.x + add.width / 2, add.y + add.height / 2);
  await expect(editor).toBeHidden();
  expect((await saved(page)).interests.map((i: { name: string }) => i.name)).toEqual(['Investing', 'Law']);
});

test('Enter in the address saves a new headline that has its title', async ({ page }) => {
  await wide(page);
  await openWith(page, '/pages/headlines', {});
  await page.locator('[data-add-headline]').click();
  const editor = headlineEditor(page, 'Save a headline');
  await editor.getByLabel('Headline').fill('Port reopens after the storm');
  await editor.getByLabel('Address').fill('example.org/port');
  await editor.getByLabel('Address').press('Enter');
  await expect(editor).toBeHidden();
  await expect(headlineRows(page)).toHaveCount(1);
  await expect(headlineRows(page).first().getByRole('link')).toHaveAttribute('href', 'https://example.org/port');
  // an address that is not one is still refused, and nothing is saved
  await page.locator('[data-add-headline]').click();
  await editor.getByLabel('Headline').fill('Another');
  await editor.getByLabel('Address').fill('not an address');
  await editor.getByLabel('Address').press('Enter');
  await expect(editor).toContainText('That does not look like a web address.');
  await expect(headlineRows(page)).toHaveCount(1);
});

test('a long unbroken name wraps in an empty interest and in a page\'s editor', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await openWith(page, '/pages', { interests: [{ id: 'in-w', name: 'W'.repeat(30), forms: 'none' }] });
  await page.locator('[data-interests] li[data-interest]').getByRole('button').click();
  await expect(within(page)).toContainText('Nothing kept in');
  expect(await sideways(page), 'an empty interest').toBe(0);
  await page.goto('/pages/pg-trip');
  await page.locator('[data-edit-page]').click();
  await expect(pageEditor(page)).toBeVisible();
  await expect(pageEditor(page).getByRole('button', { name: 'W'.repeat(30) })).toBeVisible();
  expect(await pageEditor(page).evaluate((d) => { const panel = d.firstElementChild!; return panel.scrollWidth - panel.clientWidth; }), "a page's editor").toBe(0);
  // with the page in that interest, the way back from it carries the interest's name
  await pageEditor(page).getByRole('button', { name: 'W'.repeat(30) }).click();
  await pageEditor(page).getByRole('button', { name: 'Done' }).click();
  await expect(pageEditor(page)).toBeHidden();
  await page.goto('/pages');
  await page.locator('[data-interests] li[data-interest]').getByRole('button').click();
  await rows(page).first().click();
  await expect(page.getByRole('link', { name: 'W'.repeat(30) })).toBeVisible();
  expect(await sideways(page), 'the way back').toBe(0);
});

test('the list says where you are: the headlines row, the interest being edited, and a page whose interest is gone', async ({ page }) => {
  await wide(page);
  const sample = await (async () => { await openWith(page, '/pages', {}); return (await saved(page)).pages as { id: string }[]; })();
  await openWith(page, '/pages/headlines', { interests: [{ id: 'in-a', name: 'Chess', forms: 'none' }], pages: sample.map((x, i) => (i === 0 ? { ...x, interestId: 'in-gone' } : x)) });
  await expect(page.locator('[data-headlines-row]')).toHaveAttribute('aria-current', 'page');
  await page.goto(`/pages/${sample[0]!.id}`);
  await expect(page.locator('[data-headlines-row]')).not.toHaveAttribute('aria-current', 'page');
  // a page that names an interest that is not there is in none
  await page.locator('[data-edit-page]').click();
  await expect(pageEditor(page).getByRole('group', { name: 'Interest' }).getByRole('button', { name: 'None' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(pageEditor(page)).toBeHidden();
  await interestRow(page, 'Chess').getByRole('button').click();
  await expect(within(page).getByRole('button', { name: 'Edit Chess' })).toBeVisible();
});

test('choosing an interest opens one of its own pages, and on a phone the way back from a page names it', async ({ page }) => {
  await wide(page);
  await openWith(page, '/pages', {});
  await addInterest(page, 'Something else', 'Chess');
  await startNamed(page, 'note', 'Openings');
  await within(page).getByRole('button', { name: 'All pages' }).click();
  await rows(page).filter({ hasText: 'A B in Mathematics' }).click();
  await expect(page.locator('#page-title')).toHaveText('A B in Mathematics');
  // the page that was open is not one of the interest's, so the first that is opens in its place
  await interestRow(page, 'Chess').getByRole('button').click();
  await expect(page.locator('#page-title')).toHaveText('Openings');
  await expect(rows(page).filter({ hasText: 'Openings' })).toHaveAttribute('aria-current', 'page');
  await phone(page);
  await rows(page).filter({ hasText: 'Openings' }).click();
  await expect(page.locator('#page-title')).toBeVisible();
  // the list behind this page is the interest's, so that is what the way back says
  await page.getByRole('link', { name: 'Chess', exact: true }).click();
  await expect(within(page).getByRole('heading', { name: 'Chess' })).toBeVisible();
});

test('on a phone, everything in the two new editors is tall enough for a thumb', async ({ page }) => {
  await phone(page);
  await openWith(page, '/pages', { interests: [{ id: 'in-a', name: 'Chess', forms: 'investing' }], headlines: [headline('h1', 'A headline', 0, { tag: 'ABC' })] });
  const tall = async (dialog: ReturnType<Page['getByRole']>, atLeast: number) => {
    const shown = dialog.locator('button, a, input, textarea').filter({ visible: true });
    expect(await shown.count()).toBeGreaterThan(atLeast);
    for (const control of await shown.all()) {
      const box = (await control.boundingBox())!;
      // measured to the nearest pixel: a sheet that has just slid up can be a hair off a whole one
      expect(Math.round(box.height), await control.evaluate((el) => `${el.tagName} ${el.getAttribute('aria-label') ?? el.textContent}`)).toBeGreaterThanOrEqual(44);
    }
  };
  await page.locator('[data-add-interest]').click();
  await tall(page.getByRole('dialog', { name: 'Add an interest' }), 4);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Add an interest' })).toBeHidden();
  await interestRow(page, 'Chess').getByRole('button').click();
  await page.locator('[data-edit-interest]').click();
  await tall(page.getByRole('dialog', { name: 'Edit interest' }), 5);
  await page.goto('/pages/headlines');
  await page.locator('[data-add-headline]').click();
  await tall(headlineEditor(page, 'Save a headline'), 5);
  await page.keyboard.press('Escape');
  await expect(headlineEditor(page, 'Save a headline')).toBeHidden();
  await headlineRows(page).first().getByRole('button', { name: /^Edit/ }).click();
  await tall(headlineEditor(page, 'Edit headline'), 6);
});

test("nothing is asked of any other site by a page's source link or a form", async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (r) => asked.push(r.url()));
  await wide(page);
  await openWith(page, '/pages/p-form', { interests: FULL.interests, pages: FULL.pages });
  await expect(page.locator('a[data-page-link]')).toHaveAttribute('href', 'https://example.org/a-very-long-address-that-goes-on');
  await expect(page.locator('[data-fields] [data-field]')).toHaveCount(8);
  const elsewhere = asked.filter((url) => !url.startsWith('http://localhost:') && !url.startsWith('data:') && !url.startsWith('blob:'));
  expect(elsewhere).toEqual([]);
});

import { expect, type Page, test } from '@playwright/test';

async function open(page: Page, path = '/study') {
  await page.goto(path);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 }).or(page.getByRole('heading', { level: 2 })).first()).toBeVisible();
}

const sheet = (page: Page) => page.locator('section[aria-labelledby="subject-title"]');
const iso = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

test('Study lists the subjects and opens the first, with its assessments, tasks and notes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await expect(page.locator('[data-subject]')).toHaveCount(5);
  await expect(page.locator('[data-subject="bio"]')).toContainText('3 open tasks. Biology test in 4 days.');
  await expect(page.locator('[data-subject="bio"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#subject-title')).toHaveText('Biology');
  await expect(sheet(page).locator('li[data-assessment]')).toHaveCount(1);
  await expect(sheet(page).locator('li[data-task]')).toHaveCount(3);
  await expect(sheet(page).getByLabel('Notes', { exact: true })).toHaveValue(/Chapters 6 and 7/);

  await page.locator('[data-subject="eco"]').click();
  await expect(page).toHaveURL(/\/study\/eco$/);
  await expect(page.locator('#subject-title')).toHaveText('Economics');
  await expect(sheet(page).locator('li[data-task]').first().locator('[data-when]')).toBeVisible();
});

test('a task added on a subject\'s page is the same task on Home, and ticking it there counts here', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/study/chi');
  await sheet(page).getByLabel('Add a task for Chinese').fill('Learn the unit 6 characters');
  await page.keyboard.press('Enter');
  await expect(sheet(page).locator('li[data-task]')).toHaveCount(2);
  await expect(page.locator('[data-subject="chi"]')).toContainText('2 open tasks.');

  await page.goto('/');
  const row = page.locator('section[aria-labelledby="week-title"] li[data-task]', { hasText: 'Learn the unit 6 characters' });
  await expect(row).toContainText('Chinese');
  await row.getByRole('checkbox').check();
  await page.goto('/study/chi');
  await expect(sheet(page).locator('li[data-task]')).toHaveCount(1);
  await sheet(page).getByRole('button', { name: /done$/ }).click();
  await expect(sheet(page).locator('li[data-task]', { hasText: 'Learn the unit 6 characters' })).toBeVisible();
});

test('an assessment can be added, shows on Home, and can be changed and deleted with Undo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/study/chi');
  await expect(sheet(page)).toContainText('Nothing ahead for Chinese.');
  await sheet(page).getByRole('button', { name: 'Add an assessment' }).click();
  const editor = page.getByRole('dialog', { name: 'New assessment' });
  await editor.getByLabel('Title').fill('Chinese dictation');
  await editor.getByRole('button', { name: 'Presentation' }).click();
  await editor.getByLabel('Date').fill(iso(2));
  await editor.getByRole('button', { name: 'Add assessment' }).click();
  const row = sheet(page).locator('li[data-assessment]');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Chinese dictation');
  await expect(row).toContainText('Presentation, in 2 days');

  await page.goto('/');
  await expect(page.locator('section[aria-labelledby="coming-title"]')).toContainText('Chinese dictation');
  await page.goto('/study/chi');

  await row.locator('button').click();
  const edit = page.getByRole('dialog', { name: 'Edit assessment' });
  await edit.getByLabel('Title').fill('Chinese dictation, unit 6');
  await edit.getByRole('button', { name: 'Test', exact: true }).click();
  await expect(row).toContainText('Chinese dictation, unit 6');
  await expect(row).toContainText('Test, in 2 days');
  await edit.getByRole('button', { name: 'Delete' }).click();
  await expect(row).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(row).toHaveCount(1);
  await page.reload();
  await expect(sheet(page).locator('li[data-assessment]')).toContainText('Chinese dictation, unit 6');
});

test('a subject can be added, renamed, recoloured and deleted with Undo, and its tasks are kept', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await page.getByLabel('Add a subject').fill('  Physical   education ');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-subject]')).toHaveCount(6);
  await page.locator('[data-subject]', { hasText: 'Physical education' }).click();
  await expect(page.locator('#subject-title')).toHaveText('Physical education');
  await expect(sheet(page)).toContainText('Nothing open');

  await sheet(page).getByRole('button', { name: 'Edit subject' }).click();
  const editor = page.getByRole('dialog', { name: 'Edit subject' });
  await editor.getByLabel('Name').fill('PE');
  await editor.getByRole('button', { name: 'Clay' }).click();
  await expect(editor.getByRole('button', { name: 'Clay' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#subject-title')).toHaveText('PE');

  // deleting Biology keeps its tasks, without a subject
  await page.locator('[data-subject="bio"]').click();
  await sheet(page).getByRole('button', { name: 'Edit subject' }).click();
  await page.getByRole('dialog', { name: 'Edit subject' }).getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL(/\/study$/);
  await expect(page.locator('[data-subject="bio"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('[data-subject="bio"]')).toContainText('3 open tasks. Biology test in 4 days.');
});

test('notes are kept', async ({ page }) => {
  await open(page, '/study/mat');
  await sheet(page).getByLabel('Notes', { exact: true }).fill('Past papers are in the shared folder.');
  await page.reload();
  await expect(sheet(page).getByLabel('Notes', { exact: true })).toHaveValue('Past papers are in the shared folder.');
});

test('on a phone the list comes first, a subject opens on its own, and nothing scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await expect(page.locator('[data-subject]')).toHaveCount(5);
  await expect(sheet(page)).toBeHidden();
  await page.locator('[data-subject="eng"]').click();
  await expect(page.locator('#subject-title')).toHaveText('English');
  await expect(page.getByRole('navigation', { name: 'Subjects' })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await page.getByRole('link', { name: 'All subjects' }).click();
  await expect(page.locator('[data-subject]')).toHaveCount(5);
});

// sessions are set up on a weekday, so the tests use today's, whatever day they run on
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]!;
const LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]!;

test('a study session becomes an ordinary task on its day, marked as one that repeats', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/study/bio');
  await expect(sheet(page)).toContainText('None yet. A session repeats on the days you choose');
  await sheet(page).getByRole('button', { name: 'Add a session' }).click();
  const editor = page.getByRole('dialog', { name: 'New session' });
  await expect(editor.getByLabel('Name')).toHaveValue('Biology revision');
  // a session needs at least one day
  await editor.getByRole('button', { name: 'Add session' }).click();
  await expect(editor.getByRole('alert')).toHaveText('Choose at least one day.');
  await editor.getByLabel('Name').fill('Biology past papers');
  await editor.getByRole('button', { name: SHORT, exact: true }).click();
  await editor.getByRole('button', { name: 'Add session' }).click();
  const session = sheet(page).locator('li[data-session]');
  await expect(session).toContainText('Biology past papers');
  await expect(session).toContainText(`Every ${LONG}`);

  // today's task is made at once, and is on the subject's page
  const mine = sheet(page).locator('li[data-task]', { hasText: 'Biology past papers' });
  await expect(mine).toHaveCount(1);
  await expect(mine.locator('[data-repeats]')).toBeVisible();
  await expect(mine.locator('[data-when]')).toHaveText('Today');

  // and it is the same task on Home, counted like any other
  await page.goto('/');
  const count = page.locator('#day-title + p'), row = page.locator('section[aria-labelledby="day-title"] li[data-task]', { hasText: 'Biology past papers' });
  await expect(count).toHaveText('3 of 6 done');
  await expect(row.locator('[data-repeats]')).toBeVisible();
  await expect(row).toContainText('Biology');
  await row.getByRole('checkbox').check();
  await expect(count).toHaveText('4 of 6 done');

  // a day off: delete the task, and it is not made again
  await row.locator('button').first().focus();
  await page.keyboard.press('Delete');
  await expect(row).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#day-title')).toBeVisible();
  await expect(page.locator('section[aria-labelledby="day-title"] li[data-task]', { hasText: 'Biology past papers' })).toHaveCount(0);
  await expect(page.locator('#day-title + p')).toHaveText('3 of 5 done');
});

test('a session can be changed and ended; the tasks it made are left alone', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/study/eco');
  await sheet(page).getByRole('button', { name: 'Add a session' }).click();
  const fresh = page.getByRole('dialog', { name: 'New session' });
  await fresh.getByLabel('Name').fill('Economics essay practice');
  await fresh.getByRole('button', { name: SHORT, exact: true }).click();
  await fresh.getByRole('button', { name: 'Add session' }).click();
  const session = sheet(page).locator('li[data-session]'), task = sheet(page).locator('li[data-task]', { hasText: 'Economics essay practice' });
  await expect(task).toHaveCount(1);

  // renaming the session does not rename the task already made
  await session.locator('button').click();
  const editor = page.getByRole('dialog', { name: 'Edit session' });
  await editor.getByLabel('Name').fill('Economics reading');
  await expect(session).toContainText('Economics reading');
  await expect(task).toHaveCount(1);

  // ending it keeps the task, which no longer says it repeats; Undo brings the session back
  await editor.getByRole('button', { name: 'End session' }).click();
  await expect(session).toHaveCount(0);
  await expect(task).toHaveCount(1);
  await expect(task.locator('[data-repeats]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(session).toContainText('Economics reading');
  await expect(task.locator('[data-repeats]')).toBeVisible();
  await page.reload();
  await expect(sheet(page).locator('li[data-session]')).toContainText('Economics reading');
});

test('opening a task made from a session says where it came from', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/study/mat');
  await sheet(page).getByRole('button', { name: 'Add a session' }).click();
  const fresh = page.getByRole('dialog', { name: 'New session' });
  await fresh.getByRole('button', { name: 'Every day' }).click();
  await fresh.getByRole('button', { name: 'Add session' }).click();
  await expect(sheet(page).locator('li[data-session]')).toContainText('Every day');
  await sheet(page).locator('li[data-task]', { hasText: 'Mathematics revision' }).first().locator('button').first().click();
  await expect(page.getByRole('dialog', { name: 'Edit task' })).toContainText('This task comes from a study session.');
});

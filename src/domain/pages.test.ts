import { describe, expect, it } from 'vitest';
import { addItem, aimOf, editItem, insertItem, isReached, kindOf, listCount, moveItem, newPage, PAGE_KINDS, PAGE_LIMITS, pageLine, pagesAsText, removeItem, searchPages, sortPages, toggleItem, untickAll } from './pages';
import type { Page, PageItem, Subject } from './types';

const item = (id: string, done = false): PageItem => ({ id, text: id, done });
const page = (over: Partial<Page> = {}): Page => ({ id: 'p', title: 'A page', kind: 'checklist', items: [], text: '', createdAt: '2026-11-01T08:00:00.000Z', updatedAt: '2026-11-01T08:00:00.000Z', ...over });

describe('the five kinds of page', () => {
  it('are a note, a checklist, a goal, a reading page and a project page', () => {
    expect(PAGE_KINDS.map((k) => k.id)).toEqual(['note', 'checklist', 'goal', 'reading', 'project']);
  });

  it('differ only in what comes first and what the parts are called', () => {
    expect(kindOf('note').listFirst).toBe(false);
    expect(kindOf('goal')).toMatchObject({ list: 'Steps', add: 'Add a step', text: 'Why', listFirst: true, dated: true });
    expect(kindOf('checklist').dated).toBe(false);
    expect(kindOf('project').dated).toBe(true);
  });

  it('a new page is untitled and empty', () => {
    expect(newPage('goal', 'p1', '2026-11-17T09:00:00.000Z')).toEqual({ id: 'p1', title: 'Untitled', kind: 'goal', items: [], text: '', createdAt: '2026-11-17T09:00:00.000Z', updatedAt: '2026-11-17T09:00:00.000Z' });
  });
});

describe("a page's list", () => {
  const p = page({ items: [item('a', true), item('b'), item('c')] });

  it('adds an item at the end, trimmed, and ignores an empty one', () => {
    expect(addItem(p, '  Lunch   and water ', 'd').items.map((i) => i.text)).toEqual(['a', 'b', 'c', 'Lunch and water']);
    expect(addItem(p, '   ', 'd')).toBe(p);
    expect(addItem(p, 'x'.repeat(300), 'd').items[3]!.text).toHaveLength(PAGE_LIMITS.item);
  });

  it('holds no more than 200 items', () => {
    const full = page({ items: Array.from({ length: PAGE_LIMITS.items }, (_, i) => item(`i${i}`)) });
    expect(addItem(full, 'one more', 'z')).toBe(full);
  });

  it('ticks and unticks an item where it is, so the order holds', () => {
    const ticked = toggleItem(p, 'b');
    expect(ticked.items.map((i) => `${i.id}${i.done ? '!' : ''}`)).toEqual(['a!', 'b!', 'c']);
    expect(toggleItem(ticked, 'b').items[1]!.done).toBe(false);
  });

  it('counts what is done', () => {
    expect(listCount(p)).toEqual({ done: 1, total: 3 });
    expect(listCount(page())).toEqual({ done: 0, total: 0 });
  });

  it("changes an item's words, and keeps the old ones if the new are empty", () => {
    expect(editItem(p, 'b', ' Notebook ').items[1]!.text).toBe('Notebook');
    expect(editItem(p, 'b', '  ').items[1]!.text).toBe('b');
  });

  it('moves an item up or down, and not past either end', () => {
    expect(moveItem(p, 'c', -1).items.map((i) => i.id)).toEqual(['a', 'c', 'b']);
    expect(moveItem(p, 'a', 1).items.map((i) => i.id)).toEqual(['b', 'a', 'c']);
    expect(moveItem(p, 'a', -1)).toBe(p);
    expect(moveItem(p, 'c', 1)).toBe(p);
  });

  it('removes an item and can put it back where it was', () => {
    const { page: without, item: gone, index } = removeItem(p, 'b')!;
    expect(without.items.map((i) => i.id)).toEqual(['a', 'c']);
    expect(insertItem(without, gone, index).items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(removeItem(p, 'nope')).toBeNull();
  });

  it('unticks everything, so a list can be used again, and says what was ticked', () => {
    const { page: clear, ticked } = untickAll(page({ items: [item('a', true), item('b'), item('c', true)] }));
    expect(clear.items.every((i) => !i.done)).toBe(true);
    expect(ticked).toEqual(['a', 'c']);
  });
});

describe('a goal', () => {
  it('has a date to aim for, as a project does, and other kinds do not show one', () => {
    expect(aimOf(page({ kind: 'goal', aimFor: '2026-12-11' }))).toBe('2026-12-11');
    expect(aimOf(page({ kind: 'project', aimFor: '2026-11-27' }))).toBe('2026-11-27');
    expect(aimOf(page({ kind: 'checklist', aimFor: '2026-12-11' }))).toBeUndefined();
  });

  it('can be reached, and only a goal can', () => {
    expect(isReached(page({ kind: 'goal', reachedOn: '2026-11-17' }))).toBe(true);
    expect(isReached(page({ kind: 'goal' }))).toBe(false);
    expect(isReached(page({ kind: 'note', reachedOn: '2026-11-17' }))).toBe(false);
  });
});

describe('the list of pages', () => {
  it('says one thing about each page', () => {
    expect(pageLine(page({ kind: 'goal', items: [item('a', true), item('b'), item('c')], aimFor: '2026-12-11' }))).toBe('1 of 3 steps, aim for 11 Dec');
    expect(pageLine(page({ kind: 'goal', aimFor: '2026-12-11' }))).toBe('Aim for 11 Dec');
    expect(pageLine(page({ kind: 'checklist', items: [item('a', true), item('b')] }))).toBe('1 of 2');
    expect(pageLine(page({ kind: 'note', text: '  Open with the lighthouse scene,\nthen the letter. ' }))).toBe('Open with the lighthouse scene, then the letter.');
    expect(pageLine(page({ kind: 'reading', text: 'Notes only.' }))).toBe('Notes only.');
    expect(pageLine(page({ kind: 'goal', reachedOn: '2026-11-17', items: [item('a', true)] }))).toBe('Reached Tue 17 Nov');
  });

  it('says so when a page is empty, and keeps a long line short', () => {
    expect(pageLine(page({ kind: 'note' }))).toBe('Nothing written yet');
    expect(pageLine(page({ kind: 'checklist' }))).toBe('Nothing here yet');
    expect(pageLine(page({ kind: 'note', text: 'word '.repeat(60) })).length).toBeLessThanOrEqual(90);
  });

  it('puts the most recently changed first, and reached goals after the rest', () => {
    const pages = [
      page({ id: 'old', updatedAt: '2026-11-10T08:00:00.000Z' }),
      page({ id: 'won', kind: 'goal', reachedOn: '2026-11-16', updatedAt: '2026-11-17T12:00:00.000Z' }),
      page({ id: 'new', updatedAt: '2026-11-17T08:00:00.000Z' }),
      page({ id: 'won-earlier', kind: 'goal', reachedOn: '2026-11-02', updatedAt: '2026-11-17T13:00:00.000Z' }),
    ];
    const { open, reached } = sortPages(pages);
    expect(open.map((p) => p.id)).toEqual(['new', 'old']);
    expect(reached.map((p) => p.id)).toEqual(['won', 'won-earlier']);
  });

  it('is searched by title', () => {
    const pages = [page({ id: 'a', title: 'Biology field trip' }), page({ id: 'b', title: 'Reading for English' })];
    expect(searchPages(pages, ' FIELD ').map((p) => p.id)).toEqual(['a']);
    expect(searchPages(pages, '')).toEqual([]);
  });
});

describe('exporting pages', () => {
  const subjects: Subject[] = [{ id: 'mat', name: 'Mathematics', colour: 'marine' }];
  const text = pagesAsText([
    page({ id: 'g', title: 'A B in Mathematics', kind: 'goal', subjectId: 'mat', aimFor: '2026-12-11', items: [{ id: '1', text: 'Redo the last test', done: true }, { id: '2', text: 'One past paper each week', done: false }], text: 'I need it for Economics.', updatedAt: '2026-11-17T09:00:00.000Z' }),
    page({ id: 'n', title: 'Ideas', kind: 'note', text: 'Open with the lighthouse scene.', updatedAt: '2026-11-16T09:00:00.000Z' }),
  ], subjects, '2026-11-17');

  it('writes every page as plain text, with its list and its writing', () => {
    expect(text).toContain('My pages, from Compass. Tuesday 17 November');
    expect(text).toContain('A B in Mathematics\n==================\nGoal. Mathematics. Aim for Friday 11 December.');
    expect(text).toContain('Steps\n[x] Redo the last test\n[ ] One past paper each week');
    expect(text).toContain('Why\nI need it for Economics.');
    expect(text).toContain('Ideas\n=====\nNote.\n\nOpen with the lighthouse scene.');
  });

  it('leaves out the parts a page does not use', () => {
    expect(text.slice(text.indexOf('Ideas'))).not.toContain('List');
  });
});

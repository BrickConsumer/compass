import { describe, expect, it } from 'vitest';
import { newPage, STARTERS, startersFor, subjectPageLine, subjectPages } from './pages';
import type { Page } from './types';

const NOW = '2026-11-17T09:00:00.000Z';
const page = (over: Partial<Page> = {}): Page => ({ id: 'p', title: 'A page', kind: 'checklist', items: [], text: '', createdAt: '2026-11-01T08:00:00.000Z', updatedAt: '2026-11-01T08:00:00.000Z', ...over });

describe("a subject's pages", () => {
  it('offers the starters a subject has not used, and always a note', () => {
    expect(startersFor([], 'eng').map((s) => s.label)).toEqual(['Revision checklist', 'Weak areas', 'Formula sheet', 'Note']);
    expect(STARTERS.map((s) => s.id)).toEqual(['revision', 'weak', 'formula', 'note']);
    expect(STARTERS.map((s) => [s.kind, s.title])).toEqual([['checklist', 'Revision checklist'], ['checklist', 'Weak areas'], ['note', 'Formula sheet'], ['note', undefined]]);
    const used = [page({ title: 'revision CHECKLIST', subjectId: 'eng' }), page({ title: 'Weak areas', subjectId: 'mat' }), page({ title: 'Untitled', subjectId: 'eng' })];
    expect(startersFor(used, 'eng').map((s) => s.label)).toEqual(['Weak areas', 'Formula sheet', 'Note']);
    // every titled starter used: a note can still be started
    const all = ['Revision checklist', 'Weak areas', 'Formula sheet', 'Note'].map((title) => page({ title, subjectId: 'eng' }));
    expect(startersFor(all, 'eng').map((s) => s.id)).toEqual(['note']);
  });

  it('starts a page with a title and a subject', () => {
    expect(newPage('checklist', 'p1', NOW, { title: 'Revision checklist', subjectId: 'eng' })).toMatchObject({ kind: 'checklist', title: 'Revision checklist', subjectId: 'eng' });
    expect(newPage('note', 'p2', NOW)).toMatchObject({ title: 'Untitled' });
    expect(newPage('note', 'p2', NOW).subjectId).toBeUndefined();
    // a title is tidied as any page's title is, and one with nothing in it is "Untitled"
    expect(newPage('note', 'p3', NOW, { title: '   ' }).title).toBe('Untitled');
    expect(newPage('note', 'p4', NOW, { title: 'x'.repeat(200) }).title).toHaveLength(80);
  });

  it("lists a subject's pages as My pages orders them", () => {
    const all = [page({ id: 'old', subjectId: 'eng', updatedAt: '2026-11-01T08:00:00Z' }), page({ id: 'new', subjectId: 'eng', updatedAt: '2026-11-10T08:00:00Z' }), page({ id: 'other', subjectId: 'mat' }), page({ id: 'none' })];
    expect(subjectPages(all, 'eng').map((p) => p.id)).toEqual(['new', 'old']);
    // a goal that has been reached comes last, however lately it changed
    const reached = page({ id: 'won', kind: 'goal', subjectId: 'eng', reachedOn: '2026-11-15', updatedAt: '2026-11-16T08:00:00Z' });
    expect(subjectPages([reached, ...all], 'eng').map((p) => p.id)).toEqual(['new', 'old', 'won']);
  });

  it('says a page in one line: its kind, then what My pages says about it', () => {
    expect(subjectPageLine(page({ kind: 'note', text: 'Six ideas so far.' }))).toBe('Note. Six ideas so far.');
    expect(subjectPageLine(page({ kind: 'note' }))).toBe('Note. Nothing written yet');
    expect(subjectPageLine(page({ kind: 'checklist' }))).toBe('Checklist. Nothing here yet');
    expect(subjectPageLine(page({ kind: 'project', aimFor: '2026-12-11' }))).toBe('Project. Aim for 11 Dec');
    expect(subjectPageLine(page({ kind: 'goal', reachedOn: '2026-11-12', items: [{ id: 'a', text: 'a', done: true }] }))).toBe('Goal. Reached Thu 12 Nov');
  });

  it("leaves a list's count out of the line, since the row shows it beside the line", () => {
    const items = [{ id: 'a', text: 'a', done: true }, { id: 'b', text: 'b', done: false }];
    expect(subjectPageLine(page({ kind: 'checklist', items }))).toBe('Checklist');
    expect(subjectPageLine(page({ kind: 'reading', items, text: 'Start with the short stories.' }))).toBe('Reading. Start with the short stories.');
    expect(subjectPageLine(page({ kind: 'goal', items, aimFor: '2026-12-11', text: 'Because it matters.' }))).toBe('Goal. Aim for 11 Dec');
  });
});

import { describe, expect, it } from 'vitest';
import { type Applied, byLevel, focusOf, levelRank, levelsFor, rekeyed, taskRank, withLevel } from './levels';
import type { Levels, Subject, Task } from './types';

// 2 November 2026 is a Monday
const W45 = '2026-11-02', W46 = '2026-11-09', W47 = '2026-11-16', W48 = '2026-11-23';
const subject = (id: string): Subject => ({ id, name: id, colour: 'marine' }), SUBJECTS = ['eng', 'leg', 'mat', 'eco', 'bus', 'art'].map(subject);
const all: Levels = { [W45]: { eng: 'high', gone: 'high' }, [W47]: { leg: 'high', mat: 'medium' } };

describe('subject levels', () => {
  it("uses a week's own record", () => expect(levelsFor(all, W47, SUBJECTS)).toEqual({ levels: { leg: 'high', mat: 'medium' }, from: W47, carried: false }));

  it('carries the latest earlier record, and drops subjects that are gone', () => expect(levelsFor(all, W46, SUBJECTS)).toEqual({ levels: { eng: 'high' }, from: W45, carried: true }));

  it('never reaches forward', () => expect(levelsFor({ [W48]: { eng: 'high' } }, W47, SUBJECTS)).toEqual({ levels: {}, from: null, carried: false }));

  it('still finds levels when the week starts on another day', () => expect(levelsFor(all, '2026-11-22', SUBJECTS)).toMatchObject({ from: W47, carried: true }));

  it("moves each week's levels to the week holding most of the same days", () => {
    const sundays = rekeyed(all, 0);
    expect(sundays).toEqual({ '2026-11-01': all[W45], '2026-11-15': all[W47] });
    // the week of the change keeps its own levels: they are not carried, and an older record does not come back
    expect(levelsFor(sundays, '2026-11-15', SUBJECTS)).toEqual({ levels: { leg: 'high', mat: 'medium' }, from: '2026-11-15', carried: false });
    expect(levelsFor(sundays, '2026-11-22', SUBJECTS)).toMatchObject({ from: '2026-11-15', carried: true });
    expect(rekeyed(sundays, 1)).toEqual(all);
    expect(rekeyed({ nonsense: { eng: 'high' } } as Levels, 0)).toEqual({ nonsense: { eng: 'high' } });
  });

  it('starts a new week from what was carried', () => {
    const next = withLevel(all, W46, 'leg', 'medium');
    expect(next[W46]).toEqual({ eng: 'high', gone: 'high', leg: 'medium' }); expect(all[W46]).toBeUndefined();
    expect(withLevel(next, W46, 'eng', null)[W46]).toEqual({ gone: 'high', leg: 'medium' });
  });

  it('ranks High, Medium, then the rest', () => expect([levelRank('high'), levelRank('medium'), levelRank('normal'), levelRank(undefined)]).toEqual([0, 1, 2, 2]));

  it('names four High subjects at most', () => {
    const applied: Applied = { levels: { eng: 'high', leg: 'high', mat: 'high', eco: 'high', bus: 'high', art: 'medium' }, from: W47, carried: false };
    expect(focusOf(SUBJECTS, applied)).toEqual({ named: SUBJECTS.slice(0, 4), more: 1 });
  });

  it('orders subjects by level and keeps their order within one', () => expect(byLevel(SUBJECTS, levelsFor(all, W47, SUBJECTS)).map((s) => s.id)).toEqual(['leg', 'mat', 'eng', 'eco', 'bus', 'art']));

  it("ranks a task by its own week's levels", () => {
    const rank = taskRank(all, SUBJECTS, 1), t = (over: Partial<Task>) => ({ id: 'x', title: 'x', priority: 'normal', scope: 'day', date: '2026-11-18', order: 1, createdAt: '', ...over }) as Task;
    expect(rank(t({ subjectId: 'leg' }))).toBe(0); expect(rank(t({ subjectId: 'eng' }))).toBe(2); expect(rank(t({}))).toBe(2);
    expect(rank(t({ subjectId: 'eng', date: W46, scope: 'week' }))).toBe(0);
  });
});

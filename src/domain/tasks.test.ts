import { describe, expect, it } from 'vitest';
import { allTasksInWeek, carryOver, cleanTitle, dayMarks, missedDay, nextWeekPriorities, progress, share, sortTasks, tasksForDay, upcomingAssessments } from './tasks';
import type { Assessment, Task } from './types';
import { awardsFor, daysAtSea, earnedFittings, earnedStage, milesLogged, nextFitting, nextStage } from './voyage';

let n = 0;
const task = (over: Partial<Task>): Task => ({ id: `t${++n}`, title: 'Task', priority: 'normal', scope: 'day', date: '2026-11-12', order: n, createdAt: '2026-11-01T08:00:00Z', ...over });

describe('tasks', () => {
  it('sorts open tasks by priority then order, and puts completed tasks last, newest first', () => {
    const a = task({ title: 'a', order: 1 }), b = task({ title: 'b', priority: 'high', order: 2 }), c = task({ title: 'c', priority: 'low', order: 0 });
    const d = task({ title: 'd', completedAt: '2026-11-12T09:00:00Z' }), e = task({ title: 'e', completedAt: '2026-11-12T10:00:00Z' });
    expect(sortTasks([a, d, c, e, b]).map((t) => t.title)).toEqual(['b', 'a', 'c', 'e', 'd']);
  });

  it('counts daily and weekly progress from the same records', () => {
    const tasks = [task({ date: '2026-11-09', completedAt: 'x' }), task({ date: '2026-11-12' }), task({ date: '2026-11-15', completedAt: 'x' }), task({ scope: 'week', date: '2026-11-09' }), task({ date: '2026-11-16' })];
    expect(progress(tasksForDay(tasks, '2026-11-12'))).toEqual({ done: 0, total: 1 });
    expect(progress(allTasksInWeek(tasks, '2026-11-09'))).toEqual({ done: 2, total: 4 });
    expect(dayMarks(tasks, '2026-11-09').map((p) => p.total)).toEqual([1, 0, 0, 1, 0, 0, 1]);
    expect(share({ done: 0, total: 0 })).toBeNull();
    expect(share({ done: 3, total: 5 })).toBeCloseTo(0.6, 10);
  });

  it('carries over only open tasks from earlier days of the current week', () => {
    const lastWeek = task({ date: '2026-11-06' }), thursday = task({ date: '2026-11-12' }), done = task({ date: '2026-11-11', completedAt: 'x' }), today = task({ date: '2026-11-15' });
    expect(carryOver([lastWeek, thursday, done, today], '2026-11-15')).toEqual([thursday]);
    expect(carryOver([thursday], '2026-11-09')).toEqual([]);
  });

  it('a missed day had tasks and none done; an empty day is never missed', () => {
    expect(missedDay([task({ date: '2026-11-12' })], '2026-11-12')).toBe(true);
    expect(missedDay([task({ date: '2026-11-12' }), task({ date: '2026-11-12', completedAt: 'x' })], '2026-11-12')).toBe(false);
    expect(missedDay([], '2026-11-12')).toBe(false);
    expect(missedDay([task({ scope: 'week', date: '2026-11-09' })], '2026-11-09')).toBe(false);
  });

  it('lists assessments for the next three weeks, soonest first, four at most', () => {
    const a = (id: string, date: string): Assessment => ({ id, title: id, subjectId: 's', date, kind: 'test' });
    const list = [a('far', '2026-12-20'), a('past', '2026-11-10'), a('c', '2026-11-27'), a('a', '2026-11-19'), a('b', '2026-11-24'), a('today', '2026-11-15'), a('e', '2026-12-05')];
    expect(upcomingAssessments(list, '2026-11-15').map((x) => x.id)).toEqual(['today', 'a', 'b', 'c']);
  });

  it("next week's priorities are that week's any-time tasks, in their own order", () => {
    const p2 = task({ scope: 'week', date: '2026-11-16', order: 2, title: 'second' }), p1 = task({ scope: 'week', date: '2026-11-16', order: 1, title: 'first', priority: 'low' });
    expect(nextWeekPriorities([p2, p1, task({ scope: 'week', date: '2026-11-09' })], '2026-11-15').map((t) => t.title)).toEqual(['first', 'second']);
  });

  it('cleans titles: trims, collapses spaces, stops at 140 characters', () => {
    expect(cleanTitle('   ')).toBe('');
    expect(cleanTitle('  Review   English  notes ')).toBe('Review English notes');
    expect(cleanTitle('x'.repeat(500))).toHaveLength(140);
  });
});

describe('voyage', () => {
  it('a task earns once, and a high-priority task earns three', () => {
    const t = task({ completedAt: 'x', date: '2026-11-15' }), high = task({ completedAt: 'x', priority: 'high', date: '2026-11-14' });
    expect(awardsFor(t, [t, task({ date: '2026-11-15' })], [], '2026-11-15')).toEqual([{ id: `task:${t.id}`, date: '2026-11-15', source: 'task', sourceId: t.id, miles: 2 }]);
    expect(awardsFor(high, [high, task({ date: '2026-11-14' })], [], '2026-11-15')[0]!.miles).toBe(3);
    expect(awardsFor({ ...t, milesAwarded: true }, [t, task({ date: '2026-11-15' })], [], '2026-11-15')).toEqual([]);
  });

  it('finishing a day earns a bonus once for that date', () => {
    const t = task({ completedAt: 'x', date: '2026-11-15' });
    const first = awardsFor(t, [t], [], '2026-11-15');
    expect(first.map((e) => e.miles)).toEqual([2, 3]);
    expect(awardsFor({ ...t, milesAwarded: true }, [t], first, '2026-11-15')).toEqual([]);
  });

  it('task miles stop at 40 in a day', () => {
    const log = [{ id: 'a', date: '2026-11-15', source: 'task' as const, sourceId: 'a', miles: 39 }];
    const t = task({ completedAt: 'x', priority: 'high', scope: 'week', date: '2026-11-09' });
    expect(awardsFor(t, [t], log, '2026-11-15')[0]!.miles).toBe(1);
    expect(awardsFor(t, [t], [{ ...log[0]!, miles: 40 }], '2026-11-15')).toEqual([]);
  });

  it('totals miles and counts different days, not consecutive ones', () => {
    const log = [{ id: '1', date: '2026-11-01', source: 'task' as const, sourceId: '1', miles: 2 }, { id: '2', date: '2026-11-01', source: 'day-clear' as const, sourceId: 'd', miles: 3 }, { id: '3', date: '2026-11-09', source: 'task' as const, sourceId: '3', miles: 2 }];
    expect(milesLogged(log)).toBe(7);
    expect(daysAtSea(log)).toBe(2);
  });

  it('a stage needs both its miles and its days at sea', () => {
    expect(earnedStage(0, 0)).toBe('dinghy');
    expect(earnedStage(412, 23)).toBe('sloop');
    expect(earnedStage(5000, 5)).toBe('dinghy');
    expect(earnedStage(1000, 40)).toBe('cutter');
    expect(earnedStage(9999, 999)).toBe('schooner');
    expect(nextStage(412, 23)).toEqual({ id: 'cutter', miles: 588, days: 17 });
    expect(nextStage(9999, 999)).toBeUndefined();
  });

  it('at 412 miles the sloop has portlights and the transom name is next', () => {
    expect(earnedFittings(412).map((f) => f.id)).toEqual(['pennant', 'lantern', 'sheer-stripe', 'portlights']);
    expect(nextFitting(412)!.id).toBe('transom-name');
    expect(nextFitting(412)!.miles - 412).toBe(88);
  });
});

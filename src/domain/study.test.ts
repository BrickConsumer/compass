import { describe, expect, it } from 'vitest';
import { nextColour, subjectAssessments, subjectSummary, subjectTasks, summaryLine, taskWhen } from './study';
import type { Assessment, Subject, Task } from './types';

// 16 November 2026 is a Monday
const TODAY = '2026-11-16';
const task = (id: string, over: Partial<Task> = {}): Task => ({ id, title: id, priority: 'normal', scope: 'day', date: TODAY, order: 1, createdAt: '2026-11-01T08:00:00.000Z', subjectId: 'bio', ...over });
const test = (id: string, date: string, subjectId = 'bio'): Assessment => ({ id, title: id, subjectId, date, kind: 'test' });
const bio: Subject = { id: 'bio', name: 'Biology', colour: 'seafoam' };

describe('a subject\'s tasks', () => {
  const tasks = [
    task('later', { date: '2026-11-19' }), task('today-low', { priority: 'low' }), task('today-high', { priority: 'high', order: 2 }),
    task('this-week', { scope: 'week', date: TODAY }), task('other', { subjectId: 'eco' }), task('none', { subjectId: undefined }),
    task('done-old', { completedAt: '2026-11-10T09:00:00.000Z' }), task('done-new', { completedAt: '2026-11-15T09:00:00.000Z' }),
  ];

  it('are only its own, open ones first by date and then by priority', () => {
    const { open, done } = subjectTasks(tasks, 'bio');
    expect(open.map((t) => t.id)).toEqual(['today-high', 'today-low', 'this-week', 'later']);
    expect(done.map((t) => t.id)).toEqual(['done-new', 'done-old']);
  });

  it('say when they are for, in plain words', () => {
    expect(taskWhen(task('a'), TODAY, 1)).toBe('Today');
    expect(taskWhen(task('a', { date: '2026-11-17' }), TODAY, 1)).toBe('Tomorrow');
    expect(taskWhen(task('a', { date: '2026-11-19' }), TODAY, 1)).toBe('Thu 19 Nov');
    expect(taskWhen(task('a', { date: '2026-11-12' }), TODAY, 1)).toBe('Thu 12 Nov');
    expect(taskWhen(task('a', { scope: 'week', date: TODAY }), TODAY, 1)).toBe('This week');
    expect(taskWhen(task('a', { scope: 'week', date: '2026-11-23' }), TODAY, 1)).toBe('Next week');
    expect(taskWhen(task('a', { scope: 'week', date: '2026-11-30' }), TODAY, 1)).toBe('Week 49');
  });
});

describe('a subject\'s assessments', () => {
  const all = [test('past', '2026-11-10'), test('far', '2026-12-20'), test('soon', '2026-11-20'), test('today', TODAY), test('other', '2026-11-18', 'eco')];

  it('are split into what is ahead, soonest first, and what has passed, latest first', () => {
    const { ahead, past } = subjectAssessments(all, 'bio', TODAY);
    expect(ahead.map((a) => a.id)).toEqual(['today', 'soon', 'far']);
    expect(past.map((a) => a.id)).toEqual(['past']);
  });

  it('sum up in one line for the list of subjects', () => {
    const tasks = [task('a'), task('b'), task('c', { completedAt: '2026-11-15T09:00:00.000Z' })];
    const s = subjectSummary(bio, tasks, all, TODAY);
    expect(s).toMatchObject({ open: 2 });
    expect(s.next!.id).toBe('today');
    expect(summaryLine(s, TODAY)).toBe('2 open tasks. today today.');
    expect(summaryLine(subjectSummary(bio, [task('a')], [test('Biology test', '2026-11-20')], TODAY), TODAY)).toBe('1 open task. Biology test in 4 days.');
    expect(summaryLine(subjectSummary(bio, [], [], TODAY), TODAY)).toBe('Nothing open.');
  });
});

describe('a new subject\'s colour', () => {
  it('is the first one not yet used, and the least used once all are', () => {
    expect(nextColour([])).toBe('marine');
    expect(nextColour([{ id: 'a', name: 'A', colour: 'marine' }, { id: 'b', name: 'B', colour: 'seafoam' }])).toBe('teal');
    const every = (['marine', 'teal', 'seafoam', 'moss', 'brass', 'clay', 'rose', 'heather'] as const).map((colour, i) => ({ id: `s${i}`, name: 'S', colour }));
    expect(nextColour([...every, { id: 'x', name: 'X', colour: 'marine' }])).toBe('teal');
  });
});

import { describe, expect, it } from 'vitest';
import { tickKey } from './habits';
import { canReview, isBlank, reviewAward, reviewExcerpt, weekSummary } from './review';
import type { Assessment, Habit, LogEntry, Review, Task } from './types';
import { MILES } from './voyage';

// 16 November 2026 is a Monday
const MON = '2026-11-16', TUE = '2026-11-17', WED = '2026-11-18', SUN = '2026-11-22', LAST = '2026-11-09', OLDER = '2026-11-02', NEXT = '2026-11-23';
const task = (id: string, over: Partial<Task> = {}): Task => ({ id, title: id, priority: 'normal', scope: 'day', date: MON, order: 1, createdAt: '2026-11-01T08:00:00.000Z', ...over });
const done = { completedAt: '2026-11-16T09:00:00.000Z' };
const habit = (id: string, days = [0, 1, 2, 3, 4, 5, 6]): Habit => ({ id, name: id, days, order: 1, createdOn: '2026-11-01' });
const entry = (id: string, date: string, miles: number): LogEntry => ({ id, date, source: 'task', sourceId: id, miles });
const review = (over: Partial<Review> = {}): Review => ({ weekStart: MON, wentWell: '', gotInWay: '', change: '', ...over });

describe("the week's summary", () => {
  const tasks = [task('a', done), task('b'), task('c', { date: TUE, ...done }), task('w', { scope: 'week', date: MON, ...done }), task('other', { date: NEXT }), task('old', { date: LAST, ...done })];
  const habits = [habit('read'), habit('gym', [1, 3, 5])], ticks = [tickKey('read', MON), tickKey('gym', MON), tickKey('read', LAST)];
  const log = [entry('1', MON, 3), entry('2', MON, 2), entry('3', WED, 2), entry('4', LAST, 9), entry('5', NEXT, 4)];
  const assessments: Assessment[] = [{ id: 'x', title: 'Biology test', subjectId: 'bio', date: '2026-11-20', kind: 'test' }, { id: 'y', title: 'Later', subjectId: 'bio', date: NEXT, kind: 'test' }];
  const s = weekSummary({ tasks, habits, ticks, log, assessments }, MON, TUE);

  it('counts the tasks of that week only, day and any-time together', () => {
    expect(s.tasks).toEqual({ done: 3, total: 4 });
    expect(s.days.map((d) => `${d.done}/${d.total}`).slice(0, 3)).toEqual(['1/2', '1/1', '0/0']);
  });

  it('counts each habit only for the days that have come', () => {
    expect(s.habits.map((h) => `${h.habit.id} ${h.done}/${h.total}`)).toEqual(['read 1/2', 'gym 1/1']);
    expect(s.habitTotal).toEqual({ done: 2, total: 3 });
  });

  it('adds up the miles logged in the week and the days they were logged on', () => {
    expect(s.miles).toBe(7);
    expect(s.daysAtSea).toBe(2);
  });

  it("lists the week's assessments", () => {
    expect(s.assessments.map((a) => a.title)).toEqual(['Biology test']);
  });

  it('leaves out a habit with no day in the week yet', () => {
    const late = weekSummary({ tasks: [], habits: [{ ...habit('new'), createdOn: SUN }], ticks: [], log: [], assessments: [] }, MON, TUE);
    expect(late.habits).toEqual([]);
    expect(late.habitTotal).toEqual({ done: 0, total: 0 });
  });
});

describe('which weeks can be reviewed', () => {
  it('this week and any before it, never one still to come', () => {
    expect(canReview(MON, TUE, 1)).toBe(true);
    expect(canReview(OLDER, TUE, 1)).toBe(true);
    expect(canReview(NEXT, TUE, 1)).toBe(false);
  });
});

describe('miles for a review', () => {
  it('saving one logs ten miles, once for each week', () => {
    const first = reviewAward(MON, [], TUE, 1)!;
    expect(first).toMatchObject({ id: 'review:2026-11-16', source: 'review', miles: MILES.review, date: TUE });
    expect(reviewAward(MON, [first], WED, 1)).toBeNull();
  });

  it('only for this week or the one just ended, so old weeks cannot be mined', () => {
    expect(reviewAward(LAST, [], TUE, 1)).not.toBeNull();
    expect(reviewAward(OLDER, [], TUE, 1)).toBeNull();
    expect(reviewAward(NEXT, [], TUE, 1)).toBeNull();
  });
});

describe('a reflection', () => {
  it('is blank until something is written', () => {
    expect(isBlank(review())).toBe(true);
    expect(isBlank(review({ gotInWay: '   ' }))).toBe(true);
    expect(isBlank(review({ change: 'Start earlier.' }))).toBe(false);
  });

  it('is shown in a list by its first words', () => {
    expect(reviewExcerpt(review({ wentWell: '  Kept up with Biology revision most days.  ', change: 'Start earlier.' }))).toBe('Kept up with Biology revision most days.');
    expect(reviewExcerpt(review({ change: 'Start earlier.' }))).toBe('Start earlier.');
    expect(reviewExcerpt(review({ wentWell: 'x'.repeat(200) })).length).toBeLessThanOrEqual(90);
    expect(reviewExcerpt(review())).toBe('');
  });
});

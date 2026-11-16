import { describe, expect, it } from 'vitest';
import { cleanDays, daysLabel, habitProgress, habitsForDay, isDue, isTicked, tickKey, weekCount, weekRow } from './habits';
import type { Habit } from './types';
import { habitAward, MILES } from './voyage';

// 16 November 2026 is a Monday
const MON = '2026-11-16', TUE = '2026-11-17', WED = '2026-11-18', SUN = '2026-11-22';
const habit = (over: Partial<Habit> = {}): Habit => ({ id: 'h1', name: 'Read for 20 minutes', days: [0, 1, 2, 3, 4, 5, 6], order: 1, createdOn: '2026-11-01', ...over });

describe('which habits fall on a day', () => {
  it('a daily habit is due every day from the day it was made', () => {
    expect(isDue(habit(), MON)).toBe(true);
    expect(isDue(habit(), SUN)).toBe(true);
    expect(isDue(habit({ createdOn: TUE }), MON)).toBe(false);
  });

  it('a habit for chosen weekdays is due only on those', () => {
    const gym = habit({ days: [1, 3, 5] }); // Monday, Wednesday, Friday
    expect([MON, TUE, WED].map((d) => isDue(gym, d))).toEqual([true, false, true]);
  });

  it('lists the day\'s habits in their order', () => {
    const list = [habit({ id: 'b', order: 2 }), habit({ id: 'a', order: 1 }), habit({ id: 'c', order: 3, days: [2] })];
    expect(habitsForDay(list, MON).map((h) => h.id)).toEqual(['a', 'b']);
    expect(habitsForDay(list, TUE).map((h) => h.id)).toEqual(['a', 'b', 'c']);
  });

  it('counts what is done of what is due', () => {
    const list = [habit({ id: 'a' }), habit({ id: 'b' }), habit({ id: 'c', days: [2] })], ticks = [tickKey('a', MON), tickKey('c', MON), tickKey('b', TUE)];
    expect(isTicked(ticks, 'a', MON)).toBe(true);
    expect(isTicked(ticks, 'b', MON)).toBe(false);
    // c is ticked for a day it is not due, which counts for nothing
    expect(habitProgress(list, ticks, MON)).toEqual({ done: 1, total: 2 });
  });
});

describe('a habit\'s week', () => {
  const ticks = [tickKey('h1', MON)];

  it('marks each day done, open, still ahead, or not a day for it', () => {
    const gym = habit({ days: [1, 2, 3, 5] });
    expect(weekRow(gym, ticks, MON, TUE).map((d) => d.state)).toEqual(['done', 'open', 'ahead', 'off', 'ahead', 'off', 'off']);
  });

  it('days before the habit existed are not days for it', () => {
    expect(weekRow(habit({ createdOn: WED }), ticks, MON, SUN).map((d) => d.state).slice(0, 3)).toEqual(['off', 'off', 'open']);
  });

  it('counts only the days that have come, so a week in progress is not marked down for its future', () => {
    expect(weekCount(habit(), ticks, MON, TUE)).toEqual({ done: 1, total: 2 });
    expect(weekCount(habit(), ticks, MON, SUN)).toEqual({ done: 1, total: 7 });
    // a week that has not started has nothing due yet
    expect(weekCount(habit(), ticks, '2026-11-23', TUE)).toEqual({ done: 0, total: 0 });
  });
});

describe('choosing days', () => {
  it('keeps real weekdays, once each, in order', () => {
    expect(cleanDays([5, 1, 1, 9, -1, 3])).toEqual([1, 3, 5]);
  });

  it('describes them in words, in the order of the user\'s week', () => {
    expect(daysLabel([0, 1, 2, 3, 4, 5, 6], 1)).toBe('Every day');
    expect(daysLabel([1, 2, 3, 4, 5], 1)).toBe('Weekdays');
    expect(daysLabel([0, 6], 1)).toBe('Weekends');
    expect(daysLabel([0, 1, 3], 1)).toBe('Mon, Wed, Sun');
    expect(daysLabel([0, 1, 3], 0)).toBe('Sun, Mon, Wed');
  });
});

describe('miles from habits', () => {
  it('a tick logs one mile, once for each habit and day', () => {
    const first = habitAward('h1', MON, [], MON)!;
    expect(first).toMatchObject({ id: 'habit:h1:2026-11-16', source: 'habit', miles: MILES.habit, date: MON });
    expect(habitAward('h1', MON, [first], MON)).toBeNull();
    expect(habitAward('h1', TUE, [first], TUE)).not.toBeNull();
  });

  it('a tick for an earlier day is logged on the day it is made', () => {
    expect(habitAward('h1', MON, [], WED)!.date).toBe(WED);
  });

  it('stops at the daily limit, so a long list of habits cannot be farmed', () => {
    let log = [] as ReturnType<typeof habitAward>[];
    for (let i = 0; i < MILES.dailyHabitCap + 3; i++) { const a = habitAward(`h${i}`, MON, log as never, MON); if (a) log = [...log, a]; }
    expect(log).toHaveLength(MILES.dailyHabitCap);
  });
});

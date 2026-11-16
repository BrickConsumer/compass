import { addDaysISO, weekdayOf } from './dates';
import type { Progress } from './tasks';
import type { Habit, ISODate } from './types';

/** A tick is one habit on one day. Ticks are kept as a flat list of these keys. */
export const tickKey = (habitId: string, date: ISODate): string => `${habitId}|${date}`;
export const isTicked = (ticks: readonly string[], habitId: string, date: ISODate): boolean => ticks.includes(tickKey(habitId, date));

/** True when the day is one of the habit's weekdays, on or after the day the habit was made. */
export const isDue = (habit: Habit, date: ISODate): boolean => date >= habit.createdOn && habit.days.includes(weekdayOf(date));

/** The habits that fall on a day, in their order. */
export const habitsForDay = (habits: Habit[], date: ISODate): Habit[] => habits.filter((h) => isDue(h, date)).sort((a, b) => a.order - b.order);

/** How many of a day's habits are ticked. */
export function habitProgress(habits: Habit[], ticks: readonly string[], date: ISODate): Progress {
  const due = habitsForDay(habits, date);
  return { done: due.filter((h) => isTicked(ticks, h.id, date)).length, total: due.length };
}

/** A day in a habit's week: ticked, due and not ticked, due but still to come, or not a day for this habit. */
export type DayState = 'done' | 'open' | 'ahead' | 'off';

export function weekRow(habit: Habit, ticks: readonly string[], weekStart: ISODate, today: ISODate): { date: ISODate; state: DayState }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDaysISO(weekStart, i);
    const state: DayState = !isDue(habit, date) ? 'off' : isTicked(ticks, habit.id, date) ? 'done' : date > today ? 'ahead' : 'open';
    return { date, state };
  });
}

/** Done of due for a week, counting only the days that have come. */
export function weekCount(habit: Habit, ticks: readonly string[], weekStart: ISODate, today: ISODate): Progress {
  const row = weekRow(habit, ticks, weekStart, today);
  return { done: row.filter((d) => d.state === 'done').length, total: row.filter((d) => d.state === 'done' || d.state === 'open').length };
}

/** Real weekdays, once each, Sunday first. */
export const cleanDays = (days: number[]): number[] => [...new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b);

const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** The seven weekdays in the order of the user's week. */
export const weekOrder = (weekStartsOn: 0 | 1): number[] => Array.from({ length: 7 }, (_, i) => (i + weekStartsOn) % 7);
export const weekdayName = (day: number): string => SHORT[day] ?? '';

/** A habit's days in words: "Every day", "Weekdays", or the days themselves in the order of the user's week. */
export function daysLabel(days: number[], weekStartsOn: 0 | 1): string {
  const set = cleanDays(days), key = set.join('');
  if (set.length === 7) return 'Every day';
  if (key === '12345') return 'Weekdays';
  if (key === '06') return 'Weekends';
  return weekOrder(weekStartsOn).filter((d) => set.includes(d)).map(weekdayName).join(', ');
}

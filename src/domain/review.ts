import { addDaysISO, weekStartOf } from './dates';
import { weekCount } from './habits';
import { hasRatings, shownRatings } from './ratings';
import { allTasksInWeek, dayMarks, type Progress, progress } from './tasks';
import type { Assessment, Habit, ISODate, LogEntry, RatingArea, Review, Task } from './types';
import { MILES } from './voyage';

export interface WeekSummary {
  /** Every task of the week, a day's and any-time ones together. */
  tasks: Progress;
  /** Day tasks for each of the seven days. */
  days: Progress[];
  /** Each habit that had a day in the week so far, with its count. */
  habits: { habit: Habit; done: number; total: number }[];
  habitTotal: Progress;
  /** Nautical miles logged in the week, and the number of its days on which any were. */
  miles: number;
  daysAtSea: number;
  assessments: Assessment[];
}

/** What a week held, worked out from the same records as everything else. Nothing here is stored. */
export function weekSummary(data: { tasks: Task[]; habits: Habit[]; ticks: readonly string[]; log: LogEntry[]; assessments: Assessment[] }, weekStart: ISODate, today: ISODate): WeekSummary {
  const end = addDaysISO(weekStart, 6), inWeek = (date: ISODate) => date >= weekStart && date <= end;
  const habits = [...data.habits].sort((a, b) => a.order - b.order).map((habit) => ({ habit, ...weekCount(habit, data.ticks, weekStart, today) })).filter((h) => h.total > 0);
  const logged = data.log.filter((e) => inWeek(e.date));
  return {
    tasks: progress(allTasksInWeek(data.tasks, weekStart)),
    days: dayMarks(data.tasks, weekStart),
    habits,
    habitTotal: { done: habits.reduce((n, h) => n + h.done, 0), total: habits.reduce((n, h) => n + h.total, 0) },
    miles: logged.reduce((n, e) => n + e.miles, 0),
    daysAtSea: new Set(logged.map((e) => e.date)).size,
    assessments: data.assessments.filter((a) => inWeek(a.date)).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/** This week and any before it can be reviewed. A week still to come cannot. */
export const canReview = (weekStart: ISODate, today: ISODate, weekStartsOn: 0 | 1): boolean => weekStart <= weekStartOf(today, weekStartsOn);

/**
 * The log entry earned by saving a week's review, or null if there is nothing to earn.
 * A week earns once, and only this week or the one just ended does, so old weeks cannot be mined for miles.
 */
export function reviewAward(weekStart: ISODate, log: LogEntry[], today: ISODate, weekStartsOn: 0 | 1): LogEntry | null {
  const id = `review:${weekStart}`, thisWeek = weekStartOf(today, weekStartsOn);
  if (log.some((e) => e.id === id) || (weekStart !== thisWeek && weekStart !== addDaysISO(thisWeek, -7))) return null;
  return { id, date: today, source: 'review', sourceId: weekStart, miles: MILES.review };
}

const parts = (r: Review) => [r.wentWell, r.gotInWay, r.change];
/** A review with nothing written and nothing rated. Only ratings for the areas given count, so one whose areas are all gone is blank. */
export const isBlank = (r: Review, areas: RatingArea[] = []): boolean => parts(r).every((p) => !p.trim()) && shownRatings(r, areas).every((x) => x.rating === null);

/** The first words of a reflection, for a list of earlier reviews. A review that was only rated says so. */
export function reviewExcerpt(r: Review): string {
  const first = parts(r).map((p) => p.trim().replace(/\s+/g, ' ')).find(Boolean) ?? '';
  if (!first) return hasRatings(r) ? 'Rated, nothing written.' : '';
  return first.length > 90 ? `${first.slice(0, 87).trimEnd()}...` : first;
}

import { addDaysISO, daysBetween, weekDays, weekStartOf } from './dates';
import type { Assessment, ISODate, Task } from './types';

const RANK = { high: 0, normal: 1, low: 2 } as const;

/**
 * Open tasks first (high, normal, low, then by order); completed tasks after, most recent first.
 * Given a rank, open tasks of the same priority are ordered by it before their own order: see `taskRank`.
 */
export function sortTasks(tasks: Task[], rank?: (task: Task) => number): Task[] {
  return tasks.slice().sort((a, b) => {
    if (!!a.completedAt !== !!b.completedAt) return a.completedAt ? 1 : -1;
    if (a.completedAt && b.completedAt) return b.completedAt.localeCompare(a.completedAt);
    return RANK[a.priority] - RANK[b.priority] || (rank ? rank(a) - rank(b) : 0) || a.order - b.order;
  });
}

export const tasksForDay = (tasks: Task[], date: ISODate, rank?: (task: Task) => number): Task[] => sortTasks(tasks.filter((t) => t.scope === 'day' && t.date === date), rank);
export const tasksForWeek = (tasks: Task[], weekStart: ISODate, rank?: (task: Task) => number): Task[] => sortTasks(tasks.filter((t) => t.scope === 'week' && t.date === weekStart), rank);

/** Every task that belongs to a week: its seven days and its any-time tasks. */
export function allTasksInWeek(tasks: Task[], weekStart: ISODate): Task[] {
  const days = new Set(weekDays(weekStart));
  return tasks.filter((t) => (t.scope === 'week' ? t.date === weekStart : days.has(t.date)));
}

export interface Progress { done: number; total: number }
export const progress = (tasks: Task[]): Progress => ({ done: tasks.filter((t) => t.completedAt).length, total: tasks.length });
/** Share done, or null when nothing is planned. */
export const share = (p: Progress): number | null => (p.total === 0 ? null : p.done / p.total);

/** Done and total for each of a week's seven days. */
export const dayMarks = (tasks: Task[], weekStart: ISODate): Progress[] => weekDays(weekStart).map((day) => progress(tasks.filter((t) => t.scope === 'day' && t.date === day)));

/** Open tasks from earlier days of the current week. They are never moved automatically. */
export function carryOver(tasks: Task[], today: ISODate, weekStartsOn: 0 | 1 = 1): Task[] {
  const start = weekStartOf(today, weekStartsOn);
  return tasks.filter((t) => t.scope === 'day' && !t.completedAt && t.date >= start && t.date < today);
}

/** A missed day had tasks planned and none completed. A day with nothing planned is never missed. */
export function missedDay(tasks: Task[], date: ISODate): boolean {
  const p = progress(tasks.filter((t) => t.scope === 'day' && t.date === date));
  return p.total > 0 && p.done === 0;
}

/** Assessments in the next 21 days from today, soonest first, four at most. */
export function upcomingAssessments(assessments: Assessment[], today: ISODate, limit = 4): Assessment[] {
  return assessments.filter((a) => { const n = daysBetween(today, a.date); return n >= 0 && n <= 21; }).sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
}

/** Next week's priorities: the any-time tasks of the week after the current one, in their own order. */
export function nextWeekPriorities(tasks: Task[], today: ISODate, weekStartsOn: 0 | 1 = 1): Task[] {
  const next = addDaysISO(weekStartOf(today, weekStartsOn), 7);
  return tasks.filter((t) => t.scope === 'week' && t.date === next).sort((a, b) => a.order - b.order);
}

/** A title as it will be stored: trimmed and at most 140 characters. Empty means do not save. */
export const cleanTitle = (title: string): string => title.trim().replace(/\s+/g, ' ').slice(0, 140);

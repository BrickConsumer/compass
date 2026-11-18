import { addDaysISO, isISODate, weekStartOf } from './dates';
import type { ISODate, Level, Levels, Subject, Task } from './types';

/** The levels that apply to one week, and the week they were set for. Carried means that was an earlier week. */
export interface Applied { levels: Record<string, Level>; from: ISODate | null; carried: boolean }

/** The record a week uses: its own, or the latest one before it. Dates in this form sort as text. */
const recordKey = (all: Levels, weekStart: ISODate): ISODate | null => Object.keys(all).filter((k) => k <= weekStart).sort().at(-1) ?? null;
/** A record as saved, or nothing if what was saved is not one. */
const recordOf = (all: Levels, key: ISODate | null): Record<string, Level> => { const r = key ? all[key] : null; return r && typeof r === 'object' ? r : {}; };

/**
 * The levels for a week. A week with none of its own keeps the last ones set, so a week without a review still has
 * a focus. Entries for a subject that no longer exists are left out, and come back if the subject does.
 */
export function levelsFor(all: Levels, weekStart: ISODate, subjects: Subject[]): Applied {
  const from = recordKey(all, weekStart);
  if (!from) return { levels: {}, from: null, carried: false };
  const known = new Set(subjects.map((s) => s.id));
  return { levels: Object.fromEntries(Object.entries(recordOf(all, from)).filter(([id]) => known.has(id))), from, carried: from !== weekStart };
}

/** Set or clear one subject's level for a week. A week with no record of its own starts from the one it was carrying. */
export function withLevel(all: Levels, weekStart: ISODate, subjectId: string, level: Level | null): Levels {
  const record = { ...recordOf(all, recordKey(all, weekStart)) };
  if (level) record[subjectId] = level; else delete record[subjectId];
  return { ...all, [weekStart]: record };
}

/**
 * The same levels after the first day of the week has changed: each week's record moves to the new week that holds
 * most of the same days. Without this a Monday record would sit a day inside the Sunday week it belongs to, where
 * that week could not find it, and would later be mistaken for a newer one.
 */
export const rekeyed = (all: Levels, weekStartsOn: 0 | 1): Levels =>
  Object.fromEntries(Object.entries(all).map(([key, record]) => [isISODate(key) ? weekStartOf(addDaysISO(key, 3), weekStartsOn) : key, record]));

/** Where a level sorts: High, then Medium, then everything else. Normal and no level are the same. */
export const levelRank = (level: Level | undefined): number => (level === 'high' ? 0 : level === 'medium' ? 1 : 2);

/** The High subjects to name on Home, in the order of the subject list: four at most, and how many are left over. */
export function focusOf(subjects: Subject[], applied: Applied): { named: Subject[]; more: number } {
  const high = subjects.filter((s) => applied.levels[s.id] === 'high');
  return { named: high.slice(0, 4), more: Math.max(0, high.length - 4) };
}

/** Subjects with High first, then Medium, then the rest, each in the order they already had. */
export const byLevel = (subjects: Subject[], applied: Applied): Subject[] =>
  subjects.map((subject, i) => ({ subject, i })).sort((a, b) => levelRank(applied.levels[a.subject.id]) - levelRank(applied.levels[b.subject.id]) || a.i - b.i).map((x) => x.subject);

/** A task's place by its subject's level, for the week the task falls in. A task with no subject sorts with the rest. */
export function taskRank(all: Levels, subjects: Subject[], weekStartsOn: 0 | 1): (task: Task) => number {
  const weeks = new Map<ISODate, Applied>();
  return (task) => {
    if (!task.subjectId) return levelRank(undefined);
    const week = task.scope === 'week' ? task.date : weekStartOf(task.date, weekStartsOn);
    const applied = weeks.get(week) ?? levelsFor(all, week, subjects);
    weeks.set(week, applied);
    return levelRank(applied.levels[task.subjectId]);
  };
}

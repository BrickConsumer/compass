import { isISODate, weekDays, weekdayOf } from './dates';
import { cleanDays } from './habits';
import type { Progress } from './tasks';
import type { Best, ISODate, Measure, Routine, RoutineLine, Workout, WorkoutLine } from './types';
import { cleanWords, type Loose, objects, once, words } from './words';

export { cleanWords };

export const FITNESS_LIMITS = { routines: 20, routineName: 40, lines: 40, line: 140, note: 2000, bests: 20, measures: 12, keptName: 40, bestValue: 24, measureValue: 12, unit: 12 } as const;
const L = FITNESS_LIMITS;

/**
 * Routines from a save: only those with an id and a name, with real weekdays and lines that have words.
 * No list here is cut to its limit. A limit is held where things are added, and the app itself can write one more
 * than a limit (delete a line, add one, press Undo), so cutting on the way in would drop what someone typed.
 */
export function storedRoutines(value: unknown): Routine[] {
  return once(objects(value).flatMap((x): Routine[] => {
    const id = words(x.id), name = cleanWords(words(x.name), L.routineName), createdOn = words(x.createdOn);
    if (!id || !name) return [];
    const lines = once(objects(x.lines).flatMap((l): RoutineLine[] => { const text = cleanWords(words(l.text), L.line); return words(l.id) && text ? [{ id: words(l.id), text }] : []; }));
    // a routine with no day it was made is taken to have been there all along
    return [{ id, name, days: cleanDays(Array.isArray(x.days) ? (x.days as number[]) : []), lines, createdOn: isISODate(createdOn) ? createdOn : '2000-01-01' }];
  }));
}

/** Sessions from a save: only those with an id, a name and a real date, and one at most for each routine on each day. */
export function storedWorkouts(value: unknown): Workout[] {
  const taken = new Set<string>();
  return once(objects(value).flatMap((x): Workout[] => {
    const id = words(x.id), name = cleanWords(words(x.name), L.routineName), date = words(x.date);
    if (!id || !name || !isISODate(date)) return [];
    const lines = once(objects(x.lines).flatMap((l): WorkoutLine[] => { const text = cleanWords(words(l.text), L.line); return words(l.id) && text ? [{ id: words(l.id), text, done: l.done === true }] : []; }));
    return [{ id, routineId: words(x.routineId), name, date, lines, note: words(x.note).slice(0, L.note), ...(words(x.finishedAt) ? { finishedAt: words(x.finishedAt) } : {}), ...(x.milesAwarded === true ? { milesAwarded: true as const } : {}) }];
  })).filter((w) => {
    // a session that names no routine is nobody's second session
    const key = `${w.routineId}|${w.date}`;
    if (!w.routineId) return true;
    return taken.has(key) ? false : !!taken.add(key);
  });
}

/** A best or a measure from a save: only with an id, a name, a value and a real date. The value before is kept only if it is whole. */
function storedKept<T extends Best>(value: unknown, valueLimit: number, more: (x: Loose) => object): T[] {
  return once(objects(value).flatMap((x): T[] => {
    const id = words(x.id), name = cleanWords(words(x.name), L.keptName), now = cleanWords(words(x.value), valueLimit), date = words(x.date);
    if (!id || !name || !now || !isISODate(date)) return [];
    const before = x.was && typeof x.was === 'object' ? (x.was as Loose) : {}, wasValue = cleanWords(words(before.value), valueLimit), wasDate = words(before.date);
    return [{ id, name, value: now, date, ...(wasValue && isISODate(wasDate) ? { was: { value: wasValue, date: wasDate } } : {}), ...more(x) } as T];
  }));
}
export const storedBests = (value: unknown): Best[] => storedKept<Best>(value, L.bestValue, () => ({}));
export const storedMeasures = (value: unknown): Measure[] => storedKept<Measure>(value, L.measureValue, (x) => ({ unit: cleanWords(words(x.unit), L.unit) }));

/** True on one of the routine's weekdays, on or after the day it was made. That is a set session, and nothing is saved for it until it is started. */
export const isSet = (routine: Routine, date: ISODate): boolean => date >= routine.createdOn && routine.days.includes(weekdayOf(date));

/** Where a session stands: set for a day to come, set for today, set for a day that has passed, started, or finished. */
export type SessionState = 'ahead' | 'due' | 'past' | 'started' | 'finished';
/**
 * One session in a week. A set session has its routine and no workout until it is started. A started one has its
 * workout, and its routine too unless the routine has since been deleted. The name is the session's once it is started.
 */
export interface SessionRow { date: ISODate; name: string; state: SessionState; routine?: Routine; workout?: Workout }

/** A day's sessions: the set ones in the order of the routines, each as its session once started, then any others started that day. */
export function sessionsForDay(routines: Routine[], workouts: Workout[], date: ISODate, today: ISODate): SessionRow[] {
  const mine = workouts.filter((w) => w.date === date), listed = new Set<string>();
  const started = (workout: Workout): SessionRow => ({ date, name: workout.name, state: workout.finishedAt ? 'finished' : 'started', routine: routines.find((r) => r.id === workout.routineId), workout });
  const set = routines.filter((r) => isSet(r, date)).map((routine): SessionRow => {
    const workout = mine.find((w) => w.routineId === routine.id);
    if (!workout) return { date, name: routine.name, state: date > today ? 'ahead' : date === today ? 'due' : 'past', routine };
    listed.add(workout.id);
    return started(workout);
  });
  return [...set, ...mine.filter((w) => !listed.has(w.id)).map(started)];
}

/** A week's sessions in date order. Worked out each time from the routines as they are now, and never stored. */
export const sessionsForWeek = (routines: Routine[], workouts: Workout[], weekStart: ISODate, today: ISODate): SessionRow[] => weekDays(weekStart).flatMap((date) => sessionsForDay(routines, workouts, date, today));

/** Finished sessions out of every session listed. */
export const sessionCount = (rows: SessionRow[]): Progress => ({ done: rows.filter((r) => r.state === 'finished').length, total: rows.length });
/** The lines ticked in a session. */
export const ticked = (workout: Workout): Progress => ({ done: workout.lines.filter((l) => l.done).length, total: workout.lines.length });

/** The latest day a routine has a finished session for. It goes by the day the session is for, not the day it was finished. */
export const lastDone = (workouts: Workout[], routineId: string): ISODate | undefined => workouts.filter((w) => w.routineId === routineId && w.finishedAt).map((w) => w.date).sort().at(-1);

/**
 * The routines that can be started today besides the ones already in today's rows. The one not done for longest
 * comes first, and one never done before any: the order alone is the suggestion.
 */
export function offers(routines: Routine[], workouts: Workout[], today: ISODate): Routine[] {
  const inRows = new Set(sessionsForDay(routines, workouts, today, today).map((r) => r.routine?.id));
  // never done sorts before any date, and the sort leaves routines level on that in their own order
  return routines.filter((r) => !inRows.has(r.id)).map((routine) => ({ routine, last: lastDone(workouts, routine.id) ?? '' })).sort((a, b) => a.last.localeCompare(b.last)).map((x) => x.routine);
}

/** A rest day has no session set and none started. With no routine that has a fixed day, no day is called one. */
export const isRestDay = (routines: Routine[], workouts: Workout[], today: ISODate): boolean => routines.some((r) => r.days.length > 0) && sessionsForDay(routines, workouts, today, today).length === 0;

/** Finished sessions, newest first by the day they are for. Of two for one day, the one finished later comes first. */
export const recentWorkouts = (workouts: Workout[]): Workout[] => workouts.filter((w) => w.finishedAt).sort((a, b) => b.date.localeCompare(a.date) || b.finishedAt!.localeCompare(a.finishedAt!));

/** Any routine can be started today. On a day that has passed, only a routine that was set for it. Nothing can be started for a day to come. */
export const canStart = (routine: Routine, date: ISODate, today: ISODate): boolean => date === today || (date < today && isSet(routine, date));

/** A session for a day: the routine's name and lines as they are now, copied, so changing the routine later changes nothing here. */
export const newWorkout = (routine: Routine, date: ISODate, id: string): Workout => ({ id, routineId: routine.id, name: routine.name, date, lines: routine.lines.map((l) => ({ ...l, done: false })), note: '' });

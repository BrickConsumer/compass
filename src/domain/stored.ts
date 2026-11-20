import { STAGE_ORDER } from '../features/voyage/boat/specs';
import { storedWater } from '../features/voyage/waters';
import { isISODate } from './dates';
import { storedLink } from './links';
import type { Assessment, Boat, Habit, Level, Levels, LogEntry, Review, Session, Settings, Task } from './types';
import { type Loose, objects, once, time, words } from './words';

/**
 * What is kept from a save, list by list. A save is read when Compass opens and when a backup is restored, and a
 * backup is a file that can come from anywhere. So nothing in it is taken on trust: a record without what it needs
 * is dropped, a value that is not what it should be is mended or left off, and a record that was whole is kept
 * exactly as it was.
 */

const isPlain = (value: unknown): value is Loose => !!value && typeof value === 'object' && !Array.isArray(value);
const weekdays = (value: unknown): number[] => (Array.isArray(value) ? value.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6) : []);
const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
/** A colour as the boat's paints are kept: six hex digits. */
const isPaint = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

/** A list's strings, and nothing else in it: a habit's ticks, the study session tasks already made. */
export const storedStrings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string' && x !== '') : []);

/**
 * The boat. Each part is kept where it is what it should be: a name, three paints, a stage that is one of the four,
 * and what has been seen. A stage that is not one becomes the first boat, which is always earned.
 */
export function storedBoat(value: unknown, fallback: Boat): Boat {
  const b = isPlain(value) ? value : {}, stage = STAGE_ORDER.find((s) => s === b.stage) ?? STAGE_ORDER[0]!, water = storedWater(b.water);
  return {
    name: words(b.name) || fallback.name,
    hull: isPaint(b.hull) ? b.hull : fallback.hull, sail: isPaint(b.sail) ? b.sail : fallback.sail, pennant: isPaint(b.pennant) ? b.pennant : fallback.pennant,
    stage, seen: storedStrings(b.seen),
    ...(words(b.boundFor) ? { boundFor: words(b.boundFor) } : {}),
    // home waters are saved as nothing at all; the store keeps the water within what has been reached
    ...(water !== 'home' ? { water } : {}),
  };
}

/** The settings: the week's first day, the two switches for the sea, and the name, theme and Fitness switch where they are set. */
export function storedSettings(value: unknown): Settings {
  const s = isPlain(value) ? value : {};
  return {
    weekStartsOn: s.weekStartsOn === 0 ? 0 : 1, seaPaused: s.seaPaused === true, seaFolded: s.seaFolded === true,
    ...(typeof s.name === 'string' ? { name: s.name } : {}),
    ...(s.theme === 'auto' || s.theme === 'light' || s.theme === 'dark' ? { theme: s.theme } : {}),
    ...(typeof s.fitness === 'boolean' ? { fitness: s.fitness } : {}),
  };
}

const SOURCES: LogEntry['source'][] = ['task', 'day-clear', 'habit', 'review', 'workout', 'sample'];
/** The voyage log: entries with a day, a source and miles that are a number, each once. */
export function storedLog(value: unknown): LogEntry[] {
  return once(objects(value).flatMap((x): LogEntry[] => {
    const id = words(x.id), date = words(x.date), source = SOURCES.find((s) => s === x.source), miles = x.miles;
    return id && isISODate(date) && source && typeof x.sourceId === 'string' && typeof miles === 'number' && Number.isFinite(miles) && miles >= 0 ? [{ id, date, source, sourceId: x.sourceId, miles }] : [];
  }));
}

/** Habits with an id and a name. Its days are the real weekdays among them, in the order they were kept. */
export function storedHabits(value: unknown): Habit[] {
  return once(objects(value).flatMap((x): Habit[] => {
    const id = words(x.id), name = words(x.name);
    return id && name ? [{ id, name, days: weekdays(x.days), order: count(x.order), createdOn: words(x.createdOn) }] : [];
  }));
}

/** Study sessions with an id, a subject and a name. */
export function storedSessions(value: unknown): Session[] {
  return once(objects(value).flatMap((x): Session[] => {
    const id = words(x.id), subjectId = words(x.subjectId), name = words(x.name);
    return id && subjectId && name ? [{ id, subjectId, name, days: weekdays(x.days), createdOn: words(x.createdOn) }] : [];
  }));
}

/** Weekly reviews, one for each real week. An answer that is not words is empty, and a rating that is not a number is left off. */
export function storedReviews(value: unknown): Review[] {
  const seen = new Set<string>();
  return objects(value).flatMap((x): Review[] => {
    const weekStart = words(x.weekStart);
    if (!isISODate(weekStart) || seen.has(weekStart)) return [];
    seen.add(weekStart);
    const ratings = isPlain(x.ratings) ? Object.fromEntries(Object.entries(x.ratings).filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1]))) : undefined;
    // the time it was saved is read as a time when the review is shown, so only a time is kept
    return [{ weekStart, wentWell: words(x.wentWell), gotInWay: words(x.gotInWay), change: words(x.change), ...(time(x.savedAt) ? { savedAt: time(x.savedAt) } : {}), ...(ratings ? { ratings } : {}) }];
  });
}

const LEVELS: Level[] = ['high', 'medium', 'normal'];
/** Subject levels, week by week: only real weeks, and only levels that are one of the three. */
export function storedLevels(value: unknown): Levels {
  if (!isPlain(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([week, of]): [string, Record<string, Level>][] =>
    (isISODate(week) && isPlain(of) ? [[week, Object.fromEntries(Object.entries(of).filter((e): e is [string, Level] => LEVELS.some((l) => l === e[1])))]] : [])));
}

/**
 * Tasks with an id, a title and a real day. A task is built again from what a task has, each part kept only if it is
 * what it should be, so nothing of the wrong kind can ride in on one: a task marked done with anything but a time
 * is not done, and a link is kept only if it is a web address. A priority or a scope that is not one makes it an
 * ordinary day's task.
 */
export function storedTasks(value: unknown): Task[] {
  return once(objects(value).flatMap((x): Task[] => {
    const id = words(x.id), title = words(x.title), date = words(x.date);
    if (!id || !title || !isISODate(date)) return [];
    const link = storedLink(x.link), subjectId = words(x.subjectId), sessionId = words(x.sessionId), assessmentId = words(x.assessmentId), completedAt = time(x.completedAt);
    return [{
      id, title, date,
      priority: x.priority === 'high' || x.priority === 'low' ? x.priority : 'normal', scope: x.scope === 'week' ? 'week' : 'day',
      order: count(x.order), createdAt: words(x.createdAt),
      ...(typeof x.notes === 'string' ? { notes: x.notes } : {}), ...(subjectId ? { subjectId } : {}),
      ...(completedAt ? { completedAt } : {}), ...(x.milesAwarded === true ? { milesAwarded: true as const } : {}),
      ...(sessionId ? { sessionId } : {}), ...(link ? { link } : {}), ...(assessmentId ? { assessmentId } : {}),
    }];
  }));
}

const KINDS: Assessment['kind'][] = ['test', 'exam', 'presentation', 'assignment'];
/** Assessments with an id, a title, a subject and a real day. A kind that is not one of the four is a test. */
export function storedAssessments(value: unknown): Assessment[] {
  return once(objects(value).flatMap((x): Assessment[] => {
    const id = words(x.id), title = words(x.title), subjectId = words(x.subjectId), date = words(x.date), link = storedLink(x.link);
    return id && title && subjectId && isISODate(date) ? [{ id, title, subjectId, date, kind: KINDS.find((k) => k === x.kind) ?? 'test', ...(link ? { link } : {}) }] : [];
  }));
}

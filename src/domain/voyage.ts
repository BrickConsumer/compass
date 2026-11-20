import { type StageId, STAGE_ORDER, STAGES } from '../features/voyage/boat/specs';
import { type WaterId, WATER_ORDER, WATERS } from '../features/voyage/waters';
import type { ISODate, LogEntry, Task, Workout } from './types';

/** Starting values, to be tuned with real use (art direction, section 13). */
export const MILES = { task: 2, highPriority: 3, dayClear: 3, dailyTaskCap: 40, habit: 1, dailyHabitCap: 8, review: 10, workout: 2 } as const;

export const STAGE_GATES: Record<StageId, { miles: number; days: number }> = {
  dinghy: { miles: 0, days: 0 }, sloop: { miles: 250, days: 10 }, cutter: { miles: 1000, days: 40 }, schooner: { miles: 3000, days: 120 },
};

/**
 * The miles at which each water is reached. Waters come along the way, between the fittings and the boats, so there is
 * somewhere new long before the last boat. A water needs miles only, never days at sea.
 */
export const WATER_MILES: Record<WaterId, number> = { home: 0, coral: 800, fjords: 2000, ice: 3300 };

/** `phrase` is how the fitting reads inside a sentence: "88 more for a name on the quarter". */
export interface Fitting { id: string; name: string; phrase: string; miles: number; stage: StageId; modelled: boolean }
export const FITTINGS: readonly Fitting[] = [
  { id: 'pennant', name: 'Masthead pennant', phrase: 'a masthead pennant', miles: 25, stage: 'dinghy', modelled: true },
  { id: 'lantern', name: 'Bow lantern', phrase: 'a bow lantern', miles: 60, stage: 'dinghy', modelled: true },
  { id: 'sheer-stripe', name: 'Painted sheer stripe', phrase: 'a painted sheer stripe', miles: 120, stage: 'dinghy', modelled: true },
  { id: 'portlights', name: 'Brass portlights', phrase: 'brass portlights', miles: 350, stage: 'sloop', modelled: true },
  // the id is kept from when the name was to go on the transom, so saved voyages still match
  { id: 'transom-name', name: 'Name lettered on the quarter', phrase: 'a name on the quarter', miles: 500, stage: 'sloop', modelled: true },
  { id: 'dress-flags', name: 'Flags to dress ship', phrase: 'flags to dress ship', miles: 700, stage: 'sloop', modelled: true },
  { id: 'ratlines', name: 'Ratlines and lazy jacks', phrase: 'ratlines and lazy jacks', miles: 1300, stage: 'cutter', modelled: true },
  { id: 'stern-lantern', name: 'Stern lantern', phrase: 'a stern lantern', miles: 1700, stage: 'cutter', modelled: true },
  { id: 'tender', name: 'A tender on deck', phrase: 'a tender on deck', miles: 2200, stage: 'cutter', modelled: true },
  { id: 'topsail', name: 'A topsail', phrase: 'a topsail', miles: 3600, stage: 'schooner', modelled: true },
  { id: 'gilded-stripe', name: 'Gilded cove stripe', phrase: 'a gilded cove stripe', miles: 4500, stage: 'schooner', modelled: true },
];

/** The running total. It can only grow, because the log only grows. */
export const milesLogged = (log: LogEntry[]): number => log.reduce((sum, e) => sum + e.miles, 0);
/** The number of different days on which anything was earned. Not consecutive. */
export const daysAtSea = (log: LogEntry[]): number => new Set(log.map((e) => e.date)).size;

/** The furthest stage earned. A stage needs both its miles and its days at sea. */
export function earnedStage(miles: number, days: number): StageId {
  let stage: StageId = 'dinghy';
  for (const id of STAGE_ORDER) if (miles >= STAGE_GATES[id].miles && days >= STAGE_GATES[id].days) stage = id;
  return stage;
}

/** The furthest water reached. */
export function earnedWater(miles: number): WaterId {
  let water: WaterId = 'home';
  for (const id of WATER_ORDER) if (miles >= WATER_MILES[id]) water = id;
  return water;
}
/** The next water and the miles still to go, or undefined in the last one. */
export function nextWater(miles: number): { id: WaterId; miles: number } | undefined {
  const next = WATER_ORDER[WATER_ORDER.indexOf(earnedWater(miles)) + 1];
  return next ? { id: next, miles: WATER_MILES[next] - miles } : undefined;
}
/** How a water is recorded as seen, apart from the boats and fittings. */
export const waterSeenId = (id: WaterId): string => `water:${id}`;

export const earnedFittings = (miles: number): Fitting[] => FITTINGS.filter((f) => miles >= f.miles);
export const nextFitting = (miles: number): Fitting | undefined => FITTINGS.find((f) => miles < f.miles);

/** The ids of every boat, fitting and water earned so far, boats first. This is what the voyage view marks as seen. Home waters are where everyone starts, and are not listed. */
export const earnedIds = (miles: number, days: number): string[] =>
  [...STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(earnedStage(miles, days)) + 1), ...earnedFittings(miles).map((f) => f.id), ...WATER_ORDER.slice(1, WATER_ORDER.indexOf(earnedWater(miles)) + 1).map(waterSeenId)];

/** What has been earned since the voyage view was last opened. */
export interface Unseen {
  /** The furthest boat earned and not yet seen. */
  stage?: StageId;
  fittings: Fitting[];
  /** The furthest water reached and not yet seen. */
  water?: WaterId;
}

export function unseenRewards(miles: number, days: number, seen: readonly string[]): Unseen {
  const reached = STAGE_ORDER.indexOf(earnedStage(miles, days));
  return {
    stage: STAGE_ORDER.slice(0, reached + 1).reverse().find((id) => !seen.includes(id)),
    fittings: earnedFittings(miles).filter((f) => !seen.includes(f.id)),
    water: WATER_ORDER.slice(1, WATER_ORDER.indexOf(earnedWater(miles)) + 1).reverse().find((id) => !seen.includes(waterSeenId(id))),
  };
}

/**
 * The one quiet line that says something was earned: "New: bow lantern", "The cutter is ready", or "New waters: the coral shallows".
 * A boat comes first, then a water, then a fitting: the rarer news is the one told.
 * In three parts, because the name is set in italic (the chart rule) and the words around it are not.
 */
export function announcement(unseen: Unseen): { lead: string; name: string; tail: string } | null {
  if (unseen.stage) return { lead: '', name: `The ${STAGES[unseen.stage].name.toLowerCase()}`, tail: ' is ready' };
  if (unseen.water) return { lead: 'New waters: ', name: WATERS[unseen.water].phrase, tail: '' };
  const latest = unseen.fittings[unseen.fittings.length - 1];
  if (!latest) return null;
  return { lead: 'New: ', name: latest.phrase.replace(/^an? /, ''), tail: unseen.fittings.length > 1 ? ` and ${unseen.fittings.length - 1} more` : '' };
}

/** The next stage and what is still needed for it, or undefined at the last stage. */
export function nextStage(miles: number, days: number): { id: StageId; miles: number; days: number } | undefined {
  const next = STAGE_ORDER[STAGE_ORDER.indexOf(earnedStage(miles, days)) + 1];
  return next ? { id: next, miles: Math.max(0, STAGE_GATES[next].miles - miles), days: Math.max(0, STAGE_GATES[next].days - days) } : undefined;
}

/**
 * Log entries earned by completing a task. Call with the tasks as they are after the completion.
 * A task earns once. Task miles stop at the daily cap. Finishing every task planned for a day earns a bonus once per date.
 */
export function awardsFor(task: Task, tasksAfter: Task[], log: LogEntry[], today: ISODate): LogEntry[] {
  const out: LogEntry[] = [];
  if (!task.milesAwarded) {
    const earnedToday = log.filter((e) => e.date === today && e.source === 'task').reduce((s, e) => s + e.miles, 0);
    const miles = Math.min(task.priority === 'high' ? MILES.highPriority : MILES.task, Math.max(0, MILES.dailyTaskCap - earnedToday));
    if (miles > 0) out.push({ id: `task:${task.id}`, date: today, source: 'task', sourceId: task.id, miles });
  }
  if (task.scope === 'day') {
    const day = tasksAfter.filter((t) => t.scope === 'day' && t.date === task.date);
    const cleared = day.length > 0 && day.every((t) => t.completedAt), id = `day-clear:${task.date}`;
    if (cleared && !log.some((e) => e.id === id)) out.push({ id, date: today, source: 'day-clear', sourceId: task.date, miles: MILES.dayClear });
  }
  return out;
}

/**
 * The log entry earned by ticking a habit for a day, or null if there is nothing to earn.
 * A habit earns once for each day. Habit miles stop at a daily limit, so a long list of habits cannot be farmed.
 * The entry is dated the day the tick is made, which is the day at sea.
 */
export function habitAward(habitId: string, date: ISODate, log: LogEntry[], today: ISODate): LogEntry | null {
  const id = `habit:${habitId}:${date}`;
  if (log.some((e) => e.id === id)) return null;
  const earnedToday = log.filter((e) => e.date === today && e.source === 'habit').reduce((s, e) => s + e.miles, 0);
  if (earnedToday + MILES.habit > MILES.dailyHabitCap) return null;
  return { id, date: today, source: 'habit', sourceId: `${habitId}:${date}`, miles: MILES.habit };
}

/**
 * The log entry earned by finishing a training session, or null if there is nothing to earn.
 * A session earns the first time it is finished or not at all, and one session's miles at most are logged on any
 * one day, so sessions cannot be started for the miles. The entry is dated the day the session is finished, which
 * is the day at sea, whatever day the session was for.
 */
export function workoutAward(workout: Workout, log: LogEntry[], today: ISODate): LogEntry | null {
  const id = `workout:${today}`;
  if (workout.milesAwarded || log.some((e) => e.id === id)) return null;
  return { id, date: today, source: 'workout', sourceId: workout.id, miles: MILES.workout };
}

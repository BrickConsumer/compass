import { type StageId, STAGE_ORDER } from '../features/voyage/boat/specs';
import type { ISODate, LogEntry, Task } from './types';

/** Starting values, to be tuned with real use (art direction, section 13). */
export const MILES = { task: 2, highPriority: 3, dayClear: 3, dailyTaskCap: 40 } as const;

export const STAGE_GATES: Record<StageId, { miles: number; days: number }> = {
  dinghy: { miles: 0, days: 0 }, sloop: { miles: 250, days: 10 }, cutter: { miles: 1000, days: 40 }, schooner: { miles: 3000, days: 120 },
};

/** `phrase` is how the fitting reads inside a sentence: "88 more for a name on the transom". */
export interface Fitting { id: string; name: string; phrase: string; miles: number; stage: StageId; modelled: boolean }
export const FITTINGS: readonly Fitting[] = [
  { id: 'pennant', name: 'Masthead pennant', phrase: 'a masthead pennant', miles: 25, stage: 'dinghy', modelled: true },
  { id: 'lantern', name: 'Bow lantern', phrase: 'a bow lantern', miles: 60, stage: 'dinghy', modelled: true },
  { id: 'sheer-stripe', name: 'Painted sheer stripe', phrase: 'a painted sheer stripe', miles: 120, stage: 'dinghy', modelled: true },
  { id: 'portlights', name: 'Brass portlights', phrase: 'brass portlights', miles: 350, stage: 'sloop', modelled: true },
  { id: 'transom-name', name: 'Name lettered on the transom', phrase: 'a name on the transom', miles: 500, stage: 'sloop', modelled: false },
  { id: 'dress-flags', name: 'Flags to dress ship', phrase: 'flags to dress ship', miles: 700, stage: 'sloop', modelled: false },
  { id: 'ratlines', name: 'Ratlines and lazy jacks', phrase: 'ratlines and lazy jacks', miles: 1300, stage: 'cutter', modelled: false },
  { id: 'stern-lantern', name: 'Stern lantern', phrase: 'a stern lantern', miles: 1700, stage: 'cutter', modelled: false },
  { id: 'tender', name: 'A tender on deck', phrase: 'a tender on deck', miles: 2200, stage: 'cutter', modelled: false },
  { id: 'topsail', name: 'A topsail', phrase: 'a topsail', miles: 3600, stage: 'schooner', modelled: false },
  { id: 'gilded-stripe', name: 'Gilded cove stripe', phrase: 'a gilded cove stripe', miles: 4500, stage: 'schooner', modelled: false },
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

export const earnedFittings = (miles: number): Fitting[] => FITTINGS.filter((f) => miles >= f.miles);
export const nextFitting = (miles: number): Fitting | undefined => FITTINGS.find((f) => miles < f.miles);

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

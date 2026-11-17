import { addDaysISO, weekdayOf, weekStartOf } from './dates';
import { cleanDays, weekOrder } from './habits';
import type { ISODate, Session } from './types';

/** One session on one day. The list of these says which tasks have already been made, so none is made twice. */
export const madeKey = (sessionId: string, date: ISODate): string => `${sessionId}|${date}`;

export const subjectSessions = (sessions: Session[], subjectId: string): Session[] => sessions.filter((s) => s.subjectId === subjectId);

/**
 * The session tasks still to be made, for the week that today is in.
 *
 * A session becomes an ordinary task on each of its days. A week's tasks are made when the week arrives, so the
 * week strip shows them from its first day. Only days from today on are made: nothing is created for a day that
 * has gone, so opening the app after a few days away does not fill the past with tasks that were never seen.
 * A day is made once. If its task is deleted, for a day off, it is not made again.
 */
export function sessionTasksDue(sessions: Session[], made: readonly string[], today: ISODate, weekStartsOn: 0 | 1): { session: Session; date: ISODate }[] {
  const weekStart = weekStartOf(today, weekStartsOn), due: { session: Session; date: ISODate }[] = [];
  for (const session of sessions) {
    for (let i = 0; i < 7; i++) {
      const date = addDaysISO(weekStart, i);
      if (date >= today && date >= session.createdOn && session.days.includes(weekdayOf(date)) && !made.includes(madeKey(session.id, date))) due.push({ session, date });
    }
  }
  return due;
}

const LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** A session's days as a sentence: "Every Monday, Wednesday and Friday". */
export function daysSentence(days: number[], weekStartsOn: 0 | 1): string {
  const set = cleanDays(days), key = set.join('');
  if (set.length === 7) return 'Every day';
  if (key === '12345') return 'Every weekday';
  const names = weekOrder(weekStartsOn).filter((d) => set.includes(d)).map((d) => LONG[d]!);
  return `Every ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] ?? ''}`;
}

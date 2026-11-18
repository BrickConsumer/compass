import { addDays, differenceInCalendarDays, format, getISOWeek, parseISO, startOfWeek } from 'date-fns';
import { enGB } from 'date-fns/locale';
import type { ISODate } from './types';

const d = (iso: ISODate) => parseISO(iso);
const f = (date: Date, pattern: string) => format(date, pattern, { locale: enGB });

export const toISO = (date: Date): ISODate => format(date, 'yyyy-MM-dd');
export const todayISO = (): ISODate => toISO(new Date());
export const addDaysISO = (iso: ISODate, n: number): ISODate => toISO(addDays(d(iso), n));
export const daysBetween = (from: ISODate, to: ISODate): number => differenceInCalendarDays(d(to), d(from));
export const isISODate = (s: string | null | undefined): s is ISODate => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(d(s).getTime());

/** The first day of the week containing the date. Monday (1) by default, or Sunday (0). */
export const weekStartOf = (iso: ISODate, weekStartsOn: 0 | 1 = 1): ISODate => toISO(startOfWeek(d(iso), { weekStartsOn }));
export const weekDays = (weekStart: ISODate): ISODate[] => Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
export const isoWeek = (iso: ISODate): number => getISOWeek(d(iso));

/** "9 to 15 November", "30 November to 6 December", "28 December 2026 to 3 January 2027". */
export function weekLabel(weekStart: ISODate): string {
  const a = d(weekStart), b = addDays(a, 6);
  if (a.getFullYear() !== b.getFullYear()) return `${f(a, 'd MMMM yyyy')} to ${f(b, 'd MMMM yyyy')}`;
  if (a.getMonth() !== b.getMonth()) return `${f(a, 'd MMMM')} to ${f(b, 'd MMMM')}`;
  return `${f(a, 'd')} to ${f(b, 'd MMMM')}`;
}

/** "Sunday 15 November". */
export const longDate = (iso: ISODate): string => f(d(iso), 'EEEE d MMMM');
/** For the phone headline, where the full weekday would wrap beside the two icon buttons. */
export const shortDate = (iso: ISODate): string => f(d(iso), 'EEE d MMMM');
/** A day in a list, where the year is understood: "Thu 19 Nov". */
export const shortDay = (iso: ISODate): string => f(d(iso), 'EEE d MMM');
/** 0 for Sunday to 6 for Saturday. */
/** "11 Dec". */
export const dayMonth = (iso: ISODate): string => f(d(iso), 'd MMM');
export const weekdayOf = (iso: ISODate): number => d(iso).getDay();
export const weekdayShort = (iso: ISODate): string => f(d(iso), 'EEE');
export const weekdayLong = (iso: ISODate): string => f(d(iso), 'EEEE');
export const dayOfMonth = (iso: ISODate): string => f(d(iso), 'd');

/** "today", "tomorrow", "in 4 days", "yesterday", "3 days ago". */
export function relativeDay(iso: ISODate, today: ISODate): string {
  const n = daysBetween(today, iso);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

/** The title of a day's sheet: "Today", "Tomorrow", "Yesterday", or "Thursday 12". */
export function sheetTitle(iso: ISODate, today: ISODate): string {
  const n = daysBetween(today, iso);
  return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n === -1 ? 'Yesterday' : f(d(iso), 'EEEE d');
}

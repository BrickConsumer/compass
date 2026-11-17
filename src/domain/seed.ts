import { addDaysISO, weekdayOf, weekStartOf } from './dates';
import { isDue, tickKey } from './habits';
import type { Assessment, Boat, Habit, ISODate, LogEntry, Session, Settings, Subject, Task } from './types';

export interface CompassData {
  subjects: Subject[];
  tasks: Task[];
  assessments: Assessment[];
  log: LogEntry[];
  habits: Habit[];
  /** One entry for each habit ticked on each day: see `tickKey`. */
  ticks: string[];
  /** Study sessions that repeat. The sample has none, so its week is the one the brief describes. */
  sessions: Session[];
  /** One entry for each session task already made: see `madeKey`. */
  sessionsMade: string[];
  boat: Boat;
  settings: Settings;
  /** True while the data is the generated sample. */
  sample: boolean;
}

export const SUBJECTS: Subject[] = [
  { id: 'bio', name: 'Biology', colour: 'seafoam', notes: 'Chapters 6 and 7 are on the test. Ask about osmosis in the next lesson.' },
  { id: 'eco', name: 'Economics', colour: 'brass' },
  { id: 'eng', name: 'English', colour: 'rose' },
  { id: 'mat', name: 'Mathematics', colour: 'marine' },
  { id: 'chi', name: 'Chinese', colour: 'heather' },
];

export const DEFAULT_BOAT: Boat = { name: 'The Kestrel', hull: '#0E243A', sail: '#FCF8EE', pennant: '#AB3935', stage: 'sloop', seen: ['dinghy', 'sloop', 'pennant', 'lantern', 'sheer-stripe', 'portlights'] };
export const DEFAULT_SETTINGS: Settings = { weekStartsOn: 1, seaPaused: false, seaFolded: false };

/** A voyage log that totals exactly `miles` over `days` different days, ending yesterday. */
export function sampleLog(miles: number, days: number, today: ISODate): LogEntry[] {
  const n = Math.max(0, Math.floor(days)), total = Math.max(0, Math.floor(miles));
  if (n === 0 || total === 0) return [];
  const base = Math.floor(total / n), extra = total - base * n;
  return Array.from({ length: n }, (_, i) => ({ id: `sample:${i}`, date: addDaysISO(today, -(i + 1) * 2 + 1), source: 'sample' as const, sourceId: `sample:${i}`, miles: base + (i < extra ? 1 : 0) }));
}

/**
 * Sample habits, the four named in the brief, with three weeks of ticks behind them.
 * Three are for every day. Exercise is for three days a week, one of which is always today, so the first run shows all four.
 * Today starts with two of the four ticked.
 */
export function sampleHabits(today: ISODate): { habits: Habit[]; ticks: string[] } {
  const w = weekdayOf(today), every = [0, 1, 2, 3, 4, 5, 6], createdOn = addDaysISO(today, -21);
  const habits: Habit[] = [
    { id: 'hab-read', name: 'Read for 20 minutes', days: every, order: 1, createdOn },
    { id: 'hab-revise', name: 'Complete daily revision', days: every, order: 2, createdOn },
    { id: 'hab-move', name: 'Exercise', days: [w, (w + 2) % 7, (w + 4) % 7].sort((a, b) => a - b), order: 3, createdOn },
    { id: 'hab-plan', name: 'Plan tomorrow', days: every, order: 4, createdOn },
  ];
  // how many days in seven each habit tends to be kept: a believable record, not a perfect one
  const kept = [5, 6, 6, 4], ticks: string[] = [];
  habits.forEach((h, i) => {
    for (let back = 21; back >= 1; back--) { const date = addDaysISO(today, -back); if (isDue(h, date) && (back * 3 + i * 2) % 7 < kept[i]!) ticks.push(tickKey(h.id, date)); }
  });
  ticks.push(tickKey('hab-revise', today), tickKey('hab-move', today));
  return { habits, ticks };
}

/**
 * Sample records, placed around today so the first run shows a week in progress.
 * Subjects, tasks and assessments are the examples named in the brief.
 */
export function seed(today: ISODate): CompassData {
  const week = weekStartOf(today, 1), next = addDaysISO(week, 7), at = (date: ISODate, hour: number) => `${date}T${String(hour).padStart(2, '0')}:00:00.000Z`;
  let n = 0;
  const task = (title: string, date: ISODate, over: Partial<Task> = {}): Task => ({ id: `seed-${++n}`, title, priority: 'normal', scope: 'day', date, order: n, createdAt: at(addDaysISO(today, -7), 8), ...over });
  const done = (date: ISODate, hour = 17) => ({ completedAt: at(date, hour), milesAwarded: true as const });
  const d = (offset: number) => addDaysISO(today, offset);
  const tasks: Task[] = [
    task('Prepare Economics essay', today, { subjectId: 'eco', priority: 'high', notes: 'Outline and the first two paragraphs.' }),
    task('Finish Mathematics exercises 4.1 to 4.6', today, { subjectId: 'mat' }),
    task('Complete Biology revision', today, { subjectId: 'bio', ...done(today, 9) }),
    task('Review English notes', today, { subjectId: 'eng', ...done(today, 10) }),
    task('Plan the week', today, done(today, 8)),
    task('Read chapter 5 of the Biology textbook', d(-1), { subjectId: 'bio', ...done(d(-1)) }),
    task('Chinese character practice', d(-1), { subjectId: 'chi', ...done(d(-1), 18) }),
    task('Mathematics problem set 3', d(-2), { subjectId: 'mat', ...done(d(-2)) }),
    task('Annotate the Economics case study', d(-3), { subjectId: 'eco' }),
    task('Biology flashcards, chapters 6 and 7', d(1), { subjectId: 'bio' }),
    task('Draft the English oral outline', d(1), { subjectId: 'eng', priority: 'high' }),
    task('Mathematics past paper, section A', d(2), { subjectId: 'mat' }),
    task('Chinese listening practice', d(3), { subjectId: 'chi', priority: 'low' }),
    task('Book a library study room', week, { scope: 'week' }),
    task('Organise Biology notes', week, { scope: 'week', subjectId: 'bio' }),
    task('Chinese vocabulary, unit 5', week, { scope: 'week', subjectId: 'chi', ...done(today, 11) }),
    task('Return the Economics library books', week, { scope: 'week', subjectId: 'eco', ...done(today, 12) }),
    task('Revise Biology chapters 6 and 7', next, { scope: 'week', subjectId: 'bio' }),
    task('Finish the Economics essay', next, { scope: 'week', subjectId: 'eco' }),
    task('Rehearse the English oral against a timer', next, { scope: 'week', subjectId: 'eng' }),
  ];
  const assessments: Assessment[] = [
    { id: 'as-1', title: 'Biology test', subjectId: 'bio', date: d(4), kind: 'test' },
    { id: 'as-2', title: 'Economics examination', subjectId: 'eco', date: d(9), kind: 'exam' },
    { id: 'as-3', title: 'English oral presentation', subjectId: 'eng', date: d(12), kind: 'presentation' },
  ];
  return { subjects: SUBJECTS, tasks, assessments, log: sampleLog(412, 23, today), ...sampleHabits(today), sessions: [], sessionsMade: [], boat: DEFAULT_BOAT, settings: DEFAULT_SETTINGS, sample: true };
}

/** A clean start: the same subjects, nothing else, and the first boat. */
export function empty(): CompassData {
  return { subjects: SUBJECTS, tasks: [], assessments: [], log: [], habits: [], ticks: [], sessions: [], sessionsMade: [], boat: { ...DEFAULT_BOAT, stage: 'dinghy', seen: ['dinghy'] }, settings: DEFAULT_SETTINGS, sample: false };
}

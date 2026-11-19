import { addDaysISO, weekdayOf, weekStartOf } from './dates';
import { isDue, tickKey } from './habits';
import { DEFAULT_AREAS } from './ratings';
import type { Assessment, Best, Boat, Feedback, Habit, ISODate, Levels, LogEntry, Measure, Page, QuickLink, RatingArea, Review, Routine, Session, Settings, Subject, Task, Workout } from './types';

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
  /** Weekly reflections, at most one for each week. */
  reviews: Review[];
  /** The user's own pages: notes, checklists, goals, and reading and project pages. */
  pages: Page[];
  /** Links to other sites, in the order shown. Six at most. */
  links: QuickLink[];
  /** The parts of a week that are rated in the review, in the order shown. Six at most, and there may be none. */
  areas: RatingArea[];
  /** Subject levels, week by week: see `levelsFor`. */
  levels: Levels;
  /** What teachers have said, subject by subject. */
  feedback: Feedback[];
  /** Training routines, in the order they were made. Shown only while Fitness is switched on, and kept either way. */
  routines: Routine[];
  /** Training sessions started or finished. A week's set sessions are not kept: they are worked out from the routines. */
  workouts: Workout[];
  /** Bests and measures, kept by hand, in the order they were added. */
  bests: Best[];
  measures: Measure[];
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

/** Sample pages, one of each kind, last changed in the order they are listed. Every change is before today, so a page changed now comes first. */
export function samplePages(today: ISODate): Page[] {
  const stamp = (daysAgo: number, hour: number) => `${addDaysISO(today, -daysAgo)}T${String(hour).padStart(2, '0')}:00:00.000Z`;
  const list = (id: string, items: [string, boolean][]) => items.map(([text, done], i) => ({ id: `${id}-${i + 1}`, text, done }));
  return [
    { id: 'pg-goal', title: 'A B in Mathematics', kind: 'goal', subjectId: 'mat', aimFor: addDaysISO(today, 24), createdAt: stamp(9, 17), updatedAt: stamp(1, 20),
      items: list('pg-goal', [['Redo the last test without notes', true], ['One past paper each week', false], ['Ask about logarithms on Thursday', false]]),
      text: 'I need it to take Economics next year, and the last test showed it is the algebra that lets me down.' },
    { id: 'pg-trip', title: 'Biology field trip', kind: 'checklist', subjectId: 'bio', createdAt: stamp(4, 19), updatedAt: stamp(2, 19),
      items: list('pg-trip', [['Permission slip, signed', true], ['Waterproof jacket', true], ['Notebook and two pencils', false], ['Packed lunch and water', false], ['Phone charger', false]]),
      text: 'The coach leaves from the front gate at 8.15. Back by 4.' },
    { id: 'pg-read', title: 'Reading for English', kind: 'reading', subjectId: 'eng', createdAt: stamp(14, 16), updatedAt: stamp(3, 21),
      items: list('pg-read', [['The set novel, chapters 1 to 4', true], ['The set play, Act 1', false], ['Three poems from the anthology', false], ['One article of my own choosing', false]]),
      text: '' },
    { id: 'pg-oral', title: 'Ideas for the English oral', kind: 'note', subjectId: 'eng', createdAt: stamp(5, 20), updatedAt: stamp(4, 20), items: [],
      text: 'Open with the lighthouse scene, then the letter.\n\nKeep it to four minutes. Practise the ending most, because that is where I rush.' },
    { id: 'pg-case', title: 'Economics case study', kind: 'project', subjectId: 'eco', aimFor: addDaysISO(today, 10), createdAt: stamp(12, 15), updatedAt: stamp(5, 18),
      items: list('pg-case', [['Choose the company', true], ['Read the annual report summary', true], ['Collect five years of prices', true], ['Draw the supply and demand diagrams', false], ['Write the analysis', false], ['Write the evaluation', false], ['Check the references', false]]),
      text: 'About 1,200 words. Diagrams count toward the mark, so label every axis.' },
  ];
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
 * A sample training week, placed around today as the tasks are: Intervals is always today, Strength two days either
 * side of it, and a long run three days on. Every session is finished and has had its miles, so none can earn and
 * the sample's log stays the 412 miles it has always been. The one measure is a resting heart rate: nothing about
 * weight or food.
 */
export function sampleFitness(today: ISODate): Pick<CompassData, 'routines' | 'workouts' | 'bests' | 'measures'> {
  const d = (offset: number) => addDaysISO(today, offset), wd = (offset: number) => weekdayOf(d(offset)), createdOn = d(-28);
  const routine = (id: string, name: string, days: number[], lines: string[]): Routine => ({ id, name, days: [...days].sort((a, b) => a - b), lines: lines.map((text, i) => ({ id: `${id}-${i + 1}`, text })), createdOn });
  const strength = routine('rt-strength', 'Strength', [wd(-2), wd(2)], ['Squat, 3 × 5 at 60 kg', 'Bench press, 3 × 8 at 40 kg', 'Row, 3 × 8 at 35 kg', 'Overhead press, 3 × 6 at 25 kg', 'Plank, 3 × 40 seconds']);
  const intervals = routine('rt-intervals', 'Intervals', [wd(0)], ['Warm up, 10 minutes easy', 'Drills: high knees and strides', '6 × 400 m, 90 seconds rest', 'Cool down, 10 minutes', 'Stretch calves and hips', 'Plank, 3 × 40 seconds']);
  const long = routine('rt-long', 'Long run', [wd(3)], ['Easy pace, 8 to 10 km', 'Walk for 5 minutes', 'Stretch']);
  const stretch = routine('rt-stretch', 'Stretch', [], ['Hips', 'Hamstrings', 'Calves', 'Shoulders']);
  const done = (id: string, from: Routine, offset: number, note: string, left = 0): Workout => ({ id, routineId: from.id, name: from.name, date: d(offset), lines: from.lines.map((l, i) => ({ ...l, done: i < from.lines.length - left })), note, finishedAt: `${d(offset)}T18:00:00.000Z`, milesAwarded: true });
  return {
    routines: [strength, intervals, long, stretch],
    workouts: [
      done('wk-1', strength, -2, 'Squat felt easier than last week.'),
      done('wk-2', long, -4, '9 km by the river. Legs heavy at the start.'),
      done('wk-3', intervals, -7, 'Cut the last rep short.', 1),
      done('wk-4', stretch, -9, ''),
    ],
    bests: [
      { id: 'bs-1', name: '5 km', value: '24:10', date: d(-11), was: { value: '24:52', date: d(-39) } },
      { id: 'bs-2', name: 'Squat', value: '60 kg × 5', date: d(-2), was: { value: '57.5 kg × 5', date: d(-16) } },
      { id: 'bs-3', name: 'Plank', value: '1:30', date: d(-16) },
    ],
    measures: [{ id: 'ms-1', name: 'Resting heart rate', unit: 'bpm', value: '58', date: d(-3), was: { value: '61', date: d(-17) } }],
  };
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
  // last week's review, already saved, so the list of earlier reviews has something in it
  const reviews: Review[] = [{ weekStart: addDaysISO(week, -7), wentWell: 'Kept up with Biology revision most days.', gotInWay: 'Left the Economics case study too late.', change: 'Start the Economics essay on Monday.', savedAt: at(addDaysISO(week, -1), 18), ratings: { 'area-study': 7, 'area-health': 6, 'area-sleep': 5, 'area-discipline': 7 } }];
  // the sample shows what a subject's page can hold: Biology has a topic and one piece of feedback. No task is touched by either
  const subjects = SUBJECTS.map((s) => (s.id === 'bio' ? { ...s, topic: 'Cell structure and transport' } : s));
  const feedback: Feedback[] = [{ id: 'fb-1', subjectId: 'bio', date: d(-5), about: 'Practical report', words: 'A clear method. Explain what the results mean, not only what they were.', work: 'Say what each result means' }];
  return { subjects, feedback, tasks, assessments, log: sampleLog(412, 23, today), ...sampleHabits(today), ...sampleFitness(today), sessions: [], sessionsMade: [], reviews, pages: samplePages(today), links: [], areas: DEFAULT_AREAS, levels: {}, boat: DEFAULT_BOAT, settings: DEFAULT_SETTINGS, sample: true };
}

/** A clean start: the same subjects, nothing else, and the first boat. */
export function empty(): CompassData {
  return { subjects: SUBJECTS, tasks: [], assessments: [], log: [], habits: [], ticks: [], sessions: [], sessionsMade: [], reviews: [], pages: [], feedback: [], routines: [], workouts: [], bests: [], measures: [], links: [], areas: DEFAULT_AREAS, levels: {}, boat: { ...DEFAULT_BOAT, stage: 'dinghy', seen: ['dinghy'] }, settings: DEFAULT_SETTINGS, sample: false };
}

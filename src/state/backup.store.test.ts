import { beforeEach, describe, expect, it } from 'vitest';
import { isISODate, todayISO, weekStartOf } from '../domain/dates';
import { searchAll } from '../domain/search';
import { sortPages } from '../domain/pages';
import { weekSummary } from '../domain/review';
import type { CompassData } from '../domain/seed';
import { carryOver, sortTasks, upcomingAssessments } from '../domain/tasks';
import { recentWorkouts, sessionsForWeek } from '../domain/fitness';
import { backupText, readBackup } from '../domain/backup';
import { backupData, DATA_KEYS, dataOf, openSave, useCompass } from './store';

const s = () => useCompass.getState();
const today = todayISO(), week = weekStartOf(today, 1);
/** What the browser would have saved, read back as text is: no `undefined`, nothing shared with the store. */
const asSaved = () => JSON.parse(JSON.stringify(dataOf(s())));

/** One of every kind of record Compass keeps, made the way a person makes them. */
function fill() {
  s().clearAll();
  const subject = s().addSubject('Geography')!;
  s().updateSubject(subject, { topic: 'Rivers', notes: 'Bring the field notebook' });
  s().addSubjectLink(subject, { name: 'Maps', url: 'example.org/maps' });
  const test = s().addAssessment({ title: 'Rivers test', subjectId: subject, date: today, kind: 'test' })!;
  s().setAssessmentLink(test, 'example.org/notice');
  const task = s().addTask({ title: 'Label the diagram', date: today, scope: 'day', priority: 'high', subjectId: subject, notes: 'Use a ruler', link: 'example.org/diagram', assessmentId: test })!;
  s().toggleTask(task);
  s().addTask({ title: 'Read chapter 4', date: week, scope: 'week' });
  const entry = s().addFeedback({ subjectId: subject, date: today, about: 'Essay', words: 'Give more examples.', work: 'Add two case studies' })!;
  s().makeFeedbackTask(entry);
  s().addSession({ subjectId: subject, name: 'Map practice', days: [1, 4] });
  // every day, so it can be ticked whatever day the tests are run on
  const habit = s().addHabit('Stretch')!;
  s().toggleHabit(habit, today);
  const area = s().addArea('Sleep')!;
  s().writeReview(week, { wentWell: 'Kept up', change: 'Start earlier' });
  s().rateReview(week, area, 7);
  s().saveReview(week);
  s().setLevel(week, subject, 'high');
  s().addLink({ name: 'Portal', url: 'portal.example.org' });
  const interest = s().addInterest({ name: '', forms: 'investing' })!;
  const company = s().startPage(interest, 'company')!;
  s().updatePage(company, { title: 'Example Carriers' });
  s().setPageField(company, s().pages.find((p) => p.id === company)!.fields![0]!.id, 'Freight');
  s().setPageLink(company, 'example.org/report');
  s().startPage(interest, 'route');
  const goal = s().addPage('goal', { title: 'Run 5 km', subjectId: subject });
  s().updatePage(goal, { aimFor: today, text: 'By the spring' });
  s().addPageItem(goal, 'Three runs a week');
  s().setReached(goal, true);
  s().addHeadline({ title: 'Port reopens', url: 'example.org/port', date: today, tag: 'XYZ' });
  s().setSettings({ fitness: true, name: 'Sam', weekStartsOn: 1, theme: 'dark', seaFolded: true });
  const routine = s().addRoutine('Legs')!;
  s().updateRoutine(routine, { days: [1, 3] });
  s().addRoutineLine(routine, 'Squat, 3 × 5');
  const workout = s().startWorkout(routine, today)!;
  s().setWorkoutNote(workout, 'Felt strong');
  s().finishWorkout(workout);
  const best = s().addKept('bests', { name: 'Squat', value: '60 kg', date: today })!;
  s().newKept('bests', best, '62.5 kg');
  s().addKept('measures', { name: 'Resting pulse', value: '58', unit: 'bpm', date: today });
  s().setBoat({ name: 'Wren', boundFor: 'A place at university' });
}

beforeEach(() => { s().resetSample(); s().setSettings({ theme: 'auto', fitness: false }); });

describe('opening a save', () => {
  it('opens the sample exactly as it was saved', () => {
    const before = asSaved();
    expect(dataOf(openSave(before, s()))).toEqual(before);
  });

  it('opens one of every kind of record exactly as it was saved', () => {
    fill();
    const before = asSaved();
    // every list has something in it, so nothing is passing by being empty
    for (const key of ['tasks', 'subjects', 'assessments', 'feedback', 'sessions', 'habits', 'ticks', 'reviews', 'areas', 'links', 'pages', 'interests', 'headlines', 'routines', 'workouts', 'bests', 'measures', 'log'] as const) expect(before[key].length, key).toBeGreaterThan(0);
    expect(Object.keys(before.levels)).toHaveLength(1);
    s().clearAll();
    expect(dataOf(openSave(before, s()))).toEqual(before);
  });

  it('reads only what Compass keeps, so nothing in a save can replace what Compass does', () => {
    const save = { ...asSaved(), clearAll: 1, addTask: 'no', nonsense: { a: 1 } };
    const opened = openSave(save, s()) as unknown as Record<string, unknown>;
    expect(typeof opened.clearAll).toBe('function');
    expect(typeof opened.addTask).toBe('function');
    expect(opened.nonsense).toBeUndefined();
    expect(DATA_KEYS).toHaveLength(23);
  });

  it('opens with a boat and settings that are not what they should be, mended', () => {
    const save = { ...asSaved(), boat: { name: 'Wren', stage: 7 }, settings: ['dark'], log: ['nonsense', { id: 'x', date: today, source: 'task', sourceId: 't', miles: 2 }], habits: 'none', ticks: [1, 2], levels: [] };
    const opened = openSave(save, s());
    expect(opened.boat).toMatchObject({ name: 'Wren', stage: 'dinghy', seen: [] });
    expect(opened.settings).toEqual({ weekStartsOn: 1, seaPaused: false, seaFolded: false });
    expect(opened.log).toEqual([{ id: 'x', date: today, source: 'task', sourceId: 't', miles: 2 }]);
    expect(opened.ticks).toEqual([]);
    expect(opened.levels).toEqual({});
  });

  it('is what the browser\'s own save goes through', () => {
    const merge = useCompass.persist.getOptions().merge!;
    const save = { ...asSaved(), clearAll: 1, boat: { name: 'Wren' } };
    const opened = merge(save, s()) as ReturnType<typeof s>;
    expect(typeof opened.clearAll).toBe('function');
    expect(opened.boat.stage).toBe('dinghy');
    // a save that cannot be read at all leaves what is there
    expect(merge('nonsense', s())).toBe(s());
    expect(merge({ tasks: 'x' }, s())).toBe(s());
  });
});

describe('restoring a backup', () => {
  /** A backup of what is in the store now, as the file would be read back. */
  const backedUp = () => { const read = readBackup(backupText(dataOf(s()), new Date().toISOString())); if (!read.ok) throw new Error(read.why); return read.data; };

  it('says what a backup would restore, without changing anything', () => {
    fill();
    const file = backedUp(), before = asSaved();
    s().resetSample();
    const sample = asSaved();
    expect(backupData(file)).toEqual(before);
    expect(asSaved()).toEqual(sample);
  });

  it('replaces everything with what the backup holds, and keeps this device\'s theme', () => {
    fill();
    const file = backedUp(), held = asSaved();
    s().resetSample();
    s().setSettings({ theme: 'light' });
    s().restoreBackup(file);
    expect(asSaved()).toEqual({ ...held, settings: { ...held.settings, theme: 'light' } });
    expect(s().sample).toBe(false);
    // the theme is the device's even when the device has none set
    s().resetSample();
    s().setSettings({ theme: 'auto' });
    s().restoreBackup({ ...file, settings: { weekStartsOn: 1, seaPaused: false, seaFolded: false, theme: 'dark' } });
    expect(s().settings.theme).toBe('auto');
  });

  it('gives back what was there, and Undo puts it all back', () => {
    fill();
    const file = backedUp();
    s().resetSample();
    s().addTask({ title: 'Only here', date: today, scope: 'day' });
    const here = asSaved(), before = s().restoreBackup(file);
    expect(JSON.parse(JSON.stringify(before))).toEqual(here);
    expect(s().tasks.some((t) => t.title === 'Only here')).toBe(false);
    s().undoRestore(before);
    expect(asSaved()).toEqual(here);
    // what Compass does is still there after both
    expect(s().addTask({ title: 'After', date: today, scope: 'day' })).not.toBeNull();
  });

  it('restores a backup that was edited by hand with only the broken parts lost', () => {
    fill();
    const file = backedUp() as Record<string, any>;
    file.tasks.push('nonsense', { id: 'bad', title: 'No day' });
    file.boat = { name: 'Edited' };
    file.pages[0].link = 'javascript:alert(1)';
    file.headlines.push({ id: 'h-bad', title: 'Bad', url: 'file:///etc/hosts', date: today });
    file.clearAll = 'gone';
    const tasks = s().tasks.length, headlines = s().headlines.length;
    s().resetSample();
    s().restoreBackup(file);
    expect(s().tasks).toHaveLength(tasks);
    expect(s().headlines).toHaveLength(headlines);
    expect(s().boat).toMatchObject({ name: 'Edited', stage: 'dinghy' });
    expect(s().pages[0]!.link).toBeUndefined();
    expect(typeof s().clearAll).toBe('function');
  });

  it('restores a backup of the sample as the sample, and an older backup with nothing lost', () => {
    const file = backedUp() as Record<string, any>;
    s().clearAll();
    s().restoreBackup(file);
    expect(s().sample).toBe(true);
    expect(s().tasks.length).toBeGreaterThan(0);
    // a backup from before interests and headlines existed
    delete file.interests; delete file.headlines;
    s().restoreBackup(file);
    expect([s().interests, s().headlines]).toEqual([[], []]);
    expect(s().pages).toHaveLength(5);
  });
});

// Found by the review of the whole change

describe('what the review found', () => {
  type Check = (value: unknown) => boolean;
  const str: Check = (v) => typeof v === 'string', filled: Check = (v) => typeof v === 'string' && v !== '', num: Check = (v) => typeof v === 'number' && Number.isFinite(v);
  const day: Check = (v) => typeof v === 'string' && isISODate(v), time: Check = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v)), web: Check = (v) => typeof v === 'string' && /^https?:\/\//.test(v);
  const oneOf = (...values: unknown[]): Check => (v) => values.includes(v), weekdays: Check = (v) => Array.isArray(v) && v.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const maybe = (check: Check): Check => (v) => v === undefined || check(v);
  /** A list of records, each with exactly these fields and nothing else. */
  const listOf = (shape: Record<string, Check>): Check => (v) => Array.isArray(v) && v.every((x) => !!x && typeof x === 'object' && Object.keys(x).every((k) => k in shape) && Object.entries(shape).every(([k, check]) => check((x as Record<string, unknown>)[k])));
  const link = { id: filled, name: str, url: web };
  /** What every page relies on being true of what is kept. A record that passes can be drawn, sorted and searched. */
  const SHAPE: Record<keyof CompassData, Check> = {
    tasks: listOf({ id: filled, title: filled, date: day, priority: oneOf('high', 'normal', 'low'), scope: oneOf('day', 'week'), order: num, createdAt: str, notes: maybe(str), subjectId: maybe(filled), completedAt: maybe(time), milesAwarded: maybe(oneOf(true)), sessionId: maybe(filled), link: maybe(web), assessmentId: maybe(filled) }),
    subjects: listOf({ id: filled, name: filled, colour: oneOf('marine', 'teal', 'seafoam', 'moss', 'brass', 'clay', 'rose', 'heather'), notes: maybe(str), topic: maybe(filled), links: maybe(listOf(link)) }),
    assessments: listOf({ id: filled, title: filled, subjectId: filled, date: day, kind: oneOf('test', 'exam', 'presentation', 'assignment'), link: maybe(web) }),
    log: listOf({ id: filled, date: day, source: oneOf('task', 'day-clear', 'habit', 'review', 'workout', 'sample'), sourceId: str, miles: num }),
    habits: listOf({ id: filled, name: filled, days: weekdays, order: num, createdOn: str }),
    ticks: (v) => Array.isArray(v) && v.every(filled), sessionsMade: (v) => Array.isArray(v) && v.every(filled),
    sessions: listOf({ id: filled, subjectId: filled, name: filled, days: weekdays, createdOn: str }),
    reviews: listOf({ weekStart: day, wentWell: str, gotInWay: str, change: str, savedAt: maybe(time), ratings: maybe((v) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every(num)) }),
    pages: listOf({ id: filled, title: filled, kind: oneOf('note', 'checklist', 'goal', 'reading', 'project'), items: listOf({ id: filled, text: filled, done: oneOf(true, false) }), text: str, aimFor: maybe(day), subjectId: maybe(filled), interestId: maybe(filled), form: maybe(filled), fields: maybe(listOf({ id: filled, label: filled, text: str })), link: maybe(web), reachedOn: maybe(day), createdAt: time, updatedAt: time }),
    links: listOf(link), areas: listOf({ id: filled, name: filled }),
    levels: (v) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.entries(v).every(([week, of]) => day(week) && !!of && typeof of === 'object' && Object.values(of).every(oneOf('high', 'medium', 'normal'))),
    feedback: listOf({ id: filled, subjectId: filled, date: day, about: str, words: filled, work: str, taskId: maybe(filled) }),
    routines: listOf({ id: filled, name: filled, days: weekdays, lines: listOf({ id: filled, text: filled }), createdOn: day }),
    workouts: listOf({ id: filled, routineId: str, name: filled, date: day, lines: listOf({ id: filled, text: filled, done: oneOf(true, false) }), note: str, finishedAt: maybe(time), milesAwarded: maybe(oneOf(true)) }),
    bests: listOf({ id: filled, name: filled, value: filled, date: day, was: maybe((v) => !!v && typeof v === 'object' && filled((v as { value: unknown }).value) && day((v as { date: unknown }).date)) }),
    measures: listOf({ id: filled, name: filled, value: filled, date: day, unit: str, was: maybe((v) => !!v && typeof v === 'object' && filled((v as { value: unknown }).value) && day((v as { date: unknown }).date)) }),
    interests: listOf({ id: filled, name: filled, forms: oneOf('investing', 'law', 'none') }),
    headlines: listOf({ id: filled, title: filled, url: web, source: filled, date: day, tag: str }),
    boat: (v) => listOf({ name: filled, hull: (c) => /^#[0-9a-f]{6}$/i.test(String(c)), sail: (c) => /^#[0-9a-f]{6}$/i.test(String(c)), pennant: (c) => /^#[0-9a-f]{6}$/i.test(String(c)), stage: oneOf('dinghy', 'sloop', 'cutter', 'schooner'), seen: (x) => Array.isArray(x) && x.every(filled), boundFor: maybe(filled) })([v]),
    settings: (v) => listOf({ weekStartsOn: oneOf(0, 1), seaPaused: oneOf(true, false), seaFolded: oneOf(true, false), name: maybe(str), theme: maybe(oneOf('auto', 'light', 'dark')), fitness: maybe(oneOf(true, false)) })([v]),
    sample: oneOf(true, false),
  };
  const wrong = (data: CompassData): string[] => DATA_KEYS.filter((key) => !SHAPE[key](data[key]));
  /** What the pages do with what is kept: none of it may throw. */
  const use = (d: CompassData) => {
    sortTasks(d.tasks); carryOver(d.tasks, today); upcomingAssessments(d.assessments, today); weekSummary(d, week, today);
    sortPages(d.pages); recentWorkouts(d.workouts); sessionsForWeek(d.routines, d.workouts, week, today); searchAll({ ...d, settings: { ...d.settings, fitness: true } }, 'aa');
  };

  it('holds what it says of everything a person can make', () => {
    fill();
    expect(wrong(dataOf(s()))).toEqual([]);
    s().resetSample();
    expect(wrong(JSON.parse(JSON.stringify(dataOf(s()))))).toEqual([]);
  });

  it('opens a save with a value of the wrong kind in any field of any record, and what is kept can still be drawn', () => {
    fill();
    const whole = asSaved(), junk = [true, 7, {}, [], ['2026-11-19'], 'x', null, { id: 'x', length: 3 }];
    let tried = 0;
    const attempt = (save: unknown, what: string) => {
      tried++;
      let opened: CompassData;
      try { opened = dataOf(openSave(save, s())); } catch (e) { throw new Error(`${what}: opening threw ${(e as Error).message}`); }
      expect(wrong(opened), what).toEqual([]);
      try { use(opened); } catch (e) { throw new Error(`${what}: using it threw ${(e as Error).message}`); }
    };
    for (const key of DATA_KEYS) {
      const value = whole[key];
      for (const bad of junk) {
        // the whole of it, as the wrong kind of thing. The four a save cannot be opened without are left: without them it is refused whole
        if (!['tasks', 'log', 'boat', 'settings'].includes(key)) attempt({ ...whole, [key]: bad }, `${key} = ${JSON.stringify(bad)}`);
        const records: [string | number, Record<string, unknown>][] = Array.isArray(value) ? value.map((x: Record<string, unknown>, i: number) => [i, x]) : value && typeof value === 'object' ? [['', value]] : [];
        for (const [at, record] of records) {
          if (!record || typeof record !== 'object') continue;
          for (const field of Object.keys(record)) {
            const changed = { ...record, [field]: bad }, next = Array.isArray(value) ? value.map((x: unknown, i: number) => (i === at ? changed : x)) : changed;
            attempt({ ...whole, [key]: next }, `${key}[${at}].${field} = ${JSON.stringify(bad)}`);
            // and a field inside a list inside it: a page's items, a routine's lines, a subject's links
            const inner = record[field];
            if (Array.isArray(inner) && inner[0] && typeof inner[0] === 'object') for (const sub of Object.keys(inner[0])) {
              const deeper = { ...record, [field]: [{ ...inner[0], [sub]: bad }, ...inner.slice(1)] };
              attempt({ ...whole, [key]: Array.isArray(value) ? value.map((x: unknown, i: number) => (i === at ? deeper : x)) : deeper }, `${key}[${at}].${field}[0].${sub} = ${JSON.stringify(bad)}`);
            }
          }
        }
      }
    }
    expect(tried).toBeGreaterThan(1500);
  });

  it('keeps each subject and each page once', () => {
    fill();
    const save = asSaved();
    save.subjects.push({ ...save.subjects[0], name: 'Twice' });
    save.pages.push({ ...save.pages[0], title: 'Twice' });
    const opened = openSave(save, s());
    expect(opened.subjects.map((x) => x.id)).toEqual([...new Set(opened.subjects.map((x) => x.id))]);
    expect(opened.pages.map((x) => x.id)).toEqual([...new Set(opened.pages.map((x) => x.id))]);
    expect(opened.subjects.some((x) => x.name === 'Twice')).toBe(false);
  });

  it("gives a save of the user's own nothing from the sample for a list it does not have", () => {
    s().clearAll();
    const save = asSaved();
    delete save.assessments;
    expect(save.sample).toBe(false);
    // opened where the sample is what there is to fall back on, as a restore does
    s().resetSample();
    expect(s().assessments.length).toBeGreaterThan(0);
    expect(openSave(save, s()).assessments).toEqual([]);
  });
});

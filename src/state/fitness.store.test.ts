import { beforeEach, describe, expect, it } from 'vitest';
import { addDaysISO, todayISO, weekdayOf } from '../domain/dates';
import { daysAtSea, milesLogged } from '../domain/voyage';
import { useCompass } from './store';

const s = () => useCompass.getState();
const merge = (saved: unknown) => useCompass.persist.getOptions().merge!(saved, s()) as ReturnType<typeof s>;
const LISTS = ['routines', 'workouts', 'bests', 'measures'] as const;

// the switch is kept through a reset, so it is put back first
beforeEach(() => { s().setSettings({ fitness: false }); s().resetSample(); });

describe('fitness: records and the saved data', () => {
  it('starts with Fitness off and an invented training week, and no sample count changed', () => {
    expect(s().settings.fitness).toBeFalsy();
    expect(s().routines.map((r) => r.name)).toEqual(['Strength', 'Intervals', 'Long run', 'Stretch']);
    expect(s().routines[1]!.days).toEqual([weekdayOf(todayISO())]);
    expect(s().routines[3]!.days).toEqual([]);
    expect(s().workouts.map((w) => [w.name, w.date])).toEqual([['Strength', addDaysISO(todayISO(), -2)], ['Long run', addDaysISO(todayISO(), -4)], ['Intervals', addDaysISO(todayISO(), -7)], ['Stretch', addDaysISO(todayISO(), -9)]]);
    expect(s().workouts.every((w) => w.finishedAt && w.milesAwarded)).toBe(true);
    expect(s().bests.map((b) => [b.name, b.value])).toEqual([['5 km', '24:10'], ['Squat', '60 kg × 5'], ['Plank', '1:30']]);
    expect(s().measures.map((m) => [m.name, m.value, m.unit, m.was?.value])).toEqual([['Resting heart rate', '58', 'bpm', '61']]);
    expect(milesLogged(s().log)).toBe(412);
    expect(daysAtSea(s().log)).toBe(23);
    expect(s().log.some((e) => e.source === 'workout')).toBe(false);
    expect(s().tasks).toHaveLength(20);
    expect(s().habits).toHaveLength(4);
  });

  it('opens a save from before this piece with nothing lost', () => {
    const own = JSON.parse(JSON.stringify({ ...s(), sample: false })), sample = JSON.parse(JSON.stringify(s()));
    for (const k of LISTS) { delete own[k]; delete sample[k]; }
    const merged = merge(own);
    expect(LISTS.map((k) => merged[k])).toEqual([[], [], [], []]);
    expect(merged.tasks).toHaveLength(20);
    expect(merged.settings.fitness).toBeFalsy();
    expect(merge(sample).routines).toHaveLength(4);
  });

  it('drops what is not a record from a save', () => {
    const save = JSON.parse(JSON.stringify(s()));
    save.routines = [null, { id: 'r1' }, { id: 'r2', name: 'Run', days: [3, 12], lines: [{ id: 'a', text: 'Go' }, { id: 'b' }] }];
    save.workouts = [{ id: 'w1', name: 'Run' }, { id: 'w2', routineId: 'r2', name: 'Run', date: '2026-11-16', lines: [] }, { id: 'w3', routineId: 'r2', name: 'Run', date: '2026-11-16' }];
    save.bests = 'nonsense'; save.measures = [{ id: 'm1', name: 'Sleep' }];
    const merged = merge(save);
    expect(merged.routines.map((r) => [r.id, r.days, r.lines.length])).toEqual([['r2', [3], 1]]);
    expect(merged.workouts.map((w) => w.id)).toEqual(['w2']);
    expect(merged.bests).toEqual([]);
    expect(merged.measures).toEqual([]);
  });

  it('keeps the switch through "Clear everything" and "Reset the sample data", and clears the rest', () => {
    s().setSettings({ fitness: true });
    s().clearAll();
    expect(s().settings.fitness).toBe(true);
    expect(LISTS.map((k) => s()[k])).toEqual([[], [], [], []]);
    s().resetSample();
    expect(s().settings.fitness).toBe(true);
    expect(s().routines).toHaveLength(4);
  });
});

const named = (name: string) => s().routines.find((r) => r.name === name)!;

describe('fitness: routines', () => {
  it('adds a routine by name with no days and no lines, and keeps its last good name', () => {
    s().clearAll();
    expect(s().addRoutine('   ')).toBeNull();
    const id = s().addRoutine('  Swim   squad ')!;
    expect(s().routines).toEqual([{ id, name: 'Swim squad', days: [], lines: [], createdOn: todayISO() }]);
    s().updateRoutine(id, { name: '  ', days: [6, 1, 1, 9] });
    expect(s().routines[0]).toMatchObject({ name: 'Swim squad', days: [1, 6] });
    s().updateRoutine(id, { days: [] });
    expect(s().routines[0]!.days).toEqual([]);
  });

  it("keeps a routine's lines as typed, in the order they are put", () => {
    s().clearAll();
    const id = s().addRoutine('Gym')!, texts = () => s().routines[0]!.lines.map((l) => l.text);
    expect(s().addRoutineLine(id, ' Squat,  3 × 5 at 60 kg ')).toBe(true);
    expect(s().addRoutineLine(id, '   ')).toBe(false);
    s().addRoutineLine(id, 'Plank');
    expect(texts()).toEqual(['Squat, 3 × 5 at 60 kg', 'Plank']);
    const plank = s().routines[0]!.lines[1]!.id;
    s().moveRoutineLine(id, plank, -1);
    expect(texts()).toEqual(['Plank', 'Squat, 3 × 5 at 60 kg']);
    s().editRoutineLine(id, plank, '  ');
    s().editRoutineLine(id, plank, 'Plank, 3 × 40 seconds');
    expect(texts()[0]).toBe('Plank, 3 × 40 seconds');
    s().deleteRoutineLine(id, plank);
    expect(texts()).toEqual(['Squat, 3 × 5 at 60 kg']);
  });

  it('stops at 20 routines and 40 lines', () => {
    s().clearAll();
    for (let i = 0; i < 20; i++) s().addRoutine(`Routine ${i}`);
    expect(s().addRoutine('One more')).toBeNull();
    const id = s().routines[0]!.id;
    for (let i = 0; i < 40; i++) s().addRoutineLine(id, `Line ${i}`);
    expect(s().addRoutineLine(id, 'One more')).toBe(false);
    expect(s().routines[0]!.lines).toHaveLength(40);
  });

  it('deletes a routine and puts it back where it was, keeping the sessions done from it', () => {
    const gone = s().deleteRoutine(named('Intervals').id)!;
    expect(s().routines.map((r) => r.name)).toEqual(['Strength', 'Long run', 'Stretch']);
    expect(s().workouts).toHaveLength(4);
    s().restoreRoutine(gone.routine, gone.index);
    expect(s().routines.map((r) => r.name)).toEqual(['Strength', 'Intervals', 'Long run', 'Stretch']);
  });
});

const today = () => todayISO(), at = (id: string) => s().workouts.find((w) => w.id === id)!;

describe('fitness: sessions and their miles', () => {
  it('starts a session as a copy of its routine, once for a day', () => {
    const r = named('Intervals'), id = s().startWorkout(r.id, today())!;
    expect(at(id)).toMatchObject({ routineId: r.id, name: 'Intervals', date: today(), note: '' });
    expect(at(id).lines.map((l) => [l.text, l.done])).toEqual(r.lines.map((l) => [l.text, false]));
    expect(s().startWorkout(r.id, today())).toBe(id);
    expect(s().workouts).toHaveLength(5);
    s().updateRoutine(r.id, { name: 'Track' });
    s().addRoutineLine(r.id, 'Strides');
    s().deleteRoutine(r.id);
    expect(at(id).name).toBe('Intervals');
    expect(at(id).lines).toHaveLength(6);
  });

  it('refuses a start that is not today or a set day that has passed', () => {
    expect(s().startWorkout(named('Stretch').id, addDaysISO(today(), -1))).toBeNull();
    expect(s().startWorkout(named('Strength').id, addDaysISO(today(), 2))).toBeNull();
    expect(s().startWorkout('nowhere', today())).toBeNull();
    // five days back is a Strength day with no session in the sample
    expect(s().startWorkout(named('Strength').id, addDaysISO(today(), -5))).not.toBeNull();
  });

  it('logs 2 miles the first time a session is finished, for one session a day', () => {
    const miles = milesLogged(s().log), a = s().startWorkout(named('Intervals').id, today())!, b = s().startWorkout(named('Stretch').id, today())!;
    expect(s().finishWorkout(a)).toBe(2);
    expect(milesLogged(s().log)).toBe(miles + 2);
    expect(s().log.at(-1)).toMatchObject({ id: `workout:${today()}`, source: 'workout', sourceId: a, date: today(), miles: 2 });
    expect(s().finishWorkout(a)).toBeNull();
    s().reopenWorkout(a);
    expect(at(a).finishedAt).toBeUndefined();
    expect(milesLogged(s().log)).toBe(miles + 2);
    expect(s().finishWorkout(a)).toBe(0);
    expect(s().finishWorkout(b)).toBe(0);
    expect(milesLogged(s().log)).toBe(miles + 2);
    expect(at(b).milesAwarded).toBe(true);
    expect(daysAtSea(s().log)).toBe(24);
  });

  it("dates a late session's miles the day it is finished", () => {
    const id = s().startWorkout(named('Strength').id, addDaysISO(today(), -5))!;
    expect(s().finishWorkout(id)).toBe(2);
    expect(s().log.at(-1)!.date).toBe(today());
  });

  it("never earns from the sample's sessions", () => {
    const id = s().workouts[0]!.id;
    s().reopenWorkout(id);
    expect(s().finishWorkout(id)).toBe(0);
    expect(milesLogged(s().log)).toBe(412);
  });

  it('changes nothing a task counts', () => {
    const day = () => s().tasks.filter((t) => t.scope === 'day' && t.date === today()), before = day().filter((t) => t.completedAt).length;
    s().finishWorkout(s().startWorkout(named('Intervals').id, today())!);
    expect(day()).toHaveLength(5);
    expect(day().filter((t) => t.completedAt)).toHaveLength(before);
    expect(s().log.some((e) => e.source === 'day-clear' && e.date === today())).toBe(false);
  });

  it("keeps a session's ticks, lines and note", () => {
    const id = s().startWorkout(named('Long run').id, today())!, texts = () => at(id).lines.map((l) => l.text), first = at(id).lines[0]!.id;
    s().toggleWorkoutLine(id, first);
    expect(at(id).lines[0]!.done).toBe(true);
    expect(s().addWorkoutLine(id, '  Strides ')).toBe(true);
    expect(s().addWorkoutLine(id, ' ')).toBe(false);
    expect(texts().at(-1)).toBe('Strides');
    const added = at(id).lines.at(-1)!.id;
    s().moveWorkoutLine(id, added, -1);
    s().editWorkoutLine(id, added, '');
    s().editWorkoutLine(id, added, 'Strides, 4 × 80 m');
    expect(texts()).toEqual(['Easy pace, 8 to 10 km', 'Walk for 5 minutes', 'Strides, 4 × 80 m', 'Stretch']);
    const gone = s().deleteWorkoutLine(id, added)!;
    expect(texts()).toHaveLength(3);
    s().restoreWorkoutLine(id, gone.line, gone.index);
    expect(texts()[2]).toBe('Strides, 4 × 80 m');
    s().setWorkoutNote(id, 'Hot.  Slow ');
    expect(at(id).note).toBe('Hot.  Slow ');
    s().setWorkoutNote(id, 'x'.repeat(3000));
    expect(at(id).note).toHaveLength(2000);
    expect(named('Long run').lines).toHaveLength(3);
  });

  it('removes a session and puts it back, and the log keeps its miles', () => {
    const id = s().startWorkout(named('Intervals').id, today())!;
    s().finishWorkout(id);
    const miles = milesLogged(s().log), gone = s().deleteWorkout(id)!;
    expect(s().workouts).toHaveLength(4);
    expect(milesLogged(s().log)).toBe(miles);
    // put back when its routine has another session that day, it would be a second one, so it stays away
    const again = s().startWorkout(named('Intervals').id, today())!;
    s().restoreWorkout(gone);
    expect(s().workouts.map((w) => w.id)).not.toContain(id);
    s().deleteWorkout(again);
    s().restoreWorkout(gone);
    expect(at(id).finishedAt).toBeDefined();
  });
});

describe('fitness: bests and measures', () => {
  it('adds a best with a name and a value, and corrects it without touching the one before', () => {
    s().clearAll();
    expect(s().addKept('bests', { name: '5 km', value: '  ', date: today() })).toBeNull();
    expect(s().addKept('bests', { name: ' ', value: '24:52', date: today() })).toBeNull();
    const id = s().addKept('bests', { name: ' 5 km ', value: ' 24:52 ', date: '2026-10-10' })!;
    expect(s().bests).toEqual([{ id, name: '5 km', value: '24:52', date: '2026-10-10' }]);
    s().updateKept('bests', id, { value: '24:50', name: '  ', date: 'soon' });
    expect(s().bests[0]).toEqual({ id, name: '5 km', value: '24:50', date: '2026-10-10' });
  });

  it('keeps the value before when a new one is kept, and puts it all back on Undo', () => {
    s().clearAll();
    const id = s().addKept('bests', { name: '5 km', value: '24:50', date: '2026-10-10' })!;
    const before = s().newKept('bests', id, ' 24:10 ')!;
    expect(s().bests[0]).toEqual({ id, name: '5 km', value: '24:10', date: today(), was: { value: '24:50', date: '2026-10-10' } });
    s().newKept('bests', id, '23:58');
    expect(s().bests[0]!.was).toEqual({ value: '24:10', date: today() });
    expect(s().newKept('bests', id, '   ')).toBeNull();
    expect(s().bests[0]!.value).toBe('23:58');
    s().restoreKept('bests', before, 0);
    expect(s().bests).toEqual([before]);
  });

  it('gives a measure a unit, and stops at 20 bests and 12 measures', () => {
    s().clearAll();
    const id = s().addKept('measures', { name: 'Sleep', unit: ' hours ', value: '7.5', date: today() })!;
    expect(s().measures[0]).toEqual({ id, name: 'Sleep', unit: 'hours', value: '7.5', date: today() });
    s().updateKept('measures', id, { unit: '' });
    expect(s().measures[0]!.unit).toBe('');
    expect(s().addKept('measures', { name: 'Long', value: '1'.repeat(30), date: today() })).not.toBeNull();
    expect(s().measures[1]!.value).toHaveLength(12);
    for (let i = 0; i < 30; i++) { s().addKept('bests', { name: `B${i}`, value: '1', date: today() }); s().addKept('measures', { name: `M${i}`, value: '1', date: today() }); }
    expect(s().bests).toHaveLength(20);
    expect(s().measures).toHaveLength(12);
  });

  it('deletes a measure and puts it back where it was, and logs no miles for any of it', () => {
    const gone = s().deleteKept('measures', s().measures[0]!.id)!;
    expect(s().measures).toEqual([]);
    s().restoreKept('measures', gone.item, gone.index);
    expect(s().measures[0]!.name).toBe('Resting heart rate');
    s().newKept('bests', s().bests[0]!.id, '23:59');
    expect(milesLogged(s().log)).toBe(412);
  });
});

describe('fitness: what the review of the whole change found', () => {
  it('keeps a list that an Undo took past its limit when the save is opened again', () => {
    s().clearAll();
    const id = s().addRoutine('Gym')!;
    for (let i = 0; i < 40; i++) s().addRoutineLine(id, `Line ${i}`);
    const session = s().startWorkout(id, today())!, gone = s().deleteWorkoutLine(session, at(session).lines[0]!.id)!;
    expect(s().addWorkoutLine(session, 'The extra line')).toBe(true);
    s().restoreWorkoutLine(session, gone.line, gone.index);
    expect(at(session).lines).toHaveLength(41);
    expect(s().addWorkoutLine(session, 'One more')).toBe(false);
    for (let i = 0; i < 19; i++) s().addRoutine(`Routine ${i}`);
    const removed = s().deleteRoutine(s().routines[1]!.id)!;
    s().addRoutine('The newest');
    s().restoreRoutine(removed.routine, removed.index);
    expect(s().routines).toHaveLength(21);
    const merged = merge(JSON.parse(JSON.stringify(s())));
    expect(merged.workouts[0]!.lines).toHaveLength(41);
    expect(merged.workouts[0]!.lines.at(-1)!.text).toBe('The extra line');
    expect(merged.routines).toHaveLength(21);
    expect(merged.routines.at(-1)!.name).toBe('The newest');
  });

  it('logs nothing for a session logged late on a day that has already earned', () => {
    const miles = milesLogged(s().log);
    expect(s().finishWorkout(s().startWorkout(named('Intervals').id, today())!)).toBe(2);
    expect(s().finishWorkout(s().startWorkout(named('Strength').id, addDaysISO(today(), -5))!)).toBe(0);
    expect(milesLogged(s().log)).toBe(miles + 2);
    expect(s().log.filter((e) => e.source === 'workout')).toHaveLength(1);
  });
});

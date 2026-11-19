import { describe, expect, it } from 'vitest';
import { canStart, cleanWords, isRestDay, isSet, lastDone, offers, recentWorkouts, sessionCount, sessionsForDay, sessionsForWeek, storedBests, storedMeasures, storedRoutines, storedWorkouts, ticked } from './fitness';
import type { ISODate, Routine, Workout } from './types';

describe('fitness: words and saved records', () => {
  it('keeps words as typed, within their limit', () => {
    expect(cleanWords('  Squat,  3 × 5\nat 60 kg ', 140)).toBe('Squat, 3 × 5 at 60 kg');
    expect(cleanWords('   ', 40)).toBe('');
    expect(cleanWords('x'.repeat(200), 140)).toHaveLength(140);
  });

  it('keeps only stored routines that have an id and a name, with real days and lines', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ id: `l${i}`, text: `Line ${i}` }));
    const stored = storedRoutines([null, 'x', { id: 'a' }, { id: 'b', name: ' Strength ', days: [5, 1, 9, 'x', 5], lines: [null, { id: 'l1', text: ' Squat ' }, { id: 'l2' }, { text: 'No id' }], createdOn: '2026-10-01' }, { id: 'b', name: 'Twice' }, { id: 'c', name: 'Run', days: 'mon', lines: many, createdOn: 'soon' }]);
    expect(stored[0]).toEqual({ id: 'b', name: 'Strength', days: [1, 5], lines: [{ id: 'l1', text: 'Squat' }], createdOn: '2026-10-01' });
    expect(stored[1]).toMatchObject({ id: 'c', days: [], createdOn: '2000-01-01' });
    // a list is not cut to its limit when a save is opened: the limit is held where things are added, and cutting here would drop what was typed
    expect(stored[1]!.lines).toHaveLength(50);
    expect(stored).toHaveLength(2);
    expect(storedRoutines('nonsense')).toEqual([]);
  });

  it('keeps only stored sessions that have an id, a name and a date, one for each routine and day', () => {
    const stored = storedWorkouts([{ id: 'w1', name: 'Run', date: 'soon' }, { id: 'w2', routineId: 'r', name: ' Run ', date: '2026-11-16', lines: [{ id: 'a', text: 'Warm up', done: 1 }, { id: 'b', text: 'Go', done: true }, { id: 'c' }], note: 7, finishedAt: '2026-11-16T18:00:00.000Z', milesAwarded: true }, { id: 'w3', routineId: 'r', name: 'Again', date: '2026-11-16' }, { id: 'w4', name: 'Loose', date: '2026-11-16' }]);
    expect(stored).toEqual([
      { id: 'w2', routineId: 'r', name: 'Run', date: '2026-11-16', lines: [{ id: 'a', text: 'Warm up', done: false }, { id: 'b', text: 'Go', done: true }], note: '', finishedAt: '2026-11-16T18:00:00.000Z', milesAwarded: true },
      { id: 'w4', routineId: '', name: 'Loose', date: '2026-11-16', lines: [], note: '' },
    ]);
  });

  it('keeps only stored bests and measures that have an id, a name, a value and a date', () => {
    expect(storedBests([{ id: 'a', name: '5 km', value: ' 24:10 ', date: '2026-11-07', was: { value: '24:52', date: '2026-10-10' } }, { id: 'b', name: 'Squat', value: '60 kg', date: '2026-11-16', was: { value: '57.5 kg' } }, { id: 'c', name: 'Plank', date: '2026-11-02' }, { id: 'a', name: 'Twice', value: '1', date: '2026-11-02' }]))
      .toEqual([{ id: 'a', name: '5 km', value: '24:10', date: '2026-11-07', was: { value: '24:52', date: '2026-10-10' } }, { id: 'b', name: 'Squat', value: '60 kg', date: '2026-11-16' }]);
    expect(storedMeasures([{ id: 'm', name: 'Resting heart rate', value: '58', date: '2026-11-15', unit: 9 }, { id: 'n', name: 'Sleep', unit: ' h ', value: '7.5', date: '2026-11-15' }]))
      .toEqual([{ id: 'm', name: 'Resting heart rate', unit: '', value: '58', date: '2026-11-15' }, { id: 'n', name: 'Sleep', unit: 'h', value: '7.5', date: '2026-11-15' }]);
  });
});

const TODAY = '2026-11-18', WEEK = '2026-11-16'; // a Wednesday, and its Monday
const routine = (id: string, days: number[], over: Partial<Routine> = {}): Routine => ({ id, name: id, days, lines: [{ id: `${id}-1`, text: 'One' }], createdOn: '2026-10-01', ...over });
const workout = (id: string, routineId: string, date: ISODate, over: Partial<Workout> = {}): Workout => ({ id, routineId, name: routineId, date, lines: [{ id: `${id}-1`, text: 'One', done: false }], note: '', ...over });
const fin = (date: ISODate, hour = 18) => ({ finishedAt: `${date}T${hour}:00:00.000Z` });
const R = [routine('strength', [1, 5]), routine('intervals', [3]), routine('long', [6]), routine('stretch', [])];
const W = [workout('w1', 'strength', '2026-11-16', fin('2026-11-16')), workout('w2', 'long', '2026-11-14', fin('2026-11-14')), workout('w3', 'intervals', '2026-11-12', fin('2026-11-12')), workout('w4', 'stretch', '2026-11-09', fin('2026-11-09'))];

describe("fitness: the week's rules", () => {
  it('sets a routine on its weekdays, from the day it was made', () => {
    expect(isSet(R[0]!, '2026-11-16')).toBe(true);
    expect(isSet(R[0]!, '2026-11-17')).toBe(false);
    expect(isSet(routine('new', [1], { createdOn: '2026-11-17' }), '2026-11-16')).toBe(false);
    expect(isSet(R[3]!, TODAY)).toBe(false);
  });

  it("lists a week's sessions in date order, each in its state", () => {
    const rows = sessionsForWeek(R, W, WEEK, TODAY);
    expect(rows.map((r) => [r.date, r.name, r.state])).toEqual([['2026-11-16', 'strength', 'finished'], ['2026-11-18', 'intervals', 'due'], ['2026-11-20', 'strength', 'ahead'], ['2026-11-21', 'long', 'ahead']]);
    expect(sessionCount(rows)).toEqual({ done: 1, total: 4 });
  });

  it('lists a set session as its session once started, and the others started that day after it', () => {
    const more = [...W, workout('w6', 'stretch', TODAY, fin(TODAY)), workout('w5', 'intervals', TODAY)];
    expect(sessionsForDay(R, more, TODAY, TODAY).map((r) => [r.workout?.id, r.state])).toEqual([['w5', 'started'], ['w6', 'finished']]);
    expect(sessionCount(sessionsForWeek(R, more, WEEK, TODAY))).toEqual({ done: 2, total: 5 });
  });

  it('leaves a missed session in its week, not started', () => {
    const first = sessionsForWeek(R, [], WEEK, TODAY)[0]!;
    expect([first.date, first.state, first.workout]).toEqual(['2026-11-16', 'past', undefined]);
  });

  it('keeps a session whose routine is gone, under the name it had', () => {
    expect(sessionsForDay([], W, '2026-11-16', TODAY).map((r) => [r.name, r.state, r.routine])).toEqual([['strength', 'finished', undefined]]);
  });

  it('goes by the day a session is for when it says when a routine was last done', () => {
    const late = [workout('a', 'strength', '2026-11-13', fin('2026-11-18')), workout('b', 'strength', '2026-11-16', fin('2026-11-16')), workout('c', 'strength', '2026-11-17')];
    expect(lastDone(late, 'strength')).toBe('2026-11-16');
    expect(lastDone(late, 'long')).toBeUndefined();
  });

  it('offers the routine not done for longest first, and one never done before any', () => {
    expect(offers(R, W, TODAY).map((r) => r.id)).toEqual(['stretch', 'long', 'strength']);
    expect(offers(R, W, '2026-11-17').map((r) => r.id)).toEqual(['stretch', 'intervals', 'long', 'strength']);
    expect(offers([...R, routine('swim', [])], W, '2026-11-17')[0]!.id).toBe('swim');
    expect(offers([routine('a', []), routine('b', [])], [], TODAY).map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('calls a day a rest day when nothing is set or started and some routine has a fixed day', () => {
    expect(isRestDay(R, W, '2026-11-17')).toBe(true);
    expect(isRestDay(R, W, TODAY)).toBe(false);
    expect(isRestDay(R, [...W, workout('x', 'stretch', '2026-11-17')], '2026-11-17')).toBe(false);
    expect(isRestDay([routine('stretch', [])], [], TODAY)).toBe(false);
    expect(isRestDay([], [], TODAY)).toBe(false);
  });

  it('lists finished sessions newest first by their day, the later finished first', () => {
    const all = [...W, workout('late', 'stretch', '2026-11-16', fin('2026-11-18')), workout('open', 'long', '2026-11-17')];
    expect(recentWorkouts(all).map((w) => w.id)).toEqual(['late', 'w1', 'w2', 'w3', 'w4']);
  });

  it('counts the lines ticked in a session', () => {
    expect(ticked(workout('w', 'r', TODAY, { lines: [{ id: 'a', text: 'A', done: true }, { id: 'b', text: 'B', done: false }] }))).toEqual({ done: 1, total: 2 });
  });
});

describe('fitness: starting a session', () => {
  it('can start any routine today, a set one on a day that has passed, and nothing on a day to come', () => {
    expect(canStart(R[3]!, TODAY, TODAY)).toBe(true);
    expect(canStart(R[3]!, '2026-11-17', TODAY)).toBe(false);
    expect(canStart(R[0]!, '2026-11-16', TODAY)).toBe(true);
    expect(canStart(R[0]!, '2026-11-20', TODAY)).toBe(false);
  });
});

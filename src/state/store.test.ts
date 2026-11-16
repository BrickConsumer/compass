import { beforeEach, describe, expect, it } from 'vitest';
import { addDaysISO, todayISO } from '../domain/dates';
import { habitProgress } from '../domain/habits';
import { daysAtSea, milesLogged } from '../domain/voyage';
import { useCompass } from './store';

const s = () => useCompass.getState();

describe('store', () => {
  beforeEach(() => { s().resetSample(); });

  it('starts from the sample: 412 miles, 23 days at sea, a sloop', () => {
    expect(milesLogged(s().log)).toBe(412);
    expect(daysAtSea(s().log)).toBe(23);
    expect(s().boat.stage).toBe('sloop');
    expect(s().tasks.filter((t) => t.scope === 'day' && t.date === todayISO())).toHaveLength(5);
  });

  it('adds a task with a clean title and refuses an empty one', () => {
    const before = s().tasks.length;
    expect(s().addTask({ title: '    ', date: todayISO(), scope: 'day' })).toBeNull();
    const id = s().addTask({ title: '  Revise   Chinese ', date: todayISO(), scope: 'day' })!;
    expect(s().tasks).toHaveLength(before + 1);
    expect(s().tasks.find((t) => t.id === id)!.title).toBe('Revise Chinese');
    s().updateTask(id, { title: '   ' });
    expect(s().tasks.find((t) => t.id === id)!.title).toBe('Revise Chinese');
  });

  it('logs miles the first time a task is completed, and never takes them back', () => {
    const id = s().addTask({ title: 'One', date: todayISO(), scope: 'week' })!, start = milesLogged(s().log);
    s().toggleTask(id);
    expect(milesLogged(s().log)).toBe(start + 2);
    s().toggleTask(id);
    expect(s().tasks.find((t) => t.id === id)!.completedAt).toBeUndefined();
    expect(milesLogged(s().log)).toBe(start + 2);
    s().toggleTask(id);
    expect(milesLogged(s().log)).toBe(start + 2);
  });

  it('finishing the day earns the bonus once', () => {
    const start = milesLogged(s().log), open = s().tasks.filter((t) => t.scope === 'day' && t.date === todayISO() && !t.completedAt);
    for (const t of open) s().toggleTask(t.id);
    // one high-priority task (3), one normal (2), and the day (3)
    expect(milesLogged(s().log)).toBe(start + 8);
    s().toggleTask(open[0]!.id); s().toggleTask(open[0]!.id);
    expect(milesLogged(s().log)).toBe(start + 8);
  });

  it('deletes and restores the same record', () => {
    const victim = s().tasks[0]!, gone = s().deleteTasks([victim.id]);
    expect(s().tasks.some((t) => t.id === victim.id)).toBe(false);
    s().restoreTasks(gone);
    expect(s().tasks.find((t) => t.id === victim.id)).toEqual(victim);
  });

  it('cycles priority and moves tasks to a day', () => {
    const t = s().tasks.find((x) => x.priority === 'normal')!;
    s().cyclePriority(t.id); expect(s().tasks.find((x) => x.id === t.id)!.priority).toBe('low');
    s().cyclePriority(t.id); expect(s().tasks.find((x) => x.id === t.id)!.priority).toBe('high');
    const before = s().moveToDate([t.id], '2030-01-01');
    expect(s().tasks.find((x) => x.id === t.id)!.date).toBe('2030-01-01');
    s().restoreTasks(before);
    expect(s().tasks.find((x) => x.id === t.id)!.date).toBe(t.date);
  });

  it('the boat being sailed cannot be ahead of what is earned', () => {
    s().setBoat({ stage: 'schooner' });
    expect(s().boat.stage).toBe('sloop');
    s().setSampleVoyage(0, 0);
    expect(s().boat.stage).toBe('dinghy');
    s().setSampleVoyage(3200, 130); s().setBoat({ stage: 'schooner' });
    expect(s().boat.stage).toBe('schooner');
  });

  it('clearing leaves no tasks and the first boat', () => {
    s().clearAll();
    expect(s().tasks).toEqual([]);
    expect(milesLogged(s().log)).toBe(0);
    expect(s().boat.stage).toBe('dinghy');
  });

  it('starts with the four sample habits, two ticked today', () => {
    expect(s().habits.map((h) => h.name)).toEqual(['Read for 20 minutes', 'Complete daily revision', 'Exercise', 'Plan tomorrow']);
    expect(habitProgress(s().habits, s().ticks, todayISO())).toEqual({ done: 2, total: 4 });
  });

  it('ticking a habit logs one mile once, and unticking takes nothing back', () => {
    const start = milesLogged(s().log), days = daysAtSea(s().log);
    s().toggleHabit('hab-read', todayISO());
    expect(habitProgress(s().habits, s().ticks, todayISO()).done).toBe(3);
    expect(milesLogged(s().log)).toBe(start + 1);
    expect(daysAtSea(s().log)).toBe(days + 1);
    s().toggleHabit('hab-read', todayISO());
    expect(habitProgress(s().habits, s().ticks, todayISO()).done).toBe(2);
    expect(milesLogged(s().log)).toBe(start + 1);
    s().toggleHabit('hab-read', todayISO());
    expect(milesLogged(s().log)).toBe(start + 1);
  });

  it('a day still to come cannot be ticked, nor a day the habit is not for', () => {
    const before = s().ticks.length;
    s().toggleHabit('hab-read', addDaysISO(todayISO(), 1));
    // exercise is for today, two days on and four days on: tomorrow is not one of its days
    s().updateHabit('hab-move', { days: [(new Date().getDay() + 3) % 7] });
    s().toggleHabit('hab-move', addDaysISO(todayISO(), -1));
    expect(s().ticks).toHaveLength(before);
  });

  it('adds a habit with a clean name, refuses an empty one, and keeps at least one day', () => {
    expect(s().addHabit('   ')).toBeNull();
    const id = s().addHabit('  Stretch   for ten minutes ')!;
    const made = () => s().habits.find((h) => h.id === id)!;
    expect(made()).toMatchObject({ name: 'Stretch for ten minutes', days: [0, 1, 2, 3, 4, 5, 6], createdOn: todayISO() });
    s().updateHabit(id, { days: [1, 3] });
    expect(made().days).toEqual([1, 3]);
    s().updateHabit(id, { days: [], name: '  ' });
    expect(made()).toMatchObject({ name: 'Stretch for ten minutes', days: [1, 3] });
  });

  it('deleting a habit removes its record, and Undo brings both back', () => {
    const ticks = s().ticks.length, removed = s().deleteHabit('hab-revise')!;
    expect(s().habits).toHaveLength(3);
    expect(s().ticks.length).toBeLessThan(ticks);
    s().restoreHabit(removed);
    expect(s().habits).toHaveLength(4);
    expect(s().ticks).toHaveLength(ticks);
  });
});

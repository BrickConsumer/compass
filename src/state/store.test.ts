import { beforeEach, describe, expect, it } from 'vitest';
import { todayISO } from '../domain/dates';
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
});

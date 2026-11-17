import { beforeEach, describe, expect, it } from 'vitest';
import { addDaysISO, todayISO, weekStartOf } from '../domain/dates';
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

  it('adds a subject in a colour not yet used, and refuses an empty name', () => {
    expect(s().addSubject('  ')).toBeNull();
    const id = s().addSubject('  Physical   education ')!, made = () => s().subjects.find((x) => x.id === id)!;
    expect(made().name).toBe('Physical education');
    expect(s().subjects.filter((x) => x.colour === made().colour)).toHaveLength(1);
    s().updateSubject(id, { name: ' ', colour: 'clay', notes: 'Bring kit on Thursdays.' });
    expect(made()).toMatchObject({ name: 'Physical education', colour: 'clay', notes: 'Bring kit on Thursdays.' });
  });

  it('deleting a subject removes its assessments and leaves its tasks without a subject; Undo puts it all back', () => {
    const tasks = s().tasks.filter((t) => t.subjectId === 'bio').length, tests = s().assessments.length;
    expect(tasks).toBeGreaterThan(0);
    const removed = s().deleteSubject('bio')!;
    expect(s().subjects.some((x) => x.id === 'bio')).toBe(false);
    expect(s().assessments).toHaveLength(tests - 1);
    expect(s().tasks.filter((t) => t.subjectId === 'bio')).toHaveLength(0);
    expect(s().tasks).toHaveLength(20);
    s().restoreSubject(removed);
    expect(s().subjects.some((x) => x.id === 'bio')).toBe(true);
    expect(s().assessments).toHaveLength(tests);
    expect(s().tasks.filter((t) => t.subjectId === 'bio')).toHaveLength(tasks);
  });

  it('adds, changes and deletes an assessment, with Undo', () => {
    expect(s().addAssessment({ title: '  ', subjectId: 'bio', date: todayISO(), kind: 'test' })).toBeNull();
    expect(s().addAssessment({ title: 'Quiz', subjectId: 'nobody', date: todayISO(), kind: 'test' })).toBeNull();
    const id = s().addAssessment({ title: ' Chinese  dictation ', subjectId: 'chi', date: addDaysISO(todayISO(), 2), kind: 'test' })!, made = () => s().assessments.find((a) => a.id === id);
    expect(made()).toMatchObject({ title: 'Chinese dictation', subjectId: 'chi', kind: 'test' });
    s().updateAssessment(id, { title: '', kind: 'exam', date: addDaysISO(todayISO(), 5) });
    expect(made()).toMatchObject({ title: 'Chinese dictation', kind: 'exam', date: addDaysISO(todayISO(), 5) });
    const gone = s().deleteAssessment(id)!;
    expect(made()).toBeUndefined();
    s().restoreAssessment(gone);
    expect(made()).toBeDefined();
  });

  describe("study sessions", () => {
    const today = todayISO(), weekday = new Date().getDay();
    const from = (id: string) => s().tasks.filter((t) => t.sessionId === id);

    it("a new session makes an ordinary task for today, which earns miles like any other", () => {
      const before = s().tasks.length, id = s().addSession({ subjectId: "bio", name: "  Biology   revision ", days: [weekday] })!;
      expect(from(id)).toHaveLength(1);
      expect(from(id)[0]).toMatchObject({ title: "Biology revision", subjectId: "bio", scope: "day", date: today, priority: "normal" });
      expect(s().tasks).toHaveLength(before + 1);
      const miles = milesLogged(s().log);
      s().toggleTask(from(id)[0]!.id);
      expect(milesLogged(s().log)).toBe(miles + 2);
    });

    it("refuses a session with no name, no day or no subject", () => {
      expect(s().addSession({ subjectId: "bio", name: "  ", days: [weekday] })).toBeNull();
      expect(s().addSession({ subjectId: "bio", name: "Revision", days: [] })).toBeNull();
      expect(s().addSession({ subjectId: "nobody", name: "Revision", days: [weekday] })).toBeNull();
      expect(s().sessions).toHaveLength(0);
    });

    it("never makes a task twice, so one deleted for a day off stays deleted", () => {
      const id = s().addSession({ subjectId: "bio", name: "Biology revision", days: [weekday] })!;
      s().deleteTasks(from(id).map((t) => t.id));
      s().makeSessionTasks();
      s().updateSession(id, { name: "Biology past papers" });
      expect(from(id)).toHaveLength(0);
    });

    it("changing a session leaves the tasks already made as they are", () => {
      const id = s().addSession({ subjectId: "bio", name: "Biology revision", days: [weekday] })!;
      s().updateSession(id, { name: "Biology past papers", days: [(weekday + 3) % 7] });
      expect(s().sessions[0]).toMatchObject({ name: "Biology past papers", days: [(weekday + 3) % 7] });
      expect(from(id).filter((t) => t.date === today)).toHaveLength(1);
      expect(from(id).find((t) => t.date === today)!.title).toBe("Biology revision");
      // an empty name or no days is not saved
      s().updateSession(id, { name: " ", days: [] });
      expect(s().sessions[0]).toMatchObject({ name: "Biology past papers", days: [(weekday + 3) % 7] });
    });

    it("when the next week arrives, its tasks are made", () => {
      const id = s().addSession({ subjectId: "bio", name: "Biology revision", days: [weekday] })!;
      s().makeSessionTasks(addDaysISO(today, 7));
      s().makeSessionTasks(addDaysISO(today, 7));
      expect(from(id).map((t) => t.date).sort()).toEqual([today, addDaysISO(today, 7)]);
    });

    it("ending a session keeps its tasks, and Undo brings the session back", () => {
      const id = s().addSession({ subjectId: "bio", name: "Biology revision", days: [weekday] })!, gone = s().deleteSession(id)!;
      expect(s().sessions).toHaveLength(0);
      expect(from(id)).toHaveLength(1);
      s().restoreSession(gone);
      expect(s().sessions.map((x) => x.id)).toEqual([id]);
    });

    it("deleting a subject ends its sessions, and Undo restores them", () => {
      const id = s().addSession({ subjectId: "bio", name: "Biology revision", days: [weekday] })!, removed = s().deleteSubject("bio")!;
      expect(s().sessions).toHaveLength(0);
      // nothing more is made for a session that has gone
      s().makeSessionTasks(addDaysISO(today, 7));
      expect(from(id)).toHaveLength(1);
      s().restoreSubject(removed);
      expect(s().sessions.map((x) => x.id)).toEqual([id]);
    });

    it("the sample has no sessions, so its week is unchanged", () => {
      s().makeSessionTasks();
      expect(s().sessions).toEqual([]);
      expect(s().tasks).toHaveLength(20);
    });
  });

  describe("weekly reviews", () => {
    const week = weekStartOf(todayISO(), 1), last = addDaysISO(week, -7), mine = (w: string) => s().reviews.find((r) => r.weekStart === w);

    it("the sample has last week's review, already saved", () => {
      expect(s().reviews).toHaveLength(1);
      expect(mine(last)!.savedAt).toBeDefined();
    });

    it("a reflection is kept as it is written, before it is saved", () => {
      s().writeReview(week, { wentWell: "Finished the essay plan." });
      s().writeReview(week, { change: "Start earlier." });
      expect(mine(week)).toMatchObject({ wentWell: "Finished the essay plan.", gotInWay: "", change: "Start earlier." });
      expect(mine(week)!.savedAt).toBeUndefined();
    });

    it("saving a review logs ten miles once, and saving again changes nothing", () => {
      const miles = milesLogged(s().log);
      expect(s().saveReview(week)).toBe(false);
      s().writeReview(week, { wentWell: "  " });
      expect(s().saveReview(week)).toBe(false);
      s().writeReview(week, { wentWell: "Finished the essay plan." });
      expect(s().saveReview(week)).toBe(true);
      const saved = mine(week)!.savedAt;
      expect(saved).toBeDefined();
      expect(milesLogged(s().log)).toBe(miles + 10);
      s().writeReview(week, { change: "Start earlier." });
      expect(s().saveReview(week)).toBe(true);
      expect(mine(week)!.savedAt).toBe(saved);
      expect(milesLogged(s().log)).toBe(miles + 10);
    });

    it("a review that is already saved earns nothing more, even with no entry in the log", () => {
      const miles = milesLogged(s().log);
      s().writeReview(last, { change: "One more thought." });
      expect(s().saveReview(last)).toBe(true);
      expect(milesLogged(s().log)).toBe(miles);
    });

    it("a week still to come cannot be written, and an old week earns no miles", () => {
      s().writeReview(addDaysISO(week, 7), { wentWell: "Too soon." });
      expect(mine(addDaysISO(week, 7))).toBeUndefined();
      const miles = milesLogged(s().log), old = addDaysISO(week, -21);
      s().writeReview(old, { wentWell: "A while ago." });
      expect(s().saveReview(old)).toBe(true);
      expect(milesLogged(s().log)).toBe(miles);
    });
  });
});

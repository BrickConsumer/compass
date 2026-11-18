import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { todayISO } from '../domain/dates';
import { type CompassData, empty, sampleLog, seed } from '../domain/seed';
import { cleanTitle } from '../domain/tasks';
import type { Boat, ISODate, Priority, Settings, Task } from '../domain/types';
import { awardsFor, daysAtSea, earnedStage, milesLogged } from '../domain/voyage';
import { STAGE_ORDER } from '../features/voyage/boat/specs';

export interface NewTask { title: string; date: ISODate; scope: 'day' | 'week'; priority?: Priority; subjectId?: string; notes?: string }

export interface CompassStore extends CompassData {
  /** Add a task. Returns its id, or null when the title is empty. */
  addTask: (input: NewTask) => string | null;
  updateTask: (id: string, patch: Partial<Pick<Task, 'title' | 'notes' | 'subjectId' | 'priority' | 'scope' | 'date' | 'order'>>) => void;
  /** Complete or reopen. The first completion logs its miles; reopening removes nothing. */
  toggleTask: (id: string) => void;
  cyclePriority: (id: string) => void;
  /** Remove tasks and return them, so the caller can offer Undo. */
  deleteTasks: (ids: string[]) => Task[];
  restoreTasks: (tasks: Task[]) => void;
  /** Move tasks to a day. Returns their earlier state for Undo. */
  moveToDate: (ids: string[], date: ISODate) => Task[];
  /** Swap a task with its neighbour among its siblings. */
  nudge: (id: string, direction: -1 | 1) => void;
  setBoat: (patch: Partial<Boat>) => void;
  setSettings: (patch: Partial<Settings>) => void;
  resetSample: () => void;
  clearAll: () => void;
  /** Prototype tool: replace the voyage log with a sample of this size. */
  setSampleVoyage: (miles: number, days: number) => void;
}

let counter = 0;
const newId = () => `t-${Date.now().toString(36)}-${(counter++).toString(36)}`;
const NEXT: Record<Priority, Priority> = { high: 'normal', normal: 'low', low: 'high' };
const siblings = (tasks: Task[], t: Pick<Task, 'scope' | 'date'>) => tasks.filter((x) => x.scope === t.scope && x.date === t.date);

/** Keep the boat being sailed within what has been earned. */
function clampStage(boat: Boat, miles: number, days: number): Boat {
  const earned = STAGE_ORDER.indexOf(earnedStage(miles, days)), sailing = STAGE_ORDER.indexOf(boat.stage);
  return sailing > earned ? { ...boat, stage: STAGE_ORDER[earned]! } : boat;
}

/** In-memory fallback for when local storage is unavailable. */
const memory = (() => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); } }; })();
export let storageAvailable = true;
function safeStorage() {
  try { const k = 'compass:probe'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; }
  catch { storageAvailable = false; return memory; }
}

export const useCompass = create<CompassStore>()(
  persist(
    (set, get) => ({
      ...seed(todayISO()),
      addTask: (input) => {
        const title = cleanTitle(input.title);
        if (!title) return null;
        const id = newId(), order = Math.max(0, ...siblings(get().tasks, input).map((t) => t.order)) + 1;
        set((s) => ({ tasks: [...s.tasks, { id, title, date: input.date, scope: input.scope, priority: input.priority ?? 'normal', subjectId: input.subjectId, notes: input.notes?.trim() || undefined, order, createdAt: new Date().toISOString() }] }));
        return id;
      },
      updateTask: (id, patch) => set((s) => ({
        tasks: s.tasks.map((t) => {
          if (t.id !== id) return t;
          const next = { ...t, ...patch };
          if (patch.title !== undefined) next.title = cleanTitle(patch.title) || t.title;
          if (patch.notes !== undefined) next.notes = patch.notes.trim() || undefined;
          // a task moved to another list goes to the end of it
          if ((patch.date !== undefined && patch.date !== t.date) || (patch.scope !== undefined && patch.scope !== t.scope)) next.order = Math.max(0, ...siblings(s.tasks, next).map((x) => x.order)) + 1;
          return next;
        }),
      })),
      toggleTask: (id) => set((s) => {
        const task = s.tasks.find((t) => t.id === id);
        if (!task) return s;
        if (task.completedAt) return { tasks: s.tasks.map((t) => (t.id === id ? { ...t, completedAt: undefined } : t)) };
        const completed: Task = { ...task, completedAt: new Date().toISOString() };
        const after = s.tasks.map((t) => (t.id === id ? completed : t));
        const awards = awardsFor(completed, after, s.log, todayISO());
        return { tasks: after.map((t) => (t.id === id ? { ...t, milesAwarded: true as const } : t)), log: awards.length ? [...s.log, ...awards] : s.log };
      }),
      cyclePriority: (id) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, priority: NEXT[t.priority] } : t)) })),
      deleteTasks: (ids) => {
        const gone = get().tasks.filter((t) => ids.includes(t.id));
        set((s) => ({ tasks: s.tasks.filter((t) => !ids.includes(t.id)) }));
        return gone;
      },
      restoreTasks: (tasks) => set((s) => ({ tasks: [...s.tasks.filter((t) => !tasks.some((r) => r.id === t.id)), ...tasks] })),
      moveToDate: (ids, date) => {
        const before = get().tasks.filter((t) => ids.includes(t.id));
        set((s) => {
          let order = Math.max(0, ...siblings(s.tasks, { scope: 'day', date }).map((t) => t.order));
          return { tasks: s.tasks.map((t) => (ids.includes(t.id) ? { ...t, scope: 'day' as const, date, order: ++order } : t)) };
        });
        return before;
      },
      nudge: (id, direction) => set((s) => {
        const task = s.tasks.find((t) => t.id === id);
        if (!task) return s;
        const list = siblings(s.tasks, task).sort((a, b) => a.order - b.order), i = list.findIndex((t) => t.id === id), other = list[i + direction];
        if (!other) return s;
        return { tasks: s.tasks.map((t) => (t.id === id ? { ...t, order: other.order } : t.id === other.id ? { ...t, order: task.order } : t)) };
      }),
      setBoat: (patch) => set((s) => ({ boat: clampStage({ ...s.boat, ...patch, name: patch.name !== undefined ? patch.name.trim().slice(0, 40) || s.boat.name : s.boat.name }, milesLogged(s.log), daysAtSea(s.log)) })),
      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetSample: () => set(seed(todayISO())),
      clearAll: () => set(empty()),
      setSampleVoyage: (miles, days) => set((s) => {
        const log = sampleLog(miles, days, todayISO());
        return { log, boat: clampStage(s.boat, milesLogged(log), daysAtSea(log)) };
      }),
    }),
    {
      name: 'compass:v1',
      version: 1,
      storage: createJSONStorage(safeStorage),
      partialize: ({ subjects, tasks, assessments, log, boat, settings, sample }) => ({ subjects, tasks, assessments, log, boat, settings, sample }),
      // anything unreadable falls back to the sample, so a bad save can never stop the app opening
      merge: (saved, current) => {
        const s = saved as Partial<CompassData> | undefined;
        if (!s || !Array.isArray(s.tasks) || !Array.isArray(s.log) || !s.boat || !s.settings) return current;
        return { ...current, ...s, subjects: Array.isArray(s.subjects) && s.subjects.length ? s.subjects : current.subjects, assessments: Array.isArray(s.assessments) ? s.assessments : current.assessments };
      },
    },
  ),
);

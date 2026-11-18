import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { todayISO, weekStartOf } from '../domain/dates';
import { type CompassData, empty, sampleLog, seed } from '../domain/seed';
import { cleanDays, isDue, tickKey } from '../domain/habits';
import { addItem, cleanPageTitle, editItem, insertItem, moveItem, newPage, PAGE_LIMITS, removeItem, toggleItem, untickAll } from '../domain/pages';
import { rekeyed, withLevel } from '../domain/levels';
import { cleanUrl, LINK_LIMITS, linkName, storedLinks } from '../domain/links';
import { AREA_LIMITS, cleanRating, storedAreas } from '../domain/ratings';
import { canReview, isBlank, reviewAward } from '../domain/review';
import { madeKey, sessionTasksDue } from '../domain/sessions';
import { nextColour } from '../domain/study';
import { cleanTitle } from '../domain/tasks';
import type { Assessment, Boat, Habit, ISODate, Level, Page, PageItem, PageKind, Priority, QuickLink, RatingArea, Review, Session, Settings, Subject, SubjectColour, Task } from '../domain/types';
import { awardsFor, daysAtSea, earnedStage, habitAward, milesLogged } from '../domain/voyage';
import { STAGE_ORDER } from '../features/voyage/boat/specs';

export interface NewTask { title: string; date: ISODate; scope: 'day' | 'week'; priority?: Priority; subjectId?: string; notes?: string }

/** A deleted subject, with its assessments, its study sessions and the tasks that carried it. */
export interface RemovedSubject { subject: Subject; assessments: Assessment[]; sessions: Session[]; taskIds: string[]; pageIds: string[] }

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
  /** Add a subject, in the first colour not yet used. Returns its id, or null when the name is empty. */
  addSubject: (name: string) => string | null;
  updateSubject: (id: string, patch: { name?: string; colour?: SubjectColour; notes?: string }) => void;
  /** Remove a subject and its assessments. Its tasks stay, without a subject. Returns what Undo needs to put it all back. */
  deleteSubject: (id: string) => RemovedSubject | null;
  restoreSubject: (removed: RemovedSubject) => void;
  /** Add an assessment. Returns its id, or null when the title is empty or the subject is unknown. */
  addAssessment: (input: Omit<Assessment, 'id'>) => string | null;
  updateAssessment: (id: string, patch: Partial<Omit<Assessment, 'id'>>) => void;
  deleteAssessment: (id: string) => Assessment | null;
  restoreAssessment: (assessment: Assessment) => void;
  /** Add a study session for a subject. Returns its id, or null when the name is empty, no day is chosen or the subject is unknown. Its tasks for the rest of this week are made at once. */
  addSession: (input: { subjectId: string; name: string; days: number[] }) => string | null;
  /** Change a session. Tasks already made are left as they are. */
  updateSession: (id: string, patch: { name?: string; days?: number[] }) => void;
  /** End a session. Tasks already made stay, as ordinary tasks. */
  deleteSession: (id: string) => Session | null;
  restoreSession: (session: Session) => void;
  /** Make the session tasks that are due: see `sessionTasksDue`. Safe to call at any time; it never makes a task twice. */
  makeSessionTasks: (today?: ISODate) => void;
  /** Write part of a week's reflection. It is kept as it is typed. A week still to come cannot be written. */
  writeReview: (weekStart: ISODate, patch: Partial<Pick<Review, 'wentWell' | 'gotInWay' | 'change'>>) => void;
  /** Save a week's review, which lists it among earlier reviews and logs its miles once. Returns false when nothing is written and no listed area is rated. */
  saveReview: (weekStart: ISODate) => boolean;
  /** Rate one area of a week from 1 to 10, or clear it with `null`. It is kept with that week's review, and starts one if there is none. A week still to come cannot be rated. */
  rateReview: (weekStart: ISODate, areaId: string, rating: number | null) => void;
  /** Add an area to rate. Returns its id, or null when the name is empty or there are six already. */
  addArea: (name: string) => string | null;
  /** Rename an area. An empty name keeps the last good one. */
  renameArea: (id: string, name: string) => void;
  /** Remove an area, and return it with its place so the caller can offer Undo. Ratings given for it are kept, unseen. */
  deleteArea: (id: string) => { area: RatingArea; index: number } | null;
  restoreArea: (area: RatingArea, index: number) => void;
  moveArea: (id: string, direction: -1 | 1) => void;
  /** Add a link. Returns its id, or null when the address is not a web address or there are six already. With no name it takes its site's. */
  addLink: (input: { name: string; url: string }) => string | null;
  /** Change a link. Returns false, with nothing changed, when the new address is not a web address. */
  updateLink: (id: string, patch: { name?: string; url?: string }) => boolean;
  /** Remove a link, and return it with its place so the caller can offer Undo. */
  deleteLink: (id: string) => { link: QuickLink; index: number } | null;
  restoreLink: (link: QuickLink, index: number) => void;
  moveLink: (id: string, direction: -1 | 1) => void;
  /** Start a page of this kind, named "Untitled". Returns its id. */
  addPage: (kind: PageKind) => string;
  /** Change a page. `null` clears its date or its subject. An empty title keeps the last good one. */
  updatePage: (id: string, patch: { title?: string; kind?: PageKind; text?: string; aimFor?: ISODate | null; subjectId?: string | null }) => void;
  deletePage: (id: string) => Page | null;
  restorePage: (page: Page) => void;
  /** Mark a goal as reached today, or reopen it. Other kinds of page cannot be reached. */
  setReached: (id: string, reached: boolean) => void;
  /** Add an item to a page's list. Returns false when it is empty or the list is full. */
  addPageItem: (pageId: string, text: string) => boolean;
  /** Tick or untick an item. It earns nothing and moves nothing: an item is not a task. */
  togglePageItem: (pageId: string, itemId: string) => void;
  editPageItem: (pageId: string, itemId: string, text: string) => void;
  movePageItem: (pageId: string, itemId: string, direction: -1 | 1) => void;
  /** Remove an item, and return it with its place so the caller can offer Undo. */
  deletePageItem: (pageId: string, itemId: string) => { item: PageItem; index: number } | null;
  restorePageItem: (pageId: string, item: PageItem, index: number) => void;
  /** Untick every item on a page. Returns the ids that were ticked, for Undo. */
  untickPageItems: (pageId: string) => string[];
  tickPageItems: (pageId: string, itemIds: string[]) => void;
  /** Add a habit, for every day unless days are given. Returns its id, or null when the name is empty. */
  addHabit: (name: string, days?: number[]) => string | null;
  updateHabit: (id: string, patch: { name?: string; days?: number[] }) => void;
  /** Remove a habit and its record, and return both so the caller can offer Undo. */
  deleteHabit: (id: string) => { habit: Habit; ticks: string[] } | null;
  restoreHabit: (removed: { habit: Habit; ticks: string[] }) => void;
  /** Tick or untick a habit for a day. The first tick logs a mile; unticking removes nothing. A day still to come cannot be ticked. */
  toggleHabit: (id: string, date: ISODate) => void;
  /** Set a subject's level for a week, or clear it with `null`. A week with no levels of its own starts from the ones it was carrying. */
  setLevel: (weekStart: ISODate, subjectId: string, level: Level | null) => void;
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

/** Change one page, and note when: the list of pages is ordered by the last change. A change that changes nothing is not one. */
const changePage = (pages: Page[], id: string, change: (p: Page) => Page): Page[] => pages.map((p) => { if (p.id !== id) return p; const next = change(p); return next === p ? p : { ...next, updatedAt: new Date().toISOString() }; });

/** A list with one of its items swapped with its neighbour. Nothing changes at either end. */
function moved<T extends { id: string }>(list: T[], id: string, direction: -1 | 1): T[] {
  const i = list.findIndex((x) => x.id === id), j = i + direction;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = list.slice();
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}
/** A list with a removed item back at the place it had. */
const putBack = <T extends { id: string }>(list: T[], item: T, index: number): T[] => { const rest = list.filter((x) => x.id !== item.id); return [...rest.slice(0, index), item, ...rest.slice(index)]; };

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
      addSubject: (name) => {
        const clean = cleanTitle(name).slice(0, 40);
        if (!clean) return null;
        const id = newId().replace('t-', 's-');
        set((s) => ({ subjects: [...s.subjects, { id, name: clean, colour: nextColour(s.subjects) }] }));
        return id;
      },
      updateSubject: (id, patch) => set((s) => ({
        subjects: s.subjects.map((x) => (x.id !== id ? x : {
          ...x,
          name: patch.name !== undefined ? cleanTitle(patch.name).slice(0, 40) || x.name : x.name,
          colour: patch.colour ?? x.colour,
          notes: patch.notes !== undefined ? patch.notes.slice(0, 4000) || undefined : x.notes,
        })),
      })),
      deleteSubject: (id) => {
        const subject = get().subjects.find((x) => x.id === id);
        if (!subject) return null;
        const removed: RemovedSubject = { subject, assessments: get().assessments.filter((a) => a.subjectId === id), sessions: get().sessions.filter((x) => x.subjectId === id), taskIds: get().tasks.filter((t) => t.subjectId === id).map((t) => t.id), pageIds: get().pages.filter((p) => p.subjectId === id).map((p) => p.id) };
        set((s) => ({ subjects: s.subjects.filter((x) => x.id !== id), assessments: s.assessments.filter((a) => a.subjectId !== id), sessions: s.sessions.filter((x) => x.subjectId !== id), tasks: s.tasks.map((t) => (t.subjectId === id ? { ...t, subjectId: undefined } : t)), pages: s.pages.map((p) => (p.subjectId === id ? { ...p, subjectId: undefined } : p)) }));
        return removed;
      },
      restoreSubject: (removed) => set((s) => ({
        subjects: [...s.subjects.filter((x) => x.id !== removed.subject.id), removed.subject],
        assessments: [...s.assessments.filter((a) => !removed.assessments.some((r) => r.id === a.id)), ...removed.assessments],
        sessions: [...s.sessions.filter((x) => !removed.sessions.some((r) => r.id === x.id)), ...removed.sessions],
        tasks: s.tasks.map((t) => (removed.taskIds.includes(t.id) ? { ...t, subjectId: removed.subject.id } : t)),
        pages: s.pages.map((p) => (removed.pageIds.includes(p.id) ? { ...p, subjectId: removed.subject.id } : p)),
      })),
      addAssessment: (input) => {
        const title = cleanTitle(input.title).slice(0, 80);
        if (!title || !get().subjects.some((x) => x.id === input.subjectId)) return null;
        const id = newId().replace('t-', 'a-');
        set((s) => ({ assessments: [...s.assessments, { ...input, id, title }] }));
        return id;
      },
      updateAssessment: (id, patch) => set((s) => ({
        assessments: s.assessments.map((a) => (a.id !== id ? a : { ...a, ...patch, id, title: patch.title !== undefined ? cleanTitle(patch.title).slice(0, 80) || a.title : a.title, date: patch.date || a.date })),
      })),
      deleteAssessment: (id) => {
        const gone = get().assessments.find((a) => a.id === id) ?? null;
        if (gone) set((s) => ({ assessments: s.assessments.filter((a) => a.id !== id) }));
        return gone;
      },
      restoreAssessment: (assessment) => set((s) => ({ assessments: [...s.assessments.filter((a) => a.id !== assessment.id), assessment] })),
      addSession: (input) => {
        const name = cleanTitle(input.name).slice(0, 80), days = cleanDays(input.days);
        if (!name || days.length === 0 || !get().subjects.some((x) => x.id === input.subjectId)) return null;
        const id = newId().replace('t-', 'n-');
        set((s) => ({ sessions: [...s.sessions, { id, subjectId: input.subjectId, name, days, createdOn: todayISO() }] }));
        get().makeSessionTasks();
        return id;
      },
      updateSession: (id, patch) => {
        set((s) => ({
          sessions: s.sessions.map((x) => {
            if (x.id !== id) return x;
            const days = patch.days ? cleanDays(patch.days) : x.days;
            // a session keeps its last good name and at least one day
            return { ...x, name: patch.name !== undefined ? cleanTitle(patch.name).slice(0, 80) || x.name : x.name, days: days.length ? days : x.days };
          }),
        }));
        // a day added to the session gets its task for what is left of this week; nothing already made is touched
        get().makeSessionTasks();
      },
      deleteSession: (id) => {
        const gone = get().sessions.find((x) => x.id === id) ?? null;
        if (gone) set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }));
        return gone;
      },
      restoreSession: (session) => set((s) => ({ sessions: [...s.sessions.filter((x) => x.id !== session.id), session] })),
      makeSessionTasks: (today = todayISO()) => set((s) => {
        const due = sessionTasksDue(s.sessions, s.sessionsMade, today, s.settings.weekStartsOn);
        if (due.length === 0) return s;
        let tasks = s.tasks;
        // only this week's entries can ever be asked about again, so earlier ones are let go
        const weekStart = weekStartOf(today, s.settings.weekStartsOn), made = s.sessionsMade.filter((k) => k.slice(k.indexOf('|') + 1) >= weekStart);
        for (const { session, date } of due) {
          const order = Math.max(0, ...siblings(tasks, { scope: 'day', date }).map((t) => t.order)) + 1;
          tasks = [...tasks, { id: newId(), title: session.name, subjectId: session.subjectId, priority: 'normal', scope: 'day', date, order, createdAt: new Date().toISOString(), sessionId: session.id }];
          made.push(madeKey(session.id, date));
        }
        return { tasks, sessionsMade: made };
      }),
      writeReview: (weekStart, patch) => set((s) => {
        if (!canReview(weekStart, todayISO(), s.settings.weekStartsOn)) return s;
        const clean = Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, String(v).slice(0, 2000)]));
        const existing = s.reviews.find((r) => r.weekStart === weekStart);
        return { reviews: existing ? s.reviews.map((r) => (r === existing ? { ...r, ...clean } : r)) : [...s.reviews, { weekStart, wentWell: '', gotInWay: '', change: '', ...clean }] };
      }),
      rateReview: (weekStart, areaId, rating) => set((s) => {
        if (!canReview(weekStart, todayISO(), s.settings.weekStartsOn) || !s.areas.some((a) => a.id === areaId)) return s;
        const clean = rating === null ? null : cleanRating(rating), existing = s.reviews.find((r) => r.weekStart === weekStart);
        // clearing a rating on a week that has no review is nothing to keep
        if (!existing && clean === null) return s;
        const ratings = { ...existing?.ratings };
        if (clean === null) delete ratings[areaId]; else ratings[areaId] = clean;
        return { reviews: existing ? s.reviews.map((r) => (r === existing ? { ...r, ratings } : r)) : [...s.reviews, { weekStart, wentWell: '', gotInWay: '', change: '', ratings }] };
      }),
      addArea: (name) => {
        const clean = cleanTitle(name).slice(0, AREA_LIMITS.name).trim();
        if (!clean || get().areas.length >= AREA_LIMITS.max) return null;
        const id = newId().replace('t-', 'area-');
        set((s) => ({ areas: [...s.areas, { id, name: clean }] }));
        return id;
      },
      renameArea: (id, name) => set((s) => ({ areas: s.areas.map((a) => (a.id === id ? { ...a, name: cleanTitle(name).slice(0, AREA_LIMITS.name).trim() || a.name } : a)) })),
      deleteArea: (id) => {
        const index = get().areas.findIndex((a) => a.id === id), area = get().areas[index];
        if (!area) return null;
        set((s) => ({ areas: s.areas.filter((a) => a.id !== id) }));
        return { area, index };
      },
      restoreArea: (area, index) => set((s) => ({ areas: putBack(s.areas, area, index) })),
      moveArea: (id, direction) => set((s) => ({ areas: moved(s.areas, id, direction) })),
      addLink: (input) => {
        const url = cleanUrl(input.url);
        if (!url || get().links.length >= LINK_LIMITS.max) return null;
        const id = newId().replace('t-', 'l-');
        set((s) => ({ links: [...s.links, { id, name: linkName(input.name, url), url }] }));
        return id;
      },
      updateLink: (id, patch) => {
        const link = get().links.find((l) => l.id === id), url = link && patch.url !== undefined ? cleanUrl(patch.url) : link?.url;
        if (!link || !url) return false;
        set((s) => ({ links: s.links.map((l) => (l.id === id ? { ...l, url, name: patch.name !== undefined ? linkName(patch.name, url) : l.name } : l)) }));
        return true;
      },
      deleteLink: (id) => {
        const index = get().links.findIndex((l) => l.id === id), link = get().links[index];
        if (!link) return null;
        set((s) => ({ links: s.links.filter((l) => l.id !== id) }));
        return { link, index };
      },
      restoreLink: (link, index) => set((s) => ({ links: putBack(s.links, link, index) })),
      moveLink: (id, direction) => set((s) => ({ links: moved(s.links, id, direction) })),
      saveReview: (weekStart) => {
        const review = get().reviews.find((r) => r.weekStart === weekStart);
        if (!review || isBlank(review, get().areas)) return false;
        set((s) => {
          // a review already saved has had its miles, whatever the log holds (the sample's has no entry of its own)
          const award = review.savedAt ? null : reviewAward(weekStart, s.log, todayISO(), s.settings.weekStartsOn);
          return { reviews: s.reviews.map((r) => (r.weekStart === weekStart ? { ...r, savedAt: r.savedAt ?? new Date().toISOString() } : r)), log: award ? [...s.log, award] : s.log };
        });
        return true;
      },
      addPage: (kind) => {
        const id = newId().replace('t-', 'p-');
        set((s) => ({ pages: [...s.pages, newPage(kind, id, new Date().toISOString())] }));
        return id;
      },
      updatePage: (id, patch) => set((s) => ({
        pages: changePage(s.pages, id, (p) => {
          const kind = patch.kind ?? p.kind;
          return {
            ...p, kind,
            title: patch.title !== undefined ? cleanPageTitle(patch.title) || p.title : p.title,
            text: patch.text !== undefined ? patch.text.slice(0, PAGE_LIMITS.text) : p.text,
            aimFor: patch.aimFor === null ? undefined : patch.aimFor ?? p.aimFor,
            subjectId: patch.subjectId === null ? undefined : patch.subjectId ?? p.subjectId,
            // only a goal can be reached, so a page that stops being one is open again
            reachedOn: kind === 'goal' ? p.reachedOn : undefined,
          };
        }),
      })),
      deletePage: (id) => {
        const gone = get().pages.find((p) => p.id === id) ?? null;
        if (gone) set((s) => ({ pages: s.pages.filter((p) => p.id !== id) }));
        return gone;
      },
      restorePage: (page) => set((s) => ({ pages: [...s.pages.filter((p) => p.id !== page.id), page] })),
      setReached: (id, reached) => set((s) => ({ pages: changePage(s.pages, id, (p) => (p.kind !== 'goal' || !!p.reachedOn === reached ? p : { ...p, reachedOn: reached ? todayISO() : undefined })) })),
      addPageItem: (pageId, text) => {
        const before = get().pages.find((p) => p.id === pageId), id = newId().replace('t-', 'i-');
        if (!before || addItem(before, text, id) === before) return false;
        set((s) => ({ pages: changePage(s.pages, pageId, (p) => addItem(p, text, id)) }));
        return true;
      },
      togglePageItem: (pageId, itemId) => set((s) => ({ pages: changePage(s.pages, pageId, (p) => toggleItem(p, itemId)) })),
      editPageItem: (pageId, itemId, text) => set((s) => ({ pages: changePage(s.pages, pageId, (p) => editItem(p, itemId, text)) })),
      movePageItem: (pageId, itemId, direction) => set((s) => ({ pages: changePage(s.pages, pageId, (p) => moveItem(p, itemId, direction)) })),
      deletePageItem: (pageId, itemId) => {
        const page = get().pages.find((p) => p.id === pageId), removed = page ? removeItem(page, itemId) : null;
        if (!removed) return null;
        set((s) => ({ pages: changePage(s.pages, pageId, (p) => removeItem(p, itemId)?.page ?? p) }));
        return { item: removed.item, index: removed.index };
      },
      restorePageItem: (pageId, item, index) => set((s) => ({ pages: changePage(s.pages, pageId, (p) => insertItem(p, item, index)) })),
      untickPageItems: (pageId) => {
        const page = get().pages.find((p) => p.id === pageId), ticked = page ? untickAll(page).ticked : [];
        if (ticked.length) set((s) => ({ pages: changePage(s.pages, pageId, (p) => untickAll(p).page) }));
        return ticked;
      },
      tickPageItems: (pageId, itemIds) => set((s) => ({ pages: changePage(s.pages, pageId, (p) => ({ ...p, items: p.items.map((i) => (itemIds.includes(i.id) ? { ...i, done: true } : i)) })) })),
      addHabit: (name, days) => {
        const clean = cleanTitle(name).slice(0, 60), on = cleanDays(days ?? [0, 1, 2, 3, 4, 5, 6]);
        if (!clean || on.length === 0) return null;
        const id = newId().replace('t-', 'h-'), order = Math.max(0, ...get().habits.map((h) => h.order)) + 1;
        set((s) => ({ habits: [...s.habits, { id, name: clean, days: on, order, createdOn: todayISO() }] }));
        return id;
      },
      updateHabit: (id, patch) => set((s) => ({
        habits: s.habits.map((h) => {
          if (h.id !== id) return h;
          const days = patch.days ? cleanDays(patch.days) : h.days;
          // a habit keeps its last good name and at least one day
          return { ...h, name: patch.name !== undefined ? cleanTitle(patch.name).slice(0, 60) || h.name : h.name, days: days.length ? days : h.days };
        }),
      })),
      deleteHabit: (id) => {
        const habit = get().habits.find((h) => h.id === id);
        if (!habit) return null;
        const mine = get().ticks.filter((t) => t.startsWith(`${id}|`));
        set((s) => ({ habits: s.habits.filter((h) => h.id !== id), ticks: s.ticks.filter((t) => !t.startsWith(`${id}|`)) }));
        return { habit, ticks: mine };
      },
      restoreHabit: (removed) => set((s) => ({ habits: [...s.habits.filter((h) => h.id !== removed.habit.id), removed.habit], ticks: [...new Set([...s.ticks, ...removed.ticks])] })),
      toggleHabit: (id, date) => set((s) => {
        const habit = s.habits.find((h) => h.id === id), today = todayISO(), key = tickKey(id, date);
        if (!habit || date > today || !isDue(habit, date)) return s;
        if (s.ticks.includes(key)) return { ticks: s.ticks.filter((t) => t !== key) };
        const award = habitAward(id, date, s.log, today);
        return { ticks: [...s.ticks, key], log: award ? [...s.log, award] : s.log };
      }),
      setLevel: (weekStart, subjectId, level) => set((s) => ({ levels: withLevel(s.levels, weekStart, subjectId, level) })),
      // the boat keeps its last good name; the goal can be cleared, so an empty one is no goal
      setBoat: (patch) => set((s) => ({
        boat: clampStage({
          ...s.boat, ...patch,
          name: patch.name !== undefined ? patch.name.trim().slice(0, 40) || s.boat.name : s.boat.name,
          boundFor: patch.boundFor !== undefined ? cleanTitle(patch.boundFor).slice(0, 60).trim() || undefined : s.boat.boundFor,
        }, milesLogged(s.log), daysAtSea(s.log)),
      })),
      setSettings: (patch) => set((s) => ({
        settings: { ...s.settings, ...patch, name: patch.name !== undefined ? patch.name.trim().slice(0, 30).trim() || undefined : s.settings.name },
        // the levels are kept by the first day of their week, so they move with it when that day changes
        ...(patch.weekStartsOn !== undefined && patch.weekStartsOn !== s.settings.weekStartsOn ? { levels: rekeyed(s.levels, patch.weekStartsOn) } : {}),
      })),
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
      partialize: ({ subjects, tasks, assessments, log, habits, ticks, sessions, sessionsMade, reviews, pages, links, areas, levels, boat, settings, sample }) => ({ subjects, tasks, assessments, log, habits, ticks, sessions, sessionsMade, reviews, pages, links, areas, levels, boat, settings, sample }),
      // anything unreadable falls back to the sample, so a bad save can never stop the app opening
      merge: (saved, current) => {
        const s = saved as Partial<CompassData> | undefined;
        if (!s || !Array.isArray(s.tasks) || !Array.isArray(s.log) || !s.boat || !s.settings) return current;
        // a save from before habits existed gets the sample habits if it is still the sample, and none if it is the user's own
        const fresh = s.sample !== false, habits = Array.isArray(s.habits) ? s.habits : fresh ? current.habits : [], ticks = Array.isArray(s.ticks) ? s.ticks : fresh ? current.ticks : [];
        return { ...current, ...s, habits, ticks, sessions: Array.isArray(s.sessions) ? s.sessions : [], sessionsMade: Array.isArray(s.sessionsMade) ? s.sessionsMade : [], reviews: Array.isArray(s.reviews) ? s.reviews : fresh ? current.reviews : [], pages: Array.isArray(s.pages) ? s.pages : fresh ? current.pages : [],
          // a save from before links, areas and levels existed starts with none set, and the four starting areas
          // and nothing in those lists is taken on trust: a save can be edited by hand, and a link is only a link if it is a web address
          links: storedLinks(s.links), areas: storedAreas(s.areas), levels: s.levels && typeof s.levels === 'object' && !Array.isArray(s.levels) ? s.levels : {},
          subjects: Array.isArray(s.subjects) && s.subjects.length ? s.subjects : current.subjects, assessments: Array.isArray(s.assessments) ? s.assessments : current.assessments };
      },
    },
  ),
);

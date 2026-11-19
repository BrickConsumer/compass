import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { isISODate, todayISO, weekStartOf } from '../domain/dates';
import { type CompassData, empty, sampleLog, seed } from '../domain/seed';
import { cleanDays, isDue, tickKey } from '../domain/habits';
import { addItem, cleanPageTitle, editItem, insertItem, moveItem, newPage, PAGE_KINDS, PAGE_LIMITS, removeItem, storedItems, toggleItem, untickAll } from '../domain/pages';
import { rekeyed, withLevel } from '../domain/levels';
import { cleanFeedback, feedbackTask, storedFeedback } from '../domain/feedback';
import { canStart, cleanWords, FITNESS_LIMITS, newWorkout, storedBests, storedMeasures, storedRoutines, storedWorkouts } from '../domain/fitness';
import { cleanHeadline, formOf, INTEREST_LIMITS, interestName, isReadyMade, siteName, startersIn, storedFields, storedHeadlines, storedInterests } from '../domain/interests';
import { cleanUrl, LINK_LIMITS, linkName, storedLink, storedLinks } from '../domain/links';
import { AREA_LIMITS, cleanRating, storedAreas } from '../domain/ratings';
import { canReview, isBlank, reviewAward } from '../domain/review';
import { madeKey, sessionTasksDue } from '../domain/sessions';
import { storedAssessments, storedBoat, storedHabits, storedLevels, storedLog, storedReviews, storedSessions, storedSettings, storedStrings, storedTasks } from '../domain/stored';
import { cleanTopic, nextColour } from '../domain/study';
import { cleanTitle } from '../domain/tasks';
import { storedTheme } from '../domain/theme';
import { once, time } from '../domain/words';
import { type Assessment, type Best, type Boat, type Feedback, type FormSet, type Habit, type Headline, type Interest, type ISODate, type Level, type Measure, type Page, type PageItem, type PageKind, type Priority, type QuickLink, type RatingArea, type Review, type Routine, type Session, type Settings, type Subject, SUBJECT_COLOURS, type SubjectColour, type Task, type Workout, type WorkoutLine } from '../domain/types';
import { awardsFor, daysAtSea, earnedStage, habitAward, milesLogged, workoutAward } from '../domain/voyage';
import { STAGE_ORDER } from '../features/voyage/boat/specs';

export interface NewTask { title: string; date: ISODate; scope: 'day' | 'week'; priority?: Priority; subjectId?: string; notes?: string; /** One web address. Anything else is left off. */ link?: string; /** The assessment it is preparation for. Kept only if that assessment exists. */ assessmentId?: string }

/** A deleted subject, with its assessments, its study sessions and the tasks that carried it. */
export interface RemovedSubject { subject: Subject; assessments: Assessment[]; sessions: Session[]; feedback: Feedback[]; taskIds: string[]; pageIds: string[] }

/** The two lists kept by hand in Fitness. */
export type KeptList = 'bests' | 'measures';

export interface CompassStore extends CompassData {
  /** Add a task. Returns its id, or null when the title is empty. */
  addTask: (input: NewTask) => string | null;
  /** Change a task. `assessmentId: null` frees it from the assessment it was preparation for. */
  updateTask: (id: string, patch: Partial<Pick<Task, 'title' | 'notes' | 'subjectId' | 'priority' | 'scope' | 'date' | 'order'>> & { assessmentId?: string | null }) => void;
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
  /** Change a subject. An empty name keeps the last good one; an empty topic means the subject has none. */
  updateSubject: (id: string, patch: { name?: string; colour?: SubjectColour; notes?: string; topic?: string }) => void;
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
  /** Set a task's link, or clear it with an empty address. Returns false, with nothing changed, when the address is not a web address. */
  setTaskLink: (id: string, url: string) => boolean;
  /** Set an assessment's link, or clear it with an empty address. Returns false, with nothing changed, when the address is not a web address. */
  setAssessmentLink: (id: string, url: string) => boolean;
  /** Add a link to a subject. Returns its id, or null when the address is not a web address, the subject is unknown or it has six already. */
  addSubjectLink: (subjectId: string, input: { name: string; url: string }) => string | null;
  updateSubjectLink: (subjectId: string, linkId: string, patch: { name?: string; url?: string }) => boolean;
  deleteSubjectLink: (subjectId: string, linkId: string) => { link: QuickLink; index: number } | null;
  restoreSubjectLink: (subjectId: string, link: QuickLink, index: number) => void;
  moveSubjectLink: (subjectId: string, linkId: string, direction: -1 | 1) => void;
  /** Add feedback to a subject. Returns its id, or null when nothing was said or the subject is unknown. */
  addFeedback: (input: { subjectId: string; date: ISODate; about?: string; words: string; work?: string }) => string | null;
  /** Change an entry. Empty words keep the last good ones. */
  updateFeedback: (id: string, patch: { date?: ISODate; about?: string; words?: string; work?: string }) => void;
  deleteFeedback: (id: string) => Feedback | null;
  restoreFeedback: (entry: Feedback) => void;
  /** Make an entry's "to work on" into a task for any time this week. Returns the task's id, or null when there is nothing to work on or its task still exists. */
  makeFeedbackTask: (id: string) => string | null;
  /** Add a link. Returns its id, or null when the address is not a web address or there are six already. With no name it takes its site's. */
  addLink: (input: { name: string; url: string }) => string | null;
  /** Change a link. Returns false, with nothing changed, when the new address is not a web address. */
  updateLink: (id: string, patch: { name?: string; url?: string }) => boolean;
  /** Remove a link, and return it with its place so the caller can offer Undo. */
  deleteLink: (id: string) => { link: QuickLink; index: number } | null;
  restoreLink: (link: QuickLink, index: number) => void;
  moveLink: (id: string, direction: -1 | 1) => void;
  /** Start a page of this kind, named "Untitled". Returns its id. */
  /** A page started from a subject carries it, and may have its title. A subject that does not exist is left off. */
  addPage: (kind: PageKind, start?: { title?: string; subjectId?: string }) => string;
  /** Change a page. `null` clears its date, its subject or its interest. An empty title keeps the last good one, and an interest that does not exist is left off. */
  updatePage: (id: string, patch: { title?: string; kind?: PageKind; text?: string; aimFor?: ISODate | null; subjectId?: string | null; interestId?: string | null }) => void;
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
  /** Add a training routine, with no days and no lines yet. Returns its id, or null when the name is empty or there are twenty already. */
  addRoutine: (name: string) => string | null;
  /** Change a routine. An empty name keeps the last good one. It may have no days at all, which is a routine with no fixed day. */
  updateRoutine: (id: string, patch: { name?: string; days?: number[] }) => void;
  /** Remove a routine, and return it with its place so the caller can offer Undo. Sessions started from it are kept. */
  deleteRoutine: (id: string) => { routine: Routine; index: number } | null;
  restoreRoutine: (routine: Routine, index: number) => void;
  /** Add a line to a routine. Returns false when it is empty or the routine has forty. Sessions already started keep the lines they had. */
  addRoutineLine: (routineId: string, text: string) => boolean;
  editRoutineLine: (routineId: string, lineId: string, text: string) => void;
  moveRoutineLine: (routineId: string, lineId: string, direction: -1 | 1) => void;
  deleteRoutineLine: (routineId: string, lineId: string) => void;
  /** Start a routine's session for a day, or find the one already started. Returns its id, or null when the routine is unknown or cannot be started for that day: see `canStart`. */
  startWorkout: (routineId: string, date: ISODate) => string | null;
  /** Finish an open session. Returns the miles it logged, 2 or 0, or null when there is no such open session. It earns the first time or not at all. */
  finishWorkout: (id: string) => number | null;
  /** Make a finished session a started one again. Nothing is taken from the log. */
  reopenWorkout: (id: string) => void;
  /** Remove a session and return it, so the caller can offer Undo. The miles it logged stay. */
  deleteWorkout: (id: string) => Workout | null;
  /** Put a removed session back, unless its routine has another session for that day by now. */
  restoreWorkout: (workout: Workout) => void;
  /** A session's note, kept as it is typed. */
  setWorkoutNote: (id: string, note: string) => void;
  /** Tick or untick a line. It earns nothing. */
  toggleWorkoutLine: (id: string, lineId: string) => void;
  /** Add a line to this session only. Returns false when it is empty or the session has forty. */
  addWorkoutLine: (id: string, text: string) => boolean;
  editWorkoutLine: (id: string, lineId: string, text: string) => void;
  moveWorkoutLine: (id: string, lineId: string, direction: -1 | 1) => void;
  deleteWorkoutLine: (id: string, lineId: string) => { line: WorkoutLine; index: number } | null;
  restoreWorkoutLine: (id: string, line: WorkoutLine, index: number) => void;
  /** Add a best or a measure. Returns its id, or null without a name, a value and a real date, or when the list is full. */
  addKept: (list: KeptList, input: { name: string; value: string; date: ISODate; unit?: string }) => string | null;
  /** Correct a best or a measure. An empty name or value, or a date that is not one, keeps the last good one. The value before is never touched. */
  updateKept: (list: KeptList, id: string, patch: { name?: string; value?: string; date?: ISODate; unit?: string }) => void;
  /** Keep a new value, dated today. The one it replaces becomes the value before. Returns the record as it was, for Undo, or null when the value is empty. */
  newKept: (list: KeptList, id: string, value: string) => Best | Measure | null;
  deleteKept: (list: KeptList, id: string) => { item: Best | Measure; index: number } | null;
  /** Put a best or a measure back at its place, in place of any record with its id. */
  restoreKept: (list: KeptList, item: Best | Measure, index: number) => void;
  /** Add an interest: a folder in My pages. With no name typed it takes the name of where it starts from. Returns its id, or null when it has no name or there are eight already. */
  addInterest: (input: { name: string; forms: FormSet }) => string | null;
  /** Rename an interest or change where it starts from. An empty name keeps the last good one. */
  updateInterest: (id: string, patch: { name?: string; forms?: FormSet }) => void;
  /** Remove an interest. Its pages are kept, in no interest. Returns what Undo needs to put it all back. */
  deleteInterest: (id: string) => { interest: Interest; index: number; pageIds: string[] } | null;
  restoreInterest: (removed: { interest: Interest; index: number; pageIds: string[] }) => void;
  /** Start a page in an interest from one of the forms it offers. Returns its id, or null when the interest is unknown or does not offer that form. */
  startPage: (interestId: string, formId: string) => string | null;
  /** Write in one of a form's parts. It is ordinary writing, kept as typed, up to 2,000 characters. */
  setPageField: (pageId: string, fieldId: string, text: string) => void;
  /** Set a page's link, or clear it with an empty address. Returns false, with nothing changed, when the address is not a web address. */
  setPageLink: (id: string, url: string) => boolean;
  /** Save a headline. Returns its id, or null when it has no title, no web address or no real date, or there are sixty already. */
  addHeadline: (input: { title: string; url: string; source?: string; date: string; tag?: string }) => string | null;
  /** Change a headline. Returns false, with nothing changed, when the change would leave it without a title, a web address or a real date. */
  updateHeadline: (id: string, patch: { title?: string; url?: string; source?: string; date?: string; tag?: string }) => boolean;
  deleteHeadline: (id: string) => { headline: Headline; index: number } | null;
  restoreHeadline: (headline: Headline, index: number) => void;
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
  /**
   * Replace everything with what a backup holds, checked as a save is: see `backupData`. The theme stays as this
   * device has it. Returns what was here before, so the caller can offer Undo.
   */
  restoreBackup: (data: Record<string, unknown>) => CompassData;
  /** Put back what a restore replaced. */
  undoRestore: (before: CompassData) => void;
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

/** A list with one of its records changed, and the rest as they were. */
const changed = <T extends { id: string }>(list: T[], id: string, change: (item: T) => T): T[] => list.map((x) => (x.id === id ? change(x) : x));
/** A routine's or a session's lines with one reworded. Empty words keep the last good ones. */
const reworded = <T extends { id: string; text: string }>(lines: T[], id: string, text: string): T[] => changed(lines, id, (l) => ({ ...l, text: cleanWords(text, FITNESS_LIMITS.line) || l.text }));

/** Bests and measures are kept the same way, in two lists with their own limits. */
const KEPT = { bests: { max: FITNESS_LIMITS.bests, value: FITNESS_LIMITS.bestValue }, measures: { max: FITNESS_LIMITS.measures, value: FITNESS_LIMITS.measureValue } } as const;
const keptOf = (data: CompassData, list: KeptList): (Best | Measure)[] => data[list];
const withKept = (data: CompassData, list: KeptList, change: (items: (Best | Measure)[]) => (Best | Measure)[]): Partial<CompassData> =>
  (list === 'bests' ? { bests: change(data.bests) } : { measures: change(data.measures) as Measure[] });

/** A subject's links after a change. A subject with none carries no list at all. */
function withLinks(subjects: Subject[], subjectId: string, change: (links: QuickLink[]) => QuickLink[]): Subject[] {
  return subjects.map((x) => {
    if (x.id !== subjectId) return x;
    const { links, ...rest } = x, next = change(links ?? []);
    return next.length ? { ...rest, links: next } : rest;
  });
}

/**
 * A list from a save, keeping only the records that have the words a page cannot do without. A save can be edited
 * by hand or cut short, and one entry that is not a record must not stop the app opening.
 */
function records<T>(list: unknown[], ...needs: string[]): T[] {
  return list.filter((x) => !!x && typeof x === 'object' && !Array.isArray(x) && needs.every((key) => { const v = (x as Record<string, unknown>)[key]; return typeof v === 'string' && v !== ''; })) as T[];
}

/**
 * A subject from a save, built again from what a subject has: its name, a colour that is one of the eight, its
 * notes and topic only if they are words, and its links checked as any saved links are.
 */
function storedSubject(subject: Subject): Subject {
  const kept = storedLinks(subject.links), topic = typeof subject.topic === 'string' ? cleanTopic(subject.topic) : '';
  // a colour that is not one of the eight would leave the subject with nothing to draw its dot in
  const colour = Object.keys(SUBJECT_COLOURS).includes(subject.colour) ? subject.colour : 'marine';
  return { id: subject.id, name: subject.name, colour, ...(typeof subject.notes === 'string' ? { notes: subject.notes } : {}), ...(topic ? { topic } : {}), ...(kept.length ? { links: kept } : {}) };
}

/** The settings that outlast the data: the theme, which belongs to the device, and whether Fitness is shown. */
const kept = (settings: Settings): Partial<Settings> => ({ theme: settings.theme, ...(settings.fitness === true ? { fitness: true } : {}) });

/**
 * A page from a save. Its link is kept only if it is a web address, its parts only where they have an id and a label,
 * its form only if it is one, and its interest only if it is named by an id. Its list keeps only what is an item,
 * a kind that is not one of the five is a note, and a page with no list, no writing or no dates gets empty ones,
 * so a save cut short or edited by hand cannot stop a page opening. A date to aim for, or the day a goal was
 * reached, is kept only if it is a day. The page is built again from what a page has, so nothing else rides in on it.
 */
function storedPage(page: Page): Page {
  const { link, fields, form, interestId, subjectId, aimFor, reachedOn } = page, keptLink = storedLink(link), keptFields = storedFields(fields);
  // the times are read as times, to say which page was changed last
  const made = time(page.createdAt) || new Date(0).toISOString();
  return {
    id: page.id, title: page.title, kind: PAGE_KINDS.some((k) => k.id === page.kind) ? page.kind : 'note', items: storedItems(page.items), text: typeof page.text === 'string' ? page.text : '',
    createdAt: made, updatedAt: time(page.updatedAt) || made,
    ...(isISODate(aimFor) ? { aimFor } : {}), ...(isISODate(reachedOn) ? { reachedOn } : {}),
    ...(typeof subjectId === 'string' && subjectId ? { subjectId } : {}),
    ...(keptLink ? { link: keptLink } : {}), ...(keptFields ? { fields: keptFields } : {}),
    ...(typeof form === 'string' && formOf(form) ? { form } : {}), ...(typeof interestId === 'string' && interestId ? { interestId } : {}),
  };
}

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

/** Everything Compass keeps, by name. Only these are saved, and only these are read from a save or a backup. */
export const DATA_KEYS = ['subjects', 'tasks', 'assessments', 'log', 'habits', 'ticks', 'sessions', 'sessionsMade', 'reviews', 'pages', 'links', 'areas', 'levels', 'feedback', 'routines', 'workouts', 'bests', 'measures', 'interests', 'headlines', 'boat', 'settings', 'sample'] as const satisfies readonly (keyof CompassData)[];
// A part of the data added later and left out of the list above would never be saved, and nothing would say so.
// This line stops the build instead: it only holds while the list names every part.
true satisfies (Exclude<keyof CompassData, (typeof DATA_KEYS)[number]> extends never ? true : never);

/** What Compass keeps, without what it does: the part of the store that is saved, and that a backup holds. */
export function dataOf(state: CompassData): CompassData {
  const out: Partial<Record<keyof CompassData, unknown>> = {};
  for (const key of DATA_KEYS) out[key] = state[key];
  return out as CompassData;
}

/**
 * A save, opened: when Compass starts, and when a backup is restored. Only what Compass keeps is read from it, and
 * nothing in it is taken on trust, since a save can be edited by hand and a backup is a file that can come from
 * anywhere. A record without what it needs is dropped, and a link is only a link if it is a web address. A save that
 * cannot be read at all leaves `current` as it is, so a bad one can never stop the app opening.
 * `current` is what to fall back on: a save from before a part of Compass existed gets that part's sample if it is
 * still the sample, and none of it if it is the user's own.
 */
export function openSave<T extends CompassData>(saved: unknown, current: T): T {
  const s = saved && typeof saved === 'object' && !Array.isArray(saved) ? (saved as Partial<Record<keyof CompassData, unknown>>) : undefined;
  if (!s || !Array.isArray(s.tasks) || !Array.isArray(s.log) || !s.boat || !s.settings) return current;
  const fresh = s.sample !== false;
  const data: CompassData = {
    tasks: storedTasks(s.tasks),
    // The sample with its subjects lost gets them back. The user's own data with none has none: they were deleted, and
    // falling back here would bring the last one back, from this tab's copy, when another tab deleted it.
    subjects: Array.isArray(s.subjects) && (s.subjects.length || !fresh) ? once(records<Subject>(s.subjects, 'id', 'name').map(storedSubject)) : current.subjects,
    // a save with no list of assessments gets the sample's if it is still the sample, and none if it is the user's own
    assessments: Array.isArray(s.assessments) ? storedAssessments(s.assessments) : fresh ? current.assessments : [],
    log: storedLog(s.log),
    // a save from before habits existed gets the sample habits if it is still the sample, and none if it is the user's own
    habits: Array.isArray(s.habits) ? storedHabits(s.habits) : fresh ? current.habits : [],
    ticks: Array.isArray(s.ticks) ? storedStrings(s.ticks) : fresh ? current.ticks : [],
    sessions: storedSessions(s.sessions), sessionsMade: storedStrings(s.sessionsMade),
    reviews: Array.isArray(s.reviews) ? storedReviews(s.reviews) : fresh ? current.reviews : [],
    pages: Array.isArray(s.pages) ? once(records<Page>(s.pages, 'id', 'title').map(storedPage)) : fresh ? current.pages : [],
    // a save from before links, areas and levels existed starts with none set, and the four starting areas
    links: storedLinks(s.links), areas: storedAreas(s.areas), levels: storedLevels(s.levels),
    feedback: storedFeedback(s.feedback),
    // a save from before interests and headlines has none of either
    interests: storedInterests(s.interests), headlines: storedHeadlines(s.headlines),
    // a save from before Fitness gets the sample's training week if it is still the sample, and none if it is the user's own
    routines: s.routines === undefined ? (fresh ? current.routines : []) : storedRoutines(s.routines),
    workouts: s.workouts === undefined ? (fresh ? current.workouts : []) : storedWorkouts(s.workouts),
    bests: s.bests === undefined ? (fresh ? current.bests : []) : storedBests(s.bests),
    measures: s.measures === undefined ? (fresh ? current.measures : []) : storedMeasures(s.measures),
    boat: storedBoat(s.boat, current.boat), settings: storedSettings(s.settings), sample: fresh,
  };
  return { ...current, ...data };
}

/**
 * What restoring a backup would leave Compass holding, with nothing changed: the backup's data, checked exactly as a
 * save is when Compass opens. It is opened against a fresh sample, as it would be on a device that has never run
 * Compass, so a backup from before a part of Compass existed gets what an older save gets.
 */
export const backupData = (data: Record<string, unknown>): CompassData => dataOf(openSave(data, seed(todayISO())));

export const useCompass = create<CompassStore>()(
  persist(
    (set, get) => ({
      ...seed(todayISO()),
      addTask: (input) => {
        const title = cleanTitle(input.title);
        if (!title) return null;
        const id = newId(), order = Math.max(0, ...siblings(get().tasks, input).map((t) => t.order)) + 1;
        // preparation is for an assessment that exists; a name for one that does not is left off
        const assessmentId = get().assessments.some((a) => a.id === input.assessmentId) ? input.assessmentId : undefined, link = input.link ? cleanUrl(input.link) : null;
        set((s) => ({ tasks: [...s.tasks, { id, title, date: input.date, scope: input.scope, priority: input.priority ?? 'normal', subjectId: input.subjectId, notes: input.notes?.trim() || undefined, order, createdAt: new Date().toISOString(), ...(assessmentId ? { assessmentId } : {}), ...(link ? { link } : {}) }] }));
        return id;
      },
      updateTask: (id, patch) => set((s) => ({
        tasks: s.tasks.map((t) => {
          if (t.id !== id) return t;
          const { assessmentId, ...rest } = patch, next: Task = { ...t, ...rest };
          // a link is set only by setTaskLink, which checks it. Whatever a patch holds, the task keeps the link it had
          if (t.link) next.link = t.link; else delete next.link;
          if (assessmentId === null) delete next.assessmentId;
          else if (assessmentId !== undefined && s.assessments.some((a) => a.id === assessmentId)) next.assessmentId = assessmentId;
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
          topic: patch.topic !== undefined ? cleanTopic(patch.topic) || undefined : x.topic,
        })),
      })),
      deleteSubject: (id) => {
        const subject = get().subjects.find((x) => x.id === id);
        if (!subject) return null;
        const removed: RemovedSubject = { subject, assessments: get().assessments.filter((a) => a.subjectId === id), sessions: get().sessions.filter((x) => x.subjectId === id), feedback: get().feedback.filter((f) => f.subjectId === id), taskIds: get().tasks.filter((t) => t.subjectId === id).map((t) => t.id), pageIds: get().pages.filter((p) => p.subjectId === id).map((p) => p.id) };
        set((s) => ({ subjects: s.subjects.filter((x) => x.id !== id), assessments: s.assessments.filter((a) => a.subjectId !== id), sessions: s.sessions.filter((x) => x.subjectId !== id), feedback: s.feedback.filter((f) => f.subjectId !== id), tasks: s.tasks.map((t) => (t.subjectId === id ? { ...t, subjectId: undefined } : t)), pages: s.pages.map((p) => (p.subjectId === id ? { ...p, subjectId: undefined } : p)) }));
        return removed;
      },
      restoreSubject: (removed) => set((s) => ({
        subjects: [...s.subjects.filter((x) => x.id !== removed.subject.id), removed.subject],
        assessments: [...s.assessments.filter((a) => !removed.assessments.some((r) => r.id === a.id)), ...removed.assessments],
        sessions: [...s.sessions.filter((x) => !removed.sessions.some((r) => r.id === x.id)), ...removed.sessions],
        feedback: [...s.feedback.filter((f) => !removed.feedback.some((r) => r.id === f.id)), ...removed.feedback],
        tasks: s.tasks.map((t) => (removed.taskIds.includes(t.id) ? { ...t, subjectId: removed.subject.id } : t)),
        pages: s.pages.map((p) => (removed.pageIds.includes(p.id) ? { ...p, subjectId: removed.subject.id } : p)),
      })),
      addAssessment: (input) => {
        const title = cleanTitle(input.title).slice(0, 80);
        if (!title || !get().subjects.some((x) => x.id === input.subjectId)) return null;
        const id = newId().replace('t-', 'a-');
        const { link: typed, ...rest } = input, link = typed ? cleanUrl(typed) : null;
        set((s) => ({ assessments: [...s.assessments, { ...rest, id, title, ...(link ? { link } : {}) }] }));
        return id;
      },
      updateAssessment: (id, patch) => set((s) => ({
        // a link is set and cleared by setAssessmentLink, which checks it; here one is only ever replaced by a web address
        assessments: s.assessments.map((a) => (a.id !== id ? a : { ...a, ...patch, id, title: patch.title !== undefined ? cleanTitle(patch.title).slice(0, 80) || a.title : a.title, date: patch.date || a.date, link: (patch.link !== undefined ? cleanUrl(patch.link) : null) ?? a.link })),
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
      // Asked every time Compass opens. With nothing due it sets what is already there, which still saves: on a first
      // visit that is the save that puts Compass's data on the device at all.
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
      setTaskLink: (id, url) => {
        const clean = url.trim() ? cleanUrl(url) : undefined;
        if (clean === null || !get().tasks.some((t) => t.id === id)) return false;
        set((s) => ({ tasks: s.tasks.map((t) => { if (t.id !== id) return t; const { link, ...rest } = t; return clean ? { ...rest, link: clean } : rest; }) }));
        return true;
      },
      setAssessmentLink: (id, url) => {
        const clean = url.trim() ? cleanUrl(url) : undefined;
        if (clean === null || !get().assessments.some((a) => a.id === id)) return false;
        set((s) => ({ assessments: s.assessments.map((a) => { if (a.id !== id) return a; const { link, ...rest } = a; return clean ? { ...rest, link: clean } : rest; }) }));
        return true;
      },
      addSubjectLink: (subjectId, input) => {
        const subject = get().subjects.find((x) => x.id === subjectId), url = cleanUrl(input.url);
        if (!subject || !url || (subject.links?.length ?? 0) >= LINK_LIMITS.max) return null;
        const id = newId().replace('t-', 'l-');
        set((s) => ({ subjects: withLinks(s.subjects, subjectId, (links) => [...links, { id, name: linkName(input.name, url), url }]) }));
        return id;
      },
      updateSubjectLink: (subjectId, linkId, patch) => {
        const link = get().subjects.find((x) => x.id === subjectId)?.links?.find((l) => l.id === linkId), url = link && patch.url !== undefined ? cleanUrl(patch.url) : link?.url;
        if (!link || !url) return false;
        set((s) => ({ subjects: withLinks(s.subjects, subjectId, (links) => links.map((l) => (l.id === linkId ? { ...l, url, name: patch.name !== undefined ? linkName(patch.name, url) : l.name } : l))) }));
        return true;
      },
      deleteSubjectLink: (subjectId, linkId) => {
        const links = get().subjects.find((x) => x.id === subjectId)?.links ?? [], index = links.findIndex((l) => l.id === linkId), link = links[index];
        if (!link) return null;
        set((s) => ({ subjects: withLinks(s.subjects, subjectId, (all) => all.filter((l) => l.id !== linkId)) }));
        return { link, index };
      },
      restoreSubjectLink: (subjectId, link, index) => set((s) => ({ subjects: withLinks(s.subjects, subjectId, (links) => putBack(links, link, index)) })),
      moveSubjectLink: (subjectId, linkId, direction) => set((s) => ({ subjects: withLinks(s.subjects, subjectId, (links) => moved(links, linkId, direction)) })),
      addFeedback: (input) => {
        const clean = cleanFeedback(input);
        if (!clean || !isISODate(input.date) || !get().subjects.some((x) => x.id === input.subjectId)) return null;
        const id = newId().replace('t-', 'f-');
        set((s) => ({ feedback: [...s.feedback, { id, subjectId: input.subjectId, date: input.date, ...clean }] }));
        return id;
      },
      updateFeedback: (id, patch) => set((s) => ({
        feedback: s.feedback.map((f) => {
          if (f.id !== id) return f;
          // an entry keeps its last good words: feedback with nothing said is not feedback
          const clean = cleanFeedback({ about: patch.about ?? f.about, words: patch.words?.trim() ? patch.words : f.words, work: patch.work ?? f.work });
          return { ...f, ...clean, date: patch.date && isISODate(patch.date) ? patch.date : f.date };
        }),
      })),
      deleteFeedback: (id) => {
        const gone = get().feedback.find((f) => f.id === id) ?? null;
        if (gone) set((s) => ({ feedback: s.feedback.filter((f) => f.id !== id) }));
        return gone;
      },
      restoreFeedback: (entry) => set((s) => ({ feedback: [...s.feedback.filter((f) => f.id !== entry.id), entry] })),
      makeFeedbackTask: (id) => {
        const entry = get().feedback.find((f) => f.id === id);
        // one live task at most: asking again while it exists makes nothing
        if (!entry || !entry.work || feedbackTask(entry, get().tasks)) return null;
        const taskId = get().addTask({ title: entry.work, date: weekStartOf(todayISO(), get().settings.weekStartsOn), scope: 'week', subjectId: entry.subjectId });
        if (taskId) set((s) => ({ feedback: s.feedback.map((f) => (f.id === id ? { ...f, taskId } : f)) }));
        return taskId;
      },
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
      addPage: (kind, start) => {
        const id = newId().replace('t-', 'p-');
        set((s) => ({ pages: [...s.pages, newPage(kind, id, new Date().toISOString(), { title: start?.title, subjectId: s.subjects.some((x) => x.id === start?.subjectId) ? start?.subjectId : undefined })] }));
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
            interestId: patch.interestId === null ? undefined : patch.interestId !== undefined && s.interests.some((i) => i.id === patch.interestId) ? patch.interestId : p.interestId,
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
      addRoutine: (name) => {
        const clean = cleanWords(name, FITNESS_LIMITS.routineName);
        if (!clean || get().routines.length >= FITNESS_LIMITS.routines) return null;
        const id = newId().replace('t-', 'rt-');
        set((s) => ({ routines: [...s.routines, { id, name: clean, days: [], lines: [], createdOn: todayISO() }] }));
        return id;
      },
      updateRoutine: (id, patch) => set((s) => ({
        routines: changed(s.routines, id, (r) => ({ ...r, name: patch.name !== undefined ? cleanWords(patch.name, FITNESS_LIMITS.routineName) || r.name : r.name, days: patch.days ? cleanDays(patch.days) : r.days })),
      })),
      deleteRoutine: (id) => {
        const index = get().routines.findIndex((r) => r.id === id), routine = get().routines[index];
        if (!routine) return null;
        set((s) => ({ routines: s.routines.filter((r) => r.id !== id) }));
        return { routine, index };
      },
      restoreRoutine: (routine, index) => set((s) => ({ routines: putBack(s.routines, routine, index) })),
      addRoutineLine: (routineId, text) => {
        const routine = get().routines.find((r) => r.id === routineId), clean = cleanWords(text, FITNESS_LIMITS.line);
        if (!routine || !clean || routine.lines.length >= FITNESS_LIMITS.lines) return false;
        const id = newId().replace('t-', 'ln-');
        set((s) => ({ routines: changed(s.routines, routineId, (r) => ({ ...r, lines: [...r.lines, { id, text: clean }] })) }));
        return true;
      },
      editRoutineLine: (routineId, lineId, text) => set((s) => ({ routines: changed(s.routines, routineId, (r) => ({ ...r, lines: reworded(r.lines, lineId, text) })) })),
      moveRoutineLine: (routineId, lineId, direction) => set((s) => ({ routines: changed(s.routines, routineId, (r) => ({ ...r, lines: moved(r.lines, lineId, direction) })) })),
      deleteRoutineLine: (routineId, lineId) => set((s) => ({ routines: changed(s.routines, routineId, (r) => ({ ...r, lines: r.lines.filter((l) => l.id !== lineId) })) })),
      startWorkout: (routineId, date) => {
        const existing = get().workouts.find((w) => w.routineId === routineId && w.date === date);
        if (existing) return existing.id;
        const routine = get().routines.find((r) => r.id === routineId);
        if (!routine || !isISODate(date) || !canStart(routine, date, todayISO())) return null;
        const id = newId().replace('t-', 'wk-');
        set((s) => ({ workouts: [...s.workouts, newWorkout(routine, date, id)] }));
        return id;
      },
      finishWorkout: (id) => {
        const workout = get().workouts.find((w) => w.id === id);
        if (!workout || workout.finishedAt) return null;
        const award = workoutAward(workout, get().log, todayISO());
        // marked as having had its miles whatever it earned, so a second session of the day cannot earn on a later one
        set((s) => ({ workouts: changed(s.workouts, id, (w) => ({ ...w, finishedAt: new Date().toISOString(), milesAwarded: true as const })), log: award ? [...s.log, award] : s.log }));
        return award?.miles ?? 0;
      },
      reopenWorkout: (id) => set((s) => ({ workouts: changed(s.workouts, id, (w) => ({ ...w, finishedAt: undefined })) })),
      deleteWorkout: (id) => {
        const gone = get().workouts.find((w) => w.id === id) ?? null;
        if (gone) set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) }));
        return gone;
      },
      restoreWorkout: (workout) => set((s) => (s.workouts.some((w) => w.id === workout.id || (!!workout.routineId && w.routineId === workout.routineId && w.date === workout.date)) ? s : { workouts: [...s.workouts, workout] })),
      setWorkoutNote: (id, note) => set((s) => ({ workouts: changed(s.workouts, id, (w) => ({ ...w, note: note.slice(0, FITNESS_LIMITS.note) })) })),
      toggleWorkoutLine: (id, lineId) => set((s) => ({ workouts: changed(s.workouts, id, (w) => ({ ...w, lines: changed(w.lines, lineId, (l) => ({ ...l, done: !l.done })) })) })),
      addWorkoutLine: (id, text) => {
        const workout = get().workouts.find((w) => w.id === id), clean = cleanWords(text, FITNESS_LIMITS.line);
        if (!workout || !clean || workout.lines.length >= FITNESS_LIMITS.lines) return false;
        const lineId = newId().replace('t-', 'ln-');
        set((s) => ({ workouts: changed(s.workouts, id, (w) => ({ ...w, lines: [...w.lines, { id: lineId, text: clean, done: false }] })) }));
        return true;
      },
      editWorkoutLine: (id, lineId, text) => set((s) => ({ workouts: changed(s.workouts, id, (w) => ({ ...w, lines: reworded(w.lines, lineId, text) })) })),
      moveWorkoutLine: (id, lineId, direction) => set((s) => ({ workouts: changed(s.workouts, id, (w) => ({ ...w, lines: moved(w.lines, lineId, direction) })) })),
      deleteWorkoutLine: (id, lineId) => {
        const lines = get().workouts.find((w) => w.id === id)?.lines ?? [], index = lines.findIndex((l) => l.id === lineId), line = lines[index];
        if (!line) return null;
        set((s) => ({ workouts: changed(s.workouts, id, (w) => ({ ...w, lines: w.lines.filter((l) => l.id !== lineId) })) }));
        return { line, index };
      },
      restoreWorkoutLine: (id, line, index) => set((s) => ({ workouts: changed(s.workouts, id, (w) => ({ ...w, lines: putBack(w.lines, line, index) })) })),
      addKept: (list, input) => {
        const name = cleanWords(input.name, FITNESS_LIMITS.keptName), value = cleanWords(input.value, KEPT[list].value);
        if (!name || !value || !isISODate(input.date) || keptOf(get(), list).length >= KEPT[list].max) return null;
        const id = newId().replace('t-', list === 'bests' ? 'bs-' : 'ms-');
        // a best has no unit at all: its value says what it is
        const item = { id, name, value, date: input.date, ...(list === 'measures' ? { unit: cleanWords(input.unit ?? '', FITNESS_LIMITS.unit) } : {}) };
        set((s) => withKept(s, list, (items) => [...items, item]));
        return id;
      },
      updateKept: (list, id, patch) => set((s) => withKept(s, list, (items) => changed(items, id, (x) => ({
        ...x,
        name: patch.name !== undefined ? cleanWords(patch.name, FITNESS_LIMITS.keptName) || x.name : x.name,
        value: patch.value !== undefined ? cleanWords(patch.value, KEPT[list].value) || x.value : x.value,
        date: patch.date !== undefined && isISODate(patch.date) ? patch.date : x.date,
        ...(list === 'measures' && patch.unit !== undefined ? { unit: cleanWords(patch.unit, FITNESS_LIMITS.unit) } : {}),
      })))),
      newKept: (list, id, value) => {
        const before = keptOf(get(), list).find((x) => x.id === id), clean = cleanWords(value, KEPT[list].value);
        if (!before || !clean) return null;
        set((s) => withKept(s, list, (items) => changed(items, id, (x) => ({ ...x, value: clean, date: todayISO(), was: { value: x.value, date: x.date } }))));
        return before;
      },
      deleteKept: (list, id) => {
        const items = keptOf(get(), list), index = items.findIndex((x) => x.id === id), item = items[index];
        if (!item) return null;
        set((s) => withKept(s, list, (all) => all.filter((x) => x.id !== id)));
        return { item, index };
      },
      restoreKept: (list, item, index) => set((s) => withKept(s, list, (items) => putBack(items, item, index))),
      addInterest: (input) => {
        const name = interestName(input.name, input.forms);
        if (!name || get().interests.length >= INTEREST_LIMITS.max) return null;
        const id = newId().replace('t-', 'in-');
        set((s) => ({ interests: [...s.interests, { id, name, forms: input.forms }] }));
        return id;
      },
      updateInterest: (id, patch) => set((s) => ({
        interests: changed(s.interests, id, (i) => ({ ...i, name: patch.name !== undefined ? cleanWords(patch.name, INTEREST_LIMITS.name) || i.name : i.name, forms: patch.forms ?? i.forms })),
      })),
      deleteInterest: (id) => {
        const index = get().interests.findIndex((i) => i.id === id), interest = get().interests[index];
        if (!interest) return null;
        const pageIds = get().pages.filter((p) => p.interestId === id).map((p) => p.id);
        // the pages are kept, as a deleted subject's are, and not marked as changed: nothing about them was touched
        set((s) => ({ interests: s.interests.filter((i) => i.id !== id), pages: s.pages.map((p) => (p.interestId === id ? { ...p, interestId: undefined } : p)) }));
        return { interest, index, pageIds };
      },
      restoreInterest: (removed) => set((s) => ({
        interests: putBack(s.interests, removed.interest, removed.index),
        pages: s.pages.map((p) => (removed.pageIds.includes(p.id) ? { ...p, interestId: removed.interest.id } : p)),
      })),
      startPage: (interestId, formId) => {
        // what the interest can start is asked of its own pages, so a page that comes with a title is made once
        // however fast its button is pressed
        const interest = get().interests.find((i) => i.id === interestId), form = interest ? startersIn(interest, get().pages).find((f) => f.id === formId) : undefined;
        if (!interest || !form) return null;
        const id = newId().replace('t-', 'p-');
        // a plain kind is a page like any other, so it remembers no form
        set((s) => ({ pages: [...s.pages, newPage(form.kind, id, new Date().toISOString(), { interestId, title: form.title, form: isReadyMade(form) ? form : undefined })] }));
        return id;
      },
      setPageField: (pageId, fieldId, text) => set((s) => ({
        pages: changePage(s.pages, pageId, (p) => (p.fields?.some((f) => f.id === fieldId) ? { ...p, fields: p.fields.map((f) => (f.id === fieldId ? { ...f, text: text.slice(0, INTEREST_LIMITS.field) } : f)) } : p)),
      })),
      setPageLink: (id, url) => {
        const clean = url.trim() ? cleanUrl(url) : undefined;
        if (clean === null || !get().pages.some((p) => p.id === id)) return false;
        set((s) => ({ pages: changePage(s.pages, id, (p) => { const { link, ...rest } = p; return clean ? { ...rest, link: clean } : link ? rest : p; }) }));
        return true;
      },
      addHeadline: (input) => {
        const clean = cleanHeadline(input);
        if (!clean || get().headlines.length >= INTEREST_LIMITS.headlines) return null;
        const id = newId().replace('t-', 'hl-');
        set((s) => ({ headlines: [...s.headlines, { id, ...clean }] }));
        return id;
      },
      updateHeadline: (id, patch) => {
        const before = get().headlines.find((h) => h.id === id);
        if (!before) return false;
        // a source that was taken from the site is taken again when the address changes; one that was typed stays
        const source = patch.source ?? (patch.url !== undefined && before.source === siteName(before.url) ? '' : before.source);
        // checked as a new one is, so a change can never leave a headline that could not have been saved
        const clean = cleanHeadline({ title: patch.title ?? before.title, url: patch.url ?? before.url, source, date: patch.date ?? before.date, tag: patch.tag ?? before.tag });
        if (!clean) return false;
        set((s) => ({ headlines: changed(s.headlines, id, () => ({ id, ...clean })) }));
        return true;
      },
      deleteHeadline: (id) => {
        const index = get().headlines.findIndex((h) => h.id === id), headline = get().headlines[index];
        if (!headline) return null;
        set((s) => ({ headlines: s.headlines.filter((h) => h.id !== id) }));
        return { headline, index };
      },
      restoreHeadline: (headline, index) => set((s) => ({ headlines: putBack(s.headlines, headline, index) })),
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
        settings: { ...s.settings, ...patch, name: patch.name !== undefined ? patch.name.trim().slice(0, 30).trim() || undefined : s.settings.name, theme: patch.theme !== undefined ? storedTheme(patch.theme) : s.settings.theme },
        // the levels are kept by the first day of their week, so they move with it when that day changes
        ...(patch.weekStartsOn !== undefined && patch.weekStartsOn !== s.settings.weekStartsOn ? { levels: rekeyed(s.levels, patch.weekStartsOn) } : {}),
      })),
      // the theme belongs to the device and not to the data, so starting again keeps it
      // and so does the Fitness switch: it says which places are wanted, not what is in them
      resetSample: () => set((s) => { const next = seed(todayISO()); return { ...next, settings: { ...next.settings, ...kept(s.settings) } }; }),
      clearAll: () => set((s) => { const next = empty(); return { ...next, settings: { ...next.settings, ...kept(s.settings) } }; }),
      restoreBackup: (data) => {
        const before = dataOf(get()), next = backupData(data), { theme: _theirs, ...settings } = next.settings, theme = before.settings.theme;
        // the theme belongs to the device, so it is this device's whatever the backup had
        set({ ...next, settings: { ...settings, ...(theme !== undefined ? { theme } : {}) } });
        return before;
      },
      undoRestore: (before) => set(dataOf(before)),
      setSampleVoyage: (miles, days) => set((s) => {
        const log = sampleLog(miles, days, todayISO());
        return { log, boat: clampStage(s.boat, milesLogged(log), daysAtSea(log)) };
      }),
    }),
    {
      name: 'compass:v1',
      version: 1,
      storage: createJSONStorage(safeStorage),
      partialize: (state) => dataOf(state),
      // anything unreadable falls back to the sample, so a bad save can never stop the app opening
      merge: (saved, current) => openSave(saved, current),
    },
  ),
);

// Another tab of Compass saving is heard here, and what it saved is taken up. Without this each tab went on with
// what it had when it opened, and the next thing changed in one wrote over everything the other had done since.
// What is taken up is opened as any save is, and taking it up writes nothing back, so two tabs cannot set each other off.
// A tab that was asleep or put away whole can miss the word, so it also reads again when it is looked at again.
if (typeof window !== 'undefined') {
  const takeUp = () => { void useCompass.persist.rehydrate(); };
  window.addEventListener('storage', (e) => { if (e.key === 'compass:v1' && e.newValue) takeUp(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) takeUp(); });
  window.addEventListener('pageshow', (e) => { if (e.persisted) takeUp(); });
}

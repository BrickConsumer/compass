import { addDaysISO, isoWeek, relativeDay, shortDay, weekStartOf } from './dates';
import { type Progress, progress, sortTasks } from './tasks';
import { type Assessment, type Feedback, type ISODate, type Subject, SUBJECT_COLOURS, type SubjectColour, type Task } from './types';

export const KINDS: { id: Assessment['kind']; label: string }[] = [
  { id: 'test', label: 'Test' }, { id: 'exam', label: 'Exam' }, { id: 'presentation', label: 'Presentation' }, { id: 'assignment', label: 'Assignment' },
];
export const TOPIC_LIMIT = 200;
/**
 * A subject's topic as it is stored. It is the syllabus's own wording, so it is never rewritten: only spaces at
 * either end go, and a line break becomes a space. Empty means there is no topic.
 */
export const cleanTopic = (text: string): string => text.replace(/[\r\n]+/g, ' ').trim().slice(0, TOPIC_LIMIT).trim();

export const COLOURS = Object.keys(SUBJECT_COLOURS) as SubjectColour[];
export const colourName = (c: SubjectColour): string => c[0]!.toUpperCase() + c.slice(1);

/** The colour for a new subject: the first one not yet used, or the least used once all are. */
export function nextColour(subjects: Subject[]): SubjectColour {
  const used = (c: SubjectColour) => subjects.filter((s) => s.colour === c).length;
  return [...COLOURS].sort((a, b) => used(a) - used(b))[0]!;
}

/** A subject's tasks. Open ones come first, by date and then as a day's list would sort them; done ones follow, latest first. */
export function subjectTasks(tasks: Task[], subjectId: string): { open: Task[]; done: Task[] } {
  return openThenDone(tasks.filter((t) => t.subjectId === subjectId));
}

/** Open tasks by date and then as a day's list would sort them; done ones after, latest first. */
function openThenDone(mine: Task[]): { open: Task[]; done: Task[] } {
  const open = sortTasks(mine.filter((t) => !t.completedAt));
  // by date, a day's tasks before the week's; the sort is stable, so priority order holds within each
  open.sort((a, b) => a.date.localeCompare(b.date) || (a.scope === b.scope ? 0 : a.scope === 'day' ? -1 : 1));
  return { open, done: mine.filter((t) => t.completedAt).sort((a, b) => b.completedAt!.localeCompare(a.completedAt!)) };
}

/**
 * A task is preparation only while the assessment it names exists. One whose assessment has been deleted is an
 * ordinary task again, and is preparation once more if Undo brings the assessment back.
 */
export const isPreparation = (task: Task, assessments: Assessment[]): boolean => !!task.assessmentId && assessments.some((a) => a.id === task.assessmentId);

/**
 * The tasks a subject's page already shows somewhere else: under one of its assessments, or beside one of its
 * feedback entries. "Tasks" leaves these out, so each task is on the page once. It goes by the page, not the task:
 * a preparation task moved to another subject is under that subject's "Tasks", where its count says it is.
 */
export function shownElsewhere(tasks: Task[], assessments: Assessment[], feedback: Feedback[], subjectId: string): Set<string> {
  const under = new Set(assessments.filter((a) => a.subjectId === subjectId).map((a) => a.id));
  const beside = new Set(feedback.filter((f) => f.subjectId === subjectId).map((f) => f.taskId));
  return new Set(tasks.filter((t) => (!!t.assessmentId && under.has(t.assessmentId)) || beside.has(t.id)).map((t) => t.id));
}

/** An assessment's preparation tasks, in the order a subject's tasks take. */
export const preparationOf = (tasks: Task[], assessmentId: string): { open: Task[]; done: Task[] } => openThenDone(tasks.filter((t) => t.assessmentId === assessmentId));

/** How much of an assessment's preparation is done. With none, the total is 0 and nothing is shown. */
export const preparationProgress = (tasks: Task[], assessmentId: string): Progress => progress(tasks.filter((t) => t.assessmentId === assessmentId));

/** When a task is for, in plain words: "Today", "Thu 19 Nov", "This week", "Week 49". */
export function taskWhen(task: Task, today: ISODate, weekStartsOn: 0 | 1): string {
  if (task.scope === 'day') { const r = relativeDay(task.date, today); return r === 'today' ? 'Today' : r === 'tomorrow' ? 'Tomorrow' : r === 'yesterday' ? 'Yesterday' : shortDay(task.date); }
  const thisWeek = weekStartOf(today, weekStartsOn);
  return task.date === thisWeek ? 'This week' : task.date === addDaysISO(thisWeek, 7) ? 'Next week' : `Week ${isoWeek(task.date)}`;
}

/** A subject's assessments: those still ahead (today counts), soonest first, and those that have passed, latest first. */
export function subjectAssessments(assessments: Assessment[], subjectId: string, today: ISODate): { ahead: Assessment[]; past: Assessment[] } {
  const mine = assessments.filter((a) => a.subjectId === subjectId);
  return { ahead: mine.filter((a) => a.date >= today).sort((a, b) => a.date.localeCompare(b.date)), past: mine.filter((a) => a.date < today).sort((a, b) => b.date.localeCompare(a.date)) };
}

export interface SubjectSummary { open: number; next?: Assessment }
export function subjectSummary(subject: Subject, tasks: Task[], assessments: Assessment[], today: ISODate): SubjectSummary {
  return { open: subjectTasks(tasks, subject.id).open.length, next: subjectAssessments(assessments, subject.id, today).ahead[0] };
}

/** One line for the list of subjects: "2 open tasks. Biology test in 4 days." */
export function summaryLine(s: SubjectSummary, today: ISODate): string {
  const tasks = s.open === 0 ? '' : `${s.open} open ${s.open === 1 ? 'task' : 'tasks'}.`, next = s.next ? `${s.next.title} ${relativeDay(s.next.date, today)}.` : '';
  return [tasks, next].filter(Boolean).join(' ') || 'Nothing open.';
}

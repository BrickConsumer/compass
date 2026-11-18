import { addDaysISO, isoWeek, relativeDay, shortDay, weekStartOf } from './dates';
import { sortTasks } from './tasks';
import { type Assessment, type ISODate, type Subject, SUBJECT_COLOURS, type SubjectColour, type Task } from './types';

export const KINDS: { id: Assessment['kind']; label: string }[] = [
  { id: 'test', label: 'Test' }, { id: 'exam', label: 'Exam' }, { id: 'presentation', label: 'Presentation' }, { id: 'assignment', label: 'Assignment' },
];
export const COLOURS = Object.keys(SUBJECT_COLOURS) as SubjectColour[];
export const colourName = (c: SubjectColour): string => c[0]!.toUpperCase() + c.slice(1);

/** The colour for a new subject: the first one not yet used, or the least used once all are. */
export function nextColour(subjects: Subject[]): SubjectColour {
  const used = (c: SubjectColour) => subjects.filter((s) => s.colour === c).length;
  return [...COLOURS].sort((a, b) => used(a) - used(b))[0]!;
}

/** A subject's tasks. Open ones come first, by date and then as a day's list would sort them; done ones follow, latest first. */
export function subjectTasks(tasks: Task[], subjectId: string): { open: Task[]; done: Task[] } {
  const mine = tasks.filter((t) => t.subjectId === subjectId);
  const open = sortTasks(mine.filter((t) => !t.completedAt));
  // by date, a day's tasks before the week's; the sort is stable, so priority order holds within each
  open.sort((a, b) => a.date.localeCompare(b.date) || (a.scope === b.scope ? 0 : a.scope === 'day' ? -1 : 1));
  return { open, done: mine.filter((t) => t.completedAt).sort((a, b) => b.completedAt!.localeCompare(a.completedAt!)) };
}

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

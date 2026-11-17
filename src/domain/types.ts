import type { StageId } from '../features/voyage/boat/specs';

/** A local calendar date, 'YYYY-MM-DD', with no time zone. */
export type ISODate = string;
export type Priority = 'high' | 'normal' | 'low';
export type SubjectColour = 'marine' | 'teal' | 'seafoam' | 'moss' | 'brass' | 'clay' | 'rose' | 'heather';

export interface Subject {
  id: string;
  /** 1 to 40 characters after trimming. */
  name: string;
  colour: SubjectColour;
  /** Free notes for the subject, kept on its page. */
  notes?: string;
}

export interface Task {
  id: string;
  /** 1 to 140 characters after trimming. */
  title: string;
  notes?: string;
  subjectId?: string;
  priority: Priority;
  /** A day's task, or one for any time in a week. */
  scope: 'day' | 'week';
  /** The day, or the first day of the week when scope is 'week'. */
  date: ISODate;
  /** Position among its siblings. */
  order: number;
  createdAt: string;
  /** Present means done. */
  completedAt?: string;
  /** Set the first time the task is completed and never cleared, so it cannot earn twice. */
  milesAwarded?: true;
  /** The study session this task was made from, if any. It is an ordinary task in every other way. */
  sessionId?: string;
}

export interface Assessment { id: string; title: string; subjectId: string; date: ISODate; kind: 'test' | 'exam' | 'presentation' | 'assignment' }

/** One entry in the voyage log. The log only grows. */
export interface LogEntry { id: string; date: ISODate; source: 'task' | 'day-clear' | 'habit' | 'review' | 'sample'; sourceId: string; miles: number }

/** A week's reflection. The week's numbers are not kept here: they are worked out from the tasks, habits and log. */
export interface Review {
  /** The first day of the week it is about. One review for each week. */
  weekStart: ISODate;
  wentWell: string;
  gotInWay: string;
  /** What to do differently next week. */
  change: string;
  /** Set when the review is first saved. Present means it is listed among earlier reviews. */
  savedAt?: string;
}

/**
 * A study session that repeats on chosen weekdays. On each of its days it becomes an ordinary task with this name,
 * made when that week arrives.
 */
export interface Session {
  id: string;
  subjectId: string;
  /** 1 to 80 characters. This is the title of the tasks it makes. */
  name: string;
  /** The weekdays it falls on: 0 is Sunday, 6 is Saturday. At least one. */
  days: number[];
  /** The first day it applies to. */
  createdOn: ISODate;
}

/** Something to do on most days. It comes back on each of its days, so it is never finished, only ticked for a day. */
export interface Habit {
  id: string;
  /** 1 to 60 characters after trimming. */
  name: string;
  /** The weekdays it falls on: 0 is Sunday, 6 is Saturday. All seven means every day. */
  days: number[];
  /** Position in the list. */
  order: number;
  /** The first day it counts for. Earlier days are not days for it, so a new habit starts with a clean record. */
  createdOn: ISODate;
}

export interface Boat {
  name: string;
  hull: string; sail: string; pennant: string;
  /** The boat being sailed: any stage that has been earned. */
  stage: StageId;
  /** Fitting and stage ids already shown in the voyage view. */
  seen: string[];
}

export interface Settings { weekStartsOn: 0 | 1; seaPaused: boolean; seaFolded: boolean }

/** Dot, tint and text colours for each subject colour (art direction, section 5). */
export const SUBJECT_COLOURS: Record<SubjectColour, { dot: string; tint: string; text: string }> = {
  marine: { dot: '#4776A1', tint: '#DAECFD', text: '#234B6E' },
  teal: { dot: '#208088', tint: '#D3F0F2', text: '#00535A' },
  seafoam: { dot: '#398166', tint: '#D8F0E5', text: '#12543E' },
  moss: { dot: '#637B43', tint: '#E4EED9', text: '#3C4F20' },
  brass: { dot: '#896D32', tint: '#F3E8D3', text: '#5B440D' },
  clay: { dot: '#996243', tint: '#FBE4D8', text: '#683B20' },
  rose: { dot: '#9D5D58', tint: '#FDE2DF', text: '#6A3633' },
  heather: { dot: '#8B608D', tint: '#F4E3F5', text: '#5C395E' },
};

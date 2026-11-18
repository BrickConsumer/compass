import type { StageId } from '../features/voyage/boat/specs';

/** A local calendar date, 'YYYY-MM-DD', with no time zone. */
export type ISODate = string;
export type Priority = 'high' | 'normal' | 'low';
export type SubjectColour = 'marine' | 'teal' | 'seafoam' | 'moss' | 'brass' | 'clay' | 'rose' | 'heather';

export interface Subject { id: string; name: string; colour: SubjectColour }

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
}

export interface Assessment { id: string; title: string; subjectId: string; date: ISODate; kind: 'test' | 'exam' | 'presentation' | 'assignment' }

/** One entry in the voyage log. The log only grows. */
export interface LogEntry { id: string; date: ISODate; source: 'task' | 'day-clear' | 'sample'; sourceId: string; miles: number }

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

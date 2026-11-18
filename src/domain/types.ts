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
  /** How the week went: a whole number from 1 to 10 for each area that was rated, by the area's id. */
  ratings?: Record<string, number>;
}

/** A part of the week that is rated in the review. Each person names their own. */
export interface RatingArea { id: string; /** 1 to 24 characters. */ name: string }

/** How much a subject matters in one week. No level at all behaves as 'normal'. */
export type Level = 'high' | 'medium' | 'normal';
/** Subject levels, week by week: the first day of the week they are for, then the subject's id. */
export type Levels = Record<ISODate, Record<string, Level>>;

/** A link to another site, opened in a new tab. Compass fetches nothing from it. */
export interface QuickLink { id: string; /** 1 to 24 characters. */ name: string; /** An http or https address. */ url: string }

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

export type PageKind = 'note' | 'checklist' | 'goal' | 'reading' | 'project';

/** One line of a page's list. It is not a task: it has no day, earns nothing and is shown nowhere else. */
export interface PageItem { id: string; /** 1 to 140 characters. */ text: string; done: boolean }

/**
 * One of the user's own pages, for what has no date. Every page has the same parts: a title, a list, writing and an
 * optional date. The kind decides which part comes first and what the parts are called.
 */
export interface Page {
  id: string;
  /** 1 to 80 characters. */
  title: string;
  kind: PageKind;
  /** In the order shown. Ticking an item does not move it. */
  items: PageItem[];
  /** Plain text, up to 20,000 characters. */
  text: string;
  /** A date to aim for. Shown on goals and projects. Nothing happens when it passes. */
  aimFor?: ISODate;
  subjectId?: string;
  /** Goals only: the day the goal was marked as reached. */
  reachedOn?: ISODate;
  createdAt: string;
  /** The last change, which orders the list of pages. */
  updatedAt: string;
}

export interface Boat {
  name: string;
  hull: string; sail: string; pennant: string;
  /** The boat being sailed: any stage that has been earned. */
  stage: StageId;
  /** Fitting and stage ids already shown in the voyage view. */
  seen: string[];
  /** The long-term goal, shown as where the boat is bound for. Up to 60 characters. */
  boundFor?: string;
}

/** Which look the app wears. Automatic follows the device. */
export type Theme = 'auto' | 'light' | 'dark';

export interface Settings {
  weekStartsOn: 0 | 1; seaPaused: boolean; seaFolded: boolean;
  /** The person's name, for the greeting on Home. Up to 30 characters. */
  name?: string;
  /** Absent in a save from before themes existed, which is the same as automatic. It belongs to the device, so clearing the data leaves it. */
  theme?: Theme;
}

type SubjectPaint = Record<SubjectColour, { dot: string; tint: string; text: string }>;

/**
 * Dot, tint and text colours for each subject colour, in each theme (art direction, section 5).
 * The dark set keeps each hue and is lighter, so a dot reads against navy as it does against ivory.
 * The same values are in tokens.css as `--subject-marine-dot` and so on, which a test keeps in step.
 */
export const SUBJECT_PAINT: { light: SubjectPaint; dark: SubjectPaint } = {
  light: {
    marine: { dot: '#4776A1', tint: '#DAECFD', text: '#234B6E' },
    teal: { dot: '#208088', tint: '#D3F0F2', text: '#00535A' },
    seafoam: { dot: '#398166', tint: '#D8F0E5', text: '#12543E' },
    moss: { dot: '#637B43', tint: '#E4EED9', text: '#3C4F20' },
    brass: { dot: '#896D32', tint: '#F3E8D3', text: '#5B440D' },
    clay: { dot: '#996243', tint: '#FBE4D8', text: '#683B20' },
    rose: { dot: '#9D5D58', tint: '#FDE2DF', text: '#6A3633' },
    heather: { dot: '#8B608D', tint: '#F4E3F5', text: '#5C395E' },
  },
  dark: {
    marine: { dot: '#7FA8CF', tint: '#2C4661', text: '#ACC6E0' },
    teal: { dot: '#5FB3BA', tint: '#24495C', text: '#97CED2' },
    seafoam: { dot: '#6FB597', tint: '#284953', text: '#A1CFBB' },
    moss: { dot: '#98B274', tint: '#32484B', text: '#BCCDA5' },
    brass: { dot: '#C2A160', tint: '#3C4446', text: '#D7C298' },
    clay: { dot: '#D0926E', tint: '#40414A', text: '#E0B8A1' },
    rose: { dot: '#D18E88', tint: '#404050', text: '#E1B6B2' },
    heather: { dot: '#BD92BF', tint: '#3B415D', text: '#D4B8D5' },
  },
};

/** What a component paints a subject with: the name of its colour in the current theme, which the page resolves. */
export const SUBJECT_COLOURS = Object.fromEntries(
  (Object.keys(SUBJECT_PAINT.light) as SubjectColour[]).map((c) => [c, { dot: `var(--subject-${c}-dot)`, tint: `var(--subject-${c}-tint)`, text: `var(--subject-${c}-text)` }]),
) as SubjectPaint;

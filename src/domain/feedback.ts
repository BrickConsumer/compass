import { isISODate } from './dates';
import type { Feedback, Task } from './types';

export const FEEDBACK_LIMITS = { about: 80, words: 2000, work: 140 };

const oneLine = (text: string, limit: number): string => text.trim().replace(/\s+/g, ' ').slice(0, limit).trim();

/** An entry's words as they are stored, or null when nothing was said: feedback with no words is not feedback. */
export function cleanFeedback(input: { about?: string; words: string; work?: string }): { about: string; words: string; work: string } | null {
  const words = input.words.trim().slice(0, FEEDBACK_LIMITS.words).trim();
  return words ? { about: oneLine(input.about ?? '', FEEDBACK_LIMITS.about), words, work: oneLine(input.work ?? '', FEEDBACK_LIMITS.work) } : null;
}

/** A subject's feedback, newest first. Entries of the same date keep the later-added one first. */
export const subjectFeedback = (all: Feedback[], subjectId: string): Feedback[] =>
  all.map((entry, i) => ({ entry, i })).filter((x) => x.entry.subjectId === subjectId).sort((a, b) => b.entry.date.localeCompare(a.entry.date) || b.i - a.i).map((x) => x.entry);

/** The task an entry's "to work on" was made into, while that task exists. Once it is deleted the entry has none, and Undo brings it back. */
export const feedbackTask = (entry: Feedback, tasks: Task[]): Task | undefined => (entry.taskId ? tasks.find((t) => t.id === entry.taskId) : undefined);

/**
 * The feedback in a save, as Compass would have saved it: only entries with an id, a subject, a date and words,
 * each id once. A save can be edited by hand, so nothing in it is taken on trust.
 */
export function storedFeedback(value: unknown): Feedback[] {
  if (!Array.isArray(value)) return [];
  const kept: Feedback[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const { id, subjectId, date, about, words, work, taskId } = item as Record<string, unknown>;
    const clean = typeof words === 'string' ? cleanFeedback({ about: typeof about === 'string' ? about : '', words, work: typeof work === 'string' ? work : '' }) : null;
    if (typeof id !== 'string' || !id || typeof subjectId !== 'string' || !subjectId || typeof date !== 'string' || !isISODate(date) || !clean || kept.some((f) => f.id === id)) continue;
    kept.push({ id, subjectId, date, ...clean, ...(typeof taskId === 'string' && taskId ? { taskId } : {}) });
  }
  return kept;
}

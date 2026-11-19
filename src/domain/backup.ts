import type { CompassData } from './seed';
import type { ISODate } from './types';
import { milesLogged } from './voyage';

/**
 * A backup: one file that holds everything Compass keeps, made in the browser and sent nowhere. `format` rises only
 * if a later Compass writes a file this one could not read. A file larger than `maxBytes` is not read at all.
 */
export const BACKUP = { app: 'compass', format: 1, maxBytes: 5_000_000 } as const;

export const backupName = (today: ISODate): string => `compass-backup-${today}.json`;

/** The file's text: JSON a person can read, with what it is, when it was saved, and the data as the browser keeps it. */
export const backupText = (data: CompassData, now: string): string => `${JSON.stringify({ app: BACKUP.app, format: BACKUP.format, savedAt: now, data }, null, 2)}\n`;

/** Why a file was not restored. The first three are said of the file itself; the last when the browser would not keep what it holds. */
export type Refusal = 'not-compass' | 'newer' | 'too-large' | 'no-room';
export const REFUSALS: Record<Refusal, string> = {
  'not-compass': 'That file is not a Compass backup.',
  newer: 'That backup is from a newer version of Compass.',
  'too-large': 'That file is too large to be a Compass backup.',
  'no-room': 'This device could not keep that backup, so nothing was changed.',
};

export type ReadBackup = { ok: true; data: Record<string, unknown>; savedAt: string | null } | { ok: false; why: Exclude<Refusal, 'no-room'> };

const isPlain = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/**
 * Read a file's text as a backup. It says only whether this is a Compass backup that this Compass can read. What it
 * holds is not trusted here: it is checked record by record when it is opened, as a save is.
 */
export function readBackup(text: string): ReadBackup {
  if (text.length > BACKUP.maxBytes) return { ok: false, why: 'too-large' };
  let file: unknown;
  try { file = JSON.parse(text); } catch { return { ok: false, why: 'not-compass' }; }
  if (!isPlain(file) || file.app !== BACKUP.app || typeof file.format !== 'number') return { ok: false, why: 'not-compass' };
  if (file.format > BACKUP.format) return { ok: false, why: 'newer' };
  const data = file.data;
  // the same four things a save must have to be opened at all
  if (!isPlain(data) || !Array.isArray(data.tasks) || !Array.isArray(data.log) || !isPlain(data.boat) || !isPlain(data.settings)) return { ok: false, why: 'not-compass' };
  const savedAt = typeof file.savedAt === 'string' && !Number.isNaN(Date.parse(file.savedAt)) ? file.savedAt : null;
  return { ok: true, data, savedAt };
}

const some = (n: number, one: string, many = `${one}s`): string[] => (n > 0 ? [`${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`] : []);

/**
 * What a backup holds, in words, leaving out what there is none of: "12 tasks", "5 subjects", "412 nautical miles".
 * What Fitness keeps is counted only while Fitness is switched on in the backup: switched off, it has never been seen.
 */
export function backupSummary(d: CompassData): string[] {
  const fitness = d.settings.fitness === true;
  return [
    ...some(d.tasks.length, 'task'), ...some(d.subjects.length, 'subject'), ...some(d.assessments.length, 'assessment'),
    ...some(d.feedback.length, 'piece of feedback', 'pieces of feedback'), ...some(d.sessions.length, 'study session'), ...some(d.habits.length, 'habit'),
    ...some(d.reviews.length, 'weekly review'), ...some(d.pages.length, 'page'), ...some(d.interests.length, 'interest'), ...some(d.headlines.length, 'headline'),
    ...some(d.links.length, 'link'),
    ...(fitness ? [...some(d.routines.length, 'training routine'), ...some(d.workouts.length, 'training session'), ...some(d.bests.length, 'best'), ...some(d.measures.length, 'measure')] : []),
    ...some(milesLogged(d.log), 'nautical mile'),
  ];
}

/** A list as a sentence would have it: "1 task, 2 pages and 3 habits". */
export const sentenceOf = (parts: string[]): string => (parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`);

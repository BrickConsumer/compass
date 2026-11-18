import { describe, expect, it } from 'vitest';
import { cleanTopic, isPreparation, preparationOf, preparationProgress, shownElsewhere } from './study';
import type { Assessment, Feedback, Task } from './types';

const task = (id: string, over: Partial<Task> = {}): Task => ({ id, title: id, priority: 'normal', scope: 'day', date: '2026-11-16', order: 1, createdAt: '2026-11-01T08:00:00.000Z', ...over });

describe("a subject's topic", () => {
  it('is kept exactly as typed, within its limit', () => {
    expect(cleanTopic('  Module B:  Critical Study of Literature ')).toBe('Module B:  Critical Study of Literature');
    expect(cleanTopic('the role of the RBA\nin monetary policy')).toBe('the role of the RBA in monetary policy');
    expect(cleanTopic('   ')).toBe('');
    expect(cleanTopic('x'.repeat(300))).toHaveLength(200);
  });
});

describe('preparation for an assessment', () => {
  // 16 November 2026 is a Monday
  const ORAL: Assessment = { id: 'as', title: 'Oral', subjectId: 'eng', date: '2026-11-29', kind: 'presentation' };
  const prep = [
    task('late', { date: '2026-11-23', scope: 'week', assessmentId: 'as' }), task('done', { date: '2026-11-16', assessmentId: 'as', completedAt: '2026-11-16T09:00:00.000Z' }),
    task('soon', { date: '2026-11-19', assessmentId: 'as' }), task('other', { date: '2026-11-17' }),
  ];

  it('is listed under its assessment, open ones first by date', () => {
    expect(preparationOf(prep, 'as').open.map((t) => t.id)).toEqual(['soon', 'late']);
    expect(preparationOf(prep, 'as').done.map((t) => t.id)).toEqual(['done']);
    expect(preparationProgress(prep, 'as')).toEqual({ done: 1, total: 3 });
    expect(preparationProgress(prep, 'none')).toEqual({ done: 0, total: 0 });
  });

  it('is preparation only while its assessment exists', () => {
    expect(isPreparation(prep[0]!, [ORAL])).toBe(true); expect(isPreparation(prep[0]!, [])).toBe(false); expect(isPreparation(prep[3]!, [ORAL])).toBe(false);
  });
});

describe('what a subject lists under "Tasks"', () => {
  const ORAL: Assessment = { id: 'as', title: 'Oral', subjectId: 'eng', date: '2026-11-29', kind: 'presentation' };
  const SAID: Feedback = { id: 'f', subjectId: 'eng', date: '2026-11-12', about: '', words: 'The thesis arrives late.', work: 'Open with it', taskId: 'made' };
  const all = [task('plain', { subjectId: 'eng' }), task('prep', { subjectId: 'eng', assessmentId: 'as' }), task('made', { subjectId: 'eng' })];

  it('leaves out what the page already shows under an assessment or beside feedback', () => {
    expect([...shownElsewhere(all, [ORAL], [SAID], 'eng')].sort()).toEqual(['made', 'prep']);
  });

  it('lists them again once the assessment or the entry has gone', () => {
    expect(shownElsewhere(all, [], [], 'eng').size).toBe(0);
    expect([...shownElsewhere(all, [ORAL], [{ ...SAID, taskId: undefined }], 'eng')]).toEqual(['prep']);
  });

  it("goes by the page, so a task moved to another subject is under that subject's tasks", () => {
    const moved = all.map((t) => ({ ...t, subjectId: 'mat' }));
    expect(shownElsewhere(moved, [ORAL], [SAID], 'mat').size).toBe(0);
    expect([...shownElsewhere(moved, [ORAL], [SAID], 'eng')].sort()).toEqual(['made', 'prep']);
  });
});

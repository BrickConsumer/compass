import { describe, expect, it } from 'vitest';
import { cleanFeedback, storedFeedback, subjectFeedback } from './feedback';
import type { Feedback } from './types';

const entry = (over: Partial<Feedback> = {}): Feedback => ({ id: 'f1', subjectId: 'eng', date: '2026-11-12', about: '', words: 'Good.', work: '', ...over });

describe('feedback', () => {
  it('tidies an entry and refuses one with nothing said', () => {
    expect(cleanFeedback({ about: '  Essay  ', words: ' The thesis arrives late. ', work: ' Open with it ' })).toEqual({ about: 'Essay', words: 'The thesis arrives late.', work: 'Open with it' });
    expect(cleanFeedback({ about: 'Essay', words: '   ', work: 'x' })).toBeNull();
    const long = cleanFeedback({ about: 'a'.repeat(200), words: 'w'.repeat(5000), work: 'k'.repeat(500) })!;
    expect([long.about.length, long.words.length, long.work.length]).toEqual([80, 2000, 140]);
  });

  it("lists a subject's feedback newest first", () => {
    const all = [entry({ id: 'a', date: '2026-11-03' }), entry({ id: 'b', date: '2026-11-12' }), entry({ id: 'c', date: '2026-11-12' }), entry({ id: 'd', subjectId: 'mat' })];
    expect(subjectFeedback(all, 'eng').map((f) => f.id)).toEqual(['c', 'b', 'a']);
  });

  it('keeps only stored feedback that has an id, a subject, a date and words', () => {
    const stored = storedFeedback([null, 'x', { id: 'a' }, { id: 'b', subjectId: 'eng', date: 'soon', words: 'No date.' }, { id: 'c', subjectId: 'eng', date: '2026-11-12', words: '  Kept.  ', about: 7, taskId: 't1' }, { id: 'c', subjectId: 'eng', date: '2026-11-12', words: 'Twice.' }]);
    expect(stored).toEqual([{ id: 'c', subjectId: 'eng', date: '2026-11-12', about: '', words: 'Kept.', work: '', taskId: 't1' }]);
    expect(storedFeedback('nonsense')).toEqual([]);
  });
});

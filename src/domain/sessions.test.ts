import { describe, expect, it } from 'vitest';
import { daysSentence, madeKey, sessionTasksDue, subjectSessions } from './sessions';
import type { Session } from './types';

// 16 November 2026 is a Monday
const MON = '2026-11-16', WED = '2026-11-18', THU = '2026-11-19', FRI = '2026-11-20', SUN = '2026-11-22', NEXT_MON = '2026-11-23';
const session = (over: Partial<Session> = {}): Session => ({ id: 's1', subjectId: 'bio', name: 'Biology revision', days: [1, 3, 5], createdOn: '2026-11-01', ...over });
const dates = (due: { date: string }[]) => due.map((d) => d.date);

describe('which session tasks are made', () => {
  it('on the first day of the week, every one of the session\'s days in that week', () => {
    expect(dates(sessionTasksDue([session()], [], MON, 1))).toEqual([MON, WED, FRI]);
  });

  it('later in the week, only the days from today on: nothing is made for a day that has gone', () => {
    expect(dates(sessionTasksDue([session()], [], THU, 1))).toEqual([FRI]);
    expect(dates(sessionTasksDue([session()], [], SUN, 1))).toEqual([]);
  });

  it('never a second time, so a task deleted for a day off stays deleted', () => {
    expect(dates(sessionTasksDue([session()], [madeKey('s1', MON), madeKey('s1', WED)], MON, 1))).toEqual([FRI]);
  });

  it('not for a week that has not arrived', () => {
    const due = dates(sessionTasksDue([session()], [], MON, 1));
    expect(due.every((d) => d < NEXT_MON)).toBe(true);
    // when it arrives, that week's are made
    expect(dates(sessionTasksDue([session()], [], NEXT_MON, 1))).toEqual(['2026-11-23', '2026-11-25', '2026-11-27']);
  });

  it('not before the day the session was set up', () => {
    expect(dates(sessionTasksDue([session({ createdOn: THU })], [], MON, 1))).toEqual([FRI]);
  });

  it('follows the user\'s week: with weeks starting on Sunday, Sunday begins the next one', () => {
    const weekend = session({ days: [0, 6] }); // Sunday and Saturday
    // Monday-first: the week of the 16th ends on Sunday the 22nd
    expect(dates(sessionTasksDue([weekend], [], MON, 1))).toEqual(['2026-11-21', SUN]);
    // Sunday-first: the week of the 16th began on Sunday the 15th and ends on Saturday the 21st
    expect(dates(sessionTasksDue([weekend], [], MON, 0))).toEqual(['2026-11-21']);
  });

  it('handles several sessions, each on its own days', () => {
    const due = sessionTasksDue([session(), session({ id: 's2', name: 'Chinese characters', subjectId: 'chi', days: [2] })], [], MON, 1);
    expect(due.map((d) => `${d.session.id}:${d.date}`)).toEqual([`s1:${MON}`, `s1:${WED}`, `s1:${FRI}`, 's2:2026-11-17']);
  });
});

describe('a session in words', () => {
  it('says its days as a sentence, in the order of the user\'s week', () => {
    expect(daysSentence([1, 3, 5], 1)).toBe('Every Monday, Wednesday and Friday');
    expect(daysSentence([2], 1)).toBe('Every Tuesday');
    expect(daysSentence([0, 6], 1)).toBe('Every Saturday and Sunday');
    expect(daysSentence([0, 6], 0)).toBe('Every Sunday and Saturday');
    expect(daysSentence([0, 1, 2, 3, 4, 5, 6], 1)).toBe('Every day');
    expect(daysSentence([1, 2, 3, 4, 5], 1)).toBe('Every weekday');
  });

  it('lists a subject\'s own sessions', () => {
    const all = [session(), session({ id: 's2', subjectId: 'eco' }), session({ id: 's3' })];
    expect(subjectSessions(all, 'bio').map((s) => s.id)).toEqual(['s1', 's3']);
  });
});

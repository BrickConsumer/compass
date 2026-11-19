import { describe, expect, it } from 'vitest';
import { isISODate } from './dates';
import { DEFAULT_BOAT } from './seed';
import { storedAssessments, storedBoat, storedHabits, storedLevels, storedLog, storedReviews, storedSessions, storedSettings, storedStrings, storedTasks } from './stored';

describe('what is kept from a save', () => {
  it('keeps a whole boat as it is, and mends one that could not be drawn', () => {
    const boat = { name: 'Wren', hull: '#1A619B', sail: '#FCF8EE', pennant: '#AB3935', stage: 'cutter', seen: ['dinghy', 'sloop'], boundFor: 'A place at university' };
    expect(storedBoat(boat, DEFAULT_BOAT)).toEqual(boat);
    // a stage that is not one is the first boat, which is always earned, and its name is kept
    expect(storedBoat({ ...boat, stage: 'galleon' }, DEFAULT_BOAT)).toEqual({ ...boat, stage: 'dinghy' });
    expect(storedBoat({ name: 'Wren' }, DEFAULT_BOAT)).toEqual({ name: 'Wren', hull: DEFAULT_BOAT.hull, sail: DEFAULT_BOAT.sail, pennant: DEFAULT_BOAT.pennant, stage: 'dinghy', seen: [] });
    expect(storedBoat({ ...boat, hull: 'url(javascript:1)', seen: 'all', boundFor: 9, name: '' }, DEFAULT_BOAT)).toEqual({ name: DEFAULT_BOAT.name, hull: DEFAULT_BOAT.hull, sail: '#FCF8EE', pennant: '#AB3935', stage: 'cutter', seen: [] });
    expect(storedBoat({ ...boat, seen: ['dinghy', 4, null, 'lantern'] }, DEFAULT_BOAT).seen).toEqual(['dinghy', 'lantern']);
    for (const junk of [null, 'boat', 7, []]) expect(storedBoat(junk, DEFAULT_BOAT)).toEqual({ ...DEFAULT_BOAT, stage: 'dinghy', seen: [] });
  });

  it('keeps settings as they are, and falls back where one is not what it should be', () => {
    const whole = { weekStartsOn: 0, seaPaused: true, seaFolded: false, name: 'Sam', theme: 'dark', fitness: true };
    expect(storedSettings(whole)).toEqual(whole);
    expect(storedSettings({ weekStartsOn: 1, seaPaused: false, seaFolded: false, fitness: false })).toEqual({ weekStartsOn: 1, seaPaused: false, seaFolded: false, fitness: false });
    expect(storedSettings({ weekStartsOn: 'monday', seaPaused: 'yes', name: 7, theme: 'neon', fitness: 'on', extra: 1 })).toEqual({ weekStartsOn: 1, seaPaused: false, seaFolded: false });
    for (const junk of [null, [1, 2], 'settings']) expect(storedSettings(junk)).toEqual({ weekStartsOn: 1, seaPaused: false, seaFolded: false });
  });

  it('keeps only real entries in the voyage log', () => {
    const entry = { id: 'task:t1', date: '2026-11-18', source: 'task', sourceId: 't1', miles: 3 };
    expect(storedLog([entry, 'nonsense', null, { ...entry, id: 'a', miles: 'lots' }, { ...entry, id: 'b', miles: -4 }, { ...entry, id: 'c', date: 'yesterday' }, { ...entry, id: 'd', source: 'gift' }, { ...entry, id: '' }])).toEqual([entry]);
    expect(storedLog('log')).toEqual([]);
    // an entry is not counted twice
    expect(storedLog([entry, entry])).toEqual([entry]);
  });

  it('keeps habits, their ticks and study sessions that are what they should be', () => {
    const habit = { id: 'h1', name: 'Read', days: [1, 3, 5], order: 2, createdOn: '2026-11-01' };
    expect(storedHabits([habit])).toEqual([habit]);
    expect(storedHabits([{ id: 'h2', name: 'No days' }, { id: 'h3' }, null, { ...habit, id: 'h4', days: [1, 9, 'x', 3], order: 'first' }])).toEqual([
      { id: 'h2', name: 'No days', days: [], order: 0, createdOn: '' }, { id: 'h4', name: 'Read', days: [1, 3], order: 0, createdOn: '2026-11-01' },
    ]);
    expect(storedStrings(['h1|2026-11-18', 4, null, 'h1|2026-11-19'])).toEqual(['h1|2026-11-18', 'h1|2026-11-19']);
    expect(storedStrings({})).toEqual([]);
    const session = { id: 's1', subjectId: 'bio', name: 'Flashcards', days: [1, 3], createdOn: '2026-11-01' };
    expect(storedSessions([session, { ...session, id: 's2', subjectId: 5 }, { ...session, id: 's3', days: 'daily' }])).toEqual([session, { ...session, id: 's3', days: [] }]);
  });

  it('keeps a review for a real week, once, with only real ratings', () => {
    const review = { weekStart: '2026-11-09', wentWell: 'Essay', gotInWay: '', change: 'Earlier nights', savedAt: '2026-11-15T10:00:00.000Z', ratings: { study: 7, sleep: 4 } };
    expect(storedReviews([review])).toEqual([review]);
    expect(storedReviews([{ weekStart: '2026-11-16' }, { weekStart: 'last week', wentWell: 'x' }, null, { ...review, wentWell: 'Twice' }, { weekStart: '2026-11-02', wentWell: 7, ratings: { study: 'high', sleep: 6 }, savedAt: 5 }])).toEqual([
      { weekStart: '2026-11-16', wentWell: '', gotInWay: '', change: '' }, { ...review, wentWell: 'Twice' }, { weekStart: '2026-11-02', wentWell: '', gotInWay: '', change: '', ratings: { sleep: 6 } },
    ]);
  });

  it('keeps levels that are levels', () => {
    const levels = { '2026-11-16': { bio: 'high', mat: 'medium' }, '2026-11-23': {} };
    expect(storedLevels(levels)).toEqual(levels);
    expect(storedLevels({ '2026-11-16': { bio: 'urgent', mat: 'normal' }, soon: { bio: 'high' }, '2026-11-23': 'high' })).toEqual({ '2026-11-16': { mat: 'normal' } });
    for (const junk of [null, [], 'levels']) expect(storedLevels(junk)).toEqual({});
  });

  it('keeps a task with a real day, and makes one with a priority or a scope that is not one an ordinary task', () => {
    const task = { id: 't1', title: 'Read', priority: 'high', scope: 'week', date: '2026-11-16', order: 3, createdAt: '2026-11-10T08:00:00.000Z', notes: 'Chapter 6', completedAt: '2026-11-17T08:00:00.000Z', milesAwarded: true, link: 'https://example.org/a' };
    expect(storedTasks([task])).toEqual([task]);
    expect(storedTasks([{ id: 't2', title: 'Odd', date: '2026-11-16', priority: 'urgent', scope: 'month', order: 'last', link: 'javascript:alert(1)' }, { id: 't3', title: 'No day', date: 'soon' }, { id: 't4', date: '2026-11-16' }, 'task'])).toEqual([
      { id: 't2', title: 'Odd', date: '2026-11-16', priority: 'normal', scope: 'day', order: 0, createdAt: '' },
    ]);
  });

  it('keeps an assessment with a real day, and one of an unknown kind as a test', () => {
    const exam = { id: 'a1', title: 'Paper 1', subjectId: 'bio', date: '2026-12-01', kind: 'exam', link: 'https://example.org/n' };
    expect(storedAssessments([exam])).toEqual([exam]);
    expect(storedAssessments([{ ...exam, id: 'a2', kind: 'quiz', link: 'ftp://x' }, { ...exam, id: 'a3', date: 'December' }, { ...exam, id: 'a4', subjectId: 4 }])).toEqual([{ id: 'a2', title: 'Paper 1', subjectId: 'bio', date: '2026-12-01', kind: 'test' }]);
  });

  it('rebuilds a task from what a task has, so a value of the wrong kind cannot ride in on it', () => {
    const task = { id: 't1', title: 'Read', date: '2026-11-16', priority: 'normal', scope: 'day', order: 1, createdAt: '2026-11-10T08:00:00.000Z' };
    expect(storedTasks([{ ...task, completedAt: true, notes: 7, subjectId: {}, sessionId: [], assessmentId: 4, milesAwarded: 'yes', extra: 1 }])).toEqual([task]);
    expect(storedTasks([{ ...task, completedAt: 'yesterday' }])).toEqual([task]);
    const done = { ...task, completedAt: '2026-11-17T08:00:00.000Z', milesAwarded: true, notes: 'Chapter 6', subjectId: 'bio', sessionId: 's1', assessmentId: 'a1' };
    expect(storedTasks([done])).toEqual([done]);
  });

  it('keeps the time a review was saved only if it is a time', () => {
    expect(storedReviews([{ weekStart: '2026-11-09', wentWell: 'x', savedAt: 'last Sunday' }])).toEqual([{ weekStart: '2026-11-09', wentWell: 'x', gotInWay: '', change: '' }]);
  });

  it('knows a day from anything else, without being upset by it', () => {
    for (const not of [['2026-12-01'], 7, {}, null, undefined, true, '2026-13-01', '2026-02-30', '12/01/2026', '9999-12-31', '0001-01-01']) expect(isISODate(not as string), JSON.stringify(not)).toBe(false);
    for (const is of ['2026-11-19', '1999-12-31', '2100-02-28']) expect(isISODate(is)).toBe(true);
  });
});


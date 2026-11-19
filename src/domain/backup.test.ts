import { describe, expect, it } from 'vitest';
import { BACKUP, backupName, backupSummary, backupText, readBackup, REFUSALS, sentenceOf } from './backup';
import { empty, seed } from './seed';

const NOW = '2026-11-19T10:00:00.000Z';

describe('a backup file', () => {
  it('is named for the day it was made', () => {
    expect(backupName('2026-11-19')).toBe('compass-backup-2026-11-19.json');
  });

  it('holds everything, as text a person can read, and reads back as it was', () => {
    const data = seed('2026-11-19'), text = backupText(data, NOW);
    expect(text.startsWith('{\n  "app": "compass",\n  "format": 1,\n  "savedAt": "2026-11-19T10:00:00.000Z",\n  "data": {')).toBe(true);
    const read = readBackup(text);
    expect(read).toMatchObject({ ok: true, savedAt: NOW });
    expect(read.ok && read.data).toEqual(JSON.parse(JSON.stringify(data)));
  });

  it('refuses what is not a Compass backup', () => {
    const whole = JSON.parse(backupText(empty(), NOW));
    for (const text of ['', 'not json', '[]', '7', 'null', '{}', JSON.stringify({ ...whole, app: 'other' }), JSON.stringify({ ...whole, data: [] }), JSON.stringify({ ...whole, data: { tasks: [] } }), JSON.stringify({ ...whole, format: 'one' }), JSON.stringify({ app: 'compass', format: 1 })])
      expect(readBackup(text), text.slice(0, 40)).toEqual({ ok: false, why: 'not-compass' });
  });

  it('refuses a backup from a newer Compass, and a file that is too large', () => {
    const whole = JSON.parse(backupText(empty(), NOW));
    expect(readBackup(JSON.stringify({ ...whole, format: 2 }))).toEqual({ ok: false, why: 'newer' });
    // a newer one is refused as newer even when what it holds is in a shape this Compass does not know
    expect(readBackup(JSON.stringify({ app: 'compass', format: 3, data: 'packed' }))).toEqual({ ok: false, why: 'newer' });
    expect(readBackup(' '.repeat(BACKUP.maxBytes + 1))).toEqual({ ok: false, why: 'too-large' });
    expect(REFUSALS).toEqual({ 'not-compass': 'That file is not a Compass backup.', newer: 'That backup is from a newer version of Compass.', 'too-large': 'That file is too large to be a Compass backup.', 'no-room': 'This device could not keep that backup, so nothing was changed.' });
  });

  it('reads a backup with no day it was saved, or one that is not a day', () => {
    const whole = JSON.parse(backupText(empty(), NOW));
    delete whole.savedAt;
    expect(readBackup(JSON.stringify(whole))).toMatchObject({ ok: true, savedAt: null });
    expect(readBackup(JSON.stringify({ ...whole, savedAt: 'last week' }))).toMatchObject({ ok: true, savedAt: null });
  });

  it('says what a backup holds, leaving out what there is none of', () => {
    expect(backupSummary(empty())).toEqual(['5 subjects']);
    const sample = seed('2026-11-19');
    expect(backupSummary(sample)).toEqual(expect.arrayContaining(['5 subjects', '4 habits', '5 pages', '412 nautical miles']));
    expect(backupSummary({ ...empty(), subjects: [], tasks: [sample.tasks[0]!], reviews: [{ weekStart: '2026-11-09', wentWell: 'x', gotInWay: '', change: '' }], headlines: [{ id: 'h', title: 'A', url: 'https://example.org', source: 'example.org', date: '2026-11-19', tag: '' }] }))
      .toEqual(['1 task', '1 weekly review', '1 headline']);
    expect(backupSummary({ ...empty(), subjects: [] })).toEqual([]);
    // what Fitness keeps is counted only while Fitness is switched on, since otherwise it has never been seen
    expect(backupSummary(sample).some((part) => part.includes('training'))).toBe(false);
    const on = backupSummary({ ...sample, settings: { ...sample.settings, fitness: true } });
    expect(on).toEqual(expect.arrayContaining([`${sample.routines.length} training routines`]));
    expect(backupSummary({ ...empty(), subjects: [], feedback: sample.feedback.slice(0, 1), sessions: [{ id: 's', subjectId: 'bio', name: 'Cards', days: [1], createdOn: '2026-11-01' }] })).toEqual(['1 piece of feedback', '1 study session']);
  });

  it('joins a list into a sentence', () => {
    expect(sentenceOf([])).toBe('');
    expect(sentenceOf(['1 task'])).toBe('1 task');
    expect(sentenceOf(['1 task', '2 pages'])).toBe('1 task and 2 pages');
    expect(sentenceOf(['1 task', '2 pages', '3 habits'])).toBe('1 task, 2 pages and 3 habits');
  });
});

import { describe, expect, it } from 'vitest';
import { addDaysISO, isISODate, isoWeek, longDate, relativeDay, sheetTitle, weekDays, weekLabel, weekStartOf } from './dates';

describe('dates', () => {
  it('finds the week, Monday first by default', () => {
    expect(weekStartOf('2026-11-15')).toBe('2026-11-09');
    expect(weekStartOf('2026-11-09')).toBe('2026-11-09');
    expect(weekStartOf('2026-11-15', 0)).toBe('2026-11-15');
    expect(weekDays('2026-11-09')).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']);
  });

  it('labels a week within a month, across months and across years', () => {
    expect(weekLabel('2026-11-09')).toBe('9 to 15 November');
    expect(weekLabel('2026-11-30')).toBe('30 November to 6 December');
    expect(weekLabel('2026-12-28')).toBe('28 December 2026 to 3 January 2027');
  });

  it('numbers weeks by ISO 8601, including at the turn of the year', () => {
    expect(isoWeek('2026-11-15')).toBe(46);
    expect(isoWeek('2026-12-31')).toBe(53);
    expect(isoWeek('2027-01-04')).toBe(1);
  });

  it('writes dates the British way', () => {
    expect(longDate('2026-11-15')).toBe('Sunday 15 November');
    expect(sheetTitle('2026-11-15', '2026-11-15')).toBe('Today');
    expect(sheetTitle('2026-11-16', '2026-11-15')).toBe('Tomorrow');
    expect(sheetTitle('2026-11-14', '2026-11-15')).toBe('Yesterday');
    expect(sheetTitle('2026-11-12', '2026-11-15')).toBe('Thursday 12');
    expect(relativeDay('2026-11-19', '2026-11-15')).toBe('in 4 days');
    expect(relativeDay('2026-11-15', '2026-11-15')).toBe('today');
  });

  it('steps over month ends and rejects bad dates', () => {
    expect(addDaysISO('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDaysISO('2027-01-01', -1)).toBe('2026-12-31');
    expect(isISODate('2026-11-15')).toBe(true);
    for (const bad of ['', null, 'tomorrow', '2026-13-40', '15/11/2026']) expect(isISODate(bad)).toBe(false);
  });
});

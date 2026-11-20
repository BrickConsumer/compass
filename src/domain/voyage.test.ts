import { describe, expect, it } from 'vitest';
import { announcement, earnedIds, earnedWater, FITTINGS, nextWater, unseenRewards, WATER_MILES, waterSeenId } from './voyage';

const fitting = (id: string) => FITTINGS.find((f) => f.id === id)!;

describe('what has been earned', () => {
  it('lists every stage and fitting earned so far', () => {
    expect(earnedIds(0, 0)).toEqual(['dinghy']);
    expect(earnedIds(412, 23)).toEqual(['dinghy', 'sloop', 'pennant', 'lantern', 'sheer-stripe', 'portlights']);
    // miles alone do not earn a boat: it needs its days at sea too
    expect(earnedIds(1200, 12)).not.toContain('cutter');
    expect(earnedIds(1200, 40)).toContain('cutter');
  });
});

describe('what is new since the voyage was last opened', () => {
  const seenAtSample = earnedIds(412, 23);

  it('is nothing when everything earned has been seen', () => {
    expect(unseenRewards(412, 23, seenAtSample)).toEqual({ stage: undefined, fittings: [] });
    expect(announcement(unseenRewards(412, 23, seenAtSample))).toBeNull();
  });

  it('is the fitting that was just passed', () => {
    const u = unseenRewards(500, 24, seenAtSample);
    expect(u.fittings).toEqual([fitting('transom-name')]);
    expect(u.stage).toBeUndefined();
  });

  it('is the furthest boat earned and not yet seen', () => {
    expect(unseenRewards(1000, 40, seenAtSample).stage).toBe('cutter');
    // jumping two boats at once announces the further one
    expect(unseenRewards(3000, 120, ['dinghy']).stage).toBe('schooner');
  });

  it('never includes what has not been earned, whatever has been seen', () => {
    expect(unseenRewards(10, 1, [])).toEqual({ stage: 'dinghy', fittings: [] });
    expect(unseenRewards(10, 1, ['dinghy'])).toEqual({ stage: undefined, fittings: [] });
  });
});

describe('the line on the plate', () => {
  it('names one new fitting plainly', () => {
    expect(announcement({ fittings: [fitting('lantern')] })).toEqual({ lead: 'New: ', name: 'bow lantern', tail: '' });
    expect(announcement({ fittings: [fitting('transom-name')] })).toEqual({ lead: 'New: ', name: 'name on the quarter', tail: '' });
  });

  it('names the latest of several and counts the rest', () => {
    expect(announcement({ fittings: [fitting('pennant'), fitting('lantern')] })).toEqual({ lead: 'New: ', name: 'bow lantern', tail: ' and 1 more' });
    expect(announcement({ fittings: [fitting('pennant'), fitting('lantern'), fitting('sheer-stripe')] })!.tail).toBe(' and 2 more');
  });

  it('says a new boat is ready, ahead of any fitting', () => {
    expect(announcement({ stage: 'cutter', fittings: [fitting('dress-flags')] })).toEqual({ lead: '', name: 'The cutter', tail: ' is ready' });
  });
});

describe('waters', () => {
  it('are reached by miles alone: 800, 2,000 and 3,300', () => {
    expect(WATER_MILES).toEqual({ home: 0, coral: 800, fjords: 2000, ice: 3300 });
    expect([0, 799, 800, 1999, 2000, 3299, 3300, 9000].map(earnedWater)).toEqual(['home', 'home', 'coral', 'coral', 'fjords', 'fjords', 'ice', 'ice']);
  });

  it('no water is reached at the same miles as a fitting, so each is news of its own', () => {
    for (const miles of Object.values(WATER_MILES)) expect(FITTINGS.some((f) => f.miles === miles)).toBe(false);
  });

  it('the next water and the miles to it are known, until the last', () => {
    expect(nextWater(412)).toEqual({ id: 'coral', miles: 388 });
    expect(nextWater(800)).toEqual({ id: 'fjords', miles: 1200 });
    expect(nextWater(3300)).toBeUndefined();
  });

  it('are recorded as seen under their own ids, and home waters are not listed', () => {
    expect(earnedIds(799, 30)).not.toContain(waterSeenId('coral'));
    expect(earnedIds(800, 30)).toContain('water:coral');
    expect(earnedIds(3300, 130).filter((id) => id.startsWith('water:'))).toEqual(['water:coral', 'water:fjords', 'water:ice']);
    expect(earnedIds(3300, 130)).not.toContain('water:home');
  });

  it('a water reached and not yet seen is news; the furthest one is the one told', () => {
    expect(unseenRewards(900, 30, earnedIds(700, 30)).water).toBe('coral');
    expect(unseenRewards(900, 30, earnedIds(900, 30)).water).toBeUndefined();
    expect(unseenRewards(2100, 30, earnedIds(700, 30)).water).toBe('fjords');
    expect(unseenRewards(412, 23, []).water).toBeUndefined();
  });

  it('is announced after a boat and before a fitting', () => {
    expect(announcement({ fittings: [], water: 'coral' })).toEqual({ lead: 'New waters: ', name: 'the coral shallows', tail: '' });
    expect(announcement({ fittings: [FITTINGS[0]!], water: 'ice' })).toEqual({ lead: 'New waters: ', name: 'the ice', tail: '' });
    expect(announcement({ stage: 'cutter', fittings: [], water: 'coral' })!.name).toBe('The cutter');
  });
});

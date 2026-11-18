import { describe, expect, it } from 'vitest';
import { announcement, earnedIds, FITTINGS, unseenRewards } from './voyage';

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

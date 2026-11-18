import { describe, expect, it } from 'vitest';
import { frameWatch, qualityFor, startingQuality, stepDown, TIERS } from './tier';

/** Feed the watch the same frame time for a stretch, and say whether it ever reported slow. */
const run = (watch: (ms: number) => boolean, frameMs: number, forMs: number): boolean => {
  let slow = false;
  for (let t = 0; t < forMs; t += frameMs) slow = watch(frameMs) || slow;
  return slow;
};

describe('performance tiers', () => {
  it('starts high with a pointer and low on touch', () => {
    expect(startingQuality(false)).toEqual({ tier: 'high', maxDpr: 2 });
    expect(startingQuality(true)).toEqual({ tier: 'low', maxDpr: 1.5 });
  });

  it('the low tier has no shadow map and is capped at 30 frames a second', () => {
    expect(TIERS.low).toMatchObject({ shadows: false, fps: 30 });
    expect(TIERS.high).toMatchObject({ shadows: true, fps: 0 });
  });

  it('steps down one notch at a time and stops at the floor', () => {
    const low = stepDown(qualityFor('high')), floor = stepDown(low);
    expect(low).toEqual({ tier: 'low', maxDpr: 1.5 });
    expect(floor).toEqual({ tier: 'low', maxDpr: 1 });
    // the same object back, so setting it as state changes nothing
    expect(stepDown(floor)).toBe(floor);
  });
});

describe('frameWatch', () => {
  it('stays quiet at the display rate', () => {
    expect(run(frameWatch(22), 16.7, 10_000)).toBe(false);
  });

  it('reports slow once frames have stayed above the limit for two seconds, and not before', () => {
    const watch = frameWatch(22);
    expect(run(watch, 30, 1900)).toBe(false);
    expect(run(watch, 30, 200)).toBe(true);
  });

  it('is not set off by the odd long frame', () => {
    const watch = frameWatch(22);
    let slow = false;
    for (let i = 0; i < 600; i++) slow = watch(i % 30 === 0 ? 80 : 16.7) || slow;
    expect(slow).toBe(false);
  });

  it('treats a long gap as a pause, not as slowness', () => {
    const watch = frameWatch(22);
    run(watch, 30, 1800);
    // the tab was hidden for five seconds; the count starts again
    expect(watch(5000)).toBe(false);
    expect(run(watch, 30, 1800)).toBe(false);
  });

  it('judges the capped tier against its own limit', () => {
    expect(run(frameWatch(TIERS.low.slowMs), 1000 / 30, 10_000)).toBe(false);
    expect(run(frameWatch(TIERS.low.slowMs), 60, 3000)).toBe(true);
  });
});

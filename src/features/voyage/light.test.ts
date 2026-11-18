import { describe, expect, it } from 'vitest';
import { describeScene, lightAt, lightFor, mixHex, sceneState } from './light';

const HEX = /^#[0-9a-f]{6}$/;

describe('light table', () => {
  it('returns the keyframes exactly', () => {
    expect(lightAt(0).skyTop).toBe('#a9bbcb');
    expect(lightAt(0.5).waterDeep).toBe('#1c5676');
    expect(lightAt(1).waterDeep).toBe('#1b3d5a');
    expect(lightAt(1).glitter).toBe(1);
  });

  it('clamps anything outside 0 to 1, and survives NaN', () => {
    expect(lightAt(-1)).toEqual(lightAt(0));
    expect(lightAt(2)).toEqual(lightAt(1));
    for (const p of [NaN, Infinity, -Infinity]) {
      for (const v of Object.values(lightAt(p))) {
        if (typeof v === 'string') expect(v).toMatch(HEX);
        else expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it('mixes colours between keyframes', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(lightAt(0.25).skyTop).toBe(mixHex('#a9bbcb', '#7da7cb', 0.5));
  });
});

describe('scene state', () => {
  it('a day with nothing planned is in port, not at dawn, and never stormy', () => {
    for (const day of [{}, { missedYesterday: true }]) {
      const s = sceneState(null, day);
      expect(s.inPort).toBe(true);
      expect(s.sailFill).toBe(0);
      expect(s.speed).toBe(0);
      expect(s.storm).toBe(0);
      expect(s.light).toEqual(lightAt(0.45));
    }
  });

  it('waves stay gentle on an ordinary day: 0.06 m at dawn, 0.22 m when the day is done', () => {
    expect(sceneState(0).waveHeight).toBeCloseTo(0.06, 10);
    expect(sceneState(1).waveHeight).toBeCloseTo(0.22, 10);
    expect(sceneState(5).waveHeight).toBeCloseTo(0.22, 10);
  });

  it('the boat idles with nothing done and is under way from the first task', () => {
    expect(sceneState(0).speed).toBe(0);
    expect(sceneState(0.2).speed).toBeGreaterThan(0.3);
    expect(sceneState(1).speed).toBe(1);
    expect(sceneState(0.6).speed).toBeGreaterThan(sceneState(0.2).speed);
  });

  it('wind and sail fill rise with progress', () => {
    const a = sceneState(0), b = sceneState(0.6), c = sceneState(1);
    expect(b.wind).toBeGreaterThan(a.wind);
    expect(c.wind).toBeGreaterThan(b.wind);
    expect(c.sailFill).toBe(1);
    expect(a.inPort).toBe(false);
  });

  it('the day after a missed day opens in a storm that clears as tasks are done', () => {
    const start = sceneState(0, { missedYesterday: true }), mid = sceneState(0.6, { missedYesterday: true }), end = sceneState(1, { missedYesterday: true });
    expect(start.storm).toBe(1);
    expect(mid.storm).toBeCloseTo(0.4, 10);
    expect(end.storm).toBe(0);
    expect(start.waveHeight).toBeGreaterThan(sceneState(0).waveHeight);
    expect(start.light).not.toEqual(lightAt(0));
    // finishing the day still reaches golden hour, exactly as on any other day
    expect(end).toEqual(sceneState(1));
    expect(lightFor(1, 0)).toEqual(lightAt(1));
  });

  it('there is no storm without a missed day', () => {
    for (const p of [0, 0.3, 1]) expect(sceneState(p).storm).toBe(0);
  });

  it('describes each state in words', () => {
    expect(describeScene('The Kestrel', 'Sloop', sceneState(null))).toBe('The Kestrel, a sloop, moored in port and taking on supplies.');
    expect(describeScene('The Kestrel', 'Sloop', sceneState(1))).toBe('The Kestrel, a sloop, under full sail at golden hour.');
    expect(describeScene('The Kestrel', 'Sloop', sceneState(0.6))).toBe('The Kestrel, a sloop, under sail in clear daylight.');
    expect(describeScene('The Kestrel', 'Sloop', sceneState(0, { missedYesterday: true }))).toBe('The Kestrel, a sloop, riding out a storm.');
  });
});

describe('the night, which comes with the dark theme', () => {
  const day = (p: number) => lightFor(p, 0), night = (p: number) => lightFor(p, 0, 1);

  it('by day nothing changes: no stars, no lamps, the boat fully lit', () => {
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      expect(day(p)).toEqual(lightAt(p));
      expect(lightFor(p, 0, 0)).toEqual(lightAt(p));
      expect(day(p)).toMatchObject({ stars: 0, lamps: 0, lit: 1 });
    }
  });

  it('opens on dusk, with the sun just down and the lamps lit', () => {
    expect(night(0)).toMatchObject({ skyTop: '#34406e', skyHorizon: '#f0a271', sun: '#ffb27a', stars: 0, lamps: 1 });
    expect(night(0).lit).toBeGreaterThan(0.6);
    expect(night(0).lit).toBeLessThan(1);
  });

  it('half way the sky has cleared to stars, with no moon yet', () => {
    expect(night(0.5)).toMatchObject({ skyTop: '#081428', waterDeep: '#061226', stars: 1, sunAmount: 0, lamps: 1 });
  });

  it('with everything done the moon rises and lays a path on the water, as the sun does at golden hour', () => {
    expect(night(1)).toMatchObject({ skyTop: '#0c1a36', sun: '#f1f4ff', sunAmount: 1, glitter: 1 });
    expect(night(1).glitter).toBe(day(1).glitter);
    expect(night(1).stars).toBeGreaterThan(0.5);
  });

  it('the boat is never a silhouette: she keeps at least a quarter of her light', () => {
    for (const p of [0, 0.3, 0.5, 0.8, 1]) for (const storm of [0, 0.5, 1]) expect(lightFor(p, storm, 1).lit).toBeGreaterThanOrEqual(0.25);
  });

  it('changing theme eases from one sky to the other', () => {
    expect(lightFor(0.5, 0, 0.5).skyTop).toBe(mixHex(day(0.5).skyTop, night(0.5).skyTop, 0.5));
    expect(lightFor(0.5, 0, 0.5).stars).toBeCloseTo(0.5);
    expect(lightFor(0.5, 0, 7)).toEqual(night(0.5));
    expect(lightFor(0.5, 0, NaN)).toEqual(day(0.5));
  });

  it('a storm at night has no stars, and clears toward the night and not the day', () => {
    expect(lightFor(0, 1, 1).stars).toBe(0);
    expect(lightFor(0, 1, 1).skyTop).not.toBe(lightFor(0, 1, 0).skyTop);
    expect(lightFor(1, 0, 1)).toEqual(night(1));
    for (const v of Object.values(lightFor(0.4, 0.6, 1))) { if (typeof v === 'string') expect(v).toMatch(HEX); else expect(Number.isFinite(v)).toBe(true); }
  });

  it('the scene knows it is night, and a day in port is an evening with the lamps lit', () => {
    expect(sceneState(0.6).night).toBe(false);
    expect(sceneState(0.6, { night: true }).night).toBe(true);
    expect(sceneState(0.6, { night: true }).light).toEqual(night(0.6));
    const port = sceneState(null, { night: true });
    expect(port.inPort).toBe(true);
    expect(port.light.lamps).toBe(1);
    expect(port.light).toEqual(night(0.45));
    // everything but the sky is as by day
    const { light: a, night: n1, ...restNight } = sceneState(0.6, { night: true }), { light: b, night: n2, ...restDay } = sceneState(0.6);
    expect(restNight).toEqual(restDay);
    expect([a === b, n1, n2]).toEqual([false, true, false]);
  });

  it('is described for someone who cannot see it', () => {
    const say = (progress: number | null, day = {}) => describeScene('The Kestrel', 'Sloop', sceneState(progress, { night: true, ...day }));
    expect(say(0)).toBe('The Kestrel, a sloop, on still water at dusk.');
    expect(say(0.6)).toBe('The Kestrel, a sloop, under sail beneath the stars.');
    expect(say(1)).toBe('The Kestrel, a sloop, under full sail by moonlight.');
    expect(say(null)).toBe('The Kestrel, a sloop, moored in port for the evening.');
    expect(say(0, { missedYesterday: true })).toBe('The Kestrel, a sloop, riding out a storm.');
  });
});

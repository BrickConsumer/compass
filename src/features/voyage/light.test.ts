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

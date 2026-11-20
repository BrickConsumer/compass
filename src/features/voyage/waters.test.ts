import { describe, expect, it } from 'vitest';
import { describeScene, lightFor, sceneState } from './light';
import { storedWater, WATER_ORDER, WATERS } from './waters';

const HEX = /^#[0-9a-fA-F]{6}$/;

describe('the waters', () => {
  it('are four, in the order they are reached, starting at home', () => {
    expect(WATER_ORDER).toEqual(['home', 'coral', 'fjords', 'ice']);
    expect(Object.keys(WATERS).sort()).toEqual([...WATER_ORDER].sort());
    for (const id of WATER_ORDER) expect(WATERS[id].id).toBe(id);
  });

  it('each has a name, a way to say it in a sentence and a way to say where the boat is', () => {
    for (const w of Object.values(WATERS)) {
      expect(w.name.length).toBeGreaterThan(3);
      expect(w.phrase).toBe(w.phrase.toLowerCase());
      expect(w.where).toMatch(/^(in|among) /);
    }
  });

  it('each keeps to six islands and one lighthouse, since every island is a draw call', () => {
    for (const w of Object.values(WATERS)) {
      expect(w.islands.length, w.id).toBeGreaterThan(2);
      expect(w.islands.length, w.id).toBeLessThanOrEqual(6);
      expect(w.islands.filter((i) => i.light !== undefined).length, w.id).toBeLessThanOrEqual(1);
      // an island's haze also orders it from far to near, so no two share one
      expect(new Set(w.islands.map((i) => i.haze)).size, w.id).toBe(w.islands.length);
    }
  });

  it('every colour is a plain six-figure colour', () => {
    for (const w of Object.values(WATERS)) {
      for (const c of [w.growth, w.sand, w.shore.sand, w.shore.ground, w.shore.hill, w.shore.rock]) expect(c, w.id).toMatch(HEX);
      for (const sky of w.day ?? []) for (const c of [sky.skyTop, sky.skyMid, sky.skyHorizon, sky.waterHorizon, sky.waterDeep, sky.sun, sky.haze, sky.land]) expect(c, w.id).toMatch(HEX);
      for (const toward of Object.values(w.night ?? {})) { expect(toward[0], w.id).toMatch(HEX); expect(toward[1]).toBeGreaterThan(0); expect(toward[1]).toBeLessThanOrEqual(1); }
    }
  });

  it('a saved value that names no water is home waters', () => {
    expect(storedWater('fjords')).toBe('fjords');
    for (const bad of [undefined, null, '', 'lagoon', 3, {}]) expect(storedWater(bad)).toBe('home');
  });
});

describe('the light in each water', () => {
  it('home waters are lit exactly as before there were any others', () => {
    for (const p of [0, 0.3, 0.5, 0.8, 1]) for (const night of [0, 1]) {
      expect(lightFor(p, 0, night, 'home')).toEqual(lightFor(p, 0, night));
      expect(lightFor(p, 0.6, night, 'home')).toEqual(lightFor(p, 0.6, night));
    }
  });

  it('each other water has a sea and a sky of its own, by day and by night', () => {
    for (const id of ['coral', 'fjords', 'ice'] as const) {
      for (const p of [0, 0.5, 1]) {
        expect(lightFor(p, 0, 0, id).waterDeep, `${id} day ${p}`).not.toBe(lightFor(p, 0, 0).waterDeep);
        expect(lightFor(p, 0, 1, id).waterDeep, `${id} night ${p}`).not.toBe(lightFor(p, 0, 1).waterDeep);
      }
      expect(lightFor(0.5, 0, 0, id).skyTop).not.toBe(lightFor(0.5, 0, 0).skyTop);
    }
  });

  it('the night keeps its stars, its lamps and its dark in every water', () => {
    for (const id of WATER_ORDER) for (const p of [0, 0.5, 1]) {
      const here = lightFor(p, 0, 1, id), home = lightFor(p, 0, 1);
      expect([here.stars, here.lamps, here.lit, here.skyTop, here.sunAmount]).toEqual([home.stars, home.lamps, home.lit, home.skyTop, home.sunAmount]);
    }
  });

  it('by day no water has stars or lit lamps, and the boat has all her light', () => {
    for (const id of WATER_ORDER) for (const p of [0, 0.5, 1]) {
      const l = lightFor(p, 0, 0, id);
      expect([l.stars, l.lamps, l.lit]).toEqual([0, 0, 1]);
    }
  });

  it('a full storm is the same storm everywhere', () => {
    for (const id of WATER_ORDER) { expect(lightFor(0, 1, 0, id)).toEqual(lightFor(0, 1, 0)); expect(lightFor(0, 1, 1, id)).toEqual(lightFor(0, 1, 1)); }
  });

  it('the ice stays pale at night, and the shallows keep their green water', () => {
    const lum = (hex: string) => [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0);
    expect(lum(lightFor(0.5, 0, 1, 'ice').land)).toBeGreaterThan(lum(lightFor(0.5, 0, 1).land) * 2);
    const coral = lightFor(0.5, 0, 1, 'coral').waterHorizon, green = parseInt(coral.slice(3, 5), 16), red = parseInt(coral.slice(1, 3), 16);
    expect(green).toBeGreaterThan(red + 30);
  });
});

describe('the scene in a water', () => {
  it('is in home waters unless told otherwise, and a water changes nothing about the day', () => {
    expect(sceneState(0.4).water).toBe('home');
    const home = sceneState(0.4, { missedYesterday: true }), ice = sceneState(0.4, { missedYesterday: true, water: 'ice' });
    expect(ice.water).toBe('ice');
    expect([ice.wind, ice.sailFill, ice.waveHeight, ice.speed, ice.storm, ice.inPort]).toEqual([home.wind, home.sailFill, home.waveHeight, home.speed, home.storm, home.inPort]);
    expect(sceneState(null, { water: 'fjords' }).inPort).toBe(true);
  });

  it('is described with where the boat is, except in home waters', () => {
    expect(describeScene('The Kestrel', 'Sloop', sceneState(0.5))).toBe('The Kestrel, a sloop, under sail in clear daylight.');
    expect(describeScene('The Kestrel', 'Sloop', sceneState(0.5, { water: 'coral' }))).toBe('The Kestrel, a sloop, under sail in clear daylight, in the coral shallows.');
    expect(describeScene('The Kestrel', 'Cutter', sceneState(null, { water: 'fjords', night: true }))).toBe('The Kestrel, a cutter, moored in port for the evening, in the northern fjords.');
    expect(describeScene('The Kestrel', 'Sloop', sceneState(1, { water: 'ice', night: true }))).toBe('The Kestrel, a sloop, under full sail by moonlight, among the ice.');
    expect(describeScene('The Kestrel', 'Sloop', sceneState(0, { water: 'ice', missedYesterday: true }))).toBe('The Kestrel, a sloop, riding out a storm, among the ice.');
  });
});

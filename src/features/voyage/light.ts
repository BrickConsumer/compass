/**
 * The light table (art direction, section 12) and the scene state derived from a day's progress.
 * Used by both the still image and the 3D scene.
 */
export interface Light {
  skyTop: string; skyMid: string; skyHorizon: string;
  waterHorizon: string; waterDeep: string;
  sun: string; haze: string; land: string;
  /** 0 to 1: how visible the sun disc is, how thick the haze is, how strong the sparkle path is. */
  sunAmount: number; hazeAmount: number; glitter: number;
  /** 0 to 1: how many stars show, how lit the lamps and portlights are, and how much light falls on the boat. By day: none, none, all of it. */
  stars: number; lamps: number; lit: number;
}

/** By day there are no stars, no lamps are lit, and the boat has all her light. */
const DAYLIGHT = { stars: 0, lamps: 0, lit: 1 };

const KEYFRAMES: readonly Light[] = [
  // dawn, nothing done
  { skyTop: '#a9bbcb', skyMid: '#dadfd9', skyHorizon: '#f3e4d2', waterHorizon: '#cfd9d6', waterDeep: '#587789',
    sun: '#fff3df', haze: '#f4ebdd', land: '#93a8b8', sunAmount: 0.6, hazeAmount: 0.62, glitter: 0.28, ...DAYLIGHT },
  // clear day, half done
  { skyTop: '#7da7cb', skyMid: '#b9d4e5', skyHorizon: '#e4eeec', waterHorizon: '#8fbcc8', waterDeep: '#1c5676',
    sun: '#fffcee', haze: '#eaf1ef', land: '#5f8499', sunAmount: 0, hazeAmount: 0.25, glitter: 0.3, ...DAYLIGHT },
  // golden hour, all done
  { skyTop: '#6e87a8', skyMid: '#dcc0a2', skyHorizon: '#fbdca6', waterHorizon: '#ebc68e', waterDeep: '#1b3d5a',
    sun: '#ffe4a6', haze: '#f8dba9', land: '#4a5f78', sunAmount: 1, hazeAmount: 0.4, glitter: 1, ...DAYLIGHT },
];

/**
 * The night's table, which the dark theme reads by the same share of the day done.
 * It opens on dusk, since the first thing seen each day should not be the darkest; the light then deepens to stars
 * and ends in moonrise. The moon rises where the sun sets, and uses the same disc and the same path on the water.
 * Starting values from the mock, to be tuned at a look review.
 */
const NIGHT_KEYFRAMES: readonly Light[] = [
  // dusk, nothing done: the sun is just down
  { skyTop: '#34406e', skyMid: '#a56a7c', skyHorizon: '#f0a271', waterHorizon: '#c98a76', waterDeep: '#172746',
    sun: '#ffb27a', haze: '#e59e7c', land: '#2a3350', sunAmount: 0.85, hazeAmount: 0.45, glitter: 0.85, stars: 0, lamps: 1, lit: 0.7 },
  // stars, half done: a clear, deep blue night
  { skyTop: '#081428', skyMid: '#12264a', skyHorizon: '#27406a', waterHorizon: '#223a5c', waterDeep: '#061226',
    sun: '#dfe7f8', haze: '#1f3558', land: '#0b182c', sunAmount: 0, hazeAmount: 0.3, glitter: 0.25, stars: 1, lamps: 1, lit: 0.3 },
  // moonrise, all done
  { skyTop: '#0c1a36', skyMid: '#1c3560', skyHorizon: '#3f5c8a', waterHorizon: '#3a5682', waterDeep: '#08162e',
    sun: '#f1f4ff', haze: '#33507c', land: '#0d1b32', sunAmount: 1, hazeAmount: 0.35, glitter: 1, stars: 0.8, lamps: 1, lit: 0.34 },
];

const channels = (hex: string): [number, number, number] =>
  [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

/** Mix two #rrggbb colours. t is clamped to 0..1. */
export function mixHex(a: string, b: string, t: number): string {
  const k = clamp01(t), A = channels(a), B = channels(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i]! - v) * k).toString(16).padStart(2, '0')).join('');
}

/** Clamp to 0..1. Anything that is not a number counts as 0. */
export function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Mix two lights. Every colour and every number moves the same share of the way. */
function mixLight(a: Light, b: Light, t: number): Light {
  return {
    skyTop: mixHex(a.skyTop, b.skyTop, t), skyMid: mixHex(a.skyMid, b.skyMid, t), skyHorizon: mixHex(a.skyHorizon, b.skyHorizon, t),
    waterHorizon: mixHex(a.waterHorizon, b.waterHorizon, t), waterDeep: mixHex(a.waterDeep, b.waterDeep, t),
    sun: mixHex(a.sun, b.sun, t), haze: mixHex(a.haze, b.haze, t), land: mixHex(a.land, b.land, t),
    sunAmount: lerp(a.sunAmount, b.sunAmount, t), hazeAmount: lerp(a.hazeAmount, b.hazeAmount, t), glitter: lerp(a.glitter, b.glitter, t),
    stars: lerp(a.stars, b.stars, t), lamps: lerp(a.lamps, b.lamps, t), lit: lerp(a.lit, b.lit, t),
  };
}

/** The light for a share of the day done, 0 to 1: dawn to golden hour by day, or with the night's table, dusk to moonrise. */
export function lightAt(p: number, table: readonly Light[] = KEYFRAMES): Light {
  const q = clamp01(p);
  const i = q <= 0.5 ? 0 : 1, t = q <= 0.5 ? q / 0.5 : (q - 0.5) / 0.5;
  return mixLight(table[i]!, table[i + 1]!, t);
}

/** The storm that follows a missed day. It is weather, never a penalty: nothing earned is lost. */
const STORM: Light = {
  skyTop: '#3f4b5b', skyMid: '#606d79', skyHorizon: '#8d989d', waterHorizon: '#70808a', waterDeep: '#1c2d3d',
  sun: '#cfd6da', haze: '#84909a', land: '#35424f', sunAmount: 0, hazeAmount: 0.75, glitter: 0.05, ...DAYLIGHT,
};

/** The same storm at night: near-black cloud, no stars, the lamps lit. */
const NIGHT_STORM: Light = {
  skyTop: '#0c1118', skyMid: '#1a222c', skyHorizon: '#2c3640', waterHorizon: '#232d38', waterDeep: '#070b12',
  sun: '#8f9aa6', haze: '#252e38', land: '#0a0f15', sunAmount: 0, hazeAmount: 0.75, glitter: 0.05, stars: 0, lamps: 1, lit: 0.28,
};

/**
 * The light for a day: the table for its sky, darkened by however much storm is left.
 * `night` is 0 by day and 1 in the dark theme; between the two it is a change of theme under way.
 */
export function lightFor(p: number, storm: number, night = 0): Light {
  const s = clamp01(storm), n = clamp01(night);
  const day = s > 0 ? mixLight(lightAt(p), STORM, s) : lightAt(p);
  if (n === 0) return day;
  const dark = s > 0 ? mixLight(lightAt(p, NIGHT_KEYFRAMES), NIGHT_STORM, s) : lightAt(p, NIGHT_KEYFRAMES);
  return n === 1 ? dark : mixLight(day, dark, n);
}

export interface SceneState {
  /** Share of the day done, 0..1. For a day in port this is the soft daylight value. */
  progress: number;
  light: Light;
  /** 0 (still) to 1 (a working breeze, or a storm). */
  wind: number;
  /** How full the sails are, 0 to 1. */
  sailFill: number;
  /** Wave amplitude in metres: 0.06 at dawn to 0.22 in a breeze, up to 0.36 in a storm. */
  waveHeight: number;
  /** How fast the boat is making way, 0 (idle) to 1. Under way from the first finished task. */
  speed: number;
  /** How much storm is left, 0 to 1. Starts at 1 the day after a missed day and clears as tasks are done. */
  storm: number;
  /** A day with nothing planned: moored in port, sails furled, taking on supplies. */
  inPort: boolean;
  /** The dark theme's sky: dusk, stars and moonrise in place of dawn, day and golden hour. Nothing else about the day changes. */
  night: boolean;
}

export interface DayContext {
  /** The day before had tasks planned and none were completed. */
  missedYesterday?: boolean;
  /** Show the night's sky, which the dark theme does. */
  night?: boolean;
}

/** Soft daylight used for a day in port. */
const PORT_LIGHT = 0.45;

/** Scene state for the selected day. `null` progress means nothing is planned. */
export function sceneState(progress: number | null, day: DayContext = {}): SceneState {
  const night = !!day.night;
  if (progress === null) {
    // a rest day is spent in harbour, sheltered, so it never shows the storm
    return { progress: PORT_LIGHT, light: lightFor(PORT_LIGHT, 0, night ? 1 : 0), wind: 0.1, sailFill: 0, waveHeight: 0.05, speed: 0, storm: 0, inPort: true, night };
  }
  const p = clamp01(progress), storm = day.missedYesterday ? 1 - p : 0;
  return {
    progress: p, light: lightFor(p, storm, night ? 1 : 0),
    wind: Math.max(lerp(0.08, 1, p), storm * 0.95),
    sailFill: Math.max(lerp(0.12, 1, p), storm * 0.55),
    waveHeight: lerp(0.06, 0.22, p) + storm * 0.3,
    speed: p > 0 ? lerp(0.3, 1, p) : 0,
    storm, inPort: false, night,
  };
}

/** A sentence describing the scene, for assistive technology. */
export function describeScene(boatName: string, stageName: string, state: SceneState): string {
  const kind = stageName.toLowerCase();
  if (state.inPort) return state.night ? `${boatName}, a ${kind}, moored in port for the evening.` : `${boatName}, a ${kind}, moored in port and taking on supplies.`;
  if (state.storm > 0.5) return `${boatName}, a ${kind}, riding out a storm.`;
  if (state.storm > 0.05) return `${boatName}, a ${kind}, under sail as the storm clears.`;
  if (state.night) return state.progress <= 0.02 ? `${boatName}, a ${kind}, on still water at dusk.` : state.progress >= 0.98 ? `${boatName}, a ${kind}, under full sail by moonlight.` : `${boatName}, a ${kind}, under sail beneath the stars.`;
  if (state.progress <= 0.02) return `${boatName}, a ${kind}, on still water at dawn.`;
  if (state.progress >= 0.98) return `${boatName}, a ${kind}, under full sail at golden hour.`;
  return `${boatName}, a ${kind}, under sail in clear daylight.`;
}

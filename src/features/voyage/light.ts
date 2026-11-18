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
}

const KEYFRAMES: readonly Light[] = [
  // dawn, nothing done
  { skyTop: '#a9bbcb', skyMid: '#dadfd9', skyHorizon: '#f3e4d2', waterHorizon: '#cfd9d6', waterDeep: '#587789',
    sun: '#fff3df', haze: '#f4ebdd', land: '#93a8b8', sunAmount: 0.6, hazeAmount: 0.62, glitter: 0.28 },
  // clear day, half done
  { skyTop: '#7da7cb', skyMid: '#b9d4e5', skyHorizon: '#e4eeec', waterHorizon: '#8fbcc8', waterDeep: '#1c5676',
    sun: '#fffcee', haze: '#eaf1ef', land: '#5f8499', sunAmount: 0, hazeAmount: 0.25, glitter: 0.3 },
  // golden hour, all done
  { skyTop: '#6e87a8', skyMid: '#dcc0a2', skyHorizon: '#fbdca6', waterHorizon: '#ebc68e', waterDeep: '#1b3d5a',
    sun: '#ffe4a6', haze: '#f8dba9', land: '#4a5f78', sunAmount: 1, hazeAmount: 0.4, glitter: 1 },
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

/** The light for a share of the day done, 0 (dawn) to 1 (golden hour). */
export function lightAt(p: number): Light {
  const q = clamp01(p);
  const i = q <= 0.5 ? 0 : 1, t = q <= 0.5 ? q / 0.5 : (q - 0.5) / 0.5;
  const a = KEYFRAMES[i]!, b = KEYFRAMES[i + 1]!;
  return {
    skyTop: mixHex(a.skyTop, b.skyTop, t), skyMid: mixHex(a.skyMid, b.skyMid, t), skyHorizon: mixHex(a.skyHorizon, b.skyHorizon, t),
    waterHorizon: mixHex(a.waterHorizon, b.waterHorizon, t), waterDeep: mixHex(a.waterDeep, b.waterDeep, t),
    sun: mixHex(a.sun, b.sun, t), haze: mixHex(a.haze, b.haze, t), land: mixHex(a.land, b.land, t),
    sunAmount: lerp(a.sunAmount, b.sunAmount, t), hazeAmount: lerp(a.hazeAmount, b.hazeAmount, t), glitter: lerp(a.glitter, b.glitter, t),
  };
}

/** The storm that follows a missed day. It is weather, never a penalty: nothing earned is lost. */
const STORM: Light = {
  skyTop: '#3f4b5b', skyMid: '#606d79', skyHorizon: '#8d989d', waterHorizon: '#70808a', waterDeep: '#1c2d3d',
  sun: '#cfd6da', haze: '#84909a', land: '#35424f', sunAmount: 0, hazeAmount: 0.75, glitter: 0.05,
};

function mixLight(a: Light, b: Light, t: number): Light {
  return {
    skyTop: mixHex(a.skyTop, b.skyTop, t), skyMid: mixHex(a.skyMid, b.skyMid, t), skyHorizon: mixHex(a.skyHorizon, b.skyHorizon, t),
    waterHorizon: mixHex(a.waterHorizon, b.waterHorizon, t), waterDeep: mixHex(a.waterDeep, b.waterDeep, t),
    sun: mixHex(a.sun, b.sun, t), haze: mixHex(a.haze, b.haze, t), land: mixHex(a.land, b.land, t),
    sunAmount: lerp(a.sunAmount, b.sunAmount, t), hazeAmount: lerp(a.hazeAmount, b.hazeAmount, t), glitter: lerp(a.glitter, b.glitter, t),
  };
}

/** The light for a day: the usual dawn-to-gold table, darkened by however much storm is left. */
export function lightFor(p: number, storm: number): Light {
  const s = clamp01(storm);
  return s > 0 ? mixLight(lightAt(p), STORM, s) : lightAt(p);
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
}

export interface DayContext {
  /** The day before had tasks planned and none were completed. */
  missedYesterday?: boolean;
}

/** Soft daylight used for a day in port. */
const PORT_LIGHT = 0.45;

/** Scene state for the selected day. `null` progress means nothing is planned. */
export function sceneState(progress: number | null, day: DayContext = {}): SceneState {
  if (progress === null) {
    // a rest day is spent in harbour, sheltered, so it never shows the storm
    return { progress: PORT_LIGHT, light: lightAt(PORT_LIGHT), wind: 0.1, sailFill: 0, waveHeight: 0.05, speed: 0, storm: 0, inPort: true };
  }
  const p = clamp01(progress), storm = day.missedYesterday ? 1 - p : 0;
  return {
    progress: p, light: lightFor(p, storm),
    wind: Math.max(lerp(0.08, 1, p), storm * 0.95),
    sailFill: Math.max(lerp(0.12, 1, p), storm * 0.55),
    waveHeight: lerp(0.06, 0.22, p) + storm * 0.3,
    speed: p > 0 ? lerp(0.3, 1, p) : 0,
    storm, inPort: false,
  };
}

/** A sentence describing the scene, for assistive technology. */
export function describeScene(boatName: string, stageName: string, state: SceneState): string {
  const kind = stageName.toLowerCase();
  if (state.inPort) return `${boatName}, a ${kind}, moored in port and taking on supplies.`;
  if (state.storm > 0.5) return `${boatName}, a ${kind}, riding out a storm.`;
  if (state.storm > 0.05) return `${boatName}, a ${kind}, under sail as the storm clears.`;
  if (state.progress <= 0.02) return `${boatName}, a ${kind}, on still water at dawn.`;
  if (state.progress >= 0.98) return `${boatName}, a ${kind}, under full sail at golden hour.`;
  return `${boatName}, a ${kind}, under sail in clear daylight.`;
}

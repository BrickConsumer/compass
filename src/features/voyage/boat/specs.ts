/**
 * Boat measurements, shared by the still image and the 3D model.
 * Metres. Origin on the waterline under the stern; +x runs to the bow, +y is up.
 * These are the values the approved art direction boards were drawn from.
 */
export type StageId = 'dinghy' | 'sloop' | 'cutter' | 'schooner';
export const STAGE_ORDER: readonly StageId[] = ['dinghy', 'sloop', 'cutter', 'schooner'];

export interface MastSpec {
  /** Distance of the mast step from the stern. */
  x: number;
  /** Height above the deck. */
  H: number;
  /** Aft rake, as run over rise. */
  rake: number;
  /** Height of the boom above the deck. */
  boomH: number;
  /** Boom length. */
  boom: number;
  main: 'bermuda' | 'gaff';
  roach?: number;
  battens?: number;
  /** Gaff sails: throat height as a share of H, gaff length, and its angle above horizontal in degrees. */
  gaffAt?: number;
  gaff?: number;
  gaffAng?: number;
}

export interface HeadsailSpec {
  tack: 'stem' | 'sprit';
  /** Index into masts. Defaults to 0. */
  mast?: number;
  /** Where the stay meets the mast, as a share of H. */
  hoist: number;
  /** Clew position: distance forward of the mast, and height above the deck. */
  clewX: number;
  clewH: number;
}

export interface CabinSpec { a: number; b: number; h: number; ports: number }

export interface BoatSpec {
  name: string;
  /** Length on deck. */
  L: number;
  /** Freeboard at the stern and at the bow, and the depth of the sheer's dip between them. */
  fS: number; fB: number; dip: number;
  /** Bow overhang, stern overhang, transom rake, and depth of the canoe body. */
  rakeB: number; counter: number; tr: number; draft: number;
  /** Greatest beam, used by the 3D hull only. */
  beam: number;
  keel: 'dagger' | 'fin' | 'full';
  masts: MastSpec[];
  head: HeadsailSpec[];
  cabin?: CabinSpec;
  cabin2?: CabinSpec;
  bowsprit?: number;
  stays?: boolean;
  tiller?: boolean;
  pennant?: boolean;
  lantern?: boolean;
  ensign?: boolean;
}

export const STAGES: Record<StageId, BoatSpec> = {
  dinghy: {
    name: 'Dinghy', L: 3.8, fS: 0.44, fB: 0.58, dip: 0.07, rakeB: 0.55, counter: 0.3, tr: 0.08, draft: 0.16, beam: 1.5,
    keel: 'dagger', stays: false, tiller: true,
    masts: [{ x: 2.75, H: 5.0, rake: 0.03, boomH: 0.55, boom: 2.4, main: 'bermuda', roach: 0.16, battens: 3 }],
    head: [],
  },
  sloop: {
    name: 'Sloop', L: 6.8, fS: 0.72, fB: 0.98, dip: 0.13, rakeB: 1.1, counter: 0.9, tr: 0.25, draft: 0.3, beam: 2.3,
    keel: 'fin', tiller: true, pennant: true, lantern: true,
    masts: [{ x: 4.05, H: 8.6, rake: 0.035, boomH: 0.95, boom: 3.0, main: 'bermuda', roach: 0.2, battens: 4 }],
    head: [{ tack: 'stem', hoist: 0.86, clewX: 0.4, clewH: 0.85 }],
    cabin: { a: 2.3, b: 4.5, h: 0.42, ports: 2 },
  },
  cutter: {
    name: 'Cutter', L: 9.8, fS: 0.95, fB: 1.3, dip: 0.2, rakeB: 1.5, counter: 1.5, tr: 0.35, draft: 0.42, beam: 3.0,
    keel: 'full', pennant: true, lantern: true, ensign: true, bowsprit: 2.0,
    masts: [{ x: 5.6, H: 12.4, rake: 0.03, boomH: 1.25, boom: 4.6, main: 'bermuda', roach: 0.2, battens: 4 }],
    head: [
      { tack: 'sprit', hoist: 0.95, clewX: 1.9, clewH: 2.4 },
      { tack: 'stem', hoist: 0.72, clewX: 0.45, clewH: 1.05 },
    ],
    cabin: { a: 2.7, b: 6.5, h: 0.56, ports: 4 },
  },
  schooner: {
    name: 'Schooner', L: 14.2, fS: 1.1, fB: 1.55, dip: 0.26, rakeB: 2.2, counter: 2.4, tr: 0.45, draft: 0.5, beam: 3.9,
    keel: 'full', pennant: true, lantern: true, ensign: true, bowsprit: 2.8,
    masts: [
      { x: 5.0, H: 16.0, rake: 0.04, boomH: 1.5, boom: 5.4, main: 'bermuda', roach: 0.2, battens: 4 },
      { x: 9.3, H: 13.6, rake: 0.04, boomH: 1.45, boom: 3.7, main: 'gaff', gaffAt: 0.66, gaff: 3.0, gaffAng: 38 },
    ],
    head: [
      { tack: 'sprit', mast: 1, hoist: 0.97, clewX: 2.0, clewH: 2.6 },
      { tack: 'stem', mast: 1, hoist: 0.75, clewX: 0.45, clewH: 1.1 },
    ],
    cabin: { a: 2.4, b: 4.5, h: 0.6, ports: 3 },
    cabin2: { a: 5.9, b: 8.6, h: 0.5, ports: 3 },
  },
};

/** Height of the deck edge above the waterline at distance x from the stern. */
export function sheer(spec: BoatSpec, x: number): number {
  const u = Math.min(1, Math.max(0, x / spec.L));
  return spec.fS * (1 - u) + spec.fB * u - 4 * spec.dip * u * (1 - u);
}

/** Height of the tallest masthead above the waterline, with room for a pennant. */
export function tallOf(spec: BoatSpec): number {
  return Math.max(...spec.masts.map((m) => sheer(spec, m.x) + m.H)) * 1.07;
}

/** A point on a mast at height h above the deck. */
export function mastPoint(spec: BoatSpec, m: MastSpec, h: number): { x: number; y: number } {
  return { x: m.x - h * m.rake, y: sheer(spec, m.x) + h };
}

/** Colours the user chooses freely. */
export interface BoatColours { hull: string; sail: string; pennant: string }
export const DEFAULT_COLOURS: BoatColours = { hull: '#0E243A', sail: '#FCF8EE', pennant: '#AB3935' };

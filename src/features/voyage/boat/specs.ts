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
  /** The cutter and the schooner come with an ensign. */
  ensign?: boolean;
  /** Earned fittings. They are not part of a boat's measurements: `fitOut` sets them from what has been earned. */
  pennant?: boolean;
  lantern?: boolean;
  /** The painted stripe under the sheer. */
  stripe?: boolean;
  /** Brass portlights in the cabin sides. */
  portlights?: boolean;
  /** The boat's name, lettered on the quarter. */
  named?: boolean;
  /**
   * Has flags to dress ship: a line of small flags from the bow, over the mastheads, to the stern.
   * They are flown in port only, with the sails furled, as a real boat dresses. Under sail they would cross the sails.
   */
  dressed?: boolean;
  /** Ratlines across the shrouds, and lazy jacks from the mast to the boom. */
  ratlines?: boolean;
  sternLantern?: boolean;
  /** A small boat lashed upside down on the cabin top. Only where there is room: see `tenderBox`. */
  tender?: boolean;
  /** A topsail set above a gaff sail. Only on a boat that has one: see `topsailOf`. */
  topsail?: boolean;
  /** The cove stripe in gold leaf, with a fine second line under it. */
  gilded?: boolean;
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
    keel: 'fin', tiller: true,
    masts: [{ x: 4.05, H: 8.6, rake: 0.035, boomH: 0.95, boom: 3.0, main: 'bermuda', roach: 0.2, battens: 4 }],
    head: [{ tack: 'stem', hoist: 0.86, clewX: 0.4, clewH: 0.85 }],
    cabin: { a: 2.3, b: 4.5, h: 0.42, ports: 2 },
  },
  cutter: {
    name: 'Cutter', L: 9.8, fS: 0.95, fB: 1.3, dip: 0.2, rakeB: 1.5, counter: 1.5, tr: 0.35, draft: 0.42, beam: 3.0,
    keel: 'full', ensign: true, bowsprit: 2.0,
    masts: [{ x: 5.6, H: 12.4, rake: 0.03, boomH: 1.25, boom: 4.6, main: 'bermuda', roach: 0.2, battens: 4 }],
    head: [
      { tack: 'sprit', hoist: 0.95, clewX: 1.9, clewH: 2.4 },
      { tack: 'stem', hoist: 0.72, clewX: 0.45, clewH: 1.05 },
    ],
    cabin: { a: 2.7, b: 6.5, h: 0.56, ports: 4 },
  },
  schooner: {
    name: 'Schooner', L: 14.2, fS: 1.1, fB: 1.55, dip: 0.26, rakeB: 2.2, counter: 2.4, tr: 0.45, draft: 0.5, beam: 3.9,
    keel: 'full', ensign: true, bowsprit: 2.8,
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
/** The bow lantern is full size from the sloop up, and smaller on the dinghy so it does not overpower her. */
export const lanternScale = (spec: BoatSpec): number => Math.max(0.6, Math.min(1, spec.L / 6.8));

/** The fittings that are drawn on the boat so far, by their ids in the voyage rules. */
export const DRAWN_FITTINGS: readonly string[] = ['pennant', 'lantern', 'sheer-stripe', 'portlights', 'transom-name', 'dress-flags', 'ratlines', 'stern-lantern', 'tender', 'topsail', 'gilded-stripe'];

/** A boat wearing the fittings that have been earned. Fittings carry to every boat; the measurements are untouched. */
export function fitOut(spec: BoatSpec, earned: readonly string[]): BoatSpec {
  const has = (id: string) => earned.includes(id);
  return {
    ...spec, pennant: has('pennant'), lantern: has('lantern'), portlights: has('portlights'), named: has('transom-name'),
    // gold leaf goes on the cove stripe, so a gilded boat always shows the stripe
    stripe: has('sheer-stripe') || has('gilded-stripe'), gilded: has('gilded-stripe'),
    dressed: has('dress-flags'), ratlines: has('ratlines'), sternLantern: has('stern-lantern'), tender: has('tender'), topsail: has('topsail'),
  };
}

export interface Pt2 { x: number; y: number }
const between = (a: Pt2, b: Pt2, t: number): Pt2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Flags, lanterns and the tender are sized to the boat, within limits, so they suit a dinghy and a schooner alike. */
export const fittingScale = (spec: BoatSpec): number => Math.max(0.7, Math.min(1.45, spec.L / 6.8));

/** The colours of the dress flags, in the order they repeat along the line. */
export const DRESS_COLOURS: readonly string[] = ['#AB3935', '#E9C45B', '#1A619B', '#FCF8EE', '#2E7F62'];

/** The line the dress flags are bent to: from the stem or the end of the bowsprit, over each masthead, to the stern. */
export function dressLine(spec: BoatSpec): Pt2[] {
  const sprit = spec.bowsprit ?? 0;
  const bow: Pt2 = sprit ? { x: spec.L + sprit - 0.12, y: spec.fB + 0.44 } : { x: spec.L - 0.14, y: spec.fB + 0.1 };
  const heads = [...spec.masts].sort((a, b) => b.x - a.x).map((m) => mastPoint(spec, m, m.H));
  return [bow, ...heads, { x: 0.05, y: spec.fS + 0.03 }];
}

export interface DressFlag {
  /** The middle of the edge bent to the line. */
  at: Pt2;
  /** The direction of the line there, as a unit vector. The flag's hoist lies along it. */
  along: Pt2;
  /** Index into `DRESS_COLOURS`. */
  colour: number;
}

/** The dress flags: evenly spaced along each stretch of the line, clear of its ends. `hoist` and `fly` are a flag's two sides, in metres. */
export function dressFlags(spec: BoatSpec): { flags: DressFlag[]; hoist: number; fly: number } {
  const k = fittingScale(spec), hoist = 0.34 * k, fly = 0.5 * k, gap = 0.95 * k, line = dressLine(spec), flags: DressFlag[] = [];
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i]!, b = line[i + 1]!, len = Math.hypot(b.x - a.x, b.y - a.y), n = Math.floor(len / gap), along = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    // the first stretch starts above the tack of the headsail, where a flag would foul the furled sail
    const from = i === 0 ? 0.14 : 0;
    for (let j = 0; j < n; j++) { const t = (j + 0.5) / n; if (t >= from) flags.push({ at: between(a, b, t), along, colour: flags.length % DRESS_COLOURS.length }); }
  }
  return { flags, hoist, fly };
}

/**
 * Which way a dress flag flies from its line, as a unit vector. `along` is the direction of the line and `wind` runs 0 to 1.
 * In a calm it hangs away from the line, on whichever side is down. In a breeze it streams aft.
 * Where that would lay it along a steep line, it is held at least 50 degrees off, so it still reads as a flag.
 */
export function dressFly(along: Pt2, wind: number): Pt2 {
  let hx = -along.y, hy = along.x;
  if (hy > 0) { hx = -hx; hy = -hy; }
  const droop = (1 - wind) * 1.15 + 0.1, blow = Math.min(1, Math.max(0, wind) * 1.4);
  let dx = hx * (1 - blow) - Math.cos(droop) * blow, dy = hy * (1 - blow) - Math.sin(droop) * blow;
  const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
  const run = dx * along.x + dy * along.y, px = dx - run * along.x, py = dy - run * along.y, off = Math.hypot(px, py);
  if (off < 0.766) {
    const ux = off > 1e-6 ? px / off : hx, uy = off > 1e-6 ? py / off : hy, way = run < 0 ? -1 : 1;
    dx = ux * 0.766 + along.x * way * 0.643; dy = uy * 0.766 + along.y * way * 0.643;
    const fixed = Math.hypot(dx, dy); dx /= fixed; dy /= fixed;
  }
  return { x: dx, y: dy };
}

/**
 * Where the tender is lashed: upside down on the longest clear stretch of cabin top. `x` is its stern, `y` the top
 * of the roof it sits on. Null on a boat with no room for one, which is any boat shorter than a cutter.
 */
export function tenderBox(spec: BoatSpec): { x: number; len: number; y: number; h: number; beam: number } | null {
  if (spec.L < 9) return null;
  let best: { a: number; b: number; cabin: CabinSpec } | null = null;
  for (const cabin of [spec.cabin, spec.cabin2]) {
    if (!cabin) continue;
    // the roof, cut wherever a mast comes up through it
    const cuts = spec.masts.map((m) => m.x).filter((x) => x > cabin.a && x < cabin.b).sort((p, q) => p - q);
    const edges = [cabin.a + 0.1, ...cuts.flatMap((x) => [x - 0.3, x + 0.3]), cabin.b - 0.6];
    for (let i = 0; i + 1 < edges.length; i += 2) if (!best || edges[i + 1]! - edges[i]! > best.b - best.a) best = { a: edges[i]!, b: edges[i + 1]!, cabin };
  }
  if (!best) return null;
  // she may overhang the roof a little at each end, as a boat on chocks does
  const len = Math.min(2.6, 0.27 * spec.L, best.b - best.a + 0.3);
  if (len < 1.9) return null;
  const mid = (best.a + best.b) / 2;
  return { x: mid - len / 2, len, y: sheer(spec, mid) + best.cabin.h + 0.06, h: 0.16 * len, beam: 0.42 * len };
}

/** The corners of the topsail set above a gaff sail: along the mast from the throat to the head, and out along the gaff to the peak. Null if no mast carries a gaff. */
export function topsailOf(spec: BoatSpec): { mast: MastSpec; throat: Pt2; peak: Pt2; head: Pt2 } | null {
  const m = spec.masts.find((x) => x.main === 'gaff');
  if (!m) return null;
  const th = mastPoint(spec, m, m.H * (m.gaffAt ?? 0.66)), a = ((m.gaffAng ?? 38) * Math.PI) / 180, gl = m.gaff ?? 3, top = mastPoint(spec, m, m.H - 0.2);
  return { mast: m, throat: { x: th.x - 0.07, y: th.y + 0.16 }, peak: { x: th.x - 0.07 - (gl - 0.1) * Math.cos(a), y: th.y + (gl - 0.1) * Math.sin(a) + 0.08 }, head: { x: top.x - 0.06, y: top.y } };
}

/**
 * Whether a boat has a place for a fitting. Most go on every boat. A few need something the smaller boats lack:
 * portlights a cabin, ratlines shrouds, a tender a long cabin top, a topsail a gaff.
 */
export function carries(spec: BoatSpec, fitting: string): boolean {
  if (fitting === 'portlights') return !!spec.cabin;
  if (fitting === 'tender') return !!tenderBox(spec);
  if (fitting === 'topsail') return !!topsailOf(spec);
  return true;
}

/** Where the stern lantern stands: on the quarter, clear of the tiller and the ensign staff. `z` is a share of the half beam, to starboard. */
export function sternLanternAt(spec: BoatSpec): { x: number; post: number; z: number } {
  return { x: Math.max(0.2, 0.025 * spec.L), post: 0.62 * lanternScale(spec), z: 0.55 };
}

/**
 * Where the boat's name is lettered: on the quarter, just forward of the counter, between the sheer stripe and the boot stripe.
 * `aspect` is the lettering's width over its height. Returns metres: `x` from the stern, `d` as a drop below the sheer.
 * The founders chose the quarter over the transom, which faces away from the usual view.
 */
export function nameBox(spec: BoatSpec, aspect: number): { x0: number; x1: number; d0: number; d1: number } {
  const x0 = spec.counter + 0.03 * spec.L, top = 0.165, longest = 0.3 * spec.L;
  // the topsides between the two stripes, at the lower end of the sheer
  const room = Math.min(sheer(spec, x0), sheer(spec, x0 + longest)) - 0.14 - top - 0.03;
  let height = Math.min(0.24, Math.max(0.05, 0.6 * room));
  if (height * aspect > longest) height = longest / aspect;
  return { x0, x1: x0 + height * aspect, d0: top, d1: top + height };
}

export interface BoatColours { hull: string; sail: string; pennant: string }
export const DEFAULT_COLOURS: BoatColours = { hull: '#0E243A', sail: '#FCF8EE', pennant: '#AB3935' };

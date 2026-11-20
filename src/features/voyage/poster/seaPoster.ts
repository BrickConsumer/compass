import { type BoatColours, type BoatSpec, DEFAULT_COLOURS, tallOf } from '../boat/specs';
import { type Light, mixHex, type SceneState } from '../light';
import { WATERS } from '../waters';
import { drawBoat, type PosterLook } from './drawBoat';

const f1 = (n: number) => Math.round(n * 10) / 10;
const HEX = /^#[0-9a-fA-F]{6}$/;
const safe = (c: string, fallback: string) => (HEX.test(c) ? c : fallback);

/** A small seeded generator, so the still image is the same on every render. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/** Moonlight on sailcloth and paint: a cool blue-grey that the boat's colours sink toward as the light goes. */
const MOONLIT = '#31445f';

/**
 * Paint for the boat under a given light, from the user's chosen colours.
 * Given the light itself, the sails and paint dim with it, and the portlights are lit once the lamps are.
 */
export function posterLook(colours: BoatColours, progress: number, plan = false, light?: Light): PosterLook {
  const hull = safe(colours.hull, DEFAULT_COLOURS.hull), sail = safe(colours.sail, DEFAULT_COLOURS.sail), pennant = safe(colours.pennant, DEFAULT_COLOURS.pennant);
  const p = progress;
  // by day `dim` is 0 and every colour is exactly as it was; by night the boat keeps her shape and loses her brightness
  const dim = light ? (1 - light.lit) * 0.72 : 0, lamps = (light?.lamps ?? 0) > 0.5, by = (c: string) => (dim ? mixHex(c, MOONLIT, dim) : c);
  const sailLit = by(mixHex(mixHex(sail, '#f1f4f2', (1 - p) * 0.5), '#ffe8b8', p * 0.5));
  const sailShade = by(mixHex(mixHex(mixHex(sail, '#0e243a', 0.1), '#d5dbdb', (1 - p) * 0.4), '#e3b982', p * 0.42));
  return {
    hull: [by(mixHex(hull, '#ffffff', 0.16)), by(hull)], sail: [sailShade, sailLit],
    boot: by('#F6F0E4'), cove: '#D8B768', rail: by('#A8733D'), cabin: by('#EFE6D3'), roof: by('#8B5E36'), glass: lamps ? '#F2D488' : '#16344F', brass: '#C9A552',
    spar: by('#B88A55'), sailEdge: 'rgba(14,36,58,.2)', sailShade: mixHex(sail, '#0e243a', 0.12), seam: 'rgba(14,36,58,.12)', batten: 'rgba(14,36,58,.24)',
    rig: 'rgba(14,36,58,.5)', pennant, ensign: '#1A619B', lantern: '#EBCB7C',
    under: plan ? 'rgba(140,45,43,.38)' : undefined,
  };
}

export interface SeaPosterOptions {
  width: number; height: number;
  spec: BoatSpec;
  state: SceneState;
  colours: BoatColours;
  /** Unique within the document. */
  id: string;
  /** Composition, as shares of the frame. Defaults suit a wide window. */
  horizon?: number; drop?: number; boatHeight?: number; boatX?: number; sunX?: number;
}

function ridge(x0: number, x1: number, base: number, hMax: number, R: () => number): string {
  const n = 40, a = R() * 6, b = R() * 6;
  let d = `M${f1(x0)} ${base}`;
  for (let i = 0; i <= n; i++) {
    const t = i / n, env = Math.pow(Math.sin(Math.PI * t), 0.7);
    d += `L${f1(x0 + (x1 - x0) * t)} ${f1(base - hMax * env * (0.55 + 0.25 * Math.sin(t * 7 + a) + 0.2 * Math.sin(t * 17 + b)))}`;
  }
  return d + `L${f1(x1)} ${base}Z`;
}

/** The whole still image as SVG markup (the contents of an <svg> with the given viewBox). */
export function seaPoster(o: SeaPosterOptions): string {
  const { width: W, height: H, spec, state, id } = o;
  const p = state.progress, Lt = state.light, R = seeded(9), place = WATERS[state.water];
  const hz = Math.round(H * (o.horizon ?? 0.34)), dH = H - hz, tall = tallOf(spec);
  const s = (H * (o.boatHeight ?? 0.7)) / tall, k = s / 26, oy = f1(hz + H * (o.drop ?? 0.45)), ox = W * (o.boatX ?? 0.4) - (spec.L / 2) * s;
  const sunX = f1(W * (o.sunX ?? 0.8)), sunY = f1(p < 0.5 ? hz - H * 0.012 : hz - H * (0.012 + 0.1 * (p - 0.5) * 2));
  const under = state.speed > 0;
  const D: string[] = [], G: string[] = [];

  D.push(`<linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${Lt.skyTop}"/><stop offset=".6" stop-color="${Lt.skyMid}"/><stop offset="1" stop-color="${Lt.skyHorizon}"/></linearGradient>`);
  D.push(`<linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${Lt.waterHorizon}"/><stop offset=".38" stop-color="${mixHex(Lt.waterHorizon, Lt.waterDeep, 0.62)}"/><stop offset="1" stop-color="${Lt.waterDeep}"/></linearGradient>`);
  D.push(`<radialGradient id="${id}s"><stop offset="0" stop-color="${Lt.sun}" stop-opacity=".85"/><stop offset=".25" stop-color="${Lt.sun}" stop-opacity=".38"/><stop offset="1" stop-color="${Lt.sun}" stop-opacity="0"/></radialGradient>`);
  D.push(`<linearGradient id="${id}z" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${Lt.haze}" stop-opacity="0"/><stop offset=".62" stop-color="${Lt.haze}" stop-opacity="${Lt.hazeAmount.toFixed(2)}"/><stop offset="1" stop-color="${Lt.haze}" stop-opacity="0"/></linearGradient>`);
  D.push(`<filter id="${id}c" x="-20%" y="-300%" width="140%" height="700%"><feGaussianBlur stdDeviation="${f1(W * 0.007)} ${f1(H * 0.006)}"/></filter>`);

  G.push(`<rect width="${W}" height="${hz + 1}" fill="url(#${id}a)"/>`);
  if (Lt.stars > 0.01) {
    // stars, fixed in their places by a generator of their own, so the day's picture is not changed by them
    const S = seeded(23);
    let stars = '';
    for (let i = 0; i < 90; i++) {
      const x = f1(S() * W), y = f1(S() * hz * 0.86), r = f1((0.45 + S() * 0.75) * Math.max(0.6, H / 276)), a = (0.35 + 0.65 * S()) * Lt.stars * (1 - 0.8 * Lt.hazeAmount * (y / hz));
      stars += `<circle cx="${x}" cy="${y}" r="${r}" fill="#dfe7fa" opacity="${a.toFixed(2)}"/>`;
    }
    G.push(stars);
  }
  if (Lt.sunAmount > 0.02) {
    G.push(`<circle cx="${sunX}" cy="${sunY}" r="${f1(H * 0.52)}" fill="url(#${id}s)" opacity="${Lt.sunAmount.toFixed(2)}"/>`);
    G.push(`<circle cx="${sunX}" cy="${sunY}" r="${f1(H * (p < 0.5 ? 0.05 : 0.036))}" fill="${Lt.sun}" opacity="${Lt.sunAmount.toFixed(2)}"/>`);
  }
  let clouds = '';
  for (let i = 0; i < 6; i++) {
    const cx = W * R(), cy = hz - H * (0.05 + 0.34 * R()), rx = W * (0.07 + 0.13 * R()), ry = H * (0.007 + 0.013 * R());
    clouds += `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${mixHex(Lt.skyHorizon, '#ffffff', 0.45 * Lt.lit)}" opacity="${(0.34 + 0.3 * R()).toFixed(2)}"/>`;
  }
  G.push(`<g filter="url(#${id}c)">${clouds}</g>`);
  // the land on the horizon is the water's own: low sand in the shallows, mountains in the fjords, shelves of ice
  for (const [x0, x1, h, haze] of place.ridges) G.push(`<path d="${ridge(W * x0, W * x1, hz, H * h, R)}" fill="${mixHex(Lt.land, Lt.skyHorizon, haze)}"/>`);
  G.push(`<rect y="${hz}" width="${W}" height="${dH}" fill="url(#${id}w)"/>`);
  G.push(`<rect y="${f1(hz - H * 0.12)}" width="${W}" height="${f1(H * 0.2)}" fill="url(#${id}z)"/>`);

  const nR = Math.round(70 * (0.4 + 0.6 * p) * (W / 900));
  for (let i = 0; i < nR; i++) {
    const d = Math.pow(R(), 1.7), y = hz + 3 + d * (dH - 6), len = (8 + 110 * d) * (0.5 + R()) * (1.25 - 0.5 * p), x = R() * W, light = R() > 0.45;
    G.push(`<path d="M${f1(x)} ${f1(y)}h${f1(len)}" stroke="${light ? mixHex(Lt.waterHorizon, '#ffffff', 0.35) : Lt.waterDeep}" stroke-opacity="${(light ? 0.16 + 0.2 * R() : 0.1 + 0.14 * R()).toFixed(2)}" stroke-width="${f1(0.8 + 1.6 * d)}" stroke-linecap="round"/>`);
  }
  const nG = Math.round(130 * Lt.glitter * (W / 900));
  for (let i = 0; i < nG; i++) {
    const d = Math.pow(R(), 1.25), y = hz + 2 + d * (dH - 4), spread = (5 + 78 * d) * (H / 420), x = sunX + ((R() + R() + R()) / 1.5 - 1) * spread, len = 3 + 20 * d * R();
    G.push(`<path d="M${f1(x - len / 2)} ${f1(y)}h${f1(len)}" stroke="${Lt.sun}" stroke-opacity="${(0.3 + 0.6 * R()).toFixed(2)}" stroke-width="${f1(0.9 + 1.7 * d)}" stroke-linecap="round"/>`);
  }

  if (place.floes) {
    // drift ice, from a generator of its own so that nothing else in the picture moves; none lies on the boat or her reflection
    const F = seeded(41);
    for (let i = 0; i < 9; i++) {
      const d = 0.12 + 0.8 * F(), x = F() * W, y = hz + d * dH, rx = (6 + 26 * d) * (0.6 + F()) * (H / 276), near = Math.abs(x - (ox + (spec.L / 2) * s)) < spec.L * s * 0.9 + rx && y > oy - H * 0.08;
      if (!near) G.push(`<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(rx * 0.16)}" fill="${mixHex(mixHex('#f4f8fa', Lt.skyHorizon, 0.18), Lt.waterDeep, (1 - Lt.lit) * 0.55)}"/><ellipse cx="${f1(x)}" cy="${f1(y + rx * 0.1)}" rx="${f1(rx * 0.96)}" ry="${f1(rx * 0.12)}" fill="${Lt.waterDeep}" opacity=".25"/>`);
    }
  }
  if (state.inPort) {
    const lx = W * 0.84, lh = H * 0.2, lw = lh * 0.16;
    G.push(`<path d="M${f1(lx - lw)} ${hz}L${f1(lx - lw * 0.62)} ${f1(hz - lh)}H${f1(lx + lw * 0.62)}L${f1(lx + lw)} ${hz}Z" fill="${mixHex('#fdfaf3', Lt.skyHorizon, 0.25)}"/>`);
    G.push(`<rect x="${f1(lx - lw * 0.8)}" y="${f1(hz - lh * 0.62)}" width="${f1(lw * 1.6)}" height="${f1(lh * 0.16)}" fill="${mixHex('#ab3935', Lt.skyHorizon, 0.25)}"/>`);
    G.push(`<rect x="${f1(lx - lw * 0.8)}" y="${f1(hz - lh * 1.2)}" width="${f1(lw * 1.6)}" height="${f1(lh * 0.2)}" rx="${f1(lw * 0.2)}" fill="${mixHex('#0e243a', Lt.skyHorizon, 0.3)}"/>`);
    G.push(`<circle cx="${f1(lx)}" cy="${f1(hz - lh * 1.1)}" r="${f1(lw * 0.45)}" fill="#f2d488"/>`);
    G.push(`<path d="M${f1(W * 0.52)} ${hz}Q${f1(W * 0.78)} ${f1(hz - H * 0.012)} ${W} ${f1(hz - H * 0.004)}V${f1(hz + H * 0.03)}H${f1(W * 0.52)}Z" fill="${mixHex(state.water === 'home' ? '#e5cb8d' : place.sand, Lt.skyHorizon, 0.35)}"/>`);
    const py = oy - 0.9 * s, px0 = ox - spec.L * s * 1.2, px1 = ox + spec.L * s * 0.9;
    for (let x = px0 + 6 * k; x < px1; x += 2.2 * s) G.push(`<rect x="${f1(x)}" y="${f1(py)}" width="${f1(0.22 * s)}" height="${f1(oy - py + 0.4 * s)}" fill="#6b4a2f"/>`);
    G.push(`<rect x="${f1(px0)}" y="${f1(py - 0.16 * s)}" width="${f1(px1 - px0)}" height="${f1(0.2 * s)}" rx="${f1(0.05 * s)}" fill="#a8733d"/>`);
  }
  const boat = drawBoat(spec, { s, ox, oy, look: posterLook(o.colours, p, false, Lt), fill: state.sailFill, furled: state.inPort, id: `${id}b` });
  D.push(boat.defs);
  const cx = f1(ox + (spec.L / 2) * s);
  D.push(`<filter id="${id}f" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.006 ${(0.08 + 0.1 * p).toFixed(3)}" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${f1((6 + 16 * p) * k)}" xChannelSelector="R" yChannelSelector="B"/></filter>`);
  D.push(`<linearGradient id="${id}m" gradientUnits="userSpaceOnUse" x1="0" y1="${oy}" x2="0" y2="${f1(oy + tall * s * 0.8)}"><stop offset="0" stop-color="#fff" stop-opacity="${(0.52 - 0.24 * p).toFixed(2)}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="${id}k" maskUnits="userSpaceOnUse" x="0" y="${oy}" width="${W}" height="${f1(H - oy)}"><rect x="0" y="${oy}" width="${W}" height="${f1(H - oy)}" fill="url(#${id}m)"/></mask>`);
  G.push(`<g mask="url(#${id}k)"><use href="#${boat.id}g" transform="matrix(1 0 0 -0.94 0 ${f1(oy * 1.94)})" filter="url(#${id}f)"/></g>`);
  G.push(`<g id="${boat.id}g" transform="rotate(${under ? f1(-1.3 * p) : 0} ${cx} ${oy})">${boat.body}</g>`);
  G.push(`<path d="M${f1(boat.sternX - 2)} ${f1(oy + 0.6)}H${f1(boat.bowX + 2)}" stroke="#ffffff" stroke-opacity=".5" stroke-width="${f1(1.3 * k)}" stroke-linecap="round"/>`);
  if (under) {
    const wl = spec.L * s * (0.45 + 1.0 * p), sx = boat.sternX;
    G.push(`<path d="M${sx} ${oy}Q${f1(sx - wl * 0.5)} ${f1(oy - 1.5 * k)} ${f1(sx - wl)} ${f1(oy - 2.5 * k)}L${f1(sx - wl)} ${f1(oy + 5 * k)}Q${f1(sx - wl * 0.5)} ${f1(oy + 5 * k)} ${sx} ${f1(oy + 2.4 * k)}Z" fill="#ffffff" opacity="${(0.1 + 0.14 * p).toFixed(2)}"/>`);
    G.push(`<path d="M${f1(sx - 3)} ${f1(oy + 1.2 * k)}h${f1(-wl * 0.82)}" stroke="#ffffff" stroke-opacity=".34" stroke-width="${f1(1.1 * k)}" stroke-dasharray="${f1(9 * k)} ${f1(7 * k)} ${f1(3 * k)} ${f1(8 * k)}" stroke-linecap="round"/>`);
    G.push(`<path d="M${f1(boat.bowX - 3 * k)} ${f1(oy + 1)}q${f1(6 * k)} ${f1(-7 * k * p)} ${f1(15 * k)} ${f1(-1)}" fill="none" stroke="#ffffff" stroke-opacity=".8" stroke-width="${f1(1.6 * k)}" stroke-linecap="round"/>`);
  }
  if (state.inPort) {
    const ax = boat.X(spec.L - 0.25), ay = boat.Y(spec.fB);
    G.push(`<path d="M${ax} ${ay}Q${f1(ax + 22 * k)} ${f1(oy - 4 * k)} ${f1(ax + 44 * k)} ${f1(oy + 3 * k)}" fill="none" stroke="rgba(14,36,58,.55)" stroke-width="${f1(0.9 * k)}"/>`);
    G.push(`<ellipse cx="${f1(ax + 45 * k)}" cy="${f1(oy + 3.5 * k)}" rx="${f1(8 * k)}" ry="${f1(1.6 * k)}" fill="none" stroke="#ffffff" stroke-opacity=".6" stroke-width="${f1(0.9 * k)}"/>`);
  }
  if (!state.inPort && state.storm === 0 && p < 0.3) {
    for (let i = 0; i < 2; i++) G.push(`<ellipse cx="${f1(W * (0.3 + 0.5 * i))}" cy="${f1(hz + H * (0.01 + 0.03 * i))}" rx="${f1(W * 0.42)}" ry="${f1(H * 0.035)}" fill="${Lt.haze}" opacity="${(0.34 * (1 - p / 0.3)).toFixed(2)}"/>`);
  }
  if (!state.inPort && state.storm === 0) {
    for (const [bx, by, bs] of [[0.58, 0.16, 1], [0.62, 0.11, 0.75], [0.545, 0.1, 0.6], [0.2, 0.2, 0.7], [0.24, 0.15, 0.5]] as const) {
      const u = 7 * bs * (H / 420);
      G.push(`<path d="M${f1(W * bx)} ${f1(H * by)}q${f1(u * 0.6)} ${f1(-u * 0.7)} ${f1(u)} 0q${f1(u * 0.4)} ${f1(-u * 0.7)} ${f1(u)} 0" fill="none" stroke="rgba(14,36,58,.5)" stroke-width="${f1(1.2 * bs)}" stroke-linecap="round"/>`);
    }
  }
  if (state.storm > 0.15) {
    // rain: slanted streaks, thinning as the storm clears
    const n = Math.round(110 * state.storm * (W / 900));
    for (let i = 0; i < n; i++) {
      const x = R() * (W + H * 0.3), y = R() * H, len = H * (0.05 + 0.07 * R());
      G.push(`<path d="M${f1(x)} ${f1(y)}l${f1(-len * 0.28)} ${f1(len)}" stroke="#e8eef2" stroke-opacity="${(0.12 + 0.2 * R()).toFixed(2)}" stroke-width="${f1(0.8 + 0.6 * R())}" stroke-linecap="round"/>`);
    }
  }
  return `<defs>${D.join('')}</defs>${G.join('')}`;
}

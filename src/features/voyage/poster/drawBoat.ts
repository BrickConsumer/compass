import { type BoatSpec, type CabinSpec, type MastSpec, mastPoint, sheer } from '../boat/specs';

/** Paint for the still image. A two-entry array is a gradient. */
export interface PosterLook {
  hull: string | [string, string];
  sail: string | [string, string];
  boot: string; cove: string; rail: string; cabin: string; roof: string; glass: string; brass: string;
  spar: string; sailEdge: string; sailShade: string; seam: string; batten: string; rig: string;
  pennant: string; ensign: string; lantern: string;
  /** Underwater body, drawn only on plan-style illustrations. */
  under?: string;
}

export interface DrawOptions {
  /** Pixels per metre. */
  s: number;
  /** Screen position of the waterline under the stern. */
  ox: number; oy: number;
  look: PosterLook;
  /** How full the sails are, 0 to 1. */
  fill: number;
  furled?: boolean;
  /** Prefix for element ids, unique within the document. */
  id: string;
}

export interface DrawnBoat {
  id: string;
  defs: string;
  body: string;
  /** Screen x of the waterline at the stern and at the bow. */
  sternX: number; bowX: number;
  X: (x: number) => number; Y: (y: number) => number;
}

interface Pt { x: number; y: number }
const f1 = (n: number) => Math.round(n * 10) / 10;
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const quad = (a: Pt, c: Pt, b: Pt, t: number): Pt => ({
  x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});

/** Draw a boat in profile as SVG markup. Geometry is in metres and comes only from the spec. */
export function drawBoat(spec: BoatSpec, o: DrawOptions): DrawnBoat {
  const { s, look: lk, id } = o;
  const k = s / 26;
  const fill = Math.min(1, Math.max(0, o.fill));
  const X = (x: number) => f1(o.ox + x * s), Y = (y: number) => f1(o.oy - y * s);
  const P = (x: number, y: number) => `${X(x)} ${Y(y)}`, pp = (p: Pt) => P(p.x, p.y);
  const sw = (px: number) => f1(Math.max(0.45, px * k));
  const { L, fS, fB } = spec;
  const sh = (x: number) => sheer(spec, x);
  const mp = (m: MastSpec, h: number) => mastPoint(spec, m, h);
  const defs: string[] = [], g: string[] = [];

  const paint = (v: string | [string, string], key: string, horizontal: boolean) => {
    if (typeof v === 'string') return v;
    defs.push(`<linearGradient id="${id}${key}" x1="0" y1="0" x2="${horizontal ? 1 : 0}" y2="${horizontal ? 0 : 1}"><stop offset="0" stop-color="${v[0]}"/><stop offset="1" stop-color="${v[1]}"/></linearGradient>`);
    return `url(#${id}${key})`;
  };
  const hullPaint = paint(lk.hull, 'h', false), sailPaint = paint(lk.sail, 's', true);
  const thin = (d: string, c: string, w: number) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${sw(w)}" stroke-linecap="round"/>`;
  const sailPath = (d: string) => `<path d="${d}" fill="${sailPaint}" stroke="${lk.sailEdge}" stroke-width="${sw(0.8)}" stroke-linejoin="round"/>`;

  // hull above the waterline
  const wx1 = L - spec.rakeB, wx0 = spec.counter;
  let hull = 'M' + P(0, fS);
  for (let i = 1; i <= 24; i++) { const x = (L * i) / 24; hull += 'L' + P(x, sh(x)); }
  hull += `C${P(L - 0.1 * spec.rakeB, fB * 0.55)} ${P(wx1 + 0.4 * spec.rakeB, fB * 0.08)} ${P(wx1, 0)}L${P(wx0, 0)}Q${P(wx0 * 0.4, fS * 0.1)} ${P(spec.tr, fS * 0.52)}Z`;

  if (lk.under) {
    let kd = `M${P(wx1, 0)}C${P(wx1 - 0.22 * L, -spec.draft * 1.25)} ${P(wx0 + 0.3 * L, -spec.draft * 1.5)} ${P(wx0, 0)}Z`;
    if (spec.keel === 'dagger') kd += `M${P(0.47 * L, -spec.draft * 0.8)}L${P(0.57 * L, -spec.draft * 0.8)}L${P(0.55 * L, -spec.draft - 0.8)}L${P(0.485 * L, -spec.draft - 0.8)}ZM${P(0.04, 0)}L${P(0.32, 0)}L${P(0.36, -0.62)}L${P(0.1, -0.62)}Z`;
    else if (spec.keel === 'fin') kd += `M${P(0.36 * L, -spec.draft * 0.9)}L${P(0.57 * L, -spec.draft * 0.9)}L${P(0.52 * L, -spec.draft - 1.1)}L${P(0.42 * L, -spec.draft - 1.1)}ZM${P(wx0 + 0.05, -0.02)}L${P(wx0 + 0.55, -0.1)}L${P(wx0 + 0.5, -0.95)}L${P(wx0 + 0.2, -0.95)}Z`;
    else kd += `M${P(0.74 * L, -spec.draft * 0.8)}L${P(0.58 * L, -spec.draft - 1.1)}L${P(wx0 + 0.75, -spec.draft - 1.3)}L${P(wx0 + 0.3, -0.02)}Z`;
    g.push(`<path d="${kd}" fill="${lk.under}"/>`);
  }
  g.push(`<path d="${hull}" fill="${hullPaint}"/>`);
  defs.push(`<clipPath id="${id}c"><path d="${hull}"/></clipPath>`);
  g.push(`<rect x="${X(-0.5)}" y="${Y(0.15)}" width="${f1((L + 1) * s)}" height="${f1(0.105 * s)}" fill="${lk.boot}" clip-path="url(#${id}c)"/>`);
  const along = (off: number, a: number, b: number) => {
    let d = '';
    for (let i = 0; i <= 24; i++) { const x = a + ((b - a) * i) / 24; d += (i ? 'L' : 'M') + P(x, sh(x) + off); }
    return d;
  };
  g.push(thin(along(-0.115, 0.04 * L, 0.955 * L), lk.cove, 1.25));

  // deck structures
  const cabin = (c: CabinSpec) => {
    const y0 = sh(c.a), y1 = sh(c.b);
    g.push(`<path d="M${P(c.a, y0)}L${P(c.a + 0.1, y0 + c.h)}L${P(c.b - 0.7, y1 + c.h * 0.94)}Q${P(c.b - 0.12, y1 + c.h * 0.9)} ${P(c.b, y1)}Z" fill="${lk.cabin}"/>`);
    g.push(thin(`M${P(c.a + 0.02, y0 + c.h)}L${P(c.b - 0.64, y1 + c.h * 0.94)}`, lk.roof, 2.2));
    for (let i = 0; i < c.ports; i++) {
      const x = c.a + 0.55 + ((c.b - c.a - 1.6) * i) / Math.max(1, c.ports - 1);
      g.push(`<circle cx="${X(x)}" cy="${Y(sh(x) + c.h * 0.5)}" r="${f1(0.085 * s)}" fill="${lk.glass}" stroke="${lk.brass}" stroke-width="${sw(1.1)}"/>`);
    }
  };
  if (spec.cabin) cabin(spec.cabin);
  if (spec.cabin2) cabin(spec.cabin2);
  if (spec.tiller) g.push(thin(`M${P(0.24, fS + 0.03)}L${P(1.15, sh(1.15) + 0.36)}`, lk.spar, 2));
  g.push(thin(along(0.015, 0, L), lk.rail, 2.3));
  const sprit = spec.bowsprit ?? 0;
  if (sprit) {
    g.push(thin(`M${P(L - 1.0, fB + 0.03)}L${P(L + sprit, fB + 0.46)}`, lk.spar, 3));
    g.push(thin(`M${P(L + sprit - 0.12, fB + 0.42)}L${P(wx1 + 0.42 * spec.rakeB, 0.22)}`, lk.rig, 0.9));
  }

  // headsails
  for (const h of spec.head) {
    const m = spec.masts[h.mast ?? 0]!;
    const Tk: Pt = h.tack === 'sprit' ? { x: L + sprit - 0.12, y: fB + 0.44 } : { x: L - 0.14, y: fB + 0.1 };
    const St = mp(m, m.H * h.hoist), Hd = lerp(Tk, St, 0.955), cx = m.x + h.clewX, Cl: Pt = { x: cx, y: sh(Math.min(cx, L)) + h.clewH };
    g.push(thin(`M${pp(Tk)}L${pp(St)}`, lk.rig, 0.9));
    if (o.furled) {
      g.push(`<path d="M${pp(lerp(Tk, Hd, 0.04))}L${pp(Hd)}" stroke="${lk.sailShade}" stroke-width="${f1(0.14 * s)}" stroke-linecap="round" fill="none"/>`);
      continue;
    }
    const mL = lerp(Hd, Cl, 0.5), cL = { x: mL.x + 0.12, y: mL.y }, mF = lerp(Cl, Tk, 0.5), cF = { x: mF.x, y: mF.y - 0.1 - 0.2 * fill };
    g.push(sailPath(`M${pp(Tk)}L${pp(Hd)}Q${pp(cL)} ${pp(Cl)}Q${pp(cF)} ${pp(Tk)}Z`));
    for (const t of [0.28, 0.52, 0.76]) g.push(thin(`M${pp(lerp(Tk, Hd, t))}L${pp(lerp(Cl, Hd, t))}`, lk.seam, 0.7));
  }

  // sails set on the masts, forward mast first
  const spars: string[] = [];
  for (const m of spec.masts.slice().reverse()) {
    const T = mp(m, m.boomH); T.x -= 0.07;
    const Be: Pt = { x: T.x - m.boom, y: T.y + 0.05 * m.boom }, Cl: Pt = { x: Be.x + 0.1, y: Be.y + 0.07 };
    spars.push(`M${pp(mp(m, m.boomH))}L${pp({ x: Be.x - 0.18, y: Be.y - 0.01 })}`);
    if (o.furled) {
      g.push(`<path d="M${pp({ x: T.x - 0.12, y: T.y + 0.12 })}L${pp({ x: Be.x + 0.3, y: Be.y + 0.12 })}" stroke="${lk.sailShade}" stroke-width="${f1(0.26 * s)}" stroke-linecap="round" fill="none"/>`);
      continue;
    }
    const mf = lerp(Cl, T, 0.5), cF = { x: mf.x, y: mf.y - 0.05 - 0.1 * fill };
    if (m.main === 'gaff') {
      const Th = mp(m, m.H * (m.gaffAt ?? 0.66)); Th.x -= 0.07;
      const a = ((m.gaffAng ?? 38) * Math.PI) / 180, gl = m.gaff ?? 3;
      const Pk: Pt = { x: Th.x - gl * Math.cos(a), y: Th.y + gl * Math.sin(a) };
      const mid = lerp(Pk, Cl, 0.5), cL = { x: mid.x - 0.25 - 0.3 * fill, y: mid.y + 0.1 };
      g.push(sailPath(`M${pp(T)}L${pp(Th)}L${pp(Pk)}Q${pp(cL)} ${pp(Cl)}Q${pp(cF)} ${pp(T)}Z`));
      for (const t of [0.2, 0.4, 0.6, 0.8]) g.push(thin(`M${pp(lerp(Th, Pk, t))}L${pp(lerp(T, Cl, t))}`, lk.seam, 0.7));
      spars.push(`M${pp({ x: Th.x + 0.14, y: Th.y - 0.1 })}L${pp({ x: Pk.x - 0.25 * Math.cos(a), y: Pk.y + 0.25 * Math.sin(a) })}`);
    } else {
      const Hd = mp(m, m.H - 0.22); Hd.x -= 0.06;
      const dx = Cl.x - Hd.x, dy = Cl.y - Hd.y, len = Math.hypot(dx, dy), n = { x: dy / len, y: -dx / len };
      const ro = m.boom * (0.03 + (m.roach ?? 0.2) * 0.5 * (0.3 + 0.7 * fill));
      const mid = lerp(Hd, Cl, 0.5), cL = { x: mid.x + n.x * ro * 2, y: mid.y + n.y * ro * 2 };
      g.push(sailPath(`M${pp(T)}L${pp(Hd)}Q${pp(cL)} ${pp(Cl)}Q${pp(cF)} ${pp(T)}Z`));
      const ns = Math.max(3, Math.round(m.H / 1.6));
      for (let i = 1; i <= ns; i++) { const t = i / (ns + 1); g.push(thin(`M${pp(lerp(T, Hd, t))}L${pp(quad(Cl, cL, Hd, t))}`, lk.seam, 0.7)); }
      for (const t of [0.3, 0.52, 0.72, 0.88].slice(0, m.battens ?? 4)) {
        const b = quad(Cl, cL, Hd, t), a = lerp(T, Hd, t), d = Math.hypot(a.x - b.x, a.y - b.y), l = Math.min(d * 0.42, 1.25);
        g.push(thin(`M${pp(b)}L${pp({ x: b.x + ((a.x - b.x) / d) * l, y: b.y + ((a.y - b.y) / d) * l })}`, lk.batten, 1.2));
      }
    }
  }
  for (const d of spars) g.push(thin(d, lk.spar, 3));
  for (const m of spec.masts) {
    const b = { x: m.x, y: sh(m.x) }, t = mp(m, m.H), w0 = 0.05 + 0.003 * m.H, w1 = w0 * 0.55;
    g.push(`<path d="M${P(b.x - w0, b.y)}L${P(b.x + w0, b.y)}L${P(t.x + w1, t.y)}L${P(t.x - w1, t.y)}Z" fill="${lk.spar}"/>`);
  }
  if (spec.stays !== false) {
    for (const m of spec.masts) {
      const lo = mp(m, m.H * 0.6), hi = mp(m, m.H * 0.95);
      g.push(thin(`M${pp(lo)}L${P(m.x - 0.5, sh(m.x - 0.5))}M${pp(lo)}L${P(m.x + 0.32, sh(m.x + 0.32))}M${pp(hi)}L${P(m.x - 0.62, sh(m.x - 0.62))}`, lk.rig, 0.8));
    }
  }
  const m0 = spec.masts[0]!, m1 = spec.masts[1];
  if (m1) g.push(thin(`M${pp(mp(m0, m0.H))}L${pp(mp(m1, m1.H))}`, lk.rig, 0.8));

  // flags and lantern
  const tm = spec.masts.reduce((a, b) => (sh(a.x) + a.H > sh(b.x) + b.H ? a : b));
  if (spec.pennant) {
    const top = mp(tm, tm.H), st = { x: top.x, y: top.y + 0.05 * tm.H }, fl = 0.12 * tm.H, fh = 0.33 * fl, th = ((6 + (1 - fill) * 66) * Math.PI) / 180;
    const B = { x: st.x, y: st.y - fh }, tip = { x: st.x - Math.cos(th) * fl, y: st.y - fh / 2 - Math.sin(th) * fl };
    g.push(thin(`M${pp(top)}L${pp(st)}`, lk.spar, 1.2));
    g.push(`<path d="M${pp(st)}Q${pp({ x: (st.x + tip.x) / 2, y: (st.y + tip.y) / 2 + 0.08 })} ${pp(tip)}Q${pp({ x: (B.x + tip.x) / 2, y: (B.y + tip.y) / 2 + 0.05 })} ${pp(B)}Z" fill="${lk.pennant}"/>`);
  }
  if (spec.ensign) {
    const a1 = { x: -0.42, y: fS + 1.05 }, ph = ((10 + (1 - fill) * 55) * Math.PI) / 180, B = { x: a1.x - 0.7 * Math.cos(ph), y: a1.y - 0.7 * Math.sin(ph) };
    g.push(thin(`M${P(0.03, fS)}L${pp(a1)}`, lk.spar, 1.3));
    g.push(`<path d="M${pp(a1)}L${pp(B)}L${pp({ x: B.x, y: B.y - 0.42 })}L${pp({ x: a1.x, y: a1.y - 0.42 })}Z" fill="${lk.ensign}"/>`);
  }
  if (spec.lantern) {
    const lx = L - (sprit ? 0.95 : 0.45), ly = sh(lx) + 0.5;
    g.push(thin(`M${P(lx, sh(lx))}L${P(lx, ly)}`, lk.brass, 1));
    g.push(`<circle cx="${X(lx)}" cy="${Y(ly + 0.1)}" r="${f1(0.11 * s)}" fill="${lk.lantern}"/>`);
  }
  return { id, defs: defs.join(''), body: g.join(''), sternX: X(wx0), bowX: X(wx1), X, Y };
}

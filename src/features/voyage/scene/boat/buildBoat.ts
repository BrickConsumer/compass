import {
  BoxGeometry, BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, ExtrudeGeometry, Group, type Material, Mesh,
  MeshStandardMaterial, type Plane, Shape, SphereGeometry, TubeGeometry, Vector3,
} from 'three';
import { type BoatColours, type BoatSpec, type CabinSpec, DRESS_COLOURS, dressFlags, dressFly, dressLine, lanternScale, type MastSpec, mastPoint, sheer, sternLanternAt, tenderBox, topsailOf } from '../../boat/specs';
import { deckGeometry, halfBeam, hullGeometry } from './hull';
import { createLettering } from './lettering';
import { bakeStatic } from '../batch';
import { hullMaterial, paintMaterial, PAINT, reflectionMaterial, sailMaterial, solid } from './materials';

interface P2 { x: number; y: number }
const lerp2 = (a: P2, b: P2, t: number): P2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** A sail as two edges: the luff (on a spar or stay) and the leech, each running foot to head. */
interface SailDef {
  luff: (t: number) => P2;
  leech: (t: number, fill: number) => P2;
  /** How far the clew swings to leeward, as a share of the chord, when the sail is full. */
  sheet: number;
}

const SAIL_S = 14, SAIL_T = 22;

const SAIL_VERTS = (SAIL_S + 1) * (SAIL_T + 1);

/** One geometry holding every sail on the boat, each its own grid, so the whole suit is one draw call. */
function sailGeometry(count: number): BufferGeometry {
  const cols = SAIL_S + 1, rows = SAIL_T + 1;
  const g = new BufferGeometry();
  const uv = new Float32Array(count * SAIL_VERTS * 2), idx: number[] = [];
  for (let n = 0; n < count; n++) {
    const o = n * SAIL_VERTS;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { uv[(o + j * cols + i) * 2] = i / SAIL_S; uv[(o + j * cols + i) * 2 + 1] = j / SAIL_T; }
    for (let j = 0; j < SAIL_T; j++) for (let i = 0; i < SAIL_S; i++) { const a = o + j * cols + i, b = a + 1, c = a + cols, d = c + 1; idx.push(a, b, c, b, d, c); }
  }
  g.setAttribute('position', new BufferAttribute(new Float32Array(count * SAIL_VERTS * 3), 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Shape sail number `n` for a given fill: camber bellies it to leeward (-z) and the sheet lets the leech swing out. Recompute the normals afterwards. */
function shapeSail(g: BufferGeometry, n: number, def: SailDef, fill: number): void {
  const pos = g.getAttribute('position') as BufferAttribute, cols = SAIL_S + 1, o = n * SAIL_VERTS;
  for (let j = 0; j <= SAIL_T; j++) {
    const t = j / SAIL_T, a = def.luff(t), b = def.leech(t, fill), chord = Math.hypot(b.x - a.x, b.y - a.y);
    for (let i = 0; i <= SAIL_S; i++) {
      const s = i / SAIL_S, p = lerp2(a, b, s);
      const camber = Math.pow(Math.sin(Math.PI * Math.pow(s, 0.8)), 0.9) * chord * (0.035 + 0.1 * fill) * (1 - 0.35 * t);
      const swing = s * chord * def.sheet * (0.35 + 0.65 * fill);
      // a slack sail hangs with a slight sag instead of a clean curve
      const sag = (1 - fill) * 0.02 * chord * Math.sin(Math.PI * s) * Math.sin(Math.PI * t);
      pos.setXYZ(o + j * cols + i, p.x, p.y - sag, -(camber + swing));
    }
  }
  pos.needsUpdate = true;
}

/**
 * A small open boat, upside down: the tender as she is carried on the cabin top. `len` long, `beam` wide and `h` high,
 * with her stern at the origin and her keel uppermost. Open underneath, where she sits on the roof.
 */
function tenderGeometry(len: number, beam: number, h: number): BufferGeometry {
  const N = 14, M = 8, pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    // a transom at the stern, fullest a third of the way forward, then fining to the stem
    // (rounding can put the last station a hair past the stem, where the cosine turns negative: hence the floor at nought)
    const half = (beam / 2) * (u < 0.35 ? 0.72 + 0.28 * Math.sin((u / 0.35) * (Math.PI / 2)) : Math.pow(Math.max(0, Math.cos(((u - 0.35) / 0.65) * (Math.PI / 2))), 0.75));
    const high = h * (0.84 + 0.16 * Math.sin(Math.PI * u)) * (u > 0.82 ? Math.sqrt(Math.max(0, Math.cos(((u - 0.82) / 0.18) * (Math.PI / 2)))) : 1);
    for (let j = 0; j <= M; j++) { const a = (Math.PI * j) / M; pos.push(u * len, high * Math.pow(Math.sin(a), 0.8), half * Math.cos(a)); }
  }
  const at = (i: number, j: number) => i * (M + 1) + j;
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) idx.push(at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1));
  // the transom
  for (let j = 1; j < M; j++) idx.push(at(0, 0), at(0, j), at(0, j + 1));
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export interface BuiltBoat {
  group: Group;
  /** Call each frame (or once, when still). */
  update: (time: number, fill: number, wind: number) => void;
  /** Letter the boat's name on the quarter, if she has earned it. `changed` is called when it is ready to be drawn. */
  setName: (name: string, changed?: () => void) => void;
  dispose: () => void;
}

/**
 * Build a boat from its measurements. Metres; +x bow, +y up, +z starboard, origin amidships on the waterline.
 * `mirror` builds the same boat in flat reflection paint, for the image in the water.
 */
export function buildBoat(spec: BoatSpec, colours: BoatColours, opts: { mirror?: boolean; furled?: boolean; clip?: Plane } = {}): BuiltBoat {
  const root = new Group(), g = new Group();
  g.position.x = -spec.L / 2;
  root.add(g);
  const mats = new Map<string, Material>(), geos: BufferGeometry[] = [];
  const mirror = !!opts.mirror, furled = !!opts.furled;
  /** Meshes and groups that are animated. Everything else is baked into a few meshes at the end. */
  const moving = new Set<Group | Mesh>();
  // the reflection is a flat tint, so only the boat herself is lettered
  const lettering = spec.named && !mirror ? createLettering(spec, colours.hull) : null;
  const paint = (key: string, make: () => Material, flat: string): Material => {
    const k = (mirror ? 'm:' : 's:') + key;
    let m = mats.get(k);
    if (!m) { m = mirror ? reflectionMaterial(flat) : make(); if (!mirror && opts.clip) m.clippingPlanes = [opts.clip]; mats.set(k, m); }
    return m;
  };
  const M = {
    hull: () => paint('hull', () => hullMaterial(colours.hull, !!spec.stripe, lettering?.uniforms, !!spec.gilded), colours.hull),
    deck: () => paint('deck', () => solid(PAINT.deck, 0.8), PAINT.deck),
    well: () => paint('well', () => solid(PAINT.well, 0.85), PAINT.well),
    wood: () => paint('wood', () => solid(PAINT.rail, 0.55), PAINT.rail),
    spar: () => paint('spar', () => solid(PAINT.spar, 0.5), PAINT.spar),
    cabin: () => paint('cabin', () => solid(PAINT.cabin, 0.7), PAINT.cabin),
    roof: () => paint('roof', () => solid(PAINT.roof, 0.55), PAINT.roof),
    brass: () => paint('brass', () => solid(PAINT.brass, 0.35, 0.9), PAINT.brass),
    glass: () => paint('glass', () => solid(PAINT.glass, 0.2, 0.3), PAINT.glass),
    rig: () => paint('rig', () => solid(PAINT.rig, 0.6), PAINT.rig),
    sail: () => paint('sail', () => sailMaterial(colours.sail), colours.sail),
    // every flag is one mesh, each strip in its own colour, so its reflection takes its colours from the same place
    flags: () => { const k = mirror ? 'm:flags' : 's:flags'; let m = mats.get(k); if (!m) { m = mirror ? reflectionMaterial(null) : new MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: DoubleSide }); if (!mirror && opts.clip) m.clippingPlanes = [opts.clip]; mats.set(k, m); } return m; },
    lantern: () => paint('lantern', () => solid(PAINT.lantern, 0.4, 0, 0.9), PAINT.lantern),
  };
  const add = (geo: BufferGeometry, mat: Material, parent: Group = g): Mesh => { geos.push(geo); const m = new Mesh(geo, mat); m.castShadow = m.receiveShadow = !mirror; parent.add(m); return m; };
  const up = new Vector3(0, 1, 0);
  /** A tapered rod between two points. */
  const rod = (a: Vector3, b: Vector3, r0: number, r1: number, mat: Material, parent: Group = g, sides = 8): Mesh => {
    const d = new Vector3().subVectors(b, a), len = d.length();
    const m = add(new CylinderGeometry(r1, r0, len, sides, 1), mat, parent);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(up, d.normalize());
    return m;
  };
  // one material for everything baked in plain paint, and one for its reflection, however many times parts are baked
  const shared = (key: string, make: () => Material): Material => { let m = mats.get(key); if (!m) { m = make(); if (!mirror && opts.clip) m.clippingPlanes = [opts.clip]; mats.set(key, m); } return m; };
  const baking = {
    paint: () => shared('baked:paint', paintMaterial), reflection: () => shared('baked:reflection', () => reflectionMaterial(null)),
    // the boat is always seen from its starboard side, a little toward the bow and from above; its image in the water is upside down, so what is higher on the boat is further away
    farToNear: (centre: Vector3) => 0.955 * centre.z + 0.296 * centre.x - 0.06 * centre.y,
  };
  const sh = (x: number) => sheer(spec, x);
  const mp = (m: MastSpec, h: number) => mastPoint(spec, m, h);
  const v3 = (p: P2, z = 0) => new Vector3(p.x, p.y, z);
  const { L, fS, fB } = spec;

  // hull, deck, rail
  add(hullGeometry(spec), M.hull());
  const open = !spec.cabin;
  if (open) {
    // an open boat: a floor low in the hull and two thwarts to sit on
    add(deckGeometry(spec, 0.26, 0.9), M.deck());
    for (const u of [0.36, 0.63]) {
      const x = spec.L * u, w = 2 * halfBeam(spec, x) * 0.96;
      const seat = add(new BoxGeometry(0.34, 0.05, w), M.wood()); seat.position.set(x, sh(x) - 0.12, 0);
    }
  } else {
    add(deckGeometry(spec), M.deck());
    // cockpit: a well aft of the cabin with a varnished coaming and side benches
    const c0 = Math.max(0.55, spec.counter * 0.7), c1 = spec.cabin!.a - 0.12, len = c1 - c0;
    if (len > 0.7) {
      const cx = (c0 + c1) / 2, y = sh(cx), w = 2 * Math.min(halfBeam(spec, c0), halfBeam(spec, c1)) * 0.6;
      const sole = add(new BoxGeometry(len, 0.03, w), M.well()); sole.position.set(cx, y + 0.035, 0);
      for (const side of [-1, 1]) {
        const coaming = add(new BoxGeometry(len + 0.1, 0.16, 0.05), M.wood()); coaming.position.set(cx, y + 0.1, side * (w / 2 + 0.02));
        const bench = add(new BoxGeometry(len - 0.1, 0.07, w * 0.26), M.deck()); bench.position.set(cx, y + 0.08, side * w * 0.36);
      }
      const aft = add(new BoxGeometry(0.05, 0.16, w + 0.09), M.wood()); aft.position.set(c0 - 0.03, y + 0.1, 0);
    }
  }
  for (const side of [-1, 1]) {
    const pts: Vector3[] = [];
    for (let i = 0; i <= 28; i++) { const x = 0.02 + ((L - 0.04) * i) / 28; pts.push(new Vector3(x, sh(x) + 0.012, side * halfBeam(spec, x))); }
    add(new TubeGeometry(new CatmullRomCurve3(pts), 56, 0.032, 5, false), M.wood());
  }

  // cabins
  const cabin = (c: CabinSpec) => {
    const y0 = sh(c.a), y1 = sh(c.b), w = 2 * Math.min(halfBeam(spec, c.a), halfBeam(spec, c.b), halfBeam(spec, (c.a + c.b) / 2)) * 0.62;
    const shape = new Shape();
    shape.moveTo(c.a, y0 - 0.05); shape.lineTo(c.a + 0.1, y0 + c.h); shape.lineTo(c.b - 0.7, y1 + c.h * 0.94);
    shape.quadraticCurveTo(c.b - 0.12, y1 + c.h * 0.9, c.b, y1 - 0.05); shape.closePath();
    const body = add(new ExtrudeGeometry(shape, { depth: w, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 8 }), M.cabin());
    body.position.z = -w / 2;
    const len = c.b - 0.62 - (c.a + 0.02), slope = Math.atan2(y1 + c.h * 0.94 - (y0 + c.h), len);
    const roof = add(new BoxGeometry(len + 0.1, 0.06, w + 0.2), M.roof());
    roof.position.set(c.a + 0.02 + len / 2, (y0 + c.h + y1 + c.h * 0.94) / 2 + 0.03, 0);
    roof.rotation.z = slope;
    for (let i = 0; spec.portlights && i < c.ports; i++) {
      const x = c.a + 0.55 + ((c.b - c.a - 1.6) * i) / Math.max(1, c.ports - 1), y = sh(x) + c.h * 0.5;
      const ring = add(new CylinderGeometry(0.105, 0.105, w + 0.1, 14), M.brass()); ring.rotation.x = Math.PI / 2; ring.position.set(x, y, 0);
      const pane = add(new CylinderGeometry(0.075, 0.075, w + 0.13, 14), M.glass()); pane.rotation.x = Math.PI / 2; pane.position.set(x, y, 0);
    }
  };
  if (spec.cabin) cabin(spec.cabin);
  if (spec.cabin2) cabin(spec.cabin2);
  // the tender: a small varnished boat lashed upside down on the cabin top, where there is room for one
  const tb = spec.tender ? tenderBox(spec) : null;
  if (tb) {
    const hull = add(tenderGeometry(tb.len, tb.beam, tb.h), M.wood()); hull.position.set(tb.x, tb.y, 0);
    // her keel, along the top
    rod(new Vector3(tb.x + 0.03, tb.y + tb.h * 0.86, 0), new Vector3(tb.x + tb.len * 0.8, tb.y + tb.h * 0.99, 0), 0.022, 0.018, M.roof(), g, 5);
    // two lashings over her
    for (const u of [0.3, 0.68]) {
      const x = tb.x + tb.len * u, w = tb.beam * 0.52, top = tb.y + tb.h * 1.02;
      rod(new Vector3(x, tb.y - 0.02, -w), new Vector3(x, top, -w * 0.45), 0.009, 0.009, M.rig(), g, 4);
      rod(new Vector3(x, top, -w * 0.45), new Vector3(x, top, w * 0.45), 0.009, 0.009, M.rig(), g, 4);
      rod(new Vector3(x, top, w * 0.45), new Vector3(x, tb.y - 0.02, w), 0.009, 0.009, M.rig(), g, 4);
    }
  }
  if (spec.tiller) rod(new Vector3(0.24, fS + 0.05, 0), new Vector3(1.15, sh(1.15) + 0.36, 0), 0.03, 0.022, M.wood());
  const sprit = spec.bowsprit ?? 0;
  if (sprit) {
    rod(new Vector3(L - 1.0, fB + 0.05, 0), new Vector3(L + sprit, fB + 0.46, 0), 0.07, 0.045, M.spar());
    rod(new Vector3(L + sprit - 0.12, fB + 0.42, 0), new Vector3(L - spec.rakeB * 0.58, 0.22, 0), 0.012, 0.012, M.rig(), g, 5);
  }

  // spars, sails and rigging
  const sails: SailDef[] = [];
  const booms: { pivot: Group; sheet: number }[] = [];
  /** Booms that swing. Each is baked into one mesh of its own, so what it carries costs nothing more to draw. */
  const swinging: Group[] = [];
  const setSail = (def: SailDef) => { sails.push(def); };

  for (const h of spec.head) {
    const m = spec.masts[h.mast ?? 0]!;
    const Tk: P2 = h.tack === 'sprit' ? { x: L + sprit - 0.12, y: fB + 0.44 } : { x: L - 0.14, y: fB + 0.1 };
    const St = mp(m, m.H * h.hoist), Hd = lerp2(Tk, St, 0.955), cx = m.x + h.clewX, Cl: P2 = { x: cx, y: sh(Math.min(cx, L)) + h.clewH };
    rod(v3(Tk), v3(St), 0.012, 0.012, M.rig(), g, 5);
    if (furled) rod(v3(lerp2(Tk, Hd, 0.04)), v3(Hd), 0.07, 0.05, M.sail());
    else setSail({ luff: (t) => lerp2(Tk, Hd, t), leech: (t) => { const p = lerp2(Cl, Hd, t); return { x: p.x + 0.12 * Math.sin(Math.PI * t), y: p.y }; }, sheet: 0.16 });
  }

  for (const m of spec.masts) {
    const foot = new Vector3(m.x, sh(m.x) - 0.05, 0), top = v3(mp(m, m.H)), r = 0.05 + 0.003 * m.H;
    rod(foot, top, r, r * 0.55, M.spar(), g, 10);
    const goose = mp(m, m.boomH), T: P2 = { x: goose.x - 0.07, y: goose.y };
    const Be: P2 = { x: T.x - m.boom, y: T.y + 0.05 * m.boom }, Cl: P2 = { x: Be.x + 0.1, y: Be.y + 0.07 };
    // the boom pivots at the mast so it can follow the sail to leeward
    const pivot = new Group(); pivot.position.set(goose.x, goose.y, 0); g.add(pivot);
    // a furled boom is lashed amidships and never swings, so it can be baked with the rest
    if (!furled) { moving.add(pivot); swinging.push(pivot); }
    rod(new Vector3(0, 0, 0), new Vector3(Be.x - 0.18 - goose.x, Be.y - 0.01 - goose.y, 0), 0.05, 0.04, M.spar(), pivot);
    if (spec.ratlines) {
      // lazy jacks: two light lines each side from the mast to the boom, to gather the sail as it comes down. They go with the boom.
      const head = m.main === 'gaff' ? m.H * (m.gaffAt ?? 0.66) : m.H - 0.22, apex = mp(m, m.boomH + 0.52 * (head - m.boomH));
      const bx = Be.x - 0.18 - goose.x, by = Be.y - 0.01 - goose.y;
      for (const side of [-1, 1]) for (const u of [0.42, 0.8]) rod(new Vector3(apex.x - goose.x, apex.y - goose.y, side * 0.03), new Vector3(bx * u, by * u + 0.04, side * 0.08), 0.007, 0.007, M.rig(), pivot, 4);
    }
    const sheet = 0.14;
    booms.push({ pivot, sheet });
    if (furled) {
      const roll = rod(new Vector3(-0.2, 0.12, 0), new Vector3(Be.x + 0.3 - goose.x, Be.y + 0.12 - goose.y, 0), 0.13, 0.1, M.sail(), pivot, 10);
      roll.scale.z = 0.8;
    } else if (m.main === 'gaff') {
      const Th0 = mp(m, m.H * (m.gaffAt ?? 0.66)), Th: P2 = { x: Th0.x - 0.07, y: Th0.y };
      const a = ((m.gaffAng ?? 38) * Math.PI) / 180, gl = m.gaff ?? 3, Pk: P2 = { x: Th.x - gl * Math.cos(a), y: Th.y + gl * Math.sin(a) };
      setSail({ luff: (t) => lerp2(T, Th, t), leech: (t, fill) => { const p = lerp2(Cl, Pk, t); return { x: p.x - (0.25 + 0.3 * fill) * Math.sin(Math.PI * t), y: p.y }; }, sheet });
      rod(v3({ x: Th.x + 0.14, y: Th.y - 0.1 }), v3({ x: Pk.x - 0.25 * Math.cos(a), y: Pk.y + 0.25 * Math.sin(a) }, -gl * sheet * 0.6), 0.045, 0.035, M.spar());
    } else {
      const Hd0 = mp(m, m.H - 0.22), Hd: P2 = { x: Hd0.x - 0.06, y: Hd0.y };
      const dx = Cl.x - Hd.x, dy = Cl.y - Hd.y, len = Math.hypot(dx, dy), n = { x: dy / len, y: -dx / len }, mid = lerp2(Hd, Cl, 0.5);
      setSail({
        luff: (t) => lerp2(T, Hd, t),
        leech: (t, fill) => {
          const ro = m.boom * (0.03 + (m.roach ?? 0.2) * 0.5 * (0.3 + 0.7 * fill)), c = { x: mid.x + n.x * ro * 2, y: mid.y + n.y * ro * 2 };
          return { x: (1 - t) * (1 - t) * Cl.x + 2 * (1 - t) * t * c.x + t * t * Hd.x, y: (1 - t) * (1 - t) * Cl.y + 2 * (1 - t) * t * c.y + t * t * Hd.y };
        },
        sheet,
      });
    }
    if (spec.stays !== false) {
      const lo = v3(mp(m, m.H * 0.6)), hi = v3(mp(m, m.H * 0.95));
      for (const side of [-1, 1]) {
        const chain = new Vector3(m.x - 0.35, sh(m.x - 0.35), side * halfBeam(spec, m.x - 0.35) * 0.96);
        rod(chain, lo, 0.011, 0.011, M.rig(), g, 5);
        rod(chain, hi, 0.011, 0.011, M.rig(), g, 5);
        // ratlines: rungs between the two shrouds, a step apart, to climb the rigging by
        for (let y = chain.y + 0.55; spec.ratlines && y < lo.y - 0.35; y += 0.38) {
          rod(chain.clone().lerp(lo, (y - chain.y) / (lo.y - chain.y)), chain.clone().lerp(hi, (y - chain.y) / (hi.y - chain.y)), 0.007, 0.007, M.rig(), g, 4);
        }
      }
    }
  }
  const m0 = spec.masts[0]!, m1 = spec.masts[1];
  if (m1) rod(v3(mp(m0, m0.H)), v3(mp(m1, m1.H)), 0.011, 0.011, M.rig(), g, 5);
  // a topsail fills the gap above a gaff sail: along the mast, and out along the gaff. It is stowed with the rest in port.
  const top = spec.topsail && !furled ? topsailOf(spec) : null;
  if (top) setSail({ luff: (t) => lerp2(top.throat, top.head, t), leech: (t) => lerp2(top.peak, top.head, t), sheet: 0.12 });
  const sailGeo = sails.length ? sailGeometry(sails.length) : null;
  if (sailGeo) moving.add(add(sailGeo, M.sail()));

  // flags: the pennant, the ensign and the dress flags are strips of one mesh, each in its own colour
  interface Flag {
    at: Vector3; len: number; hoist: number; taper: boolean; colour: string;
    /** The direction the hoist runs in: down a staff, or along the dress line. */
    along: Vector3;
    /** A dress flag flies from a line and not a staff: see `dressFly`. */
    dress?: boolean;
    /** Points along the fly. */
    n: number; phase: number;
  }
  const flags: Flag[] = [];
  const flag = (at: Vector3, len: number, hoist: number, taper: boolean, colour: string, over: Partial<Flag> = {}) => { flags.push({ at, len, hoist, taper, colour, along: new Vector3(0, -1, 0), n: 10, phase: flags.length * 1.7, ...over }); };
  const tm = spec.masts.reduce((a, b) => (sh(a.x) + a.H > sh(b.x) + b.H ? a : b));
  if (spec.pennant) {
    const top = v3(mp(tm, tm.H)), staff = top.clone().add(new Vector3(0, 0.05 * tm.H, 0));
    rod(top, staff, 0.012, 0.01, M.spar(), g, 5);
    flag(staff, 0.12 * tm.H, 0.04 * tm.H, true, colours.pennant);
  }
  if (spec.ensign) {
    const a0 = new Vector3(0.03, fS, 0), a1 = new Vector3(-0.42, fS + 1.05, 0);
    rod(a0, a1, 0.014, 0.012, M.spar(), g, 5);
    flag(a1, 0.7, 0.42, false, PAINT.ensign);
  }
  if (spec.dressed && furled) {
    // dressed overall, which a boat is only in port: a light line from the bow over the mastheads to the stern, with a small flag every pace along it
    const line = dressLine(spec), dress = dressFlags(spec);
    for (let i = 0; i + 1 < line.length; i++) rod(v3(line[i]!, 0.02), v3(line[i + 1]!, 0.02), 0.008, 0.008, M.rig(), g, 4);
    for (const f of dress.flags) {
      // a little to windward of the stays and the sails, so they do not cut through it
      flag(v3(f.at, 0.045), dress.fly, dress.hoist, false, DRESS_COLOURS[f.colour]!, { along: new Vector3(f.along.x, f.along.y, 0), dress: true, n: 3 });
    }
  }
  let flagGeo: BufferGeometry | null = null;
  if (flags.length) {
    const count = flags.reduce((sum, f) => sum + (f.n + 1) * 2, 0), tint = new Float32Array(count * 3), idx: number[] = [];
    let o = 0;
    for (const f of flags) {
      const c = new Color(f.colour);
      for (let v = 0; v < (f.n + 1) * 2; v++) tint.set([c.r, c.g, c.b], (o + v) * 3);
      for (let i = 0; i < f.n; i++) { const a = o + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      o += (f.n + 1) * 2;
    }
    flagGeo = new BufferGeometry();
    flagGeo.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    flagGeo.setAttribute('color', new BufferAttribute(tint, 3));
    flagGeo.setIndex(idx);
    const mesh = add(flagGeo, M.flags());
    // flags are too small for their shadows to read as anything but grey patches on the sails
    mesh.castShadow = false;
    moving.add(mesh);
  }
  if (spec.lantern) {
    const k = lanternScale(spec), lx = L - (sprit ? 0.95 : 0.45 * k), ly = sh(lx) + 0.5 * k;
    rod(new Vector3(lx, sh(lx), 0), new Vector3(lx, ly, 0), 0.012, 0.012, M.brass(), g, 5);
    const lamp = add(new SphereGeometry(0.11 * k, 12, 10), M.lantern()); lamp.position.set(lx, ly + 0.1 * k, 0);
  }
  if (spec.sternLantern) {
    // on the starboard quarter, clear of the tiller and the ensign staff
    const at = sternLanternAt(spec), k = lanternScale(spec), z = halfBeam(spec, at.x) * at.z, y = sh(at.x);
    rod(new Vector3(at.x, y, z), new Vector3(at.x, y + at.post, z), 0.012, 0.012, M.brass(), g, 5);
    const lamp = add(new SphereGeometry(0.1 * k, 12, 10), M.lantern()); lamp.position.set(at.x, y + at.post + 0.09 * k, z);
  }

  let lastFill = -1;
  const update = (time: number, fill: number, wind: number) => {
    if (Math.abs(fill - lastFill) > 0.002) {
      if (sailGeo) { sails.forEach((def, n) => shapeSail(sailGeo, n, def, fill)); sailGeo.computeVertexNormals(); }
      for (const b of booms) b.pivot.rotation.y = furled ? 0 : -Math.asin(Math.min(0.5, b.sheet * (0.35 + 0.65 * fill)));
      lastFill = fill;
    }
    // flags stream aft when there is wind and hang when there is none
    if (flagGeo) {
      const pos = flagGeo.getAttribute('position') as BufferAttribute, droop = (1 - wind) * 1.15 + 0.1, wx = -Math.cos(droop), wy = -Math.sin(droop);
      let o = 0;
      for (const f of flags) {
        // a flag on a staff streams with the wind; a dress flag swings from hanging off its line toward streaming
        let dx = wx, dy = wy;
        if (f.dress) { const d = dressFly(f.along, wind); dx = d.x; dy = d.y; }
        for (let i = 0; i <= f.n; i++) {
          const s = i / f.n, r = s * f.len, wave = Math.sin(s * 7 - time * (3 + 5 * wind) + f.phase) * 0.05 * f.len * s * (0.3 + wind);
          const x = f.at.x + dx * r, y = f.at.y + dy * r, z = f.at.z + wave, half = (f.hoist / 2) * (f.taper ? 1 - s : 1), a = f.hoist / 2 - half, b = f.hoist / 2 + half;
          pos.setXYZ(o + i * 2, x + f.along.x * a, y + f.along.y * a, z);
          pos.setXYZ(o + i * 2 + 1, x + f.along.x * b, y + f.along.y * b, z);
        }
        o += (f.n + 1) * 2;
      }
      pos.needsUpdate = true;
      flagGeo.computeVertexNormals();
    }
    if (mirror) for (const m of mats.values()) { const u = (m as unknown as { uniforms?: Record<string, { value: number }> }).uniforms; if (u?.uTime) { u.uTime.value = time; u.uRipple!.value = 0.25 + 0.9 * wind; } }
  };
  // a boom that swings carries its lazy jacks with it: bake the two into one mesh, as the boom alone was
  for (const pivot of swinging) if (pivot.children.length > 1) for (const baked of bakeStatic(pivot, new Set(), baking)) geos.push(baked.geometry);
  // everything that never moves becomes a few meshes: the hull, one for all plain paint, and (furled) the sailcloth
  for (const baked of bakeStatic(g, moving, baking)) geos.push(baked.geometry);
  update(0, 0.6, 0.5);

  return {
    group: root, update,
    setName: (name, changed) => { if (lettering) lettering.set(name, changed); },
    dispose: () => { for (const x of geos) x.dispose(); for (const m of mats.values()) m.dispose(); lettering?.dispose(); },
  };
}

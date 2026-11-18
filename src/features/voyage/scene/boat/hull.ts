import { BufferAttribute, BufferGeometry } from 'three';
import { type BoatSpec, sheer } from '../../boat/specs';

/** Stations along the hull and points around each half-section. */
export const HULL_STATIONS = 40;
export const HULL_RIBS = 10;

const smooth = (t: number) => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); };

/** Height of the hull's centreline profile (keel, stem and counter) at distance x from the stern. */
export function keelLine(spec: BoatSpec, x: number): number {
  const wx0 = spec.counter, wx1 = spec.L - spec.rakeB;
  if (x <= spec.tr) return spec.fS + (0.52 * spec.fS - spec.fS) * (x / spec.tr);       // raked transom
  if (x < wx0) return 0.52 * spec.fS * Math.pow((wx0 - x) / (wx0 - spec.tr), 1.6);      // counter
  if (x <= wx1) return -spec.draft * 1.1 * Math.pow(Math.sin((Math.PI * (x - wx0)) / (wx1 - wx0)), 0.7); // canoe body
  return spec.fB * Math.pow((x - wx1) / (spec.L - wx1), 2.2);                           // stem
}

/** Half-breadth at the deck edge at distance x from the stern. */
export function halfBeam(spec: BoatSpec, x: number): number {
  const u = Math.min(1, Math.max(0, x / spec.L)), widest = 0.44, transom = spec.keel === 'dagger' ? 0.78 : 0.6;
  const shape = u <= widest
    ? transom + (1 - transom) * smooth(u / widest)
    : Math.pow(Math.max(0, 1 - Math.pow((u - widest) / (1 - widest), 1.9)), 0.8);
  return (spec.beam / 2) * shape;
}

/**
 * The hull as a surface lofted through cross-sections.
 * +x is the bow, +y is up, y = 0 is the waterline, +z is starboard.
 * Attribute `aHull` carries (height above the waterline, drop below the sheer) for the paint bands.
 */
export function hullGeometry(spec: BoatSpec): BufferGeometry {
  const nx = HULL_STATIONS, nr = HULL_RIBS, cols = 2 * nr + 1;
  const pos = new Float32Array((nx + 1) * cols * 3), band = new Float32Array((nx + 1) * cols * 2);
  for (let i = 0; i <= nx; i++) {
    const x = (spec.L * i) / nx, u = x / spec.L;
    const top = sheer(spec, x), bottom = Math.min(top, keelLine(spec, x)), b = halfBeam(spec, x);
    const vee = 0.72 + 0.7 * smooth((u - 0.55) / 0.45);       // sections sharpen toward the bow
    for (let j = 0; j < cols; j++) {
      const side = j < nr ? -1 : 1, v = Math.abs(j - nr) / nr; // 0 on the centreline, 1 at the deck edge
      const a = (v * Math.PI) / 2;
      const z = side * b * Math.pow(Math.sin(a), vee);
      const y = bottom + (top - bottom) * Math.pow(1 - Math.cos(a), 1.05);
      const o = (i * cols + j) * 3, q = (i * cols + j) * 2;
      pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
      band[q] = y; band[q + 1] = top - y;
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aHull', new BufferAttribute(band, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * The deck: a cambered surface closing the hull at the sheer.
 * For an open boat, `drop` lowers it to make the floor and `inset` keeps it inside the planking.
 */
export function deckGeometry(spec: BoatSpec, drop = 0.02, inset = 1): BufferGeometry {
  const nx = HULL_STATIONS, nz = 6, cols = nz + 1, camber = drop > 0.05 ? 0 : 0.035;
  const pos = new Float32Array((nx + 1) * cols * 3);
  for (let i = 0; i <= nx; i++) {
    const x = (spec.L * i) / nx, b = halfBeam(spec, x) * inset;
    const top = Math.max(sheer(spec, x) - drop, keelLine(spec, x) + 0.03);
    for (let j = 0; j < cols; j++) {
      const w = (j / nz) * 2 - 1, o = (i * cols + j) * 3;
      pos[o] = x; pos[o + 1] = top + camber * spec.beam * (1 - w * w) * (b / (spec.beam / 2)); pos[o + 2] = w * b;
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

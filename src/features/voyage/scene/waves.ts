/**
 * One wave function, in TypeScript and in GLSL, so the boat rides exactly the surface that is drawn.
 * Each wave: direction (x, z), wavenumber, speed, and its share of the amplitude. Shares sum to 1.
 */
export const WAVES: readonly { dx: number; dz: number; k: number; speed: number; share: number }[] = [
  { dx: 0.958, dz: 0.287, k: 0.55, speed: 0.9, share: 0.5 },
  { dx: 0.6, dz: -0.8, k: 0.9, speed: 1.2, share: 0.3 },
  { dx: -0.287, dz: 0.958, k: 1.7, speed: 1.6, share: 0.2 },
];

/** Height of the water surface in metres at (x, z) and time t, for a given amplitude. */
export function waveHeight(x: number, z: number, t: number, amplitude: number): number {
  let h = 0;
  for (const w of WAVES) h += w.share * Math.sin(w.k * (w.dx * x + w.dz * z) + w.speed * t);
  return amplitude * h;
}

const n = (v: number) => v.toFixed(4);

/** GLSL: `float waveHeight(vec2 p, float t, float a)` and `vec2 waveSlope(vec2 p, float t, float a)`. */
export const WAVES_GLSL = `
float waveHeight(vec2 p, float t, float a) {
  float h = 0.0;
${WAVES.map((w) => `  h += ${n(w.share)} * sin(${n(w.k)} * (${n(w.dx)} * p.x + ${n(w.dz)} * p.y) + ${n(w.speed)} * t);`).join('\n')}
  return a * h;
}
vec2 waveSlope(vec2 p, float t, float a) {
  vec2 s = vec2(0.0);
${WAVES.map((w) => `  s += ${n(w.share * w.k)} * cos(${n(w.k)} * (${n(w.dx)} * p.x + ${n(w.dz)} * p.y) + ${n(w.speed)} * t) * vec2(${n(w.dx)}, ${n(w.dz)});`).join('\n')}
  return a * s;
}
`;

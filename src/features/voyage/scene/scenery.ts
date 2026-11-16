import {
  BoxGeometry, BufferAttribute, BufferGeometry, CapsuleGeometry, ConeGeometry, CylinderGeometry, DoubleSide, Group, type Material, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, Shape, ShapeGeometry, SphereGeometry, Vector3,
} from 'three';

/** A small seeded generator so scenery is the same on every visit. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/* ---------- distant land: flat silhouettes that sit on the horizon ---------- */

export type Terrain = 'hills' | 'peaks' | 'mesa' | 'stacks';

/** A skyline in a unit box: x from -0.5 to 0.5, y from 0 to about 1. */
export function skyline(kind: Terrain, seed: number): ShapeGeometry {
  const R = seeded(seed), a = R() * 6, b = R() * 6, c = R() * 6, n = 96, shape = new Shape();
  shape.moveTo(-0.5, 0);
  for (let i = 0; i <= n; i++) {
    const t = i / n, env = Math.pow(Math.sin(Math.PI * t), 0.6);
    let y: number;
    if (kind === 'peaks') {
      // sharp ridges: folded sines give creases instead of soft bumps
      y = env * (0.3 + 0.45 * Math.abs(Math.sin(t * 5.5 + a)) + 0.25 * Math.abs(Math.sin(t * 13 + b)) + 0.06 * Math.sin(t * 41 + c));
    } else if (kind === 'mesa') {
      const step = Math.round((0.5 + 0.5 * Math.sin(t * 4 + a)) * 3) / 3;
      y = env * (0.35 + 0.5 * step + 0.05 * Math.sin(t * 29 + b));
    } else if (kind === 'stacks') {
      // sea stacks: separate rocks with gaps of open water between them
      const cell = Math.sin(t * 16 + a);
      y = cell > 0.25 ? Math.pow((cell - 0.25) / 0.75, 0.35) * (0.5 + 0.5 * Math.abs(Math.sin(Math.floor((t * 16 + a) / (2 * Math.PI)) * 2.7 + b))) : 0;
    } else {
      y = env * (0.5 + 0.28 * Math.sin(t * 6 + a) + 0.16 * Math.sin(t * 14 + b) + 0.05 * Math.sin(t * 37 + c));
    }
    shape.lineTo(t - 0.5, Math.max(0, y));
  }
  shape.lineTo(0.5, 0);
  return new ShapeGeometry(shape);
}

/** A tree line in a unit box: a row of rounded crowns. */
export function treeLine(seed: number): ShapeGeometry {
  const R = seeded(seed), shape = new Shape(), n = 26;
  shape.moveTo(-0.5, 0);
  for (let i = 0; i < n; i++) {
    const x0 = i / n - 0.5, x1 = (i + 1) / n - 0.5, h = 0.45 + 0.55 * R();
    shape.quadraticCurveTo((x0 + x1) / 2, h * 1.7, x1, 0.12 * R());
  }
  shape.lineTo(0.5, 0);
  return new ShapeGeometry(shape);
}

/** A lighthouse silhouette in a unit box: x from -0.5 to 0.5, y from 0 to 1. Returns tower, band, lantern room and lamp. */
export function lighthouseParts(): { tower: ShapeGeometry; band: ShapeGeometry; top: ShapeGeometry; lamp: ShapeGeometry } {
  const poly = (pts: [number, number][]) => { const s = new Shape(); s.moveTo(pts[0]![0], pts[0]![1]); for (const [x, y] of pts.slice(1)) s.lineTo(x, y); s.closePath(); return new ShapeGeometry(s); };
  return {
    tower: poly([[-0.34, 0], [0.34, 0], [0.21, 0.76], [-0.21, 0.76]]),
    band: poly([[-0.29, 0.3], [0.29, 0.3], [0.26, 0.46], [-0.26, 0.46]]),
    top: poly([[-0.3, 0.76], [0.3, 0.76], [0.3, 0.8], [0.2, 0.8], [0.2, 0.93], [0.26, 0.93], [0, 1.0], [-0.26, 0.93], [-0.2, 0.93], [-0.2, 0.8], [-0.3, 0.8]]),
    lamp: poly([[-0.14, 0.81], [0.14, 0.81], [0.14, 0.92], [-0.14, 0.92]]),
  };
}

export const flat = (color = '#888888') => new MeshBasicMaterial({ color, side: DoubleSide });

/* ---------- gulls ---------- */

export interface Gull { group: Group; update: (time: number) => void; phase: number; speed: number; base: Vector3; span: number }

/** A gull: two wings that beat, gliding on a slow looping path. */
export function buildGull(material: Material, seed: number): Gull {
  const R = seeded(seed), group = new Group(), wings: Mesh[] = [];
  for (const side of [-1, 1]) {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 0.12, 0, side * 0.5, -0.22, 0, side * 0.48, 0.02, 0, side * 1.0, -0.2, 0, side * 0.95, 0.12, 0, side * 0.5]), 3));
    g.setIndex([0, 1, 2, 1, 3, 4, 1, 4, 2]);
    const m = new Mesh(g, material); wings.push(m); group.add(m);
  }
  const phase = R() * 6.28, speed = 0.8 + R() * 0.6;
  const gull: Gull = {
    group, phase, speed, base: new Vector3(), span: 1,
    update: (time) => {
      // a few beats, then a glide
      const cycle = (time * speed + phase) % 6.5, beat = cycle < 3 ? Math.sin(cycle * 7.5) * 0.55 : 0.12 * Math.sin(cycle * 1.3);
      wings[0]!.rotation.x = -beat; wings[1]!.rotation.x = beat;
    },
  };
  return gull;
}

/* ---------- the port ---------- */

const std = (color: string, roughness = 0.8) => new MeshStandardMaterial({ color, roughness });

export interface Person { group: Group; update: (time: number) => void }

/** A small figure, 1.7 m tall, carrying a crate or a sack. No face: a calm, simple model. */
export function buildPerson(shirt: string, skin: string, trousers: string, load: 'crate' | 'sack' | 'barrel' | null): Person {
  const group = new Group(), shadows = (m: Mesh) => { m.castShadow = true; m.receiveShadow = true; return m; };
  const legs: Mesh[] = [];
  for (const side of [-1, 1]) {
    const leg = shadows(new Mesh(new CapsuleGeometry(0.075, 0.6, 3, 8), std(trousers)));
    leg.geometry.translate(0, -0.37, 0); leg.position.set(0, 0.82, side * 0.1); legs.push(leg); group.add(leg);
  }
  const torso = shadows(new Mesh(new CapsuleGeometry(0.17, 0.36, 4, 10), std(shirt))); torso.position.y = 1.14; group.add(torso);
  const head = shadows(new Mesh(new SphereGeometry(0.125, 14, 12), std(skin, 0.7))); head.position.y = 1.57; group.add(head);
  const arms: Mesh[] = [];
  for (const side of [-1, 1]) {
    const arm = shadows(new Mesh(new CapsuleGeometry(0.055, 0.42, 3, 8), std(shirt)));
    arm.geometry.translate(0, -0.25, 0); arm.position.set(0.02, 1.36, side * 0.22); arm.rotation.z = load ? 1.15 : 0.08; arms.push(arm); group.add(arm);
  }
  if (load) {
    const geo = load === 'crate' ? new BoxGeometry(0.42, 0.32, 0.42) : load === 'barrel' ? new CylinderGeometry(0.2, 0.2, 0.42, 12) : new SphereGeometry(0.24, 10, 8);
    const cargo = shadows(new Mesh(geo, std(load === 'sack' ? '#D9C7A0' : load === 'barrel' ? '#8B5E36' : '#B88A55')));
    if (load === 'sack') cargo.scale.set(1, 0.75, 1.2);
    cargo.position.set(0.36, 1.18, 0); group.add(cargo);
  }
  return {
    group,
    update: (time) => {
      const swing = Math.sin(time * 6) * 0.42;
      legs[0]!.rotation.z = swing; legs[1]!.rotation.z = -swing;
      if (!load) { arms[0]!.rotation.z = -swing * 0.7; arms[1]!.rotation.z = swing * 0.7; }
      torso.position.y = 1.14 + Math.abs(Math.sin(time * 6)) * 0.018;
    },
  };
}

export interface Port { group: Group; update: (time: number, still: boolean) => void; dispose: () => void }

/**
 * A harbour for a day with nothing planned: a timber pier beside the boat, supplies stacked on it,
 * people carrying them aboard, a beach behind, and a lighthouse on the point.
 * Built around a boat of length L and beam B lying at the origin, bow toward +x, with the camera on +z.
 */
export function buildPort(L: number, B: number, deckHeight: number): Port {
  const group = new Group(), geos: BufferGeometry[] = [], mats: Material[] = [];
  const mesh = (g: BufferGeometry, m: Material, parent: Group = group) => { geos.push(g); mats.push(m); const x = new Mesh(g, m); x.castShadow = true; x.receiveShadow = true; parent.add(x); return x; };
  const timber = std('#8B6A46', 0.85), plank = std('#B08A5E', 0.85), pile = std('#5E4630', 0.9), rope = std('#D9C7A0', 0.9);

  // the pier runs alongside, just beyond the boat, at deck height
  const pz = -(B / 2 + 1.25), top = Math.max(0.75, deckHeight + 0.05), x0 = -L * 1.25, x1 = L * 0.95, len = x1 - x0, width = 2.2;
  mesh(new BoxGeometry(len, 0.14, width), plank).position.set((x0 + x1) / 2, top - 0.07, pz);
  for (let x = x0 + 0.4; x < x1; x += 0.55) { const gap = mesh(new BoxGeometry(0.03, 0.012, width), pile); gap.position.set(x, top + 0.003, pz); gap.castShadow = false; }
  mesh(new BoxGeometry(len, 0.16, 0.12), timber).position.set((x0 + x1) / 2, top - 0.2, pz + width / 2 - 0.06);
  for (let x = x0 + 0.5; x <= x1; x += 2.6) for (const side of [-1, 1]) mesh(new CylinderGeometry(0.13, 0.15, top + 2.4, 10), pile).position.set(x, (top - 2.4) / 2 + 0.25, pz + side * (width / 2 - 0.12));
  // bollards and mooring lines to bow and stern
  for (const bx of [-L * 0.42, L * 0.4]) {
    mesh(new CylinderGeometry(0.09, 0.11, 0.3, 10), pile).position.set(bx, top + 0.15, pz + width / 2 - 0.3);
    const a = new Vector3(bx, top + 0.22, pz + width / 2 - 0.3), b = new Vector3(bx * 0.95, deckHeight + 0.05, -B * 0.32), d = new Vector3().subVectors(b, a);
    const line = mesh(new CylinderGeometry(0.018, 0.018, d.length(), 5), rope);
    line.position.copy(a).addScaledVector(d, 0.5); line.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), d.clone().normalize());
  }
  // a gangplank from pier to deck
  const g0 = new Vector3(-L * 0.08, top, pz + width / 2), g1 = new Vector3(-L * 0.08, deckHeight + 0.06, -B * 0.3), gd = new Vector3().subVectors(g1, g0);
  const gang = mesh(new BoxGeometry(0.6, 0.05, gd.length()), plank);
  gang.position.copy(g0).addScaledVector(gd, 0.5); gang.lookAt(g1.clone().add(gd));
  // supplies stacked on the pier: crates, barrels, sacks, a basket of bread
  const crate = std('#B88A55'), barrel = std('#8B5E36'), sack = std('#D9C7A0'), band = std('#3A4A5C', 0.6);
  const stack = x0 + len * 0.3;
  for (const [dx, dy, dz, s] of [[0, 0, 0, 0.6], [0.66, 0, 0.1, 0.55], [0.3, 0.6, 0.05, 0.5], [-0.7, 0, -0.2, 0.5]] as const) mesh(new BoxGeometry(s, s, s), crate).position.set(stack + dx, top + s / 2 + dy, pz - 0.35 + dz);
  for (const dx of [1.5, 2.15]) { mesh(new CylinderGeometry(0.28, 0.28, 0.7, 14), barrel).position.set(stack + dx, top + 0.35, pz - 0.4); for (const h of [0.15, 0.55]) mesh(new CylinderGeometry(0.29, 0.29, 0.04, 14), band).position.set(stack + dx, top + h, pz - 0.4); }
  for (const [dx, dy] of [[-1.5, 0], [-1.9, 0], [-1.7, 0.3]] as const) { const m = mesh(new SphereGeometry(0.3, 10, 8), sack); m.scale.set(1.2, 0.6, 0.9); m.position.set(stack + dx, top + 0.18 + dy, pz - 0.3); }
  mesh(new CylinderGeometry(0.26, 0.2, 0.22, 12), std('#C9A552')).position.set(stack + 3.0, top + 0.11, pz - 0.2);
  for (const [dx, dz] of [[2.92, -0.24], [3.06, -0.14], [3.0, -0.3]] as const) { const loaf = mesh(new SphereGeometry(0.1, 8, 6), std('#C98A4B')); loaf.scale.set(1.4, 0.7, 0.8); loaf.position.set(stack + dx, top + 0.26, pz + dz); }
  // a lamp post at the head of the pier
  mesh(new CylinderGeometry(0.04, 0.05, 2.2, 8), pile).position.set(x1 - 0.5, top + 1.1, pz - width / 2 + 0.25);
  const lamp = new Mesh(new SphereGeometry(0.13, 10, 8), new MeshStandardMaterial({ color: '#F2D488', emissive: '#F2D488', emissiveIntensity: 0.8 })); lamp.position.set(x1 - 0.5, top + 2.25, pz - width / 2 + 0.25); group.add(lamp);

  // the shore behind: a beach, green ground, a few palms, a boathouse
  const sand = std('#E8D3A0', 0.95), grass = std('#7E9A62', 0.95), shoreZ = pz - 9;
  const beach = mesh(new CylinderGeometry(L * 5.5, L * 5.8, 0.5, 48, 1), sand); beach.scale.set(1, 1, 0.3); beach.position.set(L * 1.2, -0.12, shoreZ - L * 1.6); beach.castShadow = false;
  const land = mesh(new SphereGeometry(L * 4.4, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), grass); land.scale.set(1, 0.16, 0.34); land.position.set(L * 1.6, 0.05, shoreZ - L * 2.2); land.castShadow = false;
  const hill = mesh(new SphereGeometry(L * 2.2, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), std('#6C8B5A', 0.95)); hill.scale.set(1, 0.5, 0.5); hill.position.set(L * 3.2, 0.2, shoreZ - L * 3.4); hill.castShadow = false;
  // the pier meets the beach
  mesh(new BoxGeometry(2.0, 0.14, 9.5), plank).position.set(x0 + 1.2, top - 0.07, pz - width / 2 - 4.6);
  const trunk = std('#7A5A3C', 0.9), leaf = std('#5F8A52', 0.9);
  for (const [tx, tz, h] of [[L * 0.2, -3, 4.2], [L * 0.75, -5, 5.0], [L * 1.5, -4, 3.8], [-L * 0.5, -6, 4.6]] as const) {
    const t = mesh(new CylinderGeometry(0.1, 0.16, h, 8), trunk); t.position.set(tx, h / 2 + 0.1, shoreZ + tz); t.rotation.z = 0.08 * Math.sin(tx);
    for (let i = 0; i < 8; i++) { const f = mesh(new ConeGeometry(0.42, 2.6, 6), leaf); f.position.set(tx, h + 0.1, shoreZ + tz); f.rotation.order = 'YXZ'; f.rotation.set(1.95, (i / 8) * Math.PI * 2, 0); f.translateY(-1.2); f.scale.set(1, 1, 0.28); }
  }
  const house = new Group(); house.position.set(-L * 1.05, 0.25, shoreZ - 4); group.add(house);
  mesh(new BoxGeometry(4.4, 2.6, 3.4), std('#F1E9D8', 0.9), house).position.y = 1.3;
  const roof = mesh(new ConeGeometry(3.3, 1.5, 4), std('#AB3935', 0.85), house); roof.position.y = 3.35; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.82);
  mesh(new BoxGeometry(0.9, 1.7, 0.08), std('#1A619B', 0.8), house).position.set(-0.8, 0.85, 1.72);
  // the lighthouse on a rocky point at the far end
  const light = new Group(); light.position.set(L * 3.3, 0, shoreZ - L * 2.6); group.add(light);
  const rock = mesh(new SphereGeometry(4.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), std('#8F9499', 0.95), light); rock.scale.set(1.5, 0.42, 1.1);
  const th = Math.max(9, L * 1.25);
  mesh(new CylinderGeometry(0.8, 1.3, th, 20), std('#FBF7EE', 0.8), light).position.y = 1.5 + th / 2;
  mesh(new CylinderGeometry(1.02, 1.12, th * 0.18, 20), std('#AB3935', 0.8), light).position.y = 1.5 + th * 0.45;
  mesh(new CylinderGeometry(1.15, 1.15, 0.2, 20), std('#3A4A5C', 0.7), light).position.y = 1.5 + th + 0.1;
  const beacon = new Mesh(new CylinderGeometry(0.6, 0.6, 1.1, 14), new MeshStandardMaterial({ color: '#F6E3A6', emissive: '#F2D488', emissiveIntensity: 0.9 })); beacon.position.y = 1.5 + th + 0.85; light.add(beacon);
  mesh(new ConeGeometry(0.95, 1.0, 16), std('#AB3935', 0.8), light).position.y = 1.5 + th + 1.9;

  // people: two carry supplies along the pier and aboard, one stows them on deck, one keeps the tally
  const palette: [string, string, string][] = [['#1A619B', '#C89B7B', '#3A4A5C'], ['#AB3935', '#8D5B3F', '#405973'], ['#256F75', '#E3BFA0', '#5C4215'], ['#BF9A48', '#A8774F', '#2A4663']];
  const walkers = [buildPerson(...palette[0]!, 'crate'), buildPerson(...palette[1]!, 'sack')];
  const onDeck = buildPerson(...palette[2]!, 'barrel'), tally = buildPerson(...palette[3]!, null);
  for (const p of [...walkers, onDeck, tally]) group.add(p.group);
  onDeck.group.position.set(-L * 0.22, deckHeight + 0.12, 0.05); onDeck.group.rotation.y = 0.4;
  tally.group.position.set(stack - 2.6, top, pz + 0.55); tally.group.rotation.y = -Math.PI / 2 + 0.3;
  const from = new Vector3(stack + 0.9, top, pz + 0.45), to = new Vector3(-L * 0.08 + 0.1, top, pz + width / 2 - 0.35);

  const update = (time: number, still: boolean) => {
    walkers.forEach((w, i) => {
      // out with a load, back for the next: a slow loop, each walker half a lap apart
      const lap = still ? 0.3 + i * 0.35 : (time * 0.11 + i * 0.5) % 1, out = lap < 0.5, t = out ? lap * 2 : 2 - lap * 2;
      const e = t * t * (3 - 2 * t);
      w.group.position.lerpVectors(from, to, e);
      w.group.rotation.y = (out ? 0 : Math.PI) + (to.z > from.z ? -0.12 : 0.12) * (out ? 1 : -1);
      w.update(still ? 0.4 + i : time * (0.9 + i * 0.12));
    });
    onDeck.update(still ? 0 : time * 0.35);
    lamp.scale.setScalar(1);
  };
  update(0, true);
  return { group, update, dispose: () => { for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); } };
}

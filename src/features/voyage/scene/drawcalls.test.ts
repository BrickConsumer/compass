import { type BufferAttribute, Group, type Mesh, MeshBasicMaterial, type Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_COLOURS, DRAWN_FITTINGS, fitOut, sheer, STAGE_ORDER, STAGES as BARE } from '../boat/specs';
import { buildBoat } from './boat/buildBoat';
import { paintMaterial } from './boat/materials';
import { buildFlock, buildPerson, buildPort } from './scenery';

/** Every boat with all its fittings on, which is the most there is to draw. */
const STAGES = Object.fromEntries(STAGE_ORDER.map((id) => [id, fitOut(BARE[id], DRAWN_FITTINGS)])) as typeof BARE;

/** Every mesh is one draw call, so counting meshes counts the cost of drawing a thing once. */
const meshes = (root: Object3D): number => { let n = 0; root.traverse((o) => { if ((o as Mesh).isMesh) n += 1; }); return n; };

describe('draw calls', () => {
  for (const id of STAGE_ORDER) {
    it(`${id}: under sail it is a handful of meshes, not one for every part`, () => {
      const boat = buildBoat(STAGES[id], DEFAULT_COLOURS), mirror = buildBoat(STAGES[id], DEFAULT_COLOURS, { mirror: true });
      // hull, all plain paint, the suit of sails, one boom for each mast, a pennant, perhaps an ensign
      expect(meshes(boat.group)).toBeLessThanOrEqual(8);
      // the reflection has no separate hull: it is all one paint
      expect(meshes(mirror.group)).toBeLessThanOrEqual(7);
      expect(meshes(mirror.group)).toBeLessThan(meshes(boat.group));
    });

    it(`${id}: furled in port, the booms are baked in too`, () => {
      const boat = buildBoat(STAGES[id], DEFAULT_COLOURS, { furled: true });
      expect(meshes(boat.group)).toBeLessThanOrEqual(5);
    });
  }

  it('the whole scene fits the budget of 40, even the schooner in port with shadows', () => {
    const spec = STAGES.schooner;
    const boat = meshes(buildBoat(spec, DEFAULT_COLOURS, { furled: true }).group), mirror = meshes(buildBoat(spec, DEFAULT_COLOURS, { furled: true, mirror: true }).group);
    const port = buildPort(spec.L, spec.beam, sheer(spec, spec.L * 0.45));
    let casters = 0;
    port.group.traverse((o) => { if ((o as Mesh).isMesh && o.castShadow) casters += 1; });
    // sky, sea, six islands, one lighthouse, the flock; then everything that casts a shadow is drawn a second time
    const fixed = 2 + 6 + 1 + 1;
    expect(fixed + boat + mirror + meshes(port.group) + boat + casters).toBeLessThanOrEqual(40);
  });

  it('the port is two meshes and four figures', () => {
    const port = buildPort(6.8, 2.2, 0.8);
    expect(meshes(port.group)).toBe(6);
  });

  it('a figure is one mesh, and still walks', () => {
    const person = buildPerson(paintMaterial(), '#1A619B', '#C89B7B', '#3A4A5C', null);
    expect(meshes(person.group)).toBe(1);
    const pos = (person.group.children[0] as Mesh).geometry.getAttribute('position') as BufferAttribute;
    // the first points are a leg, which swings about the hip
    const before = pos.getX(0);
    person.update(0.26);
    expect(Math.abs(pos.getX(0) - before)).toBeGreaterThan(0.01);
  });

  it('the flock is one mesh, its wings beat, and a hidden gull folds away to nothing', () => {
    const flock = buildFlock(new MeshBasicMaterial(), [5, 8, 11]), pos = flock.mesh.geometry.getAttribute('position') as BufferAttribute;
    const root = new Group(); root.add(flock.mesh);
    expect(meshes(root)).toBe(1);
    const tip = (i: number) => new Vector3().fromBufferAttribute(pos, i * 12 + 3);
    flock.place(0, new Vector3(10, 5, 0), 0, 0, 1, true, 0.1);
    const a = tip(0);
    flock.place(0, new Vector3(10, 5, 0), 0, 0, 1, true, 0.25);
    expect(a.distanceTo(tip(0))).toBeGreaterThan(0.01);
    expect(a.distanceTo(new Vector3(10, 5, 0))).toBeGreaterThan(0.5);
    flock.place(1, new Vector3(3, 3, 3), 0, 0, 1, false, 0.1);
    for (let k = 0; k < 12; k++) expect(new Vector3().fromBufferAttribute(pos, 12 + k).distanceTo(new Vector3(3, 3, 3))).toBeCloseTo(0);
  });
});

describe('fittings on the boat', () => {
  const count = (root: Object3D) => { let meshes = 0, vertices = 0; root.traverse((o) => { const m = o as Mesh; if (m.isMesh) { meshes += 1; vertices += m.geometry.getAttribute('position').count; } }); return { meshes, vertices }; };

  it('a bare boat has no pennant, lantern or portlights, and each one earned adds to it', () => {
    const bare = count(buildBoat(BARE.sloop, DEFAULT_COLOURS).group);
    const pennant = count(buildBoat(fitOut(BARE.sloop, ['pennant']), DEFAULT_COLOURS).group);
    const lantern = count(buildBoat(fitOut(BARE.sloop, ['lantern']), DEFAULT_COLOURS).group);
    const ports = count(buildBoat(fitOut(BARE.sloop, ['portlights']), DEFAULT_COLOURS).group);
    // the pennant flies as its own mesh; the lantern and portlights are baked into the paint
    expect(pennant.meshes).toBe(bare.meshes + 1);
    expect(lantern.meshes).toBe(bare.meshes);
    expect(lantern.vertices).toBeGreaterThan(bare.vertices);
    expect(ports.vertices).toBeGreaterThan(bare.vertices);
  });

  it('a pennant and a lantern earned on the dinghy are on the dinghy', () => {
    const bare = count(buildBoat(BARE.dinghy, DEFAULT_COLOURS).group), fitted = count(buildBoat(fitOut(BARE.dinghy, ['pennant', 'lantern']), DEFAULT_COLOURS).group);
    expect(fitted.meshes).toBe(bare.meshes + 1);
    expect(fitted.vertices).toBeGreaterThan(bare.vertices);
  });
});

describe('flags to dress ship', () => {
  const flagPoints = (earned: readonly string[], furled: boolean) => {
    let points = 0;
    buildBoat(fitOut(BARE.cutter, earned), DEFAULT_COLOURS, { furled }).group.traverse((o) => { const m = o as Mesh; if (m.isMesh && (m.material as { vertexColors?: boolean; userData: { paint?: boolean } }).vertexColors && m.geometry.getAttribute('aSurf') === undefined) points += m.geometry.getAttribute('position').count; });
    return points;
  };

  it('are flown in port, with the sails furled, and stowed under sail', () => {
    // the cutter always has her ensign, so there is a flag mesh either way
    const ensign = flagPoints([], true);
    expect(ensign).toBeGreaterThan(0);
    expect(flagPoints(['dress-flags'], true)).toBeGreaterThan(ensign + 8 * 8);
    expect(flagPoints(['dress-flags'], false)).toBe(flagPoints([], false));
  });
});

describe('every part of every boat', () => {
  for (const id of STAGE_ORDER) {
    for (const [what, opts] of [['under sail', {}], ['furled in port', { furled: true }], ['as a reflection', { mirror: true }]] as const) {
      it(`${id}, ${what}: no point is a broken number`, () => {
        const boat = buildBoat(STAGES[id], DEFAULT_COLOURS, opts);
        boat.update(1.3, 0.8, 0.7);
        boat.group.traverse((o) => {
          const m = o as Mesh;
          if (!m.isMesh) return;
          const pos = m.geometry.getAttribute('position'), bad: number[] = [];
          for (let i = 0; i < pos.count * 3; i++) if (!Number.isFinite(pos.array[i]!)) bad.push(i);
          expect(bad, `${(m.material as { type: string }).type} with ${pos.count} points`).toEqual([]);
        });
      });
    }
  }
});

describe('the name on the quarter', () => {
  it('is painted by the hull itself, so it adds no mesh and no draw call', () => {
    const count = (earned: readonly string[]) => meshes(buildBoat(fitOut(BARE.sloop, earned), DEFAULT_COLOURS).group);
    expect(count(['transom-name'])).toBe(count([]));
  });

  it('can be set and changed without a page to draw on, and on a boat that has not earned it', () => {
    const named = buildBoat(fitOut(BARE.sloop, ['transom-name']), DEFAULT_COLOURS), plain = buildBoat(BARE.sloop, DEFAULT_COLOURS);
    let calls = 0;
    expect(() => { named.setName('The Kestrel', () => { calls += 1; }); named.setName('   '); plain.setName('The Kestrel'); named.dispose(); }).not.toThrow();
    expect(calls).toBe(1);
  });
});

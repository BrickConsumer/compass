import { type BufferAttribute, Group, type Mesh, MeshBasicMaterial, type Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_COLOURS, sheer, STAGE_ORDER, STAGES } from '../boat/specs';
import { buildBoat } from './boat/buildBoat';
import { paintMaterial } from './boat/materials';
import { buildFlock, buildPerson, buildPort } from './scenery';

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

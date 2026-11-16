import { BoxGeometry, type BufferAttribute, Color, Group, Matrix4, Mesh, MeshStandardMaterial, SphereGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { bakeStatic, Batch, tint } from './batch';

const paintMat = (color: string, roughness = 0.7) => { const m = new MeshStandardMaterial({ color, roughness }); m.userData.paint = true; return m; };

describe('Batch', () => {
  it('joins geometries, moving each part into place and keeping its triangles', () => {
    const batch = new Batch(), box = new BoxGeometry(1, 1, 1);
    const a = batch.add(box, null, { color: '#ff0000' });
    const b = batch.add(box, new Matrix4().makeTranslation(10, 0, 0), { color: '#00ff00', rough: 0.2, metal: 0.9, glow: 0.5 });
    const g = batch.geometry();
    expect(a).toEqual({ start: 0, count: 24 });
    expect(b).toEqual({ start: 24, count: 24 });
    expect(g.getAttribute('position').count).toBe(48);
    expect(g.getIndex()!.count).toBe(72);
    // the second box's triangles point at the second box's vertices
    expect(Math.min(...Array.from(g.getIndex()!.array).slice(36))).toBe(24);
    g.computeBoundingBox();
    expect(g.boundingBox!.min.x).toBeCloseTo(-0.5);
    expect(g.boundingBox!.max.x).toBeCloseTo(10.5);
  });

  it('keeps each part its own paint, as linear colour and finish', () => {
    const batch = new Batch();
    batch.add(new BoxGeometry(), null, { color: '#ff0000' });
    const second = batch.add(new BoxGeometry(), null, { color: '#808080', rough: 0.2, metal: 0.9, glow: 0.5 });
    const g = batch.geometry(), colour = g.getAttribute('color'), surf = g.getAttribute('aSurf'), grey = new Color('#808080');
    expect([colour.getX(0), colour.getY(0), colour.getZ(0)]).toEqual([1, 0, 0]);
    expect(colour.getX(second.start)).toBeCloseTo(grey.r, 6);
    expect(grey.r).toBeLessThan(0.3); // linear, not the 0.5 of the hex value
    expect([surf.getX(0), surf.getY(0), surf.getZ(0)].map((v) => +v.toFixed(3))).toEqual([0.7, 0, 0]);
    expect([surf.getX(second.start), surf.getY(second.start), surf.getZ(second.start)].map((v) => +v.toFixed(3))).toEqual([0.2, 0.9, 0.5]);
  });

  it('takes geometry without an index or without normals', () => {
    const batch = new Batch(), loose = new BoxGeometry().toNonIndexed();
    loose.deleteAttribute('normal');
    batch.add(new BoxGeometry(), null, { color: '#fff' });
    const r = batch.add(loose, null, { color: '#fff' });
    const g = batch.geometry();
    expect(r.count).toBe(36);
    expect(g.getIndex()!.count).toBe(72);
    expect(Math.hypot(g.getAttribute('normal').getX(r.start), g.getAttribute('normal').getY(r.start), g.getAttribute('normal').getZ(r.start))).toBeCloseTo(1);
  });

  it('repaints one part without touching the rest', () => {
    const batch = new Batch();
    batch.add(new BoxGeometry(), null, { color: '#000000' });
    const second = batch.add(new BoxGeometry(), null, { color: '#000000' });
    const g = batch.geometry();
    tint(g, second, new Color(1, 1, 1));
    const colour = g.getAttribute('color') as BufferAttribute;
    expect(colour.getX(0)).toBe(0);
    expect(colour.getX(second.start)).toBe(1);
    expect(colour.getX(second.start + second.count - 1)).toBe(1);
  });
});

describe('bakeStatic', () => {
  const scene = () => {
    const root = new Group(), arm = new Group();
    arm.position.set(0, 5, 0); root.add(arm);
    const red = new Mesh(new BoxGeometry(), paintMat('#ff0000')); red.position.x = 2; red.castShadow = true;
    const blue = new Mesh(new SphereGeometry(1, 8, 6), paintMat('#0000ff', 0.3)); blue.castShadow = true; arm.add(blue);
    const flag = new Mesh(new BoxGeometry(), paintMat('#00ff00')); flag.castShadow = true;
    root.add(red, flag);
    return { root, arm, red, blue, flag };
  };

  it('turns plain painted meshes of different colours into one mesh', () => {
    const { root, red, blue, flag } = scene(), shared = new MeshStandardMaterial();
    const made = bakeStatic(root, new Set(), { paint: () => shared });
    expect(made).toHaveLength(1);
    expect(made[0]!.material).toBe(shared);
    expect(made[0]!.castShadow).toBe(true);
    expect(made[0]!.geometry.getAttribute('position').count).toBe(red.geometry.getAttribute('position').count + blue.geometry.getAttribute('position').count + flag.geometry.getAttribute('position').count);
    expect(red.parent).toBeNull();
    expect(blue.parent).toBeNull();
  });

  it('bakes in the place of a mesh inside a group', () => {
    const { root } = scene();
    const [baked] = bakeStatic(root, new Set(), { paint: () => new MeshStandardMaterial() });
    baked!.geometry.computeBoundingBox();
    // the sphere sat in a group raised by five
    expect(baked!.geometry.boundingBox!.max.y).toBeCloseTo(6);
    expect(baked!.geometry.boundingBox!.max.x).toBeCloseTo(2.5);
  });

  it('leaves alone what moves, whether a mesh or everything in a moving group', () => {
    const { root, arm, blue, flag } = scene();
    const made = bakeStatic(root, new Set([flag, arm]), { paint: () => new MeshStandardMaterial() });
    expect(made).toHaveLength(1);
    expect(made[0]!.geometry.getAttribute('position').count).toBe(24);
    expect(flag.parent).toBe(root);
    expect(blue.parent).toBe(arm);
  });

  it('keeps shadow casters apart from parts that cast none', () => {
    const { root, flag } = scene();
    flag.castShadow = false;
    const made = bakeStatic(root, new Set(), { paint: () => new MeshStandardMaterial() });
    expect(made.map((m) => m.castShadow).sort()).toEqual([false, true]);
  });

  it('leaves a lone mesh in a special material untouched, and joins several that share one', () => {
    const root = new Group(), special = new MeshStandardMaterial(), shared = new MeshStandardMaterial();
    const hull = new Mesh(new BoxGeometry(), special), a = new Mesh(new BoxGeometry(), shared), b = new Mesh(new BoxGeometry(), shared);
    root.add(hull, a, b);
    const made = bakeStatic(root, new Set(), { paint: () => new MeshStandardMaterial() });
    expect(made).toHaveLength(1);
    expect(made[0]!.material).toBe(shared);
    expect(hull.parent).toBe(root);
    expect(root.children).toHaveLength(2);
  });
});

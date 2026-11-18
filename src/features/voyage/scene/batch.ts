import { BufferAttribute, BufferGeometry, Color, type Material, Matrix4, Mesh, type Object3D, Vector3 } from 'three';

/** How one part is painted. Kept as vertex data, so parts with different paint can share one material. */
export interface Paint {
  color: string | Color;
  /** Roughness, 0 to 1. */
  rough?: number;
  /** Metalness, 0 to 1. */
  metal?: number;
  /** How strongly the part glows in its own colour: a lamp. */
  glow?: number;
}

/** The vertices a part occupies in the baked geometry, for repainting or moving it later. */
export interface Range { start: number; count: number }

/**
 * Bakes many small geometries into one, so parts that share a material cost one draw call instead of one each.
 * Every part keeps its place (the matrix is applied to its vertices) and its paint (`color` and `aSurf` attributes).
 */
export class Batch {
  private position: number[] = [];
  private normal: number[] = [];
  private color: number[] = [];
  private surf: number[] = [];
  private uv: number[] = [];
  private index: number[] = [];

  get vertices(): number { return this.position.length / 3; }

  add(source: BufferGeometry, matrix: Matrix4 | null, paint: Paint): Range {
    const g = source.clone();
    if (matrix) g.applyMatrix4(matrix);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const pos = g.getAttribute('position'), nor = g.getAttribute('normal'), uv = g.getAttribute('uv');
    const start = this.vertices, count = pos.count, c = paint.color instanceof Color ? paint.color : new Color(paint.color);
    for (let i = 0; i < count; i++) {
      this.position.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      this.normal.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      // a Color holds linear values, which is what a vertex colour is read as
      this.color.push(c.r, c.g, c.b);
      this.surf.push(paint.rough ?? 0.7, paint.metal ?? 0, paint.glow ?? 0);
      this.uv.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
    }
    const idx = g.getIndex();
    if (idx) for (let i = 0; i < idx.count; i++) this.index.push(start + idx.getX(i));
    else for (let i = 0; i < count; i++) this.index.push(start + i);
    g.dispose();
    return { start, count };
  }

  geometry(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(this.position), 3));
    g.setAttribute('normal', new BufferAttribute(new Float32Array(this.normal), 3));
    g.setAttribute('color', new BufferAttribute(new Float32Array(this.color), 3));
    g.setAttribute('aSurf', new BufferAttribute(new Float32Array(this.surf), 3));
    g.setAttribute('uv', new BufferAttribute(new Float32Array(this.uv), 2));
    g.setIndex(this.index);
    return g;
  }
}

/** Repaint one part of a baked geometry. */
export function tint(geometry: BufferGeometry, range: Range, color: Color): void {
  const attr = geometry.getAttribute('color') as BufferAttribute;
  for (let i = range.start; i < range.start + range.count; i++) attr.setXYZ(i, color.r, color.g, color.b);
  attr.needsUpdate = true;
}

const black = (c: Color | undefined) => !c || (c.r === 0 && c.g === 0 && c.b === 0);

interface Plain { color: Color; roughness: number; metalness: number; emissive?: Color; emissiveIntensity?: number }

/**
 * Replace the meshes under `root` that never move with as few meshes as possible. Returns the new meshes.
 *
 * - Plain paint (materials marked `userData.paint`) of every colour and finish becomes one mesh, or two when
 *   some parts cast shadows and others do not.
 * - Reflection paint (marked `userData.reflection`) becomes one mesh.
 * - Any other material shared by several meshes becomes one mesh in that material. Its custom attributes are
 *   not carried over, so a material that needs them should be on one mesh only, which is left alone.
 *
 * `moving` lists the meshes, or the groups, that are animated and must stay as they are.
 *
 * Reflection paint is see-through, so the order its parts are drawn in shows. `farToNear` is given the centre of
 * each part and answers how near the viewer it is (larger is nearer). The parts are laid down far to near, which
 * is the order the renderer would draw them in as separate meshes.
 */
export function bakeStatic(root: Object3D, moving: Set<Object3D>, make: { paint: () => Material; reflection?: () => Material; farToNear?: (centre: Vector3) => number }): Mesh[] {
  const jobs = new Map<string, { parts: { mesh: Mesh; matrix: Matrix4; paint: Paint }[]; material: () => Material; cast: boolean; kind: string }>();
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const matrix = new Matrix4();
    for (let p: Object3D | null = mesh; p && p !== root; p = p.parent) {
      if (moving.has(p)) return;
      p.updateMatrix(); matrix.premultiply(p.matrix);
    }
    const m = mesh.material as Material & Partial<Plain> & { uniforms?: { uColor?: { value: Color } } };
    const kind = m.userData.paint ? 'paint' : m.userData.reflection && make.reflection ? 'reflection' : `own:${m.uuid}`, key = `${kind}:${mesh.castShadow ? 1 : 0}`;
    let job = jobs.get(key);
    if (!job) jobs.set(key, job = { parts: [], kind, cast: mesh.castShadow, material: kind === 'paint' ? make.paint : kind === 'reflection' ? make.reflection! : () => m });
    job.parts.push({ mesh, matrix, paint: kind === 'paint'
      ? { color: m.color!, rough: m.roughness, metal: m.metalness, glow: black(m.emissive) ? 0 : m.emissiveIntensity }
      : { color: m.uniforms?.uColor?.value ?? '#ffffff' } });
  });
  const made: Mesh[] = [];
  for (const [key, job] of jobs) {
    // one mesh in its own material gains nothing from baking, and may rely on attributes a batch does not keep
    if (key.startsWith('own:') && job.parts.length === 1) continue;
    const order = make.farToNear;
    // Array.sort is stable, so parts at the same distance keep the order they were built in
    if (job.kind === 'reflection' && order) {
      const near = new Map(job.parts.map((part) => { part.mesh.geometry.computeBoundingSphere(); return [part, order(new Vector3().copy(part.mesh.geometry.boundingSphere!.center).applyMatrix4(part.matrix))]; }));
      job.parts.sort((a, b) => near.get(a)! - near.get(b)!);
    }
    const batch = new Batch();
    for (const part of job.parts) batch.add(part.mesh.geometry, part.matrix, part.paint);
    const baked = new Mesh(batch.geometry(), job.material());
    baked.castShadow = job.cast; baked.receiveShadow = job.parts.some((x) => x.mesh.receiveShadow);
    for (const { mesh } of job.parts) mesh.removeFromParent();
    root.add(baked); made.push(baked);
  }
  return made;
}

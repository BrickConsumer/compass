import { describe, expect, it } from 'vitest';
import { STAGES, STAGE_ORDER } from '../../boat/specs';
import { deckGeometry, halfBeam, hullGeometry, keelLine } from './hull';

describe('hull', () => {
  for (const id of STAGE_ORDER) {
    const spec = STAGES[id];
    it(`${id}: is a sound surface of the right size`, () => {
      const g = hullGeometry(spec);
      const p = g.getAttribute('position');
      for (let i = 0; i < p.count * 3; i++) expect(Number.isFinite(p.array[i]!)).toBe(true);
      g.computeBoundingBox();
      const box = g.boundingBox!;
      expect(box.max.x - box.min.x).toBeCloseTo(spec.L, 1);
      expect(box.max.z).toBeCloseTo(spec.beam / 2, 1);
      expect(box.max.z).toBeCloseTo(-box.min.z, 6);
      expect(g.getIndex()!.count / 3).toBeLessThanOrEqual(6000);
      expect(deckGeometry(spec).getIndex()!.count / 3).toBeLessThanOrEqual(1000);
    });

    it(`${id}: profile meets the waterline where the still image does`, () => {
      expect(keelLine(spec, spec.counter)).toBeCloseTo(0, 6);
      expect(keelLine(spec, spec.L - spec.rakeB)).toBeCloseTo(0, 6);
      expect(keelLine(spec, spec.L)).toBeCloseTo(spec.fB, 6);
      expect(keelLine(spec, spec.L / 2)).toBeLessThan(0);
      expect(halfBeam(spec, spec.L)).toBeCloseTo(0, 6);
    });
  }
});

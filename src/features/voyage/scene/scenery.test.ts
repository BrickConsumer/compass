import { describe, expect, it } from 'vitest';
import { lighthouseParts, skyline, treeLine } from './scenery';

describe('scenery silhouettes', () => {
  for (const kind of ['hills', 'peaks', 'mesa', 'stacks'] as const) {
    it(`${kind}: is a filled outline that rises from the waterline`, () => {
      const g = skyline(kind, 11);
      g.computeBoundingBox();
      const box = g.boundingBox!;
      expect(g.getIndex()!.count / 3).toBeGreaterThan(20);
      expect(box.max.y).toBeGreaterThan(0.3);
      expect(box.min.y).toBeGreaterThanOrEqual(0);
      expect(box.max.x - box.min.x).toBeGreaterThan(0.6);
    });
  }

  it('tree line and lighthouse parts are filled', () => {
    expect(treeLine(3).getIndex()!.count / 3).toBeGreaterThan(20);
    for (const g of Object.values(lighthouseParts())) expect(g.getIndex()!.count / 3).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from 'vitest';
import { STAGES, STAGE_ORDER, sheer, tallOf } from './specs';

describe('boat measurements', () => {
  it('each stage is longer and taller than the one before', () => {
    for (let i = 1; i < STAGE_ORDER.length; i++) {
      const prev = STAGES[STAGE_ORDER[i - 1]!], next = STAGES[STAGE_ORDER[i]!];
      expect(next.L).toBeGreaterThan(prev.L);
      expect(tallOf(next)).toBeGreaterThan(tallOf(prev));
    }
  });

  it('the sheer meets the stern and bow freeboard', () => {
    for (const id of STAGE_ORDER) {
      const s = STAGES[id];
      expect(sheer(s, 0)).toBeCloseTo(s.fS, 10);
      expect(sheer(s, s.L)).toBeCloseTo(s.fB, 10);
      expect(sheer(s, -5)).toBeCloseTo(s.fS, 10);
      expect(sheer(s, s.L + 5)).toBeCloseTo(s.fB, 10);
    }
  });

  it('every boom ends aft of its mast and headsail clews lie between mast and bow', () => {
    for (const id of STAGE_ORDER) {
      const s = STAGES[id];
      for (const m of s.masts) {
        expect(m.boom).toBeGreaterThan(0);
        expect(m.x - m.boom).toBeLessThan(m.x);
        expect(m.x).toBeGreaterThan(0);
        expect(m.x).toBeLessThan(s.L);
      }
      for (const h of s.head) {
        const m = s.masts[h.mast ?? 0]!;
        expect(m.x + h.clewX).toBeGreaterThan(m.x);
        expect(m.x + h.clewX).toBeLessThan(s.L);
      }
    }
  });

  it('each stage adds sails, so the silhouette changes', () => {
    const sails = STAGE_ORDER.map((id) => STAGES[id].masts.length + STAGES[id].head.length);
    expect(sails).toEqual([1, 2, 3, 4]);
  });
});

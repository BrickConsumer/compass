import { describe, expect, it } from 'vitest';
import { fitOut, nameBox, STAGES, STAGE_ORDER, sheer, tallOf } from './specs';

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

describe('fitting out', () => {
  it('a boat carries only the fittings that have been earned', () => {
    const bare = fitOut(STAGES.sloop, []);
    expect([bare.pennant, bare.lantern, bare.stripe, bare.portlights]).toEqual([false, false, false, false]);
    const some = fitOut(STAGES.sloop, ['pennant', 'lantern']);
    expect([some.pennant, some.lantern, some.stripe, some.portlights]).toEqual([true, true, false, false]);
  });

  it('fittings carry to every boat, and the measurements are untouched', () => {
    for (const id of STAGE_ORDER) {
      const full = fitOut(STAGES[id], ['pennant', 'lantern', 'sheer-stripe', 'portlights', 'something-not-drawn-yet']);
      expect([full.pennant, full.lantern, full.stripe, full.portlights]).toEqual([true, true, true, true]);
      expect(full.L).toBe(STAGES[id].L);
      expect(full.masts).toBe(STAGES[id].masts);
    }
  });

  it('the larger boats keep their ensign whatever has been earned', () => {
    expect(fitOut(STAGES.cutter, []).ensign).toBe(true);
    expect(fitOut(STAGES.dinghy, ['pennant']).ensign).toBeFalsy();
  });
});

describe('where the name is lettered', () => {
  it('sits on the quarter: forward of the counter, in the after half, under the sheer stripe and clear of the boot stripe', () => {
    for (const id of STAGE_ORDER) {
      const s = STAGES[id], box = nameBox(s, 6);
      expect(box.x0).toBeGreaterThan(s.counter);
      expect(box.x1).toBeLessThan(s.L * 0.5);
      expect(box.x1).toBeGreaterThan(box.x0);
      // below the stripe, which ends 0.13 m under the sheer
      expect(box.d0).toBeGreaterThan(0.13);
      // above the boot stripe, which tops out 0.14 m over the waterline
      for (const x of [box.x0, box.x1]) expect(sheer(s, x) - box.d1).toBeGreaterThan(0.14);
    }
  });

  it('keeps the lettering in proportion, and shrinks a long name to fit', () => {
    const short = nameBox(STAGES.sloop, 4), long = nameBox(STAGES.sloop, 30);
    const shape = (b: ReturnType<typeof nameBox>) => (b.x1 - b.x0) / (b.d1 - b.d0);
    expect(shape(short)).toBeCloseTo(4, 5);
    expect(shape(long)).toBeCloseTo(30, 5);
    expect(long.x1 - long.x0).toBeLessThanOrEqual(STAGES.sloop.L * 0.3 + 1e-9);
    expect(long.d1 - long.d0).toBeLessThan(short.d1 - short.d0);
  });

  it('is lettered larger on a larger boat', () => {
    const h = (id: 'dinghy' | 'schooner') => { const b = nameBox(STAGES[id], 4); return b.d1 - b.d0; };
    expect(h('schooner')).toBeGreaterThan(h('dinghy'));
  });

  it('is worn only once it has been earned', () => {
    expect(fitOut(STAGES.sloop, []).named).toBe(false);
    expect(fitOut(STAGES.sloop, ['transom-name']).named).toBe(true);
  });
});

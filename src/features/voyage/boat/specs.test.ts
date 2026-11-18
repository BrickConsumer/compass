import { describe, expect, it } from 'vitest';
import { carries, DRAWN_FITTINGS, DRESS_COLOURS, dressFlags, dressFly, dressLine, fitOut, mastPoint, nameBox, STAGES, STAGE_ORDER, sheer, sternLanternAt, tallOf, tenderBox, topsailOf } from './specs';
import { FITTINGS } from '../../../domain/voyage';

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

describe('the later fittings', () => {
  it('every fitting that can be earned is drawn', () => {
    expect([...DRAWN_FITTINGS].sort()).toEqual(FITTINGS.map((f) => f.id).sort());
    expect(FITTINGS.every((f) => f.modelled)).toBe(true);
  });

  it('each is on the boat only once it is earned', () => {
    const bare = fitOut(STAGES.schooner, []);
    expect([bare.dressed, bare.ratlines, bare.sternLantern, bare.tender, bare.topsail, bare.gilded]).toEqual([false, false, false, false, false, false]);
    const full = fitOut(STAGES.schooner, DRAWN_FITTINGS);
    expect([full.dressed, full.ratlines, full.sternLantern, full.tender, full.topsail, full.gilded]).toEqual([true, true, true, true, true, true]);
  });

  it('gold leaf goes on the cove stripe, so a gilded boat shows the stripe', () => {
    expect(fitOut(STAGES.schooner, ['gilded-stripe']).stripe).toBe(true);
    expect(fitOut(STAGES.schooner, ['sheer-stripe']).gilded).toBe(false);
  });

  it('the dress line runs from the bow over every masthead to the stern', () => {
    for (const id of STAGE_ORDER) {
      const s = STAGES[id], line = dressLine(s);
      expect(line).toHaveLength(s.masts.length + 2);
      expect(line[0]!.x).toBeGreaterThan(s.L - 0.2);
      expect(line[line.length - 1]!.x).toBeLessThan(0.2);
      // always moving aft, so the line never doubles back
      for (let i = 1; i < line.length; i++) expect(line[i]!.x).toBeLessThan(line[i - 1]!.x);
      const tops = s.masts.map((m) => mastPoint(s, m, m.H).y);
      expect(Math.max(...line.map((p) => p.y))).toBeCloseTo(Math.max(...tops), 10);
    }
  });

  it('the flags are evenly spread, take their colours in turn, and grow with the boat', () => {
    for (const id of STAGE_ORDER) {
      const s = STAGES[id], { flags, hoist, fly } = dressFlags(s), line = dressLine(s);
      expect(flags.length).toBeGreaterThanOrEqual(8);
      expect(flags.length).toBeLessThanOrEqual(40);
      flags.forEach((f, i) => {
        expect(f.colour).toBe(i % DRESS_COLOURS.length);
        expect(Math.hypot(f.along.x, f.along.y)).toBeCloseTo(1, 10);
        expect(f.at.x).toBeGreaterThan(line[line.length - 1]!.x);
        expect(f.at.x).toBeLessThan(line[0]!.x);
      });
      expect(fly).toBeGreaterThan(hoist);
    }
    expect(dressFlags(STAGES.schooner).fly).toBeGreaterThan(dressFlags(STAGES.dinghy).fly);
  });

  it('a dress flag hangs down from its line in a calm, streams aft in a breeze, and never lies along the line', () => {
    for (const id of STAGE_ORDER) {
      for (const f of dressFlags(STAGES[id]).flags) {
        for (const wind of [0, 0.12, 0.5, 0.8, 1]) {
          const d = dressFly(f.along, wind);
          expect(Math.hypot(d.x, d.y)).toBeCloseTo(1, 6);
          // at least 50 degrees off the line
          expect(Math.abs(d.x * f.along.y - d.y * f.along.x)).toBeGreaterThan(0.76);
        }
        expect(dressFly(f.along, 0).y).toBeLessThan(0);
        expect(dressFly(f.along, 1).x).toBeLessThan(0);
      }
    }
  });

  it('the tender is carried only where a cabin top has room, clear of the masts and under the boom', () => {
    expect(tenderBox(STAGES.dinghy)).toBeNull();
    expect(tenderBox(STAGES.sloop)).toBeNull();
    for (const id of ['cutter', 'schooner'] as const) {
      const s = STAGES[id], t = tenderBox(s)!;
      expect(t.len).toBeGreaterThanOrEqual(1.9);
      expect(t.len).toBeLessThanOrEqual(2.6);
      for (const m of s.masts) {
        expect(m.x < t.x || m.x > t.x + t.len).toBe(true);
        // a boom that passes over her clears her keel
        if (m.x > t.x && m.x - m.boom < t.x + t.len) expect(t.y + t.h).toBeLessThan(sheer(s, m.x) + m.boomH);
      }
    }
  });

  it('only a boat with a gaff sail sets a topsail, between the gaff and the masthead', () => {
    expect(topsailOf(STAGES.dinghy)).toBeNull();
    expect(topsailOf(STAGES.sloop)).toBeNull();
    expect(topsailOf(STAGES.cutter)).toBeNull();
    const s = STAGES.schooner, t = topsailOf(s)!;
    expect(t.mast.main).toBe('gaff');
    expect(t.head.y).toBeGreaterThan(t.peak.y);
    expect(t.peak.y).toBeGreaterThan(t.throat.y);
    expect(t.peak.x).toBeLessThan(t.throat.x);
    expect(t.head.y).toBeLessThan(mastPoint(s, t.mast, t.mast.H).y);
  });

  it('a few fittings need something the smaller boats lack', () => {
    const on = (id: string) => STAGE_ORDER.filter((stage) => carries(STAGES[stage], id));
    expect(on('portlights')).toEqual(['sloop', 'cutter', 'schooner']);
    expect(on('tender')).toEqual(['cutter', 'schooner']);
    expect(on('topsail')).toEqual(['schooner']);
    for (const id of ['pennant', 'lantern', 'sheer-stripe', 'transom-name', 'dress-flags', 'ratlines', 'stern-lantern', 'gilded-stripe']) expect(on(id)).toEqual([...STAGE_ORDER]);
  });

  it('the stern lantern stands near the stern, off the centre line', () => {
    for (const id of STAGE_ORDER) {
      const at = sternLanternAt(STAGES[id]);
      expect(at.x).toBeLessThan(0.05 * STAGES[id].L + 0.2);
      expect(at.z).toBeGreaterThan(0);
      expect(at.post).toBeGreaterThan(0.3);
    }
  });
});

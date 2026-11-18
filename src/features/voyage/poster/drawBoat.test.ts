import { describe, expect, it } from 'vitest';
import { DEFAULT_COLOURS, DRAWN_FITTINGS, DRESS_COLOURS, dressFlags, fitOut, STAGES, STAGE_ORDER } from '../boat/specs';
import { sceneState } from '../light';
import { seaPoster } from './seaPoster';

const sizes = [[1178, 276], [358, 184], [1178, 64]] as const;

describe('still image', () => {
  it('draws every stage at every state and size without a broken number', () => {
    for (const stage of STAGE_ORDER) {
      for (const progress of [null, 0, 0.6, 1, NaN, 7]) {
        for (const [width, height] of sizes) {
          const svg = seaPoster({ width, height, spec: STAGES[stage], state: sceneState(progress, { missedYesterday: stage === 'cutter' }), colours: DEFAULT_COLOURS, id: 't' });
          expect(svg).not.toMatch(/NaN|undefined|Infinity/);
          expect(svg.length).toBeGreaterThan(2000);
        }
      }
    }
  });

  it('furls the sails in port when nothing is planned', () => {
    const anchored = seaPoster({ width: 1178, height: 276, spec: STAGES.sloop, state: sceneState(null), colours: DEFAULT_COLOURS, id: 't' });
    const sailing = seaPoster({ width: 1178, height: 276, spec: STAGES.sloop, state: sceneState(0.6), colours: DEFAULT_COLOURS, id: 't' });
    // Sails are the only closed paths painted with the sail gradient.
    expect(anchored).not.toContain('fill="url(#tbs)"');
    expect(sailing).toContain('fill="url(#tbs)"');
  });

  it('ignores a colour that is not a hex value', () => {
    const svg = seaPoster({ width: 400, height: 200, spec: STAGES.sloop, state: sceneState(0.5), colours: { hull: '"/><script>', sail: 'red', pennant: '#AB3935' }, id: 't' });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('#0E243A');
  });

  it('draws only the fittings that have been earned', () => {
    const draw = (earned: readonly string[]) => seaPoster({ width: 1178, height: 276, spec: fitOut(STAGES.sloop, earned), state: sceneState(0.6), colours: DEFAULT_COLOURS, id: 't' });
    const circles = (svg: string) => svg.split('<circle').length - 1, bare = draw([]), full = draw(DRAWN_FITTINGS);
    // two portlights and the two lanterns, bow and stern, are the circles on a sloop
    expect(circles(full) - circles(bare)).toBe(4);
    expect(circles(draw(['stern-lantern'])) - circles(bare)).toBe(1);
    expect(circles(draw(['lantern'])) - circles(bare)).toBe(1);
    expect(draw(['pennant']).length).toBeGreaterThan(bare.length);
    expect(draw(['sheer-stripe']).length).toBeGreaterThan(bare.length);
  });

  it('draws the later fittings: flags, ratlines, a tender, a topsail and gold leaf', () => {
    const draw = (stage: 'sloop' | 'cutter' | 'schooner', earned: readonly string[], progress: number | null = 0.6) =>
      seaPoster({ width: 1178, height: 276, spec: fitOut(STAGES[stage], earned), state: sceneState(progress), colours: DEFAULT_COLOURS, id: 't' });
    const paths = (svg: string) => svg.split('<path').length - 1;
    // dressed in port, a flag for every place on the line; under sail the flags are stowed
    const flags = (svg: string) => DRESS_COLOURS.reduce((n, c) => n + svg.split(`fill="${c}"`).length - 1, 0);
    expect(flags(draw('sloop', ['dress-flags'], null)) - flags(draw('sloop', [], null))).toBe(dressFlags(STAGES.sloop).flags.length);
    for (const progress of [0, 0.6, 1]) expect(draw('sloop', ['dress-flags'], progress)).toBe(draw('sloop', [], progress));
    expect(paths(draw('cutter', ['ratlines']))).toBeGreaterThan(paths(draw('cutter', [])));
    // the tender needs a cabin top long enough: the cutter has one and the sloop does not
    expect(paths(draw('cutter', ['tender']))).toBeGreaterThan(paths(draw('cutter', [])));
    expect(draw('sloop', ['tender'])).toBe(draw('sloop', []));
    // a topsail is one more sail, on the boat with a gaff, and is stowed in port
    const sails = (svg: string) => svg.split('fill="url(#tbs)"').length - 1;
    expect(sails(draw('schooner', ['topsail'])) - sails(draw('schooner', []))).toBe(1);
    expect(draw('cutter', ['topsail'])).toBe(draw('cutter', []));
    expect(sails(draw('schooner', ['topsail'], null))).toBe(0);
    // gold leaf shows the stripe even if the painted stripe was never earned
    expect(draw('schooner', ['gilded-stripe'])).toContain('#F2CC5C');
    expect(draw('schooner', ['sheer-stripe'])).not.toContain('#F2CC5C');
    for (const stage of ['sloop', 'cutter', 'schooner'] as const) for (const progress of [null, 0, 1]) expect(draw(stage, DRAWN_FITTINGS, progress)).not.toMatch(/NaN|undefined|Infinity/);
  });
});

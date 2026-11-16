import { describe, expect, it } from 'vitest';
import { DEFAULT_COLOURS, DRAWN_FITTINGS, fitOut, STAGES, STAGE_ORDER } from '../boat/specs';
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
    // two portlights and the lantern are the circles on a sloop
    expect(circles(full) - circles(bare)).toBe(3);
    expect(circles(draw(['lantern'])) - circles(bare)).toBe(1);
    expect(draw(['pennant']).length).toBeGreaterThan(bare.length);
    expect(draw(['sheer-stripe']).length).toBeGreaterThan(bare.length);
  });
});

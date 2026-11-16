import { describe, expect, it } from 'vitest';
import { WAVES, WAVES_GLSL, waveHeight } from './waves';

describe('waves', () => {
  it('is flat at zero amplitude', () => {
    expect(waveHeight(3, -7, 12, 0)).toBeCloseTo(0, 12);
  });

  it('never exceeds the amplitude', () => {
    for (let i = 0; i < 2000; i++) {
      const h = waveHeight(i * 0.37 - 300, i * 0.91 - 500, i * 0.13, 0.22);
      expect(Math.abs(h)).toBeLessThanOrEqual(0.22 + 1e-9);
    }
  });

  it('shares sum to one and the shader carries every wave', () => {
    expect(WAVES.reduce((a, w) => a + w.share, 0)).toBeCloseTo(1, 10);
    expect(WAVES_GLSL.match(/h \+=/g)).toHaveLength(WAVES.length);
  });
});

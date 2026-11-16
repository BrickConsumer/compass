/**
 * How hard the sea is allowed to work. Phones start on the low tier to save battery;
 * any device drops a notch when frames stay slow. Nothing here touches three.js, so it can be tested on its own.
 */
export type Tier = 'high' | 'low';

export interface TierSettings {
  /** The most device pixels drawn for each CSS pixel. */
  maxDpr: number;
  /** A real shadow map. Without it the soft dark patch the water draws under the hull does the job. */
  shadows: boolean;
  /** Frames a second, or 0 for the display's own rate. */
  fps: number;
  /** A mean frame time above this, held for two seconds, counts as slow. */
  slowMs: number;
}

export const TIERS: Record<Tier, TierSettings> = {
  high: { maxDpr: 2, shadows: true, fps: 0, slowMs: 22 },
  // capped at 30, a frame should take 33 ms; 45 ms means it is no longer keeping up
  low: { maxDpr: 1.5, shadows: false, fps: 30, slowMs: 45 },
};

/** A tier, and the pixel density it is currently allowed. */
export interface Quality { tier: Tier; maxDpr: number }

export const qualityFor = (tier: Tier): Quality => ({ tier, maxDpr: TIERS[tier].maxDpr });
export const startingQuality = (touch: boolean): Quality => qualityFor(touch ? 'low' : 'high');

/** One notch down: high to low, then low at one device pixel. At the floor it returns what it was given. */
export function stepDown(q: Quality): Quality {
  if (q.tier === 'high') return qualityFor('low');
  return q.maxDpr > 1 ? { tier: 'low', maxDpr: 1 } : q;
}

/**
 * Watches frame times. Feed it the milliseconds since the last frame; it answers true when the mean
 * over a full window was above the limit. A gap longer than `gapMs` is a pause (a hidden tab, a
 * sleeping laptop), so the window starts again.
 */
export function frameWatch(limitMs: number, windowMs = 2000, gapMs = 250): (deltaMs: number) => boolean {
  let sum = 0, frames = 0;
  return (deltaMs) => {
    if (!(deltaMs > 0) || deltaMs > gapMs) { sum = 0; frames = 0; return false; }
    sum += deltaMs; frames += 1;
    if (sum < windowMs) return false;
    const slow = sum / frames > limitMs;
    sum = 0; frames = 0;
    return slow;
  };
}

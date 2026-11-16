import { describe, expect, it } from 'vitest';
import { placeBeside } from './place';

const view = { width: 1440, height: 900 }, size = { width: 400, height: 600 };
const row = (left: number, right: number, top: number) => ({ left, right, top, bottom: top + 46 });

describe('where the editor sits', () => {
  it('goes to the right of its row when there is room', () => {
    expect(placeBeside(row(226, 660, 300), size, view)).toEqual({ left: 668, top: 284 });
  });

  it('goes to the left when the right is full', () => {
    const p = placeBeside(row(1103, 1412, 300), size, view);
    expect(p.left).toBe(1103 - 8 - 400);
    expect(p.top).toBe(284);
  });

  it('never leaves the window, however low or high the row is', () => {
    expect(placeBeside(row(226, 660, 860), size, view).top).toBe(900 - 12 - 600);
    expect(placeBeside(row(226, 660, 4), size, view).top).toBe(12);
  });

  it('with no room beside, goes below the row, or above it when below is full', () => {
    const narrow = { width: 768, height: 1024 }, small = { width: 400, height: 300 };
    expect(placeBeside(row(112, 728, 200), small, narrow)).toEqual({ left: 112, top: 254 });
    expect(placeBeside(row(112, 728, 900), small, narrow)).toEqual({ left: 112, top: 900 - 8 - 300 });
  });

  it('with no room anywhere, still fits inside', () => {
    const tiny = { width: 700, height: 500 }, p = placeBeside(row(100, 690, 250), size, tiny);
    expect(p.left).toBeGreaterThanOrEqual(12);
    expect(p.left + size.width).toBeLessThanOrEqual(700 - 12);
    expect(p.top).toBe(12);
  });
});

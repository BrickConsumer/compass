import { describe, expect, it } from 'vitest';
import { cleanRating, DEFAULT_AREAS, shownRatings } from './ratings';

describe('ratings', () => {
  it('keeps a rating to a whole number from 1 to 10', () => expect([7, 7.6, 0, 11, -2, NaN].map(cleanRating)).toEqual([7, 8, null, null, null, null]));

  it('shows a row for each area, rated or not', () => {
    const review = { weekStart: 'w', wentWell: '', gotInWay: '', change: '', ratings: { 'area-sleep': 5, old: 9 } };
    expect(shownRatings(review, DEFAULT_AREAS).map((r) => r.rating)).toEqual([null, null, 5, null]);
    expect(shownRatings(undefined, DEFAULT_AREAS).map((r) => r.rating)).toEqual([null, null, null, null]);
  });
});

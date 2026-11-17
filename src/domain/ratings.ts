import type { RatingArea, Review } from './types';

/**
 * The areas in a save: only entries with an id and a name, each id once, six at most. No list at all means a save
 * from before areas existed, which gets the starting four. An empty list is a choice, and is kept.
 */
export function storedAreas(value: unknown): RatingArea[] {
  if (!Array.isArray(value)) return DEFAULT_AREAS;
  const areas: RatingArea[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const { id, name } = entry as Record<string, unknown>, clean = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ').slice(0, AREA_LIMITS.name).trim() : '';
    if (typeof id !== 'string' || !id || !clean || areas.some((a) => a.id === id)) continue;
    areas.push({ id, name: clean });
    if (areas.length === AREA_LIMITS.max) break;
  }
  return areas;
}

/** A rating as it is stored: a whole number from 1 to 10. Anything else is no rating. */
export const cleanRating = (n: number): number | null => { const r = Math.round(n); return Number.isFinite(r) && r >= 1 && r <= 10 ? r : null; };

/** Any rating at all on a review, whether or not its area still exists. */
export const hasRatings = (review: Review): boolean => Object.values(review.ratings ?? {}).some((n) => cleanRating(n) !== null);

/** One row for each area, in order, with the review's rating for it or none. A rating for an area that is gone is not shown. */
export const shownRatings = (review: Review | undefined, areas: RatingArea[]): { area: RatingArea; rating: number | null }[] =>
  areas.map((area) => ({ area, rating: cleanRating(review?.ratings?.[area.id] ?? NaN) }));

export const AREA_LIMITS = { max: 6, name: 24 };

/** The areas a new planner starts with. Their ids are fixed, so the sample's ratings find them. */
export const DEFAULT_AREAS: RatingArea[] = [
  { id: 'area-study', name: 'Study' }, { id: 'area-health', name: 'Health' }, { id: 'area-sleep', name: 'Sleep' }, { id: 'area-discipline', name: 'Discipline' },
];

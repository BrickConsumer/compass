import { Link } from 'react-router';
import { shownRatings } from '../../domain/ratings';
import type { ISODate } from '../../domain/types';
import { useCompass } from '../../state/store';

const TEN = Array.from({ length: 10 }, (_, i) => i + 1);

/**
 * One area's rating, out of ten. It is a real slider, so the arrow keys, Home and End work and it is read aloud;
 * it is drawn as ten segments, and pressing a segment sets it. Pressing the segment that is set clears it, so
 * there is a way back to nothing without a keyboard. Nothing is 0.
 */
function Rating({ name, rating, onRate }: { name: string; rating: number | null; onRate: (rating: number | null) => void }) {
  return (
    <span className="relative flex rounded-xs has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-focus">
      <input type="range" min={0} max={10} step={1} value={rating ?? 0} onChange={(e) => onRate(Number(e.target.value) || null)}
        aria-label={`${name}, out of 10`} aria-valuetext={rating ? `${rating} out of 10` : 'Not rated'} className="pointer-events-none absolute inset-0 size-full opacity-0" />
      {TEN.map((n) => (
        // each segment can be pressed across the full height of the row; the negative margin keeps the focus ring close to the bars
        <span key={n} data-segment aria-hidden="true" onClick={() => onRate(n === rating ? null : n)} className="-my-[18.5px] flex cursor-pointer items-center py-[18.5px] pr-[3px] last:pr-0 max-sm:-my-[21.5px] max-sm:py-[21.5px]">
          {/* deep navy, not seafoam: seafoam means done, and a rating is not progress */}
          <span className={`h-[7px] w-5 rounded-full transition-colors duration-[140ms] ease-[var(--ease-out)] motion-reduce:transition-none max-sm:w-[13px] ${rating !== null && n <= rating ? 'bg-rating' : 'bg-track'}`} />
        </span>
      ))}
    </span>
  );
}

/** How the week went: each area rated out of ten, kept with that week's review. No total and no average is worked out. */
export function Ratings({ week }: { week: ISODate }) {
  const areas = useCompass((s) => s.areas), review = useCompass((s) => s.reviews.find((r) => r.weekStart === week)), rate = useCompass((s) => s.rateReview);
  if (areas.length === 0) return null;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3"><h3 className="text-[20px] leading-[1.3]">How the week went</h3><p className="text-[13.5px] font-semibold text-text-muted">Out of 10</p></div>
      <p className="mt-0.5 max-w-[56ch] text-pretty text-[14.5px] text-text-muted">Rate each part of the week. Change the parts in <Link to="/settings" className="font-semibold text-text-link underline underline-offset-[3px]">Settings</Link>.</p>
      <ul className="mt-1">
        {shownRatings(review, areas).map(({ area, rating }) => (
          <li key={area.id} data-rating={area.id} className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto_1.75rem] items-center gap-x-4 border-t border-line first:border-t-0 max-sm:min-h-[50px]">
            <span className="truncate text-[15px] font-medium">{area.name}</span>
            <Rating name={area.name} rating={rating} onRate={(n) => rate(week, area.id, n)} />
            <span aria-hidden="true" className="grid justify-items-end font-display text-[20px] font-medium leading-none">{rating ?? <span className="h-[1.5px] w-3 bg-line-strong" />}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { Link } from 'react-router';
import { latestHeadlines } from '../../domain/interests';
import { useCompass } from '../../state/store';
import { useToday } from '../../state/useToday';
import { HeadlineRow } from '../pages/Headlines';

/** How many headlines Home shows. The rest are on their own page in My pages. */
const SHOWN = 3;

/**
 * The newest saved headlines, on Home under the week's tasks. They are saved by hand in My pages: nothing here is
 * fetched, and each opens its article in a new tab. With none saved, Home shows nothing.
 */
export function HomeHeadlines({ className = '' }: { className?: string }) {
  const headlines = useCompass((s) => s.headlines), today = useToday();
  if (headlines.length === 0) return null;
  return (
    <section aria-labelledby="home-headlines-title" data-home-headlines className={`min-w-0 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="home-headlines-title" className="text-[20px] leading-[1.3]">Headlines</h2>
        <p className="text-[13.5px] font-semibold text-text-muted">Saved by you</p>
      </div>
      <ul className="mt-1.5">{latestHeadlines(headlines, SHOWN).map((h) => <HeadlineRow key={h.id} headline={h} today={today} />)}</ul>
      {headlines.length > SHOWN && <Link to="/pages/headlines" className="flex min-h-11 w-fit items-center rounded-[9px] text-[14.5px] font-semibold text-text-link">All headlines</Link>}
    </section>
  );
}

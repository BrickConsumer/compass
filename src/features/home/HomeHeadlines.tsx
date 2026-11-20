import { Link } from 'react-router';
import { shownHeadlines, updatedWords, watchWords } from '../../domain/fetched';
import { useFetched } from '../../state/fetched';
import { useCompass } from '../../state/store';
import { useToday } from '../../state/useToday';
import { HeadlineRow } from '../pages/Headlines';

/** How many headlines Home shows. The rest are on their own page in My pages. */
const SHOWN = 3;

/**
 * Headlines on Home, under the week's tasks: three, each opening its article in a new tab.
 *
 * With "Fetch headlines" off, which is how Compass starts, they are the newest three saved by hand, and with none
 * saved Home shows nothing. With it on they are saved and fetched together: the ones that name a line of the
 * Watchlist first, then the newest, and each row says where it is from. Which ones to show is worked out here, on
 * the device.
 */
export function HomeHeadlines({ className = '' }: { className?: string }) {
  const headlines = useCompass((s) => s.headlines), on = useCompass((s) => s.settings.headlines === true), pages = useCompass((s) => s.pages);
  const list = useFetched((s) => s.list), failed = useFetched((s) => s.failed), today = useToday();
  const rows = on ? shownHeadlines(headlines, list, watchWords(pages), today) : shownHeadlines(headlines, null, [], today);
  // with the switch on and no list to be had, Home says so, so that a switch that seems to do nothing is explained
  const unreached = on && failed && !list;
  if (rows.length === 0 && !unreached) return null;
  const corner = !on ? 'Saved by you' : list ? updatedWords(list.checked, new Date()) : failed ? updatedWords(null, new Date()) : '';
  return (
    <section aria-labelledby="home-headlines-title" data-home-headlines className={`min-w-0 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="home-headlines-title" className="text-[20px] leading-[1.3]">Headlines</h2>
        {corner && <p data-headlines-updated className="text-[13.5px] font-semibold text-text-muted">{corner}</p>}
      </div>
      {rows.length > 0
        ? <ul className="mt-1.5">{rows.slice(0, SHOWN).map((row) => <HeadlineRow key={row.key} row={row} today={today} mixed={on} />)}</ul>
        : <p className="mt-1.5 text-[14.5px] text-text-muted">Compass could not reach the list of headlines just now.</p>}
      {rows.length > SHOWN && <Link to="/pages/headlines" className="flex min-h-11 w-fit items-center rounded-[9px] text-[14.5px] font-semibold text-text-link">All headlines</Link>}
    </section>
  );
}

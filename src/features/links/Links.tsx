import { ArrowUpRight, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { LINK_LIMITS } from '../../domain/links';
import type { QuickLink } from '../../domain/types';
import { useCompass } from '../../state/store';

/** One link to another site. It opens in a new tab that cannot reach back, and it says so. Compass fetches nothing from it. */
const Out = ({ link, className }: { link: QuickLink; className: string }) => (
  <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`${link.name}, opens in a new tab`} className={className}>
    <span className="truncate">{link.name}</span><ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" className="shrink-0 text-text-subtle" />
  </a>
);

/** The links in the rail, under the places, where the rail has room for words. Its label is the way to change them. */
export function RailLinks() {
  const links = useCompass((s) => s.links);
  if (links.length === 0) return null;
  return (
    <div data-links="rail" className="-mt-1 px-2.5 max-lg:hidden">
      <Link to="/settings#links" title="Change your links" className="flex h-7 w-fit items-center rounded-xs text-[12.5px] font-semibold text-text-subtle hover:text-text">Links</Link>
      <ul>{links.map((l) => <li key={l.id}><Out link={l} className="flex h-9 items-center justify-between gap-2 rounded-xs text-[14px] font-medium text-text-muted hover:text-text" /></li>)}</ul>
    </div>
  );
}

/** The links at the foot of Home, for screens whose rail has no room for them. */
export function HomeLinks({ className = '' }: { className?: string }) {
  const links = useCompass((s) => s.links);
  if (links.length === 0) return null;
  const full = links.length >= LINK_LIMITS.max;
  return (
    <section data-links="home" aria-labelledby="links-title" className={`min-w-0 ${className}`}>
      <h2 id="links-title" className="text-[20px] leading-[1.3]">Links</h2>
      <ul className="mt-1.5 grid grid-cols-2 gap-x-6">
        {links.map((l, i) => <li key={l.id} className={`min-w-0 ${i > 1 ? 'border-t border-line' : ''}`}><Out link={l} className="flex min-h-[50px] items-center justify-between gap-2 rounded-xs text-[15px] font-semibold sm:min-h-11 sm:text-[14.5px]" /></li>)}
      </ul>
      <Link to="/settings#links" className="flex min-h-[46px] items-center gap-3.5 rounded-xs border-t border-line text-[16px] font-medium text-text-muted sm:text-[14.5px]">
        {!full && <span aria-hidden="true" className="grid size-[22px] place-items-center rounded-[7px] shadow-[inset_0_0_0_1.5px_var(--color-paper-300)]"><Plus size={13} strokeWidth={2.4} /></span>}
        {full ? 'Change your links' : 'Add a link'}
      </Link>
    </section>
  );
}

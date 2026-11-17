import { ArrowLeft, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { longDate, shortDay } from '../../domain/dates';
import { aimOf, isReached, kindOf, PAGE_KINDS, PAGE_LIMITS, pageLine, pagesAsText, sortPages } from '../../domain/pages';
import { type Page, type PageKind, SUBJECT_COLOURS } from '../../domain/types';
import { useCompass } from '../../state/store';
import { useToday } from '../../state/useToday';
import { chip } from '../../ui/EditorFrame';
import { toast } from '../../ui/Toast';
import { KindIcon, PageEditor } from './PageEditor';
import { PageItems } from './PageItems';

const quiet = 'min-h-11 cursor-pointer rounded-[9px] px-1 text-[14.5px] font-semibold text-text-link sm:min-h-9';
const outline = 'h-11 cursor-pointer rounded-md bg-surface-sheet px-3.5 text-[13.5px] font-semibold shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well sm:h-9';
const HINTS: Record<PageKind, string> = { note: 'Start writing', checklist: 'Anything worth keeping with this list', goal: 'Why this matters to you', reading: 'Notes on what you read', project: 'Anything worth keeping about this project' };

/** One page: its title, its list and its writing, in the order its kind puts them. */
function PageSheet({ page, fresh }: { page: Page; fresh: boolean }) {
  const subjects = useCompass((s) => s.subjects), update = useCompass((s) => s.updatePage), setReached = useCompass((s) => s.setReached);
  // a page just made opens its editor, with its title ready to type
  const [editing, setEditing] = useState(fresh), [wantsList, setWantsList] = useState(false);
  useEffect(() => { if (fresh) setEditing(true); }, [fresh]);
  const k = kindOf(page.kind), subject = subjects.find((s) => s.id === page.subjectId), aim = aimOf(page), reached = isReached(page);
  const facts = [subject?.name, aim && `aim for ${longDate(aim)}`, reached && `reached ${shortDay(page.reachedOn!)}`].filter(Boolean).join(', ');

  const list = k.listFirst || page.items.length > 0 || wantsList
    ? <PageItems page={page} />
    // a note is mostly writing, so its list waits until it is asked for
    : <div><button type="button" onClick={() => setWantsList(true)} className={quiet} data-add-list>Add a list</button></div>;
  const writing = (
    <div className="flex flex-col gap-2">
      <label htmlFor="page-text" className={page.kind === 'note' ? 'sr-only' : 'font-display text-[20px] font-medium leading-[1.3]'}>{k.text}</label>
      <textarea id="page-text" rows={page.kind === 'note' ? 10 : 4} maxLength={PAGE_LIMITS.text} value={page.text} onChange={(e) => update(page.id, { text: e.target.value })} placeholder={HINTS[page.kind]}
        className="rounded-md bg-surface-sheet px-3 py-2.5 text-[16px] leading-[1.5] text-text shadow-[inset_0_0_0_1.5px_var(--color-control)] placeholder:text-text-muted sm:text-[15.5px]" />
    </div>
  );

  return (
    <section aria-labelledby="page-title" data-kind={page.kind} className="flex flex-col gap-7 rounded-xl bg-surface-sheet px-5 pb-5 pt-[18px] shadow-sheet ring-1 ring-line max-sm:-mx-4 max-sm:rounded-[26px]">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 id="page-title" className="flex min-w-0 items-center gap-3 text-[25px] leading-[1.2]"><KindIcon kind={page.kind} size={22} /><span className="truncate">{page.title}</span></h2>
          <button type="button" onClick={() => setEditing(true)} className={`${quiet} shrink-0`} data-edit-page>Edit page</button>
        </div>
        {facts && (
          <p className="mt-1 flex items-center gap-2 text-[14.5px] text-text-muted" data-page-facts>
            {subject && <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: SUBJECT_COLOURS[subject.colour].dot }} />}
            <span>{facts[0]!.toUpperCase() + facts.slice(1)}</span>
          </p>
        )}
      </div>
      {k.listFirst ? <>{list}{writing}</> : <>{writing}{list}</>}
      {page.kind === 'goal' && (
        <div>
          {reached
            ? <button type="button" onClick={() => setReached(page.id, false)} className={outline}>Reopen this goal</button>
            : <button type="button" onClick={() => { setReached(page.id, true); toast('Goal reached. It is kept below your open pages.'); }} className={outline}>Mark as reached</button>}
        </div>
      )}
      <PageEditor id={editing ? page.id : null} onClose={() => setEditing(false)} />
    </section>
  );
}

/**
 * My pages: notes, checklists, goals, and reading and project pages, for what has no date.
 * On wider screens the pages are listed beside the one that is open; on phones the list comes first and a page opens on its own.
 */
export function PagesPage() {
  const today = useToday(), { pageId } = useParams(), location = useLocation(), navigate = useNavigate();
  const pages = useCompass((s) => s.pages), subjects = useCompass((s) => s.subjects), addPage = useCompass((s) => s.addPage);
  const [choosing, setChoosing] = useState(false), [filter, setFilter] = useState<PageKind | null>(null), kinds = useRef<HTMLUListElement>(null);
  const sorted = sortPages(pages), only = (list: Page[]) => (filter ? list.filter((p) => p.kind === filter) : list);
  // with no page chosen, wider screens open the most recently changed one; phones show the list
  const chosen = pages.find((p) => p.id === pageId), open = chosen ?? sorted.open[0] ?? sorted.reached[0];
  const fresh = !!open && (location.state as { fresh?: string } | null)?.fresh === open.id;
  // the note that a page was just made is used once, so going back to the page later does not open its editor again
  useEffect(() => { if (fresh) navigate(location.pathname, { replace: true, state: null }); }, [fresh, navigate, location.pathname]);
  useEffect(() => { if (choosing) kinds.current?.scrollIntoView({ block: 'nearest' }); }, [choosing]);

  const start = (kind: PageKind) => { const id = addPage(kind); setChoosing(false); setFilter(null); navigate(`/pages/${id}`, { state: { fresh: id } }); };
  const exportPages = () => {
    const url = URL.createObjectURL(new Blob([pagesAsText(pages, subjects, today)], { type: 'text/plain;charset=utf-8' })), a = document.createElement('a');
    a.href = url; a.download = `compass-pages-${today}.txt`;
    document.body.append(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Your pages were exported as a text file.');
  };
  const row = (p: Page) => (
    <li key={p.id} className="border-t border-line first:border-t-0">
      <Link to={`/pages/${p.id}`} data-page={p.id} aria-current={open?.id === p.id ? 'page' : undefined}
        className="grid min-h-[60px] grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 rounded-md px-3 py-2 outline-offset-0 hover:bg-surface-well lg:aria-[current=page]:bg-surface-well sm:pl-5">
        <KindIcon kind={p.kind} />
        <span className="min-w-0">
          <span className="block truncate text-[15.5px] font-semibold max-sm:text-[16px]">{p.title}</span>
          <span className="block truncate text-[13px] text-text-muted">{pageLine(p)}</span>
        </span>
      </Link>
    </li>
  );
  const present = PAGE_KINDS.filter((k) => pages.some((p) => p.kind === k.id));

  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-5 px-4 pb-32 pt-[max(16px,env(safe-area-inset-top,0px))] sm:px-5 sm:pb-12 lg:pl-1.5 lg:pr-7 lg:pt-8">
      <header className={`sm:pl-5 ${chosen ? 'max-lg:hidden' : ''}`}>
        <h1 className="text-[32px] leading-[1.1] tracking-[-0.012em] lg:text-[40px]">My pages</h1>
        <p className="mt-2 max-w-[52ch] text-pretty text-[15.5px] text-text-muted">Notes, checklists, goals, and reading and project pages. A place for what has no date.</p>
      </header>
      {chosen && <Link to="/pages" className="flex min-h-11 w-fit items-center gap-2 rounded-[9px] text-[14.5px] font-semibold text-text-link lg:hidden"><ArrowLeft size={17} aria-hidden="true" />All pages</Link>}

      <div className="grid items-start gap-x-8 gap-y-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <nav aria-label="My pages" className={chosen ? 'max-lg:hidden' : ''} onKeyDown={(e) => { if (e.key === 'Escape') setChoosing(false); }}>
          {/* with a long list, the kinds in use become a way to narrow it */}
          {pages.length > 8 && (
            <div className="mb-2 flex flex-wrap gap-2 px-3 sm:pl-5" role="group" aria-label="Show">
              <button type="button" aria-pressed={!filter} onClick={() => setFilter(null)} className={chip(!filter)}>All</button>
              {present.map((k) => <button key={k.id} type="button" aria-pressed={filter === k.id} onClick={() => setFilter(k.id)} className={chip(filter === k.id)}>{k.label}</button>)}
            </div>
          )}
          <ul data-open-pages>{only(sorted.open).map(row)}</ul>
          {only(sorted.reached).length > 0 && (
            <>
              <h2 className="px-3 pb-1 pt-5 font-sans text-[13px] font-semibold text-text-muted sm:pl-5">Reached</h2>
              <ul data-reached-pages>{only(sorted.reached).map(row)}</ul>
            </>
          )}
          {pages.length === 0
            ? <p className="max-w-[44ch] text-pretty px-3 pb-2 text-[15px] text-text-muted sm:pl-5">No pages yet. This is the place for what has no date: a packing list, the books for a subject, something to get better at. Start one below.</p>
            : (
              // the rule above is on a wrapper, so the button's rounded corners do not bend it
              <div className="border-t border-line"><button type="button" onClick={() => setChoosing(!choosing)} aria-expanded={choosing} data-new-page
                className="flex min-h-[46px] w-full cursor-pointer items-center gap-1 rounded-md px-3 text-left hover:bg-surface-well max-sm:min-h-[54px] sm:pl-5">
                <span aria-hidden="true" className="-ml-[11px] grid size-11 shrink-0 place-items-center text-text-muted">
                  <span className="grid size-[22px] place-items-center rounded-[7px] shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]"><Plus size={13} strokeWidth={2.4} /></span>
                </span>
                <span className={`text-[15px] max-sm:text-[16px] ${choosing ? 'font-semibold' : 'text-text-muted'}`}>New page</span>
              </button></div>
            )}
          {(choosing || pages.length === 0) && (
            <ul ref={kinds} aria-label="Kinds of page" data-kinds className="mx-1 mt-1 rounded-lg bg-surface-sheet p-1.5 shadow-float sm:ml-3">
              {PAGE_KINDS.map((k) => (
                <li key={k.id}>
                  <button type="button" onClick={() => start(k.id)} data-kind={k.id} className="grid min-h-[52px] w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 rounded-[10px] px-2.5 py-1.5 text-left hover:bg-surface-well">
                    <KindIcon kind={k.id} />
                    <span><span className="block text-[15px] font-semibold">{k.label}</span><span className="block text-[13px] text-text-muted">{k.hint}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {pages.length > 0 && <div className="mt-3 px-3 sm:pl-5"><button type="button" onClick={exportPages} className={quiet} data-export>Export my pages</button></div>}
        </nav>
        {/* keyed by the page, so what was open on one page does not carry to the next */}
        {open && <div className={chosen ? '' : 'max-lg:hidden'}><PageSheet key={open.id} page={open} fresh={fresh} /></div>}
      </div>
    </main>
  );
}

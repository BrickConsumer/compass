import { ArrowUpRight, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { dayWords, fetchedRows, hasWatchlist, isStale, type Shown, shownHeadlines, updatedWords, watchWords } from '../../domain/fetched';
import { FEED_SOURCES } from '../../domain/feeds';
import { cleanHeadline, INTEREST_LIMITS } from '../../domain/interests';
import { cleanUrl } from '../../domain/links';
import type { ISODate } from '../../domain/types';
import { useFetched } from '../../state/fetched';
import { useCompass } from '../../state/store';
import { useToday } from '../../state/useToday';
import { DraftInput } from '../../ui/DraftField';
import { EditorFrame } from '../../ui/EditorFrame';
import { LinkField } from '../../ui/LinkField';
import { toast } from '../../ui/Toast';

const quiet = 'min-h-11 cursor-pointer rounded-[9px] px-1 text-[14.5px] font-semibold text-text-link sm:min-h-9';
const label = 'flex flex-col gap-1.5 text-[13.5px] font-medium text-text-muted';
const field = 'h-11 rounded-md bg-surface-sheet px-3 text-[16px] font-normal text-text shadow-[inset_0_0_0_1.5px_var(--color-control)]';

/** What is said when the most headlines are saved and another is asked for. */
const FULL = `${INTEREST_LIMITS.headlines} headlines are saved, which is the most. Delete one to save another.`;

/**
 * One headline, saved or fetched: its title, which opens the article in a new tab, then a small label, who published
 * it and the day. The label is a saved headline's own tag, or the line of the Watchlist that the headline names.
 * Where saved and fetched are shown together (`mixed`), a saved one says that it is. On the Headlines page a saved
 * one can be changed, and a fetched one kept. On Home the rows sit closer on a wide screen (`dense`), where a pointer
 * is doing the pressing, so that Home is seen whole.
 */
export function HeadlineRow({ row, today, mixed = false, dense = false, onEdit, onKeep }: { row: Shown; today: ISODate; mixed?: boolean; dense?: boolean; onEdit?: (id: string) => void; onKeep?: (row: Shown) => void }) {
  const mark = row.tag || row.word;
  return (
    <li data-headline={row.id} data-fetched-row={row.kind === 'fetched' ? '' : undefined} className={`border-t border-line py-1.5 first:border-t-0 ${dense ? 'lg:py-1' : ''}`}>
      <a href={row.url} target="_blank" rel="noopener noreferrer" aria-label={`${row.title}, opens in a new tab`}
        className={`flex min-h-11 items-center justify-between gap-3 rounded-[9px] text-[14.5px] font-semibold leading-[1.35] outline-offset-0 hover:bg-surface-well ${dense ? 'lg:min-h-9' : ''}`}>
        <span className={`min-w-0 py-1 [overflow-wrap:anywhere] ${dense ? 'lg:py-0.5' : ''}`}>{row.title}</span>
        <ArrowUpRight size={15} aria-hidden="true" className="shrink-0 text-text-muted" />
      </a>
      <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-text-muted">
        {mark && <span data-headline-mark className="min-w-0 rounded-[5px] px-1.5 text-[12.5px] font-semibold shadow-[inset_0_0_0_1px_var(--color-line-strong)] [overflow-wrap:anywhere]">{mark}</span>}
        <span className="min-w-0 [overflow-wrap:anywhere]">{row.source}, {dayWords(row.date, today)}</span>
        {mixed && row.kind === 'saved' && <span data-saved-by-you className="font-semibold">Saved by you</span>}
        {onEdit && row.id && <button type="button" onClick={() => onEdit(row.id!)} aria-label={`Edit ${row.title}`} className={`${quiet} ml-auto`}>Edit</button>}
        {onKeep && row.keep && <button type="button" data-keep onClick={() => onKeep(row)} aria-label={`Keep ${row.title}`} className={`${quiet} ml-auto`}>Keep</button>}
      </p>
    </li>
  );
}

/** The sources that are on, as the credits name them: "The Conversation (Creative Commons) and the Reserve Bank of Australia (CC BY 4.0)". */
const CREDITS = FEED_SOURCES.filter((s) => s.on).map((s, n) => `${n > 0 && s.name.startsWith('Reserve') ? 'the ' : ''}${s.name} (${s.licence})`).join(' and ');

/** How many watch words the page writes out before it says how many more there are. */
const WORDS_SHOWN = 8;
/** How many fetched headlines the page shows before it is asked for the rest, so that the saved ones are never far down. */
const FIRST = 8;

/**
 * The fetched headlines, on the Headlines page while "Fetch headlines" is on: the newest eight in the list, and the
 * rest when asked, with how old the list is, what is being watched for and who published them. "Keep" saves one by
 * hand, so that it stays after it has left the list.
 */
function FetchedPart({ today }: { today: ISODate }) {
  const headlines = useCompass((s) => s.headlines), pages = useCompass((s) => s.pages), list = useFetched((s) => s.list), failed = useFetched((s) => s.failed);
  const words = watchWords(pages), rows = fetchedRows(headlines, list, words), now = new Date();
  const [all, setAll] = useState(false), shown = all ? rows : rows.slice(0, FIRST);
  // "Keep" takes its row out of this list. The keyboard goes to the row that takes its place, or to the heading
  const part = useRef<HTMLElement>(null), next = useRef<number | null>(null);
  useEffect(() => {
    if (next.current === null) return;
    const keeps = part.current?.querySelectorAll<HTMLElement>('[data-keep]') ?? [], to = keeps[Math.min(next.current, keeps.length - 1)];
    next.current = null;
    (to ?? part.current?.querySelector<HTMLElement>('[data-fetched-title]'))?.focus();
  });
  const keep = (row: Shown) => {
    const store = useCompass.getState(), at = rows.findIndex((r) => r.key === row.key);
    // the line of the Watchlist it names goes with it as its tag, when it is short enough to be one
    const id = store.addHeadline({ title: row.title, url: row.url, source: row.source, date: row.date, tag: row.word && row.word.length <= INTEREST_LIMITS.tag ? row.word : '' });
    // sixty saved is the one thing that refuses a headline from the list. Anything else would be a fault, and is not called that
    if (!id) return toast(store.headlines.length >= INTEREST_LIMITS.headlines ? FULL : 'That headline could not be kept.');
    if (document.activeElement instanceof HTMLElement && part.current?.contains(document.activeElement)) next.current = at;
    toast('Headline saved.', { label: 'Undo', run: () => { useCompass.getState().deleteHeadline(id); } });
  };
  const said = failed
    ? `Compass could not reach the list just now.${list ? '' : ' Your saved headlines are below.'}`
    : !list ? 'Fetching the list.'
    : isStale(list.checked, now) ? 'The list has not been updated for a while.'
    : list.items.length === 0 ? 'No headlines in the list just now.'
    : rows.length === 0 ? 'You have saved every headline in the list.' : '';
  return (
    <section ref={part} aria-labelledby="fetched-title" data-fetched className="mt-1">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="fetched-title" data-fetched-title tabIndex={-1} className="rounded-[4px] text-[20px] leading-[1.3]">Fetched</h3>
        {(list || failed) && <p data-headlines-updated className="text-[13.5px] font-semibold text-text-muted">{updatedWords(list?.checked ?? null, now)}</p>}
      </div>
      {said && <p data-fetched-said className="mt-1 text-[14.5px] text-text-muted">{said}</p>}
      {shown.length > 0 && <ul className="mt-1.5">{shown.map((row) => <HeadlineRow key={row.key} row={row} today={today} onKeep={keep} />)}</ul>}
      {rows.length > FIRST && <div className="border-t border-line"><button type="button" data-fetched-more aria-expanded={all} onClick={() => setAll((v) => !v)} className={`${quiet} -ml-1 mt-1 min-h-11`}>{all ? 'Show fewer' : `Show all ${rows.length}`}</button></div>}
      <p data-watching className="mt-3 max-w-[60ch] text-pretty text-[13.5px] text-text-muted [overflow-wrap:anywhere]">
        {words.length > 0
          ? `Watching for ${words.slice(0, WORDS_SHOWN).join(', ')}${words.length > WORDS_SHOWN ? ` and ${words.length - WORDS_SHOWN} more` : ''}: the lines of your Watchlist page. Headlines that name one come first on Home.`
          : hasWatchlist(pages)
            ? 'Your Watchlist page has no lines yet. Add a name to it as headlines write it, Commonwealth Bank and not CBA, and headlines that name it come first on Home.'
            : 'Make a page called Watchlist, and headlines that name a line of it come first on Home. Write a name as headlines write it: Commonwealth Bank, not CBA.'}
      </p>
      <p data-credits className="mt-1 max-w-[60ch] text-pretty text-[13.5px] text-text-muted [overflow-wrap:anywhere]">From {CREDITS}. Each opens on its publisher's site. It is the same list for everyone, and nothing about you is sent.</p>
    </section>
  );
}

type EditingHeadline = { id: string } | { fresh: true };

/**
 * The Headlines page. With "Fetch headlines" off, which is how Compass starts, it is every saved headline, newest
 * first by the day it was published: nothing is fetched, and a headline is what was typed. With it on, the fetched
 * ones come first and the saved ones follow. Three are also on Home.
 */
export function HeadlinesSheet() {
  const headlines = useCompass((s) => s.headlines), on = useCompass((s) => s.settings.headlines === true), today = useToday(), location = useLocation(), navigate = useNavigate();
  const [editing, setEditing] = useState<EditingHeadline | null>(null);
  // "Save a headline" in search comes here asking for the editor. The asking is used once, so coming back later does not open it again
  const asked = !!(location.state as { add?: boolean } | null)?.add;
  useEffect(() => {
    if (!asked) return;
    // with the most saved there is no row here to save another, so this way in says why and opens nothing
    if (useCompass.getState().headlines.length >= INTEREST_LIMITS.headlines) toast(FULL);
    else setEditing({ fresh: true });
    navigate(location.pathname, { replace: true, state: null });
  }, [asked, navigate, location.pathname]);
  const all = shownHeadlines(headlines, null, [], today);
  return (
    <section aria-labelledby="headlines-title" data-headlines className="flex flex-col gap-3 rounded-xl bg-surface-sheet px-5 pb-5 pt-[18px] shadow-sheet ring-1 ring-line max-sm:-mx-4 max-sm:rounded-[26px]">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="headlines-title" className="text-[25px] leading-[1.2]">Headlines</h2>
          {!on && <p className="text-[13.5px] font-semibold text-text-muted">Saved by you</p>}
        </div>
        {on
          ? <p className="mt-1 max-w-[60ch] text-pretty text-[14.5px] text-text-muted">Each one opens its article in a new tab. Home shows three: the ones that name a line of your Watchlist first, then the newest.</p>
          : <>
            <p className="mt-1 max-w-[60ch] text-pretty text-[14.5px] text-text-muted">Each one opens its article in a new tab. Compass fetches nothing: a headline is what you typed. The newest three show on Home.</p>
            <p data-fetch-offer className="mt-1 max-w-[60ch] text-pretty text-[14.5px] text-text-muted">Compass can also fetch headlines from a public list. <Link to="/settings#headlines" className="inline-flex min-h-11 items-center rounded-[6px] font-semibold text-text-link sm:min-h-0">Switch it on in Settings</Link></p>
          </>}
      </div>
      {on && <FetchedPart today={today} />}
      <div className={on ? 'mt-2' : ''}>
        {on && <h3 id="saved-title" className="text-[20px] leading-[1.3]">Saved by you</h3>}
        {all.length === 0 && <p className={`text-[15px] text-text-muted ${on ? 'mt-1.5' : ''}`}>None saved yet.</p>}
        <ul className={on ? 'mt-1.5' : ''}>{all.map((row) => <HeadlineRow key={row.key} row={row} today={today} onEdit={(id) => setEditing({ id })} />)}</ul>
        {headlines.length < INTEREST_LIMITS.headlines && (
          <div className={all.length ? 'border-t border-line' : ''}><button type="button" onClick={() => setEditing({ fresh: true })} data-add-headline
            className="flex min-h-[46px] w-full cursor-pointer items-center gap-1 rounded-[9px] text-left text-[15px] text-text-muted outline-offset-0 hover:bg-surface-well max-sm:min-h-[54px] max-sm:text-[16px]">
            <span aria-hidden="true" className="-ml-[11px] grid size-11 shrink-0 place-items-center"><span className="grid size-[22px] place-items-center rounded-[7px] shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]"><Plus size={13} strokeWidth={2.4} /></span></span>
            Save a headline
          </button></div>
        )}
      </div>
      <HeadlineEditor editing={editing} today={today} onClose={() => setEditing(null)} />
    </section>
  );
}

/**
 * Save a headline, or change one. A new one is saved with its button, once it has a title and a web address; an
 * existing one saves as it is changed. With no source typed, the name of the site is used.
 */
function HeadlineEditor({ editing, today, onClose }: { editing: EditingHeadline | null; today: ISODate; onClose: () => void }) {
  const store = useCompass(), existing = editing && 'id' in editing ? store.headlines.find((h) => h.id === editing.id) : undefined, isNew = !!editing && 'fresh' in editing;
  const blank = { title: '', url: '', source: '', date: today, tag: '' };
  const [draft, setDraft] = useState(blank), [refused, setRefused] = useState(false);
  // a new headline starts empty and dated today. The day is read when the editor opens and not watched, so one
  // being typed as midnight passes is not emptied
  const day = useRef(today);
  day.current = today;
  useEffect(() => { if (editing && 'fresh' in editing) { setDraft({ title: '', url: '', source: '', date: day.current, tag: '' }); setRefused(false); } }, [editing]);
  // it was deleted elsewhere: nothing left to edit
  useEffect(() => { if (editing && 'id' in editing && !existing) onClose(); }, [editing, existing, onClose]);
  const value = existing ?? draft;
  const change = (patch: Partial<typeof blank>) => { if (existing) return store.updateHeadline(existing.id, patch); setDraft((d) => ({ ...d, ...patch })); return true; };
  // an address is kept only if it is one. An empty box on a new headline is not wrong yet, only not ready
  const address = (url: string) => (existing ? store.updateHeadline(existing.id, { url }) : (setDraft((d) => ({ ...d, url })), !url.trim() || cleanUrl(url) !== null));
  const ready = cleanHeadline(draft) !== null;
  // a new one is saved whole. All that refuses a headline that is ready is that the most are saved already
  const save = (d: typeof blank, close: () => void) => {
    if (!isNew || store.addHeadline(d)) close();
    else if (cleanHeadline(d)) setRefused(true);
  };
  const remove = () => {
    if (!existing) return;
    const gone = store.deleteHeadline(existing.id);
    onClose();
    if (gone) toast('Headline deleted.', { label: 'Undo', run: () => useCompass.getState().restoreHeadline(gone.headline, gone.index) });
  };
  return (
    <EditorFrame open={!!editing && (isNew || !!existing)} anchor={existing ? `li[data-headline="${CSS.escape(existing.id)}"]` : '[data-add-headline]'} title={isNew ? 'Save a headline' : 'Edit headline'} labelId="headline-editor-title" onClose={onClose} fresh={isNew}>
      {(close) => (
        <form method="dialog" className="contents" onSubmit={(e) => { e.preventDefault(); save(draft, close); }}>
          <label className={label}>Headline
            <DraftInput required maxLength={INTEREST_LIMITS.headline} value={value.title} onSave={(title) => { change({ title }); }} className={field} />
          </label>
          {/* Enter saves a new headline from any of its boxes, this one included, once the address is one */}
          <LinkField label="Address" value={value.url} onCommit={address} onEnter={isNew ? (url) => save({ ...draft, url }, close) : undefined}
            // a new headline's button is ready as soon as the address is one, without the box having to be left first
            onType={isNew ? (url) => setDraft((d) => ({ ...d, url })) : undefined} className={field} />
          <label className={label}>Source
            <DraftInput maxLength={INTEREST_LIMITS.source} value={existing ? existing.source : draft.source} onSave={(source) => { change({ source }); }} className={field} />
            <span className="font-normal">Where it is from. Left empty, it is the name of the site.</span>
          </label>
          <div className="flex flex-wrap items-end gap-3">
            <label className={label}>Published
              <input type="date" required value={value.date} onChange={(e) => { if (e.target.value) change({ date: e.target.value }); }} className={`${field} w-fit`} />
            </label>
            <label className={label}>Tag
              <DraftInput maxLength={INTEREST_LIMITS.tag} value={value.tag} onSave={(tag) => { change({ tag }); }} className={`${field} w-32`} />
            </label>
            <p className="basis-full text-[13.5px] text-text-muted">A tag is a short word for what it is about, such as a ticker. It can be left empty.</p>
          </div>
          {refused && <p role="alert" className="text-[14px] font-medium text-attention">{FULL}</p>}
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            {existing && <button type="button" onClick={remove} className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[14.5px] font-semibold text-attention hover:bg-attention-tint"><Trash2 size={15} aria-hidden="true" />Delete</button>}
            <button type="submit" disabled={isNew && !ready} className={`ml-auto min-h-11 cursor-pointer rounded-md bg-surface-inverse px-5 text-[14.5px] font-semibold text-text-inverse hover:bg-surface-inverse-hover disabled:cursor-default disabled:bg-surface-well disabled:text-text-muted ${isNew ? '' : 'sm:hidden'}`}>{isNew ? 'Save headline' : 'Done'}</button>
          </div>
        </form>
      )}
    </EditorFrame>
  );
}

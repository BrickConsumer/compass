import { ArrowUpRight, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { dayMonth } from '../../domain/dates';
import { cleanHeadline, INTEREST_LIMITS, latestHeadlines } from '../../domain/interests';
import { cleanUrl } from '../../domain/links';
import type { Headline, ISODate } from '../../domain/types';
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

/** The day a headline was published, with its year when that is not this one. */
const published = (date: ISODate, today: ISODate): string => (date.slice(0, 4) === today.slice(0, 4) ? dayMonth(date) : `${dayMonth(date)} ${date.slice(0, 4)}`);

/**
 * One saved headline: its title, which opens the article in a new tab, then its tag, where it is from and the day
 * it was published. On its own page it can also be changed.
 */
export function HeadlineRow({ headline: h, today, onEdit }: { headline: Headline; today: ISODate; onEdit?: (id: string) => void }) {
  return (
    <li data-headline={h.id} className="border-t border-line py-1.5 first:border-t-0">
      <a href={h.url} target="_blank" rel="noopener noreferrer" aria-label={`${h.title}, opens in a new tab`}
        className="flex min-h-11 items-center justify-between gap-3 rounded-[9px] text-[14.5px] font-semibold leading-[1.35] outline-offset-0 hover:bg-surface-well">
        <span className="min-w-0 py-1 [overflow-wrap:anywhere]">{h.title}</span>
        <ArrowUpRight size={15} aria-hidden="true" className="shrink-0 text-text-muted" />
      </a>
      <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-text-muted">
        {h.tag && <span className="rounded-[5px] px-1.5 text-[12.5px] font-semibold shadow-[inset_0_0_0_1px_var(--color-line-strong)]">{h.tag}</span>}
        <span className="min-w-0 [overflow-wrap:anywhere]">{h.source}, {published(h.date, today)}</span>
        {onEdit && <button type="button" onClick={() => onEdit(h.id)} aria-label={`Edit ${h.title}`} className={`${quiet} ml-auto`}>Edit</button>}
      </p>
    </li>
  );
}

type EditingHeadline = { id: string } | { fresh: true };

/**
 * Every saved headline, newest first by the day it was published. Compass fetches nothing: a headline is what was
 * typed, and its address opens in a new tab. The newest three are also on Home.
 */
export function HeadlinesSheet() {
  const headlines = useCompass((s) => s.headlines), today = useToday(), location = useLocation(), navigate = useNavigate();
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
  const all = latestHeadlines(headlines, headlines.length);
  return (
    <section aria-labelledby="headlines-title" data-headlines className="flex flex-col gap-3 rounded-xl bg-surface-sheet px-5 pb-5 pt-[18px] shadow-sheet ring-1 ring-line max-sm:-mx-4 max-sm:rounded-[26px]">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="headlines-title" className="text-[25px] leading-[1.2]">Headlines</h2>
          <p className="text-[13.5px] font-semibold text-text-muted">Saved by you</p>
        </div>
        <p className="mt-1 max-w-[60ch] text-pretty text-[14.5px] text-text-muted">Each one opens its article in a new tab. Compass fetches nothing: a headline is what you typed. The newest three show on Home.</p>
      </div>
      <div>
        {all.length === 0 && <p className="text-[15px] text-text-muted">None saved yet.</p>}
        <ul>{all.map((h) => <HeadlineRow key={h.id} headline={h} today={today} onEdit={(id) => setEditing({ id })} />)}</ul>
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
    <EditorFrame open={!!editing && (isNew || !!existing)} anchor={existing ? `li[data-headline="${CSS.escape(existing.id)}"]` : '[data-add-headline]'} title={isNew ? 'Save a headline' : 'Edit headline'} labelId="headline-editor-title" onClose={onClose}>
      {(close) => (
        <form method="dialog" className="contents" onSubmit={(e) => { e.preventDefault(); save(draft, close); }}>
          <label className={label}>Headline
            <DraftInput required maxLength={INTEREST_LIMITS.headline} value={value.title} onSave={(title) => { change({ title }); }} className={field} />
          </label>
          {/* Enter saves a new headline from any of its boxes, this one included, once the address is one */}
          <LinkField label="Address" value={value.url} onCommit={address} onEnter={isNew ? (url) => save({ ...draft, url }, close) : undefined} className={field} />
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

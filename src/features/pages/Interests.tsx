import { ArrowLeft, Folder, Newspaper, Plus, Trash2 } from 'lucide-react';
import { type MouseEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { FORM_SETS, INTEREST_LIMITS, interestName, interestPages, type PageForm, startersIn } from '../../domain/interests';
import type { FormSet, Interest } from '../../domain/types';
import { useCompass } from '../../state/store';
import { DraftInput } from '../../ui/DraftField';
import { chip, EditorFrame } from '../../ui/EditorFrame';
import { toast } from '../../ui/Toast';

const small = 'px-3 pb-1 font-sans text-[13px] font-semibold text-text-muted sm:pl-5';
const quiet = 'min-h-11 cursor-pointer rounded-[9px] px-1 text-[14.5px] font-semibold text-text-link sm:min-h-9';
const rowClass = 'grid min-h-[52px] w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 rounded-md px-3 py-1.5 text-left outline-offset-0 hover:bg-surface-well sm:pl-5';
const label = 'flex flex-col gap-1.5 text-[13.5px] font-medium text-text-muted';
const field = 'h-11 rounded-md bg-surface-sheet px-3 text-[16px] font-normal text-text shadow-[inset_0_0_0_1.5px_var(--color-control)]';

const pagesLabel = (count: number): string => (count === 0 ? 'No pages' : count === 1 ? '1 page' : `${count} pages`);
export type EditingInterest = { id: string } | { fresh: true };

/**
 * The interests, above the pages in My pages' list: a folder for the pages that belong together. Choosing one shows
 * its pages. Headlines sit here too, since they are kept and are not a page.
 */
export function InterestList({ headlinesOpen, onChoose, onAdd }: { headlinesOpen: boolean; onChoose: (id: string) => void; onAdd: () => void }) {
  const interests = useCompass((s) => s.interests), pages = useCompass((s) => s.pages), headlines = useCompass((s) => s.headlines.length);
  return (
    <div data-interests className="mb-4">
      {/* it can be given the keyboard, for when the interest that was open has been deleted */}
      <h2 tabIndex={-1} data-interests-title className={`${small} rounded-[9px]`}>Interests</h2>
      <ul>
        {interests.map((it) => (
          <li key={it.id} data-interest={it.id} className="border-t border-line first:border-t-0">
            <button type="button" onClick={() => onChoose(it.id)} className={rowClass}>
              <Folder size={18} aria-hidden="true" className="shrink-0 text-text-muted" />
              <span className="truncate text-[15.5px] font-semibold max-sm:text-[16px]">{it.name}</span>
              <span className="text-[13px] text-text-muted">{pagesLabel(interestPages(pages, it.id).length)}</span>
            </button>
          </li>
        ))}
        <li className="border-t border-line first:border-t-0">
          <Link to="/pages/headlines" data-headlines-row aria-current={headlinesOpen ? 'page' : undefined} className={`${rowClass} lg:aria-[current=page]:bg-surface-well`}>
            <Newspaper size={18} aria-hidden="true" className="shrink-0 text-text-muted" />
            <span className="truncate text-[15.5px] font-semibold max-sm:text-[16px]">Headlines</span>
            <span className="text-[13px] text-text-muted">{headlines ? `${headlines} saved` : 'None saved'}</span>
          </Link>
        </li>
      </ul>
      {interests.length < INTEREST_LIMITS.max && (
        // the rule is on a wrapper, so the button's rounded corners do not bend it
        <div className="border-t border-line"><button type="button" onClick={onAdd} data-add-interest
          className="flex min-h-[46px] w-full cursor-pointer items-center gap-1 rounded-md px-3 text-left text-[15px] text-text-muted hover:bg-surface-well max-sm:min-h-[54px] max-sm:text-[16px] sm:pl-5">
          <span aria-hidden="true" className="-ml-[11px] grid size-11 shrink-0 place-items-center"><span className="grid size-[22px] place-items-center rounded-[7px] shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]"><Plus size={13} strokeWidth={2.4} /></span></span>
          Add an interest
        </button></div>
      )}
    </div>
  );
}

/** The head of the list while one interest is chosen: the way back, its name, and the way to change it. */
export function InterestHead({ interest, empty, onBack, onEdit }: { interest: Interest; empty: boolean; onBack: () => void; onEdit: () => void }) {
  return (
    <div data-interest-open={interest.id} className="px-3 pb-1 sm:pl-5">
      <button type="button" onClick={onBack} className="flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-[9px] text-[14.5px] font-semibold text-text-link sm:min-h-9"><ArrowLeft size={17} aria-hidden="true" />All pages</button>
      <div className="flex items-baseline justify-between gap-3">
        {/* the keyboard is put here when the list changes to this interest's, so its name is what is read out */}
        <h2 tabIndex={-1} data-interest-name className="min-w-0 rounded-[9px] text-[20px] leading-[1.3] [overflow-wrap:anywhere]">{interest.name}</h2>
        <button type="button" onClick={onEdit} aria-label={`Edit ${interest.name}`} className={`${quiet} shrink-0`} data-edit-interest>Edit</button>
      </div>
      {empty && <p className="mt-1 text-[14.5px] text-text-muted [overflow-wrap:anywhere]">Nothing kept in {interest.name} yet.</p>}
    </div>
  );
}

/** A press this soon after a page was started, in milliseconds, and this near where that press was, in pixels, is the same press again. */
const AGAIN = { within: 500, near: 30 };

/**
 * For a moment after a press that starts a page, the second press of a double press does nothing, wherever it lands.
 * Starting a page moves what is under the pointer: a button that came with a title goes and the next takes its place,
 * and the new page's row pushes the others down. Without this the second press starts another page, or opens another.
 * A mouse says which press of a run this is (`detail`). A finger may not, so a touch in the same place counts as one.
 */
function ignoreSecondPress(first: MouseEvent) {
  const byMouse = (first.nativeEvent as PointerEvent).pointerType === 'mouse', { clientX: x, clientY: y } = first;
  const swallow = (e: globalThis.MouseEvent) => {
    const sameSpot = Math.hypot(e.clientX - x, e.clientY - y) < AGAIN.near;
    if (e.detail > 1 || (e.detail === 1 && !byMouse && sameSpot)) { e.preventDefault(); e.stopPropagation(); }
  };
  document.addEventListener('click', swallow, true);
  window.setTimeout(() => document.removeEventListener('click', swallow, true), AGAIN.within);
}

/** What an interest can start in one press. A form opens with its title ready to type; a page that comes with a title opens ready to fill in. */
export function InterestStarters({ interest }: { interest: Interest }) {
  const pages = useCompass((s) => s.pages), startPage = useCompass((s) => s.startPage), navigate = useNavigate();
  const start = (form: PageForm, e: MouseEvent) => {
    const id = startPage(interest.id, form.id);
    if (!id) return;
    // a press by keyboard (`detail` is 0) has no second press to follow it
    if (e.detail > 0) ignoreSecondPress(e);
    navigate(`/pages/${id}`, form.title ? undefined : { state: { fresh: id } });
  };
  return (
    <div role="group" aria-label="Start a page" data-starters className="mt-2 flex flex-wrap items-center gap-2 border-t border-line px-3 pt-3 sm:pl-5">
      <p className="mr-1 basis-full text-[13.5px] font-semibold text-text-muted">Start one</p>
      {startersIn(interest, pages).map((form) => <button key={form.id} type="button" data-form={form.id} title={form.hint} onClick={(e) => start(form, e)} className={chip(false)}>{form.label}</button>)}
    </div>
  );
}

/**
 * Add an interest, or change one: its name and where it starts from. A new one is added with its button; an existing
 * one saves as it is changed. Deleting an interest keeps its pages.
 */
export function InterestEditor({ editing, onClose, onAdded, onDeleted }: { editing: EditingInterest | null; onClose: () => void; onAdded: (id: string) => void; onDeleted: () => void }) {
  const store = useCompass(), existing = editing && 'id' in editing ? store.interests.find((i) => i.id === editing.id) : undefined, isNew = !!editing && 'fresh' in editing;
  const [draft, setDraft] = useState<{ name: string; forms: FormSet }>({ name: '', forms: 'none' });
  useEffect(() => { if (editing && 'fresh' in editing) setDraft({ name: '', forms: 'none' }); }, [editing]);
  // it was deleted elsewhere: nothing left to edit
  useEffect(() => { if (editing && 'id' in editing && !existing) onClose(); }, [editing, existing, onClose]);
  const value = existing ?? draft, set = FORM_SETS.find((s) => s.id === value.forms)!;
  const change = (patch: { name?: string; forms?: FormSet }) => { if (existing) store.updateInterest(existing.id, patch); else setDraft((d) => ({ ...d, ...patch })); };
  const ready = !!interestName(draft.name, draft.forms);
  // The new interest opens once the editor has gone, and not before: the list behind an open editor cannot be given
  // the keyboard. Until then it is remembered here, which also makes a second press of "Add interest" do nothing.
  const added = useRef<string | null>(null);
  const add = (close: () => void) => { if (added.current) return; const id = store.addInterest(draft); if (id) { added.current = id; close(); } };
  const closed = () => { const id = added.current; added.current = null; onClose(); if (id) onAdded(id); };
  const remove = () => {
    if (!existing) return;
    const removed = store.deleteInterest(existing.id);
    onClose(); onDeleted();
    if (removed) toast(`${existing.name} deleted. Its pages are kept.`, { label: 'Undo', run: () => useCompass.getState().restoreInterest(removed) });
  };
  return (
    <EditorFrame open={!!editing && (isNew || !!existing)} anchor={existing ? '[data-edit-interest]' : '[data-add-interest]'} title={isNew ? 'Add an interest' : 'Edit interest'} labelId="interest-editor-title" onClose={closed}>
      {(close) => (
        <form method="dialog" className="contents" onSubmit={(e) => { e.preventDefault(); if (isNew) add(close); else close(); }}>
          <label className={label}>Name
            <DraftInput maxLength={INTEREST_LIMITS.name} value={value.name} onSave={(name) => change({ name })} placeholder={isNew && draft.forms !== 'none' ? set.label : undefined} className={`${field} placeholder:text-text-subtle`} />
          </label>
          <fieldset>
            <legend className="mb-2 text-[13.5px] font-medium text-text-muted">Start from</legend>
            <div className="flex flex-wrap gap-2">
              {FORM_SETS.map((s) => <button key={s.id} type="button" aria-pressed={value.forms === s.id} onClick={() => change({ forms: s.id })} className={chip(value.forms === s.id)}>{s.label}</button>)}
            </div>
            <p className="mt-2 text-[13.5px] text-text-muted">{set.hint}.</p>
          </fieldset>
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            {existing && <button type="button" onClick={remove} className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[14.5px] font-semibold text-attention hover:bg-attention-tint"><Trash2 size={15} aria-hidden="true" />Delete interest</button>}
            <button type="submit" disabled={isNew && !ready} className={`ml-auto min-h-11 cursor-pointer rounded-md bg-surface-inverse px-5 text-[14.5px] font-semibold text-text-inverse hover:bg-surface-inverse-hover disabled:cursor-default disabled:bg-surface-well disabled:text-text-muted ${isNew ? '' : 'sm:hidden'}`}>{isNew ? 'Add interest' : 'Done'}</button>
          </div>
        </form>
      )}
    </EditorFrame>
  );
}

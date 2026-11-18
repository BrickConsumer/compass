import { useState } from 'react';
import { LINK_LIMITS } from '../../domain/links';
import type { QuickLink } from '../../domain/types';
import { DraftInput } from '../../ui/DraftField';
import { toast } from '../../ui/Toast';
import { addButton, field, ListControls, note } from '../places/ListControls';

const WRONG = 'That does not look like a web address.';
const wrongLine = 'basis-full text-[14px] font-medium text-attention';
// an address is not prose: no capitals, no spelling, and the keyboard for addresses on a phone
const addressProps = { inputMode: 'url', autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false } as const;

/** What a list of links can do. The list does not know whose links they are: your own, in Settings, or a subject's. */
export interface LinkActions {
  onAdd: (input: { name: string; url: string }) => string | null;
  onUpdate: (id: string, patch: { name?: string; url?: string }) => boolean;
  onDelete: (id: string) => { link: QuickLink; index: number } | null;
  onRestore: (link: QuickLink, index: number) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}

/**
 * One link: its name and its address. The address is checked when the box is left or Enter is pressed, not as it is
 * typed, since half an address is never one. A refused address says so and stays in the box to be put right;
 * the link keeps the last good one.
 */
function LinkRow({ link, index, count, onUpdate, onDelete, onRestore, onMove }: { link: QuickLink; index: number; count: number } & Omit<LinkActions, 'onAdd'>) {
  const [draft, setDraft] = useState<string | null>(null), [wrong, setWrong] = useState(false);
  const commit = () => { if (draft === null) return; const ok = onUpdate(link.id, { url: draft }); setWrong(!ok); if (ok) setDraft(null); };
  const remove = () => {
    const removed = onDelete(link.id);
    if (removed) toast('Link removed.', { label: 'Undo', run: () => onRestore(removed.link, removed.index) });
  };
  return (
    <li className="flex flex-wrap items-center gap-2">
      <DraftInput value={link.name} maxLength={LINK_LIMITS.name} onSave={(name) => onUpdate(link.id, { name })} aria-label={`Link ${index + 1} name`} className={`${field} basis-full sm:basis-[11rem]`} />
      <input value={draft ?? link.url} onChange={(e) => { setDraft(e.target.value); setWrong(false); }} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
        aria-label={`Link ${index + 1} address`} aria-invalid={wrong} {...addressProps} className={`${field} basis-full sm:grow sm:basis-0`} />
      <ListControls name={link.name} first={index === 0} last={index === count - 1} onMove={(direction) => onMove(link.id, direction)} onRemove={remove} />
      {wrong && <p role="alert" className={wrongLine}>{WRONG}</p>}
    </li>
  );
}

/**
 * Links to other sites, to change: each one's name, address and place, remove with Undo, and a row to add one, up to six.
 * It renders the rows and the add row side by side with whatever is around them, so the place that uses it sets the spacing.
 */
export function LinkList({ links, addId, onAdd, ...row }: LinkActions & { links: QuickLink[]; addId?: string }) {
  const [name, setName] = useState(''), [url, setUrl] = useState(''), [wrong, setWrong] = useState(false);
  const label = 'flex basis-full flex-col gap-1 text-[13.5px] font-medium text-text-muted';
  return (
    <>
      {links.length > 0 && <ul className="flex flex-col gap-3 sm:gap-2">{links.map((l, i) => <LinkRow key={l.id} link={l} index={i} count={links.length} {...row} />)}</ul>}
      {links.length >= LINK_LIMITS.max
        ? <p className={note}>Six is the most.</p>
        : (
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (onAdd({ name, url })) { setName(''); setUrl(''); setWrong(false); } else setWrong(true); }}>
            <label className={`${label} sm:basis-[11rem]`}>Name<input id={addId} value={name} onChange={(e) => setName(e.target.value)} maxLength={LINK_LIMITS.name} className={`${field} font-normal`} /></label>
            <label className={`${label} sm:grow sm:basis-0`}>Address<input value={url} onChange={(e) => { setUrl(e.target.value); setWrong(false); }} aria-invalid={wrong} placeholder="investopedia.com" {...addressProps} className={`${field} font-normal placeholder:text-text-subtle`} /></label>
            <button type="submit" className={addButton}>Add link</button>
            {wrong && <p role="alert" className={wrongLine}>{WRONG}</p>}
          </form>
        )}
    </>
  );
}

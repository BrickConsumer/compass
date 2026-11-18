import { useState } from 'react';
import { LINK_LIMITS } from '../../domain/links';
import type { QuickLink } from '../../domain/types';
import { useCompass } from '../../state/store';
import { DraftInput } from '../../ui/DraftField';
import { toast } from '../../ui/Toast';
import { addButton, field, ListControls, note } from './ListControls';

const WRONG = 'That does not look like a web address.';
const wrongLine = 'basis-full text-[14px] font-medium text-attention';
// an address is not prose: no capitals, no spelling, and the keyboard for addresses on a phone
const addressProps = { inputMode: 'url', autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false } as const;

/**
 * One link: its name and its address. The address is checked when the box is left or Enter is pressed, not as it is
 * typed, since half an address is never one. A refused address says so and stays in the box to be put right;
 * the link keeps the last good one.
 */
function LinkRow({ link, index, count }: { link: QuickLink; index: number; count: number }) {
  const update = useCompass((s) => s.updateLink), move = useCompass((s) => s.moveLink);
  const [draft, setDraft] = useState<string | null>(null), [wrong, setWrong] = useState(false);
  const commit = () => { if (draft === null) return; const ok = update(link.id, { url: draft }); setWrong(!ok); if (ok) setDraft(null); };
  const remove = () => {
    const removed = useCompass.getState().deleteLink(link.id);
    if (removed) toast('Link removed.', { label: 'Undo', run: () => useCompass.getState().restoreLink(removed.link, removed.index) });
  };
  return (
    <li className="flex flex-wrap items-center gap-2">
      <DraftInput value={link.name} maxLength={LINK_LIMITS.name} onSave={(name) => update(link.id, { name })} aria-label={`Link ${index + 1} name`} className={`${field} basis-full sm:basis-[11rem]`} />
      <input value={draft ?? link.url} onChange={(e) => { setDraft(e.target.value); setWrong(false); }} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
        aria-label={`Link ${index + 1} address`} aria-invalid={wrong} {...addressProps} className={`${field} basis-full sm:grow sm:basis-0`} />
      <ListControls name={link.name} first={index === 0} last={index === count - 1} onMove={(direction) => move(link.id, direction)} onRemove={remove} />
      {wrong && <p role="alert" className={wrongLine}>{WRONG}</p>}
    </li>
  );
}

/** Links to other sites: name, address, order, remove with Undo, and add, up to six. Compass only opens them. */
export function LinksSettings() {
  const links = useCompass((s) => s.links), add = useCompass((s) => s.addLink);
  const [name, setName] = useState(''), [url, setUrl] = useState(''), [wrong, setWrong] = useState(false);
  const label = 'flex basis-full flex-col gap-1 text-[13.5px] font-medium text-text-muted';
  return (
    <div data-links-settings className="mt-2 flex flex-col gap-3">
      <p className={`${note} max-w-[56ch]`}>Sites you open often. They sit under the places on a wide screen and at the foot of Home on a narrow one, and open in a new tab. Up to six.</p>
      {links.length > 0 && <ul className="flex flex-col gap-3 sm:gap-2">{links.map((l, i) => <LinkRow key={l.id} link={l} index={i} count={links.length} />)}</ul>}
      {links.length >= LINK_LIMITS.max
        ? <p className={note}>Six is the most.</p>
        : (
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (add({ name, url })) { setName(''); setUrl(''); setWrong(false); } else setWrong(true); }}>
            <label className={`${label} sm:basis-[11rem]`}>Name<input id="new-link-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={LINK_LIMITS.name} className={`${field} font-normal`} /></label>
            <label className={`${label} sm:grow sm:basis-0`}>Address<input value={url} onChange={(e) => { setUrl(e.target.value); setWrong(false); }} aria-invalid={wrong} placeholder="investopedia.com" {...addressProps} className={`${field} font-normal placeholder:text-text-subtle`} /></label>
            <button type="submit" className={addButton}>Add link</button>
            {wrong && <p role="alert" className={wrongLine}>{WRONG}</p>}
          </form>
        )}
    </div>
  );
}

import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { kindOf, listCount, PAGE_LIMITS } from '../../domain/pages';
import type { Page, PageItem } from '../../domain/types';
import { useCompass } from '../../state/store';
import { SegmentedProgress } from '../../ui/SegmentedProgress';
import { toast } from '../../ui/Toast';

const quiet = 'min-h-11 cursor-pointer rounded-[9px] px-1 text-[14.5px] font-semibold text-text-link sm:min-h-9';
const tool = 'grid size-11 cursor-pointer place-items-center rounded-[9px] text-text-muted hover:bg-surface-well disabled:cursor-default disabled:text-paper-300 disabled:hover:bg-transparent sm:size-9';

/**
 * One line of a page's list. Its box is a task's box made smaller: familiar to tick, and plainly not a task.
 * Selecting the words edits them in place, with buttons to move the item or delete it.
 */
function ItemRow({ pageId, item, first, last, editing, onEdit }: { pageId: string; item: PageItem; first: boolean; last: boolean; editing: boolean; onEdit: (id: string | null) => void }) {
  const toggle = useCompass((s) => s.togglePageItem), edit = useCompass((s) => s.editPageItem), move = useCompass((s) => s.movePageItem);
  const [draft, setDraft] = useState(item.text);
  const commit = () => { edit(pageId, item.id, draft); onEdit(null); };
  const remove = () => {
    const gone = useCompass.getState().deletePageItem(pageId, item.id);
    onEdit(null);
    if (gone) toast('Item deleted.', { label: 'Undo', run: () => useCompass.getState().restorePageItem(pageId, gone.item, gone.index) });
  };
  // the buttons beside the words must not take focus from them, or leaving the box would save and close before the press landed
  const keep = (e: React.MouseEvent) => e.preventDefault();
  return (
    <li data-item={item.id} data-done={item.done} data-editing={editing || undefined}
      onBlur={editing ? (e) => { if (!e.currentTarget.contains(e.relatedTarget)) commit(); } : undefined}
      className="grid min-h-[46px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1 border-t border-line first:border-t-0 data-[editing=true]:bg-surface-well max-sm:min-h-[54px]">
      <label className="relative -ml-[11px] grid size-11 shrink-0 cursor-pointer place-items-center">
        <input type="checkbox" checked={item.done} onChange={() => toggle(pageId, item.id)} aria-label={item.text}
          className="peer size-[18px] cursor-pointer appearance-none rounded-[6px] shadow-[inset_0_0_0_1.5px_var(--color-control)] transition-colors duration-[140ms] ease-[var(--ease-out)] checked:bg-positive checked:shadow-none max-sm:size-[22px]" />
        <Check size={12} strokeWidth={3.2} aria-hidden="true" className="pointer-events-none absolute text-paper-0 opacity-0 transition-opacity duration-[140ms] peer-checked:opacity-100" />
      </label>
      {editing ? (
        <>
          <input autoFocus value={draft} maxLength={PAGE_LIMITS.item} aria-label={`Change ${item.text}`} enterKeyHint="done" onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } else if (e.key === 'Escape') onEdit(null); }}
            className="-ml-2 h-11 min-w-0 rounded-[9px] bg-surface-sheet pl-2 text-[15.5px] font-medium outline-offset-0 max-sm:text-[16px]" />
          <span className="flex items-center">
            <button type="button" className={tool} disabled={first} onMouseDown={keep} onClick={() => move(pageId, item.id, -1)} aria-label="Move up"><ArrowUp size={16} aria-hidden="true" /></button>
            <button type="button" className={tool} disabled={last} onMouseDown={keep} onClick={() => move(pageId, item.id, 1)} aria-label="Move down"><ArrowDown size={16} aria-hidden="true" /></button>
            <button type="button" className={`${tool} text-port-600`} onMouseDown={keep} onClick={remove} aria-label="Delete item"><Trash2 size={16} aria-hidden="true" /></button>
          </span>
        </>
      ) : (
        <button type="button" onClick={() => { setDraft(item.text); onEdit(item.id); }} aria-keyshortcuts="Space Delete"
          onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); toggle(pageId, item.id); } else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(); } }}
          className={`col-span-2 flex min-h-11 min-w-0 cursor-pointer items-center rounded-[9px] text-left text-[15.5px] font-medium outline-offset-0 max-sm:text-[16px] ${item.done ? 'text-text-muted line-through decoration-[rgb(14_36_58/0.35)]' : ''}`}>
          <span className="py-1.5 leading-[1.3]">{item.text}</span>
        </button>
      )}
    </li>
  );
}

/** A page's list: its name and count, its items, and a row to add one. Ticking an item earns nothing and shows nowhere else. */
export function PageItems({ page }: { page: Page }) {
  const k = kindOf(page.kind), c = listCount(page), add = useCompass((s) => s.addPageItem);
  const [text, setText] = useState(''), [editing, setEditing] = useState<string | null>(null);
  const untick = () => {
    const ticked = useCompass.getState().untickPageItems(page.id);
    if (ticked.length) toast('Every item unticked.', { label: 'Undo', run: () => useCompass.getState().tickPageItems(page.id, ticked) });
  };
  return (
    <div data-page-list>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 id="page-list-title" className="text-[20px] leading-[1.3]">{k.list}</h3>
        <div className="flex items-center gap-3 text-[13.5px] font-semibold text-text-muted">
          {page.kind === 'checklist' && c.done > 0 && <button type="button" onClick={untick} className={quiet} data-untick>Untick all</button>}
          <SegmentedProgress done={c.done} total={c.total} />
          {c.total > 0 && <span data-list-count>{c.done} of {c.total}</span>}
        </div>
      </div>
      <ul aria-labelledby="page-list-title" className="mt-1">
        {page.items.map((item, i) => <ItemRow key={item.id} pageId={page.id} item={item} first={i === 0} last={i === page.items.length - 1} editing={editing === item.id} onEdit={setEditing} />)}
      </ul>
      {page.items.length < PAGE_LIMITS.items
        ? (
          <form className={`flex min-h-[46px] items-center gap-1 max-sm:min-h-[54px] ${page.items.length ? 'border-t border-line' : ''}`} onSubmit={(e) => { e.preventDefault(); if (add(page.id, text)) setText(''); }}>
            <span aria-hidden="true" className="-ml-[11px] grid size-11 shrink-0 place-items-center text-text-muted">
              <span className="grid size-[22px] place-items-center rounded-[7px] shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]"><Plus size={13} strokeWidth={2.4} /></span>
            </span>
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={PAGE_LIMITS.item} aria-label={k.add} placeholder={k.add} enterKeyHint="done" data-add-item
              onKeyDown={(e) => { if (e.key === 'Escape') { setText(''); e.currentTarget.blur(); } }}
              className="h-11 w-full min-w-0 rounded-[9px] bg-transparent text-[15px] outline-offset-0 placeholder:text-text-muted max-sm:text-[16px]" />
          </form>
        )
        : <p className="border-t border-line pt-3 text-[14px] text-text-muted">This list is full at {PAGE_LIMITS.items} items.</p>}
    </div>
  );
}

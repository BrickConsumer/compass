import { useState } from 'react';
import { kindOf, listCount, PAGE_LIMITS } from '../../domain/pages';
import type { Page } from '../../domain/types';
import { useCompass } from '../../state/store';
import { AddRow, ListRow } from '../../ui/ListRows';
import { SegmentedProgress } from '../../ui/SegmentedProgress';
import { toast } from '../../ui/Toast';

const quiet = 'min-h-11 cursor-pointer rounded-[9px] px-1 text-[14.5px] font-semibold text-text-link sm:min-h-9';

/** A page's list: its name and count, its items, and a row to add one. Ticking an item earns nothing and shows nowhere else. */
export function PageItems({ page }: { page: Page }) {
  const k = kindOf(page.kind), c = listCount(page);
  const add = useCompass((s) => s.addPageItem), toggle = useCompass((s) => s.togglePageItem), edit = useCompass((s) => s.editPageItem), move = useCompass((s) => s.movePageItem);
  const [editing, setEditing] = useState<string | null>(null);
  const untick = () => {
    const ticked = useCompass.getState().untickPageItems(page.id);
    if (ticked.length) toast('Every item unticked.', { label: 'Undo', run: () => useCompass.getState().tickPageItems(page.id, ticked) });
  };
  const remove = (itemId: string) => {
    const gone = useCompass.getState().deletePageItem(page.id, itemId);
    if (gone) toast('Item deleted.', { label: 'Undo', run: () => useCompass.getState().restorePageItem(page.id, gone.item, gone.index) });
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
        {page.items.map((item, i) => (
          <ListRow key={item.id} item={item} first={i === 0} last={i === page.items.length - 1} editing={editing === item.id} onEditing={setEditing} maxLength={PAGE_LIMITS.item}
            onToggle={(id) => toggle(page.id, id)} onChange={(id, text) => edit(page.id, id, text)} onMove={(id, direction) => move(page.id, id, direction)} onDelete={remove} />
        ))}
      </ul>
      {page.items.length < PAGE_LIMITS.items
        ? <AddRow label={k.add} maxLength={PAGE_LIMITS.item} onAdd={(text) => add(page.id, text)} divided={page.items.length > 0} />
        : <p className="border-t border-line pt-3 text-[14px] text-text-muted">This list is full at {PAGE_LIMITS.items} items.</p>}
    </div>
  );
}

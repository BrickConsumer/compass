import { ArrowDown, ArrowUp, X } from 'lucide-react';

/** Shared by the lists in Settings whose items are named, ordered and removed: the rating areas and the links. */
export const field = 'h-11 min-w-0 rounded-md bg-surface-sheet px-3 text-[16px] text-text shadow-[inset_0_0_0_1.5px_var(--color-control)]';
export const addButton = 'min-h-11 shrink-0 cursor-pointer rounded-md px-4 text-[14.5px] font-semibold shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well';
export const note = 'text-[14.5px] text-text-muted';
const icon = 'grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-text-muted shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well disabled:cursor-default disabled:text-faint disabled:shadow-[inset_0_0_0_1px_var(--color-line)] disabled:hover:bg-transparent sm:size-9';

/** Move up, move down and remove for one item of a list. Each is named with the item, so it is clear what it acts on. */
export function ListControls({ name, first, last, onMove, onRemove }: { name: string; first: boolean; last: boolean; onMove: (direction: -1 | 1) => void; onRemove: () => void }) {
  return (
    <span className="ml-auto flex gap-2">
      <button type="button" className={icon} disabled={first} onClick={() => onMove(-1)} aria-label={`Move ${name} up`} title="Move up"><ArrowUp size={16} aria-hidden="true" /></button>
      <button type="button" className={icon} disabled={last} onClick={() => onMove(1)} aria-label={`Move ${name} down`} title="Move down"><ArrowDown size={16} aria-hidden="true" /></button>
      <button type="button" className={icon} onClick={onRemove} aria-label={`Remove ${name}`} title="Remove"><X size={16} aria-hidden="true" /></button>
    </span>
  );
}

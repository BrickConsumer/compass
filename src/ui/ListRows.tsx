import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

const tool = 'grid size-11 cursor-pointer place-items-center rounded-[9px] text-text-muted hover:bg-surface-well disabled:cursor-default disabled:text-faint disabled:hover:bg-transparent sm:size-9';

interface RowProps {
  item: { id: string; text: string; done?: boolean };
  first: boolean; last: boolean;
  editing: boolean;
  /** Which row is being changed, or none. One at a time, so the list holds it. */
  onEditing: (id: string | null) => void;
  /** With none, the row has no box to tick: a line that is only words. */
  onToggle?: (id: string) => void;
  onChange: (id: string, text: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onDelete: (id: string) => void;
  maxLength?: number;
  /** What a row is called on its delete button: "item" in a page's list, "line" in a routine or a session. */
  noun?: string;
  /** Whether Delete or Backspace on the row removes it. Off where a removed line cannot be put back, so a stray key costs nothing. */
  quickDelete?: boolean;
}

/**
 * One line of a list that is kept by hand: a page's items, a routine's lines, a session's lines.
 * Its box is a task's box made smaller: familiar to tick, and plainly not a task.
 * Selecting the words edits them in place, with buttons to move the line or delete it.
 */
export function ListRow({ item, first, last, editing, onEditing, onToggle, onChange, onMove, onDelete, maxLength = 140, noun = 'item', quickDelete = true }: RowProps) {
  const [draft, setDraft] = useState(item.text);
  const commit = () => { onChange(item.id, draft); onEditing(null); };
  const remove = () => { onDelete(item.id); onEditing(null); };
  // the buttons beside the words must not take focus from them, or leaving the box would save and close before the press landed
  const keep = (e: React.MouseEvent) => e.preventDefault();
  return (
    <li data-item={item.id} data-done={onToggle ? !!item.done : undefined} data-editing={editing || undefined}
      onBlur={editing ? (e) => { if (!e.currentTarget.contains(e.relatedTarget)) commit(); } : undefined}
      className={`grid min-h-[46px] items-center gap-x-1 border-t border-line first:border-t-0 data-[editing=true]:bg-surface-well max-sm:min-h-[54px] ${onToggle ? 'grid-cols-[auto_minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,1fr)_auto]'}`}>
      {onToggle && (
        <label className="relative -ml-[11px] grid size-11 shrink-0 cursor-pointer place-items-center">
          <input type="checkbox" checked={!!item.done} onChange={() => onToggle(item.id)} aria-label={item.text}
            className="peer size-[18px] cursor-pointer appearance-none rounded-[6px] shadow-[inset_0_0_0_1.5px_var(--color-control)] transition-colors duration-[140ms] ease-[var(--ease-out)] checked:bg-positive checked:shadow-none max-sm:size-[22px]" />
          <Check size={12} strokeWidth={3.2} aria-hidden="true" className="pointer-events-none absolute text-on-positive opacity-0 transition-opacity duration-[140ms] peer-checked:opacity-100" />
        </label>
      )}
      {editing ? (
        <>
          <input autoFocus value={draft} maxLength={maxLength} aria-label={`Change ${item.text}`} enterKeyHint="done" onChange={(e) => setDraft(e.target.value)}
            // Escape leaves the words as they were. Inside an editor it must not also close the editor around it.
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } else if (e.key === 'Escape') { e.preventDefault(); onEditing(null); } }}
            className="-ml-2 h-11 min-w-0 rounded-[9px] bg-surface-sheet pl-2 text-[15.5px] font-medium outline-offset-0 max-sm:text-[16px]" />
          <span className="flex items-center">
            <button type="button" className={tool} disabled={first} onMouseDown={keep} onClick={() => onMove(item.id, -1)} aria-label="Move up"><ArrowUp size={16} aria-hidden="true" /></button>
            <button type="button" className={tool} disabled={last} onMouseDown={keep} onClick={() => onMove(item.id, 1)} aria-label="Move down"><ArrowDown size={16} aria-hidden="true" /></button>
            <button type="button" className={`${tool} text-attention`} onMouseDown={keep} onClick={remove} aria-label={`Delete ${noun}`}><Trash2 size={16} aria-hidden="true" /></button>
          </span>
        </>
      ) : (
        <button type="button" onClick={() => { setDraft(item.text); onEditing(item.id); }} aria-keyshortcuts={[onToggle ? 'Space' : '', quickDelete ? 'Delete' : ''].filter(Boolean).join(' ') || undefined}
          onKeyDown={(e) => { if (e.key === ' ' && onToggle) { e.preventDefault(); onToggle(item.id); } else if (quickDelete && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); remove(); } }}
          className={`col-span-2 flex min-h-11 min-w-0 cursor-pointer items-center rounded-[9px] text-left text-[15.5px] font-medium outline-offset-0 max-sm:text-[16px] ${item.done ? 'text-text-muted line-through decoration-strike' : ''}`}>
          <span className="py-1.5 leading-[1.3] [overflow-wrap:anywhere]">{item.text}</span>
        </button>
      )}
    </li>
  );
}

interface AddProps {
  label: string; maxLength: number;
  /** Returns true when the words were taken, and the box is then emptied for the next ones. */
  onAdd: (text: string) => boolean;
  id?: string;
  /** A rule above the row, for when there is a list over it. */
  divided?: boolean;
  /** In an editor, the box that takes the cursor when the editor opens. */
  focusFirst?: boolean;
}

/** The row at the foot of a list, to add to it: type, and press Enter. */
export function AddRow({ label, maxLength, onAdd, id, divided = true, focusFirst = false }: AddProps) {
  const [text, setText] = useState('');
  return (
    <form className={`flex min-h-[46px] items-center gap-1 max-sm:min-h-[54px] ${divided ? 'border-t border-line' : ''}`} onSubmit={(e) => { e.preventDefault(); if (onAdd(text)) setText(''); }}>
      <span aria-hidden="true" className="-ml-[11px] grid size-11 shrink-0 place-items-center text-text-muted">
        <span className="grid size-[22px] place-items-center rounded-[7px] shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]"><Plus size={13} strokeWidth={2.4} /></span>
      </span>
      <input id={id} value={text} onChange={(e) => setText(e.target.value)} maxLength={maxLength} aria-label={label} placeholder={label} enterKeyHint="done" data-add-item data-focus-first={focusFirst || undefined}
        // Escape empties the box. With nothing in it, Escape is left alone, so in an editor it closes the editor
        onKeyDown={(e) => { if (e.key === 'Escape') { if (text) e.preventDefault(); setText(''); e.currentTarget.blur(); } }}
        className="h-11 w-full min-w-0 rounded-[9px] bg-transparent text-[15px] outline-offset-0 placeholder:text-text-muted max-sm:text-[16px]" />
    </form>
  );
}

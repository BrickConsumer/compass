import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { dayMonth } from '../../domain/dates';
import { FITNESS_LIMITS } from '../../domain/fitness';
import type { Best, ISODate, Measure } from '../../domain/types';
import { type KeptList, useCompass } from '../../state/store';
import { useToday } from '../../state/useToday';
import { DraftInput } from '../../ui/DraftField';
import { EditorFrame } from '../../ui/EditorFrame';
import { toast } from '../../ui/Toast';
import { del, done, field, label } from '../study/Editors';
import { heading } from './styles';

/** What each list is called and says. The two are kept the same way; only a measure has a unit. */
const WORDS = {
  bests: { title: 'Bests', add: 'Add a best', adding: 'Add a best', submit: 'Add best', editing: 'Edit best', next: 'New best', kept: 'New best kept.', gone: 'Best deleted.', empty: 'None yet. Keep a time, a distance or a weight here, and the one it beat.', max: FITNESS_LIMITS.bests, value: FITNESS_LIMITS.bestValue },
  measures: { title: 'Measures', add: 'Add something to measure', adding: 'Add a measure', submit: 'Add measure', editing: 'Edit measure', next: 'New reading', kept: 'New reading kept.', gone: 'Measure deleted.', empty: '', max: FITNESS_LIMITS.measures, value: FITNESS_LIMITS.measureValue },
} as const;

const unitOf = (item: Best | Measure): string => ('unit' in item ? item.unit : '');
type EditingKept = { id: string } | { fresh: true };

/**
 * Bests, or measures: a short list kept by hand, each with its value and the one before.
 * A value is words, so nothing is worked out from it. A measure is never judged: no target, no colour, no arrow,
 * no chart, and nothing here suggests what to measure.
 */
export function KeptPart({ list }: { list: KeptList }) {
  const items = useCompass((s): (Best | Measure)[] => s[list]), words = WORDS[list];
  const [editing, setEditing] = useState<EditingKept | null>(null);
  return (
    <div data-kept={list}>
      <h2 className={heading}>{words.title}</h2>
      {items.length === 0 && words.empty && <p className="mt-1 max-w-[46ch] text-pretty text-[14.5px] text-text-muted">{words.empty}</p>}
      <ul className="mt-1">
        {items.map((item) => (
          <li key={item.id} data-kept-row={item.id} className="border-t border-line first:border-t-0">
            <button type="button" onClick={() => setEditing({ id: item.id })} className="flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 rounded-[9px] py-1.5 text-left outline-offset-0 hover:bg-surface-well [li[data-editing=true]_&]:bg-surface-well">
              <span className="min-w-0 text-[14.5px] font-semibold [overflow-wrap:anywhere]">{item.name}</span>
              <span className="min-w-0 text-right">
                <span className="block font-display text-[17px] font-medium [overflow-wrap:anywhere]">{item.value}{unitOf(item) && ` ${unitOf(item)}`}</span>
                <span className="block text-[13px] text-text-muted [overflow-wrap:anywhere]">{dayMonth(item.date)}{item.was && `. Was ${item.was.value}`}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {items.length < words.max && (
        // the rule is on the row and not on the button, whose corners are round
        <div className={items.length ? 'border-t border-line' : ''}>
          <button type="button" data-add-kept={list} onClick={() => setEditing({ fresh: true })} className="flex min-h-[46px] w-full cursor-pointer items-center gap-1 rounded-[9px] text-left text-[15px] text-text-muted outline-offset-0 hover:bg-surface-well max-sm:min-h-[54px] max-sm:text-[16px]">
            <span aria-hidden="true" className="-ml-[11px] grid size-11 shrink-0 place-items-center"><span className="grid size-[22px] place-items-center rounded-[7px] shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]"><Plus size={13} strokeWidth={2.4} /></span></span>
            {words.add}
          </button>
        </div>
      )}
      {list === 'measures' && <p className="mt-1 max-w-[52ch] text-pretty text-[13.5px] text-text-muted">Only what you add yourself. Nothing here has a target, and none of it moves the boat.</p>}
      <KeptEditor list={list} editing={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

/**
 * Add or change a best or a measure. A new one is added with its button once it has a name and a value. An existing
 * one saves as it is typed, which is a correction. A new value goes in the box of its own: it becomes the value,
 * dated today, the one it replaces is kept as the value before, and the editor closes so that Undo can be pressed.
 */
function KeptEditor({ list, editing, onClose }: { list: KeptList; editing: EditingKept | null; onClose: () => void }) {
  const today = useToday(), words = WORDS[list], store = useCompass();
  const existing = editing && 'id' in editing ? (store[list] as (Best | Measure)[]).find((x) => x.id === editing.id) : undefined, isNew = !!editing && 'fresh' in editing;
  const [draft, setDraft] = useState({ name: '', unit: '', value: '', date: today }), [next, setNext] = useState('');
  useEffect(() => { setNext(''); if (editing && 'fresh' in editing) setDraft({ name: '', unit: '', value: '', date: today }); }, [editing, today]);
  // it was deleted elsewhere: nothing left to edit
  useEffect(() => { if (editing && 'id' in editing && !existing) onClose(); }, [editing, existing, onClose]);
  const value = existing ? { name: existing.name, unit: unitOf(existing), value: existing.value, date: existing.date } : draft;
  const change = (patch: { name?: string; unit?: string; value?: string; date?: ISODate }) => { if (existing) store.updateKept(list, existing.id, patch); else setDraft((d) => ({ ...d, ...patch })); };
  const ready = !!draft.name.trim() && !!draft.value.trim();
  const keep = () => {
    if (!existing) return;
    const index = (useCompass.getState()[list] as (Best | Measure)[]).findIndex((x) => x.id === existing.id), before = store.newKept(list, existing.id, next);
    if (!before) return;
    onClose();
    toast(words.kept, { label: 'Undo', run: () => useCompass.getState().restoreKept(list, before, index) });
  };
  const remove = () => {
    if (!existing) return;
    const gone = store.deleteKept(list, existing.id);
    onClose();
    if (gone) toast(words.gone, { label: 'Undo', run: () => useCompass.getState().restoreKept(list, gone.item, gone.index) });
  };
  return (
    <EditorFrame open={!!editing && (isNew || !!existing)} anchor={existing ? `li[data-kept-row="${CSS.escape(existing.id)}"]` : `[data-add-kept="${list}"]`} title={isNew ? words.adding : words.editing} labelId={`kept-editor-${list}`} onClose={onClose} fresh={isNew}>
      {(close) => (
        <form method="dialog" className="contents" onSubmit={(e) => { e.preventDefault(); if (!isNew || store.addKept(list, draft)) close(); }}>
          {/* no examples in these boxes, and no unit to start with: what is kept here is the person's own */}
          <label className={label}>Name
            <DraftInput required maxLength={FITNESS_LIMITS.keptName} value={value.name} onSave={(name) => change({ name })} className={field} />
          </label>
          {list === 'measures' && (
            <label className={label}>Unit
              <DraftInput maxLength={FITNESS_LIMITS.unit} value={value.unit} onSave={(unit) => change({ unit })} className={`${field} w-40 max-w-full`} />
            </label>
          )}
          <label className={label}>Value
            <DraftInput required maxLength={words.value} value={value.value} onSave={(v) => change({ value: v })} className={field} />
          </label>
          <label className={label}>Date
            <input type="date" required value={value.date} onChange={(e) => { if (e.target.value) change({ date: e.target.value }); }} className={`${field} w-fit`} />
          </label>
          {existing && (
            <div className="flex flex-col gap-1.5 border-t border-line pt-4">
              <label htmlFor="kept-new" className="text-[13.5px] font-medium text-text-muted">{words.next}</label>
              <div className="flex gap-2">
                <input id="kept-new" value={next} maxLength={words.value} onChange={(e) => setNext(e.target.value)} enterKeyHint="done"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); keep(); } }} className={`${field} min-w-0 flex-1`} />
                <button type="button" onClick={keep} disabled={!next.trim()} className="press min-h-11 cursor-pointer rounded-md px-4 text-[14.5px] font-semibold shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well disabled:cursor-default disabled:text-text-subtle disabled:hover:bg-transparent">Keep</button>
              </div>
              <p className="text-[13.5px] text-text-muted">It is dated today, and the value it replaces is kept beneath it.</p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            {existing && <button type="button" onClick={remove} className={del}><Trash2 size={15} aria-hidden="true" />Delete</button>}
            <button type="submit" disabled={isNew && !ready} className={`${done} disabled:cursor-default disabled:bg-surface-well disabled:text-text-muted ${isNew ? '' : 'sm:hidden'}`}>{isNew ? words.submit : 'Done'}</button>
          </div>
        </form>
      )}
    </EditorFrame>
  );
}

import { ArrowDown, ArrowUp, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { addDaysISO, weekDays, weekdayShort, weekStartOf, dayOfMonth } from '../../domain/dates';
import type { ISODate, Priority } from '../../domain/types';
import { SUBJECT_COLOURS } from '../../domain/types';
import { useCompass } from '../../state/store';
import { toast } from '../../ui/Toast';

/** What the editor is showing: an existing task, or a new one with these defaults. */
export type Editing = { id: string } | { draft: { date: ISODate; scope: 'day' | 'week' } };

interface Props { editing: Editing | null; today: ISODate; viewWeek: ISODate; onClose: () => void }

const chip = (on: boolean) => `min-h-11 cursor-pointer rounded-md px-3.5 text-[14.5px] font-medium ${on ? 'bg-surface-inverse text-text-inverse' : 'shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well'}`;

/**
 * Edit a task, or write a new one. A panel on wider screens and a bottom sheet on phones.
 * Changes to an existing task save as they are made; Escape or a click outside closes it.
 */
export function TaskEditor({ editing, today, viewWeek, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const store = useCompass(), startsOn = store.settings.weekStartsOn;
  const existing = editing && 'id' in editing ? store.tasks.find((t) => t.id === editing.id) : undefined;
  const isNew = !!editing && 'draft' in editing;
  const [draft, setDraft] = useState({ title: '', notes: '', subjectId: undefined as string | undefined, priority: 'normal' as Priority, scope: 'day' as 'day' | 'week', date: today });
  useEffect(() => {
    if (editing && 'draft' in editing) setDraft({ title: '', notes: '', subjectId: undefined, priority: 'normal', scope: editing.draft.scope, date: editing.draft.date });
  }, [editing]);
  useEffect(() => { const d = ref.current; if (!d) return; if (editing && !d.open) d.showModal(); else if (!editing && d.open) d.close(); }, [editing]);
  // the task was deleted elsewhere: nothing left to edit
  useEffect(() => { if (editing && 'id' in editing && !existing) onClose(); }, [editing, existing, onClose]);

  const value = existing ? { title: existing.title, notes: existing.notes ?? '', subjectId: existing.subjectId, priority: existing.priority, scope: existing.scope, date: existing.date } : draft;
  const change = (patch: Partial<typeof draft>) => { if (existing) store.updateTask(existing.id, patch); else setDraft((d) => ({ ...d, ...patch })); };
  const thisWeek = weekStartOf(today, startsOn), nextWeek = addDaysISO(thisWeek, 7);
  const when: { label: string; scope: 'day' | 'week'; date: ISODate }[] = [
    { label: 'Today', scope: 'day', date: today }, { label: 'Tomorrow', scope: 'day', date: addDaysISO(today, 1) },
    ...weekDays(viewWeek).filter((d) => d !== today && d !== addDaysISO(today, 1)).map((d) => ({ label: `${weekdayShort(d)} ${dayOfMonth(d)}`, scope: 'day' as const, date: d })),
    { label: 'Any time this week', scope: 'week', date: thisWeek }, { label: 'Next week', scope: 'week', date: nextWeek },
  ];
  const save = () => { if (store.addTask(draft)) onClose(); };
  const remove = () => {
    if (!existing) return;
    const gone = store.deleteTasks([existing.id]);
    onClose();
    toast('Task deleted.', { label: 'Undo', run: () => useCompass.getState().restoreTasks(gone) });
  };

  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} aria-labelledby="editor-title"
      className="m-auto w-[min(94vw,520px)] rounded-xl bg-surface-sheet p-0 text-text shadow-float backdrop:bg-deep-900/40 max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none max-sm:pb-[env(safe-area-inset-bottom,0px)]">
      {editing && (
        <form method="dialog" className="flex flex-col gap-5 p-5 sm:p-6" onSubmit={(e) => { e.preventDefault(); if (isNew) save(); else onClose(); }}>
          <div className="flex items-center justify-between gap-3">
            <h2 id="editor-title" className="text-[20px]">{isNew ? 'New task' : 'Edit task'}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-surface-well"><X size={18} aria-hidden="true" /></button>
          </div>
          <label className="flex flex-col gap-1.5 text-[13.5px] font-medium text-text-muted">Title
            <input autoFocus required maxLength={140} value={value.title} onChange={(e) => change({ title: e.target.value })}
              className="h-11 rounded-md bg-surface-sheet px-3 text-[16px] font-normal text-text shadow-[inset_0_0_0_1.5px_var(--color-control)]" />
          </label>
          <label className="flex flex-col gap-1.5 text-[13.5px] font-medium text-text-muted">Notes
            <textarea rows={2} value={value.notes} onChange={(e) => change({ notes: e.target.value })}
              className="rounded-md bg-surface-sheet px-3 py-2.5 text-[16px] font-normal text-text shadow-[inset_0_0_0_1.5px_var(--color-control)]" />
          </label>
          <fieldset>
            <legend className="mb-2 text-[13.5px] font-medium text-text-muted">When</legend>
            <div className="flex flex-wrap gap-2">
              {when.map((w) => <button key={w.label} type="button" aria-pressed={value.scope === w.scope && value.date === w.date} onClick={() => change({ scope: w.scope, date: w.date })} className={chip(value.scope === w.scope && value.date === w.date)}>{w.label}</button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-[13.5px] font-medium text-text-muted">Priority</legend>
            <div className="flex gap-2">
              {(['high', 'normal', 'low'] as const).map((p) => <button key={p} type="button" aria-pressed={value.priority === p} onClick={() => change({ priority: p })} className={chip(value.priority === p)}>{p[0]!.toUpperCase() + p.slice(1)}</button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-[13.5px] font-medium text-text-muted">Subject</legend>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={!value.subjectId} onClick={() => change({ subjectId: undefined })} className={chip(!value.subjectId)}>None</button>
              {store.subjects.map((s) => (
                <button key={s.id} type="button" aria-pressed={value.subjectId === s.id} onClick={() => change({ subjectId: s.id })} className={`${chip(value.subjectId === s.id)} flex items-center gap-2`}>
                  <span aria-hidden="true" className="size-2 rounded-full" style={{ background: SUBJECT_COLOURS[s.colour].dot }} />{s.name}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            {existing && existing.scope === 'week' && (
              <>
                <button type="button" onClick={() => store.nudge(existing.id, -1)} className={`${chip(false)} flex items-center gap-1.5`}><ArrowUp size={15} aria-hidden="true" />Move up</button>
                <button type="button" onClick={() => store.nudge(existing.id, 1)} className={`${chip(false)} flex items-center gap-1.5`}><ArrowDown size={15} aria-hidden="true" />Move down</button>
              </>
            )}
            {existing && <button type="button" onClick={remove} className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[14.5px] font-semibold text-port-600 hover:bg-port-100"><Trash2 size={15} aria-hidden="true" />Delete</button>}
            <button type="submit" className="ml-auto min-h-11 cursor-pointer rounded-md bg-surface-inverse px-5 text-[14.5px] font-semibold text-text-inverse hover:bg-deep-700">{isNew ? 'Add task' : 'Done'}</button>
          </div>
        </form>
      )}
    </dialog>
  );
}

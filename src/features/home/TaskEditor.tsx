import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { addDaysISO, weekDays, weekdayShort, weekStartOf, dayOfMonth } from '../../domain/dates';
import { cleanUrl } from '../../domain/links';
import type { ISODate, Priority } from '../../domain/types';
import { SUBJECT_COLOURS } from '../../domain/types';
import { useCompass } from '../../state/store';
import { DraftArea, DraftInput } from '../../ui/DraftField';
import { chip, EditorFrame } from '../../ui/EditorFrame';
import { LinkField } from '../../ui/LinkField';
import { toast } from '../../ui/Toast';

/** What the editor is showing: an existing task, or a new one with these defaults. */
export type Editing = { id: string } | { draft: { date: ISODate; scope: 'day' | 'week' } };

interface Props { editing: Editing | null; today: ISODate; viewWeek: ISODate; onClose: () => void }

/**
 * Edit a task, or write a new one, in the shared editor frame: a popover beside the task's row on wider screens,
 * a bottom sheet on phones. Changes to an existing task save as they are made, so wider screens have no Done button.
 */
export function TaskEditor({ editing, today, viewWeek, onClose }: Props) {
  const store = useCompass(), startsOn = store.settings.weekStartsOn;
  const existing = editing && 'id' in editing ? store.tasks.find((t) => t.id === editing.id) : undefined;
  const isNew = !!editing && 'draft' in editing;
  // the assessment this task is preparation for, while that assessment exists
  const preparesFor = existing?.assessmentId ? store.assessments.find((a) => a.id === existing.assessmentId) : undefined;
  const [draft, setDraft] = useState({ title: '', notes: '', link: '', subjectId: undefined as string | undefined, priority: 'normal' as Priority, scope: 'day' as 'day' | 'week', date: today });
  useEffect(() => {
    if (editing && 'draft' in editing) setDraft({ title: '', notes: '', link: '', subjectId: undefined, priority: 'normal', scope: editing.draft.scope, date: editing.draft.date });
  }, [editing]);
  // the task was deleted elsewhere: nothing left to edit
  useEffect(() => { if (editing && 'id' in editing && !existing) onClose(); }, [editing, existing, onClose]);

  const value = existing ? { title: existing.title, notes: existing.notes ?? '', subjectId: existing.subjectId, priority: existing.priority, scope: existing.scope, date: existing.date } : draft;
  const change = (patch: Partial<Omit<typeof draft, 'link'>>) => { if (existing) store.updateTask(existing.id, patch); else setDraft((d) => ({ ...d, ...patch })); };
  const thisWeek = weekStartOf(today, startsOn), nextWeek = addDaysISO(thisWeek, 7);
  const when: { label: string; scope: 'day' | 'week'; date: ISODate }[] = [
    { label: 'Today', scope: 'day', date: today }, { label: 'Tomorrow', scope: 'day', date: addDaysISO(today, 1) },
    ...weekDays(viewWeek).filter((d) => d !== today && d !== addDaysISO(today, 1)).map((d) => ({ label: `${weekdayShort(d)} ${dayOfMonth(d)}`, scope: 'day' as const, date: d })),
    { label: 'Any time this week', scope: 'week', date: thisWeek }, { label: 'Next week', scope: 'week', date: nextWeek },
  ];
  const remove = () => {
    if (!existing) return;
    const gone = store.deleteTasks([existing.id]);
    onClose();
    toast('Task deleted.', { label: 'Undo', run: () => useCompass.getState().restoreTasks(gone) });
  };


  return (
    <EditorFrame open={!!editing} anchor={existing ? `li[data-task="${CSS.escape(existing.id)}"]` : null} title={isNew ? 'New task' : 'Edit task'} labelId="editor-title" onClose={onClose} fresh={isNew}>
      {(close) => (
        <form method="dialog" className="contents" onSubmit={(e) => { e.preventDefault(); if (!isNew || store.addTask(draft)) close(); }}>
          <label className="flex flex-col gap-1.5 text-[13.5px] font-medium text-text-muted">Title
            <DraftInput autoFocus required maxLength={140} value={value.title} onSave={(title) => change({ title })}
              className="h-11 rounded-md bg-surface-sheet px-3 text-[16px] font-normal text-text shadow-[inset_0_0_0_1.5px_var(--color-control)]" />
          </label>
          <label className="flex flex-col gap-1.5 text-[13.5px] font-medium text-text-muted">Notes
            <DraftArea rows={2} value={value.notes ?? ''} onSave={(notes) => change({ notes })}
              className="rounded-md bg-surface-sheet px-3 py-2.5 text-[16px] font-normal text-text shadow-[inset_0_0_0_1.5px_var(--color-control)]" />
          </label>
          {/* an existing task's link is kept or refused by the store; a new task's is checked here and added with it */}
          <LinkField key={existing?.id ?? 'new'} label="Link" value={existing ? existing.link ?? '' : draft.link} className="h-11 rounded-md bg-surface-sheet px-3 text-[16px] font-normal text-text shadow-[inset_0_0_0_1.5px_var(--color-control)]"
            onCommit={(url) => { if (existing) return store.setTaskLink(existing.id, url); const clean = url.trim() ? cleanUrl(url) : ''; if (clean === null) return false; setDraft((d) => ({ ...d, link: clean })); return true; }} />
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
          {existing && preparesFor && (
            <p className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[13.5px] text-text-muted">
              <span className="min-w-0 [overflow-wrap:anywhere]">Preparation for {preparesFor.title}</span>
              <button type="button" onClick={() => store.updateTask(existing.id, { assessmentId: null })} className="min-h-11 cursor-pointer rounded-[9px] font-semibold text-text-link sm:min-h-9">Not preparation</button>
            </p>
          )}
          {existing?.sessionId && store.sessions.some((x) => x.id === existing.sessionId) && <p className="text-[13.5px] text-text-muted">This task comes from a study session. Changes here are for this day only.</p>}
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            {existing && existing.scope === 'week' && (
              <>
                <button type="button" onClick={() => store.nudge(existing.id, -1)} className={`${chip(false)} flex items-center gap-1.5`}><ArrowUp size={15} aria-hidden="true" />Move up</button>
                <button type="button" onClick={() => store.nudge(existing.id, 1)} className={`${chip(false)} flex items-center gap-1.5`}><ArrowDown size={15} aria-hidden="true" />Move down</button>
              </>
            )}
            {existing && <button type="button" onClick={remove} className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[14.5px] font-semibold text-attention hover:bg-attention-tint"><Trash2 size={15} aria-hidden="true" />Delete</button>}
            {/* on wider screens changes save as they are made, so there is nothing to confirm; it stays in the form so Enter still closes */}
            <button type="submit" className={`ml-auto min-h-11 cursor-pointer rounded-md bg-surface-inverse px-5 text-[14.5px] font-semibold text-text-inverse hover:bg-surface-inverse-hover ${isNew ? '' : 'sm:hidden'}`}>{isNew ? 'Add task' : 'Done'}</button>
          </div>
        </form>
      )}
    </EditorFrame>
  );
}

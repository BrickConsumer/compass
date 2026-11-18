import { ArrowDown, ArrowUp, Trash2, X } from 'lucide-react';
import { useDragControls } from 'motion/react';
import * as motion from 'motion/react-m';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { EASE_IN_OUT, ENTER, EXIT, SHEET } from '../../design/motion';
import { addDaysISO, weekDays, weekdayShort, weekStartOf, dayOfMonth } from '../../domain/dates';
import type { ISODate, Priority } from '../../domain/types';
import { SUBJECT_COLOURS } from '../../domain/types';
import { useCompass } from '../../state/store';
import { toast } from '../../ui/Toast';
import { placeBeside } from './place';

/** What the editor is showing: an existing task, or a new one with these defaults. */
export type Editing = { id: string } | { draft: { date: ISODate; scope: 'day' | 'week' } };

interface Props { editing: Editing | null; today: ISODate; viewWeek: ISODate; onClose: () => void }

const chip = (on: boolean) => `min-h-11 cursor-pointer rounded-md px-3.5 text-[14.5px] font-medium sm:min-h-9 sm:px-3 sm:text-[14px] ${on ? 'bg-surface-inverse text-text-inverse' : 'shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well'}`;

/** Popover on the right, sheet below: the two ways the editor arrives and leaves. */
const SHOWN = { wide: { opacity: 1, scale: 1, transition: ENTER }, sheet: { y: 0, opacity: 1, transition: SHEET } };
const AWAY = { wide: { opacity: 0, scale: 0.97, transition: EXIT }, sheet: { y: '100%', opacity: 0.4, transition: { duration: 0.2, ease: EASE_IN_OUT } } };
/** True from 640 px wide. Read as the editor renders, so the panel knows which way to arrive before its first frame. */
const WIDE = '(min-width: 640px)';
const useWide = () => useSyncExternalStore(
  (changed) => { const q = matchMedia(WIDE); q.addEventListener('change', changed); return () => q.removeEventListener('change', changed); },
  () => matchMedia(WIDE).matches,
  () => true,
);

/** A sheet dragged or flicked down past this is dismissed. */
const DISMISS = { distance: 110, speed: 520 };

/**
 * Edit a task, or write a new one.
 * On wider screens it is a popover beside the task's row, with no Save button: changes save as they are made.
 * On phones it is a bottom sheet that follows the finger and can be dragged down by its header to close.
 * Escape or a click outside closes it, and focus returns to the row.
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
  // a popover from 640 px, a sheet below
  const wide = useWide(), [closing, setClosing] = useState(false), [spot, setSpot] = useState<{ left: number; top: number } | null>(null);
  const grip = useDragControls(), anchorId = editing && 'id' in editing ? editing.id : null;
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (editing && !d.open) { setClosing(false); d.showModal(); }
    else if (!editing && d.open) d.close();
  }, [editing]);
  // the popover sits beside its row, which is marked while it is being edited
  useLayoutEffect(() => {
    const d = ref.current, row = anchorId && wide ? document.querySelector<HTMLElement>(`li[data-task="${CSS.escape(anchorId)}"]`) : null;
    if (!d || !row) { setSpot(null); return; }
    const place = () => setSpot(placeBeside(row.getBoundingClientRect(), { width: d.offsetWidth, height: d.offsetHeight }, { width: window.innerWidth, height: window.innerHeight }));
    place(); row.dataset.editing = 'true';
    window.addEventListener('resize', place);
    return () => { window.removeEventListener('resize', place); delete row.dataset.editing; };
  }, [anchorId, wide]);
  // leaving is animated: ask to close, and close for real when the panel has gone
  const requestClose = useCallback(() => setClosing(true), []);
  // if the animation cannot finish (a hidden tab), close anyway
  useEffect(() => { if (!closing) return; const timer = window.setTimeout(onClose, 320); return () => window.clearTimeout(timer); }, [closing, onClose]);
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
  const save = () => { if (store.addTask(draft)) requestClose(); };
  const remove = () => {
    if (!existing) return;
    const gone = store.deleteTasks([existing.id]);
    onClose();
    toast('Task deleted.', { label: 'Undo', run: () => useCompass.getState().restoreTasks(gone) });
  };

  return (
    <dialog ref={ref} onClose={onClose} onCancel={(e) => { e.preventDefault(); requestClose(); }} onClick={(e) => { if (e.target === ref.current) requestClose(); }} aria-labelledby="editor-title"
      data-closing={closing} data-placed={spot ? 'beside' : undefined}
      style={spot ? { left: spot.left, top: spot.top, right: 'auto', bottom: 'auto', margin: 0 } : undefined}
      // the dialog is only a frame: the panel inside is the surface, so it can slide and fade without the frame moving
      className="m-auto w-[min(94vw,420px)] overflow-visible bg-transparent p-0 text-text backdrop:bg-transparent backdrop:transition-colors backdrop:duration-200 max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:backdrop:bg-deep-900/40 max-sm:data-[closing=true]:backdrop:bg-transparent">
      {editing && (
        <motion.div initial={wide ? AWAY.wide : AWAY.sheet} animate={closing ? (wide ? AWAY.wide : AWAY.sheet) : wide ? SHOWN.wide : SHOWN.sheet}
          onAnimationComplete={() => { if (closing) onClose(); }}
          drag={wide ? false : 'y'} dragListener={false} dragControls={grip} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 1 }}
          onDragEnd={(_, info) => { if (info.offset.y > DISMISS.distance || info.velocity.y > DISMISS.speed) requestClose(); }}
          style={{ transformOrigin: 'top left' }}
          className="max-h-[calc(100dvh-24px)] overflow-y-auto rounded-xl bg-surface-sheet shadow-float max-sm:rounded-b-none max-sm:pb-[env(safe-area-inset-bottom,0px)]">
        <form method="dialog" className="flex flex-col gap-4 p-5" onSubmit={(e) => { e.preventDefault(); if (isNew) save(); else requestClose(); }}>
          {/* on phones the header is the handle: drag it down to close */}
          <div onPointerDown={(e) => { if (!wide) grip.start(e); }} style={{ touchAction: wide ? undefined : 'none' }} className="-mx-5 -mt-5 px-5 pt-2.5 max-sm:cursor-grab max-sm:select-none sm:pt-5" data-grip>
            <span aria-hidden="true" className="mx-auto mb-1.5 block h-1 w-9 rounded-full bg-paper-300 sm:hidden" />
            <div className="flex items-center justify-between gap-3">
              <h2 id="editor-title" className="text-[20px]">{isNew ? 'New task' : 'Edit task'}</h2>
              <button type="button" onClick={requestClose} aria-label="Close" className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-surface-well"><X size={18} aria-hidden="true" /></button>
            </div>
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
            {/* on wider screens changes save as they are made, so there is nothing to confirm; it stays in the form so Enter still closes */}
            <button type="submit" className={`ml-auto min-h-11 cursor-pointer rounded-md bg-surface-inverse px-5 text-[14.5px] font-semibold text-text-inverse hover:bg-deep-700 ${isNew ? '' : 'sm:hidden'}`}>{isNew ? 'Add task' : 'Done'}</button>
          </div>
        </form>
        </motion.div>
      )}
    </dialog>
  );
}

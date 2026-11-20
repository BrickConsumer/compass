import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FITNESS_LIMITS } from '../../domain/fitness';
import { weekdayName, weekOrder } from '../../domain/habits';
import { useCompass } from '../../state/store';
import { DraftInput } from '../../ui/DraftField';
import { chip, EditorFrame } from '../../ui/EditorFrame';
import { AddRow, ListRow } from '../../ui/ListRows';
import { toast } from '../../ui/Toast';
import { del, done, field, label } from '../study/Editors';

/**
 * Change a routine: its name, the days it is set for, and its lines. Changes save as they are made.
 * A routine may have no days at all, which is one with no fixed day. Sessions already started are copies, so
 * nothing done here reaches them.
 */
export function RoutineEditor({ id, fresh = false, onClose }: { id: string | null; /** Just made: the cursor goes to its first line, not its name. */ fresh?: boolean; onClose: () => void }) {
  const routine = useCompass((s) => s.routines.find((r) => r.id === id)), startsOn = useCompass((s) => s.settings.weekStartsOn);
  const update = useCompass((s) => s.updateRoutine), addLine = useCompass((s) => s.addRoutineLine), editLine = useCompass((s) => s.editRoutineLine), moveLine = useCompass((s) => s.moveRoutineLine), deleteLine = useCompass((s) => s.deleteRoutineLine);
  const [line, setLine] = useState<string | null>(null);
  // the routine was deleted elsewhere: nothing left to edit
  useEffect(() => { if (id && !routine) onClose(); }, [id, routine, onClose]);
  const remove = () => {
    if (!routine) return;
    const gone = useCompass.getState().deleteRoutine(routine.id);
    onClose();
    if (gone) toast('Routine deleted.', { label: 'Undo', run: () => useCompass.getState().restoreRoutine(gone.routine, gone.index) });
  };
  return (
    <EditorFrame open={!!id && !!routine} anchor={routine ? `li[data-routine="${CSS.escape(routine.id)}"]` : null} title="Edit routine" labelId="routine-editor-title" onClose={onClose}>
      {(close) => routine && (
        // not a form: the row that adds a line is one, and a form cannot hold another
        <>
          <label className={label}>Name
            <DraftInput maxLength={FITNESS_LIMITS.routineName} value={routine.name} onSave={(name) => update(routine.id, { name })} className={field} />
          </label>
          <fieldset>
            <legend className="mb-2 text-[13.5px] font-medium text-text-muted">Days</legend>
            <div className="flex flex-wrap gap-2">
              {weekOrder(startsOn).map((d) => {
                const on = routine.days.includes(d);
                // unlike a habit, every day can be taken away: that is a routine with no fixed day
                return <button key={d} type="button" aria-pressed={on} onClick={() => update(routine.id, { days: on ? routine.days.filter((x) => x !== d) : [...routine.days, d] })} className={chip(on)}>{weekdayName(d)}</button>;
              })}
            </div>
            <p className="mt-2 text-[13.5px] text-text-muted">Leave every day off for a routine with no fixed day.</p>
          </fieldset>
          <div>
            <h3 id="routine-lines-title" className="font-sans text-[13.5px] font-medium text-text-muted">Lines</h3>
            <ul aria-labelledby="routine-lines-title">
              {routine.lines.map((l, i) => (
                <ListRow key={l.id} item={l} first={i === 0} last={i === routine.lines.length - 1} editing={line === l.id} onEditing={setLine} noun="line" quickDelete={false} maxLength={FITNESS_LIMITS.line}
                  onChange={(lineId, text) => editLine(routine.id, lineId, text)} onMove={(lineId, direction) => moveLine(routine.id, lineId, direction)} onDelete={(lineId) => deleteLine(routine.id, lineId)} />
              ))}
            </ul>
            {routine.lines.length < FITNESS_LIMITS.lines && <AddRow id="new-routine-line" label="Add a line" maxLength={FITNESS_LIMITS.line} onAdd={(text) => addLine(routine.id, text)} divided={routine.lines.length > 0} focusFirst={fresh} />}
          </div>
          <p className="text-[13.5px] text-text-muted">A line is kept as you type it. Sessions already done keep the lines they had.</p>
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <button type="button" onClick={remove} className={del}><Trash2 size={15} aria-hidden="true" />Delete routine</button>
            <button type="button" onClick={close} className={`${done} sm:hidden`}>Done</button>
          </div>
        </>
      )}
    </EditorFrame>
  );
}

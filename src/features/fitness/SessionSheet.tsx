import { Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { longDate } from '../../domain/dates';
import { FITNESS_LIMITS, ticked } from '../../domain/fitness';
import type { ISODate, Workout } from '../../domain/types';
import { useCompass } from '../../state/store';
import { DraftArea } from '../../ui/DraftField';
import { AddRow, ListRow } from '../../ui/ListRows';
import { SegmentedProgress } from '../../ui/SegmentedProgress';
import { toast } from '../../ui/Toast';
import { del, label } from '../study/Editors';
import { sheet } from './styles';
import { useCloseSession } from './useOpenSession';

const quiet = 'press min-h-11 cursor-pointer rounded-[9px] px-2 text-[14.5px] font-semibold text-text-link sm:min-h-9';
const primary = 'press ml-auto min-h-11 cursor-pointer rounded-md bg-surface-inverse px-5 text-[14.5px] font-semibold text-text-inverse hover:bg-surface-inverse-hover';
const area = 'rounded-md bg-surface-sheet px-3 py-2.5 text-[16px] font-normal leading-[1.5] text-text shadow-[inset_0_0_0_1.5px_var(--color-control)]';

/**
 * One session, open at the top of the place: its lines to tick, a row to add one for the day, and a note.
 * Everything is kept as it is done, so closing it or leaving the place loses nothing. Finishing it logs its miles
 * the first time. A finished session opens here too, to be read, corrected, reopened or deleted.
 */
export function SessionSheet({ workout, today }: { workout: Workout; today: ISODate }) {
  const title = useRef<HTMLHeadingElement>(null), [line, setLine] = useState<string | null>(null);
  const toggle = useCompass((s) => s.toggleWorkoutLine), addLine = useCompass((s) => s.addWorkoutLine), editLine = useCompass((s) => s.editWorkoutLine), moveLine = useCompass((s) => s.moveWorkoutLine), setNote = useCompass((s) => s.setWorkoutNote), reopen = useCompass((s) => s.reopenWorkout);
  const id = workout.id, c = ticked(workout), isToday = workout.date === today, finished = !!workout.finishedAt;
  // the page moves to the session when it opens, and its name takes focus so a screen reader starts there
  useEffect(() => { title.current?.scrollIntoView({ block: 'start' }); title.current?.focus({ preventScroll: true }); }, [id]);

  const close = useCloseSession();
  const finish = () => {
    const miles = useCompass.getState().finishWorkout(id);
    close();
    if (miles !== null) toast(miles ? `Session finished. ${miles} nautical miles logged.` : 'Session finished.');
  };
  const remove = (said: string) => {
    const gone = useCompass.getState().deleteWorkout(id);
    close();
    if (gone) toast(said, { label: 'Undo', run: () => useCompass.getState().restoreWorkout(gone) });
  };
  const removeLine = (lineId: string) => {
    const gone = useCompass.getState().deleteWorkoutLine(id, lineId);
    if (gone) toast('Line deleted.', { label: 'Undo', run: () => useCompass.getState().restoreWorkoutLine(id, gone.line, gone.index) });
  };

  return (
    <section data-workout={id} aria-labelledby="session-title" className={`${sheet} flex flex-col gap-3`}>
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 id="session-title" ref={title} tabIndex={-1} className="min-w-0 scroll-mt-4 text-[25px] leading-[1.2] outline-none [overflow-wrap:anywhere]">{workout.name}</h2>
          <span className="-mr-2 -mt-1.5 flex shrink-0 items-center gap-1">
            <span data-session-count aria-live="polite" className="text-[13.5px] font-semibold text-text-muted">{c.total ? `${c.done} of ${c.total}` : ''}</span>
            <button type="button" onClick={close} aria-label="Close" className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-surface-well"><X size={18} aria-hidden="true" /></button>
          </span>
        </div>
        <p className="mt-0.5 text-[13.5px] font-medium text-text-muted">{isToday ? `Today, ${longDate(workout.date)}` : longDate(workout.date)}</p>
        <SegmentedProgress done={c.done} total={c.total} fill className="mt-3" />
      </div>

      <div>
        {c.total === 0 && <p className="text-[15px] text-text-muted">No lines. Add one, or finish it as it is.</p>}
        <ul aria-label="Lines">
          {workout.lines.map((l, i) => (
            <ListRow key={l.id} item={l} first={i === 0} last={i === workout.lines.length - 1} editing={line === l.id} onEditing={setLine} noun="line" maxLength={FITNESS_LIMITS.line}
              onToggle={(lineId) => toggle(id, lineId)} onChange={(lineId, text) => editLine(id, lineId, text)} onMove={(lineId, direction) => moveLine(id, lineId, direction)} onDelete={removeLine} />
          ))}
        </ul>
        {workout.lines.length < FITNESS_LIMITS.lines && <AddRow label={isToday ? 'Add a line for today' : 'Add a line'} maxLength={FITNESS_LIMITS.line} onAdd={(text) => addLine(id, text)} divided={c.total > 0} />}
      </div>

      <label className={label}>Notes
        <DraftArea rows={2} maxLength={FITNESS_LIMITS.note} value={workout.note} onSave={(note) => setNote(id, note)} className={area} />
      </label>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {finished
          ? (
            <>
              <p className="mr-2 text-[14.5px] font-semibold text-positive">Finished</p>
              <button type="button" onClick={() => reopen(id)} className={quiet}>Reopen</button>
              <button type="button" onClick={() => remove('Session deleted.')} className={`${del} ml-auto`}><Trash2 size={15} aria-hidden="true" />Delete session</button>
            </>
          )
          : (
            <>
              <button type="button" onClick={() => remove('Session put away.')} className={quiet}>{isToday ? 'Not today' : 'Remove it'}</button>
              <button type="button" onClick={finish} className={primary}>Finish session</button>
            </>
          )}
      </div>
    </section>
  );
}

import { Dumbbell } from 'lucide-react';
import { useState } from 'react';
import { shortDay } from '../../domain/dates';
import { FITNESS_LIMITS, lastDone } from '../../domain/fitness';
import { daysLabel } from '../../domain/habits';
import type { Routine } from '../../domain/types';
import { useCompass } from '../../state/store';
import { AddRow } from '../../ui/ListRows';
import { RoutineEditor } from './RoutineEditor';
import { heading } from './styles';

/** How many lines a routine or a session has, in words. */
export const linesLabel = (count: number): string => (count === 0 ? 'No lines' : count === 1 ? '1 line' : `${count} lines`);
/** A routine's days as Habits writes them, or that it has none. */
export const routineDays = (routine: Routine, weekStartsOn: 0 | 1): string => (routine.days.length ? daysLabel(routine.days, weekStartsOn) : 'No fixed day');

/** Every routine, in the order they were made, with when each was last done. A routine is added by its name, as a habit is. */
export function RoutinesPart() {
  const routines = useCompass((s) => s.routines), workouts = useCompass((s) => s.workouts), startsOn = useCompass((s) => s.settings.weekStartsOn), add = useCompass((s) => s.addRoutine);
  const [editing, setEditing] = useState<{ id: string; fresh: boolean } | null>(null);
  return (
    <div data-routines>
      <h3 className={heading}>Routines</h3>
      <ul className="mt-1">
        {routines.map((r) => {
          const last = lastDone(workouts, r.id);
          return (
            <li key={r.id} data-routine={r.id} className="border-t border-line first:border-t-0">
              <button type="button" onClick={() => setEditing({ id: r.id, fresh: false })} className="grid min-h-[58px] w-full cursor-pointer grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-3 rounded-[9px] py-1.5 text-left outline-offset-0 hover:bg-surface-well [li[data-editing=true]_&]:bg-surface-well">
                <span aria-hidden="true" className="ml-1 grid size-[30px] place-items-center rounded-[9px] bg-surface-well text-text-muted"><Dumbbell size={16} /></span>
                <span className="min-w-0">
                  <span className="block truncate text-[14.5px] font-semibold">{r.name}</span>
                  <span data-routine-line className="block truncate text-[13px] text-text-muted">{routineDays(r, startsOn)}. {linesLabel(r.lines.length)}</span>
                </span>
                <span data-last-done className="pr-1 text-[13px] font-semibold text-text-muted max-sm:hidden">{last ? `Last done ${shortDay(last)}` : 'Not done yet'}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {routines.length < FITNESS_LIMITS.routines && (
        <AddRow id="new-routine" label="Add a routine" maxLength={FITNESS_LIMITS.routineName} divided={routines.length > 0}
          onAdd={(name) => { const id = add(name); if (id) setEditing({ id, fresh: true }); return !!id; }} />
      )}
      <RoutineEditor id={editing?.id ?? null} fresh={editing?.fresh} onClose={() => setEditing(null)} />
    </div>
  );
}

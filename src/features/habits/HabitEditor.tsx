import { Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { weekdayName, weekOrder } from '../../domain/habits';
import { useCompass } from '../../state/store';
import { chip, EditorFrame } from '../../ui/EditorFrame';
import { toast } from '../../ui/Toast';

const EVERY = [0, 1, 2, 3, 4, 5, 6], WEEKDAYS = [1, 2, 3, 4, 5];
const same = (a: number[], b: number[]) => a.length === b.length && a.every((d) => b.includes(d));

/** Rename a habit, choose its days, or delete it. Changes save as they are made. */
export function HabitEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const habit = useCompass((s) => s.habits.find((h) => h.id === id)), update = useCompass((s) => s.updateHabit), startsOn = useCompass((s) => s.settings.weekStartsOn);
  // the habit was deleted elsewhere: nothing left to edit
  useEffect(() => { if (id && !habit) onClose(); }, [id, habit, onClose]);
  const remove = () => {
    if (!habit) return;
    const removed = useCompass.getState().deleteHabit(habit.id);
    onClose();
    if (removed) toast('Habit deleted.', { label: 'Undo', run: () => useCompass.getState().restoreHabit(removed) });
  };
  const label = 'flex flex-col gap-1.5 text-[13.5px] font-medium text-text-muted';
  return (
    <EditorFrame open={!!id && !!habit} anchor={habit ? `li[data-habit-row="${CSS.escape(habit.id)}"]` : null} title="Edit habit" labelId="habit-editor-title" onClose={onClose}>
      {(close) => habit && (
        <form method="dialog" className="contents" onSubmit={(e) => { e.preventDefault(); close(); }}>
          <label className={label}>Name
            <input autoFocus required maxLength={60} value={habit.name} onChange={(e) => update(habit.id, { name: e.target.value })}
              className="h-11 rounded-md bg-surface-sheet px-3 text-[16px] font-normal text-text shadow-[inset_0_0_0_1.5px_var(--color-control)]" />
          </label>
          <fieldset>
            <legend className="mb-2 text-[13.5px] font-medium text-text-muted">Days</legend>
            <div className="flex flex-wrap gap-2">
              {weekOrder(startsOn).map((d) => {
                const on = habit.days.includes(d);
                // the last day cannot be taken away: a habit is for at least one day
                return <button key={d} type="button" aria-pressed={on} onClick={() => update(habit.id, { days: on ? habit.days.filter((x) => x !== d) : [...habit.days, d] })} className={chip(on)}>{weekdayName(d)}</button>;
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" aria-pressed={same(habit.days, EVERY)} onClick={() => update(habit.id, { days: EVERY })} className={chip(same(habit.days, EVERY))}>Every day</button>
              <button type="button" aria-pressed={same(habit.days, WEEKDAYS)} onClick={() => update(habit.id, { days: WEEKDAYS })} className={chip(same(habit.days, WEEKDAYS))}>Weekdays</button>
            </div>
          </fieldset>
          <p className="text-[13.5px] text-text-muted">Changing the days keeps the ticks you have already made.</p>
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <button type="button" onClick={remove} className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[14.5px] font-semibold text-port-600 hover:bg-port-100"><Trash2 size={15} aria-hidden="true" />Delete</button>
            <button type="submit" className="ml-auto min-h-11 cursor-pointer rounded-md bg-surface-inverse px-5 text-[14.5px] font-semibold text-text-inverse hover:bg-deep-700 sm:hidden">Done</button>
          </div>
        </form>
      )}
    </EditorFrame>
  );
}

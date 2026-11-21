import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { longDate } from '../../domain/dates';
import { type SessionRow, sessionsForDay } from '../../domain/fitness';
import type { ISODate } from '../../domain/types';
import { useCompass } from '../../state/store';
import { HabitTick } from '../habits/HabitTick';

/** Home shows this many sessions; the rest are a step away in Fitness. */
const SHOWN = 3;

/** A day's sessions as Fitness lists them, or none while Fitness is switched off. */
export function useTraining(date: ISODate, today: ISODate): SessionRow[] {
  const on = useCompass((s) => s.settings.fitness === true), routines = useCompass((s) => s.routines), workouts = useCompass((s) => s.workouts);
  return useMemo(() => (on ? sessionsForDay(routines, workouts, date, today) : []), [on, routines, workouts, date, today]);
}

interface Props { date: ISODate; today: ISODate; className?: string }

/**
 * The selected day's training on Home, a part of its own under the habits at the foot of the day's sheet. A session's ring finishes it as it stands, for someone who does not tick
 * each line, and pressed again reopens it. Its name opens the session in Fitness, starting it first if need be.
 * A day still to come shows its sessions, and they cannot be ticked. A day with no session shows nothing.
 * A session is not a task: nothing here reaches the day's count, the light or the sea.
 */
export function TrainingToday({ date, today, className = '' }: Props) {
  const rows = useTraining(date, today), navigate = useNavigate();
  if (rows.length === 0) return null;
  const ahead = date > today, more = rows.length - SHOWN;
  const items = rows.slice(0, SHOWN).map((r) => {
    const mark = r.workout?.id ?? r.routine!.id, finished = r.state === 'finished';
    // keyed by the routine while it has one: a key that changed when the session was made would rebuild the row,
    // and a ring pressed by keyboard would lose its focus
    const key = r.routine?.id ?? r.workout!.id;
    /** The session for this row, started now if it has not been. */
    const session = () => r.workout?.id ?? useCompass.getState().startWorkout(r.routine!.id, date);
    const tick = () => {
      if (finished) { useCompass.getState().reopenWorkout(r.workout!.id); return; }
      const id = session();
      if (id) useCompass.getState().finishWorkout(id);
    };
    // a day still to come has nothing to open, so its name goes to the place and starts nothing
    const open = () => { const id = ahead ? null : session(); navigate(id ? `/fitness/${id}` : '/fitness'); };
    return (
      <span key={key} data-training-item={mark} className={`flex min-h-11 min-w-0 items-center gap-2.5 text-[14.5px] font-medium leading-[1.25] max-sm:min-h-[50px] max-sm:text-[15px] lg:min-h-9 ${finished || ahead ? 'text-text-muted' : ''}`}>
        {/* a habit's ring is pressed through its name beside it. This name is a button of its own, so the ring has its own room for a thumb */}
        <label className={`-mx-[9px] grid size-11 shrink-0 place-items-center max-sm:-mx-3 max-sm:size-[50px] lg:-mx-[6px] lg:size-9 ${ahead ? '' : 'cursor-pointer'}`}>
          <HabitTick checked={finished} onChange={tick} disabled={ahead} label={`Training: ${r.name}, ${longDate(date)}`} title={ahead ? 'This can be ticked on the day' : undefined} />
        </label>
        <button type="button" onClick={open} aria-label={`Open ${r.name} in Fitness`} className="min-h-11 min-w-0 cursor-pointer rounded-[9px] text-left underline-offset-[3px] outline-offset-0 hover:underline max-sm:min-h-[50px] lg:min-h-9">
          <span className="[overflow-wrap:anywhere]">{r.name}</span>
        </button>
      </span>
    );
  });
  const rest = more > 0 && <Link to="/fitness" className="flex min-h-11 items-center rounded-[9px] text-[14.5px] font-semibold text-text-link">{more} more</Link>;
  const head = 'text-[13.5px] font-semibold text-text-muted';

  return (
    <section aria-label="Training" data-training="foot" className={`mt-3.5 border-t border-line pt-3.5 lg:mt-2.5 lg:pt-2.5 ${className}`}>
      <p className={head}>Training</p>
      <div className="mt-1 grid grid-cols-2 gap-x-4">{items}{rest}</div>
    </section>
  );
}

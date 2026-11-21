import { Link } from 'react-router';
import { longDate } from '../../domain/dates';
import { habitsForDay, isTicked } from '../../domain/habits';
import type { ISODate } from '../../domain/types';
import { useCompass } from '../../state/store';
import { TrainingToday, useTraining } from '../fitness/TrainingToday';
import { HabitTick } from './HabitTick';

/** Small counts are spelled out, as the voice asks. */
const WORDS: Record<number, string> = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten' };
/** Home shows this many; the rest are a step away on the Habits page. */
const SHOWN = 6;

interface Props { date: ISODate; today: ISODate; className?: string }

/**
 * The selected day's habits on Home, at the foot of the day's sheet. On wide screens they once had a line of their
 * own under the week; that room went to the sea, and the sheet had room to spare. A day still to come shows its
 * habits but they cannot be ticked. With Fitness switched on, the day's training follows them as a part of its own.
 * A day with no habits and no training shows nothing at all.
 */
export function HabitsToday({ date, today, className = '' }: Props) {
  const habits = useCompass((s) => s.habits), ticks = useCompass((s) => s.ticks), toggle = useCompass((s) => s.toggleHabit);
  const due = habitsForDay(habits, date), training = useTraining(date, today);
  if (due.length === 0 && training.length === 0) return null;
  const done = due.filter((h) => isTicked(ticks, h.id, date)).length, ahead = date > today, more = due.length - SHOWN;
  const count = done === due.length ? (due.length === 1 ? 'Habits, done' : `Habits, all ${WORDS[due.length] ?? due.length} done`) : `Habits, ${done} of ${due.length}`;
  const items = due.slice(0, SHOWN).map((h) => {
    const on = isTicked(ticks, h.id, date);
    return (
      <label key={h.id} data-habit={h.id} className={`flex min-h-11 cursor-pointer items-center gap-2.5 text-[14.5px] font-medium leading-[1.25] max-sm:min-h-[50px] max-sm:text-[15px] lg:min-h-9 ${on ? 'text-text-muted' : ''} ${ahead ? 'cursor-default text-text-muted' : ''}`}>
        <HabitTick checked={on} onChange={() => toggle(h.id, date)} disabled={ahead} label={`${h.name}, ${longDate(date)}`} title={ahead ? 'This can be ticked on the day' : undefined} />
        <span aria-hidden="true">{h.name}</span>
      </label>
    );
  });
  const rest = more > 0 && <Link to="/habits" className="flex min-h-11 items-center rounded-[9px] text-[14.5px] font-semibold text-text-link">{more} more</Link>;
  const head = 'text-[13.5px] font-semibold text-text-muted';

  return (
    <>
      {due.length > 0 && (
        <section aria-label="Habits" data-habits="foot" className={`mt-3.5 border-t border-line pt-3.5 lg:mt-2.5 lg:pt-2.5 ${className}`}>
          <p className={head} aria-live="polite">{count}</p>
          <div className="mt-1 grid grid-cols-2 gap-x-4">{items}{rest}</div>
        </section>
      )}
      <TrainingToday date={date} today={today} className={className} />
    </>
  );
}

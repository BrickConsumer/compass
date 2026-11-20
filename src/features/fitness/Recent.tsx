import { useState } from 'react';
import { dayMonth, dayOfMonth, longDate } from '../../domain/dates';
import { recentWorkouts, ticked } from '../../domain/fitness';
import { useCompass } from '../../state/store';
import { heading, quiet } from './styles';
import { useOpenSession } from './useOpenSession';

/** How many finished sessions show before "All sessions" is pressed. */
const SHOWN = 3;

/** What was done lately: the last three finished sessions with their notes, and every one of them when asked. A row opens its session. */
export function RecentPart() {
  const workouts = useCompass((s) => s.workouts), openSession = useOpenSession(), [all, setAll] = useState(false);
  const finished = recentWorkouts(workouts), shown = all ? finished : finished.slice(0, SHOWN);
  return (
    <div data-recent>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={heading}>Recent</h2>
        {finished.length > SHOWN && <button type="button" onClick={() => setAll(!all)} aria-expanded={all} className={quiet}>{all ? 'Show fewer' : 'All sessions'}</button>}
      </div>
      {finished.length === 0 && <p className="mt-1 max-w-[52ch] text-pretty text-[14.5px] text-text-muted">None yet. A finished session is kept here, with its note.</p>}
      <ul className="mt-1">
        {shown.map((w) => {
          const c = ticked(w);
          return (
            <li key={w.id} data-workout-row={w.id} className="border-t border-line first:border-t-0">
              <button type="button" onClick={() => openSession(w.id)} className="grid w-full cursor-pointer grid-cols-[46px_minmax(0,1fr)_auto] gap-3 rounded-[9px] py-2.5 text-left outline-offset-0 hover:bg-surface-well">
                {/* the month, not the weekday: a record is looked back on, often from weeks later */}
                <span className="flex flex-col pl-1 pt-0.5 leading-[1.05]"><span aria-hidden="true" className="text-[12.5px] font-semibold text-text-muted">{dayMonth(w.date).split(' ')[1]}</span><span aria-hidden="true" className="font-display text-[23px] font-medium">{dayOfMonth(w.date)}</span><span className="sr-only">{longDate(w.date)}</span></span>
                <span className="min-w-0">
                  <span className="block text-[14.5px] font-semibold leading-[1.35] [overflow-wrap:anywhere]">{w.name}</span>
                  {w.note.trim() && <span className="block max-w-[62ch] whitespace-pre-line text-[14.5px] leading-[1.5] [overflow-wrap:anywhere]">{w.note.trim()}</span>}
                </span>
                {/* as in the week: no count for a session finished with no line ticked */}
                <span className="pr-1 pt-0.5 text-[13px] font-semibold text-text-muted">{c.done > 0 ? `${c.done} of ${c.total}` : ''}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

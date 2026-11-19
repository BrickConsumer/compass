import { Check } from 'lucide-react';
import { dayOfMonth, isoWeek, longDate, relativeDay, weekdayShort, weekStartOf } from '../../domain/dates';
import { isRestDay, lastDone, offers, sessionCount, type SessionRow, sessionsForWeek, ticked } from '../../domain/fitness';
import type { ISODate } from '../../domain/types';
import { useCompass } from '../../state/store';
import { chip } from '../../ui/EditorFrame';
import { SegmentedProgress } from '../../ui/SegmentedProgress';
import { linesLabel } from './Routines';
import { aside, sheet } from './styles';
import { useOpenSession } from './useOpenSession';

const primary = 'press min-h-11 cursor-pointer rounded-md bg-surface-inverse px-5 text-[14.5px] font-semibold text-text-inverse hover:bg-surface-inverse-hover sm:min-h-9';
const quiet = 'press min-h-11 cursor-pointer rounded-md px-3.5 text-[14.5px] font-semibold text-text-link shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well sm:min-h-9';

/** A ring that says where a session stands. It is a picture with words for a screen reader, not a control: a session is finished in the session itself. */
function Ring({ done }: { done: boolean }) {
  return (
    <span className={`grid size-6 shrink-0 place-items-center rounded-full max-sm:size-[26px] ${done ? 'bg-positive' : 'shadow-[inset_0_0_0_1.5px_var(--color-faint)]'}`}>
      {done && <Check size={13} strokeWidth={3.4} aria-hidden="true" className="text-on-positive" />}
      <span className="sr-only">{done ? 'Finished' : 'Still to come'}</span>
    </span>
  );
}

/** The weekday over the day of the month, as "Coming up" draws a date. Today's weekday is in the link colour. */
function DateBlock({ date, today }: { date: ISODate; today: ISODate }) {
  return (
    <span className="flex flex-col pl-1 leading-[1.05]">
      <span aria-hidden="true" className={`text-[12.5px] font-semibold ${date === today ? 'text-text-link' : 'text-text-muted'}`}>{weekdayShort(date)}</span>
      <span aria-hidden="true" className="font-display text-[23px] font-medium">{dayOfMonth(date)}</span>
      <span className="sr-only">{longDate(date)}</span>
    </span>
  );
}

const ROW = 'grid min-h-[58px] grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-1.5 first:border-t-0';
const NAME = 'block truncate text-[15.5px] font-semibold max-sm:text-[16px]', LINE = 'block truncate text-[13px] text-text-muted';

/**
 * A week's sessions, worked out from the routines and what has been started. A set session is started from its row;
 * a started or finished one is opened from it. Nothing happens to a missed one: it keeps its row, and can be logged late.
 * Under this week's rows are the routines that can be started today, the one not done for longest first.
 */
export function WeekSheet({ week, today }: { week: ISODate; today: ISODate }) {
  const routines = useCompass((s) => s.routines), workouts = useCompass((s) => s.workouts), startsOn = useCompass((s) => s.settings.weekStartsOn), openSession = useOpenSession();
  const current = week === weekStartOf(today, startsOn), rows = sessionsForWeek(routines, workouts, week, today), count = sessionCount(rows);
  const rest = current && isRestDay(routines, workouts, today), offered = current ? offers(routines, workouts, today) : [];
  const begin = (routineId: string, date: ISODate) => { const id = useCompass.getState().startWorkout(routineId, date); if (id) openSession(id); };
  // the rest day sits among the sessions in date order, and is not one of them
  const entries: (SessionRow | { rest: true; date: ISODate })[] = rest ? [...rows.filter((r) => r.date < today), { rest: true, date: today }, ...rows.filter((r) => r.date > today)] : rows;
  const first = offered[0], firstLast = first ? lastDone(workouts, first.id) : undefined;

  return (
    <section aria-labelledby="fitness-week" className={sheet}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="fitness-week" tabIndex={-1} className="text-[25px] leading-[1.2] outline-none">{current ? 'This week' : `Week ${isoWeek(week)}`}</h2>
        <p className={`flex items-center gap-3 ${aside}`}>
          <SegmentedProgress done={count.done} total={count.total} className="[&>span]:w-2.5" />
          <span data-week-count>{count.total ? `${count.done} of ${count.total} ${count.total === 1 ? 'session' : 'sessions'} done` : routines.length ? 'No sessions set' : 'No routines yet'}</span>
        </p>
      </div>

      {routines.length === 0 && <p className="mt-3 max-w-[56ch] text-pretty text-[15px] text-text-muted">No routines yet. A routine is a checklist you write once, such as a run or a gym session. Add one under Routines.</p>}

      {entries.length > 0 && (
        <ul className="mt-2">
          {entries.map((r) => {
            if ('rest' in r) {
              return (
                <li key="rest" data-rest className={ROW}>
                  <DateBlock date={r.date} today={today} />
                  <span className="min-w-0"><span className={NAME}>Rest day</span><span className={LINE}>Nothing is set for today.</span></span>
                </li>
              );
            }
            const w = r.workout, c = w ? ticked(w) : null, lines = linesLabel(r.routine?.lines.length ?? 0);
            // the row is one button, so its spoken name carries what the row shows: what it opens, and where the session stands
            const stands = r.state === 'finished' ? (c!.done > 0 ? `Finished, ${c!.done} of ${c!.total}.` : 'Finished.') : c?.total ? `Started, ${c.done} of ${c.total} so far.` : 'Started.';
            const text = <><span className={NAME}>{r.name}</span><span className={LINE}>{r.state === 'due' ? `Today. ${lines}` : r.state === 'started' ? (c!.total ? `Started. ${c!.done} of ${c!.total} so far.` : 'Started.') : r.state === 'finished' ? w!.note.trim().replace(/\s+/g, ' ') : lines}</span></>;
            return (
              <li key={w?.id ?? `${r.date} ${r.routine!.id}`} data-session data-session-id={w?.id} data-state={r.state} data-day={r.date} className={ROW}>
                <DateBlock date={r.date} today={today} />
                {w
                  // a started or finished session is opened from anywhere on its row
                  ? <button type="button" onClick={() => openSession(w.id)} aria-label={`Open ${r.name}, ${longDate(r.date)}. ${stands}`} className="col-span-2 grid min-h-11 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[9px] text-left outline-offset-0 hover:bg-surface-well">
                      <span className="min-w-0">{text}</span>
                      {r.state === 'finished'
                        // no count when no line was ticked: that is a session finished by someone who does not tick lines
                        ? <span className={`flex items-center gap-3 pr-1 text-[13px] ${aside}`}>{c!.done > 0 && <span>{c!.done} of {c!.total}</span>}<Ring done /></span>
                        : <span className="pr-1 text-[13.5px] font-semibold text-text-link">Open</span>}
                    </button>
                  : (
                    <>
                      <span className="min-w-0">{text}</span>
                      {r.state === 'ahead' && <span className="pr-1"><Ring done={false} /></span>}
                      {r.state === 'due' && <button type="button" onClick={() => begin(r.routine!.id, r.date)} aria-label={`Start ${r.name}`} className={primary}>Start</button>}
                      {r.state === 'past' && <button type="button" onClick={() => begin(r.routine!.id, r.date)} aria-label={`Log it: ${r.name}, ${longDate(r.date)}`} className={quiet}>Log it</button>}
                    </>
                  )}
              </li>
            );
          })}
        </ul>
      )}

      {offered.length > 0 && (
        <div data-offers className={`flex flex-wrap items-center gap-2 pt-3 ${entries.length ? 'mt-2 border-t border-line' : 'mt-1'}`}>
          <p className={`mr-1 ${aside}`}>{rows.some((r) => r.date === today) ? 'Start another' : rest ? 'Start one anyway' : 'Start one'}</p>
          {offered.map((routine) => <button key={routine.id} type="button" data-offer={routine.id} aria-label={`Start ${routine.name}`} onClick={() => begin(routine.id, today)} className={`${chip(false)} max-w-full truncate`}>{routine.name}</button>)}
          {rest && first && <p className="basis-full text-[13px] text-text-muted">The one you have not done for longest comes first. {firstLast ? `${first.name} was last done ${relativeDay(firstLast, today)}.` : `${first.name} has not been done yet.`}</p>}
        </div>
      )}
    </section>
  );
}

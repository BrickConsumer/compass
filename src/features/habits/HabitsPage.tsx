import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { addDaysISO, dayOfMonth, isoWeek, longDate, weekDays, weekLabel, weekStartOf } from '../../domain/dates';
import { daysLabel, weekCount, weekdayName, weekRow } from '../../domain/habits';
import { weekdayOf } from '../../domain/dates';
import { useCompass } from '../../state/store';
import { useToday } from '../../state/useToday';
import { SegmentedProgress } from '../../ui/SegmentedProgress';
import { HabitEditor } from './HabitEditor';
import { HabitTick } from './HabitTick';

const square = 'grid size-11 cursor-pointer place-items-center rounded-md bg-surface-sheet shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well sm:size-9';
/** One row of the week: the habit's name, its seven days, and its count. On phones the days go under the name. */
const ROW = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[minmax(0,1fr)_308px_4.5rem]';

/** Habits: the week as a grid of ticks, with the count for each habit. Other weeks are the record. */
export function HabitsPage() {
  const today = useToday();
  const habits = useCompass((s) => s.habits), ticks = useCompass((s) => s.ticks), toggle = useCompass((s) => s.toggleHabit), add = useCompass((s) => s.addHabit), startsOn = useCompass((s) => s.settings.weekStartsOn);
  const thisWeek = weekStartOf(today, startsOn), [week, setWeek] = useState(thisWeek), [editing, setEditing] = useState<string | null>(null), [name, setName] = useState('');
  const days = weekDays(week), list = [...habits].sort((a, b) => a.order - b.order);
  const total = list.reduce((sum, h) => { const c = weekCount(h, ticks, week, today); return { done: sum.done + c.done, total: sum.total + c.total }; }, { done: 0, total: 0 });

  return (
    <main className="mx-auto flex max-w-[1000px] flex-col gap-5 px-4 pb-32 pt-[max(16px,env(safe-area-inset-top,0px))] sm:px-5 sm:pb-12 lg:pl-1.5 lg:pr-7 lg:pt-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:pl-5">
        <div className="min-w-0">
          <h1 className="text-[32px] leading-[1.1] tracking-[-0.012em] lg:text-[40px]">Habits</h1>
          <p className="mt-2 max-w-[52ch] text-pretty text-[15.5px] text-text-muted">Each tick logs one nautical mile. A day not ticked takes nothing away.</p>
        </div>
        <div className="flex items-center gap-2 text-[14.5px] font-medium max-sm:w-full max-sm:justify-between">
          <button type="button" className={square} onClick={() => setWeek(addDaysISO(week, -7))} aria-label="Previous week"><ChevronLeft size={17} aria-hidden="true" /></button>
          <span className="px-1 text-center sm:min-w-[9.5rem]" aria-live="polite">{weekLabel(week)}</span>
          <button type="button" className={square} onClick={() => setWeek(addDaysISO(week, 7))} aria-label="Next week"><ChevronRight size={17} aria-hidden="true" /></button>
          <button type="button" onClick={() => setWeek(thisWeek)} disabled={week === thisWeek}
            className="h-11 cursor-pointer rounded-md bg-surface-sheet px-3.5 text-[13.5px] font-semibold shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well disabled:cursor-default disabled:text-text-subtle disabled:hover:bg-surface-sheet sm:h-9">This week</button>
        </div>
      </header>

      <section aria-labelledby="habits-week" className="rounded-xl bg-surface-sheet px-5 pb-2 pt-[18px] shadow-sheet ring-1 ring-line max-sm:-mx-4 max-sm:rounded-[26px]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="habits-week" className="text-[25px] leading-[1.2]">{week === thisWeek ? 'This week' : `Week ${isoWeek(week)}`}</h2>
          <p className="flex items-center gap-3 text-[13.5px] font-semibold text-text-muted">
            <SegmentedProgress done={total.done} total={total.total} className="[&>span]:w-2.5" />
            <span data-week-count>{total.total ? `${total.done} of ${total.total} done` : list.length ? 'Nothing due yet' : 'No habits yet'}</span>
          </p>
        </div>

        {list.length > 0 && (
          <div className={`${ROW} mt-3 border-b border-line pb-1.5`} aria-hidden="true">
            <span className="max-sm:hidden" />
            <div className="grid grid-cols-7 max-sm:col-span-2">
              {days.map((d) => (
                <span key={d} className={`flex flex-col items-center text-[12.5px] font-semibold leading-[1.25] ${d === today ? 'text-marine-600' : 'text-text-muted'}`}>
                  {weekdayName(weekdayOf(d))}<span className="font-display text-[17px] font-medium text-text">{dayOfMonth(d)}</span>
                </span>
              ))}
            </div>
            <span className="max-sm:hidden" />
          </div>
        )}

        <ul>
          {list.map((h) => {
            const row = weekRow(h, ticks, week, today), c = weekCount(h, ticks, week, today);
            return (
              <li key={h.id} data-habit-row={h.id} className={`${ROW} border-t border-line py-1.5 first:border-t-0 data-[editing=true]:bg-surface-well`}>
                <button type="button" onClick={() => setEditing(h.id)} className="flex min-h-11 min-w-0 cursor-pointer flex-col justify-center rounded-[9px] text-left outline-offset-0">
                  <span className="truncate text-[15.5px] font-medium max-sm:text-[16px]">{h.name}</span>
                  <span className="text-[13px] text-text-muted">{daysLabel(h.days, startsOn)}</span>
                </button>
                <p className="text-right text-[13.5px] font-semibold text-text-muted sm:order-3" data-count>{c.total ? `${c.done} of ${c.total}` : ''}</p>
                <div className="grid grid-cols-7 max-sm:col-span-2 sm:order-2">
                  {row.map(({ date, state }) => (
                    <span key={date} className="grid h-11 place-items-center">
                      {state === 'off'
                        // not a day for this habit: a short dash, as on an empty day in the week strip
                        ? <span aria-hidden="true" className="h-[1.5px] w-3 bg-line-strong" />
                        : <HabitTick checked={state === 'done'} onChange={() => toggle(h.id, date)} disabled={state === 'ahead'} label={`${h.name}, ${longDate(date)}`} title={state === 'ahead' ? 'This can be ticked on the day' : undefined} />}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
        {list.length === 0 && <p className="mt-4 max-w-[52ch] text-pretty text-[15px] text-text-muted">No habits yet. Add one below, such as reading for 20 minutes. It will be for every day until you choose its days.</p>}

        <form className={`flex min-h-[46px] items-center gap-1 max-sm:min-h-[54px] ${list.length ? 'border-t border-line' : 'mt-2'}`}
          onSubmit={(e) => { e.preventDefault(); if (add(name)) setName(''); }}>
          <span aria-hidden="true" className="-ml-[11px] grid size-11 shrink-0 place-items-center text-text-muted">
            <span className="grid size-[22px] place-items-center rounded-full shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]"><Plus size={13} strokeWidth={2.4} /></span>
          </span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="Add a habit" placeholder="Add a habit" enterKeyHint="done"
            onKeyDown={(e) => { if (e.key === 'Escape') { setName(''); e.currentTarget.blur(); } }}
            className="h-11 w-full min-w-0 rounded-[9px] bg-transparent text-[15px] outline-offset-0 placeholder:text-text-muted max-sm:text-[16px]" />
        </form>
      </section>
      <HabitEditor id={editing} onClose={() => setEditing(null)} />
    </main>
  );
}

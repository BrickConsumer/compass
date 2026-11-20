import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { addDaysISO, weekLabel, weekStartOf } from '../../domain/dates';
import { MILES } from '../../domain/voyage';
import { useCompass } from '../../state/store';
import { useToday } from '../../state/useToday';
import { KeptPart } from './Kept';
import { RecentPart } from './Recent';
import { RoutinesPart } from './Routines';
import { SessionSheet } from './SessionSheet';
import { sheet } from './styles';
import { WeekSheet } from './WeekSheet';

const frame = 'mx-auto flex max-w-[1000px] flex-col gap-5 px-4 pb-32 pt-[max(16px,env(safe-area-inset-top,0px))] sm:px-5 sm:pb-12 lg:pl-1.5 lg:pr-7 lg:pt-8';
const square = 'press grid size-11 cursor-pointer place-items-center rounded-md bg-surface-sheet shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well sm:size-9';

/**
 * Fitness: a training week, what was done, and a short list of bests and measures. It is a place only while it is
 * switched on. Switched off, its address says so and offers the switch, and everything in it is kept.
 */
export function FitnessPage() {
  const today = useToday(), on = useCompass((s) => s.settings.fitness === true), setSettings = useCompass((s) => s.setSettings), startsOn = useCompass((s) => s.settings.weekStartsOn);
  const thisWeek = weekStartOf(today, startsOn), [week, setWeek] = useState(thisWeek);
  // the open session is the one the address names. One that is gone, or never was, leaves the place with nothing open
  const { workoutId } = useParams(), open = useCompass((s) => s.workouts.find((w) => w.id === workoutId)), openId = open?.id;
  // when a session closes, focus goes back to its row in the week, or to the week's heading if it has no row now,
  // so a keyboard is not left at the top of the page
  const was = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (was.current && !openId) (document.querySelector<HTMLElement>(`li[data-session-id="${CSS.escape(was.current)}"] button`) ?? document.getElementById('fitness-week'))?.focus();
    was.current = openId;
  }, [openId]);

  if (!on) {
    return (
      <main data-fitness="off" className={frame}>
        <header className="sm:pl-5">
          <h1 className="text-[32px] leading-[1.1] tracking-[-0.012em] lg:text-[40px]">Fitness</h1>
          <p className="mt-2 max-w-[52ch] text-pretty text-[15.5px] text-text-muted">Fitness is switched off. It is a place for your training week, what you did and anything you choose to measure.</p>
          <button type="button" onClick={() => setSettings({ fitness: true })} className="press mt-4 min-h-11 cursor-pointer rounded-md bg-surface-inverse px-5 text-[14.5px] font-semibold text-text-inverse hover:bg-surface-inverse-hover">Switch on Fitness</button>
        </header>
      </main>
    );
  }

  return (
    <main data-fitness="on" className={frame}>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:pl-5">
        <div className="min-w-0">
          <h1 className="text-[32px] leading-[1.1] tracking-[-0.012em] lg:text-[40px]">Fitness</h1>
          <p className="mt-2 max-w-[56ch] text-pretty text-[15.5px] text-text-muted">Your training week and what you did. Finishing a session logs {MILES.workout} nautical miles, for one session a day. A missed one takes nothing away.</p>
        </div>
        <div className="flex items-center gap-2 text-[14.5px] font-medium max-sm:w-full max-sm:justify-between">
          <button type="button" className={square} onClick={() => setWeek(addDaysISO(week, -7))} aria-label="Previous week"><ChevronLeft size={17} aria-hidden="true" /></button>
          <span className="px-1 text-center sm:min-w-[9.5rem]" aria-live="polite">{weekLabel(week)}</span>
          <button type="button" className={square} onClick={() => setWeek(addDaysISO(week, 7))} aria-label="Next week"><ChevronRight size={17} aria-hidden="true" /></button>
          <button type="button" onClick={() => setWeek(thisWeek)} disabled={week === thisWeek}
            className="press h-11 cursor-pointer rounded-md bg-surface-sheet px-3.5 text-[13.5px] font-semibold shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well disabled:cursor-default disabled:text-text-subtle disabled:hover:bg-surface-sheet sm:h-9">This week</button>
        </div>
      </header>

      {open && <SessionSheet key={open.id} workout={open} today={today} />}
      <WeekSheet week={week} today={today} />

      <section aria-label="What was done, routines, bests and measures" className={`${sheet} flex flex-col gap-7`}>
        <RecentPart />
        <RoutinesPart />
        <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
          <KeptPart list="bests" />
          <KeptPart list="measures" />
        </div>
      </section>
    </main>
  );
}

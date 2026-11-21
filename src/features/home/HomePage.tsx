import { ChevronLeft, ChevronRight, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router';
import type { ShellContext } from '../../app/AppShell';
import { addDaysISO, isISODate, isoWeek, longDate, shortDate, shortDay, weekLabel, weekStartOf } from '../../domain/dates';
import { greeting } from '../../domain/greeting';
import { taskRank } from '../../domain/levels';
import { allTasksInWeek, carryOver, dayMarks, missedDay, nextWeekPriorities, progress, share, tasksForDay, tasksForWeek, upcomingAssessments } from '../../domain/tasks';
import type { ISODate } from '../../domain/types';
import { useCompass } from '../../state/store';
import { useHour } from '../../state/useHour';
import { useToday } from '../../state/useToday';
import { SegmentedProgress } from '../../ui/SegmentedProgress';
import { HomeLinks } from '../links/Links';
import { HomeHeadlines } from './HomeHeadlines';
import { DaySheet } from './DaySheet';
import { Focus } from './Focus';
import { HomeWindow } from './HomeWindow';
import { ComingUp, NextWeek, WeekList } from './SideLists';
import { type Editing, TaskEditor } from './TaskEditor';
import { WeekStrip } from './WeekStrip';

const typing = (e: KeyboardEvent) => { const t = e.target as HTMLElement | null; return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };
const circle = 'grid size-11 cursor-pointer place-items-center rounded-full bg-surface-sheet shadow-[inset_0_0_0_1px_var(--color-line-strong)]';
const square = 'grid size-11 cursor-pointer place-items-center rounded-md bg-surface-sheet shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well sm:size-9';

/** Home: the sea, then the calendar week, then the selected day's tasks with the rest of the week beside them. */
export function HomePage() {
  const today = useToday(), [params, setParams] = useSearchParams(), { openMenu } = useOutletContext<ShellContext>();
  const tasks = useCompass((s) => s.tasks), subjects = useCompass((s) => s.subjects), assessments = useCompass((s) => s.assessments), startsOn = useCompass((s) => s.settings.weekStartsOn);
  const param = params.get('date'), selected: ISODate = isISODate(param) ? param : today;
  const [editing, setEditing] = useState<Editing | null>(null);
  const select = useCallback((date: ISODate) => setParams(date === today ? {} : { date }, { replace: true }), [setParams, today]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('dialog[open]')) return;
      const k = e.key.toLowerCase();
      if (k === 't') select(today);
      else if (k === 'n') { e.preventDefault(); document.getElementById('composer-day')?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [select, today]);

  const week = weekStartOf(selected, startsOn), thisWeek = weekStartOf(today, startsOn);
  // within a priority, a High subject's tasks come first: the numbered lists are left in the order they were given
  const levels = useCompass((s) => s.levels), rank = useMemo(() => taskRank(levels, subjects, startsOn), [levels, subjects, startsOn]);
  const hello = greeting(useHour(), useCompass((s) => s.settings.name));
  const dayTasks = tasksForDay(tasks, selected, rank), weekProgress = progress(allTasksInWeek(tasks, week));
  // the storm follows a missed day, but only once that day is over
  const yesterday = addDaysISO(selected, -1), stormy = yesterday < today && missedDay(tasks, yesterday);
  const closeEditor = useCallback(() => setEditing(null), []);
  // A task found by search comes here asking for its editor, on its day. The asking is used once, so coming back to
  // the day later does not open it again.
  const location = useLocation(), navigate = useNavigate(), asked = (location.state as { task?: string } | null)?.task;
  useEffect(() => { if (!asked) return; setEditing({ id: asked }); navigate(`${location.pathname}${location.search}`, { replace: true, state: null }); }, [asked, navigate, location.pathname, location.search]);

  return (
    <main className="mx-auto flex max-w-[1560px] flex-col px-4 pb-32 pt-[max(12px,env(safe-area-inset-top,0px))] sm:px-5 sm:pb-10 lg:h-dvh lg:min-h-[720px] lg:pb-4 lg:pl-1.5 lg:pr-7 lg:pt-3">
      <div className="order-2 sm:order-1"><HomeWindow progress={share(progress(dayTasks))} missedYesterday={stormy} /></div>

      {/* on phones the header dissolves, so the date sits above the sea and the week controls sit on the strip they move */}
      {/* on a wide screen the date and the week's progress share one line, so the day's tasks start higher up the screen */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 max-sm:contents sm:order-2 sm:pl-3.5 sm:pt-5 lg:pl-5 lg:pt-2">
        <div className="min-w-0 max-sm:order-1 max-sm:pb-3 max-sm:pl-1 xl:flex xl:flex-wrap xl:items-baseline xl:gap-x-5">
          {/* shown whichever day is selected, so the page does not jump as days are chosen */}
          {hello && <p data-greeting className="text-[15px] font-medium leading-[1.3] text-text-muted [overflow-wrap:anywhere] sm:mb-[3px] xl:mb-0 xl:basis-full">{hello}</p>}
          <div className="flex items-center justify-between gap-3">
            <h1 className="whitespace-nowrap text-[25px] leading-[1.2] tracking-[-0.012em] sm:text-[32px] sm:leading-[1.15] lg:text-[34px] lg:leading-[1.12]">{/* three lengths of the same day: below 360 px there is no room for the month in full beside the two round buttons */}
              <span className="min-[360px]:hidden">{shortDay(selected)}</span><span className="max-[360px]:hidden sm:hidden">{shortDate(selected)}</span><span className="max-sm:hidden">{longDate(selected)}</span></h1>
            <span className="flex gap-2 sm:hidden">
              <button type="button" onClick={openMenu} aria-label="Search" className={circle}><Search size={18} aria-hidden="true" /></button>
              <Link to="/settings" aria-label="Settings" className={circle}><SlidersHorizontal size={18} aria-hidden="true" /></Link>
            </span>
          </div>
          <p className="mt-0.5 flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] font-medium text-text-muted max-sm:hidden xl:mt-0">
            <span>Week {isoWeek(week)}</span><SegmentedProgress done={weekProgress.done} total={weekProgress.total} />
            <span>{weekProgress.total ? `${weekProgress.done} of ${weekProgress.total} done` : 'Nothing planned this week'}</span>
            <Focus week={week} rule />
          </p>
        </div>
        <div className="flex items-center gap-2 text-[14.5px] font-medium max-sm:order-3 max-sm:justify-between max-sm:pt-3">
          <button type="button" className={square} onClick={() => select(addDaysISO(selected, -7))} aria-label="Previous week" title="Previous week (Page Up)"><ChevronLeft size={17} aria-hidden="true" /></button>
          <span className="px-1 text-center sm:min-w-[9.5rem]" aria-live="polite">{weekLabel(week)}</span>
          <button type="button" className={square} onClick={() => select(addDaysISO(selected, 7))} aria-label="Next week" title="Next week (Page Down)"><ChevronRight size={17} aria-hidden="true" /></button>
          <button type="button" onClick={() => select(today)} disabled={selected === today} title="Today (T)"
            className="h-11 cursor-pointer rounded-md bg-surface-sheet px-3.5 text-[13.5px] font-semibold shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well disabled:cursor-default disabled:text-text-subtle disabled:hover:bg-surface-sheet sm:h-9">Today</button>
        </div>
      </header>

      <div className="order-4 bg-surface-deck pb-2 pt-3 max-sm:sticky max-sm:top-0 max-sm:z-10 max-sm:-mx-4 max-sm:px-3 sm:pt-4 lg:pb-0.5 lg:pt-2">
        <WeekStrip weekStart={week} selected={selected} today={today} marks={dayMarks(tasks, week)} assessments={assessments} onSelect={select} />
        <p className="flex items-center justify-between gap-3 px-2 pt-2.5 text-[13px] font-medium text-text-muted sm:hidden">
          <span>Week {isoWeek(week)}{weekProgress.total ? `, ${weekProgress.done} of ${weekProgress.total} done` : ', nothing planned'}</span>
          <SegmentedProgress done={weekProgress.done} total={weekProgress.total} className="[&>span]:w-2" />
        </p>
        <Focus week={week} className="px-2 pt-2 text-[13px] font-medium text-text-muted sm:hidden" />
      </div>

      {/* on a wide screen this row is exactly the room left on the screen. The day's sheet fills it and scrolls inside itself;
          the lists beside it are as long as they are, and the page only scrolls when one of them is longer than the screen */}
      <div className="order-5 grid items-start gap-x-8 gap-y-9 pt-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[1.25fr_1fr] lg:grid-rows-[minmax(0,1fr)] lg:pt-2 xl:grid-cols-[1.24fr_1fr_0.96fr]">
        <DaySheet date={selected} today={today} tasks={dayTasks} subjects={subjects} assessment={assessments.find((a) => a.date === selected)}
          carried={carryOver(tasks, today, startsOn)} onEdit={(id) => setEditing({ id })} rank={rank} />
        {/* two columns of about the same length, so neither makes the page longer than it need be: the two weeks of
            tasks in one, and what is coming up and the headlines in the other */}
        <div className="grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-1 lg:gap-y-6 lg:pt-3.5 xl:contents">
          <div className="flex flex-col gap-9 lg:gap-6 xl:pt-3.5">
            <WeekList weekStart={week} current={week === thisWeek} tasks={tasksForWeek(tasks, week, rank)} subjects={subjects} onEdit={(id) => setEditing({ id })} rank={rank} />
            <NextWeek tasks={nextWeekPriorities(tasks, today, startsOn)} subjects={subjects} today={today} weekStartsOn={startsOn} onEdit={(id) => setEditing({ id })} />
          </div>
          <div className="flex flex-col gap-9 lg:gap-6 xl:pt-3.5">
            <ComingUp assessments={upcomingAssessments(assessments, today)} tasks={tasks} subjects={subjects} today={today} onSelect={select} />
            {/* headlines, when there are any, sit under what is coming up */}
            <HomeHeadlines />
          </div>
        </div>
      </div>

      {/* below the width where the rail has words, the links come last on Home */}
      <HomeLinks className="order-6 pt-9 lg:hidden" />

      <button type="button" onClick={() => setEditing({ draft: { date: selected, scope: 'day' } })} aria-label="Add a task"
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+74px)] right-[18px] z-20 grid size-14 cursor-pointer place-items-center rounded-full bg-surface-inverse text-text-inverse shadow-float sm:hidden">
        <Plus size={24} strokeWidth={2.2} aria-hidden="true" />
      </button>
      <TaskEditor editing={editing} today={today} viewWeek={week} onClose={closeEditor} />
    </main>
  );
}

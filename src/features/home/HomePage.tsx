import { ChevronLeft, ChevronRight, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router';
import type { ShellContext } from '../../app/AppShell';
import { addDaysISO, isISODate, isoWeek, longDate, weekLabel, weekStartOf } from '../../domain/dates';
import { allTasksInWeek, carryOver, dayMarks, missedDay, nextWeekPriorities, progress, share, tasksForDay, tasksForWeek, upcomingAssessments } from '../../domain/tasks';
import type { ISODate } from '../../domain/types';
import { useCompass } from '../../state/store';
import { useToday } from '../../state/useToday';
import { SegmentedProgress } from '../../ui/SegmentedProgress';
import { DaySheet } from './DaySheet';
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
  const dayTasks = tasksForDay(tasks, selected), weekProgress = progress(allTasksInWeek(tasks, week));
  // the storm follows a missed day, but only once that day is over
  const yesterday = addDaysISO(selected, -1), stormy = yesterday < today && missedDay(tasks, yesterday);
  const closeEditor = useCallback(() => setEditing(null), []);

  return (
    <main className="mx-auto flex max-w-[1560px] flex-col px-4 pb-32 pt-[max(12px,env(safe-area-inset-top,0px))] sm:px-5 sm:pb-10 lg:pl-1.5 lg:pr-7 lg:pt-4">
      <div className="order-2 sm:order-1"><HomeWindow progress={share(progress(dayTasks))} missedYesterday={stormy} /></div>

      <header className="order-1 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 pb-3 sm:order-2 sm:px-2 sm:pb-0 sm:pt-5">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-[23px] leading-[1.15] tracking-[-0.012em] sm:text-[32px] lg:text-[40px] lg:leading-[1.1]">{longDate(selected)}</h1>
            <span className="flex gap-2 sm:hidden">
              <button type="button" onClick={openMenu} aria-label="Search" className={circle}><Search size={18} aria-hidden="true" /></button>
              <Link to="/settings" aria-label="Settings" className={circle}><SlidersHorizontal size={18} aria-hidden="true" /></Link>
            </span>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] font-medium text-text-muted max-sm:hidden">
            <span>Week {isoWeek(week)}</span><SegmentedProgress done={weekProgress.done} total={weekProgress.total} />
            <span>{weekProgress.total ? `${weekProgress.done} of ${weekProgress.total} done` : 'Nothing planned this week'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-[14.5px] font-medium max-sm:w-full max-sm:justify-between">
          <button type="button" className={square} onClick={() => select(addDaysISO(selected, -7))} aria-label="Previous week" title="Previous week (Page Up)"><ChevronLeft size={17} aria-hidden="true" /></button>
          <span className="px-1 text-center sm:min-w-[9.5rem]" aria-live="polite">{weekLabel(week)}</span>
          <button type="button" className={square} onClick={() => select(addDaysISO(selected, 7))} aria-label="Next week" title="Next week (Page Down)"><ChevronRight size={17} aria-hidden="true" /></button>
          <button type="button" onClick={() => select(today)} disabled={selected === today} title="Today (T)"
            className="h-11 cursor-pointer rounded-md bg-surface-sheet px-3.5 text-[13.5px] font-semibold shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well disabled:cursor-default disabled:text-text-subtle disabled:hover:bg-surface-sheet sm:h-9">Today</button>
        </div>
      </header>

      <div className="order-3 bg-surface-deck pb-2 pt-3 max-sm:sticky max-sm:top-0 max-sm:z-10 max-sm:-mx-4 max-sm:px-3 sm:pt-4">
        <WeekStrip weekStart={week} selected={selected} today={today} marks={dayMarks(tasks, week)} assessments={assessments} onSelect={select} />
        <p className="flex items-center justify-between gap-3 px-2 pt-2.5 text-[13px] font-medium text-text-muted sm:hidden">
          <span>Week {isoWeek(week)}{weekProgress.total ? `, ${weekProgress.done} of ${weekProgress.total} done` : ', nothing planned'}</span>
          <SegmentedProgress done={weekProgress.done} total={weekProgress.total} className="[&>span]:w-2" />
        </p>
      </div>

      <div className="order-4 grid items-start gap-x-8 gap-y-9 pt-3 lg:grid-cols-[1.25fr_1fr] xl:grid-cols-[1.32fr_1fr_0.86fr]">
        <DaySheet date={selected} today={today} tasks={dayTasks} subjects={subjects} assessment={assessments.find((a) => a.date === selected)}
          carried={carryOver(tasks, today, startsOn)} onEdit={(id) => setEditing({ id })} />
        <div className="grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-1 lg:pt-[18px] xl:contents">
          <div className="xl:pt-[18px]"><WeekList weekStart={week} current={week === thisWeek} tasks={tasksForWeek(tasks, week)} subjects={subjects} onEdit={(id) => setEditing({ id })} /></div>
          <div className="flex flex-col gap-9 xl:pt-[18px]">
            <ComingUp assessments={upcomingAssessments(assessments, today)} subjects={subjects} today={today} onSelect={select} />
            <NextWeek tasks={nextWeekPriorities(tasks, today, startsOn)} subjects={subjects} today={today} weekStartsOn={startsOn} onEdit={(id) => setEditing({ id })} />
          </div>
        </div>
      </div>

      <button type="button" onClick={() => setEditing({ draft: { date: selected, scope: 'day' } })} aria-label="Add a task"
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+74px)] right-[18px] z-20 grid size-14 cursor-pointer place-items-center rounded-full bg-surface-inverse text-text-inverse shadow-float sm:hidden">
        <Plus size={24} strokeWidth={2.2} aria-hidden="true" />
      </button>
      <TaskEditor editing={editing} today={today} viewWeek={week} onClose={closeEditor} />
    </main>
  );
}

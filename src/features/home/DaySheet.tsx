import { useEffect, useMemo, useRef, useState } from 'react';
import { longDate, sheetTitle, weekdayLong } from '../../domain/dates';
import { progress, sortTasks } from '../../domain/tasks';
import type { Assessment, ISODate, Subject, Task } from '../../domain/types';
import { useCompass } from '../../state/store';
import { SegmentedProgress } from '../../ui/SegmentedProgress';
import { toast } from '../../ui/Toast';
import { TaskComposer } from './TaskComposer';
import { TaskRow } from './TaskRow';

/**
 * Sort tasks, but keep a just-completed task where it is for a moment,
 * so several can be ticked in a row without the list jumping.
 */
export function useHeldOrder(tasks: Task[], holdMs = 600): Task[] {
  const [held, setHeld] = useState<Set<string>>(new Set()), seen = useRef(new Map<string, boolean>());
  useEffect(() => {
    const fresh: string[] = [];
    for (const t of tasks) { const was = seen.current.get(t.id); if (was === false && t.completedAt) fresh.push(t.id); seen.current.set(t.id, !!t.completedAt); }
    if (!fresh.length) return;
    setHeld((h) => new Set([...h, ...fresh]));
    const timer = window.setTimeout(() => setHeld((h) => { const n = new Set(h); for (const id of fresh) n.delete(id); return n; }), holdMs);
    return () => window.clearTimeout(timer);
  }, [tasks, holdMs]);
  return useMemo(() => {
    const byId = new Map(tasks.map((t) => [t.id, t]));
    return sortTasks(tasks.map((t) => (held.has(t.id) ? { ...t, completedAt: undefined } : t))).map((t) => byId.get(t.id)!);
  }, [tasks, held]);
}

/** Small counts are spelled out, as the voice asks: "All five done". */
const NUMBER_WORDS: Record<number, string> = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten' };

interface Props { date: ISODate; today: ISODate; tasks: Task[]; subjects: Subject[]; assessment?: Assessment; carried: Task[]; onEdit: (id: string) => void }

/** The one raised sheet: the selected day's tasks, its progress, and anything still open from earlier in the week. */
export function DaySheet({ date, today, tasks, subjects, assessment, carried, onEdit }: Props) {
  const ordered = useHeldOrder(tasks), p = progress(tasks), isToday = date === today;
  const count = p.total === 0 ? 'Nothing planned' : p.done === p.total ? (p.total === 1 ? 'Done' : `All ${NUMBER_WORDS[p.total] ?? p.total} done`) : `${p.done} of ${p.total} done`;
  const moveCarried = () => {
    const before = useCompass.getState().moveToDate(carried.map((t) => t.id), today);
    toast(`Moved ${carried.length === 1 ? '1 task' : `${carried.length} tasks`} to today.`, { label: 'Undo', run: () => useCompass.getState().restoreTasks(before) });
  };
  const sameDay = carried.length > 0 && carried.every((t) => t.date === carried[0]!.date);
  return (
    <section aria-labelledby="day-title" className="flex flex-col rounded-t-xl bg-surface-sheet px-5 pb-2 pt-[18px] shadow-sheet ring-1 ring-line max-sm:-mx-4 max-sm:rounded-t-[26px] sm:max-lg:rounded-b-xl lg:-mb-10 lg:min-h-[420px] lg:self-stretch lg:pb-12">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="day-title" className="text-[25px] leading-[1.2]">{sheetTitle(date, today)}<span className="sr-only">, {longDate(date)}</span></h2>
        <p className="text-[13.5px] font-semibold text-text-muted">{count}</p>
      </div>
      <p aria-live="polite" className="sr-only">{count}</p>
      <SegmentedProgress done={p.done} total={p.total} fill className="mt-3" />
      {assessment && <p className="mt-3 flex items-center gap-2 text-[14.5px] font-semibold text-brass-700"><span aria-hidden="true" className="size-[7px] rotate-45 bg-brass-500" />{assessment.title} {isToday ? 'today' : `on ${weekdayLong(date)}`}</p>}
      {isToday && carried.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md bg-brass-100 px-3 py-1 text-[13.5px] text-brass-800">
          <span>{carried.length === 1 ? `1 task from ${weekdayLong(carried[0]!.date)} is still open.` : sameDay ? `${carried.length} tasks from ${weekdayLong(carried[0]!.date)} are still open.` : `${carried.length} tasks from earlier this week are still open.`}</span>
          <button type="button" onClick={moveCarried} className="min-h-9 cursor-pointer rounded-[9px] font-semibold underline underline-offset-[3px]">{carried.length === 1 ? 'Move it to today' : 'Move them to today'}</button>
        </p>
      )}
      {p.total === 0 && <p className="mt-4 text-pretty text-[15px] text-text-muted">Nothing planned for {isToday ? 'today' : weekdayLong(date)}. Add a task, or spend the day in port.</p>}
      <ul className="mt-2">
        {ordered.map((t) => <TaskRow key={t.id} task={t} subject={subjects.find((s) => s.id === t.subjectId)} onEdit={onEdit} />)}
      </ul>
      <div className={ordered.length ? '' : '[&>form]:border-t-0'}><TaskComposer id="composer-day" date={date} scope="day" hint="N" /></div>
    </section>
  );
}

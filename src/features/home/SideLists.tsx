import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { addDaysISO, dayOfMonth, isoWeek, relativeDay, weekdayShort, weekStartOf } from '../../domain/dates';
import { progress } from '../../domain/tasks';
import { type Assessment, type ISODate, type Subject, SUBJECT_COLOURS, type Task } from '../../domain/types';
import { TaskComposer } from './TaskComposer';
import { useHeldOrder } from './DaySheet';
import { TaskRow } from './TaskRow';

const Heading = ({ id, title, aside }: { id: string; title: string; aside?: string }) => (
  <div className="flex items-baseline justify-between gap-3">
    <h2 id={id} className="text-[20px] leading-[1.3]">{title}</h2>
    {aside && <p className="text-[13.5px] font-semibold text-text-muted">{aside}</p>}
  </div>
);

/** Tasks for any time in the selected week. */
export function WeekList({ weekStart, tasks, subjects, onEdit, current }: { weekStart: ISODate; tasks: Task[]; subjects: Subject[]; onEdit: (id: string) => void; current: boolean }) {
  const ordered = useHeldOrder(tasks), p = progress(tasks);
  return (
    <section aria-labelledby="week-title" className="min-w-0">
      <Heading id="week-title" title={current ? 'Any time this week' : `Any time in week ${isoWeek(weekStart)}`} aside={p.total ? `${p.done} of ${p.total}` : undefined} />
      <div key={weekStart}>
        <ul className="relative mt-1.5"><AnimatePresence initial={false} mode="popLayout">{ordered.map((t) => <TaskRow key={t.id} task={t} small subject={subjects.find((s) => s.id === t.subjectId)} onEdit={onEdit} />)}</AnimatePresence></ul>
        <div className={ordered.length ? '' : '[&>form]:border-t-0'}><TaskComposer date={weekStart} scope="week" label="Add a task for the week" /></div>
      </div>
    </section>
  );
}

/** Assessments in the next three weeks. Selecting one goes to its date. */
export function ComingUp({ assessments, subjects, today, onSelect }: { assessments: Assessment[]; subjects: Subject[]; today: ISODate; onSelect: (date: ISODate) => void }) {
  return (
    <section aria-labelledby="coming-title" className="min-w-0">
      <Heading id="coming-title" title="Coming up" />
      {assessments.length === 0 ? <p className="mt-2 text-[14.5px] text-text-muted">No assessments in the next three weeks.</p> : (
        <ul className="mt-1.5">
          {assessments.map((a) => {
            const subject = subjects.find((s) => s.id === a.subjectId);
            return (
              <li key={a.id} className="border-t border-line first:border-t-0">
                <button type="button" onClick={() => onSelect(a.date)} className="grid min-h-[58px] w-full cursor-pointer grid-cols-[46px_minmax(0,1fr)] items-center gap-3 rounded-[9px] py-1.5 text-left outline-offset-0 hover:bg-surface-well">
                  <span className="flex flex-col pl-1 leading-[1.05]"><span className="text-[12.5px] font-semibold text-text-muted">{weekdayShort(a.date)}</span><span className="font-display text-[23px] font-medium">{dayOfMonth(a.date)}</span></span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14.5px] font-semibold">{a.title}</span>
                    <span className="flex items-center gap-1.5 text-[13px] text-text-muted">
                      {subject && <span aria-hidden="true" className="size-2 rounded-full" style={{ background: SUBJECT_COLOURS[subject.colour].dot }} />}
                      {subject ? `${subject.name}, ` : ''}{relativeDay(a.date, today)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Next week's priorities: ordinary any-time tasks for the week after this one, numbered because their order is the point. */
export function NextWeek({ tasks, subjects, today, weekStartsOn, onEdit }: { tasks: Task[]; subjects: Subject[]; today: ISODate; weekStartsOn: 0 | 1; onEdit: (id: string) => void }) {
  const [all, setAll] = useState(false), next = addDaysISO(weekStartOf(today, weekStartsOn), 7), shown = all ? tasks : tasks.slice(0, 3);
  return (
    <section aria-labelledby="next-title" className="min-w-0">
      <Heading id="next-title" title="Next week" aside={`Week ${isoWeek(next)}`} />
      {tasks.length === 0 && <p className="mt-2 text-[14.5px] text-text-muted">Nothing set for next week yet.</p>}
      <ol className="relative mt-1.5"><AnimatePresence initial={false} mode="popLayout">{shown.map((t, i) => <TaskRow key={t.id} task={t} small number={i + 1} subject={subjects.find((s) => s.id === t.subjectId)} onEdit={onEdit} />)}</AnimatePresence></ol>
      {tasks.length > 3 && <button type="button" onClick={() => setAll(!all)} className="min-h-11 cursor-pointer rounded-[9px] text-[14.5px] font-semibold text-text-link">{all ? 'Show fewer' : `${tasks.length - 3} more`}</button>}
      <div className={shown.length ? '' : '[&>form]:border-t-0'}><TaskComposer date={next} scope="week" label="Add a priority" /></div>
    </section>
  );
}

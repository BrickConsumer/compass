import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { addDaysISO, dayOfMonth, isoWeek, longDate, shortDay, toISO, weekDays, weekdayShort, weekLabel, weekStartOf } from '../../domain/dates';
import { isBlank, reviewAward, reviewExcerpt, weekSummary } from '../../domain/review';
import { KINDS } from '../../domain/study';
import { tasksForWeek } from '../../domain/tasks';
import { type ISODate, type Review, SUBJECT_COLOURS } from '../../domain/types';
import { MILES } from '../../domain/voyage';
import { useCompass } from '../../state/store';
import { useToday } from '../../state/useToday';
import { SegmentedProgress } from '../../ui/SegmentedProgress';
import { toast } from '../../ui/Toast';
import { TaskComposer } from '../home/TaskComposer';
import { type Editing, TaskEditor } from '../home/TaskEditor';
import { TaskRow } from '../home/TaskRow';
import { Ratings } from './Ratings';
import { SubjectLevels } from './SubjectLevels';

const square = 'grid size-11 cursor-pointer place-items-center rounded-md bg-surface-sheet shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well disabled:cursor-default disabled:text-text-subtle disabled:hover:bg-surface-sheet sm:size-9';
const heading = 'text-[20px] leading-[1.3]', aside = 'text-[13.5px] font-semibold text-text-muted';

const QUESTIONS: { key: 'wentWell' | 'gotInWay' | 'change'; label: string }[] = [
  { key: 'wentWell', label: 'What went well?' },
  { key: 'gotInWay', label: 'What got in the way?' },
  { key: 'change', label: 'What will you do differently next week?' },
];

/** One figure of the week: a large number, what it is out of, and a line beneath. */
function Figure({ label, value, of, children }: { label: string; value: string; of?: string; children?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] font-semibold text-text-muted">{label}</dt>
      <dd className="mt-0.5">
        <span className="font-display text-[32px] font-medium leading-[1.1]">{value}</span>{of && <span className="ml-1.5 text-[14.5px] text-text-muted">{of}</span>}
        <span className="mt-1.5 block min-h-[18px] text-[13px] text-text-muted">{children}</span>
      </dd>
    </div>
  );
}

/** One week's review: what the week held, a reflection, and what matters in the week after. */
function ReviewSheet({ week, thisWeek }: { week: ISODate; thisWeek: ISODate }) {
  const today = useToday();
  const tasks = useCompass((s) => s.tasks), habits = useCompass((s) => s.habits), ticks = useCompass((s) => s.ticks), log = useCompass((s) => s.log), assessments = useCompass((s) => s.assessments), subjects = useCompass((s) => s.subjects);
  const review = useCompass((s) => s.reviews.find((r) => r.weekStart === week)), write = useCompass((s) => s.writeReview), save = useCompass((s) => s.saveReview), startsOn = useCompass((s) => s.settings.weekStartsOn);
  const [editing, setEditing] = useState<Editing | null>(null);
  const sum = weekSummary({ tasks, habits, ticks, log, assessments }, week, today), days = weekDays(week), after = addDaysISO(week, 7), priorities = tasksForWeek(tasks, after);
  const areas = useCompass((s) => s.areas);
  const blank = !review || isBlank(review, areas), saved = !blank && !!review.savedAt, earns = !review?.savedAt && !!reviewAward(week, log, today, startsOn);
  const title = week === thisWeek ? 'This week' : week === addDaysISO(thisWeek, -7) ? 'Last week' : `Week ${isoWeek(week)}`;

  return (
    <section aria-labelledby="review-week" className="flex flex-col gap-8 rounded-xl bg-surface-sheet px-5 pb-5 pt-[18px] shadow-sheet ring-1 ring-line max-sm:-mx-4 max-sm:rounded-[26px]">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="review-week" className="text-[25px] leading-[1.2]">{title}</h2>
          <p className={aside} data-review-state>{saved ? `Saved ${shortDay(toISO(new Date(review.savedAt!)))}` : 'Not saved yet'}</p>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-x-5 max-sm:gap-x-3" data-figures>
          <Figure label="Tasks done" value={String(sum.tasks.done)} of={sum.tasks.total ? `of ${sum.tasks.total}` : undefined}>
            {sum.tasks.total ? <SegmentedProgress done={sum.tasks.done} total={sum.tasks.total} fill className="mt-1 max-w-[220px]" /> : 'None planned'}
          </Figure>
          <Figure label="Habits ticked" value={String(sum.habitTotal.done)} of={sum.habitTotal.total ? `of ${sum.habitTotal.total}` : undefined}>
            {sum.habitTotal.total ? <SegmentedProgress done={sum.habitTotal.done} total={sum.habitTotal.total} fill className="mt-1 max-w-[220px]" /> : 'None due'}
          </Figure>
          <Figure label="Miles logged" value={sum.miles.toLocaleString('en-GB')}>{sum.daysAtSea === 1 ? '1 day at sea' : `${sum.daysAtSea} days at sea`}</Figure>
        </dl>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3"><h3 className={heading}>Day by day</h3><p className={aside}>Tasks done</p></div>
        <ul className="mt-2 grid grid-cols-7 rounded-lg bg-surface-well py-2.5" data-days>
          {days.map((d, i) => {
            const p = sum.days[i] ?? { done: 0, total: 0 }, ahead = d > today;
            return (
              <li key={d} className="flex flex-col items-center gap-0.5">
                <span aria-hidden="true" className={`text-[12.5px] font-semibold ${d === today ? 'text-text-link' : 'text-text-muted'}`}>{weekdayShort(d)}</span>
                <span aria-hidden="true" className="font-display text-[17px] font-medium leading-[1.2]">{dayOfMonth(d)}</span>
                {p.total
                  ? <span aria-hidden="true" className={`text-[13.5px] font-semibold ${ahead ? 'text-text-muted' : p.done === p.total ? 'text-positive' : ''}`}>{p.done}/{p.total}</span>
                  : <span aria-hidden="true" className="grid h-[20px] place-items-center"><span className="h-[1.5px] w-3 bg-line-strong" /></span>}
                <span className="sr-only">{longDate(d)}: {p.total ? `${p.done} of ${p.total} tasks done` : 'no tasks'}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {sum.habits.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between gap-3"><h3 className={heading}>Habits</h3><p className={aside}>{sum.habitTotal.done} of {sum.habitTotal.total}</p></div>
          <ul className="mt-1" data-habit-summary>
            {sum.habits.map(({ habit, done, total }) => (
              <li key={habit.id} className="grid min-h-[42px] grid-cols-[minmax(0,1fr)_auto_4rem] items-center gap-x-4 border-t border-line first:border-t-0">
                <span className="truncate text-[15px] font-medium">{habit.name}</span>
                <SegmentedProgress done={done} total={total} className="[&>span]:w-2.5" />
                <span className="text-right text-[13.5px] font-semibold text-text-muted">{done} of {total}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sum.assessments.length > 0 && (
        <div>
          <h3 className={heading}>Assessments</h3>
          <ul className="mt-1" data-assessment-summary>
            {sum.assessments.map((a) => {
              const subject = subjects.find((s) => s.id === a.subjectId), kind = KINDS.find((k) => k.id === a.kind)?.label;
              return (
                <li key={a.id} className="grid min-h-[54px] grid-cols-[46px_minmax(0,1fr)] items-center gap-3 border-t border-line py-1.5 first:border-t-0">
                  <span className="flex flex-col pl-1 leading-[1.05]"><span className="text-[12.5px] font-semibold text-text-muted">{weekdayShort(a.date)}</span><span className="font-display text-[23px] font-medium">{dayOfMonth(a.date)}</span></span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14.5px] font-semibold">{a.title}</span>
                    <span className="flex items-center gap-1.5 text-[13px] text-text-muted">
                      {subject && <span aria-hidden="true" className="size-2 rounded-full" style={{ background: SUBJECT_COLOURS[subject.colour].dot }} />}
                      {[subject?.name, kind].filter(Boolean).join(', ')}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Ratings week={week} />

      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (save(week)) toast(earns ? `Review saved. ${MILES.review} nautical miles logged.` : 'Review saved.'); }}>
        <div>
          <h3 className={heading}>Reflection</h3>
          <p className="mt-0.5 max-w-[56ch] text-pretty text-[14.5px] text-text-muted">A sentence in any of these is enough. What you write is kept as you type.</p>
        </div>
        {QUESTIONS.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <label htmlFor={`review-${key}`} className="text-[14.5px] font-semibold">{label}</label>
            <textarea id={`review-${key}`} rows={3} maxLength={2000} value={review?.[key] ?? ''} onChange={(e) => write(week, { [key]: e.target.value } as Partial<Review>)}
              className="rounded-md bg-surface-sheet px-3 py-2.5 text-[16px] leading-[1.5] text-text shadow-[inset_0_0_0_1.5px_var(--color-control)] sm:text-[15.5px]" />
          </div>
        ))}
        {saved
          ? <p className="text-[14.5px] text-text-muted" data-saved>This review is saved. It can still be changed.</p>
          : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <button type="submit" disabled={blank} className="min-h-11 cursor-pointer rounded-md bg-surface-inverse px-5 text-[14.5px] font-semibold text-text-inverse hover:bg-surface-inverse-hover disabled:cursor-default disabled:bg-surface-well disabled:text-text-muted">Save review</button>
              <p className="text-[14px] text-text-muted">{blank ? 'Write in any of the three, or rate the week, to save it.' : earns ? `Saving logs ${MILES.review} nautical miles.` : 'This week is too far back to log miles.'}</p>
            </div>
          )}
      </form>

      {/* the week after the one reviewed. Shown while that week is this one or still to come, since it is a plan and not a record */}
      {after >= thisWeek && (
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="review-next" className={heading}>{after === thisWeek ? 'Priorities for this week' : 'Priorities for next week'}</h3>
            <p className={aside}>Week {isoWeek(after)}</p>
          </div>
          <p className="mt-0.5 max-w-[56ch] text-pretty text-[14.5px] text-text-muted">{after === thisWeek ? 'These are the tasks under “Any time this week” on Home.' : 'These are the tasks under “Next week” on Home.'}</p>
          <ol aria-labelledby="review-next" className="relative mt-1.5">
            <AnimatePresence initial={false} mode="popLayout">{priorities.map((t, i) => <TaskRow key={t.id} task={t} number={i + 1} subject={subjects.find((s) => s.id === t.subjectId)} onEdit={(id) => setEditing({ id })} />)}</AnimatePresence>
          </ol>
          <div className={priorities.length ? '' : '[&>form]:border-t-0'}><TaskComposer date={after} scope="week" label="Add a priority" /></div>
        </div>
      )}
      {/* the same week's subject levels, shown by the same rule: a plan for a week that is not over */}
      {after >= thisWeek && <SubjectLevels week={after} title={after === thisWeek ? 'Subjects this week' : 'Subjects next week'} />}
      <TaskEditor editing={editing} today={today} viewWeek={after} onClose={() => setEditing(null)} />
    </section>
  );
}

/** Weekly review: look back on a week, write a few lines, and set what matters next. Saved reviews are listed beside it. */
export function ReviewPage() {
  const today = useToday(), startsOn = useCompass((s) => s.settings.weekStartsOn), reviews = useCompass((s) => s.reviews);
  const thisWeek = weekStartOf(today, startsOn), [week, setWeek] = useState(thisWeek), areas = useCompass((s) => s.areas);
  const kept = reviews.filter((r) => r.savedAt && !isBlank(r, areas)).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  return (
    <main className="mx-auto flex max-w-[1100px] flex-col gap-5 px-4 pb-32 pt-[max(16px,env(safe-area-inset-top,0px))] sm:px-5 sm:pb-12 lg:pl-1.5 lg:pr-7 lg:pt-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:pl-5">
        <div className="min-w-0">
          <h1 className="text-[32px] leading-[1.1] tracking-[-0.012em] lg:text-[40px]">Weekly review</h1>
          <p className="mt-2 max-w-[52ch] text-pretty text-[15.5px] text-text-muted">A few minutes to look back on the week and set what matters next. Saving a review logs {MILES.review} nautical miles.</p>
        </div>
        <div className="flex items-center gap-2 text-[14.5px] font-medium max-sm:w-full max-sm:justify-between">
          <button type="button" className={square} onClick={() => setWeek(addDaysISO(week, -7))} aria-label="Previous week"><ChevronLeft size={17} aria-hidden="true" /></button>
          <span className="px-1 text-center sm:min-w-[9.5rem]" aria-live="polite">{weekLabel(week)}</span>
          {/* a week still to come has nothing to look back on */}
          <button type="button" className={square} onClick={() => setWeek(addDaysISO(week, 7))} disabled={week >= thisWeek} aria-label="Next week"><ChevronRight size={17} aria-hidden="true" /></button>
          <button type="button" onClick={() => setWeek(thisWeek)} disabled={week === thisWeek}
            className="h-11 cursor-pointer rounded-md bg-surface-sheet px-3.5 text-[13.5px] font-semibold shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well disabled:cursor-default disabled:text-text-subtle disabled:hover:bg-surface-sheet sm:h-9">This week</button>
        </div>
      </header>

      <div className="grid items-start gap-x-8 gap-y-7 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* keyed by the week, so an editor open on one week does not carry to the next */}
        <ReviewSheet key={week} week={week} thisWeek={thisWeek} />
        <nav aria-labelledby="saved-title" className="lg:pt-[18px]">
          <h2 id="saved-title" className={`${heading} px-3 sm:pl-5 lg:pl-3`}>Saved reviews</h2>
          {kept.length === 0 && <p className="mt-1.5 max-w-[44ch] text-pretty px-3 text-[14.5px] text-text-muted sm:pl-5 lg:pl-3">None saved yet. A saved review is kept here, to read again.</p>}
          <ul className="mt-1.5">
            {kept.map((r) => (
              <li key={r.weekStart} className="border-t border-line first:border-t-0">
                <button type="button" onClick={() => { setWeek(r.weekStart); window.scrollTo({ top: 0 }); }} data-review={r.weekStart} aria-current={r.weekStart === week ? 'true' : undefined}
                  className="flex min-h-[60px] w-full cursor-pointer flex-col justify-center rounded-md px-3 py-2 text-left outline-offset-0 hover:bg-surface-well aria-[current=true]:bg-surface-well sm:pl-5 lg:pl-3">
                  <span className="text-[15px] font-semibold max-sm:text-[16px]">{weekLabel(r.weekStart)}</span>
                  <span className="line-clamp-2 text-[13.5px] text-text-muted">{reviewExcerpt(r)}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}

import { ArrowLeft, CalendarSync, Plus } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { type CSSProperties, useState } from 'react';
import { Link, useParams } from 'react-router';
import { dayOfMonth, relativeDay, shortDay, weekdayShort, weekStartOf } from '../../domain/dates';
import { byLevel, levelRank, levelsFor } from '../../domain/levels';
import { daysSentence, subjectSessions } from '../../domain/sessions';
import { KINDS, subjectAssessments, subjectSummary, subjectTasks, summaryLine, taskWhen } from '../../domain/study';
import { type Assessment, SUBJECT_COLOURS, type Subject } from '../../domain/types';
import { useCompass } from '../../state/store';
import { useToday } from '../../state/useToday';
import { LevelChips } from '../../ui/LevelChips';
import { TaskComposer } from '../home/TaskComposer';
import { type Editing, TaskEditor } from '../home/TaskEditor';
import { TaskRow } from '../home/TaskRow';
import { AssessmentEditor, type EditingAssessment, type EditingSession, SessionEditor, SubjectEditor } from './Editors';

const quiet = 'min-h-11 cursor-pointer rounded-[9px] px-1 text-[14.5px] font-semibold text-text-link sm:min-h-9';
const kindLabel = (a: Assessment) => KINDS.find((k) => k.id === a.kind)?.label ?? '';

/** One subject's page: its assessments, its tasks wherever they are planned, and its notes. */
function SubjectSheet({ subject }: { subject: Subject }) {
  const today = useToday();
  const tasks = useCompass((s) => s.tasks), assessments = useCompass((s) => s.assessments), update = useCompass((s) => s.updateSubject), startsOn = useCompass((s) => s.settings.weekStartsOn);
  const sessions = subjectSessions(useCompass((s) => s.sessions), subject.id), colours = SUBJECT_COLOURS[subject.colour];
  const [editingTask, setEditingTask] = useState<Editing | null>(null), [editingTest, setEditingTest] = useState<EditingAssessment | null>(null), [editingSubject, setEditingSubject] = useState(false), [editingSession, setEditingSession] = useState<EditingSession | null>(null);
  const [showDone, setShowDone] = useState(false), [showPast, setShowPast] = useState(false);
  const { open, done } = subjectTasks(tasks, subject.id), { ahead, past } = subjectAssessments(assessments, subject.id, today), thisWeek = weekStartOf(today, startsOn);
  const heading = 'text-[20px] leading-[1.3]', aside = 'text-[13.5px] font-semibold text-text-muted';
  const setLevel = useCompass((s) => s.setLevel), level = levelsFor(useCompass((s) => s.levels), thisWeek, [subject]).levels[subject.id];
  const row = (a: Assessment, faded = false) => (
    <li key={a.id} data-assessment={a.id} className="border-t border-line first:border-t-0 data-[editing=true]:bg-surface-well">
      <button type="button" onClick={() => setEditingTest({ id: a.id })} className={`grid min-h-[58px] w-full cursor-pointer grid-cols-[46px_minmax(0,1fr)] items-center gap-3 rounded-[9px] py-1.5 text-left outline-offset-0 hover:bg-surface-well ${faded ? 'text-text-muted' : ''}`}>
        <span className="flex flex-col pl-1 leading-[1.05]"><span className="text-[12.5px] font-semibold text-text-muted">{weekdayShort(a.date)}</span><span className="font-display text-[23px] font-medium">{dayOfMonth(a.date)}</span></span>
        <span className="min-w-0">
          <span className="block truncate text-[14.5px] font-semibold">{a.title}</span>
          <span className="block text-[13px] text-text-muted">{kindLabel(a)}, {faded ? shortDay(a.date) : relativeDay(a.date, today)}</span>
        </span>
      </button>
    </li>
  );
  return (
    <section aria-labelledby="subject-title" className="flex flex-col gap-7 rounded-xl bg-surface-sheet px-5 pb-5 pt-[18px] shadow-sheet ring-1 ring-line max-sm:-mx-4 max-sm:rounded-[26px]">
      <div>
        <div className="flex items-center justify-between gap-3" data-subject-head>
          <h2 id="subject-title" className="flex min-w-0 items-center gap-3 text-[25px] leading-[1.2]">
            <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ background: SUBJECT_COLOURS[subject.colour].dot }} /><span className="truncate">{subject.name}</span>
          </h2>
          <button type="button" onClick={() => setEditingSubject(true)} className={quiet} data-edit-subject>Edit subject</button>
        </div>
        {/* how much the subject matters this week: the same levels the Weekly review sets for the week after it */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <p className={aside}>This week</p>
          <LevelChips value={level} onChange={(next) => setLevel(thisWeek, subject.id, next)} label="This week" />
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className={heading}>Assessments</h3>
          <button type="button" onClick={() => setEditingTest({ subjectId: subject.id })} className={quiet} data-add-assessment>Add an assessment</button>
        </div>
        {ahead.length === 0 && <p className="mt-1 text-[14.5px] text-text-muted">Nothing ahead for {subject.name}.</p>}
        <ul className="mt-1">{ahead.map((a) => row(a))}</ul>
        {past.length > 0 && <button type="button" onClick={() => setShowPast(!showPast)} aria-expanded={showPast} className={quiet}>{showPast ? 'Hide past' : `${past.length} past`}</button>}
        {showPast && <ul>{past.map((a) => row(a, true))}</ul>}
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className={heading}>Study sessions</h3>
          <button type="button" onClick={() => setEditingSession({ subjectId: subject.id })} className={quiet} data-add-session>Add a session</button>
        </div>
        {sessions.length === 0 && <p className="mt-1 max-w-[52ch] text-pretty text-[14.5px] text-text-muted">None yet. A session repeats on the days you choose, and becomes a task on each of them.</p>}
        <ul className="mt-1">
          {sessions.map((x) => (
            <li key={x.id} data-session={x.id} className="border-t border-line first:border-t-0 data-[editing=true]:bg-surface-well">
              <button type="button" onClick={() => setEditingSession({ id: x.id })} className="grid min-h-[58px] w-full cursor-pointer grid-cols-[46px_minmax(0,1fr)] items-center gap-3 rounded-[9px] py-1.5 text-left outline-offset-0 hover:bg-surface-well">
                <span aria-hidden="true" className="ml-1 grid size-[30px] place-items-center rounded-[9px]" style={{ background: colours.tint, color: colours.text }}><CalendarSync size={16} strokeWidth={2} /></span>
                <span className="min-w-0"><span className="block truncate text-[14.5px] font-semibold">{x.name}</span><span className="block text-[13px] text-text-muted">{daysSentence(x.days, startsOn)}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3"><h3 className={heading}>Tasks</h3><p className={aside}>{open.length ? `${open.length} open` : 'Nothing open'}</p></div>
        <ul className="relative mt-1">
          <AnimatePresence initial={false} mode="popLayout">
            {open.map((t) => <TaskRow key={t.id} task={t} when={taskWhen(t, today, startsOn)} onEdit={(id) => setEditingTask({ id })} />)}
          </AnimatePresence>
        </ul>
        <div className={open.length ? '' : '[&>form]:border-t-0'}><TaskComposer date={thisWeek} scope="week" subjectId={subject.id} label={`Add a task for ${subject.name}`} /></div>
        {done.length > 0 && <button type="button" onClick={() => setShowDone(!showDone)} aria-expanded={showDone} className={`${quiet} mt-1`}>{showDone ? 'Hide done' : `${done.length} done`}</button>}
        {showDone && <ul className="relative"><AnimatePresence initial={false} mode="popLayout">{done.map((t) => <TaskRow key={t.id} task={t} when={taskWhen(t, today, startsOn)} onEdit={(id) => setEditingTask({ id })} />)}</AnimatePresence></ul>}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="subject-notes" className={`${heading} font-display font-medium`}>Notes</label>
        <textarea id="subject-notes" rows={4} value={subject.notes ?? ''} onChange={(e) => update(subject.id, { notes: e.target.value })} placeholder={`Anything worth keeping about ${subject.name}`}
          className="rounded-md bg-surface-sheet px-3 py-2.5 text-[16px] leading-[1.5] text-text shadow-[inset_0_0_0_1.5px_var(--color-control)] placeholder:text-text-muted sm:text-[15.5px]" />
      </div>

      <TaskEditor editing={editingTask} today={today} viewWeek={thisWeek} onClose={() => setEditingTask(null)} />
      <AssessmentEditor editing={editingTest} today={today} onClose={() => setEditingTest(null)} />
      <SessionEditor editing={editingSession} onClose={() => setEditingSession(null)} />
      <SubjectEditor id={editingSubject ? subject.id : null} onClose={() => setEditingSubject(false)} />
    </section>
  );
}

/**
 * Study: a page for each subject. On wider screens the subjects are listed beside the one that is open;
 * on phones the list comes first and a subject opens on its own.
 */
export function StudyPage() {
  const today = useToday(), { subjectId } = useParams();
  const subjects = useCompass((s) => s.subjects), tasks = useCompass((s) => s.tasks), assessments = useCompass((s) => s.assessments), add = useCompass((s) => s.addSubject);
  const [name, setName] = useState('');
  // the subjects that matter most this week come first: High, then Medium, then the rest in their own order
  const applied = levelsFor(useCompass((s) => s.levels), weekStartOf(today, useCompass((s) => s.settings.weekStartsOn)), subjects), ordered = byLevel(subjects, applied);
  // with no subject chosen, wider screens open the first one; phones show the list
  const chosen = subjects.find((s) => s.id === subjectId), open = chosen ?? ordered[0];
  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-5 px-4 pb-32 pt-[max(16px,env(safe-area-inset-top,0px))] sm:px-5 sm:pb-12 lg:pl-1.5 lg:pr-7 lg:pt-8">
      <header className={`sm:pl-5 ${chosen ? 'max-lg:hidden' : ''}`}>
        <h1 className="text-[32px] leading-[1.1] tracking-[-0.012em] lg:text-[40px]">Study</h1>
        <p className="mt-2 max-w-[52ch] text-pretty text-[15.5px] text-text-muted">A page for each subject, with its tasks, assessments and notes in one place.</p>
      </header>
      {chosen && <Link to="/study" className="flex min-h-11 w-fit items-center gap-2 rounded-[9px] text-[14.5px] font-semibold text-text-link lg:hidden"><ArrowLeft size={17} aria-hidden="true" />All subjects</Link>}

      <div className="grid items-start gap-x-8 gap-y-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <nav aria-label="Subjects" className={chosen ? 'max-lg:hidden' : ''}>
          <ul>
            {ordered.map((s, i) => (
              <li key={s.id} style={{ '--i': i } as CSSProperties} className="rise-in border-t border-line first:border-t-0">
                <Link to={`/study/${s.id}`} data-subject={s.id} aria-current={open?.id === s.id ? 'page' : undefined}
                  className="grid min-h-[60px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 rounded-md px-3 py-2 outline-offset-0 hover:bg-surface-well lg:aria-[current=page]:bg-surface-well sm:pl-5">
                  <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: SUBJECT_COLOURS[s.colour].dot }} />
                  <span className="min-w-0">
                    <span className="block truncate text-[15.5px] font-semibold max-sm:text-[16px]">{s.name}</span>
                    <span className="block truncate text-[13px] text-text-muted">{summaryLine(subjectSummary(s, tasks, assessments, today), today)}</span>
                  </span>
                  {levelRank(applied.levels[s.id]) < 2 && <span className="text-[13px] font-semibold text-text-muted"><span data-level>{applied.levels[s.id] === 'high' ? 'High' : 'Medium'}</span><span className="sr-only"> this week</span></span>}
                </Link>
              </li>
            ))}
          </ul>
          {subjects.length === 0 && <p className="px-3 text-[15px] text-text-muted sm:pl-5">No subjects yet. Add one below.</p>}
          <form className={`flex min-h-[46px] items-center gap-1 px-3 max-sm:min-h-[54px] sm:pl-5 ${subjects.length ? 'border-t border-line' : ''}`} onSubmit={(e) => { e.preventDefault(); if (add(name)) setName(''); }}>
            <span aria-hidden="true" className="-ml-[11px] grid size-11 shrink-0 place-items-center text-text-muted">
              <span className="grid size-[22px] place-items-center rounded-[7px] shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]"><Plus size={13} strokeWidth={2.4} /></span>
            </span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-label="Add a subject" placeholder="Add a subject" enterKeyHint="done"
              onKeyDown={(e) => { if (e.key === 'Escape') { setName(''); e.currentTarget.blur(); } }}
              className="h-11 w-full min-w-0 rounded-[9px] bg-transparent text-[15px] outline-offset-0 placeholder:text-text-muted max-sm:text-[16px]" />
          </form>
        </nav>
        {/* keyed by the subject, so what was open or shown on one subject does not carry to the next */}
        {open && <div className={chosen ? '' : 'max-lg:hidden'}><SubjectSheet key={open.id} subject={open} /></div>}
      </div>
    </main>
  );
}

import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { dayMonth, dayOfMonth, longDate } from '../../domain/dates';
import { FEEDBACK_LIMITS, feedbackTask, subjectFeedback } from '../../domain/feedback';
import { taskWhen } from '../../domain/study';
import type { ISODate, Subject } from '../../domain/types';
import { useCompass } from '../../state/store';
import { useToday } from '../../state/useToday';
import { DraftArea, DraftInput } from '../../ui/DraftField';
import { EditorFrame } from '../../ui/EditorFrame';
import { toast } from '../../ui/Toast';
import { TaskRow } from '../home/TaskRow';
import { del, done, field, label } from './Editors';

const heading = 'text-[20px] leading-[1.3]', aside = 'text-[13.5px] font-semibold text-text-muted';
const quiet = 'min-h-11 cursor-pointer rounded-[9px] px-1 text-[14.5px] font-semibold text-text-link sm:min-h-9';
const area = 'rounded-md bg-surface-sheet px-3 py-2.5 text-[16px] font-normal leading-[1.5] text-text shadow-[inset_0_0_0_1.5px_var(--color-control)]';

/** What the editor is showing: an entry that exists, or a new one. */
type EditingFeedback = { id: string } | { fresh: true };

/**
 * What teachers have said about a subject, newest first, each with something to work on. "Make it a task" turns
 * that into an ordinary task for the week; the entry then shows the task itself, so ticking it here is ticking
 * it on Home. If the task is deleted, the entry shows its words again.
 */
export function FeedbackPart({ subject, onEditTask }: { subject: Subject; onEditTask: (id: string) => void }) {
  const today = useToday(), all = useCompass((s) => s.feedback), tasks = useCompass((s) => s.tasks), startsOn = useCompass((s) => s.settings.weekStartsOn), make = useCompass((s) => s.makeFeedbackTask);
  const [editing, setEditing] = useState<EditingFeedback | null>(null);
  const entries = subjectFeedback(all, subject.id);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className={heading}>Feedback</h3>
        <button type="button" onClick={() => setEditing({ fresh: true })} className={quiet} data-add-feedback>Add feedback</button>
      </div>
      {entries.length === 0 && <p className="mt-1 max-w-[52ch] text-pretty text-[14.5px] text-text-muted">None yet. Feedback is kept here, with anything to work on.</p>}
      <ul className="mt-1">
        {entries.map((f) => {
          const task = feedbackTask(f, tasks);
          return (
            <li key={f.id} data-feedback={f.id} className="grid grid-cols-[46px_minmax(0,1fr)] gap-3 border-t border-line py-2.5 first:border-t-0 data-[editing=true]:bg-surface-well">
              {/* the month, not the weekday: feedback is looked back on, often from weeks later */}
              <span className="flex flex-col pl-1 pt-0.5 leading-[1.05]"><span aria-hidden="true" className="text-[12.5px] font-semibold text-text-muted">{dayMonth(f.date).split(' ')[1]}</span><span aria-hidden="true" className="font-display text-[23px] font-medium">{dayOfMonth(f.date)}</span><span className="sr-only">{longDate(f.date)}</span></span>
              <div className="min-w-0">
                <button type="button" onClick={() => setEditing({ id: f.id })} className="flex min-h-11 w-full cursor-pointer flex-col justify-center rounded-[9px] text-left outline-offset-0 hover:bg-surface-well sm:min-h-9">
                  {f.about && <span className="block text-[14.5px] font-semibold leading-[1.35] [overflow-wrap:anywhere]">{f.about}</span>}
                  <span className="block max-w-[62ch] whitespace-pre-line text-[14.5px] leading-[1.5] [overflow-wrap:anywhere]">{f.words}</span>
                </button>
                {task
                  ? <ul className="relative"><TaskRow task={task} small when={task.completedAt ? 'Done' : taskWhen(task, today, startsOn)} onEdit={onEditTask} /></ul>
                  : f.work && (
                    <p className="flex flex-wrap items-center gap-x-3 text-[14.5px]">
                      <span className="min-w-0 py-1"><span className={`${aside} mr-2`}>To work on</span><span className="[overflow-wrap:anywhere]">{f.work}</span></span>
                      <button type="button" onClick={() => make(f.id)} className={quiet}>Make it a task</button>
                    </p>
                  )}
              </div>
            </li>
          );
        })}
      </ul>
      <FeedbackEditor editing={editing} subject={subject} today={today} onClose={() => setEditing(null)} />
    </div>
  );
}

/** Add or change one piece of feedback. A new one is added with its button; an existing one saves as it is typed. */
function FeedbackEditor({ editing, subject, today, onClose }: { editing: EditingFeedback | null; subject: Subject; today: ISODate; onClose: () => void }) {
  const store = useCompass();
  const existing = editing && 'id' in editing ? store.feedback.find((f) => f.id === editing.id) : undefined, isNew = !!editing && 'fresh' in editing;
  const [draft, setDraft] = useState({ date: today, about: '', words: '', work: '' });
  useEffect(() => { if (editing && 'fresh' in editing) setDraft({ date: today, about: '', words: '', work: '' }); }, [editing, today]);
  // the entry was deleted elsewhere: nothing left to edit
  useEffect(() => { if (editing && 'id' in editing && !existing) onClose(); }, [editing, existing, onClose]);
  const value = existing ?? draft, made = existing ? feedbackTask(existing, store.tasks) : undefined;
  const change = (patch: { date?: ISODate; about?: string; words?: string; work?: string }) => { if (existing) store.updateFeedback(existing.id, patch); else setDraft((d) => ({ ...d, ...patch })); };
  const remove = () => {
    if (!existing) return;
    const gone = store.deleteFeedback(existing.id);
    onClose();
    if (gone) toast('Feedback deleted.', { label: 'Undo', run: () => useCompass.getState().restoreFeedback(gone) });
  };
  return (
    <EditorFrame open={!!editing && (isNew || !!existing)} anchor={existing ? `li[data-feedback="${CSS.escape(existing.id)}"]` : '[data-add-feedback]'} title={isNew ? 'New feedback' : 'Edit feedback'} labelId="feedback-editor-title" onClose={onClose} fresh={isNew}>
      {(close) => (
        <form method="dialog" className="contents" onSubmit={(e) => { e.preventDefault(); if (!isNew || store.addFeedback({ subjectId: subject.id, ...draft })) close(); }}>
          <label className={label}>Date
            <input type="date" required value={value.date} onChange={(e) => { if (e.target.value) change({ date: e.target.value }); }} className={`${field} w-fit`} />
          </label>
          <label className={label}>About
            <DraftInput maxLength={FEEDBACK_LIMITS.about} value={value.about} onSave={(about) => change({ about })} placeholder="An essay, a test, a task" className={`${field} placeholder:text-text-subtle`} />
          </label>
          <label className={label}>What was said
            <DraftArea rows={4} required maxLength={FEEDBACK_LIMITS.words} value={value.words} onSave={(words) => change({ words })} className={area} />
          </label>
          <label className={label}>To work on
            <DraftInput maxLength={FEEDBACK_LIMITS.work} value={value.work} onSave={(work) => change({ work })} className={field} />
          </label>
          {made && <p className="text-[13.5px] text-text-muted">A task was made from this. Changing these words does not rename it.</p>}
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            {existing && <button type="button" onClick={remove} className={del}><Trash2 size={15} aria-hidden="true" />Delete</button>}
            <button type="submit" className={`${done} ${isNew ? '' : 'sm:hidden'}`}>{isNew ? 'Add feedback' : 'Done'}</button>
          </div>
        </form>
      )}
    </EditorFrame>
  );
}

import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { weekdayName, weekOrder } from '../../domain/habits';
import { colourName, COLOURS, KINDS } from '../../domain/study';
import { type Assessment, type ISODate, SUBJECT_COLOURS } from '../../domain/types';
import { useCompass } from '../../state/store';
import { DraftInput } from '../../ui/DraftField';
import { chip, EditorFrame } from '../../ui/EditorFrame';
import { toast } from '../../ui/Toast';

const label = 'flex flex-col gap-1.5 text-[13.5px] font-medium text-text-muted';
const field = 'h-11 rounded-md bg-surface-sheet px-3 text-[16px] font-normal text-text shadow-[inset_0_0_0_1.5px_var(--color-control)]';
const done = 'ml-auto min-h-11 cursor-pointer rounded-md bg-surface-inverse px-5 text-[14.5px] font-semibold text-text-inverse hover:bg-deep-700';
const del = 'flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[14.5px] font-semibold text-port-600 hover:bg-port-100';

/** Rename a subject, choose its colour, or delete it. Changes save as they are made. */
export function SubjectEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const subject = useCompass((s) => s.subjects.find((x) => x.id === id)), update = useCompass((s) => s.updateSubject), navigate = useNavigate();
  useEffect(() => { if (id && !subject) onClose(); }, [id, subject, onClose]);
  const remove = () => {
    if (!subject) return;
    const removed = useCompass.getState().deleteSubject(subject.id);
    onClose(); navigate('/study');
    if (removed) toast(`${subject.name} deleted. Its tasks are kept.`, { label: 'Undo', run: () => useCompass.getState().restoreSubject(removed) });
  };
  return (
    <EditorFrame open={!!id && !!subject} anchor="[data-edit-subject]" title="Edit subject" labelId="subject-editor-title" onClose={onClose}>
      {(close) => subject && (
        <form method="dialog" className="contents" onSubmit={(e) => { e.preventDefault(); close(); }}>
          <label className={label}>Name
            <DraftInput autoFocus required maxLength={40} value={subject.name} onSave={(name) => update(subject.id, { name })} className={field} />
          </label>
          <fieldset>
            <legend className="mb-2 text-[13.5px] font-medium text-text-muted">Colour</legend>
            <div className="flex flex-wrap gap-2">
              {COLOURS.map((c) => (
                <button key={c} type="button" aria-label={colourName(c)} title={colourName(c)} aria-pressed={subject.colour === c} onClick={() => update(subject.id, { colour: c })}
                  className="size-11 cursor-pointer rounded-full aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-focus sm:size-9" style={{ background: SUBJECT_COLOURS[c].dot }} />
              ))}
            </div>
          </fieldset>
          <p className="text-[13.5px] text-text-muted">Deleting a subject removes its assessments and ends its study sessions. Its tasks are kept, without a subject.</p>
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <button type="button" onClick={remove} className={del}><Trash2 size={15} aria-hidden="true" />Delete</button>
            <button type="submit" className={`${done} sm:hidden`}>Done</button>
          </div>
        </form>
      )}
    </EditorFrame>
  );
}

/** What the assessment editor is showing: an existing assessment, or a new one for a subject. */
export type EditingAssessment = { id: string } | { subjectId: string };

/** Add or change an assessment: its title, what kind it is, and its date. */
export function AssessmentEditor({ editing, today, onClose }: { editing: EditingAssessment | null; today: ISODate; onClose: () => void }) {
  const store = useCompass();
  const existing = editing && 'id' in editing ? store.assessments.find((a) => a.id === editing.id) : undefined, isNew = !!editing && 'subjectId' in editing;
  const [draft, setDraft] = useState<Omit<Assessment, 'id'>>({ title: '', subjectId: '', date: today, kind: 'test' });
  useEffect(() => { if (editing && 'subjectId' in editing) setDraft({ title: '', subjectId: editing.subjectId, date: today, kind: 'test' }); }, [editing, today]);
  useEffect(() => { if (editing && 'id' in editing && !existing) onClose(); }, [editing, existing, onClose]);
  const value = existing ?? draft;
  const change = (patch: Partial<Omit<Assessment, 'id'>>) => { if (existing) store.updateAssessment(existing.id, patch); else setDraft((d) => ({ ...d, ...patch })); };
  const remove = () => {
    if (!existing) return;
    const gone = store.deleteAssessment(existing.id);
    onClose();
    if (gone) toast('Assessment deleted.', { label: 'Undo', run: () => useCompass.getState().restoreAssessment(gone) });
  };
  return (
    <EditorFrame open={!!editing && (isNew || !!existing)} anchor={existing ? `li[data-assessment="${CSS.escape(existing.id)}"]` : '[data-add-assessment]'} title={isNew ? 'New assessment' : 'Edit assessment'} labelId="assessment-editor-title" onClose={onClose}>
      {(close) => (
        <form method="dialog" className="contents" onSubmit={(e) => { e.preventDefault(); if (!isNew || store.addAssessment(draft)) close(); }}>
          <label className={label}>Title
            <DraftInput autoFocus required maxLength={80} value={value.title} onSave={(title) => change({ title })} className={field} />
          </label>
          <fieldset>
            <legend className="mb-2 text-[13.5px] font-medium text-text-muted">Kind</legend>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => <button key={k.id} type="button" aria-pressed={value.kind === k.id} onClick={() => change({ kind: k.id })} className={chip(value.kind === k.id)}>{k.label}</button>)}
            </div>
          </fieldset>
          <label className={label}>Date
            <input type="date" required value={value.date} onChange={(e) => { if (e.target.value) change({ date: e.target.value }); }} className={`${field} w-fit`} />
          </label>
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            {existing && <button type="button" onClick={remove} className={del}><Trash2 size={15} aria-hidden="true" />Delete</button>}
            <button type="submit" className={`${done} ${isNew ? '' : 'sm:hidden'}`}>{isNew ? 'Add assessment' : 'Done'}</button>
          </div>
        </form>
      )}
    </EditorFrame>
  );
}

/** What the session editor is showing: an existing session, or a new one for a subject. */
export type EditingSession = { id: string } | { subjectId: string };

const EVERY = [0, 1, 2, 3, 4, 5, 6], WEEKDAYS = [1, 2, 3, 4, 5];
const same = (a: number[], b: number[]) => a.length === b.length && a.every((d) => b.includes(d));

/** Set up or change a study session: its name, which is the title of the tasks it makes, and its days. */
export function SessionEditor({ editing, onClose }: { editing: EditingSession | null; onClose: () => void }) {
  const store = useCompass(), startsOn = store.settings.weekStartsOn;
  const existing = editing && 'id' in editing ? store.sessions.find((x) => x.id === editing.id) : undefined, isNew = !!editing && 'subjectId' in editing;
  const subjectId = existing?.subjectId ?? (editing && 'subjectId' in editing ? editing.subjectId : ''), subject = store.subjects.find((x) => x.id === subjectId);
  const [draft, setDraft] = useState({ name: '', days: [] as number[] }), [tried, setTried] = useState(false);
  // a new session starts with a likely name and no days, so the days are a choice and not a default
  useEffect(() => { if (editing && 'subjectId' in editing) { setDraft({ name: subject ? `${subject.name} revision` : '', days: [] }); setTried(false); } }, [editing]);
  useEffect(() => { if (editing && 'id' in editing && !existing) onClose(); }, [editing, existing, onClose]);
  const value = existing ?? draft;
  const change = (patch: { name?: string; days?: number[] }) => { if (existing) store.updateSession(existing.id, patch); else setDraft((d) => ({ ...d, ...patch })); };
  const remove = () => {
    if (!existing) return;
    const gone = store.deleteSession(existing.id);
    onClose();
    if (gone) toast('Session ended. Its tasks are kept.', { label: 'Undo', run: () => useCompass.getState().restoreSession(gone) });
  };
  return (
    <EditorFrame open={!!editing && (isNew || !!existing)} anchor={existing ? `li[data-session="${CSS.escape(existing.id)}"]` : '[data-add-session]'} title={isNew ? 'New session' : 'Edit session'} labelId="session-editor-title" onClose={onClose}>
      {(close) => (
        <form method="dialog" className="contents" onSubmit={(e) => { e.preventDefault(); if (!isNew) close(); else if (store.addSession({ subjectId, ...draft })) close(); else setTried(true); }}>
          <label className={label}>Name
            <DraftInput autoFocus required maxLength={80} value={value.name} onSave={(name) => change({ name })} className={field} />
          </label>
          <fieldset>
            <legend className="mb-2 text-[13.5px] font-medium text-text-muted">Days</legend>
            <div className="flex flex-wrap gap-2">
              {weekOrder(startsOn).map((d) => {
                const on = value.days.includes(d);
                return <button key={d} type="button" aria-pressed={on} onClick={() => change({ days: on ? value.days.filter((x) => x !== d) : [...value.days, d] })} className={chip(on)}>{weekdayName(d)}</button>;
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" aria-pressed={same(value.days, EVERY)} onClick={() => change({ days: EVERY })} className={chip(same(value.days, EVERY))}>Every day</button>
              <button type="button" aria-pressed={same(value.days, WEEKDAYS)} onClick={() => change({ days: WEEKDAYS })} className={chip(same(value.days, WEEKDAYS))}>Weekdays</button>
            </div>
            {isNew && tried && value.days.length === 0 && <p role="alert" className="mt-2 text-[13.5px] font-medium text-port-700">Choose at least one day.</p>}
          </fieldset>
          <p className="text-[13.5px] text-text-muted">{isNew
            ? 'Each of these days gets a task with this name when its week arrives. It is an ordinary task: tick it, move it, or delete it for a day off.'
            : 'Changes apply from now on. Tasks already made are left as they are.'}</p>
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            {existing && <button type="button" onClick={remove} className={del}><Trash2 size={15} aria-hidden="true" />End session</button>}
            <button type="submit" className={`${done} ${isNew ? '' : 'sm:hidden'}`}>{isNew ? 'Add session' : 'Done'}</button>
          </div>
        </form>
      )}
    </EditorFrame>
  );
}

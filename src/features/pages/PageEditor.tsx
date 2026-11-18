import { BookMarked, ListChecks, type LucideIcon, PenLine, Shapes, Target, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { kindOf, PAGE_KINDS, PAGE_LIMITS } from '../../domain/pages';
import { type PageKind, SUBJECT_COLOURS } from '../../domain/types';
import { useCompass } from '../../state/store';
import { DraftInput } from '../../ui/DraftField';
import { chip, EditorFrame } from '../../ui/EditorFrame';
import { toast } from '../../ui/Toast';

const ICONS: Record<PageKind, LucideIcon> = { note: PenLine, checklist: ListChecks, goal: Target, reading: BookMarked, project: Shapes };

/** The mark for a kind of page. Decorative: the kind is always named or plain from the page beside it. */
export function KindIcon({ kind, size = 18, tone = 'text-text-muted' }: { kind: PageKind; size?: number; tone?: string }) {
  const Icon = ICONS[kind];
  return <Icon size={size} strokeWidth={size > 20 ? 1.9 : 2} aria-hidden="true" className={`shrink-0 ${tone}`} />;
}

const label = 'flex flex-col gap-1.5 text-[13.5px] font-medium text-text-muted';
const legend = 'mb-2 text-[13.5px] font-medium text-text-muted';
const field = 'h-11 rounded-md bg-surface-sheet px-3 text-[16px] font-normal text-text shadow-[inset_0_0_0_1.5px_var(--color-control)]';

/** Name a page, change its kind, give it a subject or a date to aim for, or delete it. Changes save as they are made. */
export function PageEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const page = useCompass((s) => s.pages.find((p) => p.id === id)), subjects = useCompass((s) => s.subjects), update = useCompass((s) => s.updatePage), navigate = useNavigate();
  useEffect(() => { if (id && !page) onClose(); }, [id, page, onClose]);
  const remove = () => {
    if (!page) return;
    const gone = useCompass.getState().deletePage(page.id);
    onClose(); navigate('/pages');
    if (gone) toast(`${page.title} deleted.`, { label: 'Undo', run: () => useCompass.getState().restorePage(gone) });
  };
  return (
    <EditorFrame open={!!id && !!page} anchor="[data-edit-page]" title="Edit page" labelId="page-editor-title" onClose={onClose}>
      {(close) => page && (
        <form method="dialog" className="contents" onSubmit={(e) => { e.preventDefault(); close(); }}>
          <label className={label}>Title
            {/* a new page is named "Untitled", which is selected so that typing replaces it */}
            <DraftInput autoFocus required maxLength={PAGE_LIMITS.title} value={page.title} onSave={(title) => update(page.id, { title })} onFocus={(e) => { if (page.title === 'Untitled') e.currentTarget.select(); }} className={field} />
          </label>
          <fieldset>
            <legend className={legend}>Kind</legend>
            <div className="flex flex-wrap gap-2">
              {PAGE_KINDS.map((k) => <button key={k.id} type="button" aria-pressed={page.kind === k.id} onClick={() => update(page.id, { kind: k.id })} className={chip(page.kind === k.id)}>{k.label}</button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend className={legend}>Subject</legend>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={!page.subjectId} onClick={() => update(page.id, { subjectId: null })} className={chip(!page.subjectId)}>None</button>
              {subjects.map((s) => (
                <button key={s.id} type="button" aria-pressed={page.subjectId === s.id} onClick={() => update(page.id, { subjectId: s.id })} className={`${chip(page.subjectId === s.id)} flex items-center gap-2`}>
                  <span aria-hidden="true" className="size-2 rounded-full" style={{ background: SUBJECT_COLOURS[s.colour].dot }} />{s.name}
                </button>
              ))}
            </div>
          </fieldset>
          {kindOf(page.kind).dated && (
            <div className="flex flex-wrap items-end gap-2">
              <label className={label}>A date to aim for
                <input type="date" value={page.aimFor ?? ''} onChange={(e) => update(page.id, { aimFor: e.target.value || null })} className={`${field} w-fit`} />
              </label>
              {page.aimFor && <button type="button" onClick={() => update(page.id, { aimFor: null })} className={chip(false)}>No date</button>}
              <p className="basis-full text-[13.5px] text-text-muted">Nothing happens when the date passes.</p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <button type="button" onClick={remove} className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[14.5px] font-semibold text-port-600 hover:bg-port-100"><Trash2 size={15} aria-hidden="true" />Delete page</button>
            <button type="submit" className="ml-auto min-h-11 cursor-pointer rounded-md bg-surface-inverse px-5 text-[14.5px] font-semibold text-text-inverse hover:bg-deep-700 sm:hidden">Done</button>
          </div>
        </form>
      )}
    </EditorFrame>
  );
}

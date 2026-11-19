import { Link, useNavigate } from 'react-router';
import { listCount, type Starter, startersFor, subjectPageLine, subjectPages } from '../../domain/pages';
import { SUBJECT_COLOURS, type Subject } from '../../domain/types';
import { useCompass } from '../../state/store';
import { chip } from '../../ui/EditorFrame';
import { SegmentedProgress } from '../../ui/SegmentedProgress';
import { KindIcon } from '../pages/PageEditor';

/**
 * A subject's own pages: the My pages that carry it. Nothing is kept twice, so a row opens the page where it lives.
 * A page started from here already carries the subject.
 */
export function SubjectPagesPart({ subject }: { subject: Subject }) {
  const pages = useCompass((s) => s.pages), addPage = useCompass((s) => s.addPage), navigate = useNavigate();
  const own = subjectPages(pages, subject.id), starters = startersFor(pages, subject.id), colours = SUBJECT_COLOURS[subject.colour];
  // a titled page opens ready to fill in. A plain note opens its editor, as a new page in My pages does, with its title ready to type
  const start = (s: Starter) => { const id = addPage(s.kind, { title: s.title, subjectId: subject.id }); navigate(`/pages/${id}`, s.title ? undefined : { state: { fresh: id } }); };
  return (
    <div data-subject-pages>
      <h3 className="text-[20px] leading-[1.3]">Pages</h3>
      {own.length === 0 && <p className="mt-1 text-[14.5px] text-text-muted">Nothing kept for {subject.name} yet.</p>}
      <ul className="mt-1">
        {own.map((p) => {
          const count = listCount(p);
          return (
            <li key={p.id} data-page={p.id} className="border-t border-line first:border-t-0">
              <Link to={`/pages/${p.id}`} className="grid min-h-[58px] grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-3 rounded-[9px] py-1.5 outline-offset-0 hover:bg-surface-well">
                <span aria-hidden="true" className="ml-1 grid size-[30px] place-items-center rounded-[9px]" style={{ background: colours.tint, color: colours.text }}><KindIcon kind={p.kind} size={16} tone="" /></span>
                <span className="min-w-0">
                  <span className="block truncate text-[14.5px] font-semibold">{p.title}</span>
                  <span data-page-line className="block truncate text-[13px] text-text-muted">{subjectPageLine(p)}</span>
                </span>
                {count.total > 0 && (
                  <span className="flex shrink-0 items-center gap-3 pr-1 text-[13px] font-semibold text-text-muted">
                    <span data-bar className="max-sm:hidden"><SegmentedProgress done={count.done} total={count.total} className="align-middle" /></span>
                    <span data-count>{count.done} of {count.total}</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <div role="group" aria-label="Start a page" className={`flex flex-wrap items-center gap-2 ${own.length ? 'mt-2 border-t border-line pt-3' : 'mt-2'}`}>
        <p className="mr-1 text-[13.5px] font-semibold text-text-muted">Start one</p>
        {starters.map((s) => <button key={s.id} type="button" data-starter={s.id} onClick={() => start(s)} className={chip(false)}>{s.label}</button>)}
      </div>
    </div>
  );
}

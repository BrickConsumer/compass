import { ArrowUpRight } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import type { Subject } from '../../domain/types';
import { useCompass } from '../../state/store';
import { LinkList } from '../links/LinkList';

const quiet = 'min-h-11 cursor-pointer rounded-[9px] px-1 text-[14.5px] font-semibold text-text-link sm:min-h-9';

/**
 * A subject's links to other sites: shown in a row, each opening in a new tab, and changed in place with the same rows
 * Settings uses for your own links. The editor opens on the page, not over it, so Undo stays in reach after a link is removed.
 */
export function SubjectLinksPart({ subject }: { subject: Subject }) {
  const links = subject.links ?? [], id = subject.id, panel = useId(), addId = `new-link-${id}`;
  const add = useCompass((s) => s.addSubjectLink), update = useCompass((s) => s.updateSubjectLink), remove = useCompass((s) => s.deleteSubjectLink);
  const restore = useCompass((s) => s.restoreSubjectLink), move = useCompass((s) => s.moveSubjectLink);
  // opened to add a first link, the editor starts in the name box. Opened to change links, it leaves the cursor where it is
  const [editing, setEditing] = useState<false | 'add' | 'edit'>(false);
  useEffect(() => { if (editing === 'add') document.getElementById(addId)?.focus(); }, [editing, addId]);
  return (
    <div data-links-part>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[20px] leading-[1.3]">Links</h3>
        <button type="button" data-edit-links aria-expanded={!!editing} aria-controls={panel} onClick={() => setEditing(editing ? false : links.length ? 'edit' : 'add')} className={quiet}>
          {editing ? 'Done' : links.length ? 'Edit links' : 'Add a link'}
        </button>
      </div>
      {links.length > 0 && (
        <ul data-subject-links className="mt-0.5 flex flex-wrap gap-x-7">
          {links.map((l) => (
            <li key={l.id} className="min-w-0 max-w-full">
              <a href={l.url} target="_blank" rel="noopener noreferrer" aria-label={`${l.name}, opens in a new tab`} className="flex min-h-11 items-center gap-1.5 rounded-xs text-[14.5px] font-semibold sm:min-h-9">
                <span className="min-w-0 [overflow-wrap:anywhere]">{l.name}</span><ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" className="shrink-0 text-text-subtle" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <div id={panel} role="group" aria-label={`Links for ${subject.name}`} data-links-editor className="mt-2 flex flex-col gap-3">
          <LinkList links={links} addId={addId} onAdd={(input) => add(id, input)} onUpdate={(linkId, patch) => update(id, linkId, patch)} onDelete={(linkId) => remove(id, linkId)}
            onRestore={(link, index) => restore(id, link, index)} onMove={(linkId, direction) => move(id, linkId, direction)} />
        </div>
      )}
    </div>
  );
}

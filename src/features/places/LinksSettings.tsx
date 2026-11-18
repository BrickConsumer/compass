import { useCompass } from '../../state/store';
import { LinkList } from '../links/LinkList';
import { note } from './ListControls';

/** Links to other sites: name, address, order, remove with Undo, and add, up to six. Compass only opens them. */
export function LinksSettings() {
  const links = useCompass((s) => s.links), add = useCompass((s) => s.addLink), update = useCompass((s) => s.updateLink);
  const remove = useCompass((s) => s.deleteLink), restore = useCompass((s) => s.restoreLink), move = useCompass((s) => s.moveLink);
  return (
    <div data-links-settings className="mt-2 flex flex-col gap-3">
      <p className={`${note} max-w-[56ch]`}>Sites you open often. They sit under the places on a wide screen and at the foot of Home on a narrow one, and open in a new tab. Up to six.</p>
      <LinkList links={links} addId="new-link-name" onAdd={add} onUpdate={update} onDelete={remove} onRestore={restore} onMove={move} />
    </div>
  );
}

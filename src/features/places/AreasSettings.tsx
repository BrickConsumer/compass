import { useState } from 'react';
import { AREA_LIMITS } from '../../domain/ratings';
import { useCompass } from '../../state/store';
import { DraftInput } from '../../ui/DraftField';
import { toast } from '../../ui/Toast';
import { addButton, field, ListControls, note } from './ListControls';

/** The parts of a week that are rated in the Weekly review: rename, order, remove with Undo, and add, up to six. */
export function AreasSettings() {
  const areas = useCompass((s) => s.areas), add = useCompass((s) => s.addArea), rename = useCompass((s) => s.renameArea), move = useCompass((s) => s.moveArea), [name, setName] = useState('');
  const remove = (id: string) => {
    const removed = useCompass.getState().deleteArea(id);
    // ratings already given for it are kept, so Undo brings them back too
    if (removed) toast('Area removed.', { label: 'Undo', run: () => useCompass.getState().restoreArea(removed.area, removed.index) });
  };
  return (
    <div data-areas className="mt-2 flex flex-col gap-3">
      <p className={`${note} max-w-[56ch]`}>The parts of a week you rate in the review, out of 10. Name your own, up to six.</p>
      {areas.length > 0 && (
        <ul className="flex flex-col gap-2">
          {areas.map((a, i) => (
            <li key={a.id} className="flex items-center gap-2">
              <DraftInput value={a.name} maxLength={AREA_LIMITS.name} onSave={(value) => rename(a.id, value)} aria-label={`Area ${i + 1} name`} className={`${field} grow basis-0`} />
              <ListControls name={a.name} first={i === 0} last={i === areas.length - 1} onMove={(direction) => move(a.id, direction)} onRemove={() => remove(a.id)} />
            </li>
          ))}
        </ul>
      )}
      {areas.length >= AREA_LIMITS.max
        ? <p className={note}>Six is the most.</p>
        : (
          <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (add(name)) setName(''); }}>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={AREA_LIMITS.name} aria-label="New area" placeholder="Another part of your week" className={`${field} grow basis-0 placeholder:text-text-subtle`} />
            <button type="submit" className={addButton}>Add area</button>
          </form>
        )}
    </div>
  );
}

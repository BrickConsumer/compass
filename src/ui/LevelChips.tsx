import type { Level } from '../domain/types';
import { chip } from './EditorFrame';

const LEVELS: { id: Level; label: string }[] = [{ id: 'high', label: 'High' }, { id: 'medium', label: 'Medium' }, { id: 'normal', label: 'Normal' }];

/**
 * How much a subject matters in a week: High, Medium or Normal. Pressing the one that is set clears it.
 * The group is named by `label`, so each button is heard as "English, High, pressed".
 */
export function LevelChips({ value, onChange, label }: { value: Level | undefined; onChange: (level: Level | null) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex gap-2">
      {LEVELS.map((l) => <button key={l.id} type="button" aria-pressed={value === l.id} onClick={() => onChange(value === l.id ? null : l.id)} className={chip(value === l.id)}>{l.label}</button>)}
    </div>
  );
}

import { Check } from 'lucide-react';

interface Props { checked: boolean; onChange: () => void; label: string; disabled?: boolean; title?: string }

/**
 * A habit's tick: round, where a task's box is square, so the two are never confused.
 * A real checkbox, filled seafoam with a tick when done.
 */
export function HabitTick({ checked, onChange, label, disabled = false, title }: Props) {
  return (
    <span className="relative grid size-6 shrink-0 place-items-center max-sm:size-[26px]" title={title}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} aria-label={label}
        className="peer size-full cursor-pointer appearance-none rounded-full shadow-[inset_0_0_0_1.5px_var(--color-control)] transition-colors duration-[140ms] ease-[var(--ease-out)] checked:bg-positive checked:shadow-none disabled:cursor-default disabled:shadow-[inset_0_0_0_1.5px_var(--color-paper-300)]" />
      <Check size={13} strokeWidth={3.4} aria-hidden="true" className="pointer-events-none absolute text-paper-0 opacity-0 transition-opacity duration-[140ms] peer-checked:opacity-100" />
    </span>
  );
}

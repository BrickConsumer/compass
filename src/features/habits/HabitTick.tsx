import { Check } from 'lucide-react';
import { PulseRing, useConfirmPulse } from '../../ui/ConfirmPulse';

interface Props { checked: boolean; onChange: () => void; label: string; disabled?: boolean; title?: string }

/**
 * A habit's tick: round, where a task's box is square, so the two are never confused.
 * A real checkbox, filled seafoam with a tick when done.
 */
export function HabitTick({ checked, onChange, label, disabled = false, title }: Props) {
  const [pulse, fire] = useConfirmPulse();
  return (
    <span className="relative grid size-6 shrink-0 place-items-center max-sm:size-[26px]" title={title}>
      <input type="checkbox" checked={checked} onChange={() => { if (!checked) fire(); onChange(); }} disabled={disabled} aria-label={label}
        className="peer size-full cursor-pointer appearance-none rounded-full shadow-[inset_0_0_0_1.5px_var(--color-control)] transition-colors duration-[140ms] ease-[var(--ease-out)] checked:bg-positive checked:shadow-none disabled:cursor-default disabled:shadow-[inset_0_0_0_1.5px_var(--color-faint)]" />
      <Check size={13} strokeWidth={3.4} aria-hidden="true" className="pointer-events-none absolute text-on-positive opacity-0 [clip-path:inset(0_100%_0_0)] transition-[opacity,clip-path] duration-[180ms] ease-[var(--ease-out)] peer-checked:opacity-100 peer-checked:[clip-path:inset(0)]" />
      <PulseRing n={pulse} className="size-full rounded-full" />
    </span>
  );
}

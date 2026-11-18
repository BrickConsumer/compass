interface Props { done: number; total: number; className?: string; fill?: boolean }

/**
 * One segment per task, so three of five looks like three of five. Above 20 it becomes one bar.
 * Decorative: always shown beside the words that say the same thing.
 */
export function SegmentedProgress({ done, total, className = '', fill = false }: Props) {
  if (total <= 0) return null;
  if (total > 20) {
    return (
      <span aria-hidden="true" className={`block h-1.5 overflow-hidden rounded-full bg-track ${fill ? 'w-full' : 'w-40'} ${className}`}>
        <span className="block h-full rounded-full bg-positive transition-[width] duration-200 ease-[var(--ease-out)]" style={{ width: `${(done / total) * 100}%` }} />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={`${fill ? 'flex' : 'inline-flex'} gap-[3px] ${className}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 rounded-full transition-colors duration-200 ${fill ? 'flex-1' : 'w-3.5'} ${i < done ? 'bg-positive' : 'bg-track'}`} />
      ))}
    </span>
  );
}

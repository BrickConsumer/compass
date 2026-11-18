import { isoWeek } from '../../domain/dates';
import { focusOf, levelsFor } from '../../domain/levels';
import { type ISODate, SUBJECT_COLOURS } from '../../domain/types';
import { useCompass } from '../../state/store';

/**
 * The subjects set to High for a week, named beside the week's progress. With none, nothing is shown at all.
 * Levels kept from an earlier week say which week they were set for, and nothing else marks them.
 * `rule` draws a hairline in front, for where it follows other words on a line.
 */
export function Focus({ week, rule = false, className = '' }: { week: ISODate; rule?: boolean; className?: string }) {
  const subjects = useCompass((s) => s.subjects), levels = useCompass((s) => s.levels);
  const applied = levelsFor(levels, week, subjects), { named, more } = focusOf(subjects, applied);
  if (named.length === 0) return null;
  const from = applied.carried && applied.from ? `from week ${isoWeek(applied.from)}` : '';
  const spoken = `Focus: ${[...named.map((s) => s.name), more ? `and ${more} more` : '', from].filter(Boolean).join(', ')}`;
  return (
    <>
      {rule && <span aria-hidden="true" className="h-[15px] w-px bg-line-strong" />}
      {/* read aloud as one plain sentence; what is seen is the same words laid out, and is left out of what is read */}
      <span data-focus className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
        <span className="sr-only">{spoken}</span>
        <span aria-hidden="true">Focus</span>
        {named.map((s) => (
          <span key={s.id} aria-hidden="true" className="flex items-center gap-1.5 font-semibold text-text">
            <span className="size-2 rounded-full" style={{ background: SUBJECT_COLOURS[s.colour].dot }} />{s.name}
          </span>
        ))}
        {more > 0 && <span aria-hidden="true">and {more} more</span>}
        {from && <span aria-hidden="true">{from}</span>}
      </span>
    </>
  );
}

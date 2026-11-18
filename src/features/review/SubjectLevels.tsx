import { isoWeek } from '../../domain/dates';
import { levelsFor } from '../../domain/levels';
import { type ISODate, SUBJECT_COLOURS } from '../../domain/types';
import { useCompass } from '../../state/store';
import { LevelChips } from '../../ui/LevelChips';

/**
 * Each subject's level for one week: the week after the one being reviewed. Like the priorities above it, this is a
 * plan and not part of the saved review. The rows stay in the subject list's own order, so they do not move as a
 * level is pressed.
 */
export function SubjectLevels({ week, title }: { week: ISODate; title: string }) {
  const subjects = useCompass((s) => s.subjects), levels = useCompass((s) => s.levels), setLevel = useCompass((s) => s.setLevel);
  if (subjects.length === 0) return null;
  const applied = levelsFor(levels, week, subjects);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3"><h3 className="text-[20px] leading-[1.3]">{title}</h3><p className="text-[13.5px] font-semibold text-text-muted">Week {isoWeek(week)}</p></div>
      <p className="mt-0.5 max-w-[56ch] text-pretty text-[14.5px] text-text-muted">High subjects are named on Home, and their tasks come first in each list.</p>
      {applied.carried && applied.from && <p className="mt-0.5 text-[14.5px] text-text-muted" data-carried>Carried over from week {isoWeek(applied.from)}.</p>}
      <ul className="mt-1.5">
        {subjects.map((s) => (
          <li key={s.id} data-level-row={s.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line py-[7px] first:border-t-0 max-sm:pb-2.5 max-sm:pt-2">
            <span className="flex min-h-9 min-w-0 items-center gap-2.5 text-[15px] font-medium max-sm:min-h-[30px] max-sm:basis-full">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: SUBJECT_COLOURS[s.colour].dot }} /><span className="truncate">{s.name}</span>
            </span>
            <LevelChips value={applied.levels[s.id]} onChange={(level) => setLevel(week, s.id, level)} label={s.name} />
          </li>
        ))}
      </ul>
    </div>
  );
}

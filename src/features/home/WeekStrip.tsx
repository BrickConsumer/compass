import { useRef } from 'react';
import { addDaysISO, dayOfMonth, longDate, weekDays, weekdayShort } from '../../domain/dates';
import type { Progress } from '../../domain/tasks';
import type { Assessment, ISODate } from '../../domain/types';

interface Props {
  weekStart: ISODate; selected: ISODate; today: ISODate;
  marks: Progress[]; assessments: Assessment[];
  onSelect: (date: ISODate) => void;
}

/** One mark per task: filled when done, outlined when open. Up to six, then a count. */
function Marks({ done, total, inverse }: Progress & { inverse: boolean }) {
  if (total === 0) return <span aria-hidden="true" className="flex h-[7px] items-center"><span className={`h-[1.5px] w-3 ${inverse ? 'bg-paper-0/50' : 'bg-line-strong'}`} /></span>;
  const shown = Math.min(total, 6);
  return (
    <span aria-hidden="true" className="flex h-[7px] items-center gap-[3px] max-sm:gap-0.5">
      {Array.from({ length: shown }, (_, i) => (
        <span key={i} className={`size-[7px] rounded-[2.5px] max-sm:size-[5px] max-sm:rounded-[2px] ${i < done ? (inverse ? 'bg-seafoam-300' : 'bg-positive') : inverse ? 'shadow-[inset_0_0_0_1.2px_rgb(253_250_243/0.7)]' : 'shadow-[inset_0_0_0_1.2px_var(--color-control)]'}`} />
      ))}
      {total > 6 && <span className="pl-0.5 text-[12.5px] font-semibold leading-none">+{total - 6}</span>}
    </span>
  );
}

/** The week: seven days, each showing its load. Arrows move within it and across weeks. */
export function WeekStrip({ weekStart, selected, today, marks, assessments, onSelect }: Props) {
  const days = weekDays(weekStart), touch = useRef<number | null>(null), row = useRef<HTMLDivElement>(null);
  // the new day may be in another week, which has to render before it can take focus
  const focusDay = (date: ISODate) => { onSelect(date); window.setTimeout(() => row.current?.querySelector<HTMLButtonElement>(`[data-date="${date}"]`)?.focus(), 90); };
  const onKey = (e: React.KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, PageUp: -7, PageDown: 7 };
    // move from the day that has focus, which is the selected day unless focus was put elsewhere
    const from = (e.target as HTMLElement).closest<HTMLElement>('[data-date]')?.dataset.date ?? selected;
    if (e.key in step) { e.preventDefault(); focusDay(addDaysISO(from, step[e.key]!)); }
    else if (e.key === 'Home') { e.preventDefault(); focusDay(days[0]!); }
    else if (e.key === 'End') { e.preventDefault(); focusDay(days[6]!); }
  };
  return (
    <div ref={row} role="group" aria-label="Days of the week" onKeyDown={onKey}
      onTouchStart={(e) => { touch.current = e.touches[0]?.clientX ?? null; }}
      onTouchEnd={(e) => { const x = e.changedTouches[0]?.clientX; if (touch.current !== null && x !== undefined && Math.abs(x - touch.current) > 56) onSelect(addDaysISO(selected, x < touch.current ? 7 : -7)); touch.current = null; }}
      className="grid grid-cols-7 gap-[3px] sm:gap-2">
      {days.map((date, i) => {
        const on = date === selected, isToday = date === today, m = marks[i] ?? { done: 0, total: 0 }, due = assessments.find((a) => a.date === date);
        const name = [longDate(date), isToday ? 'today' : '', m.total ? `${m.done} of ${m.total} tasks done` : 'nothing planned', due ? due.title : '', on ? 'selected' : ''].filter(Boolean).join(', ');
        return (
          <button key={date} type="button" data-date={date} tabIndex={on ? 0 : -1} aria-pressed={on} aria-current={isToday ? 'date' : undefined} aria-label={name} onClick={() => onSelect(date)}
            className={`relative flex h-[68px] cursor-pointer flex-col justify-between rounded-[14px] px-0 py-2 text-left transition-colors duration-[140ms] max-sm:items-center sm:h-[86px] sm:rounded-lg sm:px-3.5 sm:py-2.5 lg:px-5 ${on ? 'bg-surface-inverse text-text-inverse outline-marine-300' : 'hover:bg-surface-well'}`}>
            <span className={`flex w-full justify-between text-[12.5px] font-semibold max-sm:justify-center ${on ? 'text-paper-0/75' : isToday ? 'text-marine-600' : 'text-text-muted'}`}>
              <span><span className="sm:hidden">{weekdayShort(date)[0]}</span><span className="max-sm:hidden">{weekdayShort(date)}</span></span>
              {isToday && <span className="max-lg:hidden">Today</span>}
            </span>
            <span className="flex items-center gap-2 font-display text-[22px] font-medium leading-none sm:text-[28px]">
              {dayOfMonth(date)}
              {/* between phone and wide screens there is no room for the title, so the diamond sits beside the date */}
              {due && <span aria-hidden="true" className="hidden size-[7px] rotate-45 bg-brass-500 sm:max-xl:block" />}
            </span>
            <Marks {...m} inverse={on} />
            {due && (
              <span className={`absolute bottom-2.5 right-5 flex h-[7px] max-w-[58%] items-center gap-1.5 text-[12.5px] font-semibold max-sm:bottom-auto max-sm:right-1.5 max-sm:top-2 sm:max-xl:hidden ${on ? 'text-brass-300' : 'text-brass-700'}`}>
                <span aria-hidden="true" className="size-[7px] shrink-0 rotate-45 bg-brass-500" /><span className="truncate max-xl:hidden">{due.title.slice(0, 12)}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

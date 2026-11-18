import { AnimatePresence, LayoutGroup, useIsPresent, useReducedMotion } from 'motion/react';
import * as motion from 'motion/react-m';
import { type Ref, useEffect, useRef } from 'react';
import { EASE_IN_OUT, EXIT, KNOB_ARC, KNOB_STRETCH, MOVE } from '../../design/motion';
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
  if (total === 0) return <span aria-hidden="true" className="flex h-[7px] items-center"><span className={`h-[1.5px] w-3 ${inverse ? 'bg-inverse-rule' : 'bg-line-strong'}`} /></span>;
  const shown = Math.min(total, 6);
  return (
    <span aria-hidden="true" className="flex h-[7px] items-center gap-[3px] max-sm:gap-0.5">
      {Array.from({ length: shown }, (_, i) => (
        <span key={i} className={`size-[7px] rounded-[2.5px] max-sm:size-[5px] max-sm:rounded-[2px] ${i < done ? (inverse ? 'bg-inverse-positive' : 'bg-positive') : inverse ? 'shadow-[inset_0_0_0_1.2px_var(--color-inverse-line)]' : 'shadow-[inset_0_0_0_1.2px_var(--color-control)]'}`} />
      ))}
      {total > 6 && <span className="pl-0.5 text-[12.5px] font-semibold leading-none">+{total - 6}</span>}
    </span>
  );
}

/**
 * The selected day's fill: one knob that slides from day to day (the same layout id, so it is moved, never redrawn).
 * On the way it stretches 12% along its travel and lifts a few pixels, so it moves in an arc, and settles flat.
 * `settle` is false on the first render of a week, where the knob simply arrives with the strip.
 */
function Knob({ settle }: { settle: boolean }) {
  return (
    <motion.span layoutId="day-knob" aria-hidden="true" transition={MOVE} className="absolute inset-0 -z-10 rounded-[14px] sm:rounded-lg">
      <motion.span initial={{ scaleX: 1, y: 0 }} animate={settle ? { scaleX: [1, KNOB_STRETCH, 1], y: [0, KNOB_ARC, 0] } : { scaleX: 1, y: 0 }} transition={{ duration: MOVE.duration, ease: EASE_IN_OUT }}
        className="block size-full rounded-[inherit] bg-surface-inverse" />
    </motion.span>
  );
}

/** How far the strip travels as one week gives way to the next: a nudge in the direction of travel, not a full sweep. */
const TRAVEL = 28;
/** A drag or flick past this changes the week. */
const SWIPE = { distance: 56, speed: 420 };

/**
 * Seven days. It arrives from the side the calendar moved toward and leaves by the other, and it follows the finger:
 * dragged far enough it changes the week, and otherwise it settles back.
 */
function Week({ weekStart, selected, today, marks, assessments, onSelect, direction, ref }: Props & { direction: number; ref?: Ref<HTMLDivElement> }) {
  const present = useIsPresent(), reduced = useReducedMotion(), dragged = useRef(false);
  // the knob only travels once the week is on screen: on its first render it simply arrives with the strip
  const settled = useRef(false);
  useEffect(() => { settled.current = true; }, []);
  return (
    <motion.div ref={ref} custom={direction}
      variants={{
        enter: (d: number) => ({ x: d * TRAVEL, opacity: 0 }),
        centre: { x: 0, opacity: 1, transition: reduced ? EXIT : MOVE },
        exit: (d: number) => ({ x: -d * TRAVEL, opacity: 0, transition: EXIT }),
      }}
      initial="enter" animate="centre" exit="exit"
      // the week on its way out cannot be clicked, focused or read
      inert={!present}
      drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.5} dragMomentum={false}
      onDragStart={() => { dragged.current = true; }}
      onDragEnd={(_, info) => {
        const far = Math.abs(info.offset.x) > SWIPE.distance || Math.abs(info.velocity.x) > SWIPE.speed;
        if (far) onSelect(addDaysISO(selected, info.offset.x < 0 ? 7 : -7));
        // a click follows a mouse drag; let it pass before taps count again
        window.setTimeout(() => { dragged.current = false; }, 0);
      }}
      // sideways belongs to the strip, up and down to the page
      style={{ touchAction: 'pan-y' }}
      className="grid grid-cols-7 gap-[3px] sm:gap-2">
      {/* named by the week, so the knob moves between days of this week and never across weeks */}
      <LayoutGroup id={weekStart}>
      {weekDays(weekStart).map((date, i) => {
        const on = date === selected, isToday = date === today, m = marks[i] ?? { done: 0, total: 0 }, due = assessments.find((a) => a.date === date);
        const name = [longDate(date), isToday ? 'today' : '', m.total ? `${m.done} of ${m.total} tasks done` : 'nothing planned', due ? due.title : '', on ? 'selected' : ''].filter(Boolean).join(', ');
        return (
          <button key={date} type="button" data-date={date} tabIndex={on ? 0 : -1} aria-pressed={on} aria-current={isToday ? 'date' : undefined} aria-label={name}
            onClick={() => { if (!dragged.current) onSelect(date); }} draggable={false}
            className={`press relative isolate flex h-[68px] cursor-pointer flex-col justify-between rounded-[14px] px-0 py-2 text-left max-sm:items-center sm:h-[86px] sm:rounded-lg sm:px-3.5 sm:py-2.5 lg:px-5 ${on ? 'text-text-inverse outline-focus-inverse' : 'hover:bg-surface-well'}`}>
            {on && <Knob settle={settled.current} />}
            <span className={`flex w-full justify-between text-[12.5px] font-semibold max-sm:justify-center ${on ? 'text-text-inverse-muted' : isToday ? 'text-text-link' : 'text-text-muted'}`}>
              <span><span className="sm:hidden">{weekdayShort(date)[0]}</span><span className="max-sm:hidden">{weekdayShort(date)}</span></span>
              {isToday && <span className="max-lg:hidden">Today</span>}
            </span>
            <span className="flex items-center gap-2 font-display text-[22px] font-medium leading-none sm:text-[28px]">
              {dayOfMonth(date)}
              {/* between phone and wide screens there is no room for the title, so the diamond sits beside the date */}
              {due && <span aria-hidden="true" className="hidden size-[7px] rotate-45 bg-highlight sm:max-xl:block" />}
            </span>
            <Marks {...m} inverse={on} />
            {due && (
              <span className={`absolute bottom-2.5 right-5 flex h-[7px] max-w-[58%] items-center gap-1.5 text-[12.5px] font-semibold max-sm:bottom-auto max-sm:right-1.5 max-sm:top-2 sm:max-xl:hidden ${on ? 'text-inverse-highlight' : 'text-highlight-text'}`}>
                <span aria-hidden="true" className="size-[7px] shrink-0 rotate-45 bg-highlight" /><span className="truncate max-xl:hidden">{due.title.slice(0, 12)}</span>
              </span>
            )}
          </button>
        );
      })}
      </LayoutGroup>
    </motion.div>
  );
}

/** The week: seven days, each showing its load. Arrows move within it and across weeks. */
export function WeekStrip(props: Props) {
  const { weekStart, selected, onSelect } = props, days = weekDays(weekStart), row = useRef<HTMLDivElement>(null);
  // which way the calendar last moved: +1 forward in time, -1 back
  const travel = useRef({ week: weekStart, direction: 1 });
  if (travel.current.week !== weekStart) travel.current = { week: weekStart, direction: weekStart > travel.current.week ? 1 : -1 };
  const direction = travel.current.direction;
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
    <div ref={row} role="group" aria-label="Days of the week" onKeyDown={onKey} className="relative">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <Week key={weekStart} {...props} direction={direction} />
      </AnimatePresence>
    </div>
  );
}

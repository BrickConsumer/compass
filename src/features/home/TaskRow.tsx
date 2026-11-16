import { Check, Flag } from 'lucide-react';
import * as m from 'motion/react-m';
import type { Ref } from 'react';
import { ENTER, EXIT, MOVE } from '../../design/motion';
import { type Subject, SUBJECT_COLOURS, type Task } from '../../domain/types';
import { useCompass } from '../../state/store';
import { toast } from '../../ui/Toast';

interface Props { task: Task; subject?: Subject; onEdit: (id: string) => void; number?: number; small?: boolean; ref?: Ref<HTMLLIElement> }

/**
 * One task: a checkbox, the title (which opens the editor), then priority and subject.
 * It slides to its new place when the list re-sorts, and fades when it is added or removed.
 */
export function TaskRow({ task, subject, onEdit, number, small = false, ref }: Props) {
  const toggle = useCompass((s) => s.toggleTask), cycle = useCompass((s) => s.cyclePriority);
  const done = !!task.completedAt, colours = subject ? SUBJECT_COLOURS[subject.colour] : undefined;
  const remove = () => {
    const gone = useCompass.getState().deleteTasks([task.id]);
    toast('Task deleted.', { label: 'Undo', run: () => useCompass.getState().restoreTasks(gone) });
  };
  return (
    <m.li ref={ref} layout="position" transition={MOVE} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: ENTER }} exit={{ opacity: 0, transition: EXIT }}
      className="group grid min-h-[46px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1 border-t border-line first:border-t-0 data-[editing=true]:bg-surface-well max-sm:min-h-[54px]" data-task={task.id} data-done={done}>
      <label className="relative -ml-[11px] grid size-11 shrink-0 cursor-pointer place-items-center">
        <input type="checkbox" checked={done} onChange={() => toggle(task.id)} aria-label={task.title}
          className="peer size-[22px] cursor-pointer appearance-none rounded-[7px] shadow-[inset_0_0_0_1.5px_var(--color-control)] transition-colors duration-[140ms] ease-[var(--ease-out)] checked:bg-positive checked:shadow-none max-sm:size-[26px]" />
        <Check size={14} strokeWidth={3.2} aria-hidden="true" className="pointer-events-none absolute text-paper-0 opacity-0 transition-opacity duration-[140ms] peer-checked:opacity-100" />
      </label>
      <button type="button" onClick={() => onEdit(task.id)}
        onKeyDown={(e) => {
          if (e.key === ' ') { e.preventDefault(); toggle(task.id); }
          else if (e.key.toLowerCase() === 'p') cycle(task.id);
          else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(); }
        }}
        aria-keyshortcuts="Space P Delete"
        className={`flex min-h-11 min-w-0 cursor-pointer items-center gap-2.5 rounded-[9px] text-left font-medium outline-offset-0 ${small ? 'text-[14.5px]' : 'text-[15.5px]'} max-sm:text-[16px] ${done ? 'text-text-muted line-through decoration-[rgb(14_36_58/0.35)]' : ''}`}>
        {number !== undefined && <span aria-hidden="true" className="w-4 shrink-0 font-display text-[17px] font-semibold text-brass-700 no-underline">{number}</span>}
        <span className={small ? 'line-clamp-2 py-1.5 leading-[1.3] text-balance' : 'truncate'}>{task.title}</span>
      </button>
      <span className="flex items-center gap-1 pl-2 text-[13px] text-text-muted">
        <button type="button" onClick={() => cycle(task.id)} title="Change priority (P)"
          aria-label={`Priority ${task.priority}. Change priority of ${task.title}`}
          className={`flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-[9px] px-1.5 text-[12.5px] font-semibold sm:min-w-7 sm:px-1 ${task.priority === 'high' && !done ? 'text-port-600' : task.priority === 'low' ? 'text-text-muted' : 'text-text-subtle opacity-0 focus-visible:opacity-100 group-hover:opacity-100 max-sm:hidden'}`}>
          <Flag size={13} strokeWidth={2.2} aria-hidden="true" />
          {task.priority === 'high' ? 'High' : task.priority === 'low' ? 'Low' : null}
        </button>
        {subject && colours && (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span aria-hidden="true" className="size-2 rounded-full" style={{ background: colours.dot }} />
            <span className="max-sm:sr-only">{subject.name}</span>
          </span>
        )}
      </span>
    </m.li>
  );
}

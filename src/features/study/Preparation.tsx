import { ArrowUpRight } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { weekStartOf } from '../../domain/dates';
import { preparationOf, taskWhen } from '../../domain/study';
import type { Assessment } from '../../domain/types';
import { useCompass } from '../../state/store';
import { useToday } from '../../state/useToday';
import { TaskComposer } from '../home/TaskComposer';
import { TaskRow } from '../home/TaskRow';

/**
 * What is left to prepare for one assessment, under it on its subject's page, and the link to its notification.
 * A preparation task is an ordinary task: it is the same record Home lists on its day, so ticking it here is
 * ticking it there. An assessment that is still ahead ends with a row to add one, for any time this week.
 */
export function Preparation({ assessment, ahead, onEdit }: { assessment: Assessment; ahead: boolean; onEdit: (id: string) => void }) {
  const today = useToday(), tasks = useCompass((s) => s.tasks), startsOn = useCompass((s) => s.settings.weekStartsOn);
  const { open, done } = preparationOf(tasks, assessment.id), total = open.length + done.length;
  // a past assessment with nothing under it has nothing to show, and no more can be added to it
  if (!ahead && total === 0 && !assessment.link) return null;
  return (
    <div data-preparation={assessment.id} className="pb-1 sm:pl-[58px]">
      {(total > 0 || assessment.link) && (
        <div className="flex min-h-[34px] items-center justify-between gap-3">
          <p className="text-[13.5px] font-semibold text-text-muted">{total > 0 && `Preparation, ${done.length} of ${total}`}</p>
          {assessment.link && (
            <a data-assessment-link href={assessment.link} target="_blank" rel="noopener noreferrer" aria-label="Notification, opens in a new tab"
              className="flex min-h-11 items-center gap-1 rounded-[9px] text-[13.5px] font-semibold text-text-link sm:min-h-9">Notification<ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" /></a>
          )}
        </div>
      )}
      <ul className="relative">
        <AnimatePresence initial={false} mode="popLayout">
          {[...open, ...done].map((t) => <TaskRow key={t.id} task={t} small when={t.completedAt ? 'Done' : taskWhen(t, today, startsOn)} onEdit={onEdit} />)}
        </AnimatePresence>
      </ul>
      {ahead && <div className={total ? '' : '[&>form]:border-t-0'}><TaskComposer date={weekStartOf(today, startsOn)} scope="week" subjectId={assessment.subjectId} assessmentId={assessment.id} label="Add a preparation task" /></div>}
    </div>
  );
}

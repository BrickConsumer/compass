import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { ISODate } from '../../domain/types';
import { useCompass } from '../../state/store';

interface Props { date: ISODate; scope: 'day' | 'week'; id?: string; label?: string; hint?: string }

/** The last row of a list: type a title and press Enter. Focus stays for the next one. */
export function TaskComposer({ date, scope, id, label = 'Add a task', hint }: Props) {
  const [title, setTitle] = useState(''), add = useCompass((s) => s.addTask);
  return (
    <form className="flex min-h-[46px] items-center gap-1 border-t border-line max-sm:min-h-[54px]"
      onSubmit={(e) => { e.preventDefault(); if (add({ title, date, scope })) setTitle(''); }}>
      <span aria-hidden="true" className="-ml-[11px] grid size-11 shrink-0 place-items-center text-text-muted">
        <span className="grid size-[22px] place-items-center rounded-[7px] shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]"><Plus size={13} strokeWidth={2.4} /></span>
      </span>
      <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} aria-label={label} placeholder={label} enterKeyHint="done"
        onKeyDown={(e) => { if (e.key === 'Escape') { setTitle(''); e.currentTarget.blur(); } }}
        className="h-11 w-full min-w-0 rounded-[9px] bg-transparent text-[15px] outline-offset-0 placeholder:text-text-muted max-sm:text-[16px]" />
      {hint && <kbd className="rounded-xs border border-line-strong bg-surface-sheet px-1.5 text-[12.5px] font-semibold text-text-muted max-sm:hidden">{hint}</kbd>}
    </form>
  );
}

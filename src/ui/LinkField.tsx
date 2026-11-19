import { useEffect, useRef, useState } from 'react';

const WRONG = 'That does not look like a web address.';

/**
 * One web address in an editor. It is checked when the box is left or Enter is pressed, not as it is typed, since
 * half an address is never one. `onCommit` returns whether the address was kept; a refused one stays in the box to
 * be put right, with a line saying why, and what was kept before is unchanged. It is checked once more when the
 * editor it is in closes, since Escape closes an editor with the cursor still in the box.
 * `onEnter` is for an editor that saves with Enter: it is told what was in the box, once Enter has checked it and it was kept.
 * `onType` is for an editor whose button waits on the address: it is told what is in the box as it is typed, so the
 * button can be ready before the box is left. On a phone a press on a button that is not ready does not leave the box.
 */
export function LinkField({ label, value, onCommit, onEnter, onType, className }: { label: string; value: string; onCommit: (url: string) => boolean; onEnter?: (url: string) => void; onType?: (text: string) => void; className: string }) {
  const [draft, setDraft] = useState<string | null>(null), [wrong, setWrong] = useState(false);
  const commit = (): boolean => { if (draft === null) return true; const ok = onCommit(draft); setWrong(!ok); if (ok) setDraft(null); return ok; };
  // every other box in an editor saves as it is typed, so an address typed and left with Escape must not be lost
  const latest = useRef({ draft, onCommit });
  latest.current = { draft, onCommit };
  useEffect(() => () => { const { draft: typed, onCommit: keep } = latest.current; if (typed !== null) keep(typed); }, []);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5 text-[13.5px] font-medium text-text-muted">{label}
        <input value={draft ?? value} onChange={(e) => { setDraft(e.target.value); setWrong(false); onType?.(e.target.value); }} onBlur={() => { commit(); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const typed = draft ?? value; if (commit()) onEnter?.(typed); } }}
          aria-invalid={wrong} inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="example.org/page" className={`${className} placeholder:text-text-subtle`} />
      </label>
      {wrong && <p role="alert" className="text-[14px] font-medium text-attention">{WRONG}</p>}
    </div>
  );
}

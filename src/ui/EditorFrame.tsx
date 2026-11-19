import { X } from 'lucide-react';
import { useDragControls } from 'motion/react';
import * as motion from 'motion/react-m';
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { EASE_IN_OUT, ENTER, EXIT, POPOVER_FROM, SHEET } from '../design/motion';
import { placeBeside } from './place';

/** Popover on the right, sheet below: the two ways an editor arrives and leaves. */
const SHOWN = { wide: { opacity: 1, scale: 1, transition: ENTER }, sheet: { y: 0, opacity: 1, transition: SHEET } };
const AWAY = { wide: { opacity: 0, scale: POPOVER_FROM, transition: EXIT }, sheet: { y: '100%', opacity: 0.4, transition: { duration: 0.2, ease: EASE_IN_OUT } } };
/** A sheet dragged or flicked down past this is dismissed. */
const DISMISS = { distance: 110, speed: 520 };

/** True from 640 px wide. Read as the editor renders, so the panel knows which way to arrive before its first frame. */
const WIDE = '(min-width: 640px)';
const useWide = () => useSyncExternalStore(
  (changed) => { const q = matchMedia(WIDE); q.addEventListener('change', changed); return () => q.removeEventListener('change', changed); },
  () => matchMedia(WIDE).matches,
  () => true,
);

interface Props {
  open: boolean;
  /** A selector for the row being edited. The popover sits beside it, and the row is marked while it is open. */
  anchor: string | null;
  title: string;
  /** The id given to the title, which names the dialog. */
  labelId: string;
  onClose: () => void;
  /**
   * True when the editor makes something new. Its first box then takes the cursor on a phone too. An editor empties
   * its boxes a moment after it opens, so the second new thing in a row would otherwise find the first one's words
   * still there, be taken for something being looked at, and leave the keyboard down.
   */
  fresh?: boolean;
  /** The editor's own fields. `close` leaves with the animation; use it instead of `onClose`. */
  children: (close: () => void) => ReactNode;
}

/**
 * The frame every editor shares.
 * On wider screens it is a popover beside the row it edits. On phones it is a bottom sheet that follows the finger
 * and can be dragged down by its header to close. Escape or a click outside closes it, and focus returns to the row.
 */
export function EditorFrame({ open, anchor, title, labelId, onClose, fresh = false, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const wide = useWide(), [closing, setClosing] = useState(false), [spot, setSpot] = useState<{ left: number; top: number } | null>(null);
  // where on the panel the row that opened it is, so it grows from there and goes back to it
  const [origin, setOrigin] = useState('top left');
  const grip = useDragControls();
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setClosing(false); d.showModal();
      // A dialog gives focus to the first thing in it that can take it, which is the Close button.
      // An editor is opened to write in, so focus goes to its first text box instead: always with a keyboard to hand,
      // and on a phone only when the box is empty, so that opening something to look at it does not raise the keyboard.
      // the first box takes the cursor, unless the editor was opened for another one, which says so with data-focus-first
      // and that one takes it on a phone as well, empty or not, because it is what the editor was opened to change
      const asked = d.querySelector<HTMLInputElement | HTMLTextAreaElement>('[data-focus-first]'), first = asked ?? d.querySelector<HTMLInputElement | HTMLTextAreaElement>('input:not([type="checkbox"]):not([type="date"]), textarea');
      if (first && (asked || fresh || matchMedia(WIDE).matches || !first.value)) first.focus();
    }
    // Leaving is over once it has closed. If that were only put right as it next opened, the panel would be drawn
    // once more as still leaving, which takes no presses and no cursor, and its first box could not be given the keyboard.
    else if (!open) { if (d.open) d.close(); setClosing(false); }
    // `fresh` is read as the editor opens and not watched: it says how it opened
  }, [open]);
  useLayoutEffect(() => {
    const d = ref.current, row = open && anchor && wide ? document.querySelector<HTMLElement>(anchor) : null;
    if (!d || !row) { setSpot(null); return; }
    const place = () => {
      const r = row.getBoundingClientRect(), size = { width: d.offsetWidth, height: d.offsetHeight };
      const at = placeBeside(r, size, { width: window.innerWidth, height: window.innerHeight });
      setSpot(at);
      // the point of the panel nearest the middle of the row
      const x = Math.min(Math.max(r.left + r.width / 2 - at.left, 0), size.width), y = Math.min(Math.max(r.top + r.height / 2 - at.top, 0), size.height);
      setOrigin(`${Math.round(x)}px ${Math.round(y)}px`);
    };
    place(); row.dataset.editing = 'true';
    window.addEventListener('resize', place);
    return () => { window.removeEventListener('resize', place); delete row.dataset.editing; };
  }, [open, anchor, wide]);
  // leaving is animated: ask to close, and close for real when the panel has gone
  const requestClose = useCallback(() => setClosing(true), []);
  // if the animation cannot finish (a hidden tab), close anyway
  useEffect(() => { if (!closing) return; const timer = window.setTimeout(onClose, 320); return () => window.clearTimeout(timer); }, [closing, onClose]);

  return (
    <dialog ref={ref}
      // The browser says a dialog has closed a moment after it closes. If the editor has been opened again in that moment,
      // for another row, the late word is about the last time and must not close this one.
      onClose={() => { if (!ref.current?.open) onClose(); }} onCancel={(e) => { e.preventDefault(); requestClose(); }} onClick={(e) => { if (e.target === ref.current) requestClose(); }} aria-labelledby={labelId}
      data-closing={closing} data-placed={spot ? 'beside' : undefined}
      style={spot ? { left: spot.left, top: spot.top, right: 'auto', bottom: 'auto', margin: 0 } : undefined}
      // the dialog is only a frame: the panel inside is the surface, so it can slide and fade without the frame moving
      className="m-auto w-[min(94vw,420px)] overflow-visible bg-transparent p-0 text-text backdrop:bg-transparent backdrop:transition-colors backdrop:duration-200 max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:backdrop:bg-backdrop max-sm:data-[closing=true]:backdrop:bg-transparent">
      {open && (
        <motion.div initial={wide ? AWAY.wide : AWAY.sheet} animate={closing ? (wide ? AWAY.wide : AWAY.sheet) : wide ? SHOWN.wide : SHOWN.sheet}
          onAnimationComplete={() => { if (closing) onClose(); }}
          // on its way out it takes no more presses: a second press of "Add" in that moment would add a second one
          inert={closing}
          drag={wide ? false : 'y'} dragListener={false} dragControls={grip} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 1 }}
          onDragEnd={(_, info) => { if (info.offset.y > DISMISS.distance || info.velocity.y > DISMISS.speed) requestClose(); }}
          style={{ transformOrigin: wide ? origin : 'top left' }}
          className="max-h-[calc(100dvh-24px)] overflow-y-auto rounded-xl bg-surface-sheet shadow-float max-sm:rounded-b-none max-sm:pb-[env(safe-area-inset-bottom,0px)]">
          <div className="flex flex-col gap-4 p-5">
            {/* on phones the header is the handle: drag it down to close */}
            <div onPointerDown={(e) => { if (!wide) grip.start(e); }} style={{ touchAction: wide ? undefined : 'none' }} className="-mx-5 -mt-5 px-5 pt-2.5 max-sm:cursor-grab max-sm:select-none sm:pt-5" data-grip>
              <span aria-hidden="true" className="mx-auto mb-1.5 block h-1 w-9 rounded-full bg-faint sm:hidden" />
              <div className="flex items-center justify-between gap-3">
                <h2 id={labelId} className="text-[20px]">{title}</h2>
                <button type="button" onClick={requestClose} aria-label="Close" className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-surface-well"><X size={18} aria-hidden="true" /></button>
              </div>
            </div>
            {children(requestClose)}
          </div>
        </motion.div>
      )}
    </dialog>
  );
}

/** A choice in an editor: a day, a priority, a subject. Smaller with a pointer than under a thumb. */
export const chip = (on: boolean) => `press min-h-11 cursor-pointer rounded-md px-3.5 text-[14.5px] font-medium sm:min-h-9 sm:px-3 sm:text-[14px] ${on ? 'bg-surface-inverse text-text-inverse' : 'shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well'}`;

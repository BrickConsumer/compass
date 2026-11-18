import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import type { ReactNode } from 'react';
import { ENTER, EXIT, ICON_BLUR } from '../design/motion';

/**
 * One icon turning into another: the old one fades out as the new one fades in, both a little small and blurred while
 * they overlap. `id` says which icon is showing. Under reduced motion the scale and blur drop out and it is a cross-fade.
 */
export function IconSwap({ id, children }: { id: string; children: ReactNode }) {
  const from = { opacity: 0, scale: 0.6, filter: ICON_BLUR };
  return (
    <span className="relative grid place-items-center">
      <AnimatePresence initial={false} mode="popLayout">
        <m.span key={id} initial={from} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transition: ENTER }} exit={{ ...from, transition: EXIT }} className="grid place-items-center">
          {children}
        </m.span>
      </AnimatePresence>
    </span>
  );
}

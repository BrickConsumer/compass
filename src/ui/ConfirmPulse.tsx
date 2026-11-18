import { useState } from 'react';

/** Counts ticks that should be confirmed. Call `fire` when something becomes done, never when it is undone or on load. */
export function useConfirmPulse() {
  const [n, setN] = useState(0);
  return [n, () => setN((x) => x + 1)] as const;
}

/** The ring that leaves a box as it is ticked. Keyed by the count, so each tick plays it once. Put it in a positioned box. */
export function PulseRing({ n, className }: { n: number; className: string }) {
  return n > 0 ? <span key={n} aria-hidden="true" className={`confirm-pulse pointer-events-none absolute ${className}`} /> : null;
}

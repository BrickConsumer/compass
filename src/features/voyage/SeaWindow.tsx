import { Component, lazy, type ReactNode, Suspense, useEffect, useState } from 'react';
import type { BoatColours, StageId } from './boat/specs';
import { BoatPoster } from './poster/BoatPoster';

const Scene = lazy(() => import('./scene/Scene'));

/** True when this browser can give us a WebGL 2 context. Checked once. */
let webglSupport: boolean | undefined;
function hasWebGL(): boolean {
  if (webglSupport === undefined) {
    try { webglSupport = !!document.createElement('canvas').getContext('webgl2'); } catch { webglSupport = false; }
  }
  return webglSupport;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const q = matchMedia('(prefers-reduced-motion: reduce)'), on = () => setReduced(q.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** If the 3D scene fails to load or loses its context, keep the still image and say nothing. */
class KeepPoster extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export interface SeaWindowProps {
  stage: StageId;
  /** Share of the selected day done, 0 to 1, or null when nothing is planned. */
  progress: number | null;
  colours: BoatColours;
  boatName: string;
  /** The day before had tasks planned and none were done: today opens in a storm that clears as tasks are done. */
  missedYesterday?: boolean;
  /** The user has paused the sea. */
  paused?: boolean;
  /** Show only the still image and never load the 3D scene. */
  still?: boolean;
  className?: string;
}

/**
 * The window onto the sea. The still image is drawn at once and reserves the space;
 * the 3D scene loads afterwards and fades in over it. Without WebGL the still image stays.
 */
export function SeaWindow({ stage, progress, colours, boatName, missedYesterday = false, paused = false, still = false, className = '' }: SeaWindowProps) {
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mounted, setMounted] = useState(false);
  // load the 3D chunk only after the page has painted and settled
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    const id = idle(() => setMounted(true));
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id as number);
  }, []);
  const live = mounted && !still && !failed && hasWebGL();
  useEffect(() => { if (!live) setReady(false); }, [live]);

  return (
    <div className={`relative isolate overflow-hidden bg-[#9CC4CC] ${className}`} data-scene={live && ready ? 'live' : 'still'}>
      <BoatPoster stage={stage} progress={progress} colours={colours} boatName={boatName} missedYesterday={missedYesterday} className="absolute inset-0 size-full" />
      {live && (
        <div aria-hidden="true" className="absolute inset-0 transition-opacity duration-[400ms] ease-[var(--ease-out)] motion-reduce:duration-200" style={{ opacity: ready ? 1 : 0 }}>
          <KeepPoster onError={() => setFailed(true)}>
            <Suspense fallback={null}>
              <Scene stage={stage} progress={progress} colours={colours} missedYesterday={missedYesterday} still={paused || reduced} onReady={() => setReady(true)} />
            </Suspense>
          </KeepPoster>
        </div>
      )}
    </div>
  );
}

import { Component, lazy, type ReactNode, type RefObject, Suspense, useEffect, useRef, useState } from 'react';
import { useCompass } from '../../state/store';
import { useTheme } from '../../state/useTheme';
import type { BoatColours, StageId } from './boat/specs';
import { BoatPoster } from './poster/BoatPoster';
import type { Tier } from './tier';
import type { WaterId } from './waters';

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

/** True while the element is on screen in a visible tab. The sea draws nothing when nobody can see it. */
function useInView(ref: RefObject<HTMLElement | null>): boolean {
  const [onScreen, setOnScreen] = useState(true);
  const [tabShown, setTabShown] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver !== 'function') return;
    const io = new IntersectionObserver((entries) => setOnScreen(entries[entries.length - 1]?.isIntersecting ?? true));
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  useEffect(() => {
    const on = () => setTabShown(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return onScreen && tabShown;
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
  /** Ids of the fittings earned so far. The boat wears these and no others. */
  fittings: readonly string[];
  boatName: string;
  /** The day before had tasks planned and none were done: today opens in a storm that clears as tasks are done. */
  missedYesterday?: boolean;
  /** The user has paused the sea. */
  paused?: boolean;
  /** Show only the still image and never load the 3D scene. */
  still?: boolean;
  /** Force a performance tier, for the look review. */
  tier?: Tier;
  /** Show the night's sky. Left out, the theme decides: the sea is at night in the dark theme. */
  night?: boolean;
  /** Where the boat is sailing. Left out, the water chosen in the voyage view. */
  water?: WaterId;
  className?: string;
}

/**
 * The window onto the sea. The still image is drawn at once and reserves the space;
 * the 3D scene loads afterwards and fades in over it. Without WebGL the still image stays.
 */
export function SeaWindow({ stage, progress, colours, fittings, boatName, missedYesterday = false, paused = false, still = false, tier, night, water, className = '' }: SeaWindowProps) {
  const reduced = useReducedMotion(), dark = useTheme() === 'dark', atNight = night ?? dark;
  const chosen = useCompass((s) => s.boat.water), sailing = water ?? chosen ?? 'home';
  const box = useRef<HTMLDivElement>(null), inView = useInView(box);
  const [running, setRunning] = useState<Tier>();
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
    <div ref={box} className={`relative isolate overflow-hidden bg-sea-loading ${className}`} data-scene={live && ready ? 'live' : 'still'} data-sky={atNight ? 'night' : 'day'} data-water={sailing} data-tier={live ? running : undefined} data-asleep={live && !inView ? '' : undefined}>
      <BoatPoster stage={stage} progress={progress} colours={colours} fittings={fittings} boatName={boatName} missedYesterday={missedYesterday} night={atNight} water={sailing} className="absolute inset-0 size-full" />
      {live && (
        <div aria-hidden="true" className="absolute inset-0 transition-opacity duration-[400ms] ease-[var(--ease-out)] motion-reduce:duration-200" style={{ opacity: ready ? 1 : 0 }}>
          <KeepPoster onError={() => setFailed(true)}>
            <Suspense fallback={null}>
              <Scene stage={stage} progress={progress} colours={colours} fittings={fittings} boatName={boatName} missedYesterday={missedYesterday} night={atNight} water={sailing} still={paused || reduced} asleep={!inView} tier={tier} onTier={setRunning} onReady={() => setReady(true)} />
            </Suspense>
          </KeepPoster>
        </div>
      )}
    </div>
  );
}

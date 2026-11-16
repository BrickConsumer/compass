import { useId, useMemo } from 'react';
import { type BoatColours, fitOut, STAGES, type StageId } from '../boat/specs';
import { describeScene, sceneState } from '../light';
import { seaPoster } from './seaPoster';

export interface BoatPosterProps {
  stage: StageId;
  /** Share of the selected day done, 0 to 1. `null` means nothing is planned. */
  progress: number | null;
  colours: BoatColours;
  /** Ids of the fittings earned so far. */
  fittings: readonly string[];
  boatName: string;
  /** The day before had tasks planned and none were done: today opens in a storm. */
  missedYesterday?: boolean;
  /** Drawing size. The image scales to its box and crops to fill it. */
  width?: number;
  height?: number;
  className?: string;
}

/**
 * The still image of the boat on the sea. Shown at once while the 3D scene loads,
 * and kept if WebGL is unavailable. Drawn from the same measurements and light table as the 3D scene.
 */
export function BoatPoster({ stage, progress, colours, fittings, boatName, missedYesterday = false, width = 1178, height = 276, className }: BoatPosterProps) {
  const id = 'p' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const state = useMemo(() => sceneState(progress, { missedYesterday }), [progress, missedYesterday]);
  const markup = useMemo(
    () => seaPoster({ width, height, spec: fitOut(STAGES[stage], fittings), state, colours, id }),
    // the list is compared by what is in it, not by identity
    [width, height, stage, fittings.join(), state, colours, id],
  );
  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={describeScene(boatName, STAGES[stage].name, state)}
      // Markup is generated here from numeric measurements and validated colours, never from user text.
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

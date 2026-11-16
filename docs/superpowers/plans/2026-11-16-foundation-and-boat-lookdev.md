# Foundation and Boat Look-Dev Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Compass app shell with its design tokens, and build the 3D sloop and sea on a look-dev page so the founders can review the boat before Home is built around it.

**Architecture:** A Vite single-page React app. Boat measurements, the light table and scene-state maths are pure TypeScript modules shared by two renderers: an SVG still image (`BoatPoster`) and a lazily loaded React Three Fiber scene. A `/lookdev` route drives both from the same inputs.

**Tech Stack:** React 19.3, TypeScript 7.0 (fallback 6.x), Vite 8.3, Tailwind CSS 4.3, three 0.187, @react-three/fiber 9.8, @react-three/drei 10.7, React Router 8.5, Vitest 5.1, Playwright 1.65, Fontsource variable fonts.

**Spec:** [docs/compass-art-direction.md](../../compass-art-direction.md) (sections 5 to 7, 11, 12, 17, 18) and [docs/home-screen-spec.md](../../home-screen-spec.md) (sections 11, 17). Source brief: [docs/compass-master-brief.md](../../compass-master-brief.md).

This is plan 1 of 3. Plan 2 is the Home planner (domain, store, components, responsive, accessibility). Plan 3 is the voyage view, the Playwright suite and visual refinement. Each is written when the one before it has been reviewed.

## Global Constraints

- Do not commit or push without the founders' approval. Do not run destructive git operations.
- The two existing prototypes are moved to `prototypes/` unchanged.
- Colours, type, radii and motion values come only from the token block in art direction section 17. No hex values in components.
- Text never below 12.5 px. No all-caps or letter-spaced labels. Italic only for voyage content.
- Fonts are self-hosted from `@fontsource-variable/brygada-1918` and `@fontsource-variable/hanken-grotesk`. No font service requests.
- Scene budgets: at most 60,000 triangles and 40 draw calls; boat at most 12,000 triangles; device pixel ratio capped at 2 (1.5 on touch).
- The 3D code is a separate lazy chunk. The still image renders first and the layout never shifts.
- `prefers-reduced-motion: reduce` and the pause control both produce a still frame.
- No penalty states. The storm that follows a missed day is weather only: nothing earned is lost. (Changed at the first look review; it was "no storms".)

## Review Focus

- WebGL unavailable or context lost: the still image stays and nothing throws. Tested in Task 7.
- `progress` outside 0 to 1, or `NaN`: clamped, never a broken colour string. Tested in Task 3.
- A day with no tasks (`progress` is `null`): the anchored state, not dawn. Tested in Task 3.
- Reduced motion: no animation frames are requested after the first render. Tested in Task 7.
- A very wide or very short window (1178 by 64, 358 by 184): the boat stays in frame. Checked by screenshot in Task 7.

---

### Task 1: Scaffold, tokens and shell

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/app/App.tsx`, `src/app/routes.tsx`, `src/design/tokens.css`, `src/design/fonts.css`, `.claude/launch.json`
- Move: `compass-intro.html`, `compass-boat.html` to `prototypes/`
- Modify: `README.md`

**Interfaces:**
- Produces: Tailwind utilities for every token in art direction section 17 (for example `bg-surface-deck`, `text-text-muted`, `font-display`, `rounded-2xl`), and routes `/` and `/lookdev`.

- [ ] Scaffold with npm. Scripts: `dev`, `build` (`tsc --noEmit && vite build`), `test` (`vitest run`), `preview`.
- [ ] Copy the `@theme` block from the art direction into `src/design/tokens.css` verbatim.
- [ ] `git mv` the two prototypes into `prototypes/` and update the README's paths.
- [ ] Verify: `npm run build` exits 0. The `/` route renders "Compass" in Brygada 1918 on `paper-50`.

### Task 2: Boat measurements

**Files:**
- Create: `src/features/voyage/boat/specs.ts`
- Test: `src/features/voyage/boat/specs.test.ts`

**Interfaces:**
- Produces: `type StageId = 'dinghy' | 'sloop' | 'cutter' | 'schooner'`; `interface BoatSpec` (lengths in metres: `L`, `fS`, `fB`, `dip`, `rakeB`, `counter`, `tr`, `draft`, `keel`, `masts: MastSpec[]`, `head: HeadsailSpec[]`, `cabin?`, `cabin2?`, `bowsprit?`, flags for `tiller`, `pennant`, `lantern`, `ensign`, `stays`); `STAGES: Record<StageId, BoatSpec>`; `sheer(spec, x): number`; `tallOf(spec): number`.
- Values are the ones used for the approved boards (dinghy 3.8 m, sloop 6.8 m, cutter 9.8 m, schooner 14.2 m).

- [ ] Tests: each stage is longer and taller than the one before; every boom ends aft of its mast; `sheer(spec, 0) === spec.fS` and `sheer(spec, spec.L) === spec.fB`; headsail clews lie between mast and bow.
- [ ] Implement, then `npm test` passes.

### Task 3: Light table and scene state

**Files:**
- Create: `src/features/voyage/light.ts`
- Test: `src/features/voyage/light.test.ts`

**Interfaces:**
- Produces: `interface Light { skyTop, skyMid, skyHorizon, waterHorizon, waterDeep, sun, haze, land: string; sunAmount, hazeAmount, glitter: number }`; `lightAt(p: number): Light`; `interface SceneState { light: Light; wind: number; sailFill: number; waveHeight: number; anchored: boolean }`; `sceneState(progress: number | null): SceneState`.
- Keyframes at 0, 0.5 and 1 are the dawn, day and golden rows of art direction section 12.

- [ ] Tests: `lightAt(0).skyTop === '#a9bbcb'`, `lightAt(1).waterDeep === '#1b3d5a'`; `lightAt(-1)` equals `lightAt(0)`, `lightAt(2)` and `lightAt(NaN)` are valid; `sceneState(null).anchored === true`; `sceneState(0).waveHeight === 0.06`; `sceneState(1).waveHeight === 0.22`; wind and sail fill rise with progress.
- [ ] Implement, then `npm test` passes.

### Task 4: Still image

**Files:**
- Create: `src/features/voyage/poster/drawBoat.ts`, `src/features/voyage/poster/BoatPoster.tsx`
- Test: `src/features/voyage/poster/drawBoat.test.ts`

**Interfaces:**
- Consumes: `STAGES`, `sheer`, `tallOf`, `sceneState`.
- Produces: `<BoatPoster stage={StageId} progress={number | null} colours={BoatColours} className? />`, an SVG with `role="img"` and a label describing the state; `interface BoatColours { hull: string; sail: string; pennant: string }`.

- [ ] Port the generator from the review boards. Test: output for each stage contains no `NaN` and no `undefined`; the anchored state draws furled sails.
- [ ] Verify by eye on `/lookdev`.

### Task 5: 3D boat

**Files:**
- Create: `src/features/voyage/scene/boat/hull.ts`, `sail.ts`, `Boat.tsx`, `materials.ts`
- Test: `src/features/voyage/scene/boat/hull.test.ts`

**Interfaces:**
- Consumes: `BoatSpec`, `sheer`, `BoatColours`.
- Produces: `hullGeometry(spec): BufferGeometry` (lofted through cross-sections, +x is the bow, +y is up, y = 0 is the waterline); `sailGeometry(corners, fill): BufferGeometry`; `<Boat stage colours sailFill />`.

- [ ] Tests: hull geometry is closed along the keel line, has no `NaN` positions, its bounding box length equals `spec.L` within 2%, and its triangle count is within the budget.
- [ ] Build deck, cabin, spars, sails, rigging, pennant and lantern from the spec. Smooth-shaded.

### Task 6: Sea and sky

**Files:**
- Create: `src/features/voyage/scene/waves.ts`, `Sea.tsx`, `Sky.tsx`
- Test: `src/features/voyage/scene/waves.test.ts`

**Interfaces:**
- Produces: `waveHeight(x, z, t, amplitude): number` in TypeScript and the identical function as a GLSL string, so the boat rides the surface that is drawn; `<Sea state />`, `<Sky state />`.

- [ ] Tests: `waveHeight` is 0 at zero amplitude and never exceeds the amplitude.
- [ ] Water shader: gentle waves, view-angle colour, sun sparkle, haze at the horizon. Sky: three-stop gradient, sun, distant land.

### Task 7: Look-dev page and review

**Files:**
- Create: `src/features/voyage/scene/Scene.tsx`, `src/features/voyage/SeaWindow.tsx`, `src/features/lookdev/LookdevPage.tsx`
- Test: `tests/e2e/lookdev.spec.ts`

**Interfaces:**
- Produces: `<SeaWindow stage progress colours paused />`, which shows `BoatPoster` at once, lazy-loads `Scene`, and keeps the poster if WebGL is missing.

- [ ] `/lookdev` shows the window at 1178 by 276 and 358 by 184, with controls for stage, progress, colours and pause.
- [ ] Playwright: the page has no console errors; with WebGL disabled the poster remains; with reduced motion no frames are requested after the first.
- [ ] Screenshots at dawn, mid-day, golden and anchored for the sloop, saved to `docs/screenshots/lookdev/`.
- [ ] **Stop for the founders' look review of the sloop.**

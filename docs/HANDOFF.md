# Compass handoff

Written 16 November 2026 and brought up to date on 17 November, to carry the work into a new chat. Start the new chat with: "Read `docs/HANDOFF.md`, then `docs/compass-master-brief.md`, and continue."

## 1. The project

- **Compass**: a calm student planner whose distinctive feature is a sailboat that develops as you make progress.
- **Founders:** Josh, Oliver and Aditya. Oliver is driving these sessions.
- **Repository:** `/Users/oliveracciarito/Documents/Compass Inc`, remote `github.com/BrickConsumer/compass`. Nine branches, each cut from the one before. `main` still holds only the first commit.
  - `phase-1-home`: Phase 1. Pushed, with pull request 1 open to `main`.
  - `sea-performance`: the performance work. Pushed, with pull request 2 open against `phase-1-home`.
  - `reward-loop`: the reward loop. Pushed, with pull request 3 open against `sea-performance`.
  - `home-motion`: motion, the popover editor and the shortcut list. Pushed, with pull request 4 open against `reward-loop`.
  - `habits`: Stage 4, Habits. Pushed (`cb0b0ab`), with pull request 5 open against `home-motion`.
  - `study`: Stage 5, Study, with recurring study sessions. Pushed (`b83d73f`), with pull request 6 open against `habits`.
  - `weekly-review`: Stage 6, the Weekly review. Pushed (`ba9a373`), with pull request 7 open against `study`. 
  - `my-pages`: Stage 6, My pages, with two fixes to the shared editors. Pushed (`f30ff1e`, `34e3b0b`), with pull request 8 open against `weekly-review`.
  - `ci`: a GitHub Actions workflow that builds and tests every pull request. Local only when this was written. Check `git status` and `git log` for whether it has been committed and pushed, and GitHub for whether its first run passed.
- **The founders' brief** is saved word for word in `docs/compass-master-brief.md`. It is the source of requirements.
- **Rules from the brief:** design-led, ask before big creative decisions, no destructive git, **do not commit or push without approval**.

## 2. Where things stand

| Phase (brief section 9) | State |
|---|---|
| A. Repository audit | Done |
| B. Art direction | Done and **approved by Oliver on 16 November** |
| C. Home screen spec | Done and **approved** |
| D. Build the Home prototype | **Built and working.** All 13 required interactions verified in a browser. |
| The boat's look review | Two rounds done. **Parked by Oliver** ("we will look at the boat later"). |
| E. Visual refinement | **Done on 16 November. Oliver approved committing it;** Josh and Aditya have not reviewed it yet. Findings and fixes are in `docs/testing-report.md`, section 2. |

**What is committed.** Phases A to D are commit `7b00bc8` on `phase-1-home`, pushed. Phase E is commit `12574b6` on the same branch, also pushed. The performance work is on `sea-performance`, with pull request 2 open against `phase-1-home`. Both its commits are pushed: `7e72a5e` (tiers and sleeping) and `98a179d` (draw calls). The reward loop is commit `6e9730f` on `reward-loop`, pushed. The motion work is commit `e4a3846` on `home-motion`, pushed, with pull request 4 open against `reward-loop`. Stages 2 and 3 are complete. Habits is one commit on `habits`, accepted by Oliver as a first version, pushed, with pull request 5 open. Study, with recurring study sessions, is one commit on `study`, pushed, with pull request 6 open; no founder has reviewed the Study page. The Weekly review is one commit on `weekly-review`, built on 17 November, pushed, with pull request 7 open; no founder has reviewed the page. My pages is two commits on `my-pages`, built on 17 November, pushed, with pull request 8 open.

## 3. Decisions

### Approved by Oliver
- **Direction B, "Fair weather":** a living sea in a wide window above a quiet ivory planner. The art direction document compared it with A ("Chart room") and C ("Regatta").
- **Lettering rule from chart-making:** upright type for the plan; italic only for the boat's name and words describing the sea. Numbers stay upright.
- **Window above the planner**, not beside it.
- **Boat family:** dinghy, sloop, cutter, schooner, with a navy hull, ivory sails and brass trim by default.
- **Each day's light:** dawn when nothing is done, clear day as tasks are done, golden hour when everything is done.

### Decided by Oliver on 16 November, for Stage 5
- **A study session becomes an ordinary task that repeats,** not a kind of its own and not a reminder. It counts in progress, earns miles and moves the day's light like any task.

### Decided by Oliver on 16 November, for Stage 4
- **Today's habits on Home** sit on a line of their own between the week and the lists from 1280 px wide, and at the foot of the day's sheet below that. Habits have round ticks; tasks keep square boxes.

### Changed by Oliver on 16 November, during Stage 3
- **The boat's name is lettered on the quarter,** not the transom, which faces away from the usual view. The fitting's id is still `transom-name`, so saved voyages match.

### Changed by Oliver at the first look review
- **The storm stays.** A *missed day* is one that had tasks planned and none completed. The next day opens in a storm (slate sky, rain, breaking crests).
  - It clears in step with the share of tasks done, and finishing the day still reaches golden hour.
  - No miles, fittings or boats are ever lost.
- **The boat visibly sails from the first finished task:** water streams past, a wake trails behind, the islands drift by. It idles at zero tasks.
- **A day with nothing planned is spent in port,** not at anchor. The boat is moored at a pier while small figures load supplies (crates, sacks, barrels, bread), with a beach, palms, a boathouse and a lighthouse behind.
- **More 3D:** the camera is raised to look down on the deck. Oliver chose the clean, realistic sloop style over a chunky toy-like style.
- **Gulls and more interesting terrain:** layered islands, a mountain range, a mesa, sea stacks and a distant lighthouse.

### My calls, which the founders can overrule
- **Fittings order:** portlights at 350 miles, the name on the quarter at 500. This makes the sample sloop at 412 miles match what is drawn.
- **Earning something** shows one quiet line on the plate, not a pop-up. A new boat is offered in the voyage view, not swapped in.
- **Completed task titles** use `deep-600`, so they stay readable on the hover background.
- **The storm and port:** a day in port never shows the storm. The port figures have no faces.
- **Look review pass bar:** the sloop is recognisable as a silhouette, its forms read as smooth surfaces, the water reads as water, and it holds frame rate on a laptop.
- **Mileage:**
  - 2 a task, 3 for a high-priority task.
  - 3 more for finishing everything planned in a day, once per date.
  - Task miles stop at 40 a day.
- **Stage gates** need both miles and days at sea:

| Stage | Miles | Days at sea |
|---|---|---|
| Sloop | 250 | 10 |
| Cutter | 1,000 | 40 |
| Schooner | 3,000 | 120 |

## 4. Documents

- `docs/compass-master-brief.md`: the brief.
- `docs/compass-art-direction.md`: the approved identity. It covers:
  - colour tokens with measured contrast;
  - type (Brygada 1918 for display, Hanken Grotesk for the interface);
  - components, the boat, light, progression and motion;
  - references, and the token source in section 17.
- `docs/home-screen-spec.md`: layout at every width, the data model, calendar, task, progress and window behaviour, accessibility, states.
- `docs/study-spec.md`: the Study page, subjects and assessments, and what is not built.
- `docs/my-pages-spec.md`: My pages, built on 17 November. Four approaches; Oliver chose B (one page shape, five ways to start), the layout and the smaller square tick. Six smaller decisions are open, and section 13 says where the build differs from the mock.
- `docs/review-spec.md`: the Weekly review: the summary, the reflection, priorities, miles, and the calls made in the build.
- `docs/habits-spec.md`: what a habit is, what habits never do, miles, where they sit on Home, and the Habits page.
- `docs/testing-report.md`: the functional testing report against the brief's section 11, the Phase E findings, measured contrast and targets, and where the build differs from the spec.
- `docs/next-stages.md`: recommended next stages, and the decisions the founders owe.
- `docs/superpowers/plans/2026-11-16-foundation-and-boat-lookdev.md`: build plan 1.
- `docs/superpowers/plans/2026-11-16-home-planner.md`: build plan 2.
- `docs/art-direction/*.png`: images of the original review boards.
- `docs/screenshots/lookdev/`: the second boat review, covering sailing, golden hour, port, storm and the four boats.
- `docs/screenshots/home/`: Home at 375, 390, 768, 1024 and 1440, the new-task sheet, the task editor, and the voyage view. Retaken after Phase E.
- **My pages mock:** https://claude.ai/artifact/NPCbrcPSUbkeHzv3q9UXu7. Private. The layout, a goal, a checklist, and three options for a list's tick. Oliver chose the approach, the layout and the tick on 17 November, and it is built; six smaller decisions are open.
- **Recurring study sessions mock:** https://claude.ai/artifact/K8BkfUFMt7HfLrAgaY66g4. Private. Oliver chose option A on 16 November; three smaller decisions open.
- **Habits on Home mock:** https://claude.ai/artifact/MqFDefCBQVsYLmYd8JPm3b. Private. Placement decided by Oliver on 16 November; three smaller decisions open.
- **Review boards page:** https://claude.ai/artifact/9hqgFfz74FdZkBYdgJCCXm. It is private, so Josh and Aditya need it shared from its Share menu. It still shows the older side-on boat.

## 5. The code

### Stack
These versions are installed.

| Package | Version |
|---|---|
| React and React DOM | 19.3.1 |
| React Router | 8.5.1 |
| three | 0.187.0 |
| @react-three/fiber | 9.8.2 |
| @react-three/drei | 10.7.9 (installed, not used yet) |
| Zustand | 5.1.0 |
| date-fns | 4.4.0 |
| lucide-react | 1.73.0 |
| Fontsource variable fonts (Brygada 1918, Hanken Grotesk) | 5.3.0 |
| TypeScript | 7.0.2 |
| Vite | 8.3.8 |
| Tailwind CSS | 4.3.5 |
| Vitest | 5.1.0 |
| @playwright/test | 1.65.1 |

**Motion 14.14 is installed.** Components use `m` from `motion/react-m`, and the engine is loaded after the first paint (`src/design/motionFeatures.ts`). Using `motion` from `motion/react` inside the app throws, on purpose.

### Commands
```bash
npm run dev
```
Opens on http://localhost:5173. It is also set up in `.claude/launch.json` as "compass".
```bash
npm test
```
Runs 201 unit tests, all passing.
```bash
npm run build
```
Type-checks and builds; passing. The main bundle is 173 kB compressed. The 3D chunk is 259 kB compressed and lazily loaded.
```bash
PW_CHANNEL=chrome npm run test:e2e
```
Runs 70 browser tests in the installed Chrome, all passing. Without `PW_CHANNEL` it needs Playwright's own browser, which is not installed.

**CI** is `.github/workflows/ci.yml`: two jobs on every pull request, one for the build and unit tests and one for the browser tests in Playwright's own Chromium.
- A pull request is only checked if its branch holds the workflow file, so the pull requests below the `ci` branch in the stack get no checks until the stack is merged.
- The six tests in `tests/e2e/sea.spec.ts` are skipped on CI. They measure frame rate and draw calls, which depend on a graphics card, and a CI runner has none. Run them on a real machine.
- To run the suite as CI does: stop the dev server, then `CI=1 PW_CHANNEL=chrome npm run test:e2e`. It should report 64 passed and 6 skipped.

### Routes
- `/` Home. The selected date is in the URL as `?date=YYYY-MM-DD`.
- `/voyage`: the boat at full size, name, colours, fittings and boats. Earned boats can be sailed; unearned ones are previews.
- `/habits`: the week as a grid of ticks, a count for each habit, earlier weeks as the record, and adding, editing and deleting habits.
- `/study` and `/study/:subjectId`: the subjects, and one subject's assessments, tasks and notes.
- `/review`: a week's summary, a reflection of three questions, priorities for the week after, and the saved reviews.
- `/pages` and `/pages/:pageId`: the user's own pages, and one page's list and writing.
- `/settings`:
  - week start, pause and fold the sea;
  - reset the sample data, or clear everything (with an in-page confirm);
  - a labelled prototype tool to set miles and days at sea.
- `/lookdev`: the boat and sea on their own, with controls for stage, tasks done, in port, missed yesterday, pause, still-only, performance tier, and colours.

### Layout of `src/`

**`design/`**
- `tokens.css`: every token. Never use hex values in components.
- `motion.ts`: the durations and curves for Motion, matching the tokens.
- `fonts.css`: the self-hosted fonts.

**`domain/`** (pure functions, unit-tested)
- `types.ts`: the data types and subject colours.
- `dates.ts`: British date formats; weeks start on Monday by default.
- `tasks.ts`:
  - `sortTasks`, `tasksForDay`, `tasksForWeek`, `allTasksInWeek`;
  - `progress`, `share`, `dayMarks`;
  - `carryOver`, `missedDay`, `upcomingAssessments`, `nextWeekPriorities`, `cleanTitle`.
- `voyage.ts`: the miles rules, `STAGE_GATES`, `FITTINGS`, `awardsFor`, `earnedStage`, `nextFitting`, `nextStage`.
  - `earnedIds`, `unseenRewards` and `announcement` drive the reward loop: what has been earned since the voyage was last opened, and the one line that says so.
- `sessions.ts`: which session tasks are due to be made (`sessionTasksDue`) and a session's days in words. A session becomes ordinary tasks; the store's `makeSessionTasks` makes them, and `AppShell` calls it when the day changes.
- `study.ts`: a subject's tasks and assessments, the one-line summary, when a task is for, and a new subject's colour.
- `habits.ts`: which habits fall on a day, a habit's week, counts, and choosing days. A tick is one habit on one day, kept as a key in a flat list.
- `pages.ts`: the five kinds of page, the rules for a page's list, the one-line summary, the order of the list, search and export. An item on a page is not a task and earns nothing.
- `review.ts`: a week's summary (`weekSummary`), which weeks can be reviewed, the award for saving one (`reviewAward`), and the excerpt shown in the list. The summary is worked out, never stored.
- `seed.ts`: sample data from the brief, placed around today, including the brief's four habits with three weeks of ticks. It starts the boat at 412 miles, 23 days at sea, sailing a sloop.

**`state/`**
- `store.ts`: a Zustand store saved to localStorage under `compass:v1`. It falls back to memory if storage is blocked, and falls back to the sample if the saved data is corrupt.
- `useToday.ts`: today's date, rechecked every minute and when the tab becomes visible.

**`ui/`**
- `Toast.tsx`: one toast at a time, with Undo.
- `EditorFrame.tsx`: the frame the task and habit editors share: a popover beside the row on wider screens, a draggable sheet on phones. `place.ts` decides where the popover sits.
- `DraftField.tsx`: a text box that saves as it is typed. Use it for any box whose record is tidied on the way in, or a space typed at the end is lost.
- `SegmentedProgress.tsx`: one segment per task, a single bar above 20.
- `CompassMark.tsx`: the logo mark.

**`app/`**
- `AppShell.tsx`: the navigation rail (labels from 1024, icons only from 640), a five-item bottom bar on phones, and the command menu on Cmd or Ctrl and K.
- `routes.tsx`: the routes listed above.

**`features/home/`**
- `HomePage`, `HomeWindow` (the sea window and voyage plate), `WeekStrip`.
- `DaySheet` (the only raised sheet), `SideLists` (any time this week, coming up, next week).
- `TaskRow`, `TaskComposer`, `TaskEditor` (its fields; the frame is `ui/EditorFrame`).

**`features/voyage/`**
- `boat/specs.ts`: the measurements of all four boats, shared by the 2D and 3D boats. `fitOut(spec, earned)` returns a boat wearing the fittings that have been earned. A boat's measurements never include fittings.
- `light.ts`: the light table, storm light, and `sceneState(progress, { missedYesterday })`, which returns light, wind, sail fill, waves, speed, storm and in-port.
- `tier.ts`: the two performance tiers, the rule for stepping down, and the frame-time watch. Pure and unit-tested.
  - Phones start on the low tier (no shadow map, fewer pixels, 30 frames a second).
  - Any device steps down when frames stay slow, and stays down for the visit.
- `poster/`: the SVG still image, used while the 3D scene loads and if WebGL is unavailable.
- `scene/`:
  - `Scene.tsx`: sky, sea, rain and wake shaders, islands, gulls, lights and framing;
  - `boat/lettering.ts`: the boat's name as a small text texture that the hull's own paint lays on the quarter. No extra mesh;
  - `boat/` (hull loft, materials, `buildBoat`), `scenery.ts` (port, people, gulls, silhouettes), `waves.ts`;
  - `batch.ts`: bakes parts that never move into one mesh for each material, which keeps a frame to 17 to 32 draw calls. Anything new that does not move should be built as ordinary meshes in plain paint (`solid()`), and the bake picks it up. Anything that moves must be added to the `moving` set.
- `SeaWindow.tsx`: shows the still image first, then lazy-loads and fades in the 3D scene. It puts the scene to sleep when the window is off screen or the tab is hidden, and exposes `data-tier` and `data-asleep` for tests.
- `VoyagePage.tsx`: the voyage view.

**`features/study/`**
- `StudyPage` (the list and the open subject's sheet) and `Editors` (the subject, assessment and session editors, in the shared frame).

**`features/pages/`**
- `PagesPage` (the list and the open page's sheet), `PageItems` (a page's list, with the smaller square tick), and `PageEditor` (title, kind, subject, date, delete).

**`features/review/`**
- `ReviewPage`: the week's sheet and the list of saved reviews. Its priorities reuse Home's `TaskRow`, `TaskComposer` and `TaskEditor`.

**`features/habits/`**
- `HabitsPage`, `HabitEditor`, `HabitTick` (the round tick), and `HabitsToday`, which Home shows as a line from 1280 px and at the foot of the day's sheet below that.

**Other `features/`**
- `places/`: Settings. No "Not built yet" pages are left.
- `lookdev/`: the look-review page.

### Keyboard
- **Anywhere on Home:** `N` add a task, `T` today, `V` voyage, `?` the list of shortcuts, Cmd or Ctrl and `K` command menu. Single keys do nothing while a dialog is open.
- **On a focused task:** Space completes it, `P` changes priority, Delete removes it with Undo.
- **On a focused item of a page's list:** Space ticks it, Delete removes it with Undo.
- **In the week strip:** arrows, Home, End, Page Up and Page Down.

## 6. Verified

**Through the connected browser (Playwright MCP):**
- All 13 required interactions work.
- Persistence across reload works.
- Miles are earned once and never fall.
- The command menu works.
- Delete with Undo works.
- Folding and pausing the sea work.
- The scene follows the selected day: in port, sailing, storm.
- There were no console errors.
- There is no sideways scroll at 375, 390, 768, 1024 and 1440.
- The still image stays without WebGL.
- Reduced motion holds a still frame.

## 7. Not verified, not built, known issues

### Not run or measured
- **Performance on a real phone** has not been measured. Laptop figures exist and are only indicative.
- **No manual screen-reader pass.** Contrast, text size and touch targets were measured by script in the running app and pass.
- **Only Chrome has been tested.**
- The full list of places where the build differs from the spec is in `docs/testing-report.md`, section 6.

### Known rough edges in the boat
- The storm's breaking crests still look like patches.
- The still image is side-on, so the picture shifts when the 3D scene takes over.
- The still image's port shows no figures.
- Five fittings are drawn on the boat: pennant, lantern, sheer stripe, portlights and the name on the quarter. The rest are listed as "earned, not yet drawn".
- The still image does not letter the name. At its size the name would be a few pixels long.

### Not built, by plan
- Dark theme and night scene.
- Drag to reorder.
- Recurring tasks.
- Accounts and sync.

### The brief's deliverables (section 13)
All eleven now exist. The last three (the Phase E pass, the testing report and the next-stages list) were done on 16 November.

## 8. Working notes

- **The Playwright MCP may refuse with "Browser is already in use"** when another chat still holds its browser. Screenshots and checks can be run instead with a small Node script that requires `node_modules/playwright` and launches `chromium.launch({ channel: 'chrome' })`. This is how the Phase E captures were made.
- **The browser tests start typing the moment the page loads.** The shortcuts are not listening for the first few milliseconds, so tests wait for `#day-title` first.
- **Playwright MCP blocks `file:` URLs.** Serve pages over http on 127.0.0.1. For retina screenshots, create a new browser context with `deviceScaleFactor: 2`.
- **The MCP writes a `.playwright-mcp/` folder** into the repo; it is in `.gitignore`.
- **A harmless warning:** "THREE.Clock deprecated", from React Three Fiber.
- **Memory notes** are in `~/.claude/projects/-Users-oliveracciarito-Documents-Compass-Inc/memory/`: founders and approval, review boards, and boat scene preferences. Oliver wants livelier visuals than my restrained defaults, and wants screenshots before a look is treated as settled.

## 9. Suggested next steps

The full list is in `docs/next-stages.md`.

1. **Get the eight pull requests reviewed and merged, in order.** None has been reviewed. CI only checks the top of the stack. The stack is already deeper than is comfortable.
2. **A founder opens Home on a real phone,** and in Safari.
3. **Merge pull request 1,** then pull request 2.
4. **Commit and push `ci`** when Oliver says so, and open its pull request against `my-pages`. Then look at its first run on GitHub: the workflow has only been checked on this machine, and the two look-review tests that need the 3D scene have never run without a graphics card. All five destinations now exist. The open decisions for My pages are in `docs/my-pages-spec.md`, section 10. Separately, a founder should look at the Weekly review page: it was built without a mock, and its open calls are in `docs/review-spec.md`, section 7.
5. **Three rules for study sessions are still open,** each built to the recommendation in the mock at https://claude.ai/artifact/K8BkfUFMt7HfLrAgaY66g4 (private; share it from its Share menu): whether sessions count toward the port and the storm, when a week's tasks are made, and what changing a session does to tasks already made. The rules are in `docs/habits-spec.md`, and the mock that settled its place on Home is at https://claude.ai/artifact/MqFDefCBQVsYLmYd8JPm3b (private; share it from its Share menu). Oliver has accepted the Habits page as a first version; Josh and Aditya have not seen it.
6. **Boat look review round three**, when Oliver is ready.

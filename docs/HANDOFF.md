# Compass handoff

Written 16 November 2026 and brought up to date on 17 and 18 November, to carry the work into a new chat. Start the new chat with: "Read `docs/HANDOFF.md`, then `docs/compass-master-brief.md`, and continue."

## 1. The project

- **Compass**: a calm student planner whose distinctive feature is a sailboat that develops as you make progress.
- **Founders:** Josh, Oliver and Aditya. Oliver is driving these sessions.
- **Repository:** `~/Documents/Compass Inc`, remote `github.com/BrickConsumer/compass` (public). **On 18 November all thirteen pull requests were merged into `main`, in order, as merge commits,** and the merged branches were deleted. `main` passed the type-check, 285 unit tests and the build at each checkpoint, and the browser tests passed in CI on the last pull request. The thirteen were: 1 Phase 1 (art direction, Home spec, Home prototype); 2 performance tiers and sleeping when unseen; 3 the reward loop; 4 motion, the popover editor and the shortcut list; 5 Habits; 6 Study with recurring sessions; 7 the Weekly review; 8 My pages; 9 CI; 10 the six boat fittings that were not drawn; 11 the Home and Weekly review additions (the first piece of Aditya's plan); 12 night and the dark theme; 13 the motion system and the new type. Work in progress that is not on `main`: the branch `new-waters`, with uncommitted changes in its own folder, and the branch `study-detail` (piece 2 of Aditya's plan). `study-detail` was built in a separate working folder at `.claude/worktrees/home-review-additions`, committed on 18 November with Oliver's approval after a fresh reviewer's findings were fixed, brought up to date with `main`, and pushed as pull request 15 against `main`.
- **A founder's personal planner is kept outside the repository** and must never be committed, because the repository is public.
- **The founders' brief** is saved word for word in `docs/compass-master-brief.md`. It is the source of requirements.
- **Rules from the brief:** design-led, ask before big creative decisions, no destructive git, **do not commit or push without approval**.
- **Who decides:** since 18 November, Josh and Aditya go with Oliver's decisions unless he says otherwise, so what Oliver approves counts as the founders' approval. This is Oliver's account of the arrangement; the brief itself has not been changed. Merging and anything destructive still wait for Oliver's say.

## 2. Where things stand

| Phase (brief section 9) | State |
|---|---|
| A. Repository audit | Done |
| B. Art direction | Done and **approved by Oliver on 16 November** |
| C. Home screen spec | Done and **approved** |
| D. Build the Home prototype | **Built and working.** All 13 required interactions verified in a browser. |
| The boat's look review | Two rounds done. **Parked by Oliver** ("we will look at the boat later"). |
| E. Visual refinement | **Done on 16 November. Oliver approved committing it;** Josh and Aditya have not reviewed it themselves, and Oliver decides for them (see section 1). Findings and fixes are in `docs/testing-report.md`, section 2. |

**What is committed.** Phases A to D are commit `7b00bc8` on `phase-1-home`, pushed. Phase E is commit `12574b6` on the same branch, also pushed. The performance work is on `sea-performance`, with pull request 2 open against `phase-1-home`. Both its commits are pushed: `7e72a5e` (tiers and sleeping) and `98a179d` (draw calls). The reward loop is commit `6e9730f` on `reward-loop`, pushed. The motion work is commit `e4a3846` on `home-motion`, pushed, with pull request 4 open against `reward-loop`. Stages 2 and 3 are complete. Habits is one commit on `habits`, accepted by Oliver as a first version, pushed, with pull request 5 open. Study, with recurring study sessions, is one commit on `study`, pushed, with pull request 6 open; no founder has reviewed the Study page. The Weekly review is one commit on `weekly-review`, built on 17 November, pushed, with pull request 7 open; no founder has reviewed the page. My pages is two commits on `my-pages`, built on 17 November, pushed, with pull request 8 open.

## 3. Decisions

### Decided by Oliver on 18 November
- **Type:** Libre Caslon Text for display and Source Sans 3 for the interface replace Brygada 1918 and Hanken Grotesk, which read as generic. Chosen from three pairings rendered on the real Home screen (Almanac, Harbour, Logbook). The fonts are self-hosted, and the boat's name on the hull is lettered in the new italic.
- **Motion:** a motion system that extends the existing tokens: exits 20% shorter than entrances, a 0.97 press, rows staggered 30ms apart, a confirming ring on a tick, a moving selected-day knob, popovers that grow from their trigger, and icon cross-fades. Not built: stagger on Home itself, arcs for anything but the knob, a colour reveal on the tick box.
- **Who decides:** Oliver, for all three founders (see section 1).

### Approved by Oliver
- **Direction B, "Fair weather":** a living sea in a wide window above a quiet ivory planner. The art direction document compared it with A ("Chart room") and C ("Regatta").
- **Lettering rule from chart-making:** upright type for the plan; italic only for the boat's name and words describing the sea. Numbers stay upright.
- **Window above the planner**, not beside it.
- **Boat family:** dinghy, sloop, cutter, schooner, with a navy hull, ivory sails and brass trim by default.
- **Each day's light:** dawn when nothing is done, clear day as tasks are done, golden hour when everything is done.

### Decided by Oliver on 17 November, for Stage 7
- **The flags to dress ship fly in port only,** on a day with nothing planned, and are stowed under sail. They are the one fitting that does not show on the boat at once.
- **The rest of Stage 7:** Oliver approved all eleven recommendations on the options page. Night comes with a dark theme that opens on dusk; three new waters are earned along the way; decorations are a sail mark, a pennant shape and one keepsake a season. The full list is in `docs/next-stages.md`, Stage 7. Night and the dark theme are built on `night-dark-theme` and approved by Oliver; waters and decorations are not built.

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
  - type (Libre Caslon Text for display, Source Sans 3 for the interface; changed from Brygada 1918 and Hanken Grotesk on 18 November);
  - components, the boat, light, progression and motion;
  - references, and the token source in section 17.
- `docs/home-screen-spec.md`: layout at every width, the data model, calendar, task, progress and window behaviour, accessibility, states.
- `docs/study-spec.md`: the Study page, subjects and assessments, and what is not built.
- `docs/night-and-dark-theme-spec.md`: **approved by Oliver on 17 November, built on 17 and 18 November, and the look approved by him on 18 November.** The dark theme and the sea's night: a measured dark palette, the night's light table, and what every screen needs. Section 16 says what was built and where it differs. The pictures are in `docs/screenshots/night/`.
- `docs/my-pages-spec.md`: My pages, built on 17 November. Four approaches; Oliver chose B (one page shape, five ways to start), the layout and the smaller square tick. Six smaller decisions are open, and section 13 says where the build differs from the mock.
- `docs/review-spec.md`: the Weekly review: the summary, the reflection, priorities, miles, and the calls made in the build.
- `docs/habits-spec.md`: what a habit is, what habits never do, miles, where they sit on Home, and the Habits page.
- `docs/testing-report.md`: the functional testing report against the brief's section 11, the Phase E findings, measured contrast and targets, and where the build differs from the spec.
- `docs/next-stages.md`: recommended next stages, and the decisions the founders owe.
- `docs/superpowers/plans/2026-11-16-foundation-and-boat-lookdev.md`: build plan 1.
- `docs/superpowers/plans/2026-11-16-home-planner.md`: build plan 2.
- **Aditya's plan,** the planner this work comes from, is **not in the repository**: the repository is public and the plan is personal. Oliver keeps it at `~/Documents/Compass private/aditya-site-plan.md`. It is the source for five pieces of work; `docs/next-stages.md`, Stage 8, says where each part goes. Do not commit it, or anything else personal to a founder.
- `docs/home-and-review-additions-spec.md`: the first of those pieces, built on 17 November. A greeting, a long-term goal and links on Home; ratings and subject levels in the Weekly review. Oliver chose the approach and six decisions from the mock and approved the document. Nine smaller calls are open (section 12), and section 19 says where the build differs.
- `docs/superpowers/plans/2026-11-17-home-and-review-additions.md`: the build plan for that piece.
- `docs/screenshots/additions/`: that piece's mocks (the files named `mock-`) and pictures of the built pages (the numbered files).
- `docs/study-detail-spec.md`: the second piece, built on 18 November. A subject's topic, preparation tasks and a link on an assessment, a link on a task, feedback, a subject's pages and its links. Oliver chose approach B (a subject lists the My pages that carry it) and seven decisions from the mock, and approved the document. Ten smaller calls are open (section 13), and section 16 says where the build differs.
- `docs/superpowers/plans/2026-11-17-study-detail.md`: the build plan for that piece.
- `docs/screenshots/study-detail/`: its mocks and the pictures of the built pages, named the same way.
- **Study detail mock:** https://claude.ai/artifact/K3yezjZJ4BZDaCC9FQk4Bs. Private, so it needs sharing from its Share menu. A subject's page at two widths and "Coming up" on Home, with the approach and the seven decisions Oliver made from it.
- **Aditya's plan in Compass:** https://claude.ai/artifact/TzbYHALrhnx46UbYp1KJot. Private, so it needs sharing from its Share menu. Where each part of the plan goes, the first piece mocked on Home and the Weekly review, and the six decisions Oliver made from it.
- `docs/art-direction/*.png`: images of the original review boards.
- `docs/screenshots/lookdev/`: the second boat review, covering sailing, golden hour, port, storm and the four boats.
- `docs/screenshots/home/`: Home at 375, 390, 768, 1024 and 1440, the new-task sheet, the task editor, and the voyage view. Retaken after Phase E.
- **Stage 7 options:** https://claude.ai/artifact/Ax2cKW9qUbCgBXG6bTEvja. Private. Night and a dark theme, three new waters, and decorations, drawn by the app's own scene. Oliver approved every recommendation on 17 November; the decisions are in `docs/next-stages.md`, Stage 7. Not built.
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
| Fontsource fonts (Libre Caslon Text 5.3.0, Source Sans 3 5.3.1) | see package.json |
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
Runs 313 unit tests, all passing (225 before Aditya's plan, 256 after its first piece, and 285 on `main` once night and the dark theme were merged).
```bash
npm run build
```
Type-checks and builds; passing. The main bundle is 175 kB compressed. The 3D chunk is 260 kB compressed and lazily loaded.
```bash
PW_CHANNEL=chrome npm run test:e2e
```
Runs 159 browser tests in the installed Chrome, all passing (72 before Aditya's plan, 115 after its first piece, and 127 on `main` once night and the dark theme were merged). Without `PW_CHANNEL` it needs Playwright's own browser, which is not installed. The tests start a dev server of their own on port 5174, fresh for each run, so they never use the one open on 5173.

**CI** is `.github/workflows/ci.yml`: two jobs on every pull request, one for the build and unit tests and one for the browser tests in Playwright's own Chromium.
- A pull request is only checked if its branch holds the workflow file, so the pull requests below the `ci` branch in the stack get no checks until the stack is merged.
- The six tests in `tests/e2e/sea.spec.ts` are skipped on CI. They measure frame rate and draw calls, which depend on a graphics card, and a CI runner has none. Run them on a real machine.
- To run the suite as CI does: `CI=1 PW_CHANNEL=chrome npm run test:e2e`. It should report 153 passed and 6 skipped.

### Routes
- `/` Home. The selected date is in the URL as `?date=YYYY-MM-DD`.
- `/voyage`: the boat at full size, name, colours, fittings and boats. Earned boats can be sailed; unearned ones are previews. The long-term goal ("Bound for") is set here, under the boat's name.
- `/habits`: the week as a grid of ticks, a count for each habit, earlier weeks as the record, and adding, editing and deleting habits.
- `/study` and `/study/:subjectId`: the subjects, in the order of this week's levels, each with its topic. One subject's page has its topic, its level for this week, its assessments with their preparation, its tasks, feedback, pages, links, study sessions and notes.
- `/review`: a week's summary, ratings out of 10 for each area, a reflection of three questions, priorities and subject levels for the week after, and the saved reviews.
- `/pages` and `/pages/:pageId`: the user's own pages, and one page's list and writing.
- `/settings`:
  - your name, for the greeting on Home;
  - week start, pause and fold the sea;
  - the areas rated in the Weekly review, and the links (`/settings#links` goes straight to them);
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
- `study.ts`: a subject's tasks and assessments, the one-line summary, when a task is for, and a new subject's colour. Also a subject's topic (`cleanTopic`, which never rewrites it) and preparation: `isPreparation`, `preparationOf` and `preparationProgress`. A preparation task is an ordinary task with an `assessmentId`, and is preparation only while that assessment exists.
- `feedback.ts`: what a teacher said about a subject. `cleanFeedback` tidies an entry, `subjectFeedback` lists a subject's newest first, and `feedbackTask` finds the task made from an entry, which is an ordinary task named by the entry's `taskId`.
- `habits.ts`: which habits fall on a day, a habit's week, counts, and choosing days. A tick is one habit on one day, kept as a key in a flat list.
- `pages.ts`: the five kinds of page, the rules for a page's list, the one-line summary, the order of the list, search and export. An item on a page is not a task and earns nothing. For Study: `subjectPages` (the pages that carry a subject), the four starters (`STARTERS`, `startersFor`) and `subjectPageLine`.
- `review.ts`: a week's summary (`weekSummary`), which weeks can be reviewed, the award for saving one (`reviewAward`), and the excerpt shown in the list. The summary is worked out, never stored. A review is blank when nothing is written and no listed area is rated.
- `ratings.ts`: the areas a week is rated on (four to start with, the user's own after that), and a rating kept to a whole number from 1 to 10. No total or average is ever worked out.
- `levels.ts`: how much each subject matters, week by week. `levelsFor` gives a week's levels, carrying the last ones set when it has none of its own; `taskRank` orders tasks by them; `focusOf` names the High subjects for Home.
- `links.ts`: which typed addresses are web addresses (`cleanUrl`), a link's name, and finding links by name. Only http and https addresses are stored, and a save is checked again when it is opened (`storedLinks`), so a save edited by hand cannot put anything else in a link. `storedLink` does the same for the one link on a task or an assessment.
- `greeting.ts`: the line above the date on Home, by the hour, once a name is set.
- `seed.ts`: sample data from the brief, placed around today, including the brief's four habits with three weeks of ticks. It starts the boat at 412 miles, 23 days at sea, sailing a sloop.

**`state/`**
- `store.ts`: a Zustand store saved to localStorage under `compass:v1`. It falls back to memory if storage is blocked, and falls back to the sample if the saved data is corrupt.
- `useToday.ts`: today's date, rechecked every minute and when the tab becomes visible.
- `useHour.ts`: the hour, rechecked the same way, for the greeting.

**`ui/`**
- `Toast.tsx`: one toast at a time, with Undo.
- `EditorFrame.tsx`: the frame every editor shares: a popover beside the row on wider screens, a draggable sheet on phones. `place.ts` decides where the popover sits. The cursor goes to the first text box, or to the one marked `data-focus-first`. It is a modal dialog, so a toast's Undo cannot be pressed while it is open: an editor that deletes closes first.
- `LinkField.tsx`: the box for one web address, in the task and assessment editors. It checks the address when the box is left or Enter is pressed.
- `DraftField.tsx`: a text box that saves as it is typed. Use it for any box whose record is tidied on the way in, or a space typed at the end is lost.
- `SegmentedProgress.tsx`: one segment per task, a single bar above 20.
- `LevelChips.tsx`: High, Medium and Normal for a subject, used by the Weekly review and by Study. Pressing the one that is set clears it.
- `CompassMark.tsx`: the logo mark.

**`app/`**
- `AppShell.tsx`: the navigation rail (labels from 1024, icons only from 640), a five-item bottom bar on phones, and the command menu on Cmd or Ctrl and K.
- `routes.tsx`: the routes listed above.

**`features/home/`**
- `HomePage`, `HomeWindow` (the sea window and voyage plate), `WeekStrip`.
- `DaySheet` (the only raised sheet), `SideLists` (any time this week, coming up, next week).
- `TaskRow`, `TaskComposer`, `TaskEditor` (its fields; the frame is `ui/EditorFrame`). A row shows a task's link as a small arrow of its own. "Coming up" in `SideLists` counts an assessment's preparation.

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
- `Preparation` (an assessment's preparation tasks and its notification link), `Feedback` (the entries and their editor), `SubjectPages` (the subject's pages and the starters) and `SubjectLinks` (its links, changed in place).

**`features/pages/`**
- `PagesPage` (the list and the open page's sheet), `PageItems` (a page's list, with the smaller square tick), and `PageEditor` (title, kind, subject, date, delete).

**`features/review/`**
- `ReviewPage`: the week's sheet and the list of saved reviews. Its priorities reuse Home's `TaskRow`, `TaskComposer` and `TaskEditor`.
- `Ratings`: how the week went, each area out of 10. Each is a real slider drawn as ten segments.
- `SubjectLevels`: each subject's level for the week after the one reviewed.

**`features/links/`**
- `Links`: `RailLinks` (in the rail from 1024 px) and `HomeLinks` (the foot of Home below that). Both show nothing when there are no links.
- `LinkList`: the rows that change a list of links, and the row that adds one. Settings uses it for your own links and Study for a subject's.

**`features/habits/`**
- `HabitsPage`, `HabitEditor`, `HabitTick` (the round tick), and `HabitsToday`, which Home shows as a line from 1280 px and at the foot of the day's sheet below that.

**Other `features/`**
- `places/`: Settings. No "Not built yet" pages are left. `AreasSettings` and `LinksSettings` are its two lists, and `ListControls` is the move and remove buttons they share.
- `home/Focus`: the week's High subjects, named beside its progress on Home.
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
- All eleven fittings are drawn. Josh and Aditya have not reviewed how the six added on 17 November look.
- The still image does not letter the name. At its size the name would be a few pixels long.

### Not built, by plan
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
- **Leave the project's files alone while the browser tests run.** A file changed during a run has been seen to reload the page under a test and fail it. Notes can go in `.superpowers/`, which is ignored.
- **If port 5174 is in use, another chat is running its tests.** Wait for it, or run with a copy of `playwright.config.ts` on another port and delete the copy afterwards. Do not stop the other server.
- **Memory notes** are in this project's memory folder under `~/.claude/projects/`: founders and approval, review boards, and boat scene preferences. Oliver wants livelier visuals than my restrained defaults, and wants screenshots before a look is treated as settled.

## 9. Suggested next steps

The full list is in `docs/next-stages.md`.

1. **Done on 18 November: the stack is merged.** All thirteen pull requests are in `main`, in order. None was reviewed by anyone but Oliver.
2. **A founder opens Home on a real phone,** and in Safari.
3. **Merge pull request 15, and commit the other work in progress.** `study-detail` is committed and up to date with `main`. `new-waters` has uncommitted changes and was cut from an older commit, so it will need updating from `main`.
4. **Aditya's plan.** The first two of its five pieces are built. Piece 1 is merged into `main`. Piece 2, the Study detail, is on `study-detail`, as pull request 15 against `main`. Oliver approved both for the founders; the review pages are https://claude.ai/artifact/TzbYHALrhnx46UbYp1KJot and https://claude.ai/artifact/K3yezjZJ4BZDaCC9FQk4Bs. Pieces 3 to 5 (Fitness, interests in My pages, search and backup) each need their own design and review before they are built: see `docs/next-stages.md`, Stage 8.
5. **New waters, then decorations,** the two parts of Stage 7 still to build, each with a short spec of its own first. Night and the dark theme are merged into `main`; Oliver kept the blue selection and approved the look on 18 November. From here on a component names a colour role, never a step: `src/design/roles.test.ts` holds that.
6. **Three rules for study sessions are still open,** each built to the recommendation in the mock at https://claude.ai/artifact/K8BkfUFMt7HfLrAgaY66g4 (private; share it from its Share menu): whether sessions count toward the port and the storm, when a week's tasks are made, and what changing a session does to tasks already made. The rules are in `docs/habits-spec.md`, and the mock that settled its place on Home is at https://claude.ai/artifact/MqFDefCBQVsYLmYd8JPm3b (private; share it from its Share menu). Oliver has accepted the Habits page as a first version; Josh and Aditya have not seen it.
7. **Boat look review round three**, when Oliver is ready.

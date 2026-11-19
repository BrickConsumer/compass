# Compass testing report, Phase 1

| | |
|---|---|
| Date | 16 November 2026, with sections 10 to 13 added on 17 November, sections 14 and 15 on 18 November, and sections 16 and 17 on 19 November |
| Build | Branch `boat-fittings`: Phase 1 with the Phase E changes in section 2, the performance work in section 5, the reward loop in section 6, motion and the editor in section 7, Habits in section 8, Study in section 9, the Weekly review in section 10, My pages in section 11, and the later fittings in section 12. Section 13, the Home and Weekly review additions, is on the branch `home-review-additions`, cut from it. Section 14, the Study detail, is on the branch `study-detail`, cut from that |
| Covers | The brief's completion criteria (section 11) and the Phase E visual review (section 9) |
| Companions | [compass-art-direction.md](compass-art-direction.md), [home-screen-spec.md](home-screen-spec.md), [next-stages.md](next-stages.md) |

**Update, 18 November.** The stack this report was written against was merged into `main`, together with a motion system and a new type (Libre Caslon Text and Source Sans 3). At the merge the type-check passed, 285 unit tests passed, and all 127 browser tests passed. Where this report says no founder has reviewed a page, that was true when it was written; since 18 November Oliver decides for the founders. The motion has not been watched playing by a person, only checked at its end states.

## 1. Summary

Home meets every functional line of the brief's section 11 that can be checked on a laptop. The build passes, 382 unit tests pass and 237 browser tests pass. Those counts include the additions in section 13, night and the dark theme in section 14, the Study detail in section 15, Fitness in section 16 and interests and headlines in section 17; before the five it was 225 and 72, and all of those still pass unchanged.

Two things are **not** verified, and should not be read as passing:

1. **Performance on a real phone.** Only an indicative figure from a laptop exists (section 5).
2. **A manual screen-reader pass.** Structure, names and contrast were checked by script and by reading the code, not by listening.

## 2. Phase E: what the visual review found and fixed

Home was captured at 375, 390, 768, 1024, 1280 and 1440 px, plus a day in port, a finished day, the editor, the new-task sheet, the command menu, a toast and the folded window. Each was compared with the art direction.

| Found | Where | Fix |
|---|---|---|
| The day's sheet stopped in mid-page with a square bottom edge while the lists beside it carried on. It read as a clipped card, not "a page that runs to the bottom". | 1024 and up | The sheet now stretches the full height of the lists and runs off the bottom of the page. |
| The same sheet had square bottom corners with lists directly under it. | 640 to 1023 | It is a whole sheet with four rounded corners there. |
| Four different left edges: the date, the week strip's text, the sheet's text and the caption each started a few pixels apart. The week controls also stopped 8 px short of the right edge. | All widths | One text edge per width (20 px in from the window at 1024 and up, 14 px on tablet, 20 px from the screen on phones). The week controls end flush with the window. |
| The assessment label on a day was cut to "Biolog…" and ran into the date. | 1024 to 1279 | The label shows only from 1280, where it fits. Below that a brass diamond sits beside the date. |
| On tablet the diamond floated between two days and belonged to neither. | 768 | Same fix: it sits beside its date. |
| On phones the week controls sat between the date and the sea, so four bordered buttons came before the picture. | Below 640 | The order is now date, sea, boat name, week controls, week strip. The controls sit on the strip they move. |
| The phone date wrapped to two lines for long dates such as "Wednesday 23 September". | Below 640 | Phones show "Wed 23 September" at the specified 25 px. Wider screens keep the full weekday. |
| The plate read "88 more for name lettered on the transom". | 1024 and up | Each fitting has a phrase for sentences: "88 more for a name on the transom". The voyage view uses it too. |
| The week line and the week controls sat 7 px out of line with each other. | 640 and up | Both rows are the same height and share a centre line. |
| "All 5 done" where the approved voice says "All five done". | All widths | Counts from two to ten are spelled out. |
| Two-line titles left one word alone on the second line ("…chapters 6 / and 7"). | Side lists | Titles in the side lists break evenly. The empty-day sentence no longer leaves "port." alone. |
| One hex colour in a component, against the tokens rule. | Week strip | Replaced with a token. |
| Arrow keys in the week strip moved from the selected day even when focus was on another day. | Week strip | They move from the day that has focus. |
| A console warning on every load about a removed shadow type. | Scene | The scene asks for the shadow type it was already getting. No visual change. |

Reviewed and left alone: the type scale, the colour use (one accent per region holds), the rail, the one-sheet rule, the task rows, the composer, the editor and the bottom bar.

Updated screenshots are in [screenshots/home/](screenshots/home/).

![Home at 1440 px](screenshots/home/home-1440.png)

<img src="screenshots/home/home-390.png" alt="Home at 390 px" width="286">

## 3. How it was tested

| Check | Tool | Result |
|---|---|---|
| Type-check and production build | `npm run build` | Passes. Main bundle 175 kB compressed. Loaded afterwards: the animation engine, 34 kB, and the 3D scene, 260 kB. |
| Unit tests | `npm test` (Vitest) | 225 of 225 pass |
| Browser tests | `PW_CHANNEL=chrome npm run test:e2e` (Playwright, headless Chrome 157) | 72 of 72 pass, four runs in a row |
| Screenshots and state capture | Playwright scripts, six widths and nine states | No console errors in any capture |
| Contrast, text size, touch targets | A script run inside the live page at 390 and 1440 | Section 4 |
| Frame rate | The same, at phone size with the processor slowed four times | Section 5 |

The browser tests had never been run before this pass. Two failed on the first run:

- **A real fault:** the arrow-key behaviour in the table above. Fixed in the app.
- **A fault in the test:** it pressed `N` a few milliseconds after the page loaded, before the shortcuts were listening. A person cannot do this. The test now waits for the page, and the app is unchanged.

`PW_CHANNEL=chrome` is new. It runs the suite in an installed Chrome, so the 100 MB test browser does not need downloading.

### On GitHub

Added on 17 November: `.github/workflows/ci.yml` builds and tests every pull request, in two jobs. One runs the build and the unit tests. The other runs the browser tests in Playwright's own Chromium.

- **The six sea tests are skipped there.** They measure frame rate, the performance tier and draw calls, which depend on a graphics card. A CI runner has none and draws in software, so the scene would step down and the numbers would mean nothing. They still run on a real machine, and the figures in section 5 come from one.
- **Its first run on GitHub passed, both jobs,** on 17 November. That includes the two look-review tests that need the 3D scene to start, which on a runner means drawing WebGL in software. Run as CI runs it on this machine, the suite reports 66 passed and 6 skipped.
- **Only the top of the stack is checked.** GitHub runs a workflow for a pull request only if the branch holds the workflow file, so the earlier pull requests get no checks until they are merged.

## 4. The brief's completion criteria

### Home

| Criterion | Result | How it was checked |
|---|---|---|
| Home loads without runtime errors | Pass | Browser test; no console errors at any width |
| Calendar displays correctly | Pass | Screenshots at six widths |
| Week navigation works | Pass | Browser test: the two week buttons, and an arrow key across a week end |
| Date selection works | Pass | Browser test: click, arrows, `T`; the date is kept in the URL |
| Daily tasks display correctly | Pass | Browser test and screenshots |
| Weekly tasks display correctly | Pass | Browser test: four sample tasks under "Any time this week" |
| Tasks can be added | Pass | Browser test: `N`, type, Enter. An empty title is refused. |
| Tasks can be edited | Pass | Browser test: title and subject change and survive a reload |
| Tasks can be completed and reopened | Pass | Browser test |
| Progress indicators update correctly | Pass | Browser test: the daily count follows each change. Unit tests cover the sums. |
| Sample assessments display correctly | Pass | Browser test: three under "Coming up", and selecting one goes to its date |
| Next-week priorities display correctly | Pass | Browser test: three, numbered |

Also checked: delete with Undo, priority changes, the command menu, and miles being earned once and never falling.

### Boat

| Criterion | Result | How it was checked |
|---|---|---|
| The 3D boat renders | Pass | Browser test waits for the live scene; screenshots |
| Recognisable sailboat geometry | Pass, by eye | Screenshots. Oliver's look review of the boat is still open (parked). |
| Water animation works | Pass | Two captures of the canvas one second apart differ |
| Lighting and materials are coherent | Pass, by eye | Dawn, day, golden hour, port and storm captured |
| The scene does not obstruct the planner | Pass | It sits in its own window, folds to a strip, and the planner draws before the 3D code loads |
| Mobile performance is acceptable | **Not verified on a phone.** The low tier is built and behaves as specified on a laptop. | Section 5 |
| Reduced motion is respected | Pass | Browser test: the scene holds still |
| A fallback exists without WebGL | Pass | Browser test: the still image stays and nothing breaks |

### Responsive design

| Criterion | Result | How it was checked |
|---|---|---|
| Desktop, tablet and mobile layouts work | Pass | Screenshots at 375, 390, 768, 1024, 1280, 1440 |
| No horizontal overflow | Pass | Browser tests at the five widths; also on every destination page |
| Touch targets are usable | Pass | Script at 390 px: every link, button and field is at least 44 by 44 px. At 1440 the smallest is 36 px, above the 24 px the spec asks for with a pointer. |
| Text remains readable | Pass | Script: nothing below 12.5 px at either width |
| Navigation works on smaller screens | Pass | Each bottom-bar item was followed and its page loaded |

### Quality

| Criterion | Result | How it was checked |
|---|---|---|
| No obvious console errors | Pass | None at any width. One harmless warning remains: "THREE.Clock deprecated", from React Three Fiber. |
| No broken navigation | Pass | Every route was reached through the real navigation at 390 and 1440 |
| No placeholder buttons pretending to work | Pass | The four future pages state what will live there and have no controls |
| No unnecessary loading delays | Pass | The planner draws from local data on the first paint. Only the scene loads late, behind its still image. |
| No major visual inconsistencies | Pass after section 2 | |
| No severe performance issues | Pass on a laptop. Phone not verified. | Section 5 |

### Contrast

A script walked every visible piece of text on Home at 390 and 1440 px, worked out the colour actually behind it, and computed the ratio. **Nothing was below 4.5 to 1.** This is the first check of contrast inside the running app. It covers text only. Graphics such as the progress marks rest on the measured token table in the art direction.

## 5. Performance

### What was built on 16 November

The sea now has the two tiers the spec asks for, and it stops drawing when nobody can see it.

| | High tier | Low tier |
|---|---|---|
| Chosen when | A device with a mouse or trackpad | A touch device, or any device whose frames average over 22 ms for two seconds |
| Pixel density | Up to 2 | Up to 1.5, falling to 1 if frames average over 45 ms for two seconds |
| Shadow | A shadow map | None. The soft dark patch the water already draws under the hull does the job. |
| Frame rate | The display's own | Capped at 30 |
| Graphics chip | Asks for the fast one | Lets the device choose, to save battery |

- **Asleep.** The scene draws nothing while its window is scrolled out of view or the tab is hidden, and starts again when it returns.
- **One-way.** A device that steps down stays down for the visit, so the picture does not flicker between tiers.
- **Review tool.** `/lookdev` has a Performance control (Automatic, High, Low) to compare the tiers side by side.

### Measured

Apple M5 laptop, headless Chrome 157, real GPU. Frames were counted from outside the app by watching WebGL draw calls.

| Case | Result |
|---|---|
| Phone size (390 by 844, three times density, touch) | Low tier chosen. 30 frames a second. Canvas drawn at 537 by 276 for a 358 by 184 window. |
| The same, scrolled until the window is out of view | 0 frames in two seconds |
| Laptop size (1440 by 900, twice density) | High tier chosen. 60 frames a second. |
| Every frame made to take 30 ms, as on a slow device | Steps down to the low tier within a few seconds |
| Processor slowed four times, before this work | 60 frames a second, median frame 16.7 ms |

The two tiers look almost the same at window size. The low tier is slightly softer.

![High tier](screenshots/lookdev/7-tier-high.png)

![Low tier](screenshots/lookdev/7-tier-low.png)

### Draw calls and triangles

The spec's budgets are 40 draw calls and 60,000 triangles a frame. The first measurement found the scene far over the first: every plank, palm frond and limb was its own draw call. Parts that never move are now baked into one mesh for each material, the sails share one mesh, each figure is one mesh, the gulls are one mesh, and each island is one mesh.

Draw calls in a frame, before and after:

| Scene | High tier before | High tier now | Low tier before | Low tier now |
|---|---|---|---|---|
| Dinghy under sail | 59 | 20 | 50 | 17 |
| Sloop under sail | 117 | 22 | 89 | 17 |
| Sloop in a storm | 104 | 23 | 74 | 18 |
| Cutter under sail | 144 | 25 | 105 | 19 |
| Schooner under sail | 169 | 28 | 121 | 21 |
| Sloop in port | 328 | 29 | 225 | 20 |
| Schooner in port | 457 | 32 | 294 | 22 |

- **Both budgets are met in every case.** Triangles run from 11,000 to 36,000 a frame and did not change.
- **The picture was checked against the old one,** frame against frame with the scene paused, in nine cases. The boat, its reflection, the port and the figures match.
- **One thing looks different, and it is a fix.** Each island's beach, and the band and lamp of the distant lighthouse, used to show in some scenes and vanish in others, because their layers sat at the same depth. They now show every time. In the picture below, each pair of rows is before, then after: golden hour, in port, a storm, and the dinghy.

![Island layers, before and after](screenshots/lookdev/8-island-layers-before-after.png)

### What this does not show

- **How a real phone copes.** A laptop's graphics chip is far stronger than a phone's, and none of this measures heat or battery. The spec's pass bar ends with a founder checking on a real phone. That has not happened.

## 6. The reward loop

Built on 16 November, from the art direction (section 13) and the Home spec (section 11).

### What was missing

Earning a fitting changed nothing you could see. The boat's pennant, lantern, stripe and portlights were fixed by the type of boat: every sloop had all four from its first mile, and a dinghy never had any. The plate did not say when something was earned.

### What was built

| | Behaviour |
|---|---|
| **Fittings on the boat** | The boat wears the fittings that have been earned and no others, in the 3D scene and the still image alike. A pennant earned on the dinghy flies from the dinghy, and carries to every later boat. |
| **The plate** | When something has been earned since the voyage was last opened, a brass dot and one line replace the plate's last line: "New: *bow lantern*". Several at once read "New: *bow lantern* and 1 more". The name is in the voyage's italic, as the chart rule asks. |
| **A new boat** | The plate says "*The cutter* is ready". The boat on Home does not change. |
| **The voyage view** | It opens on the new boat, with one notice: "The cutter is ready. You are still sailing the sloop." and a button to sail it. New fittings carry a "New" tag in the list. Opening the view is what marks them as seen. |
| **Phones** | The same line takes the place of the miles under the window. |
| **The name on the quarter** | At 500 miles the boat's name is lettered on her quarter, on both sides, in the voyage's italic: gold leaf on a dark hull, navy on a light one. Renaming the boat repaints it at once. It is painted by the hull itself, so it adds no draw call. |
| **Assistive technology** | The plate's name includes the line, and a polite live region states it once. Nothing pops up. |

![The plate with a new fitting](screenshots/rewards/1-plate-new-fitting.png)

![The voyage view with a new boat](screenshots/rewards/3-voyage-new-boat.png)

The name on the quarter, enlarged three times. In the Home window it is under twenty pixels long, which is how a name reads on a boat at that distance:

![The name on the quarter](screenshots/rewards/6-name-on-the-quarter.png)

A dinghy and a sloop, each with nothing earned and then with the first four fittings:

<img src="screenshots/rewards/5-fittings-bare-and-earned.png" alt="Bare and fitted boats" width="300">

### Checked

- Browser tests: a new fitting is announced, survives a reload, is tagged in the voyage view, and the plate returns to normal afterwards; a new boat is offered and not swapped in, and sailing it works; on a phone the line fits without sideways scroll.
- Unit tests: what counts as new, the wording of the line, and each fitting adding to the 3D boat and to the still image.
- The sample boat at 412 miles looks exactly as before, because it has earned all four drawn fittings.

### Calls made here that the founders can overrule

- **A boat with nothing earned is plainer than before.** A new sloop has no pennant, lantern, stripe or portlights until its miles earn them. This is what the art direction describes, but it has not been seen until now.
- **The dinghy's lantern is 60% of full size,** so it does not overpower a 3.8 m boat.
- **The voyage view opens on a newly earned boat** and not on the one being sailed.
- **On phones the announcement replaces the miles** under the window until the voyage is opened.
- **The lettering is to scale,** about 0.2 m tall on the sloop. It is small in the Home window and readable in the voyage view.

## 7. Motion, the editor and the shortcut list

Built on 16 November, from the Home spec (sections 7, 13 and 14). This finishes Stage 3.

| | Behaviour |
|---|---|
| **Task rows** | A finished task holds its place for 600 ms, then slides below the open ones in 320 ms. A row fades in when added and out when deleted, and the rows around it slide to close the gap. Choosing another day swaps the list at once. |
| **Week strip** | The new week arrives from the side the calendar moved toward. The strip follows a finger or a mouse drag: past 56 px, or a quick flick, it changes the week, and otherwise it settles back. |
| **Editor on wider screens** | A popover beside the task's row, which is tinted while it is being edited. Beside the row if there is room, otherwise below or above, and always wholly on screen. No Done button: changes save as they are made. Escape or a click outside closes it and focus returns to the row. |
| **Editor on phones** | A bottom sheet that rises on a spring with no overshoot. Dragging its header down follows the finger; past 110 px, or a quick flick, it closes. |
| **Shortcut list** | `?` shows every shortcut, grouped by where it works. It is also in the command menu. |
| **Reduced motion** | Nothing slides or scales. Changes cross-fade. |

![The editor as a popover](screenshots/home/home-1440-edit-task.png)

### How it was built

- Motion 14.14, which the brief's stack lists, is now installed. Its animation engine is loaded after the first paint, which keeps the main bundle at 156 kB compressed against the spec's ceiling of 200.
- Single-key shortcuts now do nothing while any dialog is open.
- Key hints are set in the interface typeface. They were in the browser's monospace, which the type system does not include.

### Checked

- Browser tests: the shortcut list opens and closes; the popover sits beside its row, on screen, with no Done button, saves as you type, and returns focus; a click outside closes it; the phone sheet settles back after a short drag and closes after a long one; the week strip does the same; a finished task moves below the open ones; and everything works with reduced motion.
- Unit tests: where the popover sits in six cases, including a window too small for it.
- No console errors or warnings.

## 8. Habits

Built on 16 November. The rules are in [habits-spec.md](habits-spec.md). Where habits sit on Home was decided by Oliver from the mock, and Oliver accepted the Habits page as a first version on 16 November. Josh and Aditya have not reviewed either.

### What was built

| | Behaviour |
|---|---|
| **Habits** | Named by the user, for every day or chosen weekdays. A habit can be ticked for the day or any day after, never for a day still to come. |
| **On Home** | A line of its own between the week and the lists from 1280 px wide. Below that, a grid at the foot of the day's sheet. It follows the selected day, shows up to six, and shows nothing on a day with no habits. |
| **The Habits page** | The week as a grid of round ticks, a count for each habit and for the week, and earlier weeks as the record. Add, rename, choose days, delete with Undo. |
| **Miles** | One for each tick, once for each habit and day, up to 8 a day. Unticking takes nothing back. |
| **Never** | No streaks, no red, no reminders, and no effect on the sea. |

### Checked

- Browser tests: the line sits between the week and the sheet on a wide screen and on the first screen; a tick counts, logs one mile once, and survives a reload; a day ahead cannot be ticked; the grid is at the foot of the sheet at 1024 px and on a phone, with no sideways scroll; the Habits page counts each habit and keeps earlier weeks; habits can be added, renamed, given days and deleted with Undo; a day with no habits shows nothing.
- Unit tests: which habits fall on a day, a habit's week, counting only the days that have come, choosing days, the mile for a tick, the daily limit, and the store's actions.
- The task editor was moved onto a frame it now shares with the habit editor. Its own browser tests still pass unchanged.

### Calls made here that the founders can overrule

- **The limit of 8 miles a day from habits.** The art direction gives one mile a tick and no limit.
- **A new habit starts today.** Days before it was made are not counted, so its record starts clean, and they cannot be ticked.
- **Earlier weeks can still be ticked,** so a forgotten tick can be put right.
- **The page shows one week at a time.** There is no view across many weeks yet.

## 9. Study

Built on 16 November. The rules are in [study-spec.md](study-spec.md). No founder has reviewed the page. Oliver decided that a study session becomes an ordinary task that repeats.

### What was built

| | Behaviour |
|---|---|
| **The Study page** | Subjects listed beside the one that is open on wider screens. On phones the list comes first and a subject opens on its own. |
| **A subject's sheet** | Its assessments still ahead, every open task for it wherever it is planned, a row to add a task, and notes. |
| **Subjects** | Add, rename, recolour, delete with Undo. Deleting one removes its assessments and keeps its tasks. |
| **Assessments** | Add, change and delete with Undo. Until now they were fixed sample records. |
| **Study sessions** | A session repeats on chosen weekdays and becomes an ordinary task on each of them, made when its week arrives. Tasks from a session carry a small mark. Deleting one is a day off: it is not made again. Changing or ending a session leaves the tasks already made. |
| **One set of records** | A task added on a subject's page is the same task on Home, and an assessment added here appears under "Coming up". |

### Not built

- **Preparation tasks attached to one assessment.** A task belongs to a subject, not yet to a particular assessment.

### Worth knowing about sessions

- **They count like any task,** so a day with a session is never a day in port, and doing nothing on it brings the storm the next day. This was the recommendation in the mock, and is still open to change.
- **Nothing is made for a day that has gone.** A week's tasks are made on the first day the app is opened that week, from that day on.
- **The sample has no sessions,** so the sample week and every earlier screenshot are unchanged. To see one, add it on a subject's page.

### Checked

- Browser tests: the list and the first subject's sheet; a task added on a subject's page showing on Home with its subject, and a tick on Home counting here; an assessment added, shown on Home, changed, and deleted with Undo; a subject added, renamed, recoloured, and deleted with Undo; notes kept after a reload; the phone flow, with no sideways scroll.
- Browser tests for sessions: one is set up and needs a day; its task for today appears on the subject's page and on Home with the mark, counts in the day, and is ticked like any other; deleting it is not undone by a reload; renaming a session leaves its task alone; ending it keeps the task and removes the mark, and Undo restores both; a task from a session says where it came from.
- Unit tests: a subject's tasks and their order, when a task is for, assessments ahead and past, the one-line summary, a new subject's colour, which session tasks are made and when, a session's days in words, and the store's actions.
- Two of the new browser tests failed on their first run because of their own selectors, and one led to a fix in the page: the Notes label now names its text box properly.

## 10. Weekly review

Built on 17 November as a first version, to [review-spec.md](review-spec.md). No founder has reviewed the page, and it was not mocked before it was built.

### What was built

- **The page at `/review`,** in place of the "Not built yet" page. It opens on this week, with earlier weeks one step back. A week still to come cannot be opened.
- **The week's summary:** tasks done of planned, habits ticked of due, miles logged and the days they were logged on, each day's tasks, each habit's count, and the week's assessments. All of it is worked out from the existing records. Nothing is stored.
- **A reflection** of three questions. It is kept as it is typed. Saving it needs something written, and lists it among the saved reviews.
- **Priorities for the week after,** which are that week's any-time tasks: the same ones Home shows under "Next week".
- **Miles:** 10 for saving a review, once for each week, and only for this week or the one just ended.
- **The sample** has last week's review, already saved.

### Checked

- Browser tests, eight new: the page and its figures; a task ticked on Home changing the figures; saving needing words, logging ten miles once and listing the review; words kept before saving; opening a saved review from the list; a priority added here showing on Home; an older week saving with no miles and no plan; and the phone layout with no sideways scroll.
- Unit tests, fifteen new: the summary's counts, which weeks can be reviewed, the award and its limits, a blank reflection, the list's excerpt, and the store's writing and saving.
- No console errors or warnings in any capture.

### Found on the way

- **A saved review could have earned twice.** The sample's saved review has no entry of its own in the log, so saving it again would have logged ten miles. The store now gives nothing for a review that is already saved. Caught while the page was being built, and covered by a unit test.
- **One Home browser test depended on the day of the week.** It chose the second day of the week and expected the date in the address, which fails on a Tuesday, when that day is today. It then failed now and then for a second reason: the week that has just slid away is still on the page for a moment. The test now chooses its day by date. The app is unchanged.
- **One run of the full suite had four failures in the Study and sea tests,** each within a tenth of a second, which looks like the development server restarting under the run. They did not happen again in seven further runs, and the cause was not found.

### Calls made here that the founders can overrule

They are listed with the other way for each in [review-spec.md](review-spec.md), section 7. The one that matters most: the figures are live, so an old saved review shows that week as the records stand now, not as they stood when it was saved.

## 11. My pages

Built on 17 November as a first version, to [my-pages-spec.md](my-pages-spec.md). Oliver chose the approach, the layout and the tick from that document and its mock. Josh and Aditya have not reviewed it.

### What was built

- **The page at `/pages` and `/pages/:pageId`,** in place of the last "Not built yet" page. The pages are listed beside the open one; on phones the list comes first.
- **One page shape, five ways to start:** note, checklist, goal, reading and project. Every page has a title, a list, writing and an optional date. The kind sets the icon, which part comes first and what the parts are called.
- **A page's list:** items are added, ticked, changed in place, moved and deleted with Undo. A ticked item stays where it is. A checklist can be unticked in one go.
- **Goals:** a date to aim for, a "why", and "Mark as reached", which keeps the goal below the open pages.
- **Around it:** search finds a page by title, "Export my pages" saves one text file, and "Clear everything" removes pages with the rest.
- **Apart from the rest, on purpose:** an item is not a task. It earns no miles, is not on Home and does not move the sea.

### Two faults found in the editors, both older than this work

Building the page's editor showed two faults in the frame every editor shares. Both are fixed for all of them.

- **A space typed at the end of a title was lost.** The record keeps a tidied title, and the box showed the record, so the space was tidied away before the next letter arrived: "essay two words" came out as "essaytwowords". It affected the task, habit, subject, assessment and session editors, a task's notes, and the boat's name. The earlier browser tests filled each box in one go, which is why they did not see it. A text box now shows what was typed while it has focus (`src/ui/DraftField.tsx`).
- **Focus landed on the Close button, not the title.** A dialog gives focus to the first thing in it, and the Close button comes first. The frame now gives focus to the first text box: always on wider screens, and on phones only when the box is empty, so that opening something to look at it does not raise the keyboard.

A new Home browser test covers both, typing a key at a time.

### Found in testing

- **The sample goal was stamped later than the present moment,** so a page changed now sorted below it. The sample pages are now all last changed before today. Caught by the phone browser test, and now a unit test.
- Two of the new browser tests failed on their first run because of their own selectors.

### Checked

- Browser tests, fourteen new: the list and the open page; ticking and its count, with no miles and nothing on Home; adding, changing, moving and deleting items with Undo; "Untick all"; a new page with its title ready to type; a note and its list; reaching and reopening a goal; changing kind and deleting a page with Undo; search; export; the empty state; narrowing the list by kind; the phone flow; and the Home test for the two editor faults.
- Unit tests, thirty-one new: the kinds, the list's rules, goals, the one-line summary, the order of the list, search, export, and the store's actions.
- No console errors or warnings in any capture.

### Calls made here that the founders can overrule

They are in [my-pages-spec.md](my-pages-spec.md): section 10 for the decisions built to their recommendations, and section 13 for where the build differs from the mock.

## 12. The later fittings

The first part of Stage 7, built on 17 November. Oliver has seen the screenshots and decided when the dress flags fly. Josh and Aditya have not reviewed it.

![The schooner in port, dressed overall](screenshots/fittings/6-schooner-in-port-close.png)

![The schooner under sail, with her flags stowed](screenshots/fittings/4-schooner-at-sea-close.png)

### What was built

The six fittings that could be earned but were not drawn. All eleven are now on the boat, in 3D and in the still image.

| Fitting | How it is drawn |
|---|---|
| Flags to dress ship | A light line from the bow, over each masthead, to the stern, with a small flag every pace in five colours. Flown in port only, where the flags hang from the line. |
| Ratlines and lazy jacks | Rungs across the shrouds, and two light lines each side from the mast to the boom, which swing with it |
| Stern lantern | A brass post and a lit lamp on the starboard quarter, clear of the tiller and the ensign staff |
| A tender on deck | A small varnished boat, upside down and lashed on the longest clear stretch of cabin top |
| A topsail | One more sail above the gaff foresail. Stowed with the rest in port. |
| Gilded cove stripe | The cove stripe in gold leaf, which shines, with a fine second line under it |

- **A fitting goes on every boat that has a place for it.** The tender needs a long cabin top (the cutter and the schooner) and the topsail a gaff (the schooner). The voyage view now says "the sloop has no place for it" beside a fitting the boat being looked at cannot carry, in place of the old "earned, not yet drawn".
- **No more draw calls.** Every flag on the boat (pennant, ensign and dress flags) is now one mesh, which is one fewer than before on a boat with an ensign. The rest are baked into the paint, the suit of sails or the hull's own shader. The unit test that holds the whole scene to 40 draw calls passes with every fitting on.
- **Flags cast no shadow.** At their size the shadows read as grey patches on the sails.

### Decided, and open

- **Decided by Oliver on 17 November: the dress flags fly in port only.** They were first built to fly whenever they had been earned, because the art direction says a fitting appears at once. A real boat dresses only at rest, with her sails furled, and under sail the flags crossed the sails. They now fly on a day with nothing planned, and the voyage view says "flown in port, on a day with nothing planned" beside them.
- **Open: how the six look.** Screenshots are in `docs/screenshots/fittings/`. Josh and Aditya have not seen them.

### Found on the way

- **The cause of the bursts of failures in sections 10 and 11.** Twice a full run had several tests fail within a moment of each other. The dev server kept open on port 5173 had crashed part-way through the run (Node exited with a fatal error under five browsers at once), and every test after that had nothing to load. The tests now start a server of their own on port 5174, fresh for each run. More than fifteen full runs since have had no burst.
- **A tender with a broken number.** Rounding put the last station of the tender's hull a hair past her stem, where a cosine turns negative and its power is not a number. One station of her hull was nowhere. Fixed, and a unit test now checks that no point of any boat, under sail, furled or reflected, is a broken number.
- **Two tests that failed now and then, neither through a fault in the app.**
  - The "holds still" test compares two pictures of the scene taken a moment apart. About one time in twelve under load they differed. The only pixels that differed were on the window's rounded corners, by a single shade: the browser smooths those corners a hair differently from moment to moment when the machine is busy. The scene itself was identical. The test now compares the picture inside the corners, and 72 repeats under load have all matched. My first guess at the cause, a late typeface, was wrong.
  - A My pages test typed before the editor had opened. It now waits for the title to be focused.
- **The still image laid the aft flags along their line,** as slivers. The 3D boat and the still image now share one rule for how a dress flag flies, which keeps it at least 50 degrees off its line.

### Checked

- Unit tests, twenty-four new: every fitting is drawn; each is on the boat only once earned; the dress line and its flags on all four boats; how a flag flies; where the tender goes and that a boom clears her; the topsail; the stern lantern; which boats carry what; that the flags are flown in port and stowed under sail; no broken numbers; and the still image drawing each one.
- Browser tests, two new: every fitting put on and taken off on the live boat and the still one, with no console errors; and the voyage view saying which fittings a boat has no place for.
- Not checked: frame rate with every fitting on. The draw calls are no more than before, but in port the flags are moved on every frame, and that has not been timed on a phone.

## 13. Home and Weekly review additions

Built on 17 November on the branch `home-review-additions`, to [home-and-review-additions-spec.md](home-and-review-additions-spec.md). It is the first of five pieces of Aditya's plan, which the founders keep outside this repository. Nothing in it shows until the person sets it, so the sample Home is unchanged.

![Home at 1440 px with a name, a goal, a focus and links set](screenshots/additions/1-home-1440.png)

### What was built

- **Home:** a greeting once a name is set; the long-term goal on the boat's plate as "Bound for"; the week's High subjects named beside its progress; and, within a priority, open tasks ordered by their subject's level.
- **Weekly review:** each area of the week rated out of 10, and each subject's level for the week after.
- **Study:** subjects in the order of this week's levels, and a subject's level for this week on its page.
- **Settings:** your name, the areas that are rated, and links. The voyage page holds the goal.
- **Links:** in the rail from 1024 px, at the foot of Home below that, and in search.
- **The saved data:** three new lists (links, areas and levels). A save from before this piece opens with nothing lost.

### Checked

- **Unit tests, 31 new:** which levels apply to a week and when they are carried over; starting a week's levels from the ones it carried; the order of tasks by level; ratings kept to whole numbers from 1 to 10; a review that is blank, rated or written; which addresses are web addresses and which are refused; a link's name; the greeting by the hour; the limits on names, goals, areas and links; an older save and an unreadable one; and "Clear everything".
- **Browser tests, 43 new:** a new user seeing none of it at two widths; the greeting at three widths without the page jumping; the goal on the plate, on a phone and on the voyage page, and gone when the sea is folded; the focus line, its order of tasks, its count past four and its carried-over mark; ratings by keyboard and by pressing; saving on a rating alone; levels set in the review and in Study; areas and links added, renamed, moved, refused and removed with Undo; links in the rail, at the foot of Home, in a short window and in search; and no sideways scroll on five pages at 375, 390, 768, 1024 and 1440 px with everything set to its longest.
- **Everything from before:** the 225 unit tests and 72 browser tests pass unchanged.
- **As CI runs it:** 109 pass and the six sea tests are skipped, as designed.
- **Against the mock:** the built pages were pictured and compared with the mock. The pictures are in `screenshots/additions/`, numbered, beside the mocks.

### The review of the whole change

A fresh reviewer read the whole change against the specification on 17 November, ran the unit tests and the build, and probed the running app with saved data edited by hand. It found nothing critical. Five findings were fixed, each with a test that failed first:

| Finding | Fix |
|---|---|
| A save edited by hand could put something that is not a web address into a link, and a broken entry could stop every page opening | A save's links and areas are checked again when it is opened. Only web addresses are kept, each once, six at most. |
| Changing the week's first day from Monday to Sunday lost that week's levels, and an old record could later override a newer one | The levels move with the week when its first day changes |
| The focus line was a label on an empty group, which some screen readers skip | It is now plain text for a screen reader |
| A name or a goal that is one long word pushed a phone's page sideways | Those lines now wrap inside a word |
| With six links, Search and Settings were out of sight on a short laptop screen | The foot of the rail stays put, and the places and links scroll above it |

Six smaller findings were left as they are, for the founders to decide:

- Undo can bring back a seventh link or area after another was added in its place.
- "Carried over from week N." shows when the earlier week's levels were all cleared.
- Pressing a rating with the mouse does not move the keyboard to it, so the arrow keys do nothing until it is tabbed to.
- "Add area" with an empty box does nothing and says nothing.
- "This week" is heard twice in Study, once as words and once as the group's name.
- There is no test for Undo at the limit of six.

### Not checked

- A real phone, Safari or Firefox, and a screen reader by ear. This is the same as for the rest of the build (section 19). The rating's segments are 16 px wide on a phone, which needs a thumb on a real one to judge.

### Found on the way

- **While the week strip slides to another week, the page is 8 to 16 px wider than the screen** below 1024 px, for the length of the slide. This is in the build before this piece.
- **A long assessment title is cut off on the week strip with no ellipsis.** "Legal Studies test" showed as "Legal Studie". Also in the build before this piece.
- **A priority whose title runs to three lines shows a sliver of the third line** under "Next week". Also in the build before this piece.

None of the three is fixed here.

### Calls made in the build that the founders can overrule

- Pressing the rating that is already set clears it, so a phone has a way back to nothing.
- A link's address is checked when its box is left or Enter is pressed, not as it is typed.
- "Move up" on the first item and "Move down" on the last are disabled.
- At six links, the last row at the foot of Home reads "Change your links".

The larger calls are in the specification, section 12.

## 14. Night and the dark theme

Built on 17 and 18 November on the branch `night-dark-theme`, to [night-and-dark-theme-spec.md](night-and-dark-theme-spec.md), on top of the Home and Weekly review additions. Committed on 18 November with Oliver's approval. He saw the pictures that day, kept the blue selection and approved the look as built. Josh and Aditya have seen nothing.

![Home in the dark theme at 1440 px](screenshots/night/home-1440.png)

<img src="screenshots/night/home-390.png" alt="Home in the dark theme at 390 px" width="286">

Every screen is pictured in [screenshots/night/](screenshots/night/) at 1440 and 390 px, with seven pictures of the sea at night.

### What was built

- **A theme setting:** Automatic, Light or Dark, in Settings under Appearance and in the command menu. Automatic follows the device. The choice is kept through a reload, through "Reset the sample data" and through "Clear everything".
- **A dark palette** for every screen: navy surfaces, ivory ink, and a lighter set of subject colours.
- **The sea at night,** which comes with the dark theme: dusk with nothing done, stars part-way, moonrise with everything done, lit portlights, an evening in port, and a storm with no stars. The still image follows it.
- **Colour roles.** No component names a colour step any more. This is what lets one block of values turn the whole app dark.

### Checked

- **Unit tests:** 285 pass. New ones cover the theme setting, the night's light, the rule that no component names a colour step, and the contrast of every pair in the dark palette.
- **Browser tests, light theme:** all 127 pass.
- **Browser tests, device set to dark:** all 127 pass. This is the whole suite run as a dark device sees the app (`PW_THEME=dark`).
- **Browser tests as CI runs them:** 121 pass and 6 are skipped, the same six as before.
- These three runs, the unit tests and the build were all run again on 18 November after the last change to the code.
- **Twelve new browser tests** for the theme: dark before the app loads, each of the three settings, the night's four spoken descriptions, the still image's stars, the live night scene with no console errors, the contrast of each element's own colours at 1440 and 390 px, and no sideways scroll at five widths.
- **The light theme is unchanged.** Every screen was pictured before the work and after it and compared pixel by pixel. The one change is the new Appearance section in Settings. A few hundred pixels on two screens differ by a shade from one run to the next on identical code, at the edges of rounded marks; that was confirmed by picturing the same code twice.
- **The build** passes.

### A morning of broken runs

On 18 November the laptop was installing a system update, and browser runs that take under a minute took between six and twenty-eight. Tests failed by running out of time, a different few each run. They were sorted into slowness and faults by running the failed tests one at a time with a long limit: every one passed but one, and that one was a real fault (below). The runs above were made after it was fixed, with the laptop kept awake.

### Found on the way

- **The command menu could swallow a key.** On opening, the search box showed its last query for an instant, and a key pressed in that instant was added to it. A new test failed one run in three because of it; 9 openings of 30 showed it, and none of 30 after the fix. It is older than this work.
- **An editor opened straight after another closed could shut at once.** The browser says a dialog has closed a moment after it closes. If an editor was opened again in that moment, for another row, the late word closed the new one. Under the CI settings on a slow machine, "a session can be changed and ended" failed 8 runs of 10 because of it, and passes 10 of 10 with the fix, which is one line in the frame every editor shares. It is older than this work, so the branches below this one still have it.
- **The dark palette in the mock did not pass.** The mock's selection blue was 2.2 to 1 against the sheet. The built blue is `#3073AD` (3.0 against the sheet, 4.8 under its ivory text). Nothing quieter than the brightest ivory is readable on it, so the small labels on a selected day are full ivory.
- **The browser's own tick box is neutral grey on a dark page.** The two in Settings are restyled in the dark theme only.

### Calls made in the build that the founders can overrule

- The selection is blue. An ivory block was photographed in its place: `selection-*-blue.png` and `selection-*-ivory.png` in the screenshots folder. **Oliver saw both on 18 November and kept the blue.** Josh and Aditya have not seen either.
- A storm at night keeps its crests, dimmed. They still read as pale patches (section 19).
- With the stars out, the water carries a path of light and no moon is in view; the moon is taken to be above the window. At moonrise it is on the horizon.

### Not checked

- A real phone, Safari or Firefox, and a screen reader by ear.
- Frame rate with the night scene.
- A device that changes theme by itself at sunset.

## 15. Study detail

Built on 18 November on the branch `study-detail`, to [study-detail-spec.md](study-detail-spec.md). It is the second of five pieces of Aditya's plan. The sample gains a topic and one piece of feedback on Biology. No sample task was changed, so every count on Home, in Study and in the Weekly review is as it was.

![A subject's page at 1440 px with every new part in use](screenshots/study-detail/1-subject-1440.png)

### What was built

- **A topic** for each subject, kept exactly as typed, under its name and in the list of subjects.
- **Preparation tasks** under an assessment. Each is an ordinary task that belongs to the assessment: listed under it and not again under "Tasks", on Home in its day or week, and counted under "Coming up" as "1 of 3 prepared".
- **One link** on a task and one on an assessment, each opening in a new tab.
- **Feedback** on a subject, dated, with something to work on that "Make it a task" turns into an ordinary task.
- **A subject's pages:** the My pages that carry the subject, and four starters that make a page already carrying it.
- **A subject's links,** up to six, changed with the same rows Settings uses.
- **The order of a subject's page:** assessments, tasks, feedback, pages, links, study sessions, notes.
- **The saved data:** one new list (feedback) and five new optional fields. A save from before this piece opens with nothing lost, and "Clear everything" clears the new parts too.

### Checked

- **Unit tests, 28 new:** a topic kept as typed within its limit; which tasks are preparation, their order and their count; a preparation task while its assessment is deleted and after Undo; one link on a task and on an assessment, and what is refused; a subject's links added, changed, moved, removed and held to six; feedback tidied, ordered and kept with its subject; what to work on made into one task, once; a subject's pages in My pages' order, the starters, and the line a page shows; an older save, a save edited by hand, and "Clear everything".
- **Browser tests, 32 new:** the topic set, shown and cleared; preparation added under an assessment, shown on Home, counted under "Coming up" and earning its miles once; an assessment deleted and brought back; a task freed from its assessment; links on a task, an assessment and a subject, each refusing what is not a web address; feedback added, changed, deleted and made into a task; a subject's pages listed and started; links changed in place and removed with Undo; the order of the page; the whole of it by keyboard alone; and no sideways scroll at 375, 390, 768, 1024 and 1440 px with every new part at its longest.
- **Everything from before:** the 256 unit tests and 115 browser tests pass unchanged. Their files were not edited.
- **As CI runs it:** 141 pass and the six sea tests are skipped, as designed.
- **Against the mock:** the built pages were pictured and compared with the mock. The pictures are in `screenshots/study-detail/`, numbered, beside the mocks. Where the build differs is in the specification, section 16.

### The review of the whole change

A fresh reviewer read the whole change against the specification on 18 November, ran the unit tests and the build, and probed the running app at 1440 and 390 px with saved data edited by hand. It found nothing critical. It confirmed that only web addresses reach a link, that deleting a subject and undoing it puts everything back once, and that the fix to the editors' frame holds. Seven findings were fixed, each with a test that failed first:

| Finding | Fix |
|---|---|
| A link typed in a task's or an assessment's editor was lost when the editor was closed with Escape | What is in the box is checked and kept when the editor closes, however it closes |
| A save with an entry that is not a record among its tasks, assessments or subjects stopped the app opening. This was so before this piece too. | A save's lists keep only records with an id and the words a page needs. A subject whose colour is not one of the eight is given one. |
| The notice in the subject's editor did not say that deleting a subject also removes its feedback and links | It names them, and says that pages are kept |
| A task made from feedback was listed twice on the subject's page, beside its entry and under "Tasks", and pressing one opened the editor beside the other | It is listed once, beside its entry, as the mock draws it. The rule goes by the page, so a task moved to another subject is under that subject's "Tasks". |
| On a phone, "Change the topic" opened the editor with the cursor on Close | The topic box takes the cursor on a phone too |
| "Preparation for" followed by a title of one long word pushed a phone's editor sideways | The line wraps inside a word |
| A change to a task would have kept a link without checking it, had anything passed one. Nothing did. | A task's link is set only by the action that checks it |

Eleven smaller findings were left as they are, for the founders to decide:

- Undo can bring back a seventh link after another was added in its place. Settings has had the same gap since piece 1.
- On a new assessment or task, a link that is refused moves the "Add" button, so the first press misses. The second adds it without the link.
- "Make it a task" leaves the keyboard on no control. In Chrome the next Tab goes to the new tick; other browsers were not tried.
- The list of assessments has an extra item for each assessment's preparation, which is empty for a past assessment with none. A screen reader counts them.
- Every "Add a preparation task" box has the same spoken name, and so does every "Make it a task".
- Deleting a feedback task, making another and then pressing Undo leaves two tasks with the same words.
- Feedback shows its month and day, and no year.
- "Add feedback" with only spaces in "What was said" does nothing and says nothing.
- Rows slide over the "Tasks" heading for a moment when a preparation task is added above them.
- Feedback whose subject does not exist is kept in the save, unseen.
- Two tests could say more: the one for a save from before this piece checks counts only, and a task's link in the Weekly review has no test of its own.

It also noted two things that are older than this piece: a subject brought back with Undo goes to the end of the list, and the toast's "Undo" is 36 px tall on a phone and lasts six seconds.

### Found on the way

- **An editor opened in the moment after another closed was shut again.** The browser reports a dialog's close slightly after it happens, and the frame the editors share took the late report to be about the editor now open. An older Study test began to fail once the page's order changed, which is how it was found. It is fixed in the frame, so for every editor.
- **A feedback entry of one short line was 41 px tall on a phone,** under the 44 px a thumb needs. The test that measures every new control found it. Fixed.

### Brought up to date with `main`

On 18 November, after the piece was committed, `main` was merged into the branch. By then `main` held night and the dark theme, the motion system and the new type, none of which this piece was built on.

- **Seven files were changed on both sides,** five of them code. Each was settled by keeping both changes. The fix to the editors' frame had been made on both sides, in the same words but for the comment.
- **Two of the new parts named a colour step,** for the line that says an address is refused. They now name the role, which is what lets the dark theme colour them and what `src/design/roles.test.ts` requires.
- **Unit tests:** 313 pass. That is the 285 on `main` and the 28 of this piece.
- **Browser tests:** all 159 pass in the light theme, and all 159 pass with the device set to dark (`PW_THEME=dark`). Run as CI runs them, 153 pass and the six sea tests are skipped. That is the 127 on `main` and the 32 of this piece.
- **The build** passes.
- **In the dark theme,** a subject's page was opened at 1440 and 375 px. The new parts are drawn in the dark palette and the new type, nothing is wider than the screen, and the console is clean. The text that was measured (the topic, feedback, the starters and their label, and the links' button) is 7.1 to 1 or better against what is behind it. The rest was not measured.
- **The pictures in this section were taken before the merge.** They show the light theme and the type as it was.

### Not checked

- A real phone, Safari or Firefox, and a screen reader by ear. This is the same as for the rest of the build (section 19).

### Calls made in the build that the founders can overrule

They are in the specification: section 13 for the calls made in the design, and section 16 for those made in the build. The largest is that a subject's links are changed in place on its page, not in a pop-up editor.

## 16. Fitness

Built on 19 November on the branch `fitness`, to [fitness-spec.md](fitness-spec.md). It is the third of five pieces of Aditya's plan. Fitness is off until it is switched on, and the sample gains an invented training week that shows only then. No sample task, habit or log entry was changed, so every count on Home, in Study, in Habits and in the Weekly review is as it was.

![The Fitness place at 1440 px](screenshots/fitness/1-fitness-1440.png)

### What was built

- **A switch** in Settings, "Show Fitness". With it on, Fitness is a sixth place in the rail and in the phone's bar. With it off, all that shows is the switch and one search command, and everything in it is kept.
- **Routines:** a name, the days it is set for, and lines kept as typed. A routine may have no fixed day.
- **Sessions:** a dated copy of a routine to tick off, with a note. In the saved data a session is a `workout`, because `sessions` holds study sessions.
- **The week,** worked out from the routines and the sessions and never stored: what is set, started, finished or still to come, a rest day, and the routines that can be started today, the one not done for longest first.
- **Miles:** a session logs 2 nautical miles the first time it is finished, dated the day it is finished, and one session's miles at most on any one day.
- **Bests and measures,** kept by hand, each with the value before. A measure has its own unit and is never judged.
- **On Home,** the day's training: a ring that finishes a session as it stands and a name that opens it. **In the Weekly review,** one more figure.
- **The saved data:** four new lists and one setting. A save from before this piece opens with nothing lost.

### Checked

- **Unit tests, 37 new:** words kept as typed within their limits; what is kept from a save edited by hand; which days a routine is set for; a week's sessions in order, each in its state; a session whose routine is gone; "last done" by the day a session is for; the order of the routines offered; a rest day; routines and their lines added, changed, moved, removed and held to their limits; a session started as a copy, once for a day, and what cannot be started; miles the first time and never again, for one session a day, for a late session, and never from the sample; a session reaching nothing a task counts; bests and measures added, corrected, beaten and put back; an older save, and "Clear everything" keeping the switch.
- **Browser tests, 47 new:** nothing showing while off; the switch, the sixth place and the search command; routines added, changed and deleted with Undo; each state of a session in the week; a session started, ticked, added to, kept through a reload, finished, reopened, deleted and put away; a late session; a rest day; Recent; bests and measures; training on Home by ring and by name, on days to come and days gone; the review's figure; the whole of it by keyboard; every control tall enough for a thumb; and no sideways scroll at 320, 375, 390, 768, 1024 and 1440 px with every part at its longest.
- **Everything from before:** the 313 unit tests and 159 browser tests pass unchanged. Their files were not edited for this piece. Four of the older browser tests were made steadier afterwards, for faults on CI that are not Fitness's: see "Found on the way".
- **In the dark theme:** all 206 browser tests pass with the device set to dark.
- **As CI runs it:** 200 pass and the six sea tests are skipped, as designed.
- **Against the mock:** the built pages were pictured and compared with the mocks, in both themes. The pictures are in `screenshots/fitness/`, numbered, beside the mocks. Where the build differs is in the specification, section 19.

### The review of the whole change

A fresh reviewer read the whole change against the specification on 19 November, ran the unit tests and the Fitness and My pages browser tests, and probed the running app with saved data edited by hand. It found nothing critical. It confirmed that miles cannot be taken twice, that a session never reaches a task's figures, that nothing shows while Fitness is off, that a save edited by hand opens with only the bad records dropped, and that My pages behaves as it did. Six findings were fixed, each with a test that failed first:

| Finding | Fix |
|---|---|
| Ticking an unstarted session's ring on Home by keyboard dropped focus to the page, because the row was rebuilt when the session was made | The row keeps its identity, so the ring keeps focus |
| A started or finished row in the week did not tell a screen reader where it stood | Its spoken name carries what it opens and where it stands |
| A list that an Undo had taken one past its limit was cut when the save was next opened, losing what was typed last | A save's lists are not cut. A limit is held where things are added. |
| Backspace or Delete on a line in a routine's editor removed it, with no Undo there | The keys do nothing where a line cannot be put back |
| Focus fell to the page when a session closed, and Back reopened it | Focus returns to the session's row or the week's heading, and closing steps back or replaces the address |
| The routines that can be started were spoken as their names alone | Each is spoken as "Start" and its name |

Three smaller findings were left as they are, to be decided:

- On a phone, a second "Add a best" in a row puts the cursor on Close and not on Name.
- "Recent", "Routines", "Bests" and "Measures" are headings of the third level with none of the second above them, so a screen reader hears them as parts of "This week".
- A session's row in the code allows a routine or a session to be missing where its state says it cannot be.

It also noted things that are older than this piece: Home is wider than a 320 px screen, two tabs open at once overwrite each other's saves, focus falls to the page after an item in a list is changed, and the toast's "Undo" is 36 px tall on a phone.

### Found on the way

- **Home is 21 px wider than a 320 px screen,** with or without Fitness. Its date and its two round buttons do not fit below about 341 px. Left alone, and listed in section 19. Fitness's own pages fit at 320 px, and a test holds that Home is no wider with Fitness than without.
- **The ring on Home had no room for a thumb.** A habit's ring is pressed through its name, but a session's name is a button of its own. The test that measures every control found it. Fixed.
- **One run lost its dev server near the end,** and the last twelve tests could not connect. None was a Fitness test, and the next run passed. This is the fault described in section 14.
- **Two older tests of the look review page failed on CI,** on this piece's pull request and, earlier the same day, on `main` after a merge that changed only documents. A CI runner draws the sea in software. One test counted the graphics driver's remark on its own speed ("GPU stall due to ReadPixels") as a warning from the page. The other compared two pictures of the still scene before it had settled. The remark is now left out where warnings are counted, in that test and in one like it for the dark theme, and the pictures are taken again until a pair matches, which a scene that kept moving never would. Neither could be reproduced on a laptop, with or without software drawing. On the next run on CI the driver's remark failed nothing and the still scene matched, but the runner was slower still and two tests ran out of time. The fittings test rebuilds the boat for each fitting and had been taking 20 to 31 seconds on CI against a limit of 30, so it is given three times as long. An older Study test pressed "Edit subject" straight after choosing another subject, without waiting for it to show; on a slow machine that opens the editor of the subject about to leave, and the editor then goes with it. This one was reproduced, on a processor slowed six times, and the test now waits for the subject. The same press on a slow phone would do the same to a person, for the half second the page takes to change.
- **Pull request 15 came into conflict with `main`** part-way through, when another pull request was merged. It was settled on its own branch, and this branch was moved forward to it.

### Not checked

- A real phone, Safari or Firefox, and a screen reader by ear. Spoken names were read from Chrome's accessibility tree. This is the same as for the rest of the build (section 19).
- Whether Escape inside a line being changed keeps the editor open in browsers other than Chrome.

### Calls made in the build that the founders can overrule

They are in the specification: section 16 for the calls made in the design, and section 19 for those made in the build. The largest are that a session whose day has passed can still be logged, that its miles are dated the day it is finished, and that a save's lists are never cut to their limits.

## 17. Interests and headlines

Built on 19 November on the branch `interests`, to [interests-spec.md](interests-spec.md). It is the fourth of five pieces of Aditya's plan. **It was designed and built without a review first:** Oliver asked for the rest of the app to be built without questions, to be gone through once it is finished. The specification's section 9 lists the calls most worth a look. The sample gains nothing, so Home is as it was and My pages gains only the new part of its list.

![An interest and a Company page at 1440 px](screenshots/interests/2-company-1440.png)

### What was built

- **Interests:** folders in My pages. A student adds their own and says where it starts from: Investing, Law, or something else. The first two offer ready-made pages.
- **Forms:** a page started as a Company, a Journal entry, a Case or Current affairs opens with headed parts, each a box of ordinary writing. Nothing is a number, a rating or a choice.
- **A page's source link,** on any page, checked as every link is.
- **Headlines,** saved by hand: a title, an address, where it is from, the day it was published and an optional tag. They are listed at `/pages/headlines`, and the newest three are on Home under "Any time this week".
- **Nothing is fetched.** Compass still talks to no other service.
- **The saved data:** two new lists, and four optional fields on a page. A save from before this piece opens with nothing lost.

### Checked

- **Unit tests, 32 new:** what each starting point offers; a titled page offered once; an interest's pages in order; names and limits; what is kept from a save edited by hand, for interests, a form's parts, a page's list and headlines; a headline cleaned, refused, and its source taken from its site; the newest three; every store action, with Undo; an older save; and "Clear everything".
- **Browser tests, 31 new:** the new part of My pages; an interest added from each starting point; a Company page's eight parts kept through a reload; a titled starter going once used; a page put in an interest and taken out; an interest renamed and deleted with Undo; a source link, and what is refused as one; headlines saved, changed, deleted with Undo, and refused without a web address; the newest three on Home; the search command; no request to any other site; every control tall enough for a thumb, in the lists and in the editors; the whole of it by keyboard; and no sideways scroll at 320, 375, 390, 768, 1024 and 1440 px with every part at its longest.
- **Everything from before:** the 350 unit tests and 206 browser tests pass. Their files were not edited for this piece.
- **In the dark theme:** all 237 browser tests pass with the device set to dark.
- **As CI runs it:** 231 pass and the six sea tests are skipped, as designed.
- **Pictures** of the built pages are in `screenshots/interests/`, numbered. There are no mocks to compare them with, since nothing was mocked.

### The review of the whole change

A fresh reviewer read the whole change against the specification on 19 November, ran the unit tests, and tried the running app with 24 browser probes of its own, including saves edited by hand. It found nothing critical. It confirmed that no address but an http or https one can reach a link, by typing, from a save or by Undo; that nothing is fetched; that a valid page from an older save cannot be dropped; and that Home is unchanged with nothing saved. These were fixed, each with a test that failed first:

| Finding | Fix |
|---|---|
| Opening an interest, leaving it or adding one dropped keyboard focus to the page, and nothing said the list had changed | Focus goes to the interest's name on the way in and to its row on the way out |
| With sixty headlines saved, "Save a headline" in search opened an editor whose button did nothing | It says that sixty is the most, and opens nothing |
| A double press on a page that comes with a title made a second, unasked page, because the next button moved under the pointer | The second press of a double press does nothing, and the store makes a titled page once |
| "Add interest" pressed twice quickly added two | An editor on its way out takes no more presses, in the frame every editor shares |
| A double press on a form opened another page, whose row had moved under the pointer | The same fix: the second press does nothing wherever it lands. Found while fixing the one above. |
| A source taken from the site stayed after the address changed | It follows the address. A typed source stays. |
| Enter in a new headline's Address checked it and saved nothing | Enter saves the headline once the address is one |
| A 30-letter unbroken name pushed an empty interest's page 50 px sideways at 320 px, and widened a page's editor | Both wrap. So does the way back above a page. |
| A save with something that is not an item in a page's list took My pages down to the error screen. Older than this piece. | A page's list keeps only what is an item, and a kind that is not one is a note |
| The Headlines row was never marked as the current one; the interest's "Edit" was named only "Edit"; a page naming an interest that is gone showed no choice as pressed | Each put right |
| With a page open that an interest does not hold, choosing the interest left it open beside a list without it | One of the interest's own pages opens. On a phone the way back names the interest. |

Left as they are, to be decided:

- An Undo can take a list one past its limit, and a save's lists are not cut to their limits. This is the rule Fitness set (section 16).
- A starter's hint shows only as a tooltip.
- Without `field-sizing`, which Chrome has, a form's parts do not grow with what is written. They start taller there. Not seen in a browser that lacks it.

### Found on the way

- **A form's part widened the page by about 1,900 px below 1024 px,** when one very long word was typed in it. A box that grows with its words also grows sideways unless its column is told it may be narrower than what is in it. Fixed, and held by the width tests.
- **A thumb test read a box as 43.9999 px tall** once in four runs, straight after its sheet slid up. It measures to the nearest pixel now.

### Not checked

- A real phone, Safari or Firefox, and a screen reader by ear. Spoken names were read from Chrome's accessibility tree. This is the same as for the rest of the build (section 19).
- A double tap by finger. A mouse says which press of a run it is; a finger may not, so a touch in the same place straight after is treated as one. Tried with a mouse only.

### Calls made in the build that the founders can overrule

They are in the specification: section 9 for the calls made in the design, and section 11 for those made in the build. The largest are that headlines are saved by hand and nothing is fetched, that a student adds their own interests with Investing and Law as two starting points, and that a form's parts are words.

## 18. Built differently from the approved spec

None of these breaks a criterion in the brief. Each is a gap between the build and the approved documents that the founders should know about.

| Spec says | Build does |
|---|---|
| The water is a mesh, 128 by 128 on the high tier and 64 by 64 on the low | The water is one flat sheet shaded per pixel, so there is no mesh to coarsen. The low tier saves by drawing fewer pixels. |
| The high tier reflects the boat with a half-resolution pass | Both tiers use a mirrored copy of the boat, which the spec gives as the low tier's method |
| The high tier's shadow map is 1024 px | It is 2048 px, kept from the look review |
| The week strip slides when the week changes | It moves 28 px in the direction of travel while it fades, and does not sweep the full width. The outgoing week leaves the other way. |
| The folded window shows a strip of horizon | It shows a strip of the same view, which cuts through the sail |
| Corners use `corner-shape: squircle` where supported | Plain rounded corners |
| The name is lettered on the transom | It is lettered on the quarter, by Oliver's decision on 16 November, because the transom faces away from the usual view. The still image does not letter it. |

## 19. Known limitations

- Home is 21 px wider than a 320 px screen: its date and its two round buttons do not fit below about 341 px.

- No manual screen-reader pass.
- No real-phone test of speed, heat or battery.
- The storm's breaking crests look like patches.
- The still image is side-on, so the picture shifts when the 3D scene takes over. Its port has no figures.
- Drag to reorder, recurring tasks, editing assessments, accounts and sync are not built, by plan.
- Night and the dark theme are built and approved by Oliver. Josh and Aditya have not seen them (section 14).
- Tested in Chrome only. Safari and Firefox have not been opened.

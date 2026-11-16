# Compass: recommended next stages

| | |
|---|---|
| Date | 16 November 2026 |
| Status | A recommendation. Nothing here is agreed by the founders yet. |
| Based on | The brief, the approved [art direction](compass-art-direction.md) and [Home spec](home-screen-spec.md), and the [testing report](testing-report.md) |

The order below puts first what protects the work already done, then what the brief still expects of Phase 1, then new product.

## Stage 1. Close Phase 1

Small, and mostly decisions and checks that need a founder.

| Step | Why | Size |
|---|---|---|
| Founders review Home and approve the Phase E changes | The brief's approval gate. Nothing is committed without it. | A meeting |
| A founder opens Home on a real phone | The only way to settle speed, heat and battery. The spec's pass bar ends with this. | Ten minutes |
| Open Home in Safari and Firefox | Only Chrome has been tested | An hour |
| One pass with VoiceOver | Names and structure were checked by script, never by ear | An hour |
| Boat look review, round three | Parked by Oliver. The storm crests and the folded strip are the known weak points. | Depends on the review |

## Stage 2. Make the sea cheap to run

The brief asks for battery efficiency on mobile, and this is where the build is furthest from the spec.

1. Stop drawing when the window is scrolled out of view or the tab is hidden.
2. Build the low tier: coarser water, no shadow map, 30 frames a second, chosen for touch devices and whenever frames run slow.
3. Measure on two real phones, one recent and one about four years old, and record the numbers in the testing report.

**Done when** the low tier holds 30 frames a second on the older phone and the scene uses no processor time when it cannot be seen.

## Stage 3. Finish the reward loop on Home

The boat only motivates if earning something is noticed. These are all in the approved spec and not yet built.

1. The plate announces what was just earned: a brass dot and one line, such as "New: bow lantern".
2. "The cutter is ready" when a new boat is earned, with the choice made in the voyage view.
3. Draw the remaining Phase 1 fitting, the name on the transom.
4. The motion the spec describes: the week strip sliding, a completed row moving down, the sheet following the finger. Install Motion at this point, since CSS alone will not do the last one well.
5. The `?` list of shortcuts, and the editor as a popover on desktop.

## Stage 4. Habits

Recommended as the first new destination, ahead of Study, for three reasons. It is the smallest. It gives people a reason to open Compass on a day with no tasks. And the mileage rule for it already exists (one mile a tick).

- Habits the user defines, for every day or chosen weekdays.
- Today's habits shown on Home, without becoming a second task list.
- History and a weekly consistency summary.
- No streak counter, in line with the art direction.

**Decision needed first:** where today's habits sit on Home. This changes an approved layout, so it needs a mock and a founder's sign-off before any build.

## Stage 5. Study

- Subject pages that can be created and edited. Subjects and assessments are fixed sample records today.
- Assessments that can be added, edited and removed, with preparation tasks attached.
- Recurring study sessions. This needs recurring tasks, which is new work in the data model.

## Stage 6. Weekly review, then My pages

- **Weekly review:** a saved reflection, a summary of tasks and habits, and next week's priorities, which Home already shows. Saving one earns ten miles under the existing rule.
- **My pages:** notes, checklists, goals, reading and project pages. This is the largest and least defined destination, so it should have its own short spec before any design.

## Stage 7. The boat grows up

- The cutter and schooner fittings that are listed but not drawn.
- Flags, banners and decorations.
- New waters earned by distance, and seasonal items that arrive with the calendar.
- Dusk, night and the dark theme, designed together.

## Later, and deliberately not now

Accounts and sync, notifications, school licensing and any payment. The brief rules these out of the prototype, and each one changes the privacy promise, so each deserves its own decision.

## Decisions the founders owe

| Decision | Needed before |
|---|---|
| Approve or change the Phase E fixes | Committing them |
| Is the boat's look settled, or is there a round three? | Stage 7, and any public screenshot |
| Habits before Study, as recommended here? | Stage 4 |
| Keep the centred editor on desktop, or build the popover in the spec? | Stage 3 |
| Are the mileage numbers and stage gates right after a week of real use? | Stage 3, since the plate will start announcing them |

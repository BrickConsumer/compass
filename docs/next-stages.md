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

1. ~~Stop drawing when the window is scrolled out of view or the tab is hidden.~~ **Built on 16 November.**
2. ~~Build the low tier: no shadow map, fewer pixels, 30 frames a second, chosen for touch devices and whenever frames run slow.~~ **Built on 16 November.**
3. ~~Bring draw calls down to the budget of 40.~~ **Done on 16 November:** 17 to 32 a frame, from 50 to 457.
4. Measure on two real phones, one recent and one about four years old, and record the numbers in the testing report.

**Done when** the low tier holds 30 frames a second on the older phone and the scene uses no processor time when it cannot be seen. The second half is met. The first half waits on step 4, which needs a founder and a phone.

## Stage 3. Finish the reward loop on Home

The boat only motivates if earning something is noticed. These are all in the approved spec and not yet built.

1. ~~The plate announces what was just earned: a brass dot and one line, such as "New: bow lantern".~~ **Built on 16 November.**
2. ~~"The cutter is ready" when a new boat is earned, with the choice made in the voyage view.~~ **Built on 16 November.**
3. ~~Fittings appear on the boat when they are earned.~~ **Built on 16 November.** Before this, every boat wore a fixed set whatever had been earned.
4. ~~Draw the remaining Phase 1 fitting, the boat's name.~~ **Built on 16 November, on the quarter.** Oliver chose the quarter over the transom, which faces away from the usual view.
5. ~~The motion the spec describes: the week strip sliding, a completed row moving down, the sheet following the finger.~~ **Built on 16 November,** with Motion installed.
6. ~~The `?` list of shortcuts, and the editor as a popover on desktop.~~ **Built on 16 November.**

**Stage 3 is complete.**

## Stage 4. Habits

Recommended as the first new destination, ahead of Study, for three reasons. It is the smallest. It gives people a reason to open Compass on a day with no tasks. And the mileage rule for it already exists (one mile a tick).

**Built on 16 November.** The rules are in [habits-spec.md](habits-spec.md).

- ~~Habits the user defines, for every day or chosen weekdays.~~ Built.
- ~~Today's habits shown on Home, without becoming a second task list.~~ Built, as decided.
- ~~History and a weekly consistency summary.~~ Built one week at a time: a count for each habit in each week, and earlier weeks as the record. A view across many weeks is not built.
- ~~No streak counter, in line with the art direction.~~ There is none.

Not built: reordering habits, pausing one without deleting it, and a view of consistency across many weeks.

**Where today's habits sit on Home: decided by Oliver on 16 November.** A line of its own between the week and the lists from 1280 px wide; at the foot of the day's sheet below that, tablets and phones included. Josh and Aditya have not weighed in. The mock is at https://claude.ai/artifact/MqFDefCBQVsYLmYd8JPm3b.

**Built to the recommendation, and still open to change:** the ticks belong to the selected day, habits log miles and do not change the sea, and up to six show on Home.

## Stage 5. Study

**Built on 16 November.** The rules are in [study-spec.md](study-spec.md).

- ~~Subject pages that can be created and edited.~~ Built, with notes.
- ~~Assessments that can be added, edited and removed.~~ Built. Preparation tasks attached to one assessment are not: a task belongs to a subject, not yet to an assessment.
- ~~Recurring study sessions.~~ **Built.** Oliver decided from the [mock](https://claude.ai/artifact/K8BkfUFMt7HfLrAgaY66g4) that a session becomes an ordinary task that repeats. Three smaller rules were built to the mock's recommendations and are still open: sessions count toward the port and the storm like any task, a week's tasks are made when the week arrives, and changing a session leaves tasks already made.

## Stage 6. Weekly review, then My pages

- ~~**Weekly review:** a saved reflection, a summary of tasks and habits, and next week's priorities, which Home already shows. Saving one earns ten miles under the existing rule.~~ **Built on 17 November** as a first version, to [review-spec.md](review-spec.md). No founder has reviewed it, and it was not mocked first. Its open calls are in section 7 of that document; the largest is that an old review's figures are live and not a snapshot.
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
| ~~Keep the centred editor on desktop, or build the popover in the spec?~~ Built as the spec has it: a popover. | Done |
| ~~The boat's name: on the transom or on the quarter?~~ Decided: the quarter. | Done |
| Is a plain boat with nothing earned right for a new user's first day? | Any public release |
| Are the mileage numbers and stage gates right after a week of real use? | Stage 3, since the plate will start announcing them |

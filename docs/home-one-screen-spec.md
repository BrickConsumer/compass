# Home on one screen: specification

| | |
|---|---|
| Status | **Asked for by Oliver on 21 November 2026 while going through the finished app, and built the same day on the branch `ui-fixes`.** Each step was shown live and changed on what he said. Josh and Aditya have not weighed in. Section 6 lists what it changed that had been decided before. |
| Scope | Home on a wide screen, 1024 px and up. Phones and tablets are as they were, but for the order of two lists. |
| Builds on | [home-screen-spec.md](home-screen-spec.md), and the placements decided since: habits on 16 November, headlines on 17 November. |

## 1. What was asked

Three things, one after another, each on seeing the one before:

1. "I don't like that I have to scroll down to see the entire page, can we fix that by possibly squeezing it in better."
2. "Now I feel like the boat part is too small, can we make it so the boat UI part is bigger?"
3. "The more and more tasks I add to do 'today' make the screen longer making me have to scroll down, can we make it so that I only have to scroll down in the 'today' card alone while everything else stays the same. Give the scrolling a fun animation and make it look neat."

Before any of it, Home was 1,214 px tall in his 922 px window, and the sea, the date, the week and the habits took 530 px before the first task.

## 2. What it is for

- On a laptop, Home is seen whole: the sea, the week, the day, the two weeks of tasks, what is coming up and the headlines, with no scrolling.
- The sea is as large as the screen can spare.
- A long day does not make the page longer. It scrolls inside the Today card, and nothing else moves.

**Not for:**

- Phones and tablets. Below 1024 px the page scrolls as it always did.
- Fitting everything whatever it holds. A week with a great many tasks beside the day still makes the page longer than a screen.

## 3. The layout, from 1024 px

- **Home is exactly as tall as the screen,** and no shorter than 720 px. The Today card takes the room that is left under the week strip and reaches the foot of the screen.
- **The sea's height follows the screen's height:** the screen, less 696 px, kept between 176 and 276 px. It is 204 px in a 900 px window, 226 px in a 922 px one, and its full 276 px from 972 px up. It follows the screen only, never what is on the page, so it does not move as tasks are added or another day is chosen. 696 px is what a Home with something in every part needs beneath the sea.
- **The date and the week's progress share one line** from 1280 px, and the date is 34 px, down from 40.
- **The week strip is 66 px tall,** down from 86.
- **Rows sit closer:** 40 px for a task, and 36 px for a habit, down from 46 and 44. A pointer is doing the pressing at these widths.
- **Two columns beside the day, about as long as each other.** "Any time this week" with "Next week" under it, and "Coming up" with Headlines under it. Before, the first held the week's tasks and the headlines and was much the longer, and its length was the page's.
- **The day's habits and training are at the foot of the Today card,** at every width. From 1280 px they had a line of their own under the week strip. That line's room went to the sea.

## 4. The Today card

- **Its heading stays at its top:** the day, the count, the progress bar, an assessment due that day, and the note about tasks still open from earlier in the week.
- **Everything under the heading scrolls together** when it is longer than the card: the tasks, the row that adds one, then the day's habits and training.
- **A short day does not scroll,** and looks as it did.
- **The wheel over the card moves the list and not the page.**
- **Adding a task from the keyboard keeps the adding row in view.** N goes to it wherever the list is, and after each task is added the row is brought back into view, so several can be typed one after another.

**How it moves.** What moves is tied to the scroll itself, so it plays exactly as far and as fast as the list is moved and there is never a wait:

- A row eases up into place as it comes in at the foot of the card, and tucks away under the heading as it leaves at the top: it fades to 15% and moves 10 to 14 px, a touch smaller.
- A rule appears under the heading once the list has moved from its top.
- A fade at the foot shows while there is more below, and goes at the end.

Only opacity and transform change, so nothing is laid out again while scrolling. With reduced motion the rows stay still; the rule and the fade, which do not move, stay. A browser without scroll timelines scrolls plainly.

## 5. What does not change

- A phone's sizes: a task row is 54 px, a day of the week 68 px, and every control is at least 44 px.
- What Home holds. Nothing was taken away to make it fit.
- The sea's fold, which still leaves a 64 px strip.

## 6. What it changed that had been decided

| Decided before | Now | Why |
|---|---|---|
| Habits on a line of their own under the week from 1280 px (Oliver, 16 November) | At the foot of the Today card at every width | The line's 50 px went to the sea, and the card had room to spare |
| Headlines under "Any time this week" (the mock of 17 November) | Under "Coming up" | So the two columns are about as long as each other |
| The sea 240 px tall from 1024 px, and 276 px from 1440 px | Between 176 and 276 px, by the screen's height | So Home fits a laptop, and the sea is full height where there is room |
| On a phone: this week, headlines, coming up, next week | This week, next week, coming up, headlines | It follows the two columns |

## 7. Calls made here

| The call | Why | The other way |
|---|---|---|
| The sea follows the screen's height, not what the page holds | A sea that resized as tasks were added, or as a day was chosen, would move the week strip under the pointer | Take whatever room the page leaves at that moment |
| The row that adds a task scrolls with the list | It gives a long day the most room, and N always brings it into view | Keep it fixed at the foot of the card |
| The habits scroll with the tasks | The same, and a short day shows them without scrolling | Keep them fixed at the foot of the card |
| The rows' movement is tied to the scroll | It can never make anyone wait, however often the list is moved | A timed animation as rows appear |
| The page's own scrolling is left alone when a list beside the day is longer than the screen | Those lists are rarely long, and a second scrolling column would be one more thing to learn | Give each column its own scrolling |

## 8. Not in this piece

- The sea as a tall picture beside the date and the week, which would make the boat larger still. It was described to Oliver and not asked for.
- Any change to how the boat is framed inside the sea.
- Tablets, between 640 and 1023 px, where Home is one column and scrolls.

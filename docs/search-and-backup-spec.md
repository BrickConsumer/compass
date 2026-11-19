# Search and backup: specification

| | |
|---|---|
| Status | **Designed and built on 19 November 2026, on the branch `search-and-backup`, without a review first.** Oliver asked for the rest of the app to be built without questions, to be gone through once it is finished. Every choice here is a call made in the build, and section 8 lists the ones most worth a look. Josh and Aditya have not weighed in. |
| Scope | The fifth and last piece of Aditya's plan: search across everything that is kept, and a backup of all of it that can be downloaded and restored. |
| Companions | [my-pages-spec.md](my-pages-spec.md), [interests-spec.md](interests-spec.md), [fitness-spec.md](fitness-spec.md), [home-screen-spec.md](home-screen-spec.md) |

## 1. Where this comes from

This is piece 5 of the five in [next-stages.md](next-stages.md), Stage 8. The plan asks for a search over titles, notes, topics and names, with results that show what kind of thing each is and where it is kept, a way to narrow them by kind, and opening the one chosen. It also asks for the data to be exported and imported, as a backup.

Compass already has the place for the first: the menu that opens with Cmd or Ctrl and K, which today finds commands, pages by title and links by name. It has part of the second: My pages can be exported as text. Neither reaches everything.

| The plan | This piece |
|---|---|
| A global search over titles, notes, tickers, topics and case names | The same menu now finds everything that is kept, by its name and by what is written in it |
| Results show the item's type and location | Each result says what it is and where it is kept |
| Filter by record type | Once there are results, a row of kinds narrows them |
| Open the selected item | A result opens the thing itself, or the place that holds it |
| Data export and import | A backup file, downloaded from Settings and restored there |

## 2. Goals, and what to stay away from

**Goals**

- Anything written in Compass can be found by a word in it.
- A result says enough to choose it without opening it.
- A backup holds everything, and restoring one puts everything back.
- A file that is not a backup, or was edited by hand, can never leave Compass unable to open.

**Not goals**

- Searching the web, or anything outside this device.
- Fuzzy matching, or ranking by anything cleverer than where the words were found.
- Merging a backup into what is here. Restoring replaces.
- Backups made on a schedule, or kept anywhere but where the student saves the file.

**What would make this a failure**

- Anything leaving the device. A backup is made and read in the browser, and is sent nowhere.
- A restore that cannot be taken back.
- Search showing what is hidden. With Fitness off, nothing in it is found.
- A search slow enough to notice while typing.

## 3. Search

- **Where:** the menu that opens with Cmd or Ctrl and K, from "Search" in the rail, and from the round button on Home on a phone. Commands are found as now, and come first.
- **When:** from the second character typed. One character finds commands only.
- **What is searched:**

| Kind | What is found | Searched by | Says where | Opens |
|---|---|---|---|---|
| Tasks | A task | Title, notes | Its subject, and its day or week | Home on its day, with the task's editor open |
| Study | A subject | Name, topic, notes | "Study" | The subject's page |
| | An assessment | Title | Its subject and date | The subject's page |
| | Feedback | What it was on, what was said, what to work on | Its subject and date | The subject's page |
| | A study session | Name | Its subject | The subject's page |
| Pages | A page | Title, writing, list, a form's parts | Its interest, or its subject | The page |
| | An interest | Name | "My pages" | My pages, with the interest chosen |
| Headlines | A headline | Title, source, tag | Its source and date | The article, in a new tab |
| Habits | A habit | Name | "Habits" | Habits |
| Reviews | A saved weekly review | Its three answers | Its week | The Weekly review, on that week |
| Fitness | A routine, a session, a best, a measure | Name, lines, note, value | Its date or value | Fitness, or the session itself |
| Links | A link, yours or a subject's | Name | The subject, for a subject's | The site, in a new tab |

- **Matching:** every word typed must be in the thing, in any order and any case, with or without its accents. A word also counts when it is in what the thing belongs to: a task's subject, a page's interest. So "bio test" finds a Biology task called "Revise for the test".
- **Order:** things whose name starts with what was typed, then things whose name holds every word, then things found by what is written in them. Within each, in the order of the table, newest first where a thing has a date.
- **A result** shows its name, what it is and where it is kept. When the words were found in its writing and not its name, it shows those words in their sentence.
- **Kinds:** once anything is found, a row of buttons: "All", then each kind that has results, with its count. Choosing one shows only that kind.
- **How many:** "All" shows the first 20, and says how many more there are. One kind shows up to 50.
- **Fitness** is searched only while it is switched on.
- **Keyboard:** Enter opens the first result. The down and up arrows move through the results, and typing goes back to the box.
- **Nothing found:** the menu says so, as it does now.

## 4. Backup

- **Where:** Settings, under "Your data", above the two buttons that are there now.
- **"Download a backup"** saves one file, `compass-backup-2026-11-19.json`, holding everything Compass keeps: every list, the boat, and the settings. It is made in the browser and sent nowhere. A line under the button says so.
- **"Restore from a backup"** asks for a file. Compass reads it and says what it holds before anything changes: the day it was saved, and how many tasks, subjects, pages and so on. Two buttons follow: "Replace everything with this backup" and "Keep what is here".
- **Restoring replaces everything** on this device with what the backup holds. The theme stays as this device has it, since it belongs to the device.
- **Undo:** a toast says "Backup restored." with Undo, which puts back what was here before. It lasts as long as any toast does.
- **A file that cannot be restored** is refused in words, and nothing changes:

| The file | Compass says |
|---|---|
| Is not a Compass backup, or cannot be read | "That file is not a Compass backup." |
| Was made by a newer Compass | "That backup is from a newer version of Compass." |
| Is larger than 5 MB | "That file is too large to be a Compass backup." |
| Is a backup, but the browser will not save what it holds | "This device could not keep that backup, so nothing was changed." |

- **A backup is not trusted.** It is checked exactly as a save is when Compass opens: a record without what it needs is dropped, a link that is not a web address is dropped, and anything that is not Compass's own data is ignored. A backup edited by hand can lose what was broken in it, and can never stop Compass opening.
- **Search** offers "Download a backup" and "Restore from a backup", which go to that part of Settings.
- **My pages' own export,** as text, stays as it is.

## 5. The file

```json
{ "app": "compass", "format": 1, "savedAt": "2026-11-19T10:00:00.000Z", "data": { "tasks": [], "subjects": [], "…": "…" } }
```

`data` is what Compass saves in the browser, unchanged. `format` rises only if a later Compass could not be read by this one.

## 6. Opening a save, made stricter

Restoring a file makes what Compass does on opening a save matter more: a save was only ever reached by editing the browser's storage by hand, and a file can come from anywhere. So the check that every save and every backup passes is tightened in the places it took things on trust:

- Only Compass's own lists and settings are read from a save. Anything else in it is ignored.
- The boat, the settings, the voyage log, habits and their ticks, study sessions, reviews and levels are each kept only where they are what they should be. A boat that cannot be drawn becomes the starting boat with the same name where it has one.
- A task with a priority or a scope that is not one becomes an ordinary day's task.
- Every record is built again from the parts its kind has, each kept only if it is what it should be. Nothing else in a record is read, so nothing of the wrong kind can ride in on one.
- A day is a day only from 1900 to 2999. The week either side of a day has to be a day too.

A save that was whole opens exactly as it was. A test holds that.

## 7. Accessibility

- The kinds are buttons that say whether they are pressed, in a group named "Show".
- Each result is one button: its name, what it is and where, and any words found.
- The arrows move real focus, so a screen reader reads each result as it is reached.
- What a backup holds is read out when it has been read, and a refusal is announced.
- On phones every new control is at least 44 px tall.

## 8. Calls made here, open to change

Nothing in this piece was reviewed before it was built. These are the calls most worth a look.

| Call | Why | The other way |
|---|---|---|
| Search lives in the menu, not on a page of its own | It is already where finding starts, and it is one press from anywhere | A Search place with its own page |
| A headline and a link open their site, not their row in Compass | That is what pressing one does everywhere else | Opening Headlines, or Settings, at that row |
| A task opens on Home with its editor open | A task has no page of its own, and its notes are in its editor | Home on its day, with nothing open |
| Restoring replaces everything | Merging two sets of records has no right answer for a task changed in both | Merge, keeping the newer of each |
| The theme stays with the device on a restore | It is the one setting that is about the screen in hand | Take it from the backup |
| A restore can be undone only while its toast shows | It is what every Undo in Compass does | Keeping the old data until the next restore |
| Search starts at two characters | One letter finds nearly everything | Searching from the first |
| 20 results under "All", 50 in one kind | The menu is small. A kind can show more. | No limit, with scrolling |
| The backup is JSON a person can read | Nothing is hidden in it, and it can be checked by eye | A packed file |

## 9. Not in this piece

- Search by date, by done or not done, or by anything but words.
- Remembering recent searches.
- Restoring part of a backup.
- Sync between devices, which is still ruled out with accounts.

## 10. As built

Built on 19 November as written above. A fresh reviewer then read the whole change and tried the worst files it could make, and what it found was fixed. These are the calls made in the build and in that pass, beyond section 8.

| What | How it is built |
|---|---|
| A record with a part of the wrong kind | The review restored a backup whose tasks were marked done with `true` and not a time. Home then failed on every load. Every kind of record is now built again from typed parts when a save is opened, and a test puts a value of the wrong kind into every part of every record and checks that what is kept can still be drawn. |
| A page that fails as it is drawn | It is replaced by a few words, inside Compass: the rail, the bar on a phone and the way to Settings stay. Before, one failed page took the whole screen with it. |
| The two backup commands in search | Both go to Settings with the keyboard on their button. "Download a backup" does not save a file from the menu, since Enter in a search would then download one by surprise. |
| A restore the browser will not keep | It says so, and what was here is put back on screen. It is still what is saved. |
| What a backup holds | It is announced in a place that is in the page before there is anything to say, so a screen reader reads it. Either answer puts the keyboard back on "Restore from a backup". |
| What Fitness keeps, in the count of what a backup holds | Counted only while Fitness is switched on in the backup. Switched off, the sample's training week has never been seen. |
| A best and a measure | Found by their value as well as their name. |
| A review | Found once it has been saved. One still being written is not. |
| The words found | Shown in their sentence, whatever accents they carry. |
| A letter typed with a kind or a result in hand | It goes to the search box. |
| A subject or a page with the same id as another | The first is kept. |
| A save of the user's own with no list of assessments | It gets none. It used to get the sample's three. |
| The downloaded file's address | Kept for a minute, not a second. A phone asks before it saves a file. |

Left as they are:

- A backup with no subjects comes back with the five starting subjects. That is the rule a save has always followed, and "Clear everything" leaves the same five.
- A file edited by hand can name any boat and any distance. Nothing checks a restored voyage against anything, since the log is the voyage.
- A search longer than 100 characters is cut there.
- An Undo after a restore lasts as long as its toast. A second restore replaces the first one's Undo.
- `searchPages` and `searchLinks`, the two older searches, are no longer used by the menu. They are still in the code, with their tests.


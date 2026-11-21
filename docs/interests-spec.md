# Interests and headlines: specification

| | |
|---|---|
| Status | **Designed and built on 19 November 2026, on the branch `interests`, without a review first.** Oliver asked for the rest of the app to be built without questions, to be gone through once it is finished. Every choice here is a call made in the build, and section 9 lists the ones most worth a look. Josh and Aditya have not weighed in. |
| Scope | The fourth piece of Aditya's plan: interests in My pages, with ready-made forms for Investing and Law, and headlines saved by hand, shown on Home. |
| Companions | [my-pages-spec.md](my-pages-spec.md), [home-and-review-additions-spec.md](home-and-review-additions-spec.md), [study-detail-spec.md](study-detail-spec.md), [fitness-spec.md](fitness-spec.md) |

## 1. Where this comes from

This is piece 4 of the five in [next-stages.md](next-stages.md), Stage 8. The plan asks for two hubs, Investing and Law Journey, each with its own sections and record templates, and for three headlines on Home.

Oliver decided on 17 November that these are not places of their own. They are **interests**: folders in My pages, with ready-made forms. Piece 1's mock already drew where headlines sit on Home, under "Any time this week", and marked them "Saved by you".

| The plan | This piece |
|---|---|
| An Investing hub and a Law hub, each a section of the site | An interest is a folder in My pages. A student adds their own, and can start one from Investing or from Law. |
| A company research template, a trading journal template, a case template | Forms: a page that opens with its headed parts ready to fill in |
| Watchlist, Books, Learning, Universities, Scholarships, Career ideas | Pages in the folder. Each starting point offers a few by name. |
| A suggested learning route | A checklist of five steps, offered in an Investing interest |
| Three headlines on Home, each with its source and date, opening the original article | Headlines saved by hand, the newest three on Home |
| Headlines that refresh by themselves | **Not built.** Compass fetches nothing from anywhere, and this would be the first thing that did. |

## 2. Goals, and what to stay away from

**Goals**

- An interest holds the pages that belong together, whatever the interest is.
- A form saves typing the same headings again, and stays ordinary writing.
- A headline is one press from its source, and says where and when it is from.
- A new user sees one new row in My pages and nothing new on Home.

**Not goals**

- Prices, charts, tickers looked up, or anything fetched from another site.
- Fields that are numbers, ratings or choices. A form's parts are words.
- Forms a student designs themselves.
- Folders inside folders.

**What would make this a failure**

- Compass reaching out to another service. Nothing here does.
- Anything that reads as advice about money. The forms ask questions and record reasoning; they suggest no decision.
- A second copy of anything. An interest's page is a page in My pages, and Home's headlines are the saved list.
- Anything that is not a web address reaching a link. A page's link and a headline's address follow the rule piece 1 set.

## 3. Records

New parts of the saved data. Everything stays on the device.

| Record | Fields | Limits |
|---|---|---|
| `interests` | A list of `{ id, name, forms }`, in the order they were made. `forms` is `investing`, `law` or `none`. | Up to 8. Name 1 to 30 characters. |
| `page.interestId` | The interest a page is kept in | Optional. A page is in one interest at most. |
| `page.form` | The form it was started from, which gives its label | Optional |
| `page.fields` | A list of `{ id, label, text }`: a form's headed parts | The labels are the form's. Each text up to 2,000 characters. |
| `page.link` | One web address: its source | Optional |
| `headlines` | A list of `{ id, title, url, source, date, tag }` | Up to 60. Title 1 to 140 characters. Source up to 40; with none typed it is the site's name. Tag up to 8 and may be empty. `date` is the day it was published. |

Words are kept as typed, as in Fitness. Every web address goes through `cleanUrl`, when it is typed and again when a save is opened. A save is not trusted: an interest is kept only with an id and a name, a headline only with an id, a title, a web address and a real date, and a field only with an id and a label.

## 4. Interests, in My pages

- **The list in My pages** gains a part, "Interests", above the pages: a row for each interest with its name and how many pages it holds, a row for "Headlines", and "Add an interest".
- **"Add an interest"** opens an editor: a name, and where to start from.

| Start from | It offers |
|---|---|
| Investing | Company, Journal entry, Learning route, Watchlist, Books |
| Law | Case, Current affairs, Books, Universities and scholarships, Career ideas |
| Something else | Nothing ready-made |

- With no name typed, an interest started from Investing or Law takes that name.
- **Choosing an interest** shows its pages in the list, under its name, with "All pages" to go back and "Edit" to rename it, change what it starts from, or delete it.
- **"Start one"** is under an interest's pages: what its starting point offers, then Note, Checklist and Reading. A page started there is kept in the interest and opens.
- A starter that comes with a title (Learning route, Watchlist, Books and the like) is left out once the interest has a page of that title. A form (Company, Journal entry, Case, Current affairs) always stays, since there are many of each.
- **Any page** can be put in an interest, or taken out, in its editor.
- **Deleting an interest** keeps its pages, in no interest. Undo puts them back.

### Forms

A form is a page with headed parts. Each part is a box of ordinary writing, kept as typed.

| Form | Its parts |
|---|---|
| Company | Ticker and industry · Business model · Revenue and profit, with the period and the source · Competitive advantage · Risks · Valuation · Would I buy, and why · Confidence, out of 10 |
| Journal entry | Date · Ticker · Buy or sell · Reason · Risk · Outcome · Lesson learned |
| Case | Court · Facts · Decision · Why it matters · My thoughts |
| Current affairs | What happened · Why it matters · My thoughts |

- The parts come first on the page. Its own writing and its list follow, as on any page.
- A part may be left empty. Nothing is marked as missing.
- **Learning route** is a checklist that starts with five steps: market basics, order types, diversification and risk; reading financial statements and business models; valuation, and comparing companies on a watchlist; a paper-trading journal, to test the reasoning; reviewing decisions and lessons before any real money.
- A page's line in a list is its first words, as now, and for a form with nothing written under it, the first part that has something in it.

### A page's link

- The page's editor gains "Source link", checked as every link is.
- On the page it shows under the title as "Source", with a small arrow, and opens in a new tab.

## 5. Headlines

- **A headline** is a title, the address of the article, where it is from, the day it was published, and an optional short tag such as a ticker.
- **The Headlines page** is in My pages, at `/pages/headlines`: every saved headline, newest first by the day it was published, with "Save a headline". A row's title opens the article in a new tab. "Edit" on a row opens its editor, where it can be changed or deleted, with Undo.
- **"Save a headline"** opens an editor: Headline, Address, Source, Published and Tag. It is saved once it has a headline and a web address. With no source typed, the site's name is used.
- **On Home**, under "Coming up" (under "Any time this week" until 21 November: see [home-one-screen-spec.md](home-one-screen-spec.md)): "Headlines", marked "Saved by you", with the newest three. Each shows its tag, its source and its date. With more than three, "All headlines" goes to the page. With none, Home shows nothing.
- **Search** offers "Save a headline".

## 6. Deleting, and Undo

| Deleted | What goes | What stays | Undo |
|---|---|---|---|
| An interest | The folder | Its pages, in no interest | Puts it back, with its pages |
| A page in an interest | The page | The interest | Puts it back |
| A headline | The headline | | Puts it back where it was |

## 7. Miles, the sample and earlier saves

- Nothing here earns miles or changes the sea. A page is not a task.
- **The sample** gains no interests and no headlines, so Home and My pages are as they were but for the new rows in My pages' list.
- **A save from before this piece** opens with no interests and no headlines, and nothing lost.
- **"Clear everything"** clears them.

## 8. Accessibility

- Each new part has a heading. A form's parts are labelled boxes.
- Every link says that it opens in a new tab.
- On phones every new control is at least 44 px tall.
- Long words in a name, a part, a headline or a source wrap, and never push a phone's page sideways.

## 9. Calls made here, open to change

Nothing in this piece was reviewed before it was built. These are the calls most worth a look.

| Call | Why | The other way |
|---|---|---|
| Headlines are saved by hand, and nothing is fetched | Compass fetches nothing today. A feed would be the first thing to talk to another service, which changes the privacy promise. | A feed from chosen sources |
| A student adds their own interests, and Investing and Law are two starting points | Compass is for any student. The forms are there for the two the plan names. | The two as fixed parts of My pages |
| A form's parts are words | As in Fitness: nothing is read out of what is typed, so nothing is graded. "Confidence, out of 10" is a box to write in. | A rating control, and a yes, no or unsure choice |
| The watchlist is a checklist page | It is a list, and a company's research is its own page | A list built from the company pages |
| A journal entry's date is a part to write in | An entry is often written days later, about a day in words | A date control |
| Headlines are one list, not kept in an interest | Home shows one list. A tag says what a headline is about. | A list for each interest |
| The sample gains nothing | A new user's Home and pages stay as they were | A sample interest and headlines |
| The learning route's five steps come from the plan, reworded | It is a reading order, and it ends with reviewing before any real money | No ready-made list |
| Up to 8 interests and 60 headlines | Enough, and a save cannot grow without end | More |

## 10. Not in this piece

- A feed of headlines, prices, or anything looked up.
- A student's own forms, and folders inside folders.
- Putting interests in another order.
- Finding a headline or a part of a form by search. That is piece 5.

## 11. As built

Built on 19 November as written above. A fresh reviewer then read the whole change, and what it found was fixed the same day. These are the calls made in the build and in that pass, beyond section 9.

| What | How it is built |
|---|---|
| Opening and leaving an interest | The list changes in place, so the keyboard is moved with it: to the interest's name on the way in, back to its row on the way out, and to the "Interests" heading if it was deleted. |
| Choosing an interest on a wide screen | One of its own pages opens beside the list, in place of the headlines or a page it does not hold. An empty interest leaves that side empty. |
| The way back above a page, on a phone | It names the interest when the list behind it is an interest's, and says "All pages" otherwise. |
| A page that comes with a title | It is made once in an interest by the store's own rule, however fast its button is pressed. |
| A double press | The second press does nothing, wherever it lands. Starting a page moves what is under the pointer, and without this the second press started or opened something else. |
| An editor on its way out | It takes no more presses. This is in the frame every editor shares, so it holds for all of them. |
| "Save a headline" in search, with sixty saved | It says that sixty is the most and opens nothing. |
| Enter in a new headline's Address | It saves the headline, as Enter does in its other boxes, once the address is one. |
| A source taken from the site | It follows a change of address. A source that was typed stays. |
| A page's list in a save | Only what is an item is kept, and a kind that is not one of the five is a note. A save edited by hand cannot stop My pages opening. |
| Limits | A limit is held where things are added. An Undo can take a list one past it, and a save's lists are never cut, as in Fitness. |
| A browser that cannot grow a box with its words | A form's parts start taller there. Chrome grows them. |

Left as they are:

- A starter's hint ("Research on one company") shows only as a tooltip.
- A headline can be dated in the future.
- A page that comes with a title is matched by its title. Renaming the Watchlist brings its button back, and a student's own page called "Books" hides the Books button.

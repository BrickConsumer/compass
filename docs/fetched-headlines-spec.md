# Fetched headlines: specification

| | |
|---|---|
| Status | **Designed on 20 November 2026 and built the same day, on the branch `fetched-headlines`.** Oliver chose the approach (a list Compass publishes), the sources to start with and how Home shows them. Everything else here is a call made in the build, and section 10 lists the ones most worth a look. Section 12 says what the build and its review added. Josh and Aditya have not weighed in. |
| Scope | Headlines that arrive by themselves, beside the ones saved by hand. The last part of piece 4 of Aditya's plan. |
| Builds on | [interests-spec.md](interests-spec.md), section 5 (headlines saved by hand). |

## 1. Where this comes from

Aditya's plan asks for three recent headlines on Home about companies on a watchlist, each from a reputable source with its date and a link, refreshed by themselves, with a clear state when they cannot be. It also says that saved and fetched headlines must be told apart, and that hand-saved ones are the fallback.

Piece 4 built the hand-saved half and left the rest, because Compass fetched nothing from anywhere and a feed would be the first thing that did. On 20 November Oliver asked for it to be designed, and chose:

- **The approach:** a list that Compass publishes, the same for everyone, which each device downloads and picks from.
- **The sources to start with:** The Conversation, official releases (the Reserve Bank and the Bureau of Statistics), and the Guardian, each subject to its own terms.
- **Home:** one list of three, saved and fetched together. Ones naming a company on the Watchlist come first, then the newest. Each row says where it is from.

## 2. What it is for

- A student who switches it on sees current business and economy headlines on Home without typing them.
- Nothing about the student leaves the device. That is the reason for this approach, and nothing in the build may weaken it.
- A headline is one press from its publisher, and says who published it and when.
- A student can always tell a headline they saved from one that was fetched.

**Not for:**

- News for one company on request. The list is the same for everyone, so a small company may never appear in it.
- Prices, charts or anything about a market's movements.
- Minute-by-minute news. The list is rebuilt a few times a day.
- Anything fetched while the switch is off. Off is how Compass starts.

**It would be a failure if:**

- Compass sent the Watchlist, a name, or anything else kept on the device, anywhere.
- A publisher's headline were altered, cut short, or shown without its publisher's name and a link to the article.
- A tampered list could open anything other than a publisher's own site, or stop Compass opening.
- A source were added without its terms being read and written down in section 4.

## 3. Approaches

| | Approach | What it gives up |
|---|---|---|
| **A, chosen** | A scheduled job on GitHub reads the sources and publishes one small public file. Each device downloads it and picks three. | News per company. Only sources whose terms allow republishing. |
| B | A small server of Compass's own looks up each student's companies with a market-news service. | The Watchlist leaves the device. It needs hosting and a news account in a founder's name, and the free plans found are licensed for one person's own use. |
| C | Each student signs up for their own news key and pastes it into Settings. | A planner any student could use. Dropped. |

A was chosen because it is the only one that keeps "kept on this device and nowhere else" true, and the only one that can exist while Compass has no server. B fits once Compass has accounts and hosting, which Aditya's plan puts before automated news.

## 4. The sources

A source is in the list only when its terms allow a headline to be shown with a link, and a feed exists that a plain program can read without pretending to be a browser.

| Source | In the list | Why |
|---|---|---|
| **The Conversation**, Business + Economy (Australia) | **Yes** | Published under Creative Commons Attribution, No derivatives. Its republishing guidelines invite reuse with credit and a link. Compass shows the headline unaltered, as a link to the article, with "The Conversation" beside it. Feed: `https://theconversation.com/au/business/articles.atom`. |
| **Reserve Bank of Australia**, media releases | **Yes** | Its copyright notice puts most material, media releases among it, under Creative Commons Attribution 4.0, "provided that the RBA is properly attributed". Feed: `https://www.rba.gov.au/rss/rss-cb-media-releases.xml`. The feed holds only the latest release, so the job keeps earlier ones for a time (section 5). |
| **Australian Bureau of Statistics** | **No** | Its media releases have no feed. Reading the web page itself would be scraping, which this piece does not do. |
| **The Guardian**, Business | **Built, and switched off** | Its free key is for non-commercial use, and its terms set conditions that are not met yet. Section 9 says what is built and what switching it on needs. |

The Headlines page credits each source by name and names the two licences.

## 5. The published list

**The job.** A workflow, `.github/workflows/headlines.yml`, runs every four hours and when started by hand. It has four steps and installs nothing:

1. `scripts/take-headlines.sh` takes the list as it stands on the branch. With no branch yet there is no list. If the branch cannot be read for any other reason the run stops, so that a list is never built from nothing while an earlier one exists.
2. `scripts/publish-headlines.mjs` reads each source, builds the list and writes `headlines.json`.
3. `scripts/push-headlines.sh` commits that file to a branch of its own, `headlines`, which holds it and a note saying what it is. Each run adds one commit. Nothing is force-pushed, and the job never writes to `main`.
4. `scripts/publish-headlines.mjs --check` fails the run when a source that is on has not been read for a day. The list has been published by then. A failed run is how the repository's owner comes to hear that a source has gone quiet.

**The file.**

```json
{ "format": 1, "checked": "2026-11-20T04:17:09Z",
  "items": [ { "title": "…", "url": "https://theconversation.com/…", "source": "conversation", "at": "2026-11-19T19:05:25Z" } ] }
```

- `checked` is when the job last read at least one source.
- The file also holds `read`: when each source was last read. The job uses it for its fourth step, and the app does not.
- `source` is one of the ids in the table of sources that the job and the app share. `at` is when the publisher says it was published.

**The rules, applied by the job when it writes and again by the app when it reads:**

- A title is kept exactly as published, once its markup is decoded and its spaces are single. One longer than 140 characters is left out, never cut, so a headline is never altered and can always be kept by hand.
- An address must be `https` and on its source's own site (`theconversation.com`, `rba.gov.au`, or a part of them). Anything else is left out.
- A headline stays for 30 days from when it was published, and one dated more than a day ahead is not taken. The list holds the newest 20 from each source, 60 at most.
- A headline is in the list once, by its address.
- A time must be a real one, between 2000 and 2100. A date can be written that no calendar can show, and one of those must never reach a page.
- A title is shown exactly or not at all. One that would show a character's code in place of the character, such as `&eacute;`, is left out.
- On the device, a headline goes once it is thirty days old, even from a list that is no longer being rebuilt.

**When a source cannot be read,** or answers with something that holds no headline, the job keeps what the last list held from it and carries on. When none can be read it fails, publishes nothing, and the last list stays as it was.

**Known limits.** GitHub may run a scheduled job late, and stops scheduled jobs in a public repository after 60 days without activity. Either way the app says how old the list is.

## 6. In Compass

### The switch

- **Settings gains "Headlines"**, after "Links" and above "Your data", with one switch, "Fetch headlines", off to start.
- Beside it: "Compass downloads a public list of business and economy headlines, the same list for everyone, and picks from it on this device. Nothing about you is sent. GitHub, which holds the list, sees that a device asked for it, as any website sees a visit."
- With the switch off, Compass asks for nothing and everything is as it was before this piece.
- Switching it off forgets the fetched list at once, and an answer still on its way is thrown away.
- "Clear everything" keeps the switch as it is, as it keeps the Fitness switch.

### Fetching

- With the switch on, Compass asks for the list when it opens, when the switch is turned on, and when its tab is looked at again, and no more often than every 30 minutes, or every 5 minutes after an asking that brought no list. Both are remembered from one opening to the next.
- A request cut short by leaving the page is not counted as one that failed.
- The request carries no cookies and no referrer. It is a plain download of `headlines.json` from the `headlines` branch.
- The last list read is kept on the device, apart from the student's own data. It is not in a backup and is not found by search.
- A second tab follows the switch: turned on in one, the other asks for the list too.
- A request that fails or takes longer than 10 seconds changes nothing: the list from before stays.

### Which headlines name the Watchlist

- **Watch words** are the lines of every page that was started as a Watchlist, or is called "Watchlist", ignoring capitals in the name. A line can hold several names with commas between them: "Commonwealth Bank, CommBank". Up to 40 words are used, each of 2 to 40 characters.
- A curly apostrophe and a straight one are the same.
- A headline **names** a word when the word appears in its title as whole words. Capitals are ignored, except that a word typed all in capitals, such as BHP, must appear in capitals. So "IT" does not match "it".
- A saved headline also names a word when its tag is that word.
- This is worked out on the device. The words are never sent.

### Home

With the switch off, Home is as it was: the newest three saved headlines, marked "Saved by you".

With it on, Home shows one list of three from saved and fetched together:

1. First, headlines published in the last 7 days that name a watch word, newest first.
2. Then the rest, newest first.
3. Of two on one day, a saved one comes before a fetched one.

- A fetched headline that was also saved by hand shows once, as the saved one.
- Each row has its title, which opens the article in a new tab, then the publisher and the day: "The Conversation, today". A saved row ends "Saved by you". A row that names a watch word shows the word in a small outlined label.
- In the heading's corner, where "Saved by you" was: "Updated 3 hours ago".
- With more than three in all, "All headlines" goes to the page.

### The Headlines page

- With the switch on, the page has two parts. **"Fetched"** comes first: the newest eight in the list, with "Show all 21" for the rest, and how old the list is. **"Saved by you"** follows, as it was.
- A fetched row has **"Keep"**, which saves it by hand: it moves to "Saved by you" and stays after it leaves the list. The line of the Watchlist it names goes with it as its tag, when that is 8 characters or fewer. A toast says "Headline saved." with Undo. With sixty saved, it says that sixty is the most.
- By keyboard, "Keep" leaves the keyboard on the row that takes its place, or on the heading when none is left.
- Under the fetched list: which words are being watched, or, with no Watchlist page, how to make one. Then the credits: "From The Conversation (Creative Commons) and the Reserve Bank of Australia (CC BY 4.0). Each opens on its publisher's site."
- With the switch off, the page is as it was, and one line says that Compass can fetch headlines, with a link to the switch.

### When the list is old or cannot be read

| State | Home, in the heading's corner | The Headlines page |
|---|---|---|
| Read in the last hour | "Updated in the last hour" | The same |
| Read, 1 to 23 hours old | "Updated 3 hours ago" | The same |
| A day old or more | "Last updated 17 Nov" | The same, and "The list has not been updated for a while." |
| Cannot be read, with a list from before | As for the list held, by its age | The same, and "Compass could not reach the list just now." |
| Cannot be read, with nothing held | "Could not be fetched" | "Compass could not reach the list just now. Your saved headlines are below." |
| Read, and empty | Nothing about it | "No headlines in the list just now." |
| Every one in it saved by hand | The saved ones | "You have saved every headline in the list." |

Home shows the Headlines block whenever there is a headline to show, or the switch is on, nothing is held and the list could not be read. Then it says "Compass could not reach the list of headlines just now."

### What does not change

- A saved headline, its editor, its limits and its place in search and in a backup.
- Search does not find fetched headlines: they are not the student's.
- A backup does not hold the list, and does not change the switch. Restoring one leaves this device's switch as it was, as it leaves the theme: a file from another device, or another person, is never what turns the network on.

## 7. The list is not trusted

The file is public and comes over the network, so the app treats it as it treats a save from anywhere:

- It must be an object with `format` 1 and a list. Anything else is "cannot be read".
- Each item is checked by the rules in section 5. One that fails is dropped: an unknown source, an address off its source's site, a title that is empty or too long, a time that is not one.
- At most 60 items and 200,000 characters are read.
- A title is shown as text, never as markup.
- A source that is switched off in the app's table, as the Guardian is, is dropped even if the file holds it.

## 8. What Compass says about privacy

- Settings keeps "Everything is kept on this device and nowhere else", which stays true.
- The Headlines page said "Compass fetches nothing". With the switch off it still says so. With it on it says what is fetched, and that nothing is sent.

## 9. The Guardian

**Built now:**

- The job can read the Guardian's Content API (`section=business`, newest first) and turn its answer into headlines by the same rules.
- The source's row in the shared table is marked off. While it is off the job does not ask the Guardian, key or no key, and the app drops its headlines even if a list held them.
- Once it is on, the job asks only when a key is given to it as a secret, `GUARDIAN_KEY`, and the key goes into that one address and nowhere else.
- The request has not been tried against the Guardian itself, since there is no key. It is written from their documentation and tested against an answer of the shape they describe.
- Two of its terms are already in the rules: its headlines are replaced on every run and are not held past 24 hours, on the device either, and a Guardian row has no "Keep".

**Needed before it is switched on, each one a founder's to do:**

1. Register a developer key in a founder's name and accept the Open Platform terms.
2. Ask the Guardian's licensing team about clause 6(g), which forbids "any automated device, program … or method" with the Content API. A scheduled job is one. The key is of no use until they say this use is allowed.
3. Move the list from a branch to a place that keeps no history, such as GitHub Pages. A branch remembers every list it has held, and the terms forbid holding their headlines for more than 24 hours.
4. Add their "Powered by The Guardian" logo beside their headlines, from the file they supply, as their terms require.

Then the source's row is marked on, with tests for the logo and the 24 hours.

## 10. Calls made here

Made in the build and open to change.

| The call | Why | The other way |
|---|---|---|
| The list lives on a branch, `headlines` | It needs no setting changed and no hosting | GitHub Pages, which keeps no history and which the Guardian would need |
| The job runs every four hours | Its sources publish a few times a day | More often |
| A headline stays 30 days | The Reserve Bank publishes a few releases a month, and its feed holds only the latest | 14 days |
| A title over 140 characters is left out | Cutting it would alter it, and a saved headline holds 140 | Raise the limit for both |
| Watch words are the lines of a Watchlist page | The Watchlist already exists as a page, and Compass keeps no second copy of anything | A list of words of its own on the Headlines page |
| The page shows eight fetched headlines, and the rest when asked | With all twenty-one, the saved ones and "Save a headline" were two screens down | Show every one |
| "Clear everything" keeps the switch | It keeps the Fitness switch: both say how Compass should behave, not what is in it | Switch it off |
| The switch is after "Links" in Settings | Both are about what Home shows, and it sits just above the line that says what is kept where | After Fitness, with the other switch |
| A word in capitals must match in capitals | "IT" and "ON" are tickers and also words | Ignore capitals always |
| Watched headlines lead for 7 days | One saved months ago should not stay on top for good | No limit, or 3 days |
| With the switch off, Home is exactly as before | Nothing changes for anyone who does not ask for it | Watched headlines first there too |
| A saved row ends "Saved by you" and keeps its source | The source is worth more than the space | "Saved by you" in place of the source |
| "Fetched" comes before "Saved by you" on the page | It is what changed since the last visit | Saved first |
| Fetched headlines are not found by search | Search finds what the student has kept | Find them too |
| The Bureau of Statistics is left out | It has no feed | Read its web page |
| Restoring a backup leaves the switch as it was | A file from elsewhere should not be what makes this device ask the network | The backup carries the switch, and the offer says so |
| The job fails, after publishing, when a source has been unread for a day | A failed run is the one thing GitHub tells an owner about | A warning on the run, and no more |
| A row's day reads "today" or "yesterday" when it is | It is how the mock read, for saved rows too | Always the date |

## 11. Not in this piece

- News for one company on request, prices, or anything a server of Compass's own would do.
- The Guardian switched on (section 9).
- Headlines for the Law interest. The sources here are business and economy.
- A choice of sources or topics for each student.
- Telling the student that there are new headlines. Home shows them, and nothing announces them.

## 12. As built

Built on 20 November 2026 to sections 1 to 11, which say what Compass does. This section says what the build and its review added.

**Checked before any source was added:**

- The Conversation's feed and the Reserve Bank's were each read by a plain program, with nothing pretending to be a browser, and the job was run against both.
- The Bureau of Statistics' media releases have no feed, so it was left out.
- The Guardian's terms were read in full. They are why its part is built and off.

**The review.** A fresh reviewer read the whole change and drove it in a browser, in a build made for release, and in five time zones. It found the privacy promise sound under everything it tried: no request with the switch off, and with it on one request carrying no cookie, referrer or query, and nothing of the name, the Watchlist or a saved headline. Forty-eight forms of address were tried against the rule that a headline may only open its publisher's own site, and none got through. These were fixed, each with a test that failed first:

| Finding | Fix |
|---|---|
| **Compass did not open at all in a browser that blocks site data.** Such a browser refuses even to hand its storage over, and the new store asked for it without trying. | It is asked for inside a try, as the saved data's own storage always was. |
| **A list holding a date no calendar can show stopped Home and the Headlines page,** on every opening, until a good list came. | A time must be between 2000 and 2100, in a headline and in the list's own `checked`. |
| Restoring a backup that had the switch on turned it on here and asked at once | Restoring a backup leaves this device's switch as it was |
| The device did not apply the thirty days or the twenty a source, so a list that stopped being rebuilt would never age | Both are applied when the list is read, and the thirty days again whenever it is shown |
| A source that stopped answering would not be noticed: the job stayed green and the list said "Updated in the last hour" | The list notes when each source was last read, and the job fails after publishing when one has been unread for a day |
| A moment's failure to read the branch was taken for "no branch yet", and a list was built from nothing | The two are told apart, and the run stops on the first |
| One crafted title could hold the feed reader for longer than the job is given | A title longer than a headline could be is skipped before it is read |
| A failed asking was forgotten when Compass was closed, so every opening asked again | It is remembered, and asked again after five minutes |
| A clock that was once wrong could stop all asking | An asking dated ahead of the clock holds nothing up |
| A title marked as html could lose part of itself around a bare "<", or show a character's code | A "<" that begins no tag is kept, the common curly marks are read by name, and a title that would still show a code is left out |
| A forty-letter watch word with nowhere to break pushed the Headlines page sideways at 320 px | It wraps |
| With a Watchlist page that had no lines, the page said to make one | It says the page has no lines yet |
| The job's script failed when its folder was missing, and the push script wrote the job's name into the checkout it ran from | The folder is made, and the name is given on the one commit |

**Found while fixing those:** a request cut short by leaving the page was counted as one that failed, once failures were remembered. It is put aside as though it had not been made.

**Calls the build added,** beyond section 10:

| The call | Why | The other way |
|---|---|---|
| After an asking that failed, Compass asks again after five minutes | Half an hour is long to look at "Could not be fetched" | The same half hour |
| A headline's time must be between 2000 and 2100 | It is the plainest rule that keeps out a date no calendar can show | A window around today |
| A title that cannot be read exactly is left out | A publisher's headline is shown as written or not at all | Show it as it came |

**Not tried:**

- The job on GitHub itself. Its scripts were run here against a throwaway repository as a runner has it, and its reading against the real feeds. Whether the feeds answer a GitHub runner, and whether the runner may push to `headlines`, is seen on its first run.
- The Guardian against its own service, since there is no key.
- A real phone, Safari or Firefox, and a screen reader by ear.

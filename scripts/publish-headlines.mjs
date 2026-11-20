// The job that builds Compass's public list of headlines: see docs/fetched-headlines-spec.md, section 5.
// It is run by .github/workflows/headlines.yml, and can be run by hand:
//
//   node scripts/publish-headlines.mjs out/headlines.json            build the list
//   node scripts/publish-headlines.mjs --check out/headlines.json    say whether a source has gone quiet
//
// Building reads each source that is switched on, builds the list from that and from the list already in the file,
// and writes the file. Every rule is in src/domain/feeds.ts, which the app uses too. This file only reads and
// writes. It has no dependencies: Node runs the TypeScript file below as it is.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { FEED_SOURCES, publish, quietSources, readList } from '../src/domain/feeds.ts';

const args = process.argv.slice(2), check = args[0] === '--check', path = check ? args[1] : args[0];
if (!path) {
  console.error('Say where the list is kept: node scripts/publish-headlines.mjs [--check] <file>');
  process.exit(2);
}
const env = { GUARDIAN_KEY: process.env.GUARDIAN_KEY || undefined };

// the list as it stands. With none, or one that cannot be read, a run starts from nothing
let previous = null;
try { previous = readList(JSON.parse(await readFile(path, 'utf8'))); } catch { /* no list yet */ }

if (check) {
  // One source failing does not stop the list being built, so without this a source that stopped answering would
  // drain out of the list over thirty days with nobody told. A failed run is what GitHub tells the owner about.
  const quiet = previous ? quietSources(previous, new Date(), env) : FEED_SOURCES.filter((s) => s.on).map((s) => s.name);
  for (const name of quiet) console.error(`::error::${name} has not been read for a day. Its headlines stay in the list for thirty days from when each was published, and then go.`);
  process.exit(quiet.length ? 1 : 0);
}

/** Read one address as text. A source that is slow, or answers with an error, counts as one that could not be read. */
async function fetchText(url) {
  const answer = await fetch(url, { signal: AbortSignal.timeout(20_000), headers: { accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml, application/json' } });
  if (!answer.ok) throw new Error(`answered ${answer.status}`);
  return await answer.text();
}

// a source that was not read is marked on the run, where it is seen without opening the log
const note = (line) => console.log(/could not be read|nothing that is a headline/.test(line) ? `::warning::${line}` : line);
const list = await publish(previous, fetchText, new Date(), env, FEED_SOURCES, note);
if (!list) {
  console.error('::error::No source could be read, so the list is left as it was.');
  process.exit(1);
}
await mkdir(dirname(path), { recursive: true });
await writeFile(path, `${JSON.stringify(list, null, 1)}\n`);
console.log(`${list.items.length} headlines written, checked ${list.checked}.`);

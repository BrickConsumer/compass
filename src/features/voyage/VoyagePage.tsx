import { ArrowLeft, Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { daysAtSea, earnedFittings, earnedIds, earnedStage, FITTINGS, milesLogged, nextFitting, nextStage, STAGE_GATES, unseenRewards } from '../../domain/voyage';
import { useCompass } from '../../state/store';
import { DraftInput } from '../../ui/DraftField';
import { carries, STAGE_ORDER, STAGES, type StageId } from './boat/specs';
import { SeaWindow } from './SeaWindow';

const HULLS: [string, string][] = [['Deep navy', '#0E243A'], ['Marine', '#1A619B'], ['Teal', '#256F75'], ['Ivory', '#F6F0E4'], ['Bottle green', '#1C6048'], ['Oxblood', '#8C2D2B']];
const SAILS: [string, string][] = [['Ivory', '#FCF8EE'], ['Flax', '#EFE0B8'], ['Tanbark', '#9A5A3C'], ['Slate', '#7E91A6'], ['Seafoam', '#BEE8D5'], ['Rose', '#F6CFC9']];
const PENNANTS: [string, string][] = [['Port', '#AB3935'], ['Brass', '#BF9A48'], ['Marine', '#1A619B'], ['Seafoam', '#2E7F62'], ['Ivory', '#FDFAF3'], ['Heather', '#8B608D']];

function Swatches({ label, options, value, onChange }: { label: string; options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[13.5px] font-medium text-text-muted">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([name, hex]) => (
          <button key={hex} type="button" aria-label={name} title={name} aria-pressed={value === hex} onClick={() => onChange(hex)}
            className="size-11 cursor-pointer rounded-full shadow-[inset_0_0_0_1px_var(--color-line-strong)] aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-focus" style={{ background: hex }} />
        ))}
      </div>
    </fieldset>
  );
}

/** The voyage: the boat at full size, what has been earned, and the colours you choose. */
export function VoyagePage() {
  const boat = useCompass((s) => s.boat), log = useCompass((s) => s.log), setBoat = useCompass((s) => s.setBoat), paused = useCompass((s) => s.settings.seaPaused), navigate = useNavigate();
  const miles = milesLogged(log), days = daysAtSea(log), earned = earnedStage(miles, days), next = nextFitting(miles), ahead = nextStage(miles, days);
  // what was new on arriving is remembered for this visit, so it can be marked as new after it has been recorded as seen
  const [fresh] = useState(() => unseenRewards(miles, days, boat.seen));
  // a boat that has just been earned is the first thing shown
  const [viewing, setViewing] = useState<StageId>(fresh.stage ?? boat.stage), isEarned = STAGE_ORDER.indexOf(viewing) <= STAGE_ORDER.indexOf(earned);
  const fittings = useMemo(() => earnedFittings(miles).map((f) => f.id), [miles]);
  const newTag = <span className="ml-2 rounded-xs bg-brass-100 px-1.5 py-0.5 text-[12.5px] font-semibold text-brass-800">New</span>;
  // everything earned so far has now been seen
  useEffect(() => { setBoat({ seen: earnedIds(miles, days) }); }, [miles, days, setBoat]);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) navigate('/'); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [navigate]);

  return (
    <main className="mx-auto flex max-w-[1560px] flex-col gap-6 px-4 pb-32 pt-3 sm:px-5 sm:pb-10 lg:pl-1.5 lg:pr-7 lg:pt-4">
      <div className="relative">
        <SeaWindow stage={viewing} progress={0.6} colours={{ hull: boat.hull, sail: boat.sail, pennant: boat.pennant }} fittings={fittings} boatName={boat.name} paused={paused} className="h-[42vh] min-h-[240px] rounded-[24px] sm:rounded-2xl" />
        <Link to="/" className="absolute left-3 top-3 flex min-h-11 items-center gap-2 rounded-full bg-surface-sheet pl-3 pr-4 text-[14.5px] font-semibold shadow-[0_1px_2px_rgb(14_36_58/0.18)]"><ArrowLeft size={17} aria-hidden="true" />Home</Link>
        {!isEarned && <p className="absolute bottom-3 left-3 rounded-full bg-brass-100 px-3.5 py-1.5 text-[13.5px] font-semibold text-brass-800">Preview. Not earned yet.</p>}
      </div>

      <div className="grid gap-x-10 gap-y-9 lg:grid-cols-[1.1fr_1fr]">
        <section aria-labelledby="boat-title" className="flex flex-col gap-5">
          <div>
            <h1 id="boat-title" className="font-display text-[32px] italic leading-[1.1] lg:text-[40px]">{boat.name}</h1>
            {/* the long-term goal in full: "Bound for" is the voyage speaking, the goal itself is the plan */}
            {boat.boundFor && <p data-bound className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-[15.5px] font-semibold leading-[1.35]"><i className="font-display text-[17.5px] font-medium text-text-muted">Bound for</i><span className="min-w-0 [overflow-wrap:anywhere]">{boat.boundFor}</span></p>}
            <p className="mt-1.5 text-[15.5px] text-text-muted">{STAGES[boat.stage].name}. {miles.toLocaleString('en-GB')} nautical miles logged, {days} days at sea.</p>
          </div>
          {fresh.stage && fresh.stage !== boat.stage && (
            <p className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md bg-brass-100 px-3.5 py-2.5 text-[14.5px] text-brass-800" data-ready>
              <span><i className="font-display text-[17px]">The {STAGES[fresh.stage].name.toLowerCase()}</i> is ready. You are still sailing the {STAGES[boat.stage].name.toLowerCase()}.</span>
              <button type="button" onClick={() => { setBoat({ stage: fresh.stage }); setViewing(fresh.stage!); }} className="min-h-11 cursor-pointer rounded-md bg-surface-inverse px-4 font-semibold text-text-inverse">Sail the {STAGES[fresh.stage].name.toLowerCase()}</button>
            </p>
          )}
          <label className="flex max-w-sm flex-col gap-1.5 text-[13.5px] font-medium text-text-muted">Name
            <DraftInput value={boat.name} maxLength={40} onSave={(name) => setBoat({ name })} className="h-11 rounded-md bg-surface-sheet px-3 text-[16px] font-normal text-text shadow-[inset_0_0_0_1.5px_var(--color-control)]" />
          </label>
          <div className="flex max-w-sm flex-col gap-1.5">
            <label htmlFor="bound-for" className="text-[13.5px] font-medium text-text-muted">Bound for</label>
            <DraftInput id="bound-for" value={boat.boundFor ?? ''} maxLength={60} onSave={(boundFor) => setBoat({ boundFor })} aria-describedby="bound-for-help" className="h-11 rounded-md bg-surface-sheet px-3 text-[16px] font-normal text-text shadow-[inset_0_0_0_1.5px_var(--color-control)]" />
            <p id="bound-for-help" className="text-[13.5px] text-text-muted">Where you are headed in the long run. It is shown under the boat's name.</p>
          </div>
          <Swatches label="Hull" options={HULLS} value={boat.hull} onChange={(hull) => setBoat({ hull })} />
          <Swatches label="Sails" options={SAILS} value={boat.sail} onChange={(sail) => setBoat({ sail })} />
          <Swatches label="Pennant" options={PENNANTS} value={boat.pennant} onChange={(pennant) => setBoat({ pennant })} />

          <fieldset>
            <legend className="mb-2 text-[13.5px] font-medium text-text-muted">Boats</legend>
            <div className="flex flex-wrap gap-2">
              {STAGE_ORDER.map((id) => {
                const got = STAGE_ORDER.indexOf(id) <= STAGE_ORDER.indexOf(earned);
                return <button key={id} type="button" aria-pressed={viewing === id} onClick={() => setViewing(id)}
                  className="min-h-11 cursor-pointer rounded-md px-4 text-[14.5px] font-semibold shadow-[inset_0_0_0_1px_var(--color-line-strong)] aria-pressed:bg-surface-inverse aria-pressed:text-text-inverse aria-pressed:shadow-none">{STAGES[id].name}{got ? '' : ' (preview)'}{id === fresh.stage && newTag}</button>;
              })}
            </div>
            <p className="mt-3 text-[14.5px] text-text-muted">
              {viewing === boat.stage ? `You are sailing the ${STAGES[viewing].name.toLowerCase()}.`
                : isEarned ? <button type="button" onClick={() => setBoat({ stage: viewing })} className="min-h-11 cursor-pointer rounded-md bg-surface-inverse px-4 font-semibold text-text-inverse">Sail the {STAGES[viewing].name.toLowerCase()}</button>
                : `The ${STAGES[viewing].name.toLowerCase()} needs ${STAGE_GATES[viewing].miles.toLocaleString('en-GB')} miles and ${STAGE_GATES[viewing].days} days at sea.`}
            </p>
          </fieldset>
        </section>

        <section aria-labelledby="fit-title">
          <h2 id="fit-title" className="text-[25px]">Fittings</h2>
          <p className="mt-1 text-[14.5px] text-text-muted">
            {next ? `${(next.miles - miles).toLocaleString('en-GB')} more miles for ${next.phrase}.` : 'Every fitting is earned.'}
            {ahead ? ` The ${STAGES[ahead.id].name.toLowerCase()} needs ${ahead.miles.toLocaleString('en-GB')} more miles${ahead.days ? ` and ${ahead.days} more days at sea` : ''}.` : ''} Nothing earned is ever lost.
          </p>
          <ul className="mt-3">
            {FITTINGS.map((f) => {
              const got = miles >= f.miles;
              return (
                <li key={f.id} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 border-t border-line py-2.5 text-[15px] first:border-t-0">
                  <span aria-hidden="true" className={`grid size-[22px] place-items-center rounded-full ${got ? 'bg-positive text-paper-0' : 'shadow-[inset_0_0_0_1.5px_var(--color-control)]'}`}>{got && <Check size={13} strokeWidth={3.2} />}</span>
                  <span className={got ? 'font-medium' : 'text-text-muted'}>{f.name}<span className="sr-only">{got ? ', earned' : ', not earned yet'}</span>{fresh.fittings.some((x) => x.id === f.id) && newTag}{got && f.id === 'dress-flags' ? <span className="text-[13px] font-normal text-text-muted" data-in-port> (flown in port, on a day with nothing planned)</span> : null}{got && !carries(STAGES[viewing], f.id) ? <span className="text-[13px] font-normal text-text-muted" data-not-carried> (the {STAGES[viewing].name.toLowerCase()} has no place for it)</span> : null}</span>
                  <span className="text-[13.5px] font-semibold text-brass-700">{f.miles.toLocaleString('en-GB')}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}

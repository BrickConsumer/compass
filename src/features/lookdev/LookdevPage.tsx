import { useState } from 'react';
import { type BoatColours, DEFAULT_COLOURS, STAGES, STAGE_ORDER, type StageId } from '../voyage/boat/specs';
import { SeaWindow } from '../voyage/SeaWindow';

const HULLS: [string, string][] = [['Deep navy', '#0E243A'], ['Marine', '#1A619B'], ['Teal', '#256F75'], ['Ivory', '#F6F0E4'], ['Bottle green', '#1C6048'], ['Oxblood', '#8C2D2B']];
const SAILS: [string, string][] = [['Ivory', '#FCF8EE'], ['Flax', '#EFE0B8'], ['Tanbark', '#9A5A3C'], ['Slate', '#7E91A6'], ['Seafoam', '#BEE8D5'], ['Rose', '#F6CFC9']];
const PENNANTS: [string, string][] = [['Port', '#AB3935'], ['Brass', '#BF9A48'], ['Marine', '#1A619B'], ['Seafoam', '#2E7F62'], ['Ivory', '#FDFAF3'], ['Heather', '#8B608D']];

function Swatches({ label, options, value, onChange }: { label: string; options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[13.5px] font-medium text-text-muted">{label}</legend>
      <div className="flex gap-2">
        {options.map(([name, hex]) => (
          <button
            key={hex}
            type="button"
            aria-label={name}
            aria-pressed={value === hex}
            title={name}
            onClick={() => onChange(hex)}
            className="size-9 cursor-pointer rounded-full shadow-[inset_0_0_0_1px_var(--color-line-strong)] aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-focus"
            style={{ background: hex }}
          />
        ))}
      </div>
    </fieldset>
  );
}

/** Review page for the boat and sea on their own, before Home is built around them. */
export function LookdevPage() {
  const [stage, setStage] = useState<StageId>('sloop');
  const [done, setDone] = useState(3);
  const [planned, setPlanned] = useState(true);
  const [paused, setPaused] = useState(false);
  const [missed, setMissed] = useState(false);
  const [use3d, setUse3d] = useState(true);
  const [colours, setColours] = useState<BoatColours>(DEFAULT_COLOURS);
  const progress = planned ? done / 5 : null;
  const windowProps = { stage, progress, colours, paused, boatName: 'The Kestrel', still: !use3d, missedYesterday: missed };

  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-8 px-4 py-8 sm:px-7">
      <header className="flex flex-col gap-2">
        <h1 className="text-[32px] leading-[1.1] tracking-[-0.012em] sm:text-[40px]">Boat look review</h1>
        <p className="max-w-[62ch] text-text-muted">
          The boat and the sea on their own, at the two sizes the Home window will use. Change the stage, the day and the colours.
        </p>
      </header>

      <section className="flex flex-col gap-3" aria-label="Desktop window">
        <h2 className="text-[20px]">Desktop window, 276 high</h2>
        <SeaWindow {...windowProps} className="h-[276px] rounded-2xl" />
      </section>

      <section className="grid gap-8 md:grid-cols-[358px_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <h2 className="text-[20px]">Phone window, 184 high</h2>
          <SeaWindow {...windowProps} className="h-[184px] w-full max-w-[358px] rounded-[24px]" />
        </div>

        <div className="flex flex-col gap-6 rounded-xl bg-surface-sheet p-6 shadow-sheet ring-1 ring-line">
          <fieldset>
            <legend className="mb-2 text-[13.5px] font-medium text-text-muted">Stage</legend>
            <div className="flex flex-wrap gap-2">
              {STAGE_ORDER.map((id) => (
                <button key={id} type="button" aria-pressed={stage === id} onClick={() => setStage(id)}
                  className="h-10 cursor-pointer rounded-md px-4 text-[14.5px] font-semibold shadow-[inset_0_0_0_1px_var(--color-line-strong)] aria-pressed:bg-surface-inverse aria-pressed:text-text-inverse aria-pressed:shadow-none">
                  {STAGES[id].name}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <label htmlFor="done" className="text-[13.5px] font-medium text-text-muted">
              Tasks done today: {planned ? `${done} of 5` : 'nothing planned'}
            </label>
            <input id="done" type="range" min={0} max={5} step={1} value={done} disabled={!planned}
              onChange={(e) => setDone(Number(e.target.value))} className="accent-[var(--color-deep-900)]" />
            <label className="flex items-center gap-2 text-[14.5px]">
              <input type="checkbox" checked={!planned} onChange={(e) => setPlanned(!e.target.checked)} /> Nothing planned (in port)
            </label>
            <label className="flex items-center gap-2 text-[14.5px]">
              <input type="checkbox" checked={missed} onChange={(e) => setMissed(e.target.checked)} /> Yesterday was missed (storm)
            </label>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[14.5px]">
            <label className="flex items-center gap-2"><input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} /> Pause the sea</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!use3d} onChange={(e) => setUse3d(!e.target.checked)} /> Still image only</label>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-5">
            <Swatches label="Hull" options={HULLS} value={colours.hull} onChange={(hull) => setColours({ ...colours, hull })} />
            <Swatches label="Sails" options={SAILS} value={colours.sail} onChange={(sail) => setColours({ ...colours, sail })} />
            <Swatches label="Pennant" options={PENNANTS} value={colours.pennant} onChange={(pennant) => setColours({ ...colours, pennant })} />
          </div>
        </div>
      </section>
    </main>
  );
}

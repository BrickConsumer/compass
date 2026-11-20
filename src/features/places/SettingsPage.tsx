import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { THEMES } from '../../domain/theme';
import { daysAtSea, milesLogged } from '../../domain/voyage';
import { storageAvailable, useCompass } from '../../state/store';
import { DraftInput } from '../../ui/DraftField';
import { chip } from '../../ui/EditorFrame';
import { toast } from '../../ui/Toast';
import { AreasSettings } from './AreasSettings';
import { BackupSettings } from './BackupSettings';
import { LinksSettings } from './LinksSettings';

const row = 'flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line py-3.5 first:border-t-0';
const button = 'min-h-11 cursor-pointer rounded-md px-4 text-[14.5px] font-semibold shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well';

/** A small, real settings page: the week, the sea, and the sample data. */
export function SettingsPage() {
  const s = useCompass(), [confirming, setConfirming] = useState(false);
  // The question takes the place of the button that asked it. The keyboard goes to the safe answer, and comes back
  // to the button after either one, so it never falls to the page.
  const clear = useRef<HTMLButtonElement>(null), asked = useRef(false);
  useEffect(() => { if (confirming) asked.current = true; else if (asked.current) { asked.current = false; clear.current?.focus(); } }, [confirming]);
  const [miles, setMiles] = useState(() => milesLogged(s.log)), [days, setDays] = useState(() => daysAtSea(s.log));
  // "Add a link" elsewhere comes here as /settings#links: show that part, ready to type a new link's name
  const { hash } = useLocation();
  useEffect(() => { if (hash === '#links') { document.getElementById('links')?.scrollIntoView(); document.getElementById('new-link-name')?.focus(); } }, [hash]);
  // the two backup commands in search come here, each with the keyboard on its own button
  useEffect(() => { if (hash === '#data' || hash === '#restore') { document.getElementById('data')?.scrollIntoView(); document.getElementById(hash === '#restore' ? 'restore-backup' : 'download-backup')?.focus(); } }, [hash]);
  // the prototype tool's two boxes show the voyage as it is, so they follow a restore and its Undo
  const voyageNow = () => { const { log } = useCompass.getState(); setMiles(milesLogged(log)); setDays(daysAtSea(log)); };
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-9 px-5 pb-32 pt-10 sm:pb-12 lg:pt-16">
      <h1 className="text-[32px] leading-[1.1] tracking-[-0.012em] lg:text-[40px]">Settings</h1>

      <section aria-labelledby="set-you">
        <h2 id="set-you" className="text-[20px]">You</h2>
        <div className="mt-2">
          <div className={row}>
            <label htmlFor="your-name" className="text-[15.5px]">Your name</label>
            <DraftInput id="your-name" value={s.settings.name ?? ''} maxLength={30} onSave={(name) => s.setSettings({ name })} autoComplete="given-name" aria-describedby="your-name-help"
              className="h-11 w-56 max-w-full rounded-md bg-surface-sheet px-3 text-[16px] shadow-[inset_0_0_0_1.5px_var(--color-control)]" />
          </div>
          <p id="your-name-help" className="max-w-[56ch] text-[14.5px] text-text-muted">Home greets you by it. Leave it empty for no greeting.</p>
        </div>
      </section>

      <section aria-labelledby="set-week">
        <h2 id="set-week" className="text-[20px]">Calendar</h2>
        <div className="mt-2">
          <div className={row}>
            <label htmlFor="week-start" className="text-[15.5px]">The week starts on</label>
            <select id="week-start" value={s.settings.weekStartsOn} onChange={(e) => s.setSettings({ weekStartsOn: Number(e.target.value) === 0 ? 0 : 1 })}
              className="h-11 rounded-md bg-surface-sheet px-3 text-[16px] shadow-[inset_0_0_0_1.5px_var(--color-control)]">
              <option value={1}>Monday</option><option value={0}>Sunday</option>
            </select>
          </div>
        </div>
      </section>

      <section aria-labelledby="set-look">
        <h2 id="set-look" className="text-[20px]">Appearance</h2>
        <div className="mt-2">
          <div className={row}>
            <span id="theme-label" className="text-[15.5px]">Theme</span>
            <div role="group" aria-labelledby="theme-label" className="flex flex-wrap gap-2">
              {THEMES.map((t) => <button key={t.id} type="button" aria-pressed={(s.settings.theme ?? 'auto') === t.id} onClick={() => s.setSettings({ theme: t.id })} className={chip((s.settings.theme ?? 'auto') === t.id)}>{t.label}</button>)}
            </div>
          </div>
          <p className="max-w-[56ch] text-[14.5px] text-text-muted">Automatic follows your device. The sea is at night in the dark theme.</p>
        </div>
      </section>

      <section aria-labelledby="set-fitness">
        <h2 id="set-fitness" className="text-[20px]">Fitness</h2>
        <div className="mt-2">
          <label className={`${row} cursor-pointer`}><span className="text-[15.5px]">Show Fitness<span className="block max-w-[46ch] text-[13.5px] text-text-muted">A place for your training week, what you did and anything you choose to measure. Switching it off hides it and keeps what is in it.</span></span>
            <input type="checkbox" className="tick-native size-5 accent-[var(--color-text)]" checked={s.settings.fitness === true} onChange={(e) => s.setSettings({ fitness: e.target.checked })} /></label>
        </div>
      </section>

      <section aria-labelledby="set-sea">
        <h2 id="set-sea" className="text-[20px]">The sea</h2>
        <div className="mt-2">
          <label className={`${row} cursor-pointer`}><span className="text-[15.5px]">Pause the sea's motion<span className="block text-[13.5px] text-text-muted">Holds a still picture. Your device's reduced-motion setting does the same.</span></span>
            <input type="checkbox" className="tick-native size-5 accent-[var(--color-text)]" checked={s.settings.seaPaused} onChange={(e) => s.setSettings({ seaPaused: e.target.checked })} /></label>
          <label className={`${row} cursor-pointer`}><span className="text-[15.5px]">Fold the sea window down<span className="block text-[13.5px] text-text-muted">Leaves a thin strip, to give the planner more room.</span></span>
            <input type="checkbox" className="tick-native size-5 accent-[var(--color-text)]" checked={s.settings.seaFolded} onChange={(e) => s.setSettings({ seaFolded: e.target.checked })} /></label>
        </div>
      </section>

      <section aria-labelledby="set-review">
        <h2 id="set-review" className="text-[20px]">Weekly review</h2>
        <AreasSettings />
      </section>

      <section aria-labelledby="set-links" id="links" className="scroll-mt-6">
        <h2 id="set-links" className="text-[20px]">Links</h2>
        <LinksSettings />
      </section>

      <section aria-labelledby="set-data" id="data" className="scroll-mt-6">
        <h2 id="set-data" className="text-[20px]">Your data</h2>
        <p className="mt-2 max-w-[56ch] text-[14.5px] text-text-muted">
          Everything is kept on this device and nowhere else. {s.sample ? 'You are looking at sample data.' : ''} {storageAvailable ? '' : 'This browser is not letting Compass save, so changes will be lost when you close the page.'}
        </p>
        <BackupSettings onReplaced={voyageNow} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={button} onClick={() => { s.resetSample(); setMiles(412); setDays(23); toast('Sample data restored.'); }}>Reset the sample data</button>
          {confirming
            ? <><button type="button" className="min-h-11 cursor-pointer rounded-md bg-attention px-4 text-[14.5px] font-semibold text-on-attention" onClick={() => { s.clearAll(); setConfirming(false); setMiles(0); setDays(0); toast('Everything cleared.'); }}>Yes, clear everything</button>
                <button type="button" autoFocus className={button} onClick={() => setConfirming(false)}>Keep it</button></>
            : <button type="button" ref={clear} className={`${button} text-attention`} onClick={() => setConfirming(true)}>Clear everything</button>}
        </div>
      </section>

      <section aria-labelledby="set-proto" className="rounded-xl bg-note p-5 text-on-note">
        <h2 id="set-proto" className="text-[20px]">Prototype tool</h2>
        <p className="mt-1 max-w-[56ch] text-[14.5px]">Set the voyage to any distance, to see fittings and boats arrive without logging weeks of tasks. This replaces the voyage log. It will not be in the finished app.</p>
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); s.setSampleVoyage(miles, days); toast(`Voyage set to ${miles.toLocaleString('en-GB')} miles and ${days} days at sea.`); }}>
          <label className="flex flex-col gap-1 text-[13.5px] font-medium">Nautical miles
            <input type="number" min={0} max={9999} value={miles} onChange={(e) => setMiles(Math.max(0, Math.min(9999, Number(e.target.value) || 0)))} className="h-11 w-32 rounded-md bg-surface-sheet px-3 text-[16px] text-text shadow-[inset_0_0_0_1.5px_var(--color-control)]" /></label>
          <label className="flex flex-col gap-1 text-[13.5px] font-medium">Days at sea
            <input type="number" min={0} max={999} value={days} onChange={(e) => setDays(Math.max(0, Math.min(999, Number(e.target.value) || 0)))} className="h-11 w-28 rounded-md bg-surface-sheet px-3 text-[16px] text-text shadow-[inset_0_0_0_1.5px_var(--color-control)]" /></label>
          <button type="submit" className="min-h-11 cursor-pointer rounded-md bg-surface-inverse px-4 text-[14.5px] font-semibold text-text-inverse">Set the voyage</button>
        </form>
      </section>
    </main>
  );
}

import { ChevronDown, ChevronUp, Maximize2, Pause, Play } from 'lucide-react';
import { Link } from 'react-router';
import { daysAtSea, milesLogged, nextFitting } from '../../domain/voyage';
import { useCompass } from '../../state/store';
import { SeaWindow } from '../voyage/SeaWindow';

const round = 'grid size-11 cursor-pointer place-items-center rounded-full bg-surface-sheet text-text shadow-[0_1px_2px_rgb(14_36_58/0.18)] hover:bg-paper-50 sm:size-9';

/** The sea window on Home: the scene for the selected day, the voyage plate, and controls to pause, fold and open it. */
export function HomeWindow({ progress, missedYesterday }: { progress: number | null; missedYesterday: boolean }) {
  const boat = useCompass((s) => s.boat), log = useCompass((s) => s.log), settings = useCompass((s) => s.settings), set = useCompass((s) => s.setSettings);
  const miles = milesLogged(log), days = daysAtSea(log), next = nextFitting(miles), folded = settings.seaFolded;
  const colours = { hull: boat.hull, sail: boat.sail, pennant: boat.pennant };
  const span = next ? Math.max(1, next.miles - (next.miles > 350 ? 350 : 0)) : 1, got = next ? Math.max(0, miles - (next.miles > 350 ? 350 : 0)) : 1;
  return (
    <div>
      <div className="relative">
        <SeaWindow stage={boat.stage} progress={progress} colours={colours} boatName={boat.name} missedYesterday={missedYesterday} paused={settings.seaPaused} still={folded}
          className={`rounded-[24px] transition-[height] duration-[320ms] ease-[var(--ease-in-out)] motion-reduce:transition-none sm:rounded-2xl ${folded ? 'h-16' : 'h-[184px] sm:h-[220px] lg:h-[240px] min-[1440px]:h-[276px]'}`} />
        {!folded && (
          <Link to="/voyage" className="absolute bottom-4 left-4 hidden min-w-[262px] flex-col gap-1 rounded-md bg-surface-sheet px-4 pb-3 pt-2.5 shadow-float outline-offset-2 hover:bg-paper-50 lg:flex" aria-label={`Open the voyage. ${boat.name}, ${miles.toLocaleString('en-GB')} nautical miles logged, ${days} days at sea.`}>
            <span className="font-display text-[20px] italic leading-[1.15]">{boat.name}</span>
            <span className="flex justify-between gap-4 text-[13px] font-medium text-text-muted"><span>{miles.toLocaleString('en-GB')} nautical miles logged</span><span>{days} days at sea</span></span>
            {next && <>
              <span aria-hidden="true" className="mt-1 block h-1 overflow-hidden rounded-full bg-track"><span className="block h-full rounded-full bg-brass-700" style={{ width: `${Math.min(100, (got / span) * 100)}%` }} /></span>
              <span className="text-[13px] font-medium text-text-muted">{(next.miles - miles).toLocaleString('en-GB')} more for {next.name.toLowerCase().replace(/^a /, 'a ')}</span>
            </>}
          </Link>
        )}
        <div className="absolute right-3 top-3 flex gap-2 sm:right-3.5 sm:top-3.5">
          {!folded && <button type="button" className={round} onClick={() => set({ seaPaused: !settings.seaPaused })} aria-pressed={settings.seaPaused} aria-label={settings.seaPaused ? 'Resume the sea' : 'Pause the sea'} title={settings.seaPaused ? 'Resume the sea' : 'Pause the sea'}>{settings.seaPaused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}</button>}
          <button type="button" className={`${round} max-sm:hidden`} onClick={() => set({ seaFolded: !folded })} aria-expanded={!folded} aria-label={folded ? 'Show the sea' : 'Hide the sea'} title={folded ? 'Show the sea' : 'Hide the sea'}>{folded ? <ChevronDown size={17} aria-hidden="true" /> : <ChevronUp size={17} aria-hidden="true" />}</button>
          {!folded && <Link to="/voyage" className={`${round} max-sm:hidden`} aria-label="Open the voyage" title="Open the voyage (V)"><Maximize2 size={15} aria-hidden="true" /></Link>}
        </div>
      </div>
      <Link to="/voyage" className="mt-1 flex min-h-11 items-baseline justify-between gap-3 rounded-[9px] px-1.5 pt-2 text-[13px] font-medium text-text-muted lg:hidden">
        <span className="font-display text-[17px] italic text-text">{boat.name}</span><span>{miles.toLocaleString('en-GB')} nautical miles logged</span>
      </Link>
    </div>
  );
}

import { BookOpen, CalendarCheck, Dumbbell, FileText, House, type LucideIcon, Repeat, Search, SlidersHorizontal, X } from 'lucide-react';
import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { countByKind, type Found, type FoundKind, searchAll, shownResults } from '../domain/search';
import { RailLinks } from '../features/links/Links';
import { useCompass } from '../state/store';
import { useToday } from '../state/useToday';
import { CompassMark } from '../ui/CompassMark';
import { chip } from '../ui/EditorFrame';
import { ToastRegion } from '../ui/Toast';

const PLACES: { to: string; label: string; short: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Home', short: 'Home', icon: House },
  { to: '/study', label: 'Study', short: 'Study', icon: BookOpen },
  { to: '/habits', label: 'Habits', short: 'Habits', icon: Repeat },
  { to: '/review', label: 'Weekly review', short: 'Review', icon: CalendarCheck },
  { to: '/pages', label: 'My pages', short: 'Pages', icon: FileText },
];
/** The sixth place, listed only while Fitness is switched on. */
const FITNESS: (typeof PLACES)[number] = { to: '/fitness', label: 'Fitness', short: 'Fitness', icon: Dumbbell };
const usePlaces = () => { const fitness = useCompass((s) => s.settings.fitness === true); return fitness ? [...PLACES, FITNESS] : PLACES; };

const typing = (e: KeyboardEvent) => { const t = e.target as HTMLElement | null; return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };

/**
 * Jump to a place, run a command, or find anything Compass keeps. Opens with Cmd or Ctrl and K.
 * Commands are found from the first letter. Everything else is searched from the second: tasks, what Study keeps,
 * pages, headlines, habits, reviews, links, and what Fitness keeps while it is switched on. Once anything is found,
 * a row of kinds narrows it.
 */
function CommandMenu({ open, onClose, onShortcuts }: { open: boolean; onClose: () => void; onShortcuts: () => void }) {
  const ref = useRef<HTMLDialogElement>(null), box = useRef<HTMLInputElement>(null), rows = useRef<HTMLUListElement>(null);
  const navigate = useNavigate(), [query, setQuery] = useState(''), [kind, setKind] = useState<FoundKind | null>(null), setSettings = useCompass((s) => s.setSettings), places = usePlaces();
  // The search is emptied when the menu closes, not when it opens. Emptied on opening, the box showed the last search for
  // an instant, and a key pressed in that instant was added to it.
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); else if (!open) { if (d.open) d.close(); setQuery(''); setKind(null); } }, [open]);
  type Command = { label: string; hint?: string; run: () => void };
  const commands: Command[] = [
    ...places.map((p) => ({ label: `Go to ${p.label}`, run: () => navigate(p.to) })),
    // while Fitness is off this is the one thing search knows of it, so someone looking for it finds the switch
    ...(places.includes(FITNESS) ? [] : [{ label: 'Switch on Fitness', run: () => { setSettings({ fitness: true }); navigate('/fitness'); } }]),
    { label: 'Go to today', hint: 'T', run: () => navigate('/') },
    { label: 'Add a task', hint: 'N', run: () => { navigate('/'); window.setTimeout(() => document.getElementById('composer-day')?.focus(), 60); } },
    { label: 'Open the voyage', hint: 'V', run: () => navigate('/voyage') },
    { label: 'Go to Settings', run: () => navigate('/settings') },
    { label: 'Add a link', run: () => navigate('/settings#links') },
    { label: 'Save a headline', run: () => navigate('/pages/headlines', { state: { add: true } }) },
    // both go to where backups are, with the keyboard on the button: Enter in a search should not save a file by surprise
    { label: 'Download a backup', run: () => navigate('/settings#data') },
    { label: 'Restore from a backup', run: () => navigate('/settings#restore') },
    { label: 'Keyboard shortcuts', hint: '?', run: onShortcuts },
    { label: 'Use the dark theme', run: () => setSettings({ theme: 'dark' }) },
    { label: 'Use the light theme', run: () => setSettings({ theme: 'light' }) },
    { label: 'Follow the device for the theme', run: () => setSettings({ theme: 'auto' }) },
  ];
  // What is kept is read when the words change, and not watched: nothing can change behind an open menu, and the
  // menu is in the page all the time, so watching would search on every change made anywhere.
  const all = useMemo(() => (open ? searchAll(useCompass.getState(), query) : []), [open, query]);
  // a kind that the words now find nothing of gives way to everything
  const counts = countByKind(all), chosen = counts.some((k) => k.id === kind) ? kind : null, { shown: results, more } = shownResults(all, chosen);
  // one kind shows only that kind, so the commands step aside
  const matching = chosen ? [] : commands.filter((c) => c.label.toLowerCase().includes(query.trim().toLowerCase()));
  const choose = (run: () => void) => { onClose(); run(); };
  // a headline or a link opens its site, in a new tab that cannot reach back into Compass; anything else opens where it is kept
  const go = (f: Found) => {
    if ('url' in f.to) { if (/^https?:\/\//i.test(f.to.url)) window.open(f.to.url, '_blank', 'noopener,noreferrer'); }
    else navigate(f.to.path, f.to.state ? { state: f.to.state } : undefined);
  };
  const first = matching[0] ? matching[0].run : results[0] ? () => go(results[0]!) : null;
  // The arrows move through the commands and what was found, and back up into the box. A letter typed while one of
  // them, or one of the kinds, has the keyboard goes to the box, so a search can be carried on without reaching for it.
  const onKeys = (e: ReactKeyboardEvent<HTMLFormElement>) => {
    const list = [...(rows.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])], at = list.indexOf(document.activeElement as HTMLButtonElement);
    const onButton = document.activeElement instanceof HTMLButtonElement && e.currentTarget.contains(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (list[at + 1] ?? list[at])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (at > 0) list[at - 1]!.focus(); else box.current?.focus(); }
    else if (onButton && !e.metaKey && !e.ctrlKey && !e.altKey && (e.key === 'Backspace' || (e.key.length === 1 && e.key !== ' '))) box.current?.focus();
  };
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} aria-label="Search and commands"
      className="m-auto mt-[12vh] w-[min(92vw,520px)] rounded-xl bg-surface-sheet p-0 text-text shadow-float backdrop:bg-backdrop max-sm:mt-[6vh]">
      <form method="dialog" onKeyDown={onKeys} onSubmit={(e) => { e.preventDefault(); if (first) choose(first); }}>
        <label className="flex items-center gap-3 border-b border-line px-4">
          <Search size={18} className="shrink-0 text-text-muted" aria-hidden="true" />
          <span className="sr-only">Search or jump to</span>
          <input ref={box} autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search or jump to" className="h-13 w-full min-w-0 bg-transparent text-[16px] outline-none placeholder:text-text-subtle" />
        </label>
        {counts.length > 0 && (
          <div role="group" aria-label="Show" className="flex flex-wrap gap-2 border-b border-line px-3 py-2.5">
            <button type="button" aria-pressed={!chosen} onClick={() => setKind(null)} className={chip(!chosen)}>All <span className="tabular-nums opacity-75">{all.length}</span></button>
            {counts.map((k) => <button key={k.id} type="button" aria-pressed={chosen === k.id} onClick={() => setKind(k.id)} className={chip(chosen === k.id)}>{k.label} <span className="tabular-nums opacity-75">{k.count}</span></button>)}
          </div>
        )}
        <ul ref={rows} className="max-h-[50vh] overflow-auto p-2">
          {matching.map((c, i) => (
            <li key={`${i} ${c.label}`}>
              <button type="button" onClick={() => choose(c.run)} className="flex min-h-11 w-full cursor-pointer items-center justify-between rounded-md px-3 text-left text-[15px] hover:bg-surface-well">
                <span className="min-w-0 truncate">{c.label}</span>{c.hint && <kbd className="rounded-xs border border-line-strong bg-surface-sheet px-1.5 text-[12.5px] font-semibold text-text-muted">{c.hint}</kbd>}
              </button>
            </li>
          ))}
          {results.map((f) => (
            <li key={f.key}>
              {/* one button: its name, any words found in its writing, then what it is and where it is kept */}
              <button type="button" data-found={f.key} onClick={() => choose(() => go(f))} className="grid min-h-11 w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-md px-3 py-1.5 text-left hover:bg-surface-well">
                <span className="min-w-0">
                  <span data-found-title className="block truncate text-[15px]">{f.title}</span>
                  {f.excerpt && <span className="block truncate text-[13px] text-text-muted">{f.excerpt}</span>}
                </span>
                <span className="max-w-[11rem] truncate text-[13px] text-text-muted sm:max-w-[14rem]">{f.type}{f.where ? ` · ${f.where}` : ''}</span>
              </button>
            </li>
          ))}
          {more > 0 && <li className="px-3 py-2 text-[13.5px] text-text-muted">{chosen ? `${more} more are not shown. Type more of its name to find one.` : `${more} more. Choose a kind to see more of it.`}</li>}
          {matching.length === 0 && results.length === 0 && <li className="px-3 py-3 text-[14.5px] text-text-muted [overflow-wrap:anywhere]">Nothing matches "{query}".</li>}
        </ul>
      </form>
    </dialog>
  );
}

const KEY = 'rounded-xs border border-line-strong bg-surface-sheet px-1.5 py-0.5 text-[12.5px] font-semibold text-text-muted';
const SHORTCUTS: { title: string; keys: [string[], string][] }[] = [
  { title: 'Anywhere', keys: [[['⌘ K', 'Ctrl K'], 'Search and commands'], [['N'], 'New task on the selected day'], [['T'], 'Go to today'], [['V'], 'Open the voyage'], [['?'], 'Show this list'], [['Esc'], 'Close what is open']] },
  { title: 'In the week', keys: [[['←', '→'], 'Previous and next day'], [['Home', 'End'], 'First and last day of the week'], [['Page Up', 'Page Down'], 'Previous and next week']] },
  { title: 'On a task', keys: [[['Space'], 'Complete or reopen'], [['Enter'], 'Edit'], [['P'], 'Change priority'], [['Delete'], 'Delete, with Undo']] },
];

/** Every keyboard shortcut, shown when ? is pressed. */
function Shortcuts({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); else if (!open && d.open) d.close(); }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} aria-labelledby="shortcuts-title"
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(92vw,460px)] overflow-y-auto rounded-xl bg-surface-sheet p-0 text-text shadow-float backdrop:bg-backdrop">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 id="shortcuts-title" className="text-[20px]">Keyboard shortcuts</h2>
          <button type="button" autoFocus onClick={onClose} aria-label="Close" className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-surface-well"><X size={18} aria-hidden="true" /></button>
        </div>
        {SHORTCUTS.map((group) => (
          <section key={group.title} aria-label={group.title}>
            <h3 className="font-sans text-[13.5px] font-semibold text-text-muted">{group.title}</h3>
            <dl className="mt-1">
              {group.keys.map(([keys, what]) => (
                <div key={what} className="flex min-h-10 items-center justify-between gap-4 border-t border-line text-[14.5px] first:border-t-0">
                  <dt>{what}</dt>
                  <dd className="flex shrink-0 items-center gap-1.5">{keys.map((k, i) => <span key={k} className="flex items-center gap-1.5">{i > 0 && <span className="text-[12.5px] text-text-muted">or</span>}<kbd className={KEY}>{k}</kbd></span>)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </dialog>
  );
}

/** The frame around every page: a rail on wider screens, a bar of five or six places on phones, toasts, and the command menu. */
export function AppShell() {
  const [menu, setMenu] = useState(false), [shortcuts, setShortcuts] = useState(false), navigate = useNavigate(), places = usePlaces();
  // study sessions become tasks when their week arrives: on opening the app, and when the day or the first day of the week changes
  const today = useToday(), makeSessionTasks = useCompass((s) => s.makeSessionTasks), startsOn = useCompass((s) => s.settings.weekStartsOn);
  useEffect(() => { makeSessionTasks(today); }, [today, startsOn, makeSessionTasks]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setMenu((m) => !m); return; }
      // single keys are for when nothing is being typed and nothing is open on top
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('dialog[open]')) return;
      if (e.key === '?') { e.preventDefault(); setShortcuts(true); }
      else if (e.key.toLowerCase() === 'v') navigate('/voyage');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);
  const link = ({ isActive }: { isActive: boolean }) =>
    `press flex h-11 items-center gap-3 rounded-md px-2.5 text-[14.5px] font-medium outline-offset-0 max-lg:justify-center ${isActive ? 'bg-surface-sheet font-semibold text-text shadow-sheet ring-1 ring-line' : 'text-text-muted hover:bg-surface-well'}`;

  return (
    <div className="min-h-dvh sm:pl-[72px] lg:pl-[200px] min-[1440px]:pl-[216px]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface-sheet focus:px-3 focus:py-2">Skip to content</a>
      <nav aria-label="Main" className="fixed inset-y-0 left-0 z-20 hidden w-[72px] flex-col gap-7 px-3 pb-5 pt-6 sm:flex lg:w-[200px] lg:pl-4 min-[1440px]:w-[216px]">
        <NavLink to="/" className="flex items-center gap-2.5 rounded-md px-2 font-display text-[22px] font-medium max-lg:justify-center" aria-label="Compass, home">
          <CompassMark size={30} /><span className="max-lg:hidden">Compass</span>
        </NavLink>
        {/* the places and the links scroll between the name and the foot of the rail when the window is too short for them,
            so Search and Settings stay in sight. The small margins leave room for the rings and outlines of what is inside. */}
        <div className="-mx-1.5 -my-1 flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-1.5 py-1">
          <ul className="flex flex-col gap-1">
            {places.map((p) => (
              <li key={p.to}><NavLink to={p.to} end={p.to === '/'} className={link} title={p.label}><p.icon size={18} strokeWidth={1.75} aria-hidden="true" /><span className="max-lg:sr-only">{p.label}</span></NavLink></li>
            ))}
          </ul>
          <RailLinks />
        </div>
        <div className="flex flex-col gap-1">
          <button type="button" onClick={() => setMenu(true)} title="Search (Cmd or Ctrl and K)"
            className="flex h-11 cursor-pointer items-center gap-2.5 rounded-md bg-surface-well px-2.5 text-[13.5px] text-text-muted max-lg:justify-center">
            <Search size={16} aria-hidden="true" /><span className="max-lg:sr-only">Search</span>
            <kbd className="ml-auto rounded-xs border border-line-strong bg-surface-sheet px-1.5 text-[12.5px] font-semibold max-lg:hidden">⌘K</kbd>
          </button>
          <NavLink to="/settings" className={link} title="Settings"><SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden="true" /><span className="max-lg:sr-only">Settings</span></NavLink>
        </div>
      </nav>

      <div id="main" tabIndex={-1} className="outline-none"><Outlet context={{ openMenu: () => setMenu(true) }} /></div>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface-sheet pb-[env(safe-area-inset-bottom,0px)] sm:hidden">
        <ul className={places.length === 6 ? 'grid grid-cols-6' : 'grid grid-cols-5'}>
          {places.map((p) => (
            <li key={p.to}>
              <NavLink to={p.to} end={p.to === '/'} className={({ isActive }) => `flex h-[58px] flex-col items-center justify-center gap-0.5 text-[12.5px] font-semibold outline-offset-[-3px] ${isActive ? 'text-text' : 'text-text-subtle'}`}>
                <p.icon size={22} strokeWidth={1.8} aria-hidden="true" />{p.short}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <ToastRegion />
      <CommandMenu open={menu} onClose={() => setMenu(false)} onShortcuts={() => setShortcuts(true)} />
      <Shortcuts open={shortcuts} onClose={() => setShortcuts(false)} />
    </div>
  );
}

export interface ShellContext { openMenu: () => void }

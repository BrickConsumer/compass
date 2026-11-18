import { Link } from 'react-router';

interface Place { title: string; lead: string; will: string[]; examples?: { label: string; items: string[] } }

const PLACES: Record<'pages', Place> = {
  pages: {
    title: 'My pages', lead: 'Your own space for everything that is not a task.',
    will: ['Personal notes', 'Checklists', 'Goals', 'Reading and project pages'],
  },
};

/** A destination that is not built yet. It says what will live here and offers nothing that does not work. */
export function PlacePage({ place }: { place: keyof typeof PLACES }) {
  const p = PLACES[place];
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-6 px-5 pb-32 pt-10 sm:pb-12 lg:pt-16">
      <p className="w-fit rounded-full bg-brass-100 px-3 py-1 text-[13px] font-semibold text-brass-800">Not built yet</p>
      <h1 className="text-[32px] leading-[1.1] tracking-[-0.012em] lg:text-[40px]">{p.title}</h1>
      <p className="max-w-[52ch] text-[17px] text-text-muted">{p.lead}</p>
      <section aria-labelledby="will">
        <h2 id="will" className="text-[20px]">What will live here</h2>
        <ul className="mt-2">{p.will.map((w) => <li key={w} className="border-t border-line py-2.5 text-[15.5px] first:border-t-0">{w}</li>)}</ul>
      </section>
      {p.examples && (
        <section aria-labelledby="examples">
          <h2 id="examples" className="text-[20px]">{p.examples.label}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">{p.examples.items.map((x) => <li key={x} className="rounded-full bg-surface-well px-3.5 py-1.5 text-[14.5px]">{x}</li>)}</ul>
        </section>
      )}
      <p className="text-[15px] text-text-muted">This milestone is the Home screen and the boat. <Link to="/" className="font-semibold text-text-link underline underline-offset-4">Back to Home</Link></p>
    </main>
  );
}

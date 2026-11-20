import { describe, expect, it } from 'vitest';
import { shownHeadlines } from './fetched';
import { cleanHeadline, FORM_SETS, FORMS, formOf, interestPages, startersIn, storedFields, storedHeadlines, storedInterests } from './interests';
import { newPage, pageLine, pagesAsText } from './pages';
import type { Headline, Interest, ISODate, Page } from './types';

const NOW = '2026-11-19T09:00:00.000Z';
const INVESTING: Interest = { id: 'in-1', name: 'Investing', forms: 'investing' }, LAW: Interest = { id: 'in-2', name: 'Law', forms: 'law' }, OWN: Interest = { id: 'in-3', name: 'Chess', forms: 'none' };
const page = (over: Partial<Page> = {}): Page => ({ id: 'p1', title: 'Untitled', kind: 'note', items: [], text: '', createdAt: NOW, updatedAt: NOW, ...over });
const headline = (id: string, date: string, over: Partial<Headline> = {}): Headline => ({ id, title: `Headline ${id}`, url: 'https://example.org/a', source: 'example.org', date, tag: '', ...over });

describe('interests: forms and starters', () => {
  it('offers three places to start from', () => {
    expect(FORM_SETS.map((s) => [s.id, s.label])).toEqual([['investing', 'Investing'], ['law', 'Law'], ['none', 'Something else']]);
  });

  it('offers what each starting point comes with, then the plain kinds', () => {
    expect(startersIn(INVESTING, []).map((f) => f.label)).toEqual(['Company', 'Journal entry', 'Learning route', 'Watchlist', 'Books', 'Note', 'Checklist', 'Reading']);
    expect(startersIn(LAW, []).map((f) => f.label)).toEqual(['Case', 'Current affairs', 'Books', 'Universities and scholarships', 'Career ideas', 'Note', 'Checklist', 'Reading']);
    expect(startersIn(OWN, []).map((f) => f.label)).toEqual(['Note', 'Checklist', 'Reading']);
  });

  it('leaves out a titled starter once the interest has that page, and never a form', () => {
    const used = [page({ id: 'a', title: 'watchlist', interestId: 'in-1' }), page({ id: 'b', title: 'Books', interestId: 'in-2' }), page({ id: 'c', title: 'A company', form: 'company', interestId: 'in-1' })];
    expect(startersIn(INVESTING, used).map((f) => f.label)).toEqual(['Company', 'Journal entry', 'Learning route', 'Books', 'Note', 'Checklist', 'Reading']);
  });

  it('gives a form its parts, and the learning route its five steps', () => {
    expect(formOf('company')!.fields).toEqual(['Ticker and industry', 'Business model', 'Revenue and profit, with the period and the source', 'Competitive advantage', 'Risks', 'Valuation', 'Would I buy, and why', 'Confidence, out of 10']);
    expect(formOf('trade')!.fields).toEqual(['Date', 'Ticker', 'Buy or sell', 'Reason', 'Risk', 'Outcome', 'Lesson learned']);
    expect(formOf('case')!.fields).toEqual(['Court', 'Facts', 'Decision', 'Why it matters', 'My thoughts']);
    expect(formOf('affairs')!.fields).toEqual(['What happened', 'Why it matters', 'My thoughts']);
    expect(formOf('route')!.items).toHaveLength(5);
    expect(FORMS.none).toEqual([]);
    expect(formOf('nonsense')).toBeUndefined();
    expect(formOf(undefined)).toBeUndefined();
  });

  it('starts a page from a form with its parts, its label and its interest', () => {
    let n = 0;
    const made = newPage('note', 'p9', NOW, { interestId: 'in-1', form: formOf('company'), lineId: () => `l${++n}` });
    expect(made).toMatchObject({ kind: 'note', title: 'Untitled', interestId: 'in-1', form: 'company' });
    expect(made.fields!.map((f) => [f.label, f.text])[0]).toEqual(['Ticker and industry', '']);
    expect(made.fields).toHaveLength(8);
    const route = newPage('checklist', 'p10', NOW, { interestId: 'in-1', form: formOf('route'), lineId: () => `l${++n}` });
    expect(route).toMatchObject({ kind: 'checklist', title: 'Learning route', form: 'route' });
    expect(route.items.map((i) => i.done)).toEqual([false, false, false, false, false]);
    expect(route.fields).toBeUndefined();
    expect(newPage('note', 'p11', NOW).interestId).toBeUndefined();
  });

  it("lists an interest's pages as My pages orders them", () => {
    const all = [page({ id: 'old', interestId: 'in-1', updatedAt: '2026-11-01T08:00:00Z' }), page({ id: 'new', interestId: 'in-1', updatedAt: '2026-11-10T08:00:00Z' }), page({ id: 'other', interestId: 'in-2' }), page({ id: 'none' })];
    expect(interestPages(all, 'in-1').map((p) => p.id)).toEqual(['new', 'old']);
  });

  it("says a form's first filled part where a page has nothing written under it", () => {
    const parts = [{ id: 'f1', label: 'Ticker and industry', text: '' }, { id: 'f2', label: 'Business model', text: 'Sells subscriptions to schools.' }];
    expect(pageLine(page({ fields: parts }))).toBe('Sells subscriptions to schools.');
    expect(pageLine(page({ fields: parts, text: 'My own note.' }))).toBe('My own note.');
    expect(pageLine(page({ fields: [{ id: 'f1', label: 'Court', text: '' }] }))).toBe('Nothing written yet');
  });

  it("writes a page's parts and its link when pages are exported as text", () => {
    const text = pagesAsText([page({ title: 'A company', form: 'company', link: 'https://example.org/report', fields: [{ id: 'f1', label: 'Risks', text: 'One customer is half of sales.' }, { id: 'f2', label: 'Valuation', text: '' }] })], [], '2026-11-19');
    expect(text).toContain('Risks\nOne customer is half of sales.');
    expect(text).not.toContain('Valuation');
    expect(text).toContain('Source: https://example.org/report');
  });
});

describe('interests: what is kept from a save', () => {
  it('keeps only interests that have an id and a name', () => {
    expect(storedInterests([null, { id: 'a' }, { id: 'b', name: ' Investing ', forms: 'investing' }, { id: 'b', name: 'Twice' }, { id: 'c', name: 'Chess', forms: 'bridge' }]))
      .toEqual([{ id: 'b', name: 'Investing', forms: 'investing' }, { id: 'c', name: 'Chess', forms: 'none' }]);
    expect(storedInterests('nonsense')).toEqual([]);
  });

  it("keeps only a page's parts that have an id and a label", () => {
    expect(storedFields([{ id: 'f1', label: ' Risks ', text: 7 }, { id: 'f2' }, { label: 'No id' }, { id: 'f1', label: 'Twice', text: 'x' }, { id: 'f3', label: 'Court', text: 'High Court' }]))
      .toEqual([{ id: 'f1', label: 'Risks', text: '' }, { id: 'f3', label: 'Court', text: 'High Court' }]);
    expect(storedFields([])).toBeUndefined();
    expect(storedFields('nonsense')).toBeUndefined();
  });

  it('keeps only headlines that have an id, a title, a web address and a real date', () => {
    const stored = storedHeadlines([
      { id: 'h1', title: ' Lender lifts profit ', url: 'example.org/a', source: '', date: '2026-11-12', tag: ' ABC ' },
      { id: 'h2', title: 'Bad address', url: 'javascript:alert(1)', date: '2026-11-12' },
      { id: 'h3', title: 'No date', url: 'https://example.org/b', date: 'soon' },
      { id: 'h4', title: '', url: 'https://example.org/c', date: '2026-11-12' },
      { id: 'h1', title: 'Twice', url: 'https://example.org/d', date: '2026-11-12' },
    ]);
    expect(stored).toEqual([{ id: 'h1', title: 'Lender lifts profit', url: 'https://example.org/a', source: 'example.org', date: '2026-11-12', tag: 'ABC' }]);
  });
});

describe('headlines', () => {
  it('tidies a headline, and takes the name of its site when no source is typed', () => {
    expect(cleanHeadline({ title: '  Miner cuts  guidance ', url: 'www.samplewire.com/news/1', date: '2026-11-11', tag: 'xyz' }))
      .toEqual({ title: 'Miner cuts guidance', url: 'https://www.samplewire.com/news/1', source: 'samplewire.com', date: '2026-11-11', tag: 'xyz' });
    expect(cleanHeadline({ title: 'A', url: 'https://example.org', source: ' Example Times ', date: '2026-11-11' })).toMatchObject({ source: 'Example Times', tag: '' });
  });

  it('refuses a headline with no title, no web address or no real date', () => {
    expect(cleanHeadline({ title: '  ', url: 'https://example.org', date: '2026-11-11' })).toBeNull();
    expect(cleanHeadline({ title: 'A', url: 'mailto:a@b.c', date: '2026-11-11' })).toBeNull();
    expect(cleanHeadline({ title: 'A', url: 'https://example.org', date: '11 November' })).toBeNull();
  });

  it('cuts a title, a source and a tag at their limits', () => {
    const long = cleanHeadline({ title: 't'.repeat(300), url: 'https://example.org', source: 's'.repeat(90), date: '2026-11-11', tag: 'g'.repeat(20) })!;
    expect([long.title.length, long.source.length, long.tag.length]).toEqual([140, 40, 8]);
  });

  it('puts the newest day first, and of two for one day the one saved later', () => {
    const all = [headline('a', '2026-11-09'), headline('b', '2026-11-12'), headline('c', '2026-11-12'), headline('d', '2026-11-11')];
    expect(shownHeadlines(all, null, [], '2026-11-20' as ISODate).map((h) => h.id)).toEqual(['c', 'b', 'd', 'a']);
  });
});

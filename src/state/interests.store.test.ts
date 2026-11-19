import { beforeEach, describe, expect, it } from 'vitest';
import { todayISO } from '../domain/dates';
import { milesLogged } from '../domain/voyage';
import { useCompass } from './store';

const s = () => useCompass.getState();
const merge = (saved: unknown) => useCompass.persist.getOptions().merge!(saved, s()) as ReturnType<typeof s>;
const page = (id: string) => s().pages.find((p) => p.id === id)!;

beforeEach(() => { s().resetSample(); });

describe('interests in the store', () => {
  it('starts with no interests and no headlines, and the sample as it was', () => {
    expect(s().interests).toEqual([]);
    expect(s().headlines).toEqual([]);
    expect(s().pages).toHaveLength(5);
    expect(s().pages.some((p) => p.interestId || p.fields || p.link || p.form)).toBe(false);
  });

  it('adds an interest, named for where it starts from when no name is typed', () => {
    const a = s().addInterest({ name: '', forms: 'investing' })!, b = s().addInterest({ name: '  Mock  trial ', forms: 'law' })!;
    expect(s().interests).toEqual([{ id: a, name: 'Investing', forms: 'investing' }, { id: b, name: 'Mock trial', forms: 'law' }]);
    expect(s().addInterest({ name: '   ', forms: 'none' })).toBeNull();
    s().updateInterest(a, { name: '  ', forms: 'none' });
    expect(s().interests[0]).toEqual({ id: a, name: 'Investing', forms: 'none' });
    s().updateInterest(a, { name: 'Shares' });
    expect(s().interests[0]!.name).toBe('Shares');
  });

  it('stops at 8 interests', () => {
    for (let i = 0; i < 8; i++) expect(s().addInterest({ name: `Interest ${i}`, forms: 'none' })).not.toBeNull();
    expect(s().addInterest({ name: 'One more', forms: 'none' })).toBeNull();
  });

  it('starts a page from a form, kept in its interest', () => {
    const id = s().addInterest({ name: '', forms: 'investing' })!, company = s().startPage(id, 'company')!, route = s().startPage(id, 'route')!, note = s().startPage(id, 'note')!;
    expect(page(company)).toMatchObject({ kind: 'note', title: 'Untitled', interestId: id, form: 'company' });
    expect(page(company).fields).toHaveLength(8);
    expect(page(route)).toMatchObject({ kind: 'checklist', title: 'Learning route', form: 'route' });
    expect(page(route).items).toHaveLength(5);
    // a plain kind is a page like any other: it remembers no form
    expect(page(note).form).toBeUndefined();
    expect(page(note).interestId).toBe(id);
    expect(s().startPage('nowhere', 'company')).toBeNull();
    expect(s().startPage(id, 'nonsense')).toBeNull();
    // a form that belongs to another starting point is not this interest's to start
    expect(s().startPage(id, 'case')).toBeNull();
  });

  it("keeps what is written in a form's part, within its limit", () => {
    const id = s().addInterest({ name: '', forms: 'law' })!, made = s().startPage(id, 'case')!, court = page(made).fields![0]!.id, before = page(made).updatedAt;
    s().setPageField(made, court, 'High Court of  Australia ');
    expect(page(made).fields![0]).toEqual({ id: court, label: 'Court', text: 'High Court of  Australia ' });
    s().setPageField(made, court, 'x'.repeat(3000));
    expect(page(made).fields![0]!.text).toHaveLength(2000);
    expect(page(made).updatedAt >= before).toBe(true);
    s().setPageField(made, 'nowhere', 'lost');
    expect(page(made).fields!.map((f) => f.label)).toEqual(['Court', 'Facts', 'Decision', 'Why it matters', 'My thoughts']);
  });

  it('puts a page in an interest and takes it out', () => {
    const id = s().addInterest({ name: 'Chess', forms: 'none' })!;
    s().updatePage('pg-trip', { interestId: id });
    expect(page('pg-trip').interestId).toBe(id);
    s().updatePage('pg-trip', { interestId: 'nowhere' });
    expect(page('pg-trip').interestId).toBe(id);
    s().updatePage('pg-trip', { interestId: null });
    expect(page('pg-trip').interestId).toBeUndefined();
  });

  it('deletes an interest and keeps its pages, and Undo puts them back in it', () => {
    const a = s().addInterest({ name: 'First', forms: 'none' })!, b = s().addInterest({ name: 'Second', forms: 'law' })!, made = s().startPage(b, 'case')!;
    s().updatePage('pg-trip', { interestId: b });
    const removed = s().deleteInterest(b)!;
    expect(s().interests.map((i) => i.id)).toEqual([a]);
    expect(page(made).interestId).toBeUndefined();
    expect(page('pg-trip').interestId).toBeUndefined();
    expect(page(made).fields).toHaveLength(5);
    s().restoreInterest(removed);
    expect(s().interests.map((i) => i.id)).toEqual([a, b]);
    expect([page(made).interestId, page('pg-trip').interestId]).toEqual([b, b]);
    expect(s().deleteInterest('nowhere')).toBeNull();
  });

  it("sets a page's link, and refuses what is not a web address", () => {
    expect(s().setPageLink('pg-trip', 'example.org/trip')).toBe(true);
    expect(page('pg-trip').link).toBe('https://example.org/trip');
    expect(s().setPageLink('pg-trip', 'javascript:alert(1)')).toBe(false);
    expect(page('pg-trip').link).toBe('https://example.org/trip');
    expect(s().setPageLink('pg-trip', '  ')).toBe(true);
    expect(page('pg-trip').link).toBeUndefined();
    expect(s().setPageLink('nowhere', 'example.org')).toBe(false);
  });
});

describe('headlines in the store', () => {
  const input = (over: object = {}) => ({ title: 'Lender lifts half-year profit', url: 'example.org/a', date: todayISO(), ...over });

  it('saves a headline with a title and a web address, and refuses one without', () => {
    const id = s().addHeadline(input({ tag: 'ABC' }))!;
    expect(s().headlines).toEqual([{ id, title: 'Lender lifts half-year profit', url: 'https://example.org/a', source: 'example.org', date: todayISO(), tag: 'ABC' }]);
    expect(s().addHeadline(input({ title: ' ' }))).toBeNull();
    expect(s().addHeadline(input({ url: 'not a link' }))).toBeNull();
    expect(s().addHeadline(input({ date: 'soon' }))).toBeNull();
    // the same headline saved twice is two headlines: nothing is checked against what is there
    expect(s().addHeadline(input())).not.toBeNull();
    expect(s().headlines).toHaveLength(2);
  });

  it('changes a headline, and keeps what it had when a change is refused', () => {
    const id = s().addHeadline(input())!;
    expect(s().updateHeadline(id, { title: 'Lender lifts full-year profit', source: 'Example Times', tag: 'XYZ', date: '2026-11-12' })).toBe(true);
    expect(s().headlines[0]).toMatchObject({ title: 'Lender lifts full-year profit', source: 'Example Times', tag: 'XYZ', date: '2026-11-12' });
    expect(s().updateHeadline(id, { url: 'mailto:a@b.c' })).toBe(false);
    expect(s().updateHeadline(id, { title: '   ' })).toBe(false);
    expect(s().headlines[0]).toMatchObject({ title: 'Lender lifts full-year profit', url: 'https://example.org/a' });
    // a source emptied goes back to the name of the site
    expect(s().updateHeadline(id, { source: '' })).toBe(true);
    expect(s().headlines[0]!.source).toBe('example.org');
  });

  it('stops at 60 headlines, and deletes one and puts it back where it was', () => {
    for (let i = 0; i < 60; i++) s().addHeadline(input({ title: `Headline ${i}` }));
    expect(s().addHeadline(input())).toBeNull();
    const second = s().headlines[1]!, gone = s().deleteHeadline(second.id)!;
    expect(s().headlines).toHaveLength(59);
    s().restoreHeadline(gone.headline, gone.index);
    expect(s().headlines[1]).toEqual(second);
    expect(milesLogged(s().log)).toBe(412);
  });
});

describe('interests and headlines in a save', () => {
  it('opens a save from before this piece with nothing lost', () => {
    const old = JSON.parse(JSON.stringify({ ...s(), sample: false }));
    delete old.interests; delete old.headlines;
    const merged = merge(old);
    expect([merged.interests, merged.headlines]).toEqual([[], []]);
    expect(merged.pages).toHaveLength(5);
  });

  it('drops what is not a record, and anything that is not a web address', () => {
    const id = s().addInterest({ name: '', forms: 'law' })!, made = s().startPage(id, 'case')!;
    const save = JSON.parse(JSON.stringify(s()));
    save.interests.push(null, { id: 'bad' });
    save.headlines = [{ id: 'h1', title: 'Fine', url: 'example.org/a', date: '2026-11-12' }, { id: 'h2', title: 'Bad', url: 'javascript:alert(1)', date: '2026-11-12' }];
    const kept = save.pages.find((p: { id: string }) => p.id === made);
    kept.link = 'file:///etc/hosts'; kept.fields.push({ id: 'x' }, null); kept.form = 7;
    save.pages[0].link = 'example.org/notes'; save.pages[0].fields = 'nonsense'; save.pages[0].interestId = 9;
    const merged = merge(save), back = merged.pages.find((p) => p.id === made)!;
    expect(merged.interests).toEqual([{ id, name: 'Law', forms: 'law' }]);
    expect(merged.headlines.map((h) => h.id)).toEqual(['h1']);
    expect(back.link).toBeUndefined();
    expect(back.fields).toHaveLength(5);
    expect(back.form).toBeUndefined();
    expect(back.interestId).toBe(id);
    expect(merged.pages[0]!.link).toBe('https://example.org/notes');
    expect(merged.pages[0]!.fields).toBeUndefined();
    expect(merged.pages[0]!.interestId).toBeUndefined();
  });

  it('clears interests and headlines with everything else', () => {
    s().addInterest({ name: 'Chess', forms: 'none' });
    s().addHeadline({ title: 'A', url: 'example.org', date: todayISO() });
    s().clearAll();
    expect([s().interests, s().headlines]).toEqual([[], []]);
  });
});

// Found by the review of the whole change

describe('what the review found', () => {
  const input = (over: object = {}) => ({ title: 'Lender lifts half-year profit', url: 'example.org/a', date: todayISO(), ...over });

  it('starts a titled page once in an interest, and a form as often as it is asked', () => {
    const id = s().addInterest({ name: '', forms: 'investing' })!;
    expect(s().startPage(id, 'watchlist')).not.toBeNull();
    // a second press that arrives before the button has gone makes nothing
    expect(s().startPage(id, 'watchlist')).toBeNull();
    expect(s().startPage(id, 'company')).not.toBeNull();
    expect(s().startPage(id, 'company')).not.toBeNull();
    expect(s().pages.filter((p) => p.interestId === id).map((p) => p.title).sort()).toEqual(['Untitled', 'Untitled', 'Watchlist']);
  });

  it('a source taken from the site follows a change of address, and one that was typed stays', () => {
    const id = s().addHeadline(input())!;
    expect(s().headlines[0]!.source).toBe('example.org');
    s().updateHeadline(id, { url: 'samplewire.com/b' });
    expect(s().headlines[0]).toMatchObject({ url: 'https://samplewire.com/b', source: 'samplewire.com' });
    s().updateHeadline(id, { source: 'Sample Wire' });
    s().updateHeadline(id, { url: 'example.org/c' });
    expect(s().headlines[0]).toMatchObject({ url: 'https://example.org/c', source: 'Sample Wire' });
  });

  it("opens a save whose page has a list with things in it that are not items, or a kind that is not one", () => {
    const save = JSON.parse(JSON.stringify(s()));
    save.pages[0].items = [null, 7, { id: 'i1', text: 'Kept', done: true }, { id: 'i2' }, { text: 'no id' }, { id: 'i1', text: 'Twice', done: false }, { id: 'i3', text: 'Not yet' }];
    save.pages[1].kind = 'nonsense'; save.pages[1].updatedAt = 5; save.pages[1].createdAt = null;
    const merged = merge(save);
    expect(merged.pages[0]!.items).toEqual([{ id: 'i1', text: 'Kept', done: true }, { id: 'i3', text: 'Not yet', done: false }]);
    expect(merged.pages[1]!.kind).toBe('note');
    expect([typeof merged.pages[1]!.updatedAt, typeof merged.pages[1]!.createdAt]).toEqual(['string', 'string']);
    // a page that was whole is as it was
    expect(merged.pages[2]).toEqual(s().pages[2]);
  });
});

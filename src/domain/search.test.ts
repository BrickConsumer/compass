import { describe, expect, it } from 'vitest';
import { countByKind, type Found, FOUND_KINDS, SEARCH_LIMITS, searchAll, shownResults } from './search';
import { type CompassData, empty } from './seed';
import type { Page, Task } from './types';

const NOW = '2026-11-19T08:00:00.000Z';
const task = (id: string, title: string, over: Partial<Task> = {}): Task => ({ id, title, priority: 'normal', scope: 'day', date: '2026-11-19', order: 1, createdAt: NOW, ...over });
const page = (id: string, title: string, over: Partial<Page> = {}): Page => ({ id, title, kind: 'note', items: [], text: '', createdAt: NOW, updatedAt: NOW, ...over });
const data = (over: Partial<CompassData> = {}): CompassData => ({ ...empty(), ...over });
const keys = (found: Found[]) => found.map((f) => f.key);

describe('searching everything', () => {
  it('finds nothing until two characters are typed', () => {
    // no subjects here: the starting Biology has notes of its own, which hold these words too
    const d = data({ subjects: [], tasks: [task('t1', 'Revise osmosis')] });
    expect(searchAll(d, '')).toEqual([]);
    expect(searchAll(d, ' r ')).toEqual([]);
    expect(keys(searchAll(d, 're'))).toEqual(['task:t1']);
    expect(SEARCH_LIMITS.min).toBe(2);
  });

  it('wants every word, in any order and any case, with or without accents', () => {
    const d = data({ tasks: [task('t1', 'Revise for the test', { subjectId: 'bio' }), task('t2', 'Café visit write-up'), task('t3', 'Test the pump')] });
    expect(keys(searchAll(d, 'TEST revise'))).toEqual(['task:t1']);
    expect(keys(searchAll(d, 'cafe'))).toEqual(['task:t2']);
    expect(keys(searchAll(d, 'café'))).toEqual(['task:t2']);
    expect(searchAll(d, 'revise pump')).toEqual([]);
  });

  it('finds a task by its title or its notes, and says its subject and day', () => {
    const d = data({ tasks: [task('t1', 'Problem set 4', { subjectId: 'mat', notes: 'Questions 3 to 9. Ask about the chain rule before Friday.' }), task('t2', 'Read chapter 6', { scope: 'week', date: '2026-11-16', completedAt: NOW })] });
    const [byTitle] = searchAll(d, 'problem');
    expect(byTitle).toMatchObject({ key: 'task:t1', kind: 'task', type: 'Task', title: 'Problem set 4', where: 'Mathematics, Thu 19 Nov', rank: 0, to: { path: '/?date=2026-11-19', state: { task: 't1' } } });
    expect(byTitle!.excerpt).toBeUndefined();
    const [byNotes] = searchAll(d, 'chain rule');
    expect(byNotes).toMatchObject({ key: 'task:t1', rank: 2 });
    expect(byNotes!.excerpt).toContain('chain rule');
    expect(searchAll(d, 'chapter')[0]).toMatchObject({ where: 'Week of 16 Nov, done' });
  });

  it('puts a name that starts with the words first, then a name that holds them, then what was found in the writing', () => {
    const d = data({
      subjects: [],
      tasks: [task('t1', 'Notes on osmosis', { notes: 'x' }), task('t2', 'Something else', { notes: 'About osmosis and diffusion' }), task('t3', 'Osmosis practical')],
    });
    expect(searchAll(d, 'osmosis').map((f) => [f.key, f.rank])).toEqual([['task:t3', 0], ['task:t1', 1], ['task:t2', 2]]);
  });

  it('keeps an excerpt short, on one line, and around the words found', () => {
    const long = `${'Filler words. '.repeat(20)}The osmosis part\nis here. ${'More filler. '.repeat(20)}`;
    const [found] = searchAll(data({ tasks: [task('t1', 'A task', { notes: long })] }), 'osmosis');
    expect(found!.excerpt!.length).toBeLessThanOrEqual(SEARCH_LIMITS.excerpt + 2);
    expect(found!.excerpt).toContain('osmosis part is here');
    expect(found!.excerpt!.startsWith('…')).toBe(true);
    expect(found!.excerpt!.endsWith('…')).toBe(true);
  });

  it('finds everything Study keeps, and opens the subject', () => {
    const d = data({
      subjects: [{ id: 'bio', name: 'Biology', colour: 'seafoam', topic: 'Cell transport', notes: 'Ask about the plasmolysis practical', links: [{ id: 'l1', name: 'Flashcards', url: 'https://example.org/cards' }] }],
      assessments: [{ id: 'a1', title: 'Cells and transport test', subjectId: 'bio', date: '2026-11-27', kind: 'test' }],
      feedback: [{ id: 'f1', subjectId: 'bio', date: '2026-11-12', about: 'Practical report', words: 'Label the axes and give units.', work: 'Redo the graph' }],
      sessions: [{ id: 's1', subjectId: 'bio', name: 'Biology flashcards', days: [1, 3], createdOn: '2026-11-01' }],
    });
    // the subject and the session are found by name; what else belongs to Biology follows, since a subject's name finds what is kept in it
    expect(searchAll(d, 'biology').map((f) => [f.key, f.type, f.where])).toEqual([['subject:bio', 'Subject', 'Study'], ['session:s1', 'Study session', 'Biology'], ['assessment:a1', 'Test', 'Biology, Fri 27 Nov'], ['feedback:f1', 'Feedback', 'Biology, Thu 12 Nov']]);
    expect(searchAll(d, 'plasmolysis')[0]).toMatchObject({ key: 'subject:bio', kind: 'study', rank: 2, to: { path: '/study/bio' } });
    expect(searchAll(d, 'cells')[0]).toMatchObject({ key: 'assessment:a1', kind: 'study', type: 'Test', where: 'Biology, Fri 27 Nov', to: { path: '/study/bio' } });
    expect(searchAll(d, 'axes')[0]).toMatchObject({ key: 'feedback:f1', kind: 'study', type: 'Feedback', title: 'Practical report', where: 'Biology, Thu 12 Nov', to: { path: '/study/bio' } });
    expect(searchAll(d, 'flashcards').map((f) => f.key)).toEqual(['link:bio:l1', 'session:s1']);
    expect(searchAll(d, 'flashcards')[0]).toMatchObject({ kind: 'link', type: 'Link', where: 'Biology', to: { url: 'https://example.org/cards' } });
  });

  it("finds a page by its title, its writing, its list and a form's parts, and an interest by its name", () => {
    const d = data({
      interests: [{ id: 'in-1', name: 'Investing', forms: 'investing' }],
      pages: [
        page('p1', 'Example Carriers', { interestId: 'in-1', form: 'company', fields: [{ id: 'f1', label: 'Risks', text: 'Fuel costs and a thin margin' }] }),
        page('p2', 'Packing list', { kind: 'checklist', subjectId: 'bio', items: [{ id: 'i1', text: 'Waterproof boots', done: false }] }),
        page('p3', 'Loose thoughts', { text: 'Margin notes on the reading' }),
      ],
    });
    expect(searchAll(d, 'carriers')[0]).toMatchObject({ key: 'page:p1', kind: 'page', type: 'Company', where: 'Investing', to: { path: '/pages/p1' } });
    expect(searchAll(d, 'fuel')[0]).toMatchObject({ key: 'page:p1', rank: 2, excerpt: 'Fuel costs and a thin margin' });
    expect(searchAll(d, 'boots')[0]).toMatchObject({ key: 'page:p2', type: 'Checklist', where: 'Biology' });
    expect(keys(searchAll(d, 'margin'))).toEqual(['page:p1', 'page:p3']);
    expect(searchAll(d, 'loose')[0]).toMatchObject({ type: 'Note', where: 'My pages' });
    expect(searchAll(d, 'invest')[0]).toMatchObject({ key: 'interest:in-1', kind: 'page', type: 'Interest', where: 'My pages', to: { path: '/pages', state: { interest: 'in-1' } } });
  });

  it('finds headlines, habits, reviews and links, each opening where it lives', () => {
    const d = data({
      headlines: [{ id: 'h1', title: 'Port reopens after the storm', url: 'https://example.org/port', source: 'Example Times', date: '2026-11-18', tag: 'XYZ' }],
      habits: [{ id: 'hb1', name: 'Read for 20 minutes', days: [1, 2, 3], order: 1, createdOn: '2026-11-01' }],
      reviews: [{ weekStart: '2026-11-09', wentWell: 'Finished the essay early', gotInWay: 'Late nights', change: 'Phone outside the room', savedAt: NOW }, { weekStart: '2026-11-16', wentWell: '', gotInWay: '', change: '' }],
      links: [{ id: 'l1', name: 'School portal', url: 'https://portal.example.org/' }],
    });
    expect(searchAll(d, 'storm')[0]).toMatchObject({ key: 'headline:h1', kind: 'headline', type: 'Headline', where: 'Example Times, 18 Nov', to: { url: 'https://example.org/port' } });
    expect(keys(searchAll(d, 'xyz'))).toEqual(['headline:h1']);
    expect(searchAll(d, 'read for')[0]).toMatchObject({ key: 'habit:hb1', kind: 'habit', type: 'Habit', where: 'Habits', to: { path: '/habits' } });
    expect(searchAll(d, 'essay')[0]).toMatchObject({ key: 'review:2026-11-09', kind: 'review', type: 'Weekly review', title: 'Week of 9 Nov', rank: 2, excerpt: 'Finished the essay early', to: { path: '/review', state: { week: '2026-11-09' } } });
    expect(searchAll(d, 'portal')[0]).toMatchObject({ key: 'link:l1', kind: 'link', type: 'Link', where: 'portal.example.org', to: { url: 'https://portal.example.org/' } });
  });

  it('finds what Fitness keeps only while it is switched on', () => {
    const fitness: Partial<CompassData> = {
      routines: [{ id: 'r1', name: 'Legs', days: [1], lines: [{ id: 'l1', text: 'Squat, 3 × 5 at 60 kg' }], createdOn: '2026-11-01' }],
      workouts: [{ id: 'w1', routineId: 'r1', name: 'Legs', date: '2026-11-17', lines: [{ id: 'l1', text: 'Squat, 3 × 5 at 60 kg', done: true }], note: 'Knee felt fine' }],
      bests: [{ id: 'b1', name: 'Squat', value: '60 kg', date: '2026-11-17' }],
      measures: [{ id: 'm1', name: 'Resting pulse', value: '58', unit: 'bpm', date: '2026-11-17' }],
    };
    expect(searchAll(data(fitness), 'squat')).toEqual([]);
    const on = data({ ...fitness, settings: { ...empty().settings, fitness: true } });
    expect(searchAll(on, 'squat').map((f) => [f.key, f.type, f.where])).toEqual([['best:b1', 'Best', '60 kg'], ['routine:r1', 'Routine', 'Fitness'], ['workout:w1', 'Session', 'Tue 17 Nov']]);
    expect(searchAll(on, 'knee')[0]).toMatchObject({ kind: 'fitness', to: { path: '/fitness/w1' } });
    expect(searchAll(on, 'pulse')[0]).toMatchObject({ key: 'measure:m1', type: 'Measure', where: '58 bpm', to: { path: '/fitness' } });
  });

  it('orders the kinds as they are listed, and the newest first within one', () => {
    const d = data({
      tasks: [task('t-old', 'Essay plan', { date: '2026-11-10' }), task('t-new', 'Essay draft', { date: '2026-11-20' })],
      pages: [page('p1', 'Essay notes')],
      habits: [{ id: 'hb1', name: 'Essay for ten minutes', days: [1], order: 1, createdOn: '2026-11-01' }],
    });
    expect(keys(searchAll(d, 'essay'))).toEqual(['task:t-new', 'task:t-old', 'page:p1', 'habit:hb1']);
    expect(FOUND_KINDS.map((k) => k.label)).toEqual(['Tasks', 'Study', 'Pages', 'Headlines', 'Habits', 'Reviews', 'Fitness', 'Links']);
  });

  it('counts by kind, and shows the first 20 of everything or 50 of one kind', () => {
    const d = data({ tasks: Array.from({ length: 60 }, (_, i) => task(`t${i}`, `Essay ${i}`)), pages: [page('p1', 'Essay notes'), page('p2', 'Essay plan')] });
    const found = searchAll(d, 'essay');
    expect(countByKind(found)).toEqual([{ id: 'task', label: 'Tasks', count: 60 }, { id: 'page', label: 'Pages', count: 2 }]);
    expect(shownResults(found, null)).toMatchObject({ more: 42 });
    expect(shownResults(found, null).shown).toHaveLength(20);
    expect(shownResults(found, 'task').shown).toHaveLength(50);
    expect(shownResults(found, 'task').more).toBe(10);
    expect(keys(shownResults(found, 'page').shown)).toEqual(['page:p1', 'page:p2']);
    expect(shownResults(found, 'habit')).toEqual({ shown: [], more: 0 });
  });

  it('is not troubled by a very long search, or by a record with something missing', () => {
    const d = data({ tasks: [task('t1', 'Fine'), { id: 't2', title: 'No notes' } as Task], pages: [{ id: 'p1', title: 'Bare' } as Page] });
    expect(searchAll(d, 'x'.repeat(500))).toEqual([]);
    expect(keys(searchAll(d, 'bare'))).toEqual(['page:p1']);
  });

  it('finds a task by its subject as well: "bio test" finds a Biology task called "Revise for the test"', () => {
    const d = data({ tasks: [task('t1', 'Revise for the test', { subjectId: 'bio' }), task('t2', 'Revise for the test', { subjectId: 'eco' })] });
    const found = searchAll(d, 'bio test').filter((f) => f.kind === 'task');
    expect(keys(found)).toEqual(['task:t1']);
    // the subject is where it is kept, which the result already says, so there are no words to show
    expect(found[0]).toMatchObject({ where: 'Biology, Thu 19 Nov' });
    expect(found[0]!.excerpt).toBeUndefined();
    // a page is found by its interest in the same way
    const pages = data({ interests: [{ id: 'in-1', name: 'Investing', forms: 'investing' }], pages: [page('p1', 'Example Carriers', { interestId: 'in-1' })] });
    expect(keys(searchAll(pages, 'investing carriers'))).toEqual(['page:p1']);
  });

  it('finds a best and a measure by its value', () => {
    const on = data({ settings: { ...empty().settings, fitness: true }, bests: [{ id: 'b1', name: '5 km', value: '24:10', date: '2026-11-17' }], measures: [{ id: 'm1', name: 'Resting pulse', value: '58', unit: 'bpm', date: '2026-11-17' }] });
    expect(keys(searchAll(on, '24:10'))).toEqual(['best:b1']);
    expect(keys(searchAll(on, '58'))).toEqual(['measure:m1']);
    expect(keys(searchAll(on, 'bpm'))).toEqual(['measure:m1']);
  });

  it('shows the sentence the words are in when they carry accents', () => {
    const notes = `${'Filler words. '.repeat(20)}Meet at the café by the station. ${'More filler. '.repeat(20)}`;
    const d = data({ subjects: [], tasks: [task('t1', 'A task', { notes })] });
    expect(searchAll(d, 'cafe')[0]!.excerpt).toContain('Meet at the café by the station.');
    expect(searchAll(d, 'CAFÉ')[0]!.excerpt).toContain('Meet at the café by the station.');
  });

  it('finds a review only once it has been saved', () => {
    const d = data({ reviews: [{ weekStart: '2026-11-09', wentWell: 'Finished the essay', gotInWay: '', change: '', savedAt: NOW }, { weekStart: '2026-11-16', wentWell: 'Half an essay', gotInWay: '', change: '' }] });
    expect(keys(searchAll(d, 'essay'))).toEqual(['review:2026-11-09']);
    expect(searchAll(d, 'week of')).toEqual([expect.objectContaining({ key: 'review:2026-11-09' })]);
  });
});


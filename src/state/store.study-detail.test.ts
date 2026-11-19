import { beforeEach, describe, expect, it } from 'vitest';
import { todayISO, weekStartOf } from '../domain/dates';
import { feedbackTask } from '../domain/feedback';
import { subjectPages } from '../domain/pages';
import { isPreparation } from '../domain/study';
import { SUBJECT_COLOURS } from '../domain/types';
import { milesLogged } from '../domain/voyage';
import { useCompass } from './store';

const s = () => useCompass.getState();
const merge = (saved: unknown) => useCompass.persist.getOptions().merge!(saved, s()) as ReturnType<typeof s>;

describe('study detail: records and the saved data', () => {
  beforeEach(() => { s().resetSample(); });

  it('starts with a topic and one feedback entry on Biology, and no sample task changed', () => {
    expect(s().subjects.find((x) => x.id === 'bio')!.topic).toBe('Cell structure and transport');
    expect(s().feedback.map((f) => f.subjectId)).toEqual(['bio']);
    expect(s().tasks.some((t) => t.assessmentId || t.link)).toBe(false);
    expect(s().tasks.filter((t) => t.scope === 'day' && t.date === todayISO())).toHaveLength(5);
  });

  it('sets and clears a topic without rewriting it', () => {
    s().updateSubject('eng', { topic: '  the role of the RBA  ' }); expect(s().subjects.find((x) => x.id === 'eng')!.topic).toBe('the role of the RBA');
    s().updateSubject('eng', { topic: '   ' }); expect(s().subjects.find((x) => x.id === 'eng')!.topic).toBeUndefined();
  });

  it('drops anything that is not a web address from a save', () => {
    const save = JSON.parse(JSON.stringify(s()));
    save.tasks[0].link = 'javascript:alert(1)'; save.tasks[1].link = 'investopedia.com'; save.assessments[0].link = 'data:text/html,hi'; save.assessments[1].link = 'https://example.org/notice.pdf';
    save.subjects[0].links = [null, { id: 'a', name: 'Bad', url: 'file:///etc/hosts' }, { id: 'b', name: 'Fine', url: 'gizmo.ai' }]; save.subjects[1].topic = 5;
    const merged = merge(save);
    expect([merged.tasks[0]!.link, merged.tasks[1]!.link]).toEqual([undefined, 'https://investopedia.com/']);
    expect([merged.assessments[0]!.link, merged.assessments[1]!.link]).toEqual([undefined, 'https://example.org/notice.pdf']);
    expect(merged.subjects[0]!.links).toEqual([{ id: 'b', name: 'Fine', url: 'https://gizmo.ai/' }]);
    expect(merged.subjects[1]!.topic).toBeUndefined();
  });

  it('leaves out of a save whatever in its lists is not a record, so a broken entry cannot stop the app opening', () => {
    const save = JSON.parse(JSON.stringify(s())), before = { tasks: save.tasks.length, assessments: save.assessments.length, subjects: save.subjects.length };
    save.tasks.push(null, 5, 'x', [], { id: 't-x' }); save.assessments.push(null, 'x', { id: 'as-x', title: 'No date' }); save.subjects.push(null, 7, { name: 'No id' });
    save.subjects[0].colour = 'not a colour';
    const merged = merge(save);
    expect(merged.tasks).toHaveLength(before.tasks); expect(merged.assessments).toHaveLength(before.assessments); expect(merged.subjects).toHaveLength(before.subjects);
    expect(Object.keys(SUBJECT_COLOURS)).toContain(merged.subjects[0]!.colour);
  });

  it('opens a save from before this piece with nothing lost', () => {
    const old = JSON.parse(JSON.stringify({ ...s(), sample: false })); delete old.feedback;
    for (const x of old.subjects) { delete x.topic; delete x.links; }
    const merged = merge(old);
    expect(merged.feedback).toEqual([]); expect(merged.tasks).toHaveLength(s().tasks.length); expect(merged.subjects).toHaveLength(5);
  });

  it('takes feedback away with its subject, and brings it back', () => {
    const removed = s().deleteSubject('bio')!; expect(s().feedback).toEqual([]);
    s().restoreSubject(removed); expect(s().feedback.map((f) => f.id)).toEqual(['fb-1']);
    s().clearAll(); expect(s().feedback).toEqual([]); expect(s().subjects.every((x) => !x.topic)).toBe(true);
  });
});

describe('study detail: preparation tasks', () => {
  beforeEach(() => { s().resetSample(); });

  // 'as-3' is the sample's English oral presentation
  it('makes a preparation task an ordinary task that belongs to an assessment', () => {
    const week = weekStartOf(todayISO(), 1), miles = milesLogged(s().log);
    const id = s().addTask({ title: 'Rehearse', date: week, scope: 'week', subjectId: 'eng', assessmentId: 'as-3' })!, mine = () => s().tasks.find((t) => t.id === id)!;
    expect(mine().assessmentId).toBe('as-3');
    s().toggleTask(id); s().toggleTask(id); s().toggleTask(id);
    expect(milesLogged(s().log)).toBe(miles + 2);
    const gone = s().deleteAssessment('as-3')!;
    expect(isPreparation(mine(), s().assessments)).toBe(false);
    s().restoreAssessment(gone); expect(isPreparation(mine(), s().assessments)).toBe(true);
    const removed = s().deleteSubject('eng')!; expect(isPreparation(mine(), s().assessments)).toBe(false); expect(mine().subjectId).toBeUndefined();
    s().restoreSubject(removed); expect(isPreparation(mine(), s().assessments)).toBe(true);
    s().updateTask(id, { assessmentId: null }); expect(mine().assessmentId).toBeUndefined();
    const stray = s().addTask({ title: 'Stray', date: week, scope: 'week', assessmentId: 'nowhere' })!;
    expect(s().tasks.find((t) => t.id === stray)!.assessmentId).toBeUndefined();
  });
});

describe('study detail: links on a task, an assessment and a subject', () => {
  beforeEach(() => { s().resetSample(); });

  it('keeps one web address on a task and on an assessment', () => {
    const id = s().addTask({ title: 'Read', date: todayISO(), scope: 'day', link: 'investopedia.com' })!, mine = () => s().tasks.find((t) => t.id === id)!;
    expect(mine().link).toBe('https://investopedia.com/');
    expect(s().setTaskLink(id, 'javascript:alert(1)')).toBe(false); expect(mine().link).toBe('https://investopedia.com/');
    expect(s().setTaskLink(id, '  ')).toBe(true); expect(mine().link).toBeUndefined();
    const bad = s().addTask({ title: 'Bad', date: todayISO(), scope: 'day', link: 'nope' })!; expect(s().tasks.find((t) => t.id === bad)!.link).toBeUndefined();
    const test = () => s().assessments.find((a) => a.id === 'as-1')!;
    expect(s().setAssessmentLink('as-1', 'example.org/notice.pdf')).toBe(true); expect(test().link).toBe('https://example.org/notice.pdf');
    expect(s().setAssessmentLink('as-1', 'ftp://x.y')).toBe(false); expect(test().link).toBe('https://example.org/notice.pdf');
    expect(s().setAssessmentLink('as-1', '')).toBe(true); expect(test().link).toBeUndefined();
    const quiz = s().addAssessment({ title: 'Quiz', subjectId: 'eng', date: todayISO(), kind: 'test', link: 'nope' })!; expect(s().assessments.find((a) => a.id === quiz)!.link).toBeUndefined();
    const essay = s().addAssessment({ title: 'Essay', subjectId: 'eng', date: todayISO(), kind: 'assignment', link: 'example.org/task' })!; expect(s().assessments.find((a) => a.id === essay)!.link).toBe('https://example.org/task');
  });

  it('takes no link through a change to a task: only the link box sets one, and it checks', () => {
    const id = s().tasks[0]!.id, mine = () => s().tasks.find((t) => t.id === id)!;
    s().updateTask(id, { title: 'Renamed', link: 'javascript:alert(1)' } as never);
    expect(mine().title).toBe('Renamed'); expect(mine().link).toBeUndefined();
    s().setTaskLink(id, 'example.org'); s().updateTask(id, { link: '' } as never); expect(mine().link).toBe('https://example.org/');
  });

  it("adds, changes, moves and removes a subject's links, six at most", () => {
    const links = () => s().subjects.find((x) => x.id === 'eng')!.links ?? [];
    expect(s().addSubjectLink('eng', { name: 'Bad', url: 'mailto:a@b.c' })).toBeNull(); expect(s().addSubjectLink('nowhere', { name: 'x', url: 'x.org' })).toBeNull();
    const a = s().addSubjectLink('eng', { name: '', url: 'quizlet.com/set' })!, b = s().addSubjectLink('eng', { name: 'Syllabus', url: 'https://example.org/syllabus' })!;
    expect(links().map((l) => l.name)).toEqual(['quizlet.com', 'Syllabus']);
    expect(s().updateSubjectLink('eng', b, { url: 'nope' })).toBe(false); expect(s().updateSubjectLink('eng', a, { name: ' Flashcards ' })).toBe(true); expect(links()[0]!.name).toBe('Flashcards');
    s().moveSubjectLink('eng', b, -1); expect(links()[0]!.id).toBe(b);
    const removed = s().deleteSubjectLink('eng', b)!; expect(links().map((l) => l.id)).toEqual([a]);
    s().restoreSubjectLink('eng', removed.link, removed.index); expect(links()[0]!.id).toBe(b);
    for (let i = 0; i < 6; i++) s().addSubjectLink('eng', { name: `n${i}`, url: `site${i}.org` });
    expect(links()).toHaveLength(6); expect(s().subjects.find((x) => x.id === 'mat')!.links ?? []).toEqual([]);
  });
});

describe('study detail: feedback', () => {
  beforeEach(() => { s().resetSample(); });

  it('keeps feedback on a subject', () => {
    expect(s().addFeedback({ subjectId: 'eng', date: todayISO(), words: '  ' })).toBeNull();
    expect(s().addFeedback({ subjectId: 'nowhere', date: todayISO(), words: 'Good.' })).toBeNull();
    const id = s().addFeedback({ subjectId: 'eng', date: todayISO(), about: ' Essay ', words: 'The thesis arrives late.' })!, mine = () => s().feedback.find((f) => f.id === id)!;
    expect(mine()).toMatchObject({ about: 'Essay', words: 'The thesis arrives late.', work: '' });
    s().updateFeedback(id, { words: '   ', work: 'Open with the thesis' }); expect(mine()).toMatchObject({ words: 'The thesis arrives late.', work: 'Open with the thesis' });
    const gone = s().deleteFeedback(id)!; expect(s().feedback.some((f) => f.id === id)).toBe(false);
    s().restoreFeedback(gone); expect(mine().about).toBe('Essay');
  });

  it('makes what to work on into one task', () => {
    const week = weekStartOf(todayISO(), 1), miles = milesLogged(s().log);
    const f = s().addFeedback({ subjectId: 'eng', date: todayISO(), words: 'The thesis arrives late.', work: 'Open with the thesis' })!, entry = () => s().feedback.find((x) => x.id === f)!;
    const t = s().makeFeedbackTask(f)!;
    expect(s().tasks.find((x) => x.id === t)).toMatchObject({ title: 'Open with the thesis', subjectId: 'eng', scope: 'week', date: week });
    expect(s().makeFeedbackTask(f)).toBeNull(); expect(feedbackTask(entry(), s().tasks)?.id).toBe(t);
    s().toggleTask(t); s().toggleTask(t); s().toggleTask(t); expect(milesLogged(s().log)).toBe(miles + 2);
    const gone = s().deleteTasks([t]); expect(feedbackTask(entry(), s().tasks)).toBeUndefined();
    s().restoreTasks(gone); expect(feedbackTask(entry(), s().tasks)?.id).toBe(t);
    s().deleteTasks([t]); const again = s().makeFeedbackTask(f)!; expect(again).not.toBe(t);
    const plain = s().addFeedback({ subjectId: 'eng', date: todayISO(), words: 'Good.' })!; expect(s().makeFeedbackTask(plain)).toBeNull();
    s().deleteFeedback(f); expect(s().tasks.some((x) => x.id === again)).toBe(true);
  });
});

describe("study detail: a subject's pages", () => {
  beforeEach(() => { s().resetSample(); });

  it('starts a page that already carries a subject', () => {
    const id = s().addPage('checklist', { title: 'Weak areas', subjectId: 'eng' });
    expect(s().pages.find((p) => p.id === id)).toMatchObject({ kind: 'checklist', title: 'Weak areas', subjectId: 'eng' });
    const stray = s().addPage('note', { subjectId: 'nowhere' }); expect(s().pages.find((p) => p.id === stray)!.subjectId).toBeUndefined();
    // started the old way, a page is untitled and has no subject
    const plain = s().addPage('note'); expect(s().pages.find((p) => p.id === plain)).toMatchObject({ title: 'Untitled' }); expect(s().pages.find((p) => p.id === plain)!.subjectId).toBeUndefined();
  });

  it('lists a page under its subject for as long as it carries it', () => {
    const id = s().addPage('checklist', { title: 'Weak areas', subjectId: 'chi' });
    expect(subjectPages(s().pages, 'chi').map((p) => p.id)).toEqual([id]);
    s().updatePage(id, { subjectId: null }); expect(subjectPages(s().pages, 'chi')).toEqual([]);
    s().updatePage(id, { subjectId: 'chi' });
    const gone = s().deletePage(id)!; expect(subjectPages(s().pages, 'chi')).toEqual([]);
    s().restorePage(gone); expect(subjectPages(s().pages, 'chi').map((p) => p.id)).toEqual([id]);
  });
});

import fixture from '../../fixtures/catalog.json';
import { indexCatalog, pathLessons, pathsOf, type Catalog } from '../catalog';
import { EMPTY_PROGRESS, type ProgressState } from '../progress';
import { followingLesson, nextLesson, recommendations, startingLesson } from '../recommend';

const catalog = fixture as Catalog;
const index = indexCatalog(catalog);
const paths = pathsOf(catalog);
const python = paths.find((p) => p.id === 'lang:python')!;
const start = paths.find((p) => p.kind === 'part')!;
const noPrefs = { interests: [], experience: null, startLessonId: null };

function completedAll(ids: string[], at = '2026-11-16T10:00:00Z'): ProgressState {
  return { ...EMPTY_PROGRESS, completed: Object.fromEntries(ids.map((id, i) => [id, { at: new Date(Date.parse(at) + i * 1000).toISOString(), code: '', attempts: 1 }])) };
}

describe('startingLesson', () => {
  it('starts a beginner at the first lesson', () => {
    expect(startingLesson(index, python, 'new')?.lesson.id).toBe(pathLessons(index, python)[0].id);
  });
  it('starts someone with experience at a higher level when the path has one', () => {
    const some = startingLesson(index, python, 'some')!;
    expect(some.track.level).toBe('Intermediate');
    const pro = startingLesson(index, python, 'experienced')!;
    expect(pro.track.level).toBe('Advanced');
  });
  it('falls back toward Beginner when a path has no higher level', () => {
    const ref = startingLesson(index, start, 'experienced');
    expect(ref).not.toBeNull();
  });
});

describe('nextLesson', () => {
  it('offers the default path first lesson to someone new with no choices', () => {
    expect(nextLesson(index, EMPTY_PROGRESS, noPrefs)?.lesson.id).toBe(pathLessons(index, start)[0].id);
  });
  it('honours the starting lesson from onboarding', () => {
    const id = pathLessons(index, python)[5].id;
    expect(nextLesson(index, EMPTY_PROGRESS, { ...noPrefs, startLessonId: id })?.lesson.id).toBe(id);
  });
  it('continues after the most recent completion on its path', () => {
    const lessons = pathLessons(index, python);
    const p = completedAll([lessons[0].id, lessons[1].id]);
    expect(nextLesson(index, p, noPrefs)?.lesson.id).toBe(lessons[2].id);
  });
  it('skips lessons already finished further along', () => {
    const lessons = pathLessons(index, python);
    const p = completedAll([lessons[3].id, lessons[0].id]);
    expect(nextLesson(index, p, noPrefs)?.lesson.id).toBe(lessons[1].id);
  });
  it('moves past a finished starting lesson to the chosen paths', () => {
    const lessons = pathLessons(index, python);
    const p: ProgressState = { ...EMPTY_PROGRESS, completed: {} };
    expect(nextLesson(index, p, { interests: ['lang:python'], experience: 'new', startLessonId: null })?.lesson.id).toBe(lessons[0].id);
  });
});

describe('recommendations', () => {
  it('suggests one lesson per other path, never the Continue lesson', () => {
    const next = nextLesson(index, EMPTY_PROGRESS, { ...noPrefs, interests: ['lang:python'] })!;
    const recs = recommendations(index, EMPTY_PROGRESS, { ...noPrefs, interests: ['lang:python', 'ai'] }, next.lesson.id, 3);
    expect(recs).toHaveLength(3);
    expect(recs.some((r) => r.ref.lesson.id === next.lesson.id)).toBe(false);
    expect(new Set(recs.map((r) => r.path.id)).size).toBe(3);
  });
});

describe('followingLesson', () => {
  it('is the next lesson in the track, or null at the end', () => {
    const order = index.order.get(catalog.tracks[1].id)!;
    expect(followingLesson(index, order[0].id)?.lesson.id).toBe(order[1].id);
    expect(followingLesson(index, order[order.length - 1].id)).toBeNull();
    expect(followingLesson(index, 'nope')).toBeNull();
  });
});

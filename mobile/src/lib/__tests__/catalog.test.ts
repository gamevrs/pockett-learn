import fixture from '../../fixtures/catalog.json';
import { completionOf, indexCatalog, isAiCourse, isCatalog, lessonForPath, pathLessons, pathsOf, searchLessons, shortPartTitle, type Catalog } from '../catalog';

const catalog = fixture as Catalog;
const index = indexCatalog(catalog);

describe('catalog', () => {
  it('accepts the generated fixture and rejects broken shapes', () => {
    expect(isCatalog(catalog)).toBe(true);
    expect(isCatalog(null)).toBe(false);
    expect(isCatalog({ version: 'x', tracks: [{ id: 'a', title: 'A', modules: [{ id: 'm', lessons: [{ id: 'l' }] }] }] })).toBe(false);
    expect(isCatalog({ version: 'x', tracks: [] })).toBe(true);
  });

  it('indexes every lesson by id and by path', () => {
    const first = catalog.tracks[0].modules[0].lessons[0];
    expect(index.byId.get(first.id)?.lesson).toBe(first);
    expect(index.byPath.get(first.path)?.lesson.id).toBe(first.id);
    const total = catalog.tracks.reduce((n, t) => n + t.modules.reduce((m, mod) => m + mod.lessons.length, 0), 0);
    expect([...index.order.values()].reduce((n, l) => n + l.length, 0)).toBe(total);
  });

  it('finds the lesson for site paths, embed paths and full links', () => {
    const fnd = catalog.tracks.find((t) => t.kind === 'foundations')!.modules[0].lessons[0];
    const course = catalog.tracks.find((t) => t.kind === 'course')!;
    const lesson = course.modules[0].lessons[0];
    expect(lessonForPath(index, fnd.path)?.lesson.id).toBe(fnd.id);
    expect(lessonForPath(index, `/embed${fnd.path}`)?.lesson.id).toBe(fnd.id);
    expect(lessonForPath(index, `https://www.pockett.ai${lesson.path}?x=1#top`)?.lesson.id).toBe(lesson.id);
    expect(lessonForPath(index, `pockett://${lesson.path.slice(1)}`)).toBeNull();
    expect(lessonForPath(index, `/projects/${course.id}`)).toBeNull();
    expect(lessonForPath(index, '/dashboard')).toBeNull();
  });

  it('counts completion per list', () => {
    const lessons = catalog.tracks[0].modules[0].lessons;
    expect(completionOf(lessons, {})).toEqual({ done: 0, total: lessons.length, fraction: 0 });
    const c = completionOf(lessons, { [lessons[0].id]: true });
    expect(c.done).toBe(1);
    expect(completionOf([], {}).fraction).toBe(0);
  });

  it('searches titles, best matches first, accent and case insensitive', () => {
    const target = catalog.tracks[0].modules[0].lessons[0];
    const word = target.title.split(' ')[0];
    const hits = searchLessons(index, word.toUpperCase());
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.lesson.id === target.id)).toBe(true);
    expect(searchLessons(index, '   ')).toEqual([]);
    expect(searchLessons(index, 'zzzz-no-such-lesson')).toEqual([]);
  });

  it('builds paths: Foundations parts, languages and AI', () => {
    const paths = pathsOf(catalog);
    expect(paths.filter((p) => p.kind === 'part').length).toBe(catalog.tracks[0].parts!.length);
    expect(paths.find((p) => p.id === 'lang:python')?.title).toBe('Python');
    const ai = paths.find((p) => p.kind === 'ai');
    expect(ai).toBeDefined();
    expect(ai!.trackIds.every((id) => isAiCourse(catalog.tracks.find((t) => t.id === id)!))).toBe(true);
    // AI courses are not also listed under their language
    expect(paths.find((p) => p.id === 'lang:python')!.trackIds.some((id) => ai!.trackIds.includes(id))).toBe(false);
    for (const p of paths) expect(pathLessons(index, p).length).toBeGreaterThan(0);
  });

  it('orders a language path from Beginner up', () => {
    const python = pathsOf(catalog).find((p) => p.id === 'lang:python')!;
    const levels = pathLessons(index, python).map((l) => index.byId.get(l.id)!.track.level);
    const rank = { Beginner: 0, Intermediate: 1, Advanced: 2, Professional: 3 } as const;
    for (let i = 1; i < levels.length; i++) expect(rank[levels[i]!]).toBeGreaterThanOrEqual(rank[levels[i - 1]!]);
  });

  it('shortens part titles at the colon', () => {
    expect(shortPartTitle('Hardware: how the CPU, memory and GPU really work')).toBe('Hardware');
    expect(shortPartTitle('Plain')).toBe('Plain');
  });
});

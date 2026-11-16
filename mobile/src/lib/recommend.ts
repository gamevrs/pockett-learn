/**
 * Which lesson to offer next. Pure: reads the catalog, the progress and the choices made in onboarding.
 */
import { levelOf, pathLessons, pathOfLesson, pathsOf, type CatalogIndex, type CatalogLesson, type Level, type LessonRef, type Path } from './catalog';
import { recentCompletions, type ProgressState } from './progress';

export type Experience = 'new' | 'some' | 'experienced';

export interface LearningPrefs {
  /** Path ids chosen in onboarding (see pathsOf), in the order chosen. */
  interests: string[];
  experience: Experience | null;
  /** The lesson onboarding recommended as a starting point. */
  startLessonId: string | null;
}

const FIRST_LEVEL: Record<Experience, Level[]> = {
  new: ['Beginner'],
  some: ['Intermediate', 'Beginner'],
  experienced: ['Advanced', 'Intermediate', 'Beginner'],
};

/**
 * Where someone starts on a path, from how much they have coded: the first lesson for a beginner, the first
 * lesson at the first level that suits their experience otherwise (falling back toward Beginner when a path has
 * no lessons at that level).
 */
export function startingLesson(index: CatalogIndex, path: Path, experience: Experience): LessonRef | null {
  const lessons = pathLessons(index, path);
  if (!lessons.length) return null;
  for (const level of FIRST_LEVEL[experience]) {
    const hit = lessons.find((l) => {
      const ref = index.byId.get(l.id);
      return ref && levelOf(ref) === level;
    });
    if (hit) return index.byId.get(hit.id) ?? null;
  }
  return index.byId.get(lessons[0].id) ?? null;
}

/** The default path for someone who chose nothing: the first Foundations part ("Start here"). */
export function defaultPath(paths: Path[]): Path | undefined {
  return paths.find((p) => p.kind === 'part') ?? paths[0];
}

function firstOpen(lessons: CatalogLesson[], completed: Record<string, unknown>, from = 0): CatalogLesson | undefined {
  for (let i = from; i < lessons.length; i++) if (!completed[lessons[i].id]) return lessons[i];
  return undefined;
}

/**
 * The one lesson Home's Continue card offers:
 *  1. after the lesson finished most recently, the next unfinished one on the same path;
 *  2. else the starting lesson onboarding recommended, if it is still unfinished;
 *  3. else the first unfinished lesson on the paths chosen in onboarding, in order;
 *  4. else the first unfinished lesson anywhere.
 */
export function nextLesson(index: CatalogIndex, progress: ProgressState, prefs: LearningPrefs): LessonRef | null {
  const paths = pathsOf(index.catalog);
  const done = progress.completed;
  const pick = (l: CatalogLesson | undefined) => (l ? (index.byId.get(l.id) ?? null) : null);

  for (const recent of recentCompletions(progress, 1)) {
    const ref = index.byId.get(recent.id);
    if (!ref) continue;
    const path = pathOfLesson(paths, ref);
    if (path) {
      const lessons = pathLessons(index, path);
      const at = lessons.findIndex((l) => l.id === ref.lesson.id);
      const hit = firstOpen(lessons, done, at + 1) ?? firstOpen(lessons, done);
      if (hit) return pick(hit);
    }
  }
  if (prefs.startLessonId && !done[prefs.startLessonId]) {
    const ref = index.byId.get(prefs.startLessonId);
    if (ref) return ref;
  }
  const chosen = prefs.interests.map((id) => paths.find((p) => p.id === id)).filter((p): p is Path => !!p);
  for (const path of chosen.length ? chosen : [defaultPath(paths)].filter((p): p is Path => !!p)) {
    const hit = firstOpen(pathLessons(index, path), done);
    if (hit) return pick(hit);
  }
  for (const track of index.catalog.tracks) {
    const hit = firstOpen(index.order.get(track.id) ?? [], done);
    if (hit) return pick(hit);
  }
  return null;
}

/**
 * A few next steps besides the Continue lesson: the first unfinished lesson on each other chosen path (then the
 * default path), never repeating the Continue lesson.
 */
export function recommendations(index: CatalogIndex, progress: ProgressState, prefs: LearningPrefs, exclude: string | null, limit = 3): { ref: LessonRef; path: Path }[] {
  const paths = pathsOf(index.catalog);
  const chosen = prefs.interests.map((id) => paths.find((p) => p.id === id)).filter((p): p is Path => !!p);
  const pool = [...chosen, ...paths.filter((p) => !chosen.includes(p))];
  const out: { ref: LessonRef; path: Path }[] = [];
  const seen = new Set<string>(exclude ? [exclude] : []);
  for (const path of pool) {
    if (out.length >= limit) break;
    const hit = pathLessons(index, path).find((l) => !progress.completed[l.id] && !seen.has(l.id));
    const ref = hit ? index.byId.get(hit.id) : undefined;
    if (ref) {
      out.push({ ref, path });
      seen.add(ref.lesson.id);
    }
  }
  return out;
}

/** The lesson after this one in its track (for the celebration's Next lesson button), finished or not. */
export function followingLesson(index: CatalogIndex, lessonId: string): LessonRef | null {
  const ref = index.byId.get(lessonId);
  if (!ref) return null;
  const order = index.order.get(ref.track.id) ?? [];
  const next = order[ref.index + 1];
  return next ? (index.byId.get(next.id) ?? null) : null;
}

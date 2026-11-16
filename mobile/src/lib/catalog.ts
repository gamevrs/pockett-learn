/**
 * The catalog (contract §1): every track, module and lesson the site has, without lesson bodies. Pure helpers
 * only; fetching and caching live in ~/state/catalog.
 */

export type Level = 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional';
export const LEVELS: Level[] = ['Beginner', 'Intermediate', 'Advanced', 'Professional'];

export interface CatalogLesson {
  id: string;
  title: string;
  level?: Level;
  minutes?: number;
  xp?: number;
  steps?: number;
  /** The lesson's real path on the site: /learn/<id> or /projects/<slug>/<lesson>. */
  path: string;
}

export interface CatalogModule {
  id: string;
  title: string;
  blurb?: string;
  lessons: CatalogLesson[];
}

export interface CatalogPart {
  id: string;
  title: string;
  blurb?: string;
  moduleIds: string[];
}

export interface CatalogTrack {
  id: string;
  title: string;
  blurb?: string;
  kind: 'foundations' | 'course';
  language?: string;
  level?: Level;
  /** Optional: a cross-language path the course belongs to ("ai"); the site sends `group`. */
  group?: string;
  track?: string;
  parts?: CatalogPart[];
  modules: CatalogModule[];
}

export interface Catalog {
  version: string;
  generatedAt?: string;
  tracks: CatalogTrack[];
  playground?: { path: string };
}

export interface LessonRef {
  lesson: CatalogLesson;
  track: CatalogTrack;
  module: CatalogModule;
  /** Position in its track's lesson order. */
  index: number;
}

export interface CatalogIndex {
  catalog: Catalog;
  byId: Map<string, LessonRef>;
  byPath: Map<string, LessonRef>;
  /** Each track's lessons in order. */
  order: Map<string, CatalogLesson[]>;
  modules: Map<string, { module: CatalogModule; track: CatalogTrack }>;
}

/** Validates the shape loosely: a catalog with any missing piece is rejected, never half-shown. */
export function isCatalog(raw: unknown): raw is Catalog {
  if (!raw || typeof raw !== 'object') return false;
  const c = raw as Partial<Catalog>;
  if (typeof c.version !== 'string' || !Array.isArray(c.tracks)) return false;
  return c.tracks.every(
    (t) =>
      t &&
      typeof t.id === 'string' &&
      typeof t.title === 'string' &&
      Array.isArray(t.modules) &&
      t.modules.every((m) => m && typeof m.id === 'string' && Array.isArray(m.lessons) && m.lessons.every((l) => l && typeof l.id === 'string' && typeof l.path === 'string')),
  );
}

export function indexCatalog(catalog: Catalog): CatalogIndex {
  const byId = new Map<string, LessonRef>();
  const byPath = new Map<string, LessonRef>();
  const order = new Map<string, CatalogLesson[]>();
  const modules = new Map<string, { module: CatalogModule; track: CatalogTrack }>();
  for (const track of catalog.tracks) {
    const list: CatalogLesson[] = [];
    for (const module of track.modules) {
      modules.set(moduleKey(track, module), { module, track });
      for (const lesson of module.lessons) {
        const ref = { lesson, track, module, index: list.length };
        list.push(lesson);
        if (!byId.has(lesson.id)) byId.set(lesson.id, ref);
        byPath.set(normalizePath(lesson.path), ref);
      }
    }
    order.set(track.id, list);
  }
  return { catalog, byId, byPath, order, modules };
}

/**
 * A module's key in the index and in routes: a Foundations module's own id (unique across the track), or
 * <course>/<chapter> for a course's chapter (chapter ids repeat across courses).
 */
export function moduleKey(track: CatalogTrack, module: CatalogModule): string {
  return track.kind === 'foundations' || module.id.startsWith(`${track.id}/`) ? module.id : `${track.id}/${module.id}`;
}

function normalizePath(path: string): string {
  const bare = path.split(/[?#]/)[0].replace(/\/+$/, '');
  return bare.startsWith('/') ? bare : `/${bare}`;
}

/**
 * Which lesson a site path or link points at: /learn/<id>, /projects/<slug>/<lesson>, the /embed/ form of either,
 * or a full https://www.pockett.ai/... URL. Null for anything else (a project's hub page, /dashboard...).
 */
export function lessonForPath(index: CatalogIndex, pathOrUrl: string): LessonRef | null {
  let path = pathOrUrl;
  const m = /^[a-z][a-z0-9+.-]*:\/\/[^/]*(\/.*)?$/i.exec(pathOrUrl);
  if (m) path = m[1] ?? '/';
  path = normalizePath(path);
  if (path.startsWith('/embed/')) path = path.slice('/embed'.length);
  const hit = index.byPath.get(path);
  if (hit) return hit;
  const learn = /^\/learn\/([^/]+)$/.exec(path);
  if (learn) return index.byId.get(decodeURIComponent(learn[1])) ?? null;
  const project = /^\/projects\/[^/]+\/([^/]+)$/.exec(path);
  if (project) return index.byId.get(decodeURIComponent(project[1])) ?? null;
  return null;
}

export interface Completion {
  done: number;
  total: number;
  /** 0..1 */
  fraction: number;
}

export function completionOf(lessons: CatalogLesson[], completed: Record<string, unknown>): Completion {
  const total = lessons.length;
  const done = lessons.reduce((n, l) => (completed[l.id] ? n + 1 : n), 0);
  return { done, total, fraction: total ? done / total : 0 };
}

export function trackLessons(track: CatalogTrack): CatalogLesson[] {
  return track.modules.flatMap((m) => m.lessons);
}

/** Lessons whose title matches every word of the query (case and accent insensitive), best matches first. */
export function searchLessons(index: CatalogIndex, query: string, limit = 50): LessonRef[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits: { ref: LessonRef; score: number }[] = [];
  for (const ref of index.byId.values()) {
    const title = fold(ref.lesson.title);
    const where = `${title} ${fold(ref.module.title)} ${fold(ref.track.title)}`;
    if (!words.every((w) => where.includes(w))) continue;
    const score = (title.startsWith(words[0]) ? 0 : 2) + (words.every((w) => title.includes(w)) ? 0 : 1);
    hits.push({ ref, score });
  }
  hits.sort((a, b) => a.score - b.score || a.ref.lesson.title.localeCompare(b.ref.lesson.title));
  return hits.slice(0, limit).map((h) => h.ref);
}

function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** The lesson's level: its own, or its course's. */
export function levelOf(ref: Pick<LessonRef, 'lesson' | 'track'>): Level | undefined {
  return ref.lesson.level ?? ref.track.level;
}

/** Does this module have any lesson at the given level (or any level when null)? */
export function moduleHasLevel(module: CatalogModule, track: CatalogTrack, level: Level | null): boolean {
  if (!level) return true;
  return module.lessons.some((l) => (l.level ?? track.level) === level);
}

export const LANGUAGE_NAMES: Record<string, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  sql: 'SQL',
  csharp: 'C#',
  cpp: 'C++',
  go: 'Go',
  rust: 'Rust',
};

export function languageName(id: string | undefined): string {
  if (!id) return '';
  return LANGUAGE_NAMES[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

/** A course on the AI path (the `track` field when the catalog has it, else the site's ai- slugs). */
export function isAiCourse(track: CatalogTrack): boolean {
  const group = track.group ?? track.track;
  return track.kind === 'course' && (group === 'ai' || (group === undefined && track.id.startsWith('ai-')));
}

/**
 * What a learner can pick from in onboarding and Learn's top level: each Foundations part, each language's
 * courses, and the AI path. Ids are stable strings saved in settings.
 */
export interface Path {
  id: string;
  title: string;
  blurb: string;
  kind: 'part' | 'language' | 'ai';
  /** The tracks (courses) or modules (Foundations part) it holds, in order. */
  trackIds: string[];
  moduleIds: string[];
}

export function pathsOf(catalog: Catalog): Path[] {
  const out: Path[] = [];
  const foundations = catalog.tracks.find((t) => t.kind === 'foundations');
  if (foundations) {
    for (const part of foundations.parts ?? []) {
      out.push({ id: `part:${part.id}`, title: shortPartTitle(part.title), blurb: part.blurb ?? '', kind: 'part', trackIds: [foundations.id], moduleIds: part.moduleIds });
    }
  }
  const languages = new Map<string, CatalogTrack[]>();
  const ai: CatalogTrack[] = [];
  for (const t of catalog.tracks) {
    if (t.kind !== 'course') continue;
    if (isAiCourse(t)) ai.push(t);
    else {
      const key = t.language ?? 'other';
      languages.set(key, [...(languages.get(key) ?? []), t]);
    }
  }
  for (const [lang, tracks] of languages) {
    const levels = LEVELS.filter((l) => tracks.some((t) => t.level === l));
    const span = levels.length > 1 ? `${levels[0]} to ${levels[levels.length - 1]}` : (levels[0] ?? '');
    const count = `${tracks.length} ${tracks.length === 1 ? 'course' : 'courses'}`;
    out.push({ id: `lang:${lang}`, title: languageName(lang), blurb: span ? `${count}, ${span}` : count, kind: 'language', trackIds: tracks.map((t) => t.id), moduleIds: [] });
  }
  if (ai.length) out.push({ id: 'ai', title: 'AI and machine learning', blurb: `${ai.length} ${ai.length === 1 ? 'course' : 'courses'}, from first steps to neural networks`, kind: 'ai', trackIds: ai.map((t) => t.id), moduleIds: [] });
  return out;
}

/** "Hardware: how the CPU, memory and GPU really work" → "Hardware". Parts read as one word or two in lists. */
export function shortPartTitle(title: string): string {
  const head = title.split(':')[0].trim();
  return head.length <= 28 ? head : title;
}

/** The lessons a path holds, in learning order. */
export function pathLessons(index: CatalogIndex, path: Path): CatalogLesson[] {
  if (path.kind === 'part') {
    return path.moduleIds.flatMap((id) => index.modules.get(id)?.module.lessons ?? []);
  }
  const tracks = path.trackIds.map((id) => index.catalog.tracks.find((t) => t.id === id)).filter((t): t is CatalogTrack => !!t);
  tracks.sort((a, b) => LEVELS.indexOf(a.level ?? 'Beginner') - LEVELS.indexOf(b.level ?? 'Beginner'));
  return tracks.flatMap(trackLessons);
}

export function pathOfLesson(paths: Path[], ref: LessonRef): Path | undefined {
  if (ref.track.kind === 'foundations') return paths.find((p) => p.kind === 'part' && p.moduleIds.includes(ref.module.id));
  return paths.find((p) => p.kind !== 'part' && p.trackIds.includes(ref.track.id));
}

/**
 * Core contracts for pockett's "living project" engine.
 *
 * A Project is plain serializable data (so it can be served from an API / DB later).
 * Its `sceneId` points at a React scene that renders the live demo. The learner's
 * Python program drives that scene, and every lesson `unlocks` scene features.
 */

import type { Question } from "../learn/types.ts";

/** The tier a project sits on in its language's path, zero to hero. */
export type Difficulty = "Beginner" | "Intermediate" | "Advanced" | "Professional";

/** Tiers in path order. */
export const TIERS: Difficulty[] = ["Beginner", "Intermediate", "Advanced", "Professional"];

/** Languages a project can be written in. See src/engine/languages.ts for what each supports. */
export type LanguageId = "python" | "javascript" | "sql" | "csharp" | "cpp" | "go" | "rust";

/** Cross-language learning tracks. A tracked project is shown on its track's path, not its language's. */
export type Track = "ai";

export interface TestCase {
  id: string;
  description: string;
  /**
   * Check code in the project's test language (see the runtime): Python `assert` for Python
   * projects; JavaScript using `assert(cond, msg)` / `assertEqual(actual, expected, msg)` for
   * JavaScript and SQL projects.
   */
  assertionCode: string;
}

export interface Hint {
  id: string;
  title: string;
  content: string;
}

/** A piece of the live demo that "comes alive" when a lesson is passed. */
export interface Feature {
  id: string;
  title: string;
  blurb: string;
  emoji: string;
}

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  xp: number;
  /** Short skill tags, e.g. ["variables", "strings"] */
  concepts: string[];
  /** Mini-markdown explaining the concept. */
  learn: string;
  /** Mini-markdown mission story: why this matters for the project. */
  mission: string;
  tasks: string[];
  /**
   * New code appended to the project file. The editor shows
   * (previous lesson's code) + starterAdd. Begin it with the YOUR_TURN marker.
   */
  starterAdd: string;
  /** Reference solution for just this lesson's addition. */
  solutionAdd: string;
  explanation: string;
  hints: Hint[];
  tests: TestCase[];
  /** Feature ids that come alive when this lesson is passed. */
  unlocks: string[];
  /**
   * Optional "Check your understanding" questions shown at the end of the Learn tab. They are
   * ungraded for progress (they never gate Submit): quick retrieval practice on the concept.
   */
  checks?: LessonCheck[];
}

export interface LessonCheck {
  /** The question shown above the answer input. Mini-markdown, inline code allowed. */
  prompt: string;
  question: Question;
  /** Shown once the learner answers (or reveals) it. */
  explanation: string;
}

export interface Chapter {
  id: string;
  title: string;
  blurb: string;
  lessons: Lesson[];
}

export interface Project {
  slug: string;
  /** Language the learner writes. Defaults to "python". */
  language?: LanguageId;
  /** Hidden code run before the learner's (e.g. SQL schema + seed data). */
  setup?: string;
  /**
   * Python only: Pyodide packages to load before running, e.g. ["sqlite3"]. They are fetched once
   * per page and cached. The content validator runs Python in local CPython and warns if a
   * listed package cannot be imported there.
   *
   * An entry written "micropip:name==1.2.3" is a pure-Python PyPI wheel (always pin an exact
   * version) installed once per page with micropip, e.g. "micropip:graphql-core==3.2.13". The
   * validator checks (and if needed pip-installs) that exact version locally.
   */
  packages?: string[];
  /** Slugs of projects worth finishing first. Shown on the hub as "Recommended first". */
  prerequisites?: string[];
  /**
   * A cross-language track this project belongs to. Tracked projects form their own path on the
   * projects page (e.g. "ai" = AI & Machine Learning) instead of appearing in the path of their
   * language.
   */
  track?: Track;
  title: string;
  tagline: string;
  pitch: string;
  emoji: string;
  difficulty: Difficulty;
  hours: number;
  /** Key into the scene registry. */
  sceneId: string;
  /** CSS colors used to theme the project's UI. */
  accent: { from: string; to: string };
  /** Human readable control hints for the scene, e.g. "W / ↑ — accelerate" */
  controls: string[];
  skills: string[];
  features: Feature[];
  chapters: Chapter[];
}

export interface UpcomingProject {
  slug: string;
  language?: LanguageId;
  /** See `Project.track`. */
  track?: Track;
  /** The tier it will sit on in its language's path. */
  difficulty?: Difficulty;
  /** What it will teach, as short tags. */
  skills?: string[];
  title: string;
  tagline: string;
  emoji: string;
  accent: { from: string; to: string };
}

export interface TestResult {
  testId: string;
  description: string;
  passed: boolean;
  error?: string;
}

export interface RunError {
  type: string;
  message: string;
  line: number | null;
}

/** Marker every `starterAdd` begins with; the editor scrolls to it. */
export const YOUR_TURN_MARKER = "✏️ YOUR TURN";

export function flattenLessons(project: Project): Lesson[] {
  return project.chapters.flatMap((c) => c.lessons);
}

export function featuresUnlockedBy(project: Project, completed: Iterable<string>): Set<string> {
  const done = new Set(completed);
  const out = new Set<string>();
  for (const lesson of flattenLessons(project)) {
    if (done.has(lesson.id)) lesson.unlocks.forEach((f) => out.add(f));
  }
  return out;
}

export function languageOf(project: Pick<Project, "language">): LanguageId {
  return project.language ?? "python";
}

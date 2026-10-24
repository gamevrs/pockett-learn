/**
 * Core contracts for pockett's "living project" engine.
 *
 * A Project is plain serializable data (so it can be served from an API / DB later).
 * Its `sceneId` points at a React scene that renders the live demo. The learner's
 * Python program drives that scene, and every lesson `unlocks` scene features.
 */

export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface TestCase {
  id: string;
  description: string;
  /** Python executed in the learner's namespace after their code. Use `assert`. */
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
}

export interface Chapter {
  id: string;
  title: string;
  blurb: string;
  lessons: Lesson[];
}

export interface Project {
  slug: string;
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

import type { LanguageId, TestCase } from "../engine/types.ts";

/**
 * Foundations: concept lessons made of small interactive steps (Brilliant-style). One idea per
 * step, every step asks the learner to *do* something: flip bits, step through code, build an
 * object, wire up a pattern, answer a question, or write a few lines that get checked.
 *
 * Plain serializable data (like projects). Widgets are referenced by `type` and rendered from
 * the registry in src/learn/widgets.
 */

export interface WidgetSpec {
  /** Key in the widget registry, e.g. "bits", "trace", "observer". */
  type: string;
  props?: Record<string, unknown>;
  /** Keep the widget playable after the question is answered (e.g. "predict, then try it"). */
  live?: boolean;
}

export type Question =
  /** One correct option (answer = index) or several (answer = indexes, all must be picked). */
  | { type: "choice"; options: string[]; answer: number | number[] }
  | { type: "number"; answer: number; tolerance?: number; unit?: string }
  /** Accepted answers, compared trimmed and case-insensitively. */
  | { type: "text"; answer: string[]; placeholder?: string }
  /** Put the items in the right order (items are listed here in the correct order; shown shuffled). */
  | { type: "order"; items: string[] }
  /** Get the step's widget into a target state; the widget's `check(state, goal)` decides. */
  | { type: "widget"; goal: Record<string, unknown>; prompt?: string };

export type Step =
  /** Read and play: an explanation, optionally with a widget to explore freely. */
  | { kind: "explain"; title?: string; body: string; widget?: WidgetSpec }
  /** A question, optionally about a widget. `explanation` is shown after answering. */
  | { kind: "question"; title?: string; body?: string; widget?: WidgetSpec; question: Question; explanation: string }
  /** Write code that is checked by tests (same engines and check format as projects). */
  | {
      kind: "code";
      title?: string;
      body: string;
      language: LanguageId;
      starter: string;
      solution: string;
      tests: TestCase[];
      hints?: string[];
    }
  /** Closing summary of the lesson's key ideas. */
  | { kind: "recap"; title?: string; points: string[] };

export interface ConceptLesson {
  /** Globally unique, prefixed "fnd-". Used as the progress key. */
  id: string;
  title: string;
  /** One line for lesson lists. */
  summary: string;
  minutes: number;
  xp: number;
  steps: Step[];
}

export interface Module {
  id: string;
  title: string;
  blurb: string;
  /** Lucide icon name key from src/learn/module-icons.ts. */
  icon: string;
  lessons: ConceptLesson[];
}

export interface Track {
  slug: string;
  title: string;
  tagline: string;
  modules: Module[];
}

export function trackLessons(track: Track): ConceptLesson[] {
  return track.modules.flatMap((m) => m.lessons);
}

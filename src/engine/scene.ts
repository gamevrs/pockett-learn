import type { ProgramHandle } from "./program";

export interface Celebration {
  /** Changes every time something new unlocks, so scenes can replay a flourish. */
  nonce: number;
  features: string[];
}

export interface SceneEvent {
  kind: "info" | "milestone";
  message: string;
}

/**
 * Props every scene receives. A scene is a client component that renders the live demo
 * for one project and nothing else (the surrounding chrome is <StageShell/>).
 *
 * Rules of the road for scene authors:
 *  - Read learner data only through `program` (num/str/list/dict/call). Everything may be
 *    missing or the wrong type; fall back to a sensible default.
 *  - A feature is "alive" only if `unlocked.has(id)`. Until then render it as a ghost /
 *    blueprint so learners can see what they are building towards.
 *  - Call hooks (`program.call`) only when the matching feature is unlocked and
 *    `program.hasHook(name)` is true.
 *  - When `program` changes (new `generation`), reset the simulation.
 */
export interface SceneProps {
  program: ProgramHandle | null;
  unlocked: ReadonlySet<string>;
  /** The feature the current lesson is about; scenes may spotlight it. */
  focus: string | null;
  celebration: Celebration | null;
  /** False for non-interactive previews (e.g. landing-page thumbnails). */
  interactive: boolean;
  /** Scene should demonstrate itself (e.g. engage the autopilot) without any input. */
  autoplay?: boolean;
  onEvent?: (event: SceneEvent) => void;
}

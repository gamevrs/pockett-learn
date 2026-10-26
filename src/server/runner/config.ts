/**
 * Shared constants for the compiled-language runner (C#, C++, Go, Rust).
 *
 * Everything in src/server/runner is written so it can be imported by Node directly
 * (relative imports with .ts extensions, erasable TypeScript only): the unit tests and
 * scripts/runner/*.mjs load these files without a bundler.
 */

export type RunnerLanguage = "csharp" | "cpp" | "go" | "rust";

/** The file the learner's code is written to. Never wrapped, so compiler line numbers are the learner's. */
export const LANGUAGES: Record<RunnerLanguage, { file: string; label: string }> = {
  csharp: { file: "Program.cs", label: "C#" },
  cpp: { file: "main.cpp", label: "C++" },
  go: { file: "main.go", label: "Go" },
  rust: { file: "main.rs", label: "Rust" },
};

export function isRunnerLanguage(value: unknown): value is RunnerLanguage {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(LANGUAGES, value);
}

export const LIMITS = {
  /** Bytes of source accepted. */
  maxSource: 64 * 1024,
  /** Bytes of stdin accepted. */
  maxStdin: 64 * 1024,
  /** Bytes of stdout returned (more is cut off). */
  maxOutput: 100_000,
  /** Bytes of stderr / compiler output returned. */
  maxStderr: 20_000,
  compileSeconds: 10,
  runSeconds: 3,
} as const;

export const TIMEOUT_MESSAGE = "Your program ran for too long and was stopped. Is there a loop that never ends?";
/** Shown when the snapshot in use predates a language (run.sh there answers "unsupported language"). */
export const UNAVAILABLE_MESSAGE = "This language isn't available to run yet. Please try again later.";
export const COMPILE_TIMEOUT_MESSAGE = "Compiling took too long and was stopped.";

/** Where provisioning puts things inside the snapshot. */
export const SNAPSHOT_PATHS = {
  root: "/opt/pockett",
  runScript: "/opt/pockett/run.sh",
} as const;

/** Response shape of POST /api/run (the browser side is src/engine/runtimes/remote.ts). */
export interface RunResponse {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  compileError: string | null;
  timedOut: boolean;
}

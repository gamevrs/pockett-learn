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
  maxSource: 160 * 1024,
  /** Bytes of stdin accepted. */
  maxStdin: 64 * 1024,
  /** Bytes of stdout returned (more is cut off). */
  maxOutput: 100_000,
  /** Bytes of stderr / compiler output returned. */
  maxStderr: 20_000,
  compileSeconds: 10,
  runSeconds: 3,
} as const;

/**
 * ---- Cost controls (see docs/ARCHITECTURE.md, "Cost controls") ----
 * Sandboxes bill for wall-clock time while running, so every one gets a hard platform lifetime
 * (the `timeout` it is created with) that is as short as its job allows, a name that says what it is
 * for, and a sweeper (/api/run/sweep) that stops anything older than its kind's threshold.
 */

/** Name prefixes: `pk-<kind>-<random>`. The sweeper uses them to tell our sandboxes apart and apply per-kind limits. */
export const SANDBOX_NAME_PREFIX = "pk-";
export type SandboxKind = "run" | "pool" | "setup";
export const SANDBOX_KINDS: readonly SandboxKind[] = ["run", "pool", "setup"];

/**
 * Hard lifetime of a one-shot ("fresh") run sandbox, set as its platform `timeout`. This is the BILLING
 * CEILING PER RUN: even if the function dies before it can stop the VM, the platform stops it after this long.
 * It is compile budget + run budget + a small margin for write/teardown (about 25 s), derived from LIMITS so
 * changing a budget moves it too.
 */
export const RUN_SANDBOX_TIMEOUT_MS = (LIMITS.compileSeconds + LIMITS.runSeconds + 12) * 1000;
/**
 * Backstop on the runCommand call. Kept below RUN_SANDBOX_TIMEOUT_MS so the request gives up (and its VM
 * is stopped by `finally`) before the platform has to do it. The in-VM `timeout`s are the real limits.
 */
export const RUN_COMMAND_TIMEOUT_MS = (LIMITS.compileSeconds + LIMITS.runSeconds + 10) * 1000;

/** Pool mode (RUNNER_MODE=pool): how long a warm VM is reused, and how many runs it serves. */
export const POOL_MAX_AGE_MS = 4 * 60_000;
export const POOL_MAX_USES = 40;
/** A pooled VM with no run for this long is stopped (by an after()-deferred check), so idle cost is bounded. */
export const POOL_IDLE_MS = 40_000;
/** Hard lifetime of a pool VM: its max age plus 30 s so a run in flight at the age limit can finish. */
export const POOL_SANDBOX_TIMEOUT_MS = POOL_MAX_AGE_MS + 30_000;

/** Hard lifetime of the snapshot-build sandbox (installing toolchains is slow). */
export const SETUP_SANDBOX_TIMEOUT_MS = 20 * 60_000;

/** The sweeper stops a RUNNING sandbox older than its kind's limit (well past the platform timeout; this is only a backstop). */
export const SWEEP_MAX_AGE_MS: Record<SandboxKind, number> = {
  run: 2 * 60_000,
  pool: POOL_SANDBOX_TIMEOUT_MS + 2 * 60_000,
  setup: 25 * 60_000,
};
/** Sandboxes without one of our name prefixes (e.g. created by older code): stopped after this long. */
export const SWEEP_MAX_AGE_ANY_MS = 25 * 60_000;
/** The sweeper stops looking at sandboxes created longer ago than this (list is newest first). */
export const SWEEP_LOOKBACK_MS = 24 * 60 * 60_000;

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

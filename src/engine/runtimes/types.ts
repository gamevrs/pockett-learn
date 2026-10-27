import type { ProgramHandle } from "../program";
import type { LanguageId, RunError, TestCase, TestResult } from "../types";

export type StatusListener = (message: string) => void;

export interface RunOptions {
  onStatus?: StatusListener;
  /** Hidden code that runs first (Project.setup), e.g. a SQL schema and seed rows. */
  setup?: string;
  /** Compiled languages only: hidden code compiled in front of the learner's source (Project.prelude). */
  prelude?: string;
  /** Python only: Pyodide packages to load first (e.g. "sqlite3"). Loaded once, then cached. */
  packages?: string[];
  /** Python and JavaScript (they run in the code frame): false when only the output is wanted, so no live program is kept. Default true. */
  keep?: boolean;
  /** Remote (compiled-language) runs only: aborting it rejects with RunCancelled. */
  signal?: AbortSignal;
}

export interface RunOutcome {
  stdout: string;
  error: RunError | null;
  durationMs: number;
  /** Present when the program ran without crashing. Caller owns it (dispose when done). */
  program: ProgramHandle | null;
}

export interface GradeOutcome {
  stdout: string;
  error: RunError | null;
  results: TestResult[];
  allPassed: boolean;
  durationMs: number;
}

/**
 * A language runtime. Every runtime turns source code into the same two things the rest of
 * the app understands: a live ProgramHandle that drives the scene (run) and test results (grade).
 * Adding a language = implementing this interface + registering it in runtimes/index.ts.
 */
export interface Runtime {
  readonly language: LanguageId;
  /** Warm up (download engines) without blocking. Safe to call repeatedly. `eager` skips the wait for an idle moment. */
  preload(eager?: boolean): void;
  run(source: string, options?: RunOptions): Promise<RunOutcome>;
  /** Runs in an isolated environment so tests can't disturb the live scene. */
  grade(source: string, tests: TestCase[], options?: RunOptions): Promise<GradeOutcome>;
}

/** Shared helper: every test fails with the same message when the program itself crashed. */
export function crashedResults(tests: TestCase[]): TestResult[] {
  return tests.map((t) => ({
    testId: t.id,
    description: t.description,
    passed: false,
    error: "Your code stopped with an error before this check could run.",
  }));
}

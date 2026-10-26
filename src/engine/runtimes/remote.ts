import { createStaticProgram } from "../program";
import { crashedResults, type Runtime } from "./types";
import { parseOutput, runChecks, toError, type RemoteResult } from "./remote-output";
import type { LanguageId } from "../types";

/**
 * Compiled languages (C#, C++, Go, Rust) run on the pockett runner: /api/run compiles and runs the source
 * in a Vercel Sandbox microVM (src/server/runner). The file is compiled exactly as written, so the
 * line numbers in compiler errors and stack traces are the learner's own. Programs can't be called
 * back synchronously from a scene, so scenes read what the program printed: `stdout`, plus any lines
 * of the form `@scene {json}` merged into the program's variables.
 *
 * When the build or the run fails, the scene still gets a program: it holds no `@scene` data but a
 * `build_error` variable ({ type, message, line }) so the scene can show the failure on its own
 * console. The parsing and check semantics live in remote-output.ts, shared with the validator.
 *
 * Checks are JavaScript over the output: `stdout`, `lines`, `scene` (merged @scene data), and the
 * assert helpers.
 */

async function execute(language: LanguageId, source: string, setup?: string): Promise<RemoteResult> {
  const res = await fetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, source, stdin: setup ?? "" }),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<RemoteResult> & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Could not run your code right now (${res.status}). Try again in a moment.`);
  return { stdout: data.stdout ?? "", stderr: data.stderr ?? "", exitCode: data.exitCode ?? null, compileError: data.compileError ?? null, timedOut: data.timedOut };
}

export function remoteRuntime(language: LanguageId): Runtime {
  return {
    language,
    preload() {},
    async run(source, options) {
      const started = performance.now();
      options?.onStatus?.("Compiling and running…");
      const r = await execute(language, source, options?.setup);
      const out = parseOutput(r.stdout);
      const error = toError(r);
      const durationMs = Math.round(performance.now() - started);
      const vars = error ? { ...out.scene, build_error: { type: error.type, message: error.message, line: error.line } } : out.scene;
      return { stdout: out.text, error, durationMs, program: createStaticProgram({ stdout: out.text, vars }) };
    },
    async grade(source, tests, options) {
      const started = performance.now();
      options?.onStatus?.("Checking your work…");
      const r = await execute(language, source, options?.setup);
      const out = parseOutput(r.stdout);
      const error = toError(r);
      const results = error ? crashedResults(tests) : runChecks(out.text, out.scene, tests);
      return { stdout: out.text, error, results, allPassed: !error && results.length > 0 && results.every((x) => x.passed), durationMs: Math.round(performance.now() - started) };
    },
  };
}

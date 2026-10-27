import { createStaticProgram } from "../program";
import { crashedResults, type Runtime } from "./types";
import { parseOutput, prepareSource, runChecks, shiftResult, toError, type RemoteResult } from "./remote-output";
import { RunCancelled, ServiceError } from "./service-error";
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

/**
 * Client-side budget for one request: the runner allows 10 s to compile and 3 s to run, plus sandbox
 * start-up and teardown. Past this the request is abandoned and the learner sees a calm "took too long"
 * state instead of a spinner that never ends.
 */
export const REMOTE_TIMEOUT_MS = 25_000;

function parseRetryAfter(header: string | null, body: { retryAfter?: unknown }): number | null {
  const fromHeader = header === null ? NaN : Number(header);
  const raw = Number.isFinite(fromHeader) ? fromHeader : Number(body.retryAfter);
  return Number.isFinite(raw) && raw > 0 ? Math.min(Math.ceil(raw), 120) : null;
}

/** Runs one request. Rejects with ServiceError (runner trouble), RunCancelled (the learner pressed Cancel) or nothing else. */
async function execute(language: LanguageId, source: string, setup?: string, signal?: AbortSignal): Promise<RemoteResult> {
  if (signal?.aborted) throw new RunCancelled();
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REMOTE_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    let res: Response;
    try {
      res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, source, stdin: setup ?? "" }),
        signal: controller.signal,
      });
    } catch {
      if (timedOut) throw new ServiceError("timeout");
      if (controller.signal.aborted) throw new RunCancelled();
      throw new ServiceError("offline");
    }

    let data: Partial<RemoteResult> & { error?: string; retryAfter?: unknown } = {};
    try {
      data = (await res.json()) as typeof data;
    } catch {
      // Headers arrived but the body did not (hang or cut connection), or it is not JSON (a gateway error page).
      if (timedOut) throw new ServiceError("timeout");
      if (controller.signal.aborted) throw new RunCancelled();
    }

    if (!res.ok) {
      if (res.status === 429) throw new ServiceError("busy", { retryAfter: parseRetryAfter(res.headers.get("Retry-After"), data) });
      if (res.status === 408 || res.status === 504) throw new ServiceError("timeout");
      if (res.status === 400 || res.status === 413) throw new ServiceError("rejected", { detail: typeof data.error === "string" ? data.error : null });
      throw new ServiceError("unavailable", { retryAfter: parseRetryAfter(res.headers.get("Retry-After"), data) });
    }
    if (typeof data.stdout !== "string" && data.exitCode === undefined && data.compileError === undefined) {
      // 200 with something that is not a runner result (for example a captive-portal page)
      throw new ServiceError("unavailable");
    }
    return { stdout: data.stdout ?? "", stderr: data.stderr ?? "", exitCode: data.exitCode ?? null, compileError: data.compileError ?? null, timedOut: data.timedOut };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export function remoteRuntime(language: LanguageId): Runtime {
  return {
    language,
    preload() {},
    async run(source, options) {
      const started = performance.now();
      options?.onStatus?.("Compiling and running…");
      const prepared = prepareSource(options?.prelude, source);
      const r = shiftResult(await execute(language, prepared.source, options?.setup, options?.signal), prepared.offset);
      const out = parseOutput(r.stdout);
      const error = toError(r);
      const durationMs = Math.round(performance.now() - started);
      const vars = error ? { ...out.scene, build_error: { type: error.type, message: error.message, line: error.line } } : out.scene;
      return { stdout: out.text, error, durationMs, program: createStaticProgram({ stdout: out.text, vars }) };
    },
    async grade(source, tests, options) {
      const started = performance.now();
      options?.onStatus?.("Checking your work…");
      const prepared = prepareSource(options?.prelude, source);
      const r = shiftResult(await execute(language, prepared.source, options?.setup, options?.signal), prepared.offset);
      const out = parseOutput(r.stdout);
      const error = toError(r);
      const results = error ? crashedResults(tests) : runChecks(out.text, out.scene, tests);
      return { stdout: out.text, error, results, allPassed: !error && results.length > 0 && results.every((x) => x.passed), durationMs: Math.round(performance.now() - started) };
    },
  };
}

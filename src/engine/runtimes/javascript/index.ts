import { createProgram, type ProgramHandle } from "../../program";
import { crashedResults, type Runtime } from "../types";
import { BUDGET, executeJs, plain, resolve, runJsTests, toRunError, type JsScope } from "./engine";

/** Values are read once and cached, like the snapshot the Python engine takes after a run. */
function jsProgram(scope: JsScope): ProgramHandle {
  const cache = new Map<string, unknown>();
  return createProgram(scope.stdout, {
    read(name) {
      if (!cache.has(name)) {
        const r = resolve(scope, name);
        cache.set(name, r.found && typeof r.value !== "function" ? plain(r.value) : undefined);
      }
      return cache.get(name);
    },
    hasHook(path) {
      return typeof resolve(scope, path).value === "function";
    },
    call(path, args) {
      const r = resolve(scope, path);
      if (typeof r.value !== "function") return { ok: false, error: `${path}() is not a function` };
      try {
        scope.arm(BUDGET.hook);
        const value = (r.value as (...a: unknown[]) => unknown).apply(r.owner, args);
        return { ok: true, value: plain(value) };
      } catch (err) {
        const e = toRunError(err);
        return { ok: false, error: `${path}() ${e.type}: ${e.message}${e.line ? ` (line ${e.line})` : ""}` };
      }
    },
  });
}

export const javascriptRuntime: Runtime = {
  language: "javascript",
  preload() {},
  async run(source, options) {
    const started = performance.now();
    options?.onStatus?.("Running your code…");
    const res = executeJs(source);
    const durationMs = Math.round(performance.now() - started);
    if (!res.ok) return { stdout: res.stdout, error: res.error, durationMs, program: null };
    return { stdout: res.scope.stdout, error: null, durationMs, program: jsProgram(res.scope) };
  },
  async grade(source, tests, options) {
    const started = performance.now();
    options?.onStatus?.("Checking your work…");
    const res = executeJs(source);
    if (!res.ok) {
      return { stdout: res.stdout, error: res.error, results: crashedResults(tests), allPassed: false, durationMs: Math.round(performance.now() - started) };
    }
    const results = runJsTests(res.scope, tests);
    return {
      stdout: res.scope.stdout,
      error: null,
      results,
      allPassed: results.length > 0 && results.every((r) => r.passed),
      durationMs: Math.round(performance.now() - started),
    };
  },
};

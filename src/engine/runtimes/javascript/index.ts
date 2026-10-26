import { createProgram, type NetworkProbe, type ProgramHandle } from "../../program";
import { crashedResults, type Runtime } from "../types";
import { ASYNC_BUDGET, BUDGET, executeJs, plain, resolve, runJsTests, toRunError, type JsScope } from "./engine";

type CallResult = { ok: true; value: unknown } | { ok: false; error: string };

function describeError(path: string, err: unknown): CallResult {
  const e = toRunError(err);
  return { ok: false, error: `${path}() ${e.type}: ${e.message}${e.line ? ` (line ${e.line})` : ""}` };
}

const isThenable = (v: unknown): v is PromiseLike<unknown> => !!v && typeof (v as { then?: unknown }).then === "function";

function networkProbe(scope: JsScope): NetworkProbe {
  const net = scope.sandbox.network;
  return {
    entries: () => net.entries(),
    subscribe: (l) => net.subscribe(l),
    configure: (o) => net.configure(o),
    failNext: (match, times, kind) => net.failNext(match, times, kind),
    clearLog: () => net.clearLog(),
  };
}

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
        return describeError(path, err);
      }
    },
    async callAsync(path, args) {
      const r = resolve(scope, path);
      if (typeof r.value !== "function") return { ok: false, error: `${path}() is not a function` };
      try {
        scope.arm(BUDGET.hook);
        const result = (r.value as (...a: unknown[]) => unknown).apply(r.owner, args);
        if (!isThenable(result)) return { ok: true, value: plain(result) };
        let timer: ReturnType<typeof setTimeout> | undefined;
        const limit = new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`did not finish within ${ASYNC_BUDGET.call / 1000} seconds. Does it return a Promise that never settles?`)),
            ASYNC_BUDGET.call,
          );
        });
        try {
          return { ok: true, value: plain(await Promise.race([result, limit])) };
        } finally {
          clearTimeout(timer);
        }
      } catch (err) {
        return describeError(path, err);
      }
    },
    env: { network: networkProbe(scope) },
    dispose: () => scope.dispose(),
  });
}

export const javascriptRuntime: Runtime = {
  language: "javascript",
  preload() {},
  async run(source, options) {
    const started = performance.now();
    options?.onStatus?.("Running your code…");
    const res = await executeJs(source);
    const durationMs = Math.round(performance.now() - started);
    if (!res.ok) return { stdout: res.stdout, error: res.error, durationMs, program: null };
    // from here on the program lives in real time (timers, fetch latency) for the scene
    res.scope.goLive();
    return { stdout: res.scope.stdout, error: null, durationMs, program: jsProgram(res.scope) };
  },
  async grade(source, tests, options) {
    const started = performance.now();
    options?.onStatus?.("Checking your work…");
    const res = await executeJs(source);
    if (!res.ok) {
      return { stdout: res.stdout, error: res.error, results: crashedResults(tests), allPassed: false, durationMs: Math.round(performance.now() - started) };
    }
    try {
      const results = await runJsTests(res.scope, tests);
      return {
        stdout: res.scope.stdout,
        error: null,
        results,
        allPassed: results.length > 0 && results.every((r) => r.passed),
        durationMs: Math.round(performance.now() - started),
      };
    } finally {
      res.scope.dispose();
    }
  },
};

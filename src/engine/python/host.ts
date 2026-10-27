import { ENGINE_PRELUDE } from "./prelude";
import { createPythonProgram, type PyModule } from "../program";
import type { RunError, TestCase, TestResult } from "../types";
import { ServiceError } from "../runtimes/service-error";
import { reportRuntime } from "../runtimes/status";
import { crashedResults, type GradeOutcome, type RunOutcome, type StatusListener } from "../runtimes/types";
import { friendlyFailure } from "../runtimes/friendly";

export type { GradeOutcome, RunOutcome, StatusListener };

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

interface PyProxy {
  (...args: unknown[]): unknown;
  get?(key: string): PyProxy;
  set?(key: string, value: unknown): void;
  destroy(): void;
}

interface PyodideInstance {
  runPython(code: string, options?: { globals?: PyProxy }): PyProxy;
  loadPackage(names: string | string[]): Promise<unknown>;
  /** Import a Python module as a proxy (used for micropip). */
  pyimport(name: string): { install(spec: string): Promise<unknown>; destroy(): void };
}

declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInstance>;
    __pockettPyodide?: Promise<PyodideInstance>;
  }
}

/** The script and the WebAssembly download from a CDN; past these budgets the learner gets a Retry instead of an endless wait. */
const SCRIPT_TIMEOUT_MS = 30_000;
const BOOT_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new ServiceError("engine", { message: "Python took too long to load." })), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export function loadPyodideOnce(onStatus?: StatusListener): Promise<PyodideInstance> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Python only runs in the browser"));
  }
  if (window.__pockettPyodide) return window.__pockettPyodide;

  const say = (message: string) => {
    reportRuntime("python", "loading", message);
    onStatus?.(message);
  };
  window.__pockettPyodide = (async () => {
    say("Getting ready…");
    if (!window.loadPyodide) {
      const script = document.createElement("script");
      await withTimeout(
        new Promise<void>((resolve, reject) => {
          script.src = `${PYODIDE_BASE}pyodide.js`;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new ServiceError("engine", { message: "Could not load Python. Check your connection and try again." }));
          document.head.appendChild(script);
        }),
        SCRIPT_TIMEOUT_MS,
      ).catch((err) => {
        script.remove(); // abandons a download that never finishes; a retry adds a fresh tag
        throw err;
      });
    }
    say("Starting Python…");
    const py = await withTimeout(window.loadPyodide!({ indexURL: PYODIDE_BASE }), BOOT_TIMEOUT_MS);
    reportRuntime("python", "ready");
    return py;
  })().catch((err) => {
    // Allow a retry after a failed load.
    window.__pockettPyodide = undefined;
    const failure = err instanceof ServiceError ? err : new ServiceError("engine", { message: "Could not load Python. Check your connection and try again." });
    reportRuntime("python", "failed", failure.message);
    throw failure;
  });

  return window.__pockettPyodide;
}

/** Packages already (or being) loaded this page, so repeat runs skip the work entirely. */
const loadingPackages = new Map<string, Promise<void>>();

/** A package spec starting with this is a pure-Python PyPI wheel installed with micropip, e.g. "micropip:graphql-core==3.2.13". */
const MICROPIP_PREFIX = "micropip:";

/** PyPI requirement specs already (or being) installed this page. */
const installingWheels = new Map<string, Promise<void>>();

/**
 * Install pure-Python PyPI wheels with micropip (loaded on demand). Each exact spec is installed
 * once per page; the order of the project's list is kept, since a wheel may need an earlier one.
 */
async function ensureWheels(py: PyodideInstance, specs: string[], onStatus?: StatusListener) {
  for (const spec of new Set(specs)) {
    let install = installingWheels.get(spec);
    if (!install) {
      const label = spec.replace(/[=<>~!].*$/, "");
      onStatus?.(`Installing ${label} from PyPI (first run only)…`);
      install = (async () => {
        await py.loadPackage("micropip");
        const micropip = py.pyimport("micropip");
        try {
          await micropip.install(spec);
        } finally {
          micropip.destroy();
        }
      })().catch((err) => {
        installingWheels.delete(spec); // allow a retry after a failed download
        throw new Error(`Could not install ${label} from PyPI. Check your connection and try again. (${(err as Error)?.message ?? err})`);
      });
      installingWheels.set(spec, install);
    }
    await install;
  }
}

/**
 * Load Pyodide packages (e.g. "sqlite3", which CPython bundles but Pyodide ships separately).
 * Each package is fetched once per page; later runs resolve immediately. Specs prefixed with
 * "micropip:" are pure-Python PyPI wheels installed through micropip.
 */
async function ensurePackages(py: PyodideInstance, packages: string[] | undefined, onStatus?: StatusListener) {
  const all = [...new Set(packages ?? [])];
  const wanted = all.filter((name) => !name.startsWith(MICROPIP_PREFIX));
  await ensureWheels(
    py,
    all.filter((name) => name.startsWith(MICROPIP_PREFIX)).map((name) => name.slice(MICROPIP_PREFIX.length)),
    onStatus,
  );
  const pending = wanted.filter((name) => !loadingPackages.has(name));
  if (pending.length) {
    onStatus?.(`Loading ${pending.join(", ")}…`);
    const load = py.loadPackage(pending).then(() => undefined);
    for (const name of pending) {
      loadingPackages.set(
        name,
        load.catch((err) => {
          // allow a retry after a failed download
          loadingPackages.delete(name);
          throw err;
        }),
      );
    }
  }
  await Promise.all(wanted.map((name) => loadingPackages.get(name)));
}

/** Fire-and-forget warm-up so the first Run feels instant. */
export function preloadPython(eager = false) {
  if (typeof window === "undefined") return;
  const start = () => void loadPyodideOnce().catch(() => {});
  if (eager) start();
  else if ("requestIdleCallback" in window) window.requestIdleCallback(start, { timeout: 3000 });
  else setTimeout(start, 1200);
}

/**
 * Seconds the learner's program may run before the watchdog stops it. NumPy programs (the AI track) train
 * small networks, which on a slow phone can take several seconds; everything else keeps the short limit
 * that stops a runaway loop quickly.
 */
function runLimitFor(packages?: string[]): number {
  return packages?.includes("numpy") ? 10 : 4;
}

/** A fresh, isolated namespace with the engine prelude installed. */
function createNamespace(py: PyodideInstance, runLimit = 4) {
  const ns = py.runPython("dict()") as PyProxy;
  ns.set!("__name__", "__main__");
  py.runPython(ENGINE_PRELUDE, { globals: ns });

  const fn = (name: string) => ns.get!(name);
  const runUser = fn("_run_user");
  const snapshot = fn("_snapshot");
  const call = fn("_call");
  const hasHook = fn("_has_hook");
  const runTest = fn("_run_test");

  const mod: PyModule = {
    run_user: (source) => runUser(source, runLimit) as string,
    snapshot: () => snapshot() as string,
    call: (path, argsJson) => call(path, argsJson) as string,
    has_hook: (path) => Boolean(hasHook(path)),
    run_test: (code, stdout) => runTest(code, stdout) as string,
    dispose: () => {
      for (const proxy of [runUser, snapshot, call, hasHook, runTest, ns]) {
        try {
          proxy.destroy();
        } catch {
          /* already destroyed */
        }
      }
    },
  };
  return mod;
}

export async function runProgram(source: string, onStatus?: StatusListener, packages?: string[]): Promise<RunOutcome> {
  const started = performance.now();
  const py = await loadPyodideOnce(onStatus);
  await ensurePackages(py, packages, onStatus);
  onStatus?.("Running your code…");
  const mod = createNamespace(py, runLimitFor(packages));
  try {
    const res = JSON.parse(mod.run_user(source)) as { stdout: string; error: RunError | null };
    const durationMs = Math.round(performance.now() - started);
    if (res.error) {
      mod.dispose();
      return { stdout: res.stdout, error: res.error, durationMs, program: null };
    }
    const snapshot = JSON.parse(mod.snapshot());
    return { stdout: res.stdout, error: null, durationMs, program: createPythonProgram(mod, res.stdout, snapshot) };
  } catch (err) {
    // never leak the namespace's Python proxies if the engine itself throws
    mod.dispose();
    throw err;
  }
}

/** Runs the code in a throwaway namespace (so tests can't disturb the live scene) and grades it. */
export async function gradeProgram(
  source: string,
  tests: TestCase[],
  onStatus?: StatusListener,
  packages?: string[],
): Promise<GradeOutcome> {
  const started = performance.now();
  const py = await loadPyodideOnce(onStatus);
  await ensurePackages(py, packages, onStatus);
  onStatus?.("Grading…");
  const mod = createNamespace(py, runLimitFor(packages));
  try {
    const res = JSON.parse(mod.run_user(source)) as { stdout: string; error: RunError | null };
    if (res.error) {
      return {
        stdout: res.stdout,
        error: res.error,
        results: crashedResults(tests),
        allPassed: false,
        durationMs: Math.round(performance.now() - started),
      };
    }
    const results: TestResult[] = tests.map((t) => {
      const r = JSON.parse(mod.run_test(t.assertionCode, res.stdout)) as { ok: boolean; error?: string };
      return { testId: t.id, description: t.description, passed: r.ok, error: r.error ? friendlyFailure(r.error) : r.error };
    });
    return {
      stdout: res.stdout,
      error: null,
      results,
      allPassed: results.length > 0 && results.every((r) => r.passed),
      durationMs: Math.round(performance.now() - started),
    };
  } finally {
    mod.dispose();
  }
}

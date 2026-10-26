import { ENGINE_PRELUDE } from "./prelude";
import { createPythonProgram, type PyModule } from "../program";
import type { RunError, TestCase, TestResult } from "../types";
import { crashedResults, type GradeOutcome, type RunOutcome, type StatusListener } from "../runtimes/types";

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
}

declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInstance>;
    __pockettPyodide?: Promise<PyodideInstance>;
  }
}

export function loadPyodideOnce(onStatus?: StatusListener): Promise<PyodideInstance> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Python only runs in the browser"));
  }
  if (window.__pockettPyodide) return window.__pockettPyodide;

  window.__pockettPyodide = (async () => {
    onStatus?.("Downloading the Python engine…");
    if (!window.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `${PYODIDE_BASE}pyodide.js`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Could not download the Python engine. Check your connection."));
        document.head.appendChild(script);
      });
    }
    onStatus?.("Starting Python…");
    return window.loadPyodide!({ indexURL: PYODIDE_BASE });
  })().catch((err) => {
    // Allow a retry after a failed load.
    window.__pockettPyodide = undefined;
    throw err;
  });

  return window.__pockettPyodide;
}

/** Packages already (or being) loaded this page, so repeat runs skip the work entirely. */
const loadingPackages = new Map<string, Promise<void>>();

/**
 * Load Pyodide packages (e.g. "sqlite3", which CPython bundles but Pyodide ships separately).
 * Each package is fetched once per page; later runs resolve immediately.
 */
async function ensurePackages(py: PyodideInstance, packages: string[] | undefined, onStatus?: StatusListener) {
  const wanted = [...new Set(packages ?? [])];
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
export function preloadPython() {
  if (typeof window === "undefined") return;
  const start = () => void loadPyodideOnce().catch(() => {});
  if ("requestIdleCallback" in window) window.requestIdleCallback(start, { timeout: 3000 });
  else setTimeout(start, 1200);
}

/** A fresh, isolated namespace with the engine prelude installed. */
function createNamespace(py: PyodideInstance) {
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
    run_user: (source) => runUser(source) as string,
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
  const mod = createNamespace(py);
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
  const mod = createNamespace(py);
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
      return { testId: t.id, description: t.description, passed: r.ok, error: r.error };
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

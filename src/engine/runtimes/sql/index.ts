import type { SqlJsStatic } from "sql.js";
import { createStaticProgram } from "../../program";
import { crashedResults, type Runtime, type StatusListener } from "../types";
import { asObjects, describeTables, executeSql, runSqlTests } from "./engine";

const SQLJS_VERSION = "1.13.0";
const SQLJS_BASE = `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist/`;

declare global {
  interface Window {
    initSqlJs?: (config: { locateFile: (file: string) => string }) => Promise<SqlJsStatic>;
    __pockettSqlJs?: Promise<SqlJsStatic>;
  }
}

/** Loads SQLite (WebAssembly) from the CDN once, like the Python engine. */
function loadSqlJsOnce(onStatus?: StatusListener): Promise<SqlJsStatic> {
  if (typeof window === "undefined") return Promise.reject(new Error("SQL only runs in the browser"));
  if (window.__pockettSqlJs) return window.__pockettSqlJs;
  window.__pockettSqlJs = (async () => {
    onStatus?.("Downloading the SQL engine…");
    if (!window.initSqlJs) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `${SQLJS_BASE}sql-wasm.js`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Could not download the SQL engine. Check your connection."));
        document.head.appendChild(script);
      });
    }
    return window.initSqlJs!({ locateFile: (file) => `${SQLJS_BASE}${file}` });
  })().catch((err) => {
    window.__pockettSqlJs = undefined;
    throw err;
  });
  return window.__pockettSqlJs;
}

export const sqlRuntime: Runtime = {
  language: "sql",
  preload() {
    if (typeof window === "undefined") return;
    setTimeout(() => void loadSqlJsOnce().catch(() => {}), 800);
  },
  async run(source, options) {
    const started = performance.now();
    const SQL = await loadSqlJsOnce(options?.onStatus);
    options?.onStatus?.("Running your query…");
    const run = executeSql(SQL, source, options?.setup);
    try {
      const last = run.results[run.results.length - 1];
      // Scenes read the outcome as plain data: the tables, every result set, and the last one.
      const program = createStaticProgram({
        stdout: run.stdout,
        vars: {
          tables: describeTables(run.db),
          results: run.results,
          result: last ?? null,
          rows: asObjects(last),
          error: run.error,
        },
      });
      return { stdout: run.stdout, error: run.error, durationMs: Math.round(performance.now() - started), program: run.error ? null : program };
    } finally {
      run.db.close();
    }
  },
  async grade(source, tests, options) {
    const started = performance.now();
    const SQL = await loadSqlJsOnce(options?.onStatus);
    options?.onStatus?.("Checking your work…");
    const run = executeSql(SQL, source, options?.setup);
    try {
      if (run.error) {
        return { stdout: run.stdout, error: run.error, results: crashedResults(tests), allPassed: false, durationMs: Math.round(performance.now() - started) };
      }
      const results = runSqlTests(run, tests);
      return { stdout: run.stdout, error: null, results, allPassed: results.length > 0 && results.every((r) => r.passed), durationMs: Math.round(performance.now() - started) };
    } finally {
      run.db.close();
    }
  },
};

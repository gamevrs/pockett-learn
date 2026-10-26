import type { SqlJsStatic } from "sql.js";
import { asObjects, describeTables, executeSql, runSqlTests } from "./engine.ts";
import type { WorkerRequest, WorkerResponse } from "./protocol.ts";

/**
 * Web Worker that owns SQLite (sql.js, WebAssembly). Running here instead of on the page means a
 * runaway query (a recursive CTE with no stop condition, a runaway cross join) can be abandoned by
 * terminating the worker, rather than freezing the tab. The pure logic is the same executeSql /
 * runSqlTests that Node uses to validate lessons.
 */

const SQLJS_VERSION = "1.13.0";
const SQLJS_BASE = `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist/`;

interface WorkerScope {
  postMessage(message: WorkerResponse): void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  importScripts?: (...urls: string[]) => void;
  initSqlJs?: (config: { locateFile: (file: string) => string }) => Promise<SqlJsStatic>;
}
const scope = self as unknown as WorkerScope;

async function loadSqlJs(): Promise<SqlJsStatic> {
  if (!scope.initSqlJs) {
    if (typeof scope.importScripts === "function") scope.importScripts(`${SQLJS_BASE}sql-wasm.js`);
    else {
      // module workers have no importScripts: run the classic script in the global scope instead
      const res = await fetch(`${SQLJS_BASE}sql-wasm.js`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      (0, eval)(await res.text());
    }
  }
  if (!scope.initSqlJs) throw new Error("sql.js did not load");
  return scope.initSqlJs({ locateFile: (file) => `${SQLJS_BASE}${file}` });
}

const ready = loadSqlJs();
ready.then(
  () => scope.postMessage({ kind: "ready" }),
  (err) => scope.postMessage({ kind: "init-error", message: err instanceof Error ? err.message : String(err) }),
);

scope.onmessage = async (event) => {
  const req = event.data;
  let SQL: SqlJsStatic;
  try {
    SQL = await ready;
  } catch {
    return; // already reported as init-error
  }
  try {
    const run = executeSql(SQL, req.source, req.setup, (line) => scope.postMessage({ kind: "line", id: req.id, line }));
    try {
      if (req.kind === "run") {
        const last = run.results[run.results.length - 1];
        scope.postMessage({
          kind: "run",
          id: req.id,
          payload: { stdout: run.stdout, error: run.error, tables: describeTables(run.db), results: run.results, result: last ?? null, rows: asObjects(last) },
        });
      } else {
        const results = run.error ? [] : runSqlTests(run, req.tests);
        scope.postMessage({ kind: "grade", id: req.id, payload: { stdout: run.stdout, error: run.error, results } });
      }
    } finally {
      run.db.close();
    }
  } catch (err) {
    scope.postMessage({ kind: "fail", id: req.id, message: err instanceof Error ? err.message : String(err) });
  }
};

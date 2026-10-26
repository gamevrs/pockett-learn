// Worker thread for validate-content.mjs: runs SQL cases with the same engine code the browser's
// SQL worker uses, so the validator can abandon a runaway query (the main thread stays free to
// time it out and terminate this thread).
import { parentPort } from "node:worker_threads";
import { pathToFileURL, fileURLToPath } from "node:url";
import { join } from "node:path";
import { executeSql, runSqlTests } from "../src/engine/runtimes/sql/engine.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const initSqlJs = (await import(pathToFileURL(join(here, "..", "node_modules", "sql.js", "dist", "sql-wasm.js")).href)).default;
const SQL = await initSqlJs();

parentPort.on("message", ({ source, setup, tests }) => {
  const run = executeSql(SQL, source, setup);
  const tested = run.error ? [] : runSqlTests(run, tests);
  run.db.close();
  parentPort.postMessage({ error: run.error, tested });
});
parentPort.postMessage("ready");

// Regenerates src/scenes/counting-house/demo.ts: the frozen output of the Counting House reference
// solution (every lesson's solutionAdd, in order), so the landing page can show the finished console
// without loading SQLite.
//   node scripts/gen-demo-counting-house.mjs            (uses the project's lessons)
//   node scripts/gen-demo-counting-house.mjs my.sql     (uses a plain SQL file instead)
process.env.NODE_NO_WARNINGS = "1";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = join(here, "..");
const req = createRequire(join(root, "package.json"));
const initSqlJs = req("sql.js");
const { executeSql, describeTables } = await import(pathToFileURL(join(root, "src/engine/runtimes/sql/engine.ts")).href);

let source;
let setup;
const arg = process.argv[2];
if (arg) {
  source = readFileSync(arg, "utf8");
  setup = (await import(pathToFileURL(join(root, "src/content/projects/counting-house/seed.ts")).href)).buildSetup();
} else {
  const { countingHouse } = await import(pathToFileURL(join(root, "src/content/projects/counting-house.ts")).href);
  const { solutionThrough } = await import(pathToFileURL(join(root, "src/engine/compose.ts")).href);
  const { flattenLessons } = await import(pathToFileURL(join(root, "src/engine/types.ts")).href);
  source = solutionThrough(countingHouse, flattenLessons(countingHouse).length - 1);
  setup = countingHouse.setup;
}

const SQL = await initSqlJs();
const run = executeSql(SQL, source, setup);
if (run.error) {
  console.error("reference run failed", run.error);
  process.exit(1);
}
const tables = describeTables(run.db);
const results = run.results;
const stdout = run.stdout.length > 4000 ? "…\n" + run.stdout.slice(-4000) : run.stdout;

const out = `import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/**
 * What the finished Counting House query file returns (the real output of the reference solution,
 * frozen), so the landing page can show the console without loading SQLite.
 * Regenerate with: node scripts/gen-demo-counting-house.mjs
 */

type Row = (string | number | null)[];

const TABLES = ${JSON.stringify(tables)};

const RESULTS: { sql: string; columns: string[]; rows: Row[] }[] = ${JSON.stringify(results)};

export function countingHouseDemoProgram(): ProgramHandle {
  const last = RESULTS[RESULTS.length - 1];
  return createStaticProgram({
    stdout: ${JSON.stringify(stdout)},
    vars: {
      tables: TABLES,
      results: RESULTS,
      result: last,
      rows: last.rows.map((r) => Object.fromEntries(last.columns.map((c, i) => [c, r[i]]))),
      error: null,
    },
  });
}
`;
const dest = join(root, "src/scenes/counting-house/demo.ts");
writeFileSync(dest, out);
console.log(`wrote ${dest} (${results.length} result sets, ${tables.length} tables, ${(out.length / 1024).toFixed(0)} KB)`);

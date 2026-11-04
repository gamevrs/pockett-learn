// Freezes the finished Pit Wall query file's real output into the scene's demo data.
//   node scripts/gen-demo-pit-wall.mjs
// Runs the reference solution (all lessons) through the same SQL engine the browser worker uses
// (sql.js + the project's hidden setup) and writes src/scenes/sqldesk/demo.ts.
process.env.NODE_NO_WARNINGS = "1";
import { writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { solutionThrough } from "../src/engine/compose.ts";
import { flattenLessons } from "../src/engine/types.ts";
import { describeTables, executeSql } from "../src/engine/runtimes/sql/engine.ts";
import { pitWall } from "../src/content/projects/pit-wall.ts";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const initSqlJs = (await import(pathToFileURL(join(root, "node_modules", "sql.js", "dist", "sql-wasm.js")).href)).default;
const SQL = await initSqlJs();
const n = flattenLessons(pitWall).length;
const run = executeSql(SQL, solutionThrough(pitWall, n - 1), pitWall.setup);
if (run.error) {
  console.error("reference solution failed:", run.error);
  process.exit(1);
}
const tables = describeTables(run.db).map((t) => ({ name: t.name, rowCount: t.rowCount, columns: t.columns.map((c) => ({ name: c.name, type: c.type })) }));
run.db.close();
const fmtRow = (r) => "      " + JSON.stringify(r) + ",";
const results = run.results
  .map((r) => `  {\n    sql: ${JSON.stringify(r.sql)},\n    columns: ${JSON.stringify(r.columns)},\n    rows: [\n${r.rows.map(fmtRow).join("\n")}\n    ],\n  },`)
  .join("\n");
const tbl = tables.map((t) => `  { name: ${JSON.stringify(t.name)}, rowCount: ${t.rowCount}, columns: [${t.columns.map((c) => `{ name: ${JSON.stringify(c.name)}, type: ${JSON.stringify(c.type)} }`).join(", ")}] },`).join("\n");
const out = `import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/**
 * What the finished Pit Wall query file returns (the real output of the reference solution, frozen by
 * scripts/gen-demo-pit-wall.mjs), so the landing page can show the dashboard without loading SQLite.
 * Regenerate with \`node scripts/gen-demo-pit-wall.mjs\` whenever the lessons or the seed data change.
 */

type Row = (string | number | null)[];

const TABLES = [
${tbl}
];

const RESULTS: { sql: string; columns: string[]; rows: Row[] }[] = [
${results}
];

export function sqldeskDemoProgram(): ProgramHandle {
  const last = RESULTS[RESULTS.length - 1];
  return createStaticProgram({
    stdout: ${JSON.stringify(run.stdout)},
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
writeFileSync(join(root, "src", "scenes", "sqldesk", "demo.ts"), out);
console.log("wrote demo.ts;", run.results.length, "result sets;", tables.length, "tables");

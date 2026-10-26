import { createStaticProgram, type ProgramHandle } from "@/engine/program";
import { DEMO_DATA } from "./demo-data";

/**
 * What the finished Schema Studio schema file produces (the real output of the reference solution,
 * frozen in demo-data.ts by scripts/gen-schema-studio-demo.mjs), so the landing page can show the
 * live ER diagram and every panel without loading SQLite.
 */
export function schemaStudioDemoProgram(): ProgramHandle {
  const results = DEMO_DATA.results;
  const last = results[results.length - 1] ?? null;
  const rows = last ? last.rows.map((r) => Object.fromEntries(last.columns.map((c, i) => [c, r[i]]))) : [];
  return createStaticProgram({
    stdout: "",
    vars: { tables: DEMO_DATA.tables, results, result: last, rows, error: null, log: DEMO_DATA.log },
  });
}

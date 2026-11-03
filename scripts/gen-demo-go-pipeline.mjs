// Freezes the finished Tidewatch program's real output into the scene's demo data.
//   node scripts/gen-demo-go-pipeline.mjs
// Runs the reference solution through the live pockett runner (RUNNER_BASE_URL, default https://www.pockett.ai),
// splits the output into plain text and @scene data, and writes src/scenes/go-pipeline/demo.ts.
// It runs the program three times and refuses to write anything if the runs differ (a determinism check).
process.env.NODE_NO_WARNINGS = "1";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { solutionThrough } from "../src/engine/compose.ts";
import { flattenLessons } from "../src/engine/types.ts";
import { parseOutput, prepareSource } from "../src/engine/runtimes/remote-output.ts";
import { goPipeline } from "../src/content/projects/go-pipeline.ts";

const base = process.env.RUNNER_BASE_URL ?? "https://www.pockett.ai";
const source = prepareSource(goPipeline.prelude, solutionThrough(goPipeline, flattenLessons(goPipeline).length - 1)).source;
const runs = [];
for (let i = 0; i < 3; i++) {
  const res = await fetch(new URL("/api/run", base), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language: "go", source, stdin: goPipeline.setup ?? "" }),
  });
  const r = await res.json();
  if (r.compileError || r.exitCode) {
    console.error("the reference solution did not run cleanly:", r.compileError ?? r.stderr);
    process.exit(1);
  }
  runs.push(r.stdout);
  await new Promise((ok) => setTimeout(ok, 2500));
}
if (new Set(runs).size !== 1) {
  console.error("the reference solution printed different output on different runs:");
  runs.forEach((r, i) => console.error(`--- run ${i + 1}\n${r}`));
  process.exit(1);
}
const { scene, text } = parseOutput(runs[0]);
const out = `import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/**
 * What the finished Tidewatch program prints and sends to the board: the real output of the reference
 * solution, frozen by scripts/gen-demo-go-pipeline.mjs, so the landing page and the project hub can show
 * the harbour board without calling the code runner.
 */

const STDOUT = ${JSON.stringify(text.replace(/\n$/, ""))};

const VARS: Record<string, unknown> = ${JSON.stringify(scene, null, 2)};

export function goPipelineDemoProgram(): ProgramHandle {
  return createStaticProgram({ stdout: STDOUT, vars: VARS });
}
`;
import { mkdirSync } from "node:fs";
const dir = join(fileURLToPath(new URL(".", import.meta.url)), "..", "src", "scenes", "go-pipeline");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "demo.ts"), out);
console.log("wrote", join(dir, "demo.ts"), out.length, "bytes; three runs identical");

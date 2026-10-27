// Freezes the finished Provenance Lab program's real output into the scene's demo data.
//   node scripts/gen-cpp-memory-demo.mjs
// Runs the reference solution through the live pockett runner (RUNNER_BASE_URL, default https://www.pockett.ai),
// splits the output into plain text and @scene data, and writes src/scenes/cpp-memory/demo.ts.
process.env.NODE_NO_WARNINGS = "1";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { solutionThrough } from "../src/engine/compose.ts";
import { flattenLessons } from "../src/engine/types.ts";
import { parseOutput, prepareSource } from "../src/engine/runtimes/remote-output.ts";
import { cppMemory } from "../src/content/projects/cpp-memory.ts";

const base = process.env.RUNNER_BASE_URL ?? "https://www.pockett.ai";
const source = prepareSource(cppMemory.prelude, solutionThrough(cppMemory, flattenLessons(cppMemory).length - 1)).source;
const res = await fetch(new URL("/api/run", base), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ language: "cpp", source, stdin: cppMemory.setup ?? "" }),
});
const r = await res.json();
if (r.compileError || r.exitCode) {
  console.error("the reference solution did not run cleanly:", r.compileError ?? r.stderr);
  process.exit(1);
}
const { scene, text } = parseOutput(r.stdout);
const out = `import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/**
 * What the finished Provenance Lab program prints and sends to the board: the real output of the reference
 * solution, frozen by scripts/gen-cpp-memory-demo.mjs, so the landing page and the project hub can show the
 * memory room without calling the code runner.
 */

const STDOUT = ${JSON.stringify(text.replace(/\n$/, ""))};

const VARS: Record<string, unknown> = ${JSON.stringify(scene)};

export function cppMemoryDemoProgram(): ProgramHandle {
  return createStaticProgram({ stdout: STDOUT, vars: VARS });
}
`;
const target = join(fileURLToPath(new URL(".", import.meta.url)), "..", "src", "scenes", "cpp-memory", "demo.ts");
writeFileSync(target, out);
console.log("wrote", target, out.length, "bytes");

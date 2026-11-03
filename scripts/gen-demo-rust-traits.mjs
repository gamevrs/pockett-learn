// Freezes the finished Drone Fleet program's real output into the scene's demo data.
//   node scripts/gen-demo-rust-traits.mjs
// Runs the reference solution through the live pockett runner (RUNNER_BASE_URL, default https://www.pockett.ai),
// splits the output into plain text and @scene data, and writes src/scenes/rust-traits/demo.ts.
process.env.NODE_NO_WARNINGS = "1";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { solutionThrough } from "../src/engine/compose.ts";
import { flattenLessons } from "../src/engine/types.ts";
import { parseOutput, prepareSource } from "../src/engine/runtimes/remote-output.ts";
import { rustTraits } from "../src/content/projects/rust-traits.ts";

const base = process.env.RUNNER_BASE_URL ?? "https://www.pockett.ai";
const source = prepareSource(rustTraits.prelude, solutionThrough(rustTraits, flattenLessons(rustTraits).length - 1), "rust").source;
const res = await fetch(new URL("/api/run", base), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ language: "rust", source, stdin: rustTraits.setup ?? "" }),
});
const r = await res.json();
if (r.compileError || r.exitCode) {
  console.error("the reference solution did not run cleanly:", r.compileError ?? r.stderr);
  process.exit(1);
}
const { scene, text } = parseOutput(r.stdout);
const out = `import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/**
 * What the finished Drone Fleet program prints and sends to the board: the real output of the reference
 * solution, frozen by scripts/gen-demo-rust-traits.mjs, so the landing page and the project hub can show the
 * fleet board without calling the code runner.
 */

const STDOUT = ${JSON.stringify(text.replace(/\n$/, ""))};

const VARS: Record<string, unknown> = ${JSON.stringify(scene)};

export function rustTraitsDemoProgram(): ProgramHandle {
  return createStaticProgram({ stdout: STDOUT, vars: VARS });
}
`;
const target = join(fileURLToPath(new URL(".", import.meta.url)), "..", "src", "scenes", "rust-traits", "demo.ts");
writeFileSync(target, out);
console.log("wrote", target, out.length, "bytes");

// Regenerates src/scenes/ai-first-steps/demo-data.ts: the frozen variables of the finished Pebble Beach
// program (every lesson's solutionAdd, in order), so the landing page and the project hub can show the
// whole beach without loading Python.
//   node scripts/gen-demo-ai-first-steps.mjs
process.env.NODE_NO_WARNINGS = "1";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { ENGINE_PRELUDE } from "../src/engine/python/prelude.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = join(here, "..");
const { aiFirstSteps } = await import(pathToFileURL(join(root, "src/content/projects/ai-first-steps.ts")).href);
const { solutionThrough } = await import(pathToFileURL(join(root, "src/engine/compose.ts")).href);
const { flattenLessons } = await import(pathToFileURL(join(root, "src/engine/types.ts")).href);

const source = solutionThrough(aiFirstSteps, flattenLessons(aiFirstSteps).length - 1);
const dir = mkdtempSync(join(tmpdir(), "pb-demo-"));
writeFileSync(join(dir, "prelude.py"), ENGINE_PRELUDE);
writeFileSync(join(dir, "main.py"), source);
writeFileSync(
  join(dir, "run.py"),
  `import json, sys
ns = {"__name__": "__main__"}
exec(open(sys.argv[1], encoding="utf8").read(), ns)
run = json.loads(ns["_run_user"](open(sys.argv[2], encoding="utf8").read()))
if run["error"]:
    print(json.dumps({"error": run["error"]}))
else:
    print(json.dumps({"stdout": run["stdout"], "snap": json.loads(ns["_snapshot"]())}))
`,
);
const r = spawnSync("python", ["-W", "ignore", join(dir, "run.py"), join(dir, "prelude.py"), join(dir, "main.py")], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
if (r.status !== 0) {
  console.error(r.stderr);
  process.exit(1);
}
const out = JSON.parse(r.stdout);
if (out.error) {
  console.error("reference run failed", out.error);
  process.exit(1);
}

const KEEP = [
  "mystery", "truth", "hand_guess", "hand_correct", "PEBBLES", "KINDS", "kind_counts", "first_features", "to_first", "to_other",
  "nn_pebble", "nn_guess", "near3", "tricky", "tricky_truth", "tricky_near", "tricky_votes", "tricky_guess", "tricky_k1", "K",
  "BASKET", "basket_accuracy", "lazy_accuracy", "train_set", "test_set", "train_accuracy", "test_accuracy", "memo_train_accuracy",
  "memo_test_accuracy", "fit_table", "best_k", "COVE", "cove_counts", "cove_roller_share", "cove_accuracy", "combined_counts",
  "fair_counts", "fair_accuracy", "confusion_table", "table_right", "report",
];
const vars = {};
for (const k of KEEP) {
  if (!(k in out.snap.vars)) {
    console.error("missing variable", k);
    process.exit(1);
  }
  vars[k] = out.snap.vars[k];
}
const round = (_k, v) => (typeof v === "number" && !Number.isInteger(v) ? Math.round(v * 1e4) / 1e4 : v);
const body = JSON.stringify(vars, round);

const ts = `/**
 * The frozen variables of the finished Pebble Beach program (the real output of the reference
 * solution, rounded to 4 decimals), so the landing page and the project hub can show the beach
 * without loading Python. Regenerate with: node scripts/gen-demo-ai-first-steps.mjs
 */
export const DEMO_STDOUT = ${JSON.stringify(out.stdout)};

export const DEMO_VARS: Record<string, unknown> = ${body};
`;
writeFileSync(join(root, "src/scenes/ai-first-steps/demo-data.ts"), ts);
console.log("wrote src/scenes/ai-first-steps/demo-data.ts", (ts.length / 1024).toFixed(0) + " KB;", out.stdout.trim());

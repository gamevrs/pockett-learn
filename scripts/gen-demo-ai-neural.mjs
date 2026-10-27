// Regenerates src/scenes/ai-neural/demo-data.ts: the frozen variables of the finished Glyph Greenhouse
// program (every lesson's solutionAdd, in order), so the landing page and the project hub can show the
// whole greenhouse without loading Python. The demo's predict() is rebuilt from the frozen weights.
//   node scripts/gen-demo-ai-neural.mjs
process.env.NODE_NO_WARNINGS = "1";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { ENGINE_PRELUDE } from "../src/engine/python/prelude.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = join(here, "..");
const { aiNeural } = await import(pathToFileURL(join(root, "src/content/projects/ai-neural.ts")).href);
const { solutionThrough } = await import(pathToFileURL(join(root, "src/engine/compose.ts")).href);
const { flattenLessons } = await import(pathToFileURL(join(root, "src/engine/types.ts")).href);

const source = solutionThrough(aiNeural, flattenLessons(aiNeural).length - 1);
const dir = mkdtempSync(join(tmpdir(), "gn-demo-"));
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
  "gallery", "gallery_labels", "digit_counts", "stem_image", "stem_rates", "curves", "xor_table", "net_view", "shape_report",
  "chance_loss", "start_probs", "init_report", "chain_report", "neuron_losses", "neuron_image", "grad_norms", "check_rows",
  "check_error", "bug_error", "history_full", "history_batch", "batch_study", "confusion", "recalls", "worst_pairs",
  "mistake_pixels", "mistake_truth", "mistake_guess", "history_free", "history_decay", "gap_free", "gap_decay", "weight_size",
  "lr_curves", "schedule_study", "history_sched", "lr_scores", "best_lr", "stop_info", "history_stop", "history_final", "report",
  "final_confusion",
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
 * The frozen variables of the finished Glyph Greenhouse program (the real output of the reference
 * solution, rounded to 4 decimals), so the landing page and the project hub can show the greenhouse
 * without loading Python. Regenerate with: node scripts/gen-demo-ai-neural.mjs
 */
export const DEMO_STDOUT = ${JSON.stringify(out.stdout)};

export const DEMO_VARS: Record<string, unknown> = ${body};
`;
writeFileSync(join(root, "src/scenes/ai-neural/demo-data.ts"), ts);
console.log("wrote src/scenes/ai-neural/demo-data.ts", (ts.length / 1024).toFixed(0) + " KB;", out.stdout.trim());

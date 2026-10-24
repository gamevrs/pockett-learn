// Validates every project's lessons against the real Python engine.
//   node scripts/validate-content.mjs [slug]
// Solutions must pass all tests. Starters must NOT pass all tests (so lessons aren't pre-solved).
process.env.NODE_NO_WARNINGS = "1";
import { readdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { ENGINE_PRELUDE } from "../src/engine/python/prelude.ts";
import { solutionThrough, starterFor } from "../src/engine/compose.ts";
import { flattenLessons, YOUR_TURN_MARKER } from "../src/engine/types.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const only = process.argv[2];
const dir = join(here, "..", "src", "content", "projects");
const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && f !== "index.ts");

const problems = [];
const warn = [];
const cases = [];

for (const file of files) {
  const mod = await import(pathToFileURL(join(dir, file)).href);
  const project = Object.values(mod).find((v) => v && typeof v === "object" && v.slug && v.chapters);
  if (!project || (only && project.slug !== only)) continue;
  const lessons = flattenLessons(project);
  const featureIds = new Set(project.features.map((f) => f.id));
  const unlocked = new Set();
  const ids = new Set();

  lessons.forEach((lesson, i) => {
    const tag = `${project.slug}/${lesson.id}`;
    if (ids.has(lesson.id)) problems.push(`${tag}: duplicate lesson id`);
    ids.add(lesson.id);
    if (!lesson.starterAdd.includes(YOUR_TURN_MARKER)) problems.push(`${tag}: starterAdd is missing the "${YOUR_TURN_MARKER}" marker`);
    if (lesson.hints.length < 2) warn.push(`${tag}: fewer than 2 hints`);
    if (lesson.tests.length < 2) problems.push(`${tag}: needs at least 2 tests`);
    if (lesson.tasks.length < 2) warn.push(`${tag}: fewer than 2 tasks`);
    for (const u of lesson.unlocks) {
      if (!featureIds.has(u)) problems.push(`${tag}: unlocks unknown feature "${u}"`);
      unlocked.add(u);
    }
    cases.push({ label: `${tag}::solution`, source: solutionThrough(project, i), tests: lesson.tests, expect: "pass" });
    cases.push({ label: `${tag}::starter`, source: starterFor(project, i, {}), tests: lesson.tests, expect: "fail" });
  });
  for (const f of featureIds) if (!unlocked.has(f)) problems.push(`${project.slug}: feature "${f}" is never unlocked by any lesson`);
}

const tmp = mkdtempSync(join(tmpdir(), "pockett-validate-"));
const casesFile = join(tmp, "cases.json");
const preludeFile = join(tmp, "prelude.py");
writeFileSync(casesFile, JSON.stringify(cases));
writeFileSync(preludeFile, ENGINE_PRELUDE);
const py = spawnSync(process.platform === "win32" ? "python" : "python3", ["-I", join(here, "validate_runner.py"), casesFile, preludeFile], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
if (py.status !== 0) {
  console.error(py.stderr || py.stdout);
  process.exit(1);
}
const results = JSON.parse(py.stdout);
let ok = 0;
results.forEach((r, i) => {
  const c = cases[i];
  const allPassed = !r.error && r.results.length > 0 && r.results.every((t) => t.ok);
  if (c.expect === "pass") {
    if (allPassed) ok++;
    else {
      const why = r.error ? `crashed: ${r.error.type}: ${r.error.message} (line ${r.error.line})` : r.results.filter((t) => !t.ok).map((t) => `${t.id}: ${t.error}`).join("; ");
      problems.push(`${r.label}: solution does not pass -> ${why}`);
    }
  } else {
    if (!allPassed) {
      ok++;
      if (r.error) warn.push(`${r.label}: starter crashes (${r.error.type}: ${r.error.message}, line ${r.error.line}); fine, but check it is intentional`);
    } else problems.push(`${r.label}: starter already passes all tests (lesson is pre-solved)`);
  }
});

warn.forEach((w) => console.log("warn ", w));
problems.forEach((p) => console.log("FAIL ", p));
console.log(`\n${ok}/${results.length} checks ok, ${problems.length} problems, ${warn.length} warnings`);
process.exit(problems.length ? 1 : 0);

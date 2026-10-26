// Validates every project's lessons against the real engines (Python, JavaScript, SQL).
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
import { flattenLessons, languageOf, TIERS, YOUR_TURN_MARKER } from "../src/engine/types.ts";
import { executeJs, runJsTests } from "../src/engine/runtimes/javascript/engine.ts";
import { executeSql, runSqlTests } from "../src/engine/runtimes/sql/engine.ts";
import { readFileSync } from "node:fs";
import { FOUNDATIONS } from "../src/content/foundations/index.ts";

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
  if (!TIERS.includes(project.difficulty)) problems.push(`${project.slug}: difficulty must be one of ${TIERS.join(", ")}`);
  if (project.packages && languageOf(project) !== "python") problems.push(`${project.slug}: packages only apply to Python projects`);
  if (project.prerequisites?.includes(project.slug)) problems.push(`${project.slug}: lists itself as a prerequisite`);

  lessons.forEach((lesson, i) => {
    const tag = `${project.slug}/${lesson.id}`;
    if (ids.has(lesson.id)) problems.push(`${tag}: duplicate lesson id`);
    ids.add(lesson.id);
    if (!lesson.starterAdd.includes(YOUR_TURN_MARKER)) problems.push(`${tag}: starterAdd is missing the "${YOUR_TURN_MARKER}" marker`);
    if (lesson.hints.length < 2) warn.push(`${tag}: fewer than 2 hints`);
    if (lesson.tests.length < 2) problems.push(`${tag}: needs at least 2 tests`);
    if (lesson.tasks.length < 2) warn.push(`${tag}: fewer than 2 tasks`);
    for (const [ci, check] of (lesson.checks ?? []).entries()) {
      const ctag = `${tag} check ${ci + 1}`;
      const q = check.question;
      if (!check.prompt || !check.explanation) problems.push(`${ctag}: needs a prompt and an explanation`);
      if (q.type === "widget") problems.push(`${ctag}: widget questions are not supported in project lessons`);
      if (q.type === "choice") {
        const answers = Array.isArray(q.answer) ? q.answer : [q.answer];
        if (q.options.length < 2) problems.push(`${ctag}: choice needs at least 2 options`);
        if (answers.some((a) => !Number.isInteger(a) || a < 0 || a >= q.options.length)) problems.push(`${ctag}: choice answer out of range`);
      }
      if (q.type === "text" && q.answer.length === 0) problems.push(`${ctag}: text question without accepted answers`);
    }
    for (const u of lesson.unlocks) {
      if (!featureIds.has(u)) problems.push(`${tag}: unlocks unknown feature "${u}"`);
      unlocked.add(u);
    }
    const language = languageOf(project);
    const setup = project.setup ?? "";
    const packages = project.packages ?? [];
    cases.push({ label: `${tag}::solution`, language, setup, packages, source: solutionThrough(project, i), tests: lesson.tests, expect: "pass" });
    cases.push({ label: `${tag}::starter`, language, setup, packages, source: starterFor(project, i, {}), tests: lesson.tests, expect: "fail" });
  });
  for (const f of featureIds) if (!unlocked.has(f)) problems.push(`${project.slug}: feature "${f}" is never unlocked by any lesson`);
}

// ── Foundations (concept lessons) ──
if (!only || only === "foundations") {
  // widget types that exist: keys of the per-module registries
  const widgetDir = join(here, "..", "src", "learn", "widgets");
  const widgetTypes = new Set();
  for (const mod of readdirSync(widgetDir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    let src = "";
    try {
      src = readFileSync(join(widgetDir, mod.name, "index.ts"), "utf8");
    } catch {
      continue;
    }
    for (const m of src.matchAll(/^\s*"?([\w-]+)"?\s*:\s*\{\s*Component/gm)) {
      // registries are merged by spread, so a repeated key would silently replace another widget
      if (widgetTypes.has(m[1])) problems.push(`widgets: "${m[1]}" is registered by more than one module (${mod.name})`);
      widgetTypes.add(m[1]);
    }
  }
  const ids = new Set();
  for (const mod of FOUNDATIONS.modules) {
    for (const lesson of mod.lessons) {
      const tag = `foundations/${lesson.id}`;
      if (!lesson.id.startsWith("fnd-")) problems.push(`${tag}: lesson ids must start with "fnd-"`);
      if (ids.has(lesson.id)) problems.push(`${tag}: duplicate lesson id`);
      ids.add(lesson.id);
      if (lesson.steps.length < 4) warn.push(`${tag}: only ${lesson.steps.length} steps`);
      const interactive = lesson.steps.filter((st) => st.kind === "question" || st.kind === "code" || (st.kind === "explain" && st.widget)).length;
      if (interactive < Math.ceil(lesson.steps.length / 2)) warn.push(`${tag}: fewer than half the steps are interactive`);
      lesson.steps.forEach((st, si) => {
        const stag = `${tag} step ${si + 1}`;
        const widget = (st.kind === "explain" || st.kind === "question") && st.widget;
        if (widget && !widgetTypes.has(widget.type)) problems.push(`${stag}: unknown widget "${widget.type}"`);
        if (st.kind === "question") {
          const q = st.question;
          if (!st.explanation) problems.push(`${stag}: question without an explanation`);
          if (q.type === "choice") {
            const answers = Array.isArray(q.answer) ? q.answer : [q.answer];
            if (q.options.length < 2) problems.push(`${stag}: choice needs at least 2 options`);
            if (answers.some((a) => !Number.isInteger(a) || a < 0 || a >= q.options.length)) problems.push(`${stag}: choice answer out of range`);
          }
          if (q.type === "widget" && !widget) problems.push(`${stag}: widget question without a widget`);
          if (q.type === "order" && q.items.length < 3) warn.push(`${stag}: order question with fewer than 3 items`);
          if (q.type === "text" && q.answer.length === 0) problems.push(`${stag}: text question without accepted answers`);
        }
        if (st.kind === "code") {
          if (st.tests.length < 2) problems.push(`${stag}: code step needs at least 2 tests`);
          cases.push({ label: `${stag}::solution`, language: st.language, setup: "", source: st.solution, tests: st.tests, expect: "pass" });
          cases.push({ label: `${stag}::starter`, language: st.language, setup: "", source: st.starter, tests: st.tests, expect: "fail" });
        }
      });
    }
  }
}

// Python runs in a real CPython with the engine prelude; JavaScript and SQL run in-process with
// the exact engine code the browser uses.
const pyCases = cases.filter((c) => c.language === "python");
const pyResults = [];
if (pyCases.length) {
  const tmp = mkdtempSync(join(tmpdir(), "pockett-validate-"));
  const casesFile = join(tmp, "cases.json");
  const preludeFile = join(tmp, "prelude.py");
  writeFileSync(casesFile, JSON.stringify(pyCases));
  writeFileSync(preludeFile, ENGINE_PRELUDE);
  const py = spawnSync(process.platform === "win32" ? "python" : "python3", ["-I", join(here, "validate_runner.py"), casesFile, preludeFile], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (py.status !== 0) {
    console.error(py.stderr || py.stdout);
    process.exit(1);
  }
  pyResults.push(...JSON.parse(py.stdout));
}

let SQL = null;
const toResult = (c, error, tests) => ({ label: c.label, error, results: tests.map((t) => ({ id: t.testId, ok: t.passed, error: t.error })) });
const results = [];
for (const c of cases) {
  if (c.language === "python") {
    const r = pyResults.shift();
    if (r.warn) warn.push(`${r.label}: ${r.warn}`);
    results.push(r);
  } else if (c.language === "javascript") {
    const run = executeJs(c.source);
    results.push(run.ok ? toResult(c, null, runJsTests(run.scope, c.tests)) : toResult(c, run.error, []));
  } else if (c.language === "sql") {
    if (!SQL) {
      const initSqlJs = (await import(pathToFileURL(join(here, "..", "node_modules", "sql.js", "dist", "sql-wasm.js")).href)).default;
      SQL = await initSqlJs();
    }
    const run = executeSql(SQL, c.source, c.setup);
    results.push(run.error ? toResult(c, run.error, []) : toResult(c, null, runSqlTests(run, c.tests)));
    run.db.close();
  } else {
    warn.push(`${c.label}: ${c.language} lessons need the remote runner; not validated locally`);
    results.push({ label: c.label, skipped: true, results: [] });
  }
}
let ok = 0;
results.forEach((r, i) => {
  const c = cases[i];
  if (r.skipped) return;
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

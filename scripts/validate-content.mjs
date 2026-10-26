// Validates every project's lessons against the real engines (Python, JavaScript, SQL) and, with
// RUNNER_BASE_URL set, the pockett runner (C#, C++, Go).
//   node scripts/validate-content.mjs [slug]
//   RUNNER_BASE_URL=https://www.pockett.ai node scripts/validate-content.mjs csharp-basics
// Server-language lessons call ${RUNNER_BASE_URL}/api/run (throttled to stay under its rate limit,
// retried on 429/5xx) and are judged with the browser runtime's own rules (remote-output.ts).
// RUNNER_CACHE=1 reuses earlier runner answers for identical source (speeds up authoring loops).
// Without RUNNER_BASE_URL those lessons are skipped with a warning.
// Solutions must pass all tests. Starters must NOT pass all tests (so lessons aren't pre-solved).
process.env.NODE_NO_WARNINGS = "1";
import { readdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { Worker } from "node:worker_threads";
import { ENGINE_PRELUDE } from "../src/engine/python/prelude.ts";
import { solutionThrough, starterFor, TYPES_DIVIDER } from "../src/engine/compose.ts";
import { flattenLessons, languageOf, TIERS, YOUR_TURN_MARKER } from "../src/engine/types.ts";
import { executeJs, runJsTests } from "../src/engine/runtimes/javascript/engine.ts";
import { readFileSync, existsSync } from "node:fs";
import { parseOutput, runChecks, toError } from "../src/engine/runtimes/remote-output.ts";
import { FOUNDATIONS } from "../src/content/foundations/index.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const only = process.argv[2];
// Optional: only run the lessons whose id contains this text (handy with slow server languages).
const lessonFilter = process.argv[3];
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
    // Composition must be whitespace-idempotent around the types divider: one blank line each side, never more.
    for (const [kind, composed] of [["solution", solutionThrough(project, i)], ["starter", starterFor(project, i, {})]]) {
      const at = composed.indexOf(TYPES_DIVIDER);
      if (at < 0) continue;
      const around = composed.slice(Math.max(0, at - 8), at + TYPES_DIVIDER.length + 8);
      if (/\n[ \t]*\n[ \t]*\n/.test(around)) problems.push(`${tag}: ${kind} has extra blank lines around the types divider`);
      if (composed.split(TYPES_DIVIDER).length > 2) problems.push(`${tag}: ${kind} contains the types divider more than once`);
    }
    if (lessonFilter && !lesson.id.includes(lessonFilter)) return;
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
  // "micropip:name==1.2.3" packages are pure-Python PyPI wheels (installed with micropip in the
  // browser). Locally the exact version must be installed too, so install it if it is missing.
  const pythonBin = process.platform === "win32" ? "python" : "python3";
  const wheelSpecs = [...new Set(pyCases.flatMap((c) => c.packages ?? []).filter((p) => p.startsWith("micropip:")).map((p) => p.slice("micropip:".length)))];
  const installedVersion = (name) => {
    const probe = "import site,sys;sys.path.append(site.getusersitepackages())\nfrom importlib.metadata import version\nprint(version(sys.argv[1]))";
    const r = spawnSync(pythonBin, ["-I", "-c", probe, name], { encoding: "utf8" });
    return r.status === 0 ? r.stdout.trim() : null;
  };
  for (const spec of wheelSpecs) {
    const [name, wanted] = spec.split("==");
    if (installedVersion(name) === wanted) continue;
    const cmd = `${pythonBin} -m pip install --user ${spec}`;
    console.log(`validator: ${spec} is not installed locally; running: ${cmd}`);
    const r = spawnSync(pythonBin, ["-m", "pip", "install", "--user", "--quiet", "--disable-pip-version-check", spec], { encoding: "utf8" });
    if (r.status !== 0 || installedVersion(name) !== wanted) {
      warn.push(`could not install ${spec} locally (${(r.stderr || "").trim().split("\n").pop()}); run it yourself: ${cmd}. Cases that need it are skipped.`);
    }
  }
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

// ── compiled languages: the pockett runner ──
const RUNNER = (process.env.RUNNER_BASE_URL ?? "").trim().replace(/\/+$/, "");
const RUNNER_GAP_MS = Number(process.env.RUNNER_GAP_MS) || 2200; // between request starts (the route allows ~30/min per IP)
const RUNNER_CACHE_FILE = join(tmpdir(), "pockett-validate-runner-cache.json");
const runnerCache = process.env.RUNNER_CACHE === "1" && existsSync(RUNNER_CACHE_FILE) ? JSON.parse(readFileSync(RUNNER_CACHE_FILE, "utf8")) : {};
let lastRunnerCall = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runnerExecute(c) {
  const key = createHash("sha1").update(`${RUNNER}|${c.language}|${c.setup}|${c.source}`).digest("hex");
  if (process.env.RUNNER_CACHE === "1" && runnerCache[key]) return runnerCache[key];
  let failure = "";
  for (let attempt = 0; attempt < 8; attempt++) {
    const wait = lastRunnerCall + RUNNER_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRunnerCall = Date.now();
    let res;
    try {
      res = await fetch(`${RUNNER}/api/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: c.language, source: c.source, stdin: c.setup ?? "" }),
        signal: AbortSignal.timeout(90_000),
      });
    } catch (err) {
      failure = String(err?.message ?? err);
      await sleep(3000);
      continue;
    }
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const out = { stdout: data.stdout ?? "", stderr: data.stderr ?? "", exitCode: data.exitCode ?? null, compileError: data.compileError ?? null, timedOut: data.timedOut };
      if (process.env.RUNNER_CACHE === "1") {
        runnerCache[key] = out;
        writeFileSync(RUNNER_CACHE_FILE, JSON.stringify(runnerCache));
      }
      return out;
    }
    failure = `HTTP ${res.status}: ${data.error ?? "no message"}`;
    if (res.status === 429) await sleep((Number(res.headers.get("retry-after")) || 5) * 1000 + 500);
    else if (res.status >= 500) await sleep(4000);
    else break; // 4xx: retrying will not help
  }
  throw new Error(failure);
}

// SQL cases run in a worker thread (the same engine code as the browser's SQL worker) so a runaway
// query is reported as a problem after SQL_TIMEOUT_MS instead of hanging the validator.
const SQL_TIMEOUT_MS = Number(process.env.SQL_TIMEOUT_MS) || 10_000;
let sqlWorker = null;
function startSqlWorker() {
  const worker = new Worker(new URL("./validate-sql-worker.mjs", import.meta.url));
  const ready = new Promise((resolve, reject) => {
    worker.once("message", resolve);
    worker.once("error", reject);
  });
  return { worker, ready };
}
async function sqlExecute(c) {
  sqlWorker ??= startSqlWorker();
  const { worker, ready } = sqlWorker;
  await ready;
  return new Promise((resolve) => {
    const finish = (value) => {
      clearTimeout(timer);
      worker.off("message", onMessage);
      worker.off("error", onError);
      resolve(value);
    };
    const onMessage = (m) => finish(m);
    const onError = (err) => {
      sqlWorker = null;
      finish({ error: { type: "ValidatorError", message: String(err?.message ?? err), line: null }, tested: [] });
    };
    const timer = setTimeout(() => {
      sqlWorker = null;
      worker.terminate();
      finish({ error: { type: "TimeoutError", message: `ran longer than ${SQL_TIMEOUT_MS / 1000}s (runaway recursive CTE or join?)`, line: null }, tested: [] });
    }, SQL_TIMEOUT_MS);
    worker.on("message", onMessage);
    worker.on("error", onError);
    worker.postMessage({ source: c.source, setup: c.setup, tests: c.tests });
  });
}

const toResult = (c, error, tests) => ({ label: c.label, error, results: tests.map((t) => ({ id: t.testId, ok: t.passed, error: t.error })) });
const results = [];
for (const c of cases) {
  if (c.language === "python") {
    const r = pyResults.shift();
    if (r.warn) warn.push(`${r.label}: ${r.warn}`);
    results.push(r);
  } else if (c.language === "javascript") {
    // the JavaScript engine is async: top-level await in the file, and checks may await too
    const run = await executeJs(c.source);
    if (run.ok) {
      results.push(toResult(c, null, await runJsTests(run.scope, c.tests)));
      run.scope.dispose();
    } else results.push(toResult(c, run.error, []));
  } else if (c.language === "sql") {
    const run = await sqlExecute(c);
    results.push(run.error ? toResult(c, run.error, []) : toResult(c, null, run.tested));
  } else if (RUNNER) {
    let r;
    try {
      r = await runnerExecute(c);
    } catch (err) {
      problems.push(`${c.label}: the runner at ${RUNNER} did not answer (${err.message})`);
      results.push({ label: c.label, skipped: true, results: [] });
      continue;
    }
    const out = parseOutput(r.stdout);
    const error = toError(r);
    results.push(error ? toResult(c, error, []) : toResult(c, null, runChecks(out.text, out.scene, c.tests)));
  } else {
    warn.push(`${c.label}: ${c.language} lessons need the remote runner; not validated locally (set RUNNER_BASE_URL, e.g. https://www.pockett.ai)`);
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
const skipped = results.filter((r) => r.skipped).length;
console.log(`\n${ok}/${results.length} checks ok, ${problems.length} problems, ${warn.length} warnings${skipped ? `, ${skipped} skipped` : ""}`);
void sqlWorker?.worker.terminate();
process.exit(problems.length ? 1 : 0);

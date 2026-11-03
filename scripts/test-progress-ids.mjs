// Headless checks that progress sync covers EVERY lesson (all projects + Foundations).
//   node scripts/test-progress-ids.mjs
// Loads the real content through a tiny resolve hook (scripts/ts-alias-hooks.mjs) so "@/..." works in Node.
process.env.NODE_NO_WARNINGS = "1";
import assert from "node:assert/strict";
import { register } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const BASELINE = "5f3d3c7";

register(pathToFileURL(path.join(HERE, "ts-alias-hooks.mjs")).href);

async function lessonList(srcDir) {
  const href = (p) => pathToFileURL(path.join(srcDir, p)).href;
  const { PROJECTS } = await import(href("content/index.ts"));
  const { flattenLessons } = await import(href("engine/types.ts"));
  const { FOUNDATIONS } = await import(href("content/foundations/index.ts"));
  const { trackLessons } = await import(href("learn/types.ts"));
  const out = [];
  for (const p of PROJECTS) for (const l of flattenLessons(p)) out.push({ id: l.id, slug: p.slug, xp: l.xp, source: "project" });
  for (const l of trackLessons(FOUNDATIONS)) out.push({ id: l.id, slug: FOUNDATIONS.slug, xp: l.xp, source: "foundations" });
  return out;
}

// child mode: print the lesson list of another checkout (used for the baseline commit)
if (process.argv[2] === "--dump") {
  console.log("@@IDS@@" + JSON.stringify(await lessonList(path.join(process.argv[3], "src"))));
  process.exit(0);
}

const { mergeProgress } = await import(pathToFileURL(path.join(REPO, "src/data/progress/merge.ts")).href);
const all = await lessonList(path.join(REPO, "src"));
const byId = new Map(all.map((l) => [l.id, l]));

let n = 0;
const check = (name, fn) => { fn(); n++; console.log("ok  ", name); };

const base = { version: 2, xp: 0, streak: 0, bestStreak: 0, lastActiveDate: null, completed: {}, drafts: {}, draftsAt: {}, attempts: {}, hintsSeen: {}, audio: { enabled: false, volume: 0.6 } };

// (1) id hygiene
check("every lesson id is non-empty, whitespace-free, <= 100 chars", () => {
  assert.ok(all.length > 0);
  for (const l of all) {
    assert.equal(typeof l.id, "string");
    assert.ok(l.id.length > 0 && l.id.length <= 100, `bad length: ${l.id}`);
    assert.ok(!/\s/.test(l.id), `whitespace in id: ${JSON.stringify(l.id)}`);
  }
});
check("lesson ids are globally unique (projects and Foundations)", () => {
  const seen = new Map();
  const dups = [];
  for (const l of all) {
    if (seen.has(l.id)) dups.push(`${l.id} (${seen.get(l.id)} vs ${l.slug})`);
    else seen.set(l.id, l.slug);
  }
  assert.deepEqual(dups, [], "duplicate lesson ids: " + dups.join(", "));
});
check("no Foundations id collides with a project id; fnd- prefix only in Foundations", () => {
  const proj = new Set(all.filter((l) => l.source === "project").map((l) => l.id));
  assert.deepEqual(all.filter((l) => l.source === "foundations" && proj.has(l.id)).map((l) => l.id), []);
  assert.deepEqual(all.filter((l) => l.source === "foundations" && !l.id.startsWith("fnd-")).map((l) => l.id), []);
  assert.deepEqual(all.filter((l) => l.source === "project" && l.id.startsWith("fnd-")).map((l) => l.id), []);
});

// (2) the lookup sync.ts builds: projects first, then Foundations (slug 'foundations')
const LESSONS = new Map();
for (const l of all.filter((x) => x.source === "project")) LESSONS.set(l.id, { slug: l.slug, xp: l.xp });
for (const l of all.filter((x) => x.source === "foundations")) LESSONS.set(l.id, { slug: l.slug, xp: l.xp });
const xpOf = (id) => LESSONS.get(id)?.xp ?? 0;
check("lookup covers every lesson with the right project_slug and a positive integer xp", () => {
  assert.equal(LESSONS.size, all.length);
  for (const l of all) {
    const e = LESSONS.get(l.id);
    assert.ok(e, `not covered: ${l.id}`);
    assert.equal(e.slug, l.slug);
    assert.ok(typeof l.slug === "string" && l.slug.length > 0, `empty slug for ${l.id}`);
    assert.ok(Number.isInteger(e.xp) && e.xp > 0, `bad xp for ${l.id}: ${e.xp}`);
  }
  assert.ok(all.filter((l) => l.source === "foundations").every((l) => l.slug === "foundations"));
});

const groups = new Map();
for (const l of all) (groups.get(l.slug) ?? groups.set(l.slug, []).get(l.slug)).push(l);
// Foundations modules: fnd-<module>-<n>-...
const modGroups = new Map();
for (const l of all.filter((x) => x.source === "foundations")) {
  const m = l.id.split("-")[1] ?? "?";
  (modGroups.get(m) ?? modGroups.set(m, []).get(m)).push(l);
}
console.log(`     ${all.length} lessons: ${groups.size - 1} projects + ${modGroups.size} Foundations module groups`);
const picks = [];
for (const [slug, ls] of groups) if (slug !== "foundations") picks.push(ls[0]);
for (const [, ls] of modGroups) picks.push(ls[0]);
for (const id of ["fnd-programs-0-editor", "fnd-data-0-sql-primer", "fnd-ai-0-llm-primer"]) {
  if (byId.has(id) && !picks.includes(byId.get(id))) picks.push(byId.get(id));
}

const T0 = "2026-10-20T10:00:00Z";
const rowOf = (l, extra = {}) => ({ lesson_id: l.id, project_slug: l.slug, code: `code:${l.id}`, attempts: 1, completed_at: T0, updated_at: T0, ...extra });
const doneOf = (l, at = T0) => ({ at, updatedAt: at, code: `code:${l.id}`, attempts: 1 });
const xpSum = (ls) => ls.reduce((s, l) => s + l.xp, 0);

check("expected new lessons exist", () => {
  for (const id of ["fnd-programs-0-editor", "fnd-data-0-sql-primer", "fnd-ai-0-llm-primer"]) assert.ok(byId.has(id), `missing ${id}`);
  for (const s of ["art-studio", "ai-first-steps", "go-pipeline", "rust-traits", "cpp-engine", "pit-wall"]) assert.ok(groups.has(s), `missing project ${s}`);
});

check("two devices: A completes one lesson per project and Foundations module; empty B pulls the same set and xp; then back", () => {
  const a = { ...base, completed: Object.fromEntries(picks.map((l) => [l.id, doneOf(l)])), xp: xpSum(picks) };
  const rows = picks.map((l) => rowOf(l));
  const b = mergeProgress(base, { xp: a.xp, streak: 1, best_streak: 1, last_active_date: "2026-10-20" }, rows, [], xpOf);
  assert.deepEqual(Object.keys(b.completed).sort(), picks.map((l) => l.id).sort());
  assert.equal(b.xp, xpSum(picks));
  for (const l of picks) assert.equal(b.completed[l.id].code, `code:${l.id}`);
  // reverse: B's state pushed to the cloud, A pulls it -> identical
  const rows2 = Object.entries(b.completed).map(([id, c]) => rowOf(byId.get(id), { code: c.code, completed_at: c.at, updated_at: c.updatedAt }));
  const a2 = mergeProgress(a, null, rows2, [], xpOf);
  assert.deepEqual(Object.keys(a2.completed).sort(), Object.keys(a.completed).sort());
  assert.equal(a2.xp, a.xp);
});

check("EVERY lesson completed: pulled onto an empty device and kept locally, all ids and total xp survive", () => {
  const m = mergeProgress(base, null, all.map((l) => rowOf(l)), [], xpOf);
  assert.equal(Object.keys(m.completed).length, all.length);
  assert.equal(m.xp, xpSum(all));
  const full = { ...base, completed: Object.fromEntries(all.map((l) => [l.id, doneOf(l)])) };
  const m2 = mergeProgress(full, null, [], [], xpOf);
  assert.equal(m2.xp, xpSum(all));
  assert.equal(Object.keys(m2.completed).length, all.length);
});

check("both devices complete different lessons: merge is the union with correct xp (with overlap, both directions)", () => {
  const evens = all.filter((_, i) => i % 2 === 0);
  const odds = all.filter((_, i) => i % 2 === 1);
  const overlap = all.slice(0, 5);
  const a = { ...base, completed: Object.fromEntries([...evens, ...overlap].map((l) => [l.id, doneOf(l)])) };
  const m = mergeProgress(a, null, [...odds, ...overlap].map((l) => rowOf(l)), [], xpOf);
  assert.equal(Object.keys(m.completed).length, all.length);
  assert.equal(m.xp, xpSum(all));
  const b = { ...base, completed: Object.fromEntries([...odds, ...overlap].map((l) => [l.id, doneOf(l)])) };
  const m2 = mergeProgress(b, null, [...evens, ...overlap].map((l) => rowOf(l)), [], xpOf);
  assert.deepEqual(Object.keys(m2.completed).sort(), Object.keys(m.completed).sort());
  assert.equal(m2.xp, m.xp);
});

check("re-pass keeps the first-pass date and does not double-count xp", () => {
  for (const l of picks) {
    const local = { ...base, completed: { [l.id]: { at: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z", code: "old", attempts: 1 } } };
    const m = mergeProgress(local, null, [rowOf(l, { code: "better", attempts: 5, completed_at: "2026-10-09T00:00:00Z", updated_at: "2026-10-30T00:00:00Z" })], [], xpOf);
    assert.equal(m.completed[l.id].code, "better");
    assert.equal(m.completed[l.id].at, "2026-10-01T00:00:00Z");
    assert.equal(m.xp, l.xp);
  }
});

// (4) drafts
check("drafts for new-project lessons come down; a newer local draft wins; hints take the max", () => {
  for (const s of ["art-studio", "ai-first-steps", "go-pipeline", "rust-traits", "cpp-engine", "pit-wall"]) {
    for (const l of [groups.get(s)[0], groups.get(s).at(-1)]) {
      const m = mergeProgress(base, null, [], [{ lesson_id: l.id, code: "draft!", hints_seen: 2, updated_at: T0 }], xpOf);
      assert.equal(m.drafts[l.id], "draft!"); assert.equal(m.hintsSeen[l.id], 2); assert.equal(m.xp, 0);
      const local = { ...base, drafts: { [l.id]: "mine" }, draftsAt: { [l.id]: "2026-10-25T00:00:00Z" }, hintsSeen: { [l.id]: 4 } };
      const m2 = mergeProgress(local, null, [], [{ lesson_id: l.id, code: "old", hints_seen: 1, updated_at: T0 }], xpOf);
      assert.equal(m2.drafts[l.id], "mine"); assert.equal(m2.hintsSeen[l.id], 4);
    }
  }
});

// (5) orphan ids
check("orphan ids (lesson no longer in content) do not break merge and count 0 xp", () => {
  const real = all[0];
  const ghost = (id) => ({ id, slug: "garage" });
  const local = { ...base, completed: { "removed-lesson-1": doneOf(ghost("removed-lesson-1")), [real.id]: doneOf(real) } };
  const m = mergeProgress(local, null, [rowOf(ghost("renamed-old-id")), rowOf(real)], [{ lesson_id: "ghost-draft", code: "x", hints_seen: 0, updated_at: T0 }], xpOf);
  assert.equal(m.xp, real.xp);
  assert.ok(m.completed["removed-lesson-1"] && m.completed["renamed-old-id"], "orphans are preserved, not dropped");
  const unknown = Object.keys(m.completed).filter((id) => !LESSONS.has(id));
  console.log(`     orphan sample: ${unknown.length} of ${Object.keys(m.completed).length} completed ids unknown to content (${unknown.join(", ")}) -> xp counted 0 for them, no throw`);
});

// (6) ids from the baseline commit must survive
{
  const tmpBase = mkdtempSync(path.join(tmpdir(), "pl-baseline-"));
  const wt = path.join(tmpBase, "wt");
  let old = null, skipReason = null;
  try {
    execFileSync("git", ["rev-parse", "--verify", BASELINE + "^{commit}"], { cwd: REPO, stdio: "pipe" });
    execFileSync("git", ["worktree", "add", "--detach", wt, BASELINE], { cwd: REPO, stdio: "pipe" });
    const out = execFileSync(process.execPath, ["--no-warnings", path.join(HERE, "test-progress-ids.mjs"), "--dump", wt], {
      cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, PL_SRC: path.join(wt, "src") },
    });
    old = JSON.parse(out.split("@@IDS@@")[1]);
  } catch (e) {
    skipReason = String(e.stderr || e.message).split("\n")[0];
  } finally {
    try { execFileSync("git", ["worktree", "remove", "--force", wt], { cwd: REPO, stdio: "pipe" }); } catch {}
    try { execFileSync("git", ["worktree", "prune"], { cwd: REPO, stdio: "pipe" }); } catch {}
    if (existsSync(tmpBase)) rmSync(tmpBase, { recursive: true, force: true });
  }
  if (!old) {
    console.log(`SKIP baseline id check (commit ${BASELINE} not available: ${skipReason})`);
  } else {
    check(`ids saved at ${BASELINE} still exist (${old.length} old ids, ${all.length} now)`, () => {
      const missing = old.filter((o) => !byId.has(o.id)).map((o) => `${o.id} (${o.slug})`);
      assert.deepEqual(missing, [], `${missing.length} old lesson ids are gone (saved progress would be orphaned): ${missing.join(", ")}`);
      const moved = old.filter((o) => byId.get(o.id).slug !== o.slug).map((o) => `${o.id}: ${o.slug} -> ${byId.get(o.id).slug}`);
      assert.deepEqual(moved, [], "lessons changed project_slug: " + moved.join(", "));
    });
  }
}

console.log(`\n${n} id/sync coverage checks passed`);

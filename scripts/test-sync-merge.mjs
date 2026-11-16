// Headless checks for the local <-> cloud progress merge (src/data/progress/merge.ts).
//   node scripts/test-sync-merge.mjs
process.env.NODE_NO_WARNINGS = "1";
import assert from "node:assert/strict";
import { mergeProgress, mergeProgressStates } from "../src/data/progress/merge.ts";

const XP = { a: 50, b: 60, c: 80 };
const xpOf = (id) => XP[id] ?? 0;
const base = { version: 2, xp: 0, streak: 0, bestStreak: 0, lastActiveDate: null, completed: {}, drafts: {}, draftsAt: {}, attempts: {}, hintsSeen: {}, audio: { enabled: false, volume: 0.6 } };
const done = (at, code, attempts = 1) => ({ at, code, attempts });
let n = 0;
const check = (name, fn) => { fn(); n++; console.log("ok  ", name); };

check("new device + cloud progress: everything comes down", () => {
  const m = mergeProgress(base, { xp: 110, streak: 3, best_streak: 5, last_active_date: "2026-10-20" },
    [{ lesson_id: "a", project_slug: "garage", code: "A", attempts: 2, completed_at: "2026-10-19T10:00:00Z" },
     { lesson_id: "b", project_slug: "garage", code: "B", attempts: 1, completed_at: "2026-10-20T10:00:00Z" }],
    [{ lesson_id: "c", code: "draft", hints_seen: 2 }], xpOf);
  assert.deepEqual(Object.keys(m.completed).sort(), ["a", "b"]);
  assert.equal(m.xp, 110); assert.equal(m.streak, 3); assert.equal(m.bestStreak, 5); assert.equal(m.lastActiveDate, "2026-10-20");
  assert.equal(m.drafts.c, "draft"); assert.equal(m.hintsSeen.c, 2);
});

check("guest progress + empty account: nothing is lost", () => {
  const local = { ...base, xp: 50, streak: 1, bestStreak: 1, lastActiveDate: "2026-10-24", completed: { a: done("2026-10-24T09:00:00Z", "mine") }, drafts: { b: "wip" } };
  const m = mergeProgress(local, { xp: 0, streak: 0, best_streak: 0, last_active_date: null }, [], [], xpOf);
  assert.equal(m.completed.a.code, "mine"); assert.equal(m.drafts.b, "wip"); assert.equal(m.xp, 50); assert.equal(m.streak, 1);
});

check("both sides: union, newest code wins, xp not double-counted", () => {
  const local = { ...base, xp: 110, completed: { a: done("2026-10-24T09:00:00Z", "local-new", 1), b: done("2026-10-01T09:00:00Z", "local-old", 4) } };
  const m = mergeProgress(local, null,
    [{ lesson_id: "a", project_slug: "garage", code: "cloud-old", attempts: 3, completed_at: "2026-10-01T00:00:00Z" },
     { lesson_id: "b", project_slug: "garage", code: "cloud-new", attempts: 1, completed_at: "2026-10-23T00:00:00Z" },
     { lesson_id: "c", project_slug: "garage", code: "C", attempts: 1, completed_at: "2026-10-22T00:00:00Z" }], [], xpOf);
  assert.equal(m.completed.a.code, "local-new"); assert.equal(m.completed.a.attempts, 3);
  assert.equal(m.completed.b.code, "cloud-new"); assert.equal(m.completed.b.attempts, 4);
  assert.equal(m.xp, 190);
});

check("this device's draft beats the cloud draft", () => {
  const m = mergeProgress({ ...base, drafts: { a: "local" }, hintsSeen: { a: 1 } }, null, [], [{ lesson_id: "a", code: "cloud", hints_seen: 3 }], xpOf);
  assert.equal(m.drafts.a, "local"); assert.equal(m.hintsSeen.a, 3);
});

check("older cloud activity keeps the local streak", () => {
  const m = mergeProgress({ ...base, streak: 4, bestStreak: 4, lastActiveDate: "2026-10-24" }, { xp: 0, streak: 9, best_streak: 9, last_active_date: "2026-09-01" }, [], [], xpOf);
  assert.equal(m.streak, 4); assert.equal(m.bestStreak, 9); assert.equal(m.lastActiveDate, "2026-10-24");
});

check("re-passed lesson: the newest pass wins, first-pass date and attempts are kept", () => {
  const local = { ...base, completed: { a: { at: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z", code: "old", attempts: 1 } } };
  const m = mergeProgress(local, null,
    [{ lesson_id: "a", project_slug: "garage", code: "improved", attempts: 4, completed_at: "2026-10-05T00:00:00Z", updated_at: "2026-10-20T00:00:00Z" }], [], xpOf);
  assert.equal(m.completed.a.code, "improved"); assert.equal(m.completed.a.at, "2026-10-01T00:00:00Z"); assert.equal(m.completed.a.attempts, 1);
});

check("stale device can't overwrite a newer cloud draft", () => {
  const local = { ...base, drafts: { a: "stale" }, draftsAt: { a: "2026-10-01T00:00:00Z" } };
  const m = mergeProgress(local, null, [], [{ lesson_id: "a", code: "newer", hints_seen: 0, updated_at: "2026-10-23T00:00:00Z" }], xpOf);
  assert.equal(m.drafts.a, "newer"); assert.equal(m.draftsAt.a, "2026-10-23T00:00:00Z");
});

check("newer local draft beats an older cloud draft", () => {
  const local = { ...base, drafts: { a: "fresh" }, draftsAt: { a: "2026-10-24T00:00:00Z" } };
  const m = mergeProgress(local, null, [], [{ lesson_id: "a", code: "old", hints_seen: 0, updated_at: "2026-10-02T00:00:00Z" }], xpOf);
  assert.equal(m.drafts.a, "fresh");
});

check("audio: a cloud row that was never written (or has no columns yet) leaves the device muted", () => {
  const prof = { xp: 0, streak: 0, best_streak: 0, last_active_date: null };
  assert.deepEqual(mergeProgress(base, { ...prof, audio_enabled: true, audio_volume: 0.9, audio_updated_at: null }, [], [], xpOf).audio, base.audio);
  assert.deepEqual(mergeProgress(base, prof, [], [], xpOf).audio, base.audio);
});

check("audio: newest explicit choice wins, volume clamped", () => {
  const prof = { xp: 0, streak: 0, best_streak: 0, last_active_date: null };
  const local = { ...base, audio: { enabled: true, volume: 0.3, at: "2026-10-20T00:00:00Z" } };
  const newerCloud = mergeProgress(local, { ...prof, audio_enabled: false, audio_volume: 7, audio_updated_at: "2026-10-25T00:00:00Z" }, [], [], xpOf).audio;
  assert.deepEqual(newerCloud, { enabled: false, volume: 1, at: "2026-10-25T00:00:00Z" });
  const olderCloud = mergeProgress(local, { ...prof, audio_enabled: false, audio_volume: 0.9, audio_updated_at: "2026-10-01T00:00:00Z" }, [], [], xpOf).audio;
  assert.deepEqual(olderCloud, local.audio);
});

{
  // Same lookup sync.ts builds: Foundations lessons registered with their own xp.
  const { FOUNDATIONS } = await import("../src/content/foundations/index.ts");
  const { trackLessons } = await import("../src/learn/types.ts");
  const fnd = trackLessons(FOUNDATIONS);
  assert.ok(fnd.length > 0 && fnd.every((l) => l.id.startsWith("fnd-") && l.xp > 0));
  const lookup = new Map([...Object.entries(XP).map(([id, xp]) => [id, xp]), ...fnd.map((l) => [l.id, l.xp])]);
  const fxp = (id) => lookup.get(id) ?? 0;
  const [f1, f2] = fnd;
  check("fnd- cloud completions come down with their xp (new device)", () => {
    const m = mergeProgress(base, { xp: f1.xp, streak: 1, best_streak: 1, last_active_date: "2026-10-20" },
      [{ lesson_id: f1.id, project_slug: "foundations", code: "", attempts: 1, completed_at: "2026-10-20T10:00:00Z" }], [], fxp);
    assert.ok(m.completed[f1.id]);
    assert.equal(m.xp, f1.xp);
  });
  check("fnd- local completion is kept and xp includes it when merging with a cloud that has other lessons", () => {
    const local = { ...base, xp: f2.xp, completed: { [f2.id]: done("2026-10-24T09:00:00Z", "") } };
    const m = mergeProgress(local, { xp: 50, streak: 0, best_streak: 0, last_active_date: null },
      [{ lesson_id: "a", project_slug: "garage", code: "A", attempts: 1, completed_at: "2026-10-19T10:00:00Z" }], [], fxp);
    assert.ok(m.completed[f2.id]);
    assert.equal(m.xp, 50 + f2.xp);
  });
}

// the phone app hands its own progress object to the lesson pages it hosts (src/lib/embed/boot.ts)
check("app progress into a device: union, newest code and draft win, xp recomputed, counts take the max", () => {
  const local = { ...base, xp: 50, streak: 1, bestStreak: 2, lastActiveDate: "2026-10-20",
    completed: { a: { ...done("2026-10-20T09:00:00Z", "old-a", 2), updatedAt: "2026-10-20T09:00:00Z" } },
    drafts: { c: "local-draft" }, draftsAt: { c: "2026-10-25T00:00:00Z" }, attempts: { a: 2, c: 5 }, hintsSeen: { c: 1, x: 3 } };
  const app = { ...base, xp: 110, streak: 4, bestStreak: 4, lastActiveDate: "2026-10-24",
    completed: { a: { ...done("2026-10-22T09:00:00Z", "new-a", 1), updatedAt: "2026-10-22T09:00:00Z" }, b: done("2026-10-24T09:00:00Z", "B") },
    drafts: { c: "app-draft", d: "app-only" }, draftsAt: { c: "2026-10-21T00:00:00Z", d: "2026-10-24T00:00:00Z" }, attempts: { c: 7 }, hintsSeen: { c: 2 },
    audio: { enabled: true, volume: 0.3, at: "2026-10-24T00:00:00Z" } };
  const m = mergeProgressStates(local, app, xpOf);
  assert.deepEqual(Object.keys(m.completed).sort(), ["a", "b"]);
  assert.equal(m.completed.a.code, "new-a"); assert.equal(m.completed.a.at, "2026-10-20T09:00:00Z"); assert.equal(m.completed.a.attempts, 2);
  assert.equal(m.xp, 110);
  assert.equal(m.drafts.c, "local-draft"); assert.equal(m.drafts.d, "app-only");
  assert.equal(m.streak, 4); assert.equal(m.lastActiveDate, "2026-10-24"); assert.equal(m.bestStreak, 4);
  assert.equal(m.attempts.c, 7); assert.equal(m.attempts.a, 2); assert.equal(m.hintsSeen.c, 2); assert.equal(m.hintsSeen.x, 3);
  assert.equal(m.audio.enabled, true);
});
check("app progress merge is idempotent (merging the same copy twice changes nothing)", () => {
  const app = { ...base, completed: { a: done("2026-10-22T09:00:00Z", "A") }, drafts: { b: "B" }, draftsAt: { b: "2026-10-22T00:00:00Z" } };
  const once = mergeProgressStates(base, app, xpOf);
  assert.deepEqual(mergeProgressStates(once, app, xpOf), once);
});

console.log(`\n${n} merge checks passed`);

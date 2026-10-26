// Headless checks for the local <-> cloud progress merge (src/data/progress/merge.ts).
//   node scripts/test-sync-merge.mjs
process.env.NODE_NO_WARNINGS = "1";
import assert from "node:assert/strict";
import { mergeProgress } from "../src/data/progress/merge.ts";

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

console.log(`\n${n} merge checks passed`);

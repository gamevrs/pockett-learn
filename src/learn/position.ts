"use client";

/**
 * Where the learner stopped in each Foundations lesson, so closing a lesson half-way and coming
 * back resumes at that step instead of step 1.
 *
 * Kept in its own localStorage key on purpose: it is per-device scratch state ("I was on step 7"),
 * not progress. It never goes into the synced progress state, so there is no cloud or schema change.
 * Every access is wrapped in try/catch: storage can be blocked (private windows), full, or corrupt,
 * and the lesson must still work, just without resuming.
 *
 * Lessons gain and lose steps over time, so a bare index can point at the wrong step. v2 stores
 * { s: index, r: short hash of that step, n: step count }; on restore the hash is searched for first
 * (so the learner lands on the same step even if it moved), then the saved index is clamped.
 * v1 stored a bare number per lesson; that is still read (and replaced by a v2 entry on the next save).
 */

import type { Step } from "./types";

const KEY = "pockett_lesson_position_v2";
const LEGACY_KEY = "pockett_lesson_position_v1";

interface Saved {
  s: number;
  r: string;
  n: number;
}
type Positions = Record<string, Saved>;
type Legacy = Record<string, number>;

/** FNV-1a, 32-bit, base36: short, stable, and good enough to tell steps of one lesson apart. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** The one place a step's stable reference is computed: its kind, title and the start of its text. */
export function stepRef(step: Step | undefined): string {
  if (!step) return "";
  const text = step.kind === "recap" ? (step.points[0] ?? "") : (step.body ?? "");
  return hash(`${step.kind}|${step.title ?? ""}|${text.slice(0, 48)}`);
}

function readJson(key: string): Record<string, unknown> {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function readCurrent(): Positions {
  const out: Positions = {};
  for (const [id, v] of Object.entries(readJson(KEY))) {
    const e = v as Partial<Saved> | null;
    if (e && typeof e === "object" && Number.isInteger(e.s) && (e.s as number) > 0 && typeof e.r === "string" && Number.isInteger(e.n)) {
      out[id] = { s: e.s as number, r: e.r, n: e.n as number };
    }
  }
  return out;
}

function readLegacy(): Legacy {
  const out: Legacy = {};
  for (const [id, step] of Object.entries(readJson(LEGACY_KEY))) {
    if (typeof step === "number" && Number.isInteger(step) && step > 0) out[id] = step;
  }
  return out;
}

function write(key: string, all: object) {
  try {
    window.localStorage.setItem(key, JSON.stringify(all));
  } catch {
    /* blocked or full: resuming is a convenience, not a requirement */
  }
}

/** Pure resolution of a saved position against the lesson's current steps (exported for tests). */
export function resolveStep(saved: Saved | number | undefined, steps: Step[]): number {
  const total = steps.length;
  if (saved === undefined) return 0;
  if (typeof saved === "number") return saved > 0 && saved < total ? saved : 0; // legacy: index only
  const { s, r, n } = saved;
  if (!(s > 0) || total === 0) return 0;
  // same step, possibly moved: prefer the match closest to where it used to be
  let best = -1;
  for (let i = 0; i < total; i++) {
    if (stepRef(steps[i]) === r && (best < 0 || Math.abs(i - s) < Math.abs(best - s))) best = i;
  }
  if (best > 0) return best;
  if (best === 0) return 0;
  // the step is gone: keep the index if the lesson is the same length, otherwise clamp into range
  if (n === total && s < total) return s;
  return Math.min(s, total - 1);
}

/** The 0-based step to resume at, or 0 when there is nothing (valid) saved. */
export function savedStep(lessonId: string, steps: Step[]): number {
  if (typeof window === "undefined") return 0;
  try {
    const cur = readCurrent()[lessonId];
    return resolveStep(cur ?? readLegacy()[lessonId], steps);
  } catch {
    return 0;
  }
}

/** Remember that the learner is now on `step` (0-based). Step 0 is "not started", so it clears the entry. */
export function saveStep(lessonId: string, steps: Step[], step: number) {
  if (typeof window === "undefined") return;
  try {
    const all = readCurrent();
    if (step <= 0 || step >= steps.length) delete all[lessonId];
    else all[lessonId] = { s: step, r: stepRef(steps[step]), n: steps.length };
    write(KEY, all);
    // a v1 entry for this lesson is now superseded (or cleared); drop it so it cannot resurrect
    const legacy = readLegacy();
    if (lessonId in legacy) {
      delete legacy[lessonId];
      write(LEGACY_KEY, legacy);
    }
  } catch {
    /* ignore */
  }
}

export function clearStep(lessonId: string) {
  saveStep(lessonId, [], 0);
}

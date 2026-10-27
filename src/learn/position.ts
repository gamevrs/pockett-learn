"use client";

/**
 * Where the learner stopped in each Foundations lesson, so closing a lesson half-way and coming
 * back resumes at that step instead of step 1.
 *
 * Kept in its own localStorage key on purpose: it is per-device scratch state ("I was on step 7"),
 * not progress. It never goes into the synced progress state, so there is no cloud or schema change.
 * Every access is wrapped in try/catch: storage can be blocked (private windows), full, or corrupt,
 * and the lesson must still work, just without resuming.
 */

const KEY = "pockett_lesson_position_v1";

type Positions = Record<string, number>;

function read(): Positions {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object") return {};
    const out: Positions = {};
    for (const [id, step] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof step === "number" && Number.isInteger(step) && step > 0) out[id] = step;
    }
    return out;
  } catch {
    return {};
  }
}

function write(all: Positions) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* blocked or full: resuming is a convenience, not a requirement */
  }
}

/** The 0-based step to resume at, or 0 when there is nothing (valid) saved. */
export function savedStep(lessonId: string, total: number): number {
  if (typeof window === "undefined") return 0;
  const step = read()[lessonId];
  return step !== undefined && step > 0 && step < total ? step : 0;
}

/** Remember that the learner is now on `step` (0-based). Step 0 is "not started", so it clears the entry. */
export function saveStep(lessonId: string, step: number) {
  if (typeof window === "undefined") return;
  const all = read();
  if (step <= 0) delete all[lessonId];
  else all[lessonId] = step;
  write(all);
}

export function clearStep(lessonId: string) {
  saveStep(lessonId, 0);
}

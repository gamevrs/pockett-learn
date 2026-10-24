import type { CompletedLesson, ProgressState } from "./types";

/** Cloud rows as stored in Supabase (see supabase/migrations). */
export interface CompletionRow {
  lesson_id: string;
  project_slug: string;
  code: string;
  attempts: number;
  completed_at: string;
  updated_at?: string;
}
export interface DraftRow {
  lesson_id: string;
  code: string;
  hints_seen: number;
  updated_at?: string;
}
export interface ProfileRow {
  xp: number;
  streak: number;
  best_streak: number;
  last_active_date: string | null;
}

/**
 * Merge cloud progress into this device's progress without losing anything from either side.
 * Pure (no imports beyond types) so scripts/test-sync-merge.mjs can run it in Node.
 *  - completions: union; on conflict the most recently passed code wins; first-pass date and
 *    attempts come from whichever side passed first
 *  - drafts: the most recently edited copy wins; hints take the max
 *  - xp: recomputed from the merged completions, so merging never double-counts
 *  - streak/last active: from whichever side was active most recently; best streak takes the max
 */
export function mergeProgress(
  local: ProgressState,
  profile: ProfileRow | null,
  completions: CompletionRow[],
  drafts: DraftRow[],
  xpOf: (lessonId: string) => number,
): ProgressState {
  const time = (iso: string | undefined) => (iso ? Date.parse(iso) || 0 : 0);
  const completed: Record<string, CompletedLesson> = { ...local.completed };
  for (const row of completions) {
    const mine = completed[row.lesson_id];
    const theirs: CompletedLesson = { at: row.completed_at, updatedAt: row.updated_at ?? row.completed_at, code: row.code, attempts: row.attempts };
    if (!mine) {
      completed[row.lesson_id] = theirs;
      continue;
    }
    const newest = time(theirs.updatedAt) > time(mine.updatedAt ?? mine.at) ? theirs : mine;
    const first = time(theirs.at) < time(mine.at) ? theirs : mine;
    completed[row.lesson_id] = { ...newest, at: first.at, attempts: first.attempts };
  }

  const draftsOut = { ...local.drafts };
  const draftsAt = { ...local.draftsAt };
  const hintsSeen = { ...local.hintsSeen };
  for (const row of drafts) {
    const localAt = time(draftsAt[row.lesson_id]);
    if (!(row.lesson_id in draftsOut) || time(row.updated_at) > localAt) {
      draftsOut[row.lesson_id] = row.code;
      if (row.updated_at) draftsAt[row.lesson_id] = row.updated_at;
    }
    hintsSeen[row.lesson_id] = Math.max(hintsSeen[row.lesson_id] ?? 0, row.hints_seen);
  }

  const cloudNewer = !!profile?.last_active_date && (!local.lastActiveDate || profile.last_active_date > local.lastActiveDate);
  return {
    ...local,
    completed,
    drafts: draftsOut,
    draftsAt,
    hintsSeen,
    xp: Object.keys(completed).reduce((sum, id) => sum + xpOf(id), 0),
    streak: cloudNewer ? profile!.streak : local.streak,
    lastActiveDate: cloudNewer ? profile!.last_active_date : local.lastActiveDate,
    bestStreak: Math.max(local.bestStreak, profile?.best_streak ?? 0),
  };
}

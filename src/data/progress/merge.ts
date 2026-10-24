import type { CompletedLesson, ProgressState } from "./types";

/** Cloud rows as stored in Supabase (see supabase/migrations). */
export interface CompletionRow {
  lesson_id: string;
  project_slug: string;
  code: string;
  attempts: number;
  completed_at: string;
}
export interface DraftRow {
  lesson_id: string;
  code: string;
  hints_seen: number;
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
 *  - completions: union; on conflict the most recent passing code wins, attempts take the max
 *  - drafts: this device wins (it is what the learner is looking at); hints take the max
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
  const completed: Record<string, CompletedLesson> = { ...local.completed };
  for (const row of completions) {
    const mine = completed[row.lesson_id];
    const theirs: CompletedLesson = { at: row.completed_at, code: row.code, attempts: row.attempts };
    if (!mine || Date.parse(theirs.at) > Date.parse(mine.at)) {
      completed[row.lesson_id] = { ...theirs, attempts: Math.max(theirs.attempts, mine?.attempts ?? 0) };
    } else {
      completed[row.lesson_id] = { ...mine, attempts: Math.max(mine.attempts, theirs.attempts) };
    }
  }

  const draftsOut = { ...local.drafts };
  const hintsSeen = { ...local.hintsSeen };
  for (const row of drafts) {
    if (!(row.lesson_id in draftsOut)) draftsOut[row.lesson_id] = row.code;
    hintsSeen[row.lesson_id] = Math.max(hintsSeen[row.lesson_id] ?? 0, row.hints_seen);
  }

  const cloudNewer = !!profile?.last_active_date && (!local.lastActiveDate || profile.last_active_date > local.lastActiveDate);
  return {
    ...local,
    completed,
    drafts: draftsOut,
    hintsSeen,
    xp: Object.keys(completed).reduce((sum, id) => sum + xpOf(id), 0),
    streak: cloudNewer ? profile!.streak : local.streak,
    lastActiveDate: cloudNewer ? profile!.last_active_date : local.lastActiveDate,
    bestStreak: Math.max(local.bestStreak, profile?.best_streak ?? 0),
  };
}

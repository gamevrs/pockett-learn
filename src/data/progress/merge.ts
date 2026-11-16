import type { AudioSettings, CompletedLesson, ProgressState } from "./types";

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
  /** Optional: only present once supabase/migrations/0004_audio_settings.sql is applied */
  audio_enabled?: boolean | null;
  audio_volume?: number | null;
  audio_updated_at?: string | null;
}

/** Newest change wins. A cloud row that was never written (no timestamp) is ignored, so the default stays muted. */
export function mergeAudio(local: AudioSettings, profile: ProfileRow | null): AudioSettings {
  if (!profile?.audio_updated_at || typeof profile.audio_enabled !== "boolean") return local;
  const cloudAt = Date.parse(profile.audio_updated_at) || 0;
  const localAt = local.at ? Date.parse(local.at) || 0 : 0;
  if (cloudAt <= localAt) return local;
  const v = profile.audio_volume;
  const volume = typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : local.volume;
  return { enabled: profile.audio_enabled, volume, at: profile.audio_updated_at };
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
    audio: mergeAudio(local.audio, profile),
  };
}

/**
 * Merge a whole progress object from somewhere else (the phone app hands its copy to the lesson pages it hosts, see
 * src/lib/embed) into this device's, with exactly the rules used for the cloud: the other copy is turned into the rows
 * the cloud would hold and run through mergeProgress. Attempts and hints, which the cloud keeps only next to drafts,
 * take the larger count. Pure, like the rest of this file.
 */
export function mergeProgressStates(local: ProgressState, other: ProgressState, xpOf: (lessonId: string) => number): ProgressState {
  const completions: CompletionRow[] = Object.entries(other.completed ?? {}).map(([id, c]) => ({
    lesson_id: id,
    project_slug: "",
    code: typeof c.code === "string" ? c.code : "",
    attempts: Number.isFinite(c.attempts) ? c.attempts : 1,
    completed_at: c.at,
    updated_at: c.updatedAt ?? c.at,
  }));
  const drafts: DraftRow[] = Object.entries(other.drafts ?? {}).map(([id, code]) => ({
    lesson_id: id,
    code,
    hints_seen: other.hintsSeen?.[id] ?? 0,
    updated_at: other.draftsAt?.[id],
  }));
  const profile: ProfileRow = {
    xp: other.xp,
    streak: other.streak,
    best_streak: other.bestStreak,
    last_active_date: other.lastActiveDate,
    audio_enabled: other.audio?.enabled,
    audio_volume: other.audio?.volume,
    audio_updated_at: other.audio?.at ?? null,
  };
  const merged = mergeProgress(local, profile, completions, drafts, xpOf);
  const larger = (a: Record<string, number>, b: Record<string, number> | undefined) => {
    const out = { ...a };
    for (const [id, n] of Object.entries(b ?? {})) if (typeof n === "number" && Number.isFinite(n)) out[id] = Math.max(out[id] ?? 0, n);
    return out;
  };
  return { ...merged, attempts: larger(merged.attempts, other.attempts), hintsSeen: larger(merged.hintsSeen, other.hintsSeen) };
}

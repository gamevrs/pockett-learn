"use client";

import { useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROJECTS } from "@/content";
import { flattenLessons } from "@/engine/types";
import { getSupabase } from "../supabase/client";
import { getAuth, subscribeAuth } from "../auth/store";
import { getProgress, replaceProgress, resetAllProgress, subscribeProgress } from "./store";
import type { ProgressState } from "./types";
import { mergeProgress, type CompletionRow, type DraftRow, type ProfileRow } from "./merge";

/**
 * Cloud sync. localStorage stays the source of truth for the UI (instant, works offline);
 * when someone is signed in this mirrors it to Supabase:
 *   sign-in  -> pull cloud rows, merge with this device, save locally, push the merged result
 *   changes  -> debounced push of only what changed since the last successful sync
 */

export type SyncStatus = "off" | "syncing" | "synced" | "error";
interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
}

const OFF: SyncState = { status: "off", lastSyncedAt: null, error: null };
let syncState: SyncState = OFF;
const syncListeners = new Set<() => void>();
function setSync(next: Partial<SyncState>) {
  syncState = { ...syncState, ...next };
  syncListeners.forEach((l) => l());
}
export function useSyncStatus(): SyncState {
  return useSyncExternalStore(
    (l) => {
      syncListeners.add(l);
      return () => {
        syncListeners.delete(l);
      };
    },
    () => syncState,
    () => OFF,
  );
}

const LESSONS = new Map<string, { slug: string; xp: number }>();
for (const p of PROJECTS) for (const l of flattenLessons(p)) LESSONS.set(l.id, { slug: p.slug, xp: l.xp });

// ───────── engine ─────────

let userId: string | null = null;
let ready = false; // true once the sign-in merge has finished
let synced: ProgressState | null = null; // what the cloud holds, as of the last successful push
let timer: ReturnType<typeof setTimeout> | null = null;
let running = 0;

async function pull(sb: SupabaseClient, uid: string) {
  setSync({ status: "syncing", error: null });
  const [p, c, d] = await Promise.all([
    sb.from("profiles").select("xp, streak, best_streak, last_active_date").eq("id", uid).maybeSingle(),
    sb.from("lesson_completions").select("lesson_id, project_slug, code, attempts, completed_at, updated_at").eq("user_id", uid),
    sb.from("lesson_drafts").select("lesson_id, code, hints_seen, updated_at").eq("user_id", uid),
  ]);
  const err = p.error || c.error || d.error;
  if (err) throw err;
  if (uid !== userId) return; // signed out / switched account meanwhile
  const merged = mergeProgress(getProgress(), p.data as ProfileRow | null, (c.data ?? []) as CompletionRow[], (d.data ?? []) as DraftRow[], (id) => LESSONS.get(id)?.xp ?? 0);
  synced = null; // force a full push of the merged state
  replaceProgress(merged);
  ready = true;
  await push(sb, uid);
}

async function push(sb: SupabaseClient, uid: string) {
  const now = getProgress();
  const before = synced;
  setSync({ status: "syncing", error: null });

  const completionRows = Object.entries(now.completed)
    .filter(([id, c]) => before?.completed[id] !== c && LESSONS.has(id))
    .map(([id, c]) => ({
      user_id: uid,
      lesson_id: id,
      project_slug: LESSONS.get(id)!.slug,
      code: c.code,
      attempts: Math.max(1, c.attempts),
      completed_at: c.at,
      updated_at: c.updatedAt ?? c.at,
    }));
  const removedCompletions = before ? Object.keys(before.completed).filter((id) => !(id in now.completed)) : [];

  const draftIds = new Set([...Object.keys(now.drafts), ...Object.keys(now.hintsSeen).filter((id) => id in now.drafts)]);
  const draftRows = [...draftIds]
    .filter((id) => !before || before.drafts[id] !== now.drafts[id] || before.hintsSeen[id] !== now.hintsSeen[id])
    .map((id) => ({ user_id: uid, lesson_id: id, code: now.drafts[id], hints_seen: now.hintsSeen[id] ?? 0, updated_at: now.draftsAt[id] ?? new Date().toISOString() }));
  const removedDrafts = before ? Object.keys(before.drafts).filter((id) => !(id in now.drafts)) : [];

  const profileChanged =
    !before || before.xp !== now.xp || before.streak !== now.streak || before.bestStreak !== now.bestStreak || before.lastActiveDate !== now.lastActiveDate || before.soundEnabled !== now.soundEnabled;

  const ops: PromiseLike<{ error: unknown }>[] = [];
  if (completionRows.length) ops.push(sb.from("lesson_completions").upsert(completionRows, { onConflict: "user_id,lesson_id" }));
  if (removedCompletions.length) ops.push(sb.from("lesson_completions").delete().eq("user_id", uid).in("lesson_id", removedCompletions));
  if (draftRows.length) ops.push(sb.from("lesson_drafts").upsert(draftRows, { onConflict: "user_id,lesson_id" }));
  if (removedDrafts.length) ops.push(sb.from("lesson_drafts").delete().eq("user_id", uid).in("lesson_id", removedDrafts));
  if (profileChanged)
    ops.push(
      sb
        .from("profiles")
        .update({ xp: now.xp, streak: now.streak, best_streak: now.bestStreak, last_active_date: now.lastActiveDate, sound_enabled: now.soundEnabled })
        .eq("id", uid),
    );

  const results = await Promise.all(ops);
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;
  if (uid === userId) {
    synced = now;
    setSync({ status: "synced", lastSyncedAt: Date.now(), error: null });
  }
}

function run(task: (sb: SupabaseClient, uid: string) => Promise<void>) {
  const sb = getSupabase();
  const uid = userId;
  if (!sb || !uid) return;
  running++;
  task(sb, uid)
    .catch((err: unknown) => {
      if (uid === userId) setSync({ status: "error", error: (err as { message?: string })?.message ?? "Sync failed" });
    })
    .finally(() => {
      running--;
    });
}

function schedulePush() {
  if (!userId || !ready) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    if (running > 0) return schedulePush(); // a sync is in flight: try again shortly
    run(push);
  }, 1500);
}

function onAuth() {
  const next = getAuth().user?.id ?? null;
  if (next === userId) return;
  const signedOut = userId !== null && next === null;
  userId = next;
  ready = false;
  synced = null;
  if (timer) clearTimeout(timer);
  if (!next) {
    setSync(OFF);
    // The progress on this device belonged to the account that just left (and is safe in the
    // cloud), so clear it: the next person to sign in here must not inherit it.
    if (signedOut) resetAllProgress();
    return;
  }
  // defer: Supabase recommends not awaiting other auth calls inside the auth callback
  setTimeout(() => run(pull), 0);
}

let refs = 0;
let stop: (() => void) | null = null;

/** Mount once (see <CloudSync/>). Safe under StrictMode double effects. */
export function startCloudSync(): () => void {
  refs++;
  if (!stop) {
    const offAuth = subscribeAuth(onAuth);
    const offProgress = subscribeProgress(schedulePush);
    const retry = () => {
      if (syncState.status === "error") syncNow();
    };
    window.addEventListener("online", retry);
    onAuth();
    stop = () => {
      offAuth();
      offProgress();
      window.removeEventListener("online", retry);
    };
  }
  return () => {
    refs--;
    if (refs === 0 && stop) {
      stop();
      stop = null;
    }
  };
}

/** Retry after an error, or pull again on demand. */
export function syncNow() {
  if (!userId) return;
  if (!ready) run(pull);
  else run(push);
}

/** Push anything still waiting in the debounce right now (call before signing out). */
export async function flushSync() {
  const sb = getSupabase();
  const uid = userId;
  if (!sb || !uid || !ready) return;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  try {
    await push(sb, uid);
  } catch {
    /* best effort: the account keeps its last synced state */
  }
}

/**
 * Reset everything: the account's cloud rows first (so another device or a reload can't merge them
 * back), then this device.
 */
export async function resetEverywhere() {
  const sb = getSupabase();
  const uid = userId;
  if (sb && uid) {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    const results = await Promise.all([
      sb.from("lesson_completions").delete().eq("user_id", uid),
      sb.from("lesson_drafts").delete().eq("user_id", uid),
      sb.from("profiles").update({ xp: 0, streak: 0, best_streak: 0, last_active_date: null }).eq("id", uid),
    ]);
    const failed = results.find((r) => r.error);
    if (failed) throw new Error(failed.error!.message);
  }
  resetAllProgress();
  synced = getProgress();
  if (uid) setSync({ status: "synced", lastSyncedAt: Date.now(), error: null });
}

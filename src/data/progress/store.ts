"use client";

import { useSyncExternalStore } from "react";
import { localRepository } from "./local";
import { EMPTY_PROGRESS, normalizeAudio, type AudioSettings, type ProgressRepository, type ProgressState } from "./types";

/** Swap this for a Supabase-backed repository when accounts arrive. */
function getRepository(): ProgressRepository {
  return localRepository;
}

const repo = getRepository();
const listeners = new Set<() => void>();
let cache: ProgressState | null = null;
let repoUnsubscribe: (() => void) | null = null;

function read(): ProgressState {
  if (!cache) cache = repo.load();
  return cache;
}

function emit() {
  listeners.forEach((l) => l());
}

function commit(next: ProgressState) {
  cache = next;
  repo.save(next);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!repoUnsubscribe) {
    repoUnsubscribe = repo.subscribe(() => {
      cache = null;
      emit();
    });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && repoUnsubscribe) {
      repoUnsubscribe();
      repoUnsubscribe = null;
    }
  };
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, read, () => EMPTY_PROGRESS);
}

export function getProgress(): ProgressState {
  return read();
}

/** Non-React subscription (used by the cloud sync engine). */
export const subscribeProgress = subscribe;

/** Replace the whole state, e.g. with the result of merging local and cloud progress. */
export function replaceProgress(next: ProgressState) {
  commit(next);
}

// ---------- derived helpers ----------

const XP_PER_LEVEL = 200;

export const RANKS = ["Rookie", "Tinkerer", "Mechanic", "Engineer", "Architect", "Wizard", "Legend"];

export function levelFor(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  return {
    level,
    rank: RANKS[Math.min(level - 1, RANKS.length - 1)],
    intoLevel: xp % XP_PER_LEVEL,
    perLevel: XP_PER_LEVEL,
  };
}

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** Streak as it should be displayed right now (resets visually if a day was missed). */
export function currentStreak(state: ProgressState): number {
  if (!state.lastActiveDate) return 0;
  return daysBetween(state.lastActiveDate, today()) > 1 ? 0 : state.streak;
}

// ---------- mutations ----------

export function saveDraft(lessonId: string, code: string) {
  const s = read();
  commit({ ...s, drafts: { ...s.drafts, [lessonId]: code }, draftsAt: { ...s.draftsAt, [lessonId]: new Date().toISOString() } });
}

export function clearDraft(lessonId: string) {
  const s = read();
  const drafts = { ...s.drafts };
  const draftsAt = { ...s.draftsAt };
  delete drafts[lessonId];
  delete draftsAt[lessonId];
  commit({ ...s, drafts, draftsAt });
}

export function recordAttempt(lessonId: string) {
  const s = read();
  commit({ ...s, attempts: { ...s.attempts, [lessonId]: (s.attempts[lessonId] ?? 0) + 1 } });
}

export function recordHint(lessonId: string, count: number) {
  const s = read();
  if ((s.hintsSeen[lessonId] ?? 0) >= count) return;
  commit({ ...s, hintsSeen: { ...s.hintsSeen, [lessonId]: count } });
}

/** Change the app-wide audio settings (see src/lib/sound/audio.ts for the Web Audio side). */
export function setAudio(patch: Partial<Pick<AudioSettings, "enabled" | "volume">>) {
  const s = read();
  const next = normalizeAudio({ ...s.audio, ...patch, at: new Date().toISOString() });
  if (next.enabled === s.audio.enabled && next.volume === s.audio.volume) return;
  commit({ ...s, audio: next });
}

export interface CompletionResult {
  firstTime: boolean;
  xpGained: number;
  totalXp: number;
  leveledUp: boolean;
  level: number;
  rank: string;
  streak: number;
}

export function completeLesson(lessonId: string, xp: number, code: string): CompletionResult {
  const s = read();
  const firstTime = !s.completed[lessonId];
  const before = levelFor(s.xp).level;
  const day = today();

  let streak = s.streak;
  if (s.lastActiveDate !== day) {
    streak = s.lastActiveDate && daysBetween(s.lastActiveDate, day) === 1 ? s.streak + 1 : 1;
  }

  const xpGained = firstTime ? xp : 0;
  const now = new Date().toISOString();
  const next: ProgressState = {
    ...s,
    xp: s.xp + xpGained,
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    lastActiveDate: day,
    completed: {
      ...s.completed,
      [lessonId]: {
        at: s.completed[lessonId]?.at ?? now,
        updatedAt: now,
        code,
        // frozen at the first pass, so re-running later can't revoke a "first try" badge
        attempts: s.completed[lessonId]?.attempts ?? s.attempts[lessonId] ?? 1,
      },
    },
  };
  commit(next);
  const after = levelFor(next.xp);
  return {
    firstTime,
    xpGained,
    totalXp: next.xp,
    leveledUp: after.level > before,
    level: after.level,
    rank: after.rank,
    streak,
  };
}

export function resetAllProgress() {
  // volume and mute belong to this device, not to the learner's progress
  commit({ ...EMPTY_PROGRESS, audio: read().audio });
}

export function submittedCode(state: ProgressState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, c] of Object.entries(state.completed)) out[id] = c.code;
  return out;
}

"use client";

import { useSyncExternalStore } from "react";
import { localRepository } from "./local";
import { EMPTY_PROGRESS, type ProgressRepository, type ProgressState } from "./types";

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
  commit({ ...s, drafts: { ...s.drafts, [lessonId]: code } });
}

export function clearDraft(lessonId: string) {
  const s = read();
  const drafts = { ...s.drafts };
  delete drafts[lessonId];
  commit({ ...s, drafts });
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

export function setSoundEnabled(enabled: boolean) {
  commit({ ...read(), soundEnabled: enabled });
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
  const next: ProgressState = {
    ...s,
    xp: s.xp + xpGained,
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    lastActiveDate: day,
    completed: {
      ...s.completed,
      [lessonId]: { at: s.completed[lessonId]?.at ?? new Date().toISOString(), code, attempts: s.attempts[lessonId] ?? 1 },
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
  commit(EMPTY_PROGRESS);
}

export function submittedCode(state: ProgressState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, c] of Object.entries(state.completed)) out[id] = c.code;
  return out;
}

/**
 * Pure helpers for deleting an account (no React, no Supabase client), so they can be checked headlessly:
 * see scripts/test-delete-account.mjs. The flow itself is deleteAccount() in ./delete-account.ts.
 */

import { CONTACT_EMAIL } from "@/lib/legal";

/**
 * Everything the site keeps in this browser that is the learner's own work, as opposed to how the site looks.
 * "Also remove progress saved on this device" clears exactly these and nothing else: theme (pockett_theme_mode),
 * workspace layout (pockett_ws_layout_v1) and the app's reminder setting (pockett_app_reminder) are device settings and
 * stay. The sign-in session (pockett_auth*) is removed by signing out.
 */
export const LOCAL_PROGRESS_KEYS = [
  "pockett_progress_v2", // XP, streak, finished lessons with their code, drafts, attempts, hints (src/data/progress/local.ts)
  "pockett_lesson_position_v2", // where you stopped in each lesson (src/learn/position.ts)
  "pockett_lesson_position_v1", // the older format of the same
  "pockett_sandbox_code", // Sandbox code, Python (src/components/sandbox/Sandbox.tsx)
  "pockett_sandbox_language", // Sandbox's last language
] as const;

/** Sandbox code for every other language: pockett_sandbox_code_<language>. */
const LOCAL_PROGRESS_PREFIX = "pockett_sandbox_code_";

export function isLocalProgressKey(key: string): boolean {
  return (LOCAL_PROGRESS_KEYS as readonly string[]).includes(key) || key.startsWith(LOCAL_PROGRESS_PREFIX);
}

/** The subset of Storage this needs (so a plain object can stand in for it in tests). */
export interface KeyedStorage {
  readonly length: number;
  key(index: number): string | null;
  removeItem(key: string): void;
}

/** Removes the learner's progress and code from this device. Returns the keys it removed. Never throws. */
export function clearLocalProgress(storage: KeyedStorage | null | undefined): string[] {
  if (!storage) return [];
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k !== null && isLocalProgressKey(k)) keys.push(k);
    }
    // collect first, then remove: removing while walking shifts the indexes
    for (const k of keys) storage.removeItem(k);
    return keys;
  } catch {
    return []; // storage blocked (private window): there is nothing saved to clear
  }
}

/** Which step of the deletion failed: checking the password, or deleting the account. */
export type DeletionStage = "password" | "delete";

/** A failed deletion: `message` is ready to show; `stage` says which step failed. */
export class DeletionFailed extends Error {
  stage: DeletionStage;
  constructor(stage: DeletionStage, error: unknown) {
    super(deletionErrorMessage(stage, error));
    this.stage = stage;
  }
}

interface ErrorLike {
  message?: string;
  status?: number;
  code?: string;
  name?: string;
}

function isNetworkError(e: ErrorLike): boolean {
  const msg = (e.message ?? "").toLowerCase();
  return (
    e.name === "AuthRetryableFetchError" ||
    e.status === 0 ||
    msg.includes("failed to fetch") ||
    msg.includes("fetcherror") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed")
  );
}

/** A plain-language message for a failed deletion. Apart from a lost connection during the delete, nothing was deleted. */
export function deletionErrorMessage(stage: DeletionStage, error: unknown): string {
  const e = (error && typeof error === "object" ? error : { message: String(error ?? "") }) as ErrorLike;
  const msg = (e.message ?? "").toLowerCase();
  if (isNetworkError(e)) {
    // a lost answer to the delete itself may still have gone through, so don't promise that nothing changed
    return stage === "password"
      ? "We couldn't reach pockett. Check your connection and try again. Nothing was deleted."
      : "We lost the connection before pockett answered. Check your connection, then try again.";
  }
  if (e.status === 429 || msg.includes("rate limit")) return "Too many attempts. Wait a minute and try again.";
  if (stage === "password") {
    if (msg.includes("invalid login") || msg.includes("invalid credentials") || e.status === 400) return "That password isn't right. Nothing was deleted.";
    return "We couldn't check your password. Try again in a moment. Nothing was deleted.";
  }
  // PGRST202: PostgREST can't find the function (the database migration isn't applied yet)
  if (e.code === "PGRST202" || e.status === 404 || msg.includes("could not find the function")) {
    return `Deleting accounts from here isn't switched on yet. Email ${CONTACT_EMAIL} from your account's address and we'll delete it for you.`;
  }
  if (e.code === "42501" || e.status === 401 || e.status === 403 || msg.includes("jwt") || msg.includes("not signed in")) {
    return "Your sign-in has expired. Sign in again, then delete your account. Nothing was deleted.";
  }
  return `Something went wrong and nothing was deleted. Try again, or email ${CONTACT_EMAIL} and we'll delete it for you.`;
}

/** The typed confirmation: the word DELETE, any case, surrounding spaces ignored. */
export const CONFIRM_WORD = "DELETE";
export function isConfirmed(typed: string): boolean {
  return typed.trim().toUpperCase() === CONFIRM_WORD;
}

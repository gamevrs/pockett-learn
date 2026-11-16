"use client";

import { getSupabase } from "../supabase/client";
import { getAuth } from "./store";
import { accountDeleted, beginAccountDeletion, cancelAccountDeletion, endAccountDeletion } from "../progress/sync";
import { resetAllProgress } from "../progress/store";
import { DeletionFailed, clearLocalProgress } from "./deletion";

/**
 * Deletes the signed-in account: checks the password, calls public.delete_my_account() (supabase/migrations/0005),
 * then signs out on this device. Throws a DeletionFailed (a plain-language message, and which step failed) if anything
 * fails before the delete goes through.
 */
export async function deleteAccount(password: string, { removeLocal }: { removeLocal: boolean }): Promise<void> {
  const sb = getSupabase();
  const user = getAuth().user;
  if (!sb || !user?.email) throw new Error("You're not signed in.");

  // 1. Is it really them? Signing in again with the same email and password gives the same person a fresh session,
  //    which the cloud sync recognises as the account it already has.
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email: user.email, password });
    if (error) throw error;
    if (data.user?.id !== user.id) throw new Error("account changed");
  } catch (err) {
    throw new DeletionFailed("password", err);
  }

  // 2. Delete, with the sync paused so nothing is pushed into the account while it goes.
  beginAccountDeletion();
  try {
    const { error, status } = await sb.rpc("delete_my_account");
    if (error) throw { ...error, message: error.message, status };
  } catch (err) {
    cancelAccountDeletion();
    throw new DeletionFailed("delete", err);
  }

  // 3. The account is gone. Sign out here only (its sessions everywhere were deleted with it); a failed request
  //    still removes the local session, so the outcome is ignored.
  accountDeleted(!removeLocal);
  try {
    await sb.auth.signOut({ scope: "local" });
  } catch {
    /* the session is removed locally either way */
  }
  endAccountDeletion();

  if (removeLocal) removeLocalProgress();
}

/** Removes the learner's progress and code from this device (see LOCAL_PROGRESS_KEYS), keeping its settings. */
export function removeLocalProgress() {
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    /* blocked */
  }
  clearLocalProgress(storage);
  resetAllProgress(); // the in-memory copy too (this keeps the device's sound setting, which isn't progress)
}

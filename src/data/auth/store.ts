"use client";

import { useSyncExternalStore } from "react";
import type { AuthError, User } from "@supabase/supabase-js";
import { getSupabase } from "../supabase/client";

export type AuthStatus = "loading" | "signed-out" | "signed-in";

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  /** The visitor arrived from a password-reset email and should choose a new password. */
  recovering: boolean;
}

const SERVER_STATE: AuthState = { status: "loading", user: null, recovering: false };
let state: AuthState = SERVER_STATE;
const listeners = new Set<() => void>();
let started = false;

function set(next: Partial<AuthState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const sb = getSupabase();
  if (!sb) {
    set({ status: "signed-out" });
    return;
  }
  void sb.auth.getSession().then(({ data }) => {
    set({ status: data.session ? "signed-in" : "signed-out", user: data.session?.user ?? null });
  });
  sb.auth.onAuthStateChange((event, session) => {
    set({
      status: session ? "signed-in" : "signed-out",
      user: session?.user ?? null,
      recovering: event === "PASSWORD_RECOVERY" ? true : session ? state.recovering : false,
    });
  });
}

export function subscribeAuth(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAuth(): AuthState {
  start();
  return state;
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribeAuth, getAuth, () => SERVER_STATE);
}

export function displayNameOf(user: User | null): string {
  if (!user) return "";
  const meta = user.user_metadata as { display_name?: string; full_name?: string } | undefined;
  return meta?.display_name || meta?.full_name || user.email?.split("@")[0] || "Learner";
}

// ───────── actions ─────────

function client() {
  const sb = getSupabase();
  if (!sb) throw new Error("Accounts are unavailable right now.");
  return sb;
}

function friendly(error: AuthError): Error {
  const msg = error.message.toLowerCase();
  if (msg.includes("invalid login")) return new Error("That email and password don't match.");
  if (msg.includes("not confirmed")) return new Error("Please confirm your email first: check your inbox for the link.");
  if (msg.includes("already registered") || msg.includes("already been registered")) return new Error("There's already an account with that email. Try signing in.");
  if (msg.includes("password") && msg.includes("characters")) return new Error("Use a password with at least 8 characters.");
  if (msg.includes("rate limit") || error.status === 429) return new Error("Too many attempts. Wait a minute and try again.");
  return new Error(error.message);
}

const redirectTo = () => `${window.location.origin}/account`;

/** Returns true when Supabase wants the email confirmed before the first sign-in. */
export async function signUp(email: string, password: string, displayName: string): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await client().auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName.trim() || undefined }, emailRedirectTo: redirectTo() },
  });
  if (error) throw friendly(error);
  // Supabase returns a user with no identities when the email is already registered (to avoid leaking accounts).
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    throw new Error("There's already an account with that email. Try signing in.");
  }
  return { needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string) {
  const { error } = await client().auth.signInWithPassword({ email, password });
  if (error) throw friendly(error);
}

export async function signOut() {
  const { error } = await client().auth.signOut();
  if (error) throw friendly(error);
}

export async function sendPasswordReset(email: string) {
  const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo: redirectTo() });
  if (error) throw friendly(error);
}

export async function updatePassword(password: string) {
  const { error } = await client().auth.updateUser({ password });
  if (error) throw friendly(error);
  set({ recovering: false });
}

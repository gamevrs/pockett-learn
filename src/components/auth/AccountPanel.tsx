"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Cloud, CloudOff, KeyRound, Loader2, LogOut, Mail, RefreshCw } from "lucide-react";
import { displayNameOf, sendPasswordReset, signIn, signOut, signUp, updatePassword, useAuth } from "@/data/auth/store";
import { flushSync, syncNow, useSyncStatus } from "@/data/progress/sync";
import { levelFor, useProgress } from "@/data/progress/store";

type Mode = "signin" | "signup" | "forgot";

export function AccountPanel() {
  const auth = useAuth();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-14 sm:py-20">
      {auth.status === "loading" ? (
        <div className="grid place-items-center py-24 text-ink-3">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : auth.recovering ? (
        <NewPassword />
      ) : auth.status === "signed-in" ? (
        <SignedIn />
      ) : (
        <AuthForms />
      )}
    </div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...input } = props;
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-3">{label}</span>
      <input {...input} className="input" />
    </label>
  );
}

function AuthForms() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") await signIn(email.trim(), password);
      if (mode === "signup") {
        const { needsConfirmation } = await signUp(email.trim(), password, name);
        if (needsConfirmation) setNotice(`Almost there! We sent a confirmation link to ${email.trim()}. Open it on this device to finish.`);
      }
      if (mode === "forgot") {
        await sendPasswordReset(email.trim());
        setNotice(`If an account exists for ${email.trim()}, a reset link is on its way.`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "signin" ? "Welcome back." : mode === "signup" ? "Save your progress." : "Reset your password.";

  return (
    <div className="rise">
      <p className="eyebrow">Account</p>
      <h1 className="font-display mt-3 text-5xl">{title}</h1>
      <p className="mt-3 text-ink-2">
        {mode === "forgot"
          ? "Enter your email and we'll send you a link to choose a new password."
          : "Free, forever. An account keeps your builds, XP and streak in sync across all your devices."}
      </p>

      {mode !== "forgot" && (
        <div className="mt-8 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface-2 p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
                setNotice(null);
              }}
              className={`rounded-xl py-2 text-sm font-bold transition-colors ${mode === m ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"}`}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="card mt-4 space-y-4 p-5">
        {mode === "signup" && <Field label="Display name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada" maxLength={60} autoComplete="nickname" />}
        <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        {mode !== "forgot" && (
          <Field
            label="Password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        )}

        {error && <p className="rounded-xl border border-bad/40 bg-bad/10 px-3 py-2 text-sm font-semibold text-bad">{error}</p>}
        {notice && (
          <p className="flex gap-2 rounded-xl border border-good/40 bg-good/10 px-3 py-2 text-sm font-semibold text-good">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" />
            {notice}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-primary w-full">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "signin" ? "Sign in" : mode === "signup" ? "Create free account" : "Send reset link"}
        </button>

        <div className="flex justify-between text-xs font-semibold text-ink-3">
          {mode === "forgot" ? (
            <button type="button" className="hover:text-ink" onClick={() => setMode("signin")}>
              ← Back to sign in
            </button>
          ) : (
            <button type="button" className="hover:text-ink" onClick={() => setMode("forgot")}>
              Forgot password?
            </button>
          )}
        </div>
      </form>

      <p className="mt-6 text-center text-xs text-ink-3">No account needed to learn: your progress always saves on this device too.</p>
    </div>
  );
}

function SignedIn() {
  const { user } = useAuth();
  const sync = useSyncStatus();
  const progress = useProgress();
  const lvl = levelFor(progress.xp);
  const [busy, setBusy] = useState(false);
  const name = displayNameOf(user);
  const lessons = Object.keys(progress.completed).length;

  return (
    <div className="rise">
      <p className="eyebrow">Account</p>
      <div className="mt-4 flex items-center gap-4">
        <span className="bg-brand-gradient grid h-16 w-16 place-items-center rounded-2xl bg-brand text-2xl font-black text-brand-ink">{name.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0">
          <h1 className="font-display truncate text-4xl">{name}</h1>
          <p className="truncate text-sm text-ink-3">{user?.email}</p>
        </div>
      </div>

      <div className="card mt-8 divide-y divide-line">
        <div className="flex items-center justify-between p-4">
          <span className="text-sm font-semibold text-ink-2">Level</span>
          <span className="font-bold">
            {lvl.level} · {lvl.rank}
          </span>
        </div>
        <div className="flex items-center justify-between p-4">
          <span className="text-sm font-semibold text-ink-2">XP / lessons</span>
          <span className="font-bold">
            {progress.xp} XP · {lessons} lessons
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 p-4">
          <span className="text-sm font-semibold text-ink-2">Cloud sync</span>
          <SyncBadge status={sync.status} error={sync.error} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/projects" className="btn btn-primary">
          Keep building
        </Link>
        <button
          className="btn btn-ghost"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await flushSync();
              await signOut();
            } finally {
              setBusy(false);
            }
          }}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
      <p className="mt-4 text-xs text-ink-3">Your progress is saved to your account. Signing out clears it from this device.</p>
    </div>
  );
}

function SyncBadge({ status, error }: { status: string; error: string | null }) {
  if (status === "syncing")
    return (
      <span className="flex items-center gap-1.5 text-sm font-bold text-ink-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Syncing…
      </span>
    );
  if (status === "error")
    return (
      <button onClick={syncNow} title={error ?? undefined} className="flex items-center gap-1.5 text-sm font-bold text-bad hover:underline">
        <CloudOff className="h-4 w-4" /> Couldn&apos;t sync · retry <RefreshCw className="h-3.5 w-3.5" />
      </button>
    );
  if (status === "synced")
    return (
      <span className="flex items-center gap-1.5 text-sm font-bold text-good">
        <CheckCircle2 className="h-4 w-4" /> Up to date
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-sm font-bold text-ink-3">
      <Cloud className="h-4 w-4" /> Waiting
    </span>
  );
}

function NewPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="rise"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await updatePassword(password);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="eyebrow">Account</p>
      <h1 className="font-display mt-3 text-5xl">Choose a new password.</h1>
      <div className="card mt-8 space-y-4 p-5">
        <Field label="New password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" />
        {error && <p className="rounded-xl border border-bad/40 bg-bad/10 px-3 py-2 text-sm font-semibold text-bad">{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-primary w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Save password
        </button>
      </div>
    </form>
  );
}

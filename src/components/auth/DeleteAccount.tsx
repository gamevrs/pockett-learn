"use client";

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/data/auth/store";
import { deleteAccount, removeLocalProgress } from "@/data/auth/delete-account";
import { CONFIRM_WORD, DeletionFailed, isConfirmed } from "@/data/auth/deletion";

/**
 * "Delete account" at the bottom of the signed-in Account page (web and the apps' Account tab), for App Store guideline
 * 5.1.1(v) and Google Play. Low emphasis until opened; the dialog asks for the password and the word DELETE.
 */
export function DeleteAccount({ onDeleted }: { onDeleted: (keptLocal: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <section aria-label="Delete account" className="mt-12 border-t border-line pt-6">
      <button
        ref={triggerRef}
        type="button"
        className="btn btn-ghost btn-sm -ml-3 text-ink-3 hover:text-bad"
        onClick={() => setOpen(true)}
        data-delete-account
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete account
      </button>
      {open && (
        <DeleteDialog
          onClose={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
          onDeleted={onDeleted}
        />
      )}
    </section>
  );
}

function DeleteDialog({ onClose, onDeleted }: { onClose: () => void; onDeleted: (keptLocal: boolean) => void }) {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [typed, setTyped] = useState("");
  const [removeLocal, setRemoveLocal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const id = useId();

  // Focus the password field in the same commit as the tap that opened this, so the phone keyboard comes up with it.
  useLayoutEffect(() => {
    passwordRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const ready = password.length > 0 && isConfirmed(typed) && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password, { removeLocal });
      onDeleted(!removeLocal);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
      // a wrong password: back to that field, ready to retype
      if (err instanceof DeletionFailed && err.stage === "password") requestAnimationFrame(() => passwordRef.current?.select());
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-body`}
        className="card pop-in my-auto w-full max-w-md p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5"
        onSubmit={submit}
        data-delete-dialog
      >
        <h2 id={`${id}-title`} className="font-display text-2xl">
          Delete your account?
        </h2>
        <div id={`${id}-body`} className="mt-3 space-y-3 text-sm text-ink-2">
          <p>This permanently deletes, from pockett&apos;s servers:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>your progress and finished lessons</li>
            <li>your XP and streak</li>
            <li>the code you saved: drafts and finished lessons</li>
            <li>your account{user?.email ? ` (${user.email})` : ""}</li>
          </ul>
          <p>You can&apos;t undo this.</p>
        </div>

        <label className="mt-4 flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-surface-2 p-3">
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Also remove progress saved on this device</span>
            <span className="block text-xs text-ink-3">
              {removeLocal
                ? "Progress, saved code and Sandbox code on this device are removed too. Theme and app settings stay."
                : "This device keeps a copy of your progress, so you can carry on without an account."}
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="app-switch mt-0.5"
            checked={removeLocal}
            aria-checked={removeLocal}
            disabled={busy}
            onChange={(e) => setRemoveLocal(e.target.checked)}
            data-remove-local
          />
        </label>

        {/* lets password managers fill the right account's password */}
        <input type="email" name="username" autoComplete="username" value={user?.email ?? ""} readOnly hidden />

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-3">Your password</span>
            <input
              ref={passwordRef}
              type="password"
              name="password"
              className="input"
              autoComplete="current-password"
              required
              value={password}
              disabled={busy}
              onChange={(e) => setPassword(e.target.value)}
              data-delete-password
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-3">Type {CONFIRM_WORD} to confirm</span>
            <input
              type="text"
              className="input"
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              value={typed}
              disabled={busy}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={CONFIRM_WORD}
              data-delete-confirm
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-bad/40 bg-bad/10 px-3 py-2 text-sm font-semibold text-bad" data-delete-error>
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-danger" disabled={!ready} data-delete-submit>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {busy ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Shown once, in place of the sign-in forms, right after the account is deleted. */
export function AccountDeleted({ keptLocal, onDone }: { keptLocal: boolean; onDone: () => void }) {
  const [removed, setRemoved] = useState(!keptLocal);
  return (
    <div className="rise" data-account-deleted>
      <p className="eyebrow">Account</p>
      <h1 className="font-display mt-3 text-[2.5rem]">Your account is deleted.</h1>
      <p className="mt-3 text-ink-2">
        Your progress, XP, streak, saved code and account are gone from pockett&apos;s servers, and you&apos;re signed out.
      </p>
      <p className="mt-3 text-ink-2">
        {removed
          ? "The progress saved on this device is removed too."
          : "This device still has a copy of your progress, so you can keep learning without an account."}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" className="btn" onClick={onDone}>
          Done
        </button>
        {!removed && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              removeLocalProgress();
              setRemoved(true);
            }}
          >
            Remove it from this device
          </button>
        )}
      </div>
    </div>
  );
}

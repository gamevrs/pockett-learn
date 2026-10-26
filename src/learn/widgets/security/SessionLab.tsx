"use client";

import React, { useState } from "react";
import { Ban, Clock, Eye, KeyRound, LogIn, RotateCcw, Send, Skull } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Mono, Note, Segmented, Tag, noise } from "./ui";

/**
 * Two ways for a server to remember a logged-in user. A *session* is a random ticket: the server
 * keeps a table of valid tickets and looks yours up. A *signed token* carries its own claims and
 * a signature: the server keeps nothing and just checks the maths. Log in, copy the credential as
 * an attacker, end Dana's access, move the clock, and see which design notices.
 */

type Mode = "session" | "token";
const SESSION_TTL = 30;
const TOKEN_TTL = 15;

function b64(obj: unknown) {
  return btoa(JSON.stringify(obj)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
const sig = (seed: number) => Array.from({ length: 6 }, (_, i) => Math.floor(noise(seed, i) * 256).toString(16).padStart(2, "0")).join("");

interface Log {
  tone: "good" | "bad" | "neutral";
  text: string;
}

interface Lab {
  loggedIn: boolean;
  /** Expiry minute of the credential Dana was issued. */
  exp: number;
  /** Session mode: is the row still in the server's table? */
  inTable: boolean;
  stolen: boolean;
  now: number;
  revoked: boolean;
  log: Log[];
  /** Outcome of the last attacker request: accepted or not, and whether it came after the revoke. */
  attacker: { ok: boolean; afterRevoke: boolean } | null;
  issued: number;
}

const FRESH: Lab = { loggedIn: false, exp: 0, inTable: false, stolen: false, now: 0, revoked: false, log: [], attacker: null, issued: 0 };

export interface SessionLabProps {
  mode?: Mode;
  /** Hide the Session/Token switch. */
  fixedMode?: boolean;
}

export interface SessionLabState {
  mode: Mode;
  stolen: boolean;
  revoked: boolean;
  attackerAccepted: boolean | null;
  attackerAfterRevoke: boolean;
  loggedIn: boolean;
}

export function SessionLab({ props, onChange, revealed }: WidgetProps<SessionLabProps>) {
  const [mode, setMode] = useState<Mode>(props.mode ?? "session");
  const [lab, setLab] = useState<Lab>(FRESH);

  const emit = (m: Mode, l: Lab) =>
    onChange?.({ mode: m, stolen: l.stolen, revoked: l.revoked, attackerAccepted: l.attacker ? l.attacker.ok : null, attackerAfterRevoke: Boolean(l.attacker?.afterRevoke), loggedIn: l.loggedIn } satisfies SessionLabState);
  const apply = (next: Lab, m: Mode = mode) => {
    setLab(next);
    emit(m, next);
  };
  const push = (l: Lab, entry: Log): Lab => ({ ...l, log: [...l.log.slice(-5), entry] });

  const switchMode = (m: Mode) => {
    if (revealed) return;
    setMode(m);
    apply(FRESH, m);
  };

  const login = () => {
    const ttl = mode === "session" ? SESSION_TTL : TOKEN_TTL;
    apply(
      push(
        { ...lab, loggedIn: true, exp: lab.now + ttl, inTable: mode === "session", issued: lab.issued + 1, revoked: false },
        { tone: "neutral", text: mode === "session" ? "Dana logs in. The server writes a row in its session table and hands her the ticket id." : "Dana logs in. The server signs her claims and hands her the token. It writes nothing down." },
      ),
    );
  };

  /** Would the server accept this credential right now? */
  const accepts = (l: Lab): { ok: boolean; why: string } => {
    if (mode === "session") {
      if (!l.inTable) return { ok: false, why: "no such row in the session table" };
      if (l.now >= l.exp) return { ok: false, why: "session expired" };
      return { ok: true, why: "row found" };
    }
    if (l.now >= l.exp) return { ok: false, why: "token expired (exp has passed)" };
    return { ok: true, why: "signature valid, exp still ahead" };
  };

  const request = (who: "dana" | "attacker") => {
    if (who === "dana" && !lab.loggedIn) return;
    if (who === "attacker" && !lab.stolen) return;
    const r = accepts(lab);
    let next = push(lab, { tone: r.ok ? "good" : "bad", text: `${who === "dana" ? "Dana" : "Attacker"}: GET /appointments → ${r.ok ? "200 OK" : "401"} (${r.why})` });
    if (who === "attacker") next = { ...next, attacker: { ok: r.ok, afterRevoke: lab.revoked } };
    apply(next);
  };

  const steal = () => {
    if (!lab.loggedIn) return;
    apply(push({ ...lab, stolen: true }, { tone: "bad", text: "An attacker copies Dana's credential (a leaked log line, a shared screenshot, malware). The server cannot tell the copy from the original." }));
  };

  const revoke = () => {
    if (!lab.loggedIn) return;
    if (mode === "session") {
      apply(push({ ...lab, inTable: false, revoked: true }, { tone: "good", text: "Support ends Dana's access: the server deletes her row from the session table." }));
    } else {
      apply(push({ ...lab, revoked: true }, { tone: "neutral", text: "Support ends Dana's access... but there is no row to delete. The token's signature and expiry are still perfectly valid." }));
    }
  };

  const wait = () => apply(push({ ...lab, now: lab.now + 10 }, { tone: "neutral", text: `Ten minutes pass. The clock reads ${lab.now + 10}.` }));
  const reset = () => apply(FRESH);

  const header = b64({ alg: "HS256" });
  const payload = b64({ sub: "dana", exp: lab.exp });
  const credential = mode === "session" ? "sid=7f3a9c" + lab.issued : `${header}.${payload}.${sig(lab.issued + 3)}`;
  const expired = lab.now >= lab.exp;

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {!props.fixedMode && (
          <Segmented
            label="Design"
            value={mode}
            disabled={revealed}
            options={[
              { id: "session", label: "Server session" },
              { id: "token", label: "Signed token" },
            ]}
            onChange={switchMode}
          />
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 font-mono text-sm text-ink">
          <Clock className="h-4 w-4 text-ink-3" /> minute {lab.now}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface-2 p-2.5">
          <Caption className="mb-1.5 flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5" /> Dana&apos;s browser
          </Caption>
          {lab.loggedIn ? (
            <Mono tone={expired ? "bad" : "plain"} className="text-[11px]">
              {credential}
              {mode === "token" && <span className="mt-1 block text-ink-3">exp = minute {lab.exp}</span>}
            </Mono>
          ) : (
            <p className="py-2 text-sm text-ink-3">No credential yet.</p>
          )}
        </div>
        <div className="rounded-xl border border-line bg-surface-2 p-2.5">
          <Caption className="mb-1.5">Server keeps</Caption>
          {mode === "session" ? (
            lab.inTable ? (
              <Mono className="text-[11px]">
                sid=7f3a9c{lab.issued}
                <span className="block text-ink-3">user=dana · until {lab.exp}</span>
              </Mono>
            ) : (
              <p className="py-2 text-sm text-ink-3">{lab.loggedIn ? "Row deleted. Table is empty." : "An empty session table."}</p>
            )
          ) : (
            <p className="py-2 text-sm text-ink-2">
              Only a signing key. <span className="text-ink-3">No list of who is logged in.</span>
            </p>
          )}
        </div>
        <div className={`rounded-xl border p-2.5 ${lab.stolen ? "border-[var(--bad)]/50 bg-[var(--bad)]/[0.06]" : "border-line bg-surface-2"}`}>
          <Caption className="mb-1.5 flex items-center gap-1.5">
            <Skull className="h-3.5 w-3.5" /> Attacker
          </Caption>
          {lab.stolen ? (
            <Mono tone="bad" className="text-[11px]">
              {credential}
            </Mono>
          ) : (
            <p className="py-2 text-sm text-ink-3">Holds nothing yet.</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary !h-10" onClick={login} disabled={revealed}>
          <LogIn className="h-4 w-4" /> Log in
        </button>
        <button type="button" className="btn !h-10" onClick={() => request("dana")} disabled={revealed || !lab.loggedIn}>
          <Send className="h-4 w-4" /> Dana sends a request
        </button>
        <button type="button" className="btn !h-10" onClick={steal} disabled={revealed || !lab.loggedIn || lab.stolen}>
          <Eye className="h-4 w-4" /> Attacker copies it
        </button>
        <button type="button" className="btn !h-10" onClick={() => request("attacker")} disabled={revealed || !lab.stolen}>
          <Skull className="h-4 w-4" /> Attacker sends it
        </button>
        <button type="button" className="btn !h-10" onClick={revoke} disabled={revealed || !lab.loggedIn || lab.revoked}>
          <Ban className="h-4 w-4" /> End Dana&apos;s access
        </button>
        <button type="button" className="btn !h-10" onClick={wait} disabled={revealed}>
          <Clock className="h-4 w-4" /> Wait 10 min
        </button>
        <button type="button" className="btn btn-ghost !h-10" onClick={reset} disabled={revealed}>
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </div>

      <ol className="mt-3 grid gap-1.5" aria-live="polite">
        {lab.log.length === 0 && <li className="rounded-lg border border-dashed border-[var(--line-strong)] px-3 py-2 text-sm text-ink-3">Start with Log in, then try the buttons in any order.</li>}
        {lab.log.map((l, i) => (
          <li
            key={i}
            className={`rounded-lg border bg-surface px-3 py-1.5 text-[13px] leading-snug text-ink-2 ${i === lab.log.length - 1 ? "pop-in" : ""} ${
              l.tone === "good" ? "border-[var(--brand)]/45" : l.tone === "bad" ? "border-[var(--bad)]/45" : "border-line"
            }`}
          >
            {l.text}
          </li>
        ))}
      </ol>

      {lab.attacker?.afterRevoke && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Note tone={lab.attacker.ok ? "bad" : "good"} className="pop-in flex-1">
            {lab.attacker.ok ? "The stolen credential still works after Dana's access was ended." : "The stolen credential was refused as soon as access was ended."}
          </Note>
          <Tag tone={lab.attacker.ok ? "bad" : "good"}>{lab.attacker.ok ? "not revocable yet" : "revoked at once"}</Tag>
        </div>
      )}
    </div>
  );
}

export function checkSessionLab(state: unknown, goal: Record<string, unknown>) {
  const st = state as SessionLabState | undefined;
  if (!st) return false;
  if (typeof goal.mode === "string" && st.mode !== goal.mode) return false;
  if (goal.attackerAfterRevoke === true && !st.attackerAfterRevoke) return false;
  if (typeof goal.attackerAccepted === "boolean" && st.attackerAccepted !== goal.attackerAccepted) return false;
  return true;
}

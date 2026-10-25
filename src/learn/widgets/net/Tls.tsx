"use client";

import React, { useState } from "react";
import { Eye, Lock, LockOpen, RotateCcw, ShieldAlert, ShieldCheck, StepForward } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Segmented, noise } from "./ui";

/**
 * HTTP vs HTTPS, from the point of view of someone snooping on café Wi-Fi. HTTPS first runs a TLS
 * handshake (hello, certificate, check, shared key), then everything is encrypted. A switch puts
 * an attacker in the middle: with HTTP they read everything; with HTTPS their certificate fails
 * the check and the browser stops.
 */

interface Stage {
  who: "client" | "server" | "both" | "attacker";
  title: string;
  text: string;
  /** What the snooper sees at this point. */
  sees: string;
  tone?: "good" | "bad";
}

const SECRET = "POST /login  user=sam&pin=4921";

function hex(seed: number, n: number) {
  return Array.from({ length: n }, (_, i) => Math.floor(noise(seed, i) * 256).toString(16).padStart(2, "0")).join(" ");
}

function stages(mode: "http" | "https", attacker: boolean): Stage[] {
  if (mode === "http") {
    return [
      { who: "client", title: "Request, in plain text", text: SECRET, sees: SECRET },
      attacker
        ? { who: "attacker", title: "Someone in the middle", text: "Reads the PIN, could change the request, and passes it on. Neither side can tell.", sees: SECRET, tone: "bad" }
        : { who: "server", title: "Response, in plain text", text: "HTTP/1.1 200 OK  Set-Cookie: session=7f3a9c", sees: "HTTP/1.1 200 OK  Set-Cookie: session=7f3a9c" },
    ];
  }
  const s: Stage[] = [
    { who: "client", title: "ClientHello", text: "TLS 1.3 please. Here are the ciphers I support and my half of a key exchange. I want shop.example.com.", sees: "a TLS hello for shop.example.com (the name is still visible)" },
  ];
  if (attacker) {
    s.push(
      { who: "attacker", title: "A fake ServerHello", text: "The attacker answers instead, with its own half of the key exchange, so it shares a key with your browser.", sees: "a TLS hello reply" },
      { who: "attacker", title: "A fake certificate", text: "“I am shop.example.com”, on a certificate the attacker signed itself.", sees: "encrypted bytes" },
      { who: "client", title: "Check the certificate", text: "It is not signed by any authority this device trusts. The browser shows a warning and sends nothing.", sees: "nothing more: the connection stops", tone: "bad" },
    );
    return s;
  }
  s.push(
    { who: "server", title: "ServerHello", text: "Let's use AES-GCM. Here's my half of the key exchange.", sees: "a TLS hello reply" },
    { who: "both", title: "Same secret key, never sent", text: "From the two key-exchange halves, both sides compute the same secret key. The key itself never crosses the network.", sees: "only the two public halves, which aren't enough to work out the key" },
    { who: "server", title: "Certificate (already encrypted)", text: "My certificate: shop.example.com, signed by a certificate authority, plus a signature proving I hold its private key.", sees: "17 03 03 08 1c " + hex(5, 14) + " …" },
    { who: "client", title: "Check the certificate", text: "The name matches, it hasn't expired, and it's signed by an authority this device trusts. This really is the shop.", sees: "nothing new: the check happens on your device", tone: "good" },
    { who: "client", title: "Encrypted request", text: SECRET, sees: "17 03 03 00 2e " + hex(7, 14) + " …", tone: "good" },
    { who: "server", title: "Encrypted response", text: "HTTP/1.1 200 OK  Set-Cookie: session=7f3a9c", sees: "17 03 03 00 4a " + hex(11, 14) + " …", tone: "good" },
  );
  return s;
}

export interface TlsProps {
  mode?: "http" | "https";
  /** Show the attacker switch. Default true. */
  attackerToggle?: boolean;
}

export interface TlsState {
  mode: "http" | "https";
  attacker: boolean;
  finished: boolean;
  blocked: boolean;
}

export function Tls({ props, onChange, revealed }: WidgetProps<TlsProps>) {
  const [mode, setMode] = useState<"http" | "https">(props.mode ?? "https");
  const [attacker, setAttacker] = useState(false);
  const [shown, setShown] = useState(0);
  const list = stages(mode, attacker);
  const finished = shown >= list.length;
  const vis = list.slice(0, shown);
  const last = vis[vis.length - 1];

  const report = (m: "http" | "https", a: boolean, s: number) => {
    const l = stages(m, a);
    const done = s >= l.length;
    onChange?.({ mode: m, attacker: a, finished: done, blocked: done && m === "https" && a } satisfies TlsState);
  };
  const pickMode = (m: "http" | "https") => {
    if (revealed) return;
    setMode(m);
    setShown(0);
    report(m, attacker, 0);
  };
  const toggleAttacker = () => {
    if (revealed) return;
    setAttacker(!attacker);
    setShown(0);
    report(mode, !attacker, 0);
  };
  const next = () => {
    if (revealed || finished) return;
    setShown(shown + 1);
    report(mode, attacker, shown + 1);
  };
  const reset = () => {
    setShown(0);
    report(mode, attacker, 0);
  };

  const whoLabel = { client: "Browser", server: "shop.example.com", both: "Both sides", attacker: "Attacker" } as const;

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Segmented
          label="Protocol"
          value={mode}
          disabled={revealed}
          options={[
            { id: "http", label: "HTTP" },
            { id: "https", label: "HTTPS" },
          ]}
          onChange={pickMode}
        />
        {(props.attackerToggle ?? true) && (
          <button
            type="button"
            onClick={toggleAttacker}
            disabled={revealed}
            aria-pressed={attacker}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors disabled:cursor-default ${
              attacker ? "border-[var(--bad)] bg-[var(--bad)]/[0.08] text-ink" : "border-line bg-surface text-ink-2 hover:text-ink"
            }`}
          >
            <ShieldAlert className="h-4 w-4" /> Attacker in the middle: {attacker ? "on" : "off"}
          </button>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
        <div className="flex items-center gap-2">
          {mode === "https" ? <Lock className="h-4 w-4 text-brand" /> : <LockOpen className="h-4 w-4 text-ink-3" />}
          <span className="font-mono text-[12.5px] text-ink">{mode}://shop.example.com/login</span>
        </div>
        <ol className="mt-2 grid gap-1.5">
          {vis.length === 0 && <li className="py-3 text-sm text-ink-3">Press Next to start.</li>}
          {vis.map((st, i) => (
            <li
              key={`${mode}-${attacker}-${i}`}
              className={`rounded-lg border bg-surface px-3 py-2 ${i === vis.length - 1 ? "pop-in" : ""} ${
                st.tone === "bad" ? "border-[var(--bad)]/50" : st.tone === "good" ? "border-[var(--brand)]/45" : "border-line"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">{whoLabel[st.who]}</span>
                <span className="text-sm font-semibold text-ink">{st.title}</span>
                {st.tone === "good" && st.title.startsWith("Check") && <ShieldCheck className="h-4 w-4 text-good" />}
                {st.tone === "bad" && <ShieldAlert className="h-4 w-4 text-bad" />}
              </div>
              <p className={`mt-1 text-[12.5px] leading-snug text-ink-2 ${st.text === SECRET || st.text.startsWith("HTTP/") ? "font-mono" : ""}`}>{st.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary !h-10" onClick={next} disabled={revealed || finished}>
            <StepForward className="h-4 w-4" /> Next
          </button>
          <button type="button" className="btn !h-10" onClick={reset} disabled={revealed || shown === 0}>
            <RotateCcw className="h-4 w-4" /> Replay
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-[var(--line-strong)] p-3" aria-live="polite">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-ink-3" />
          <Caption>What a snooper on the café Wi-Fi sees</Caption>
        </div>
        <p className={`mt-1.5 break-words font-mono text-[12.5px] ${last ? (mode === "http" ? "text-bad" : "text-ink") : "text-ink-3"}`}>{last ? last.sees : "nothing yet"}</p>
        <p className="mt-1 text-[11.5px] text-ink-3">Always visible either way: both IP addresses, the port ({mode === "https" ? 443 : 80}), and roughly how much data moves.</p>
      </div>

      {finished && (
        <Note tone={mode === "https" ? "good" : "bad"} className="pop-in mt-2">
          {mode === "http"
            ? "With HTTP, anyone on the path can read and change everything."
            : attacker
              ? "The fake certificate failed the check, so the browser refused to talk. The attacker learned nothing."
              : "The request and response crossed the network encrypted. Only the two ends can read them."}
        </Note>
      )}
    </div>
  );
}

export function checkTls(state: unknown, goal: Record<string, unknown>) {
  const st = state as TlsState | undefined;
  if (!st) return false;
  if (typeof goal.mode === "string" && st.mode !== goal.mode) return false;
  if (goal.finished === true && !st.finished) return false;
  if (typeof goal.attacker === "boolean" && st.attacker !== goal.attacker) return false;
  if (goal.blocked === true && !st.blocked) return false;
  return true;
}

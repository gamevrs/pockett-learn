"use client";

import React, { useState } from "react";
import { Play, ShieldAlert, ShieldCheck } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Mono, Note, Segmented, Tag, Toggle } from "./ui";

/**
 * Harden a session cookie. Five realistic attacks run against Dana's session; each is stopped by
 * exactly one decision: HttpOnly, Secure, SameSite, an idle timeout, or issuing a fresh session id
 * at login. Flip the controls and watch the attacks flip from "worked" to "blocked".
 */

type Same = "None" | "Lax" | "Strict";

interface Config {
  httpOnly: boolean;
  secure: boolean;
  sameSite: Same;
  idle: boolean;
  rotate: boolean;
}

interface Attack {
  id: string;
  name: string;
  setup: string;
  blockedBy: (c: Config) => boolean;
  stopped: string;
  worked: string;
}

const ATTACKS: Attack[] = [
  {
    id: "xss",
    name: "A stranger's script reads the cookie",
    setup: "A comment box on the clinic site fails to escape its input, so a stranger's script runs on the page. It calls document.cookie.",
    blockedBy: (c) => c.httpOnly,
    stopped: "document.cookie comes back empty: the browser never shows HttpOnly cookies to scripts.",
    worked: "The script reads sid=7f3a9c and sends it to the attacker's server.",
  },
  {
    id: "sniff",
    name: "Café Wi-Fi snooper",
    setup: "Dana's phone fetches one old logo over plain http:// on café Wi-Fi. Every request to the site carries her cookie.",
    blockedBy: (c) => c.secure,
    stopped: "A Secure cookie is only ever sent over https, so the plain-text request carried nothing.",
    worked: "The cookie travelled in clear text and the snooper read it from the air.",
  },
  {
    id: "csrf",
    name: "A form on another site",
    setup: "Dana, still logged in, opens evil.example. Its page quietly submits a form to POST /appointments/118/cancel on the clinic.",
    blockedBy: (c) => c.sameSite !== "None",
    stopped: "The browser left the cookie off a cross-site POST, so the request arrived logged out and was refused.",
    worked: "The browser attached Dana's cookie, because cookies ride along on every request to their site, whoever asked. Booking #118 is cancelled.",
  },
  {
    id: "idle",
    name: "Left logged in on a shared computer",
    setup: "Dana forgets to log out on the library computer. Someone sits down three hours later.",
    blockedBy: (c) => c.idle,
    stopped: "After 30 idle minutes the server stopped honouring the session. The next person sees a login page.",
    worked: "The session has no idle limit, so the stranger is Dana until the cookie finally expires.",
  },
  {
    id: "fixation",
    name: "A session id planted before login",
    setup: "The attacker gets Dana's browser to hold a session id they already know (sid=KNOWN), then waits. Dana logs in.",
    blockedBy: (c) => c.rotate,
    stopped: "Login issued a brand-new id, so the one the attacker planted is worthless.",
    worked: "The server kept the old id and upgraded it to a logged-in session. The attacker already knows it.",
  },
];

export interface CookieLabProps {
  /** Start with everything off (default) or already set. */
  initial?: Partial<Config>;
}

export interface CookieLabState extends Config {
  stopped: number;
  ran: number;
  allBlocked: boolean;
}

export function CookieLab({ props, onChange, revealed, status, goal }: WidgetProps<CookieLabProps>) {
  const [cfg, setCfg] = useState<Config>({ httpOnly: false, secure: false, sameSite: "None", idle: false, rotate: false, ...props.initial });
  const [ran, setRan] = useState<string[]>([]);

  const summarize = (c: Config, r: string[]): CookieLabState => {
    const stopped = ATTACKS.filter((a) => a.blockedBy(c)).length;
    return { ...c, stopped, ran: r.length, allBlocked: r.length === ATTACKS.length && stopped === ATTACKS.length };
  };
  const update = (next: Config, r: string[] = ran) => {
    setCfg(next);
    onChange?.(summarize(next, r));
  };
  const run = (id: string) => {
    if (revealed) return;
    const r = ran.includes(id) ? ran : [...ran, id];
    setRan(r);
    onChange?.(summarize(cfg, r));
  };
  const runAll = () => {
    if (revealed) return;
    const r = ATTACKS.map((a) => a.id);
    setRan(r);
    onChange?.(summarize(cfg, r));
  };

  const shownCfg: Config = status === "revealed" && goal ? { httpOnly: true, secure: true, sameSite: "Lax", idle: true, rotate: true } : cfg;
  const stopped = ATTACKS.filter((a) => a.blockedBy(shownCfg)).length;
  const line = `Set-Cookie: sid=7f3a9c; Path=/${shownCfg.httpOnly ? "; HttpOnly" : ""}${shownCfg.secure ? "; Secure" : ""}; SameSite=${shownCfg.sameSite}`;

  return (
    <div className="w-full max-w-2xl">
      <Caption className="mb-1.5">What the server sends at login</Caption>
      <Mono>{line}</Mono>

      <div className="mt-3 flex flex-wrap gap-2">
        <Toggle on={shownCfg.httpOnly} disabled={revealed} onClick={() => update({ ...cfg, httpOnly: !cfg.httpOnly })}>
          HttpOnly
        </Toggle>
        <Toggle on={shownCfg.secure} disabled={revealed} onClick={() => update({ ...cfg, secure: !cfg.secure })}>
          Secure
        </Toggle>
        <Toggle on={shownCfg.idle} disabled={revealed} onClick={() => update({ ...cfg, idle: !cfg.idle })}>
          Idle timeout 30 min
        </Toggle>
        <Toggle on={shownCfg.rotate} disabled={revealed} onClick={() => update({ ...cfg, rotate: !cfg.rotate })}>
          New id at login
        </Toggle>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-3">SameSite</span>
        <Segmented
          label="SameSite"
          value={shownCfg.sameSite}
          disabled={revealed}
          options={[
            { id: "None", label: "None" },
            { id: "Lax", label: "Lax" },
            { id: "Strict", label: "Strict" },
          ]}
          onChange={(v) => update({ ...cfg, sameSite: v })}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <Caption>Five attacks on Dana&apos;s session</Caption>
        <button type="button" className="btn !h-9 !px-3 text-sm" onClick={runAll} disabled={revealed}>
          <Play className="h-4 w-4" /> Run all
        </button>
      </div>
      <ul className="mt-1.5 grid gap-2">
        {ATTACKS.map((a) => {
          const has = ran.includes(a.id) || status === "revealed";
          const blocked = a.blockedBy(shownCfg);
          return (
            <li key={a.id} className={`rounded-xl border bg-surface p-2.5 ${has ? (blocked ? "border-[var(--brand)]/45" : "border-[var(--bad)]/50") : "border-line"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 flex-1 text-sm font-semibold text-ink">{a.name}</p>
                {has ? (
                  <Tag tone={blocked ? "good" : "bad"}>
                    {blocked ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                    {blocked ? "blocked" : "it worked"}
                  </Tag>
                ) : (
                  <button type="button" className="btn !h-8 !px-3 text-[13px]" onClick={() => run(a.id)} disabled={revealed}>
                    <Play className="h-3.5 w-3.5" /> Run
                  </button>
                )}
              </div>
              <p className="mt-1 text-[12.5px] leading-snug text-ink-2">{a.setup}</p>
              {has && <p className="pop-in mt-1.5 text-[12.5px] leading-snug text-ink">{blocked ? a.stopped : a.worked}</p>}
            </li>
          );
        })}
      </ul>
      <Note tone={stopped === ATTACKS.length ? "good" : "neutral"} className="mt-2">
        {stopped} of {ATTACKS.length} attacks stopped by this configuration.
      </Note>
    </div>
  );
}

export function checkCookieLab(state: unknown, goal: Record<string, unknown>) {
  const st = state as CookieLabState | undefined;
  if (!st) return false;
  if (goal.allBlocked === true && !st.allBlocked) return false;
  if (typeof goal.httpOnly === "boolean" && st.httpOnly !== goal.httpOnly) return false;
  if (typeof goal.secure === "boolean" && st.secure !== goal.secure) return false;
  if (typeof goal.minStopped === "number" && st.stopped < goal.minStopped) return false;
  return true;
}

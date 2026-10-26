"use client";

import React, { useState } from "react";
import { AlertTriangle, Lock, Play } from "lucide-react";
import { adviceFor, parseDiagnostics, runtimeAdvice, type BuildError } from "./data";

/**
 * Shared building blocks of the Lantern Hall desk board: panel frames, the dashed ghosts shown for
 * systems that are still locked, small stat tiles, and the desk console. Colour follows the Pockett
 * Stage system: neutral greys for structure, lime only for values the learner's code produced,
 * amber for caution, red for failure.
 */

export const C = {
  lime: "#c5ee8a",
  limeSoft: "#d3f3a4",
  amber: "#fbbf24",
  red: "#f87171",
  grey: "rgba(255,255,255,0.45)",
  line: "rgba(255,255,255,0.14)",
} as const;

/** Keyframes shared by the panels. Every animation is switched off for reduced motion. */
export const CSS = `
@keyframes fl-flow { to { stroke-dashoffset: -14; } }
.fl-flow { stroke-dasharray: 5 9; animation: fl-flow 1.1s linear infinite; }
@keyframes fl-travel { from { offset-distance: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } to { offset-distance: 100%; opacity: 0; } }
.fl-travel { offset-rotate: 0deg; animation: fl-travel 1.6s ease-in-out infinite; animation-delay: calc(var(--i, 0) * 0.35s); }
@keyframes fl-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.fl-grow { transform-origin: left center; animation: fl-grow 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both; animation-delay: calc(var(--i, 0) * 0.06s); }
@keyframes fl-rise { from { transform: scaleY(0); } to { transform: scaleY(1); } }
.fl-rise { transform-origin: bottom center; animation: fl-rise 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both; animation-delay: calc(var(--i, 0) * 0.07s); }
@keyframes fl-pop { 0% { opacity: 0; transform: scale(0.6); } 100% { opacity: 1; transform: scale(1); } }
.fl-pop { animation: fl-pop 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) both; animation-delay: calc(var(--i, 0) * 0.08s); }
@keyframes fl-blink { 50% { opacity: 0.35; } }
.fl-blink { animation: fl-blink 1.4s ease-in-out infinite; }
@keyframes fl-scan { from { transform: translateX(-100%); opacity: 0.85; } to { transform: translateX(100%); opacity: 0; } }
.fl-scan { animation: fl-scan 1.2s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .fl-flow, .fl-travel, .fl-grow, .fl-rise, .fl-pop, .fl-blink, .fl-scan { animation: none !important; }
  .fl-travel { opacity: 1; offset-distance: 50%; }
}
`;

// ───────────────────────── frames ─────────────────────────

export function Frame({
  id,
  title,
  icon,
  meta,
  focus,
  flash,
  className = "",
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  meta?: React.ReactNode;
  focus?: boolean;
  flash?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section data-panel={id} className={`hud-panel mb-3 break-inside-avoid px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""} ${className}`}>
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#c5ee8a]">{icon}</span>
        <h3 className="hud-title min-w-0 flex-1 truncate">{title}</h3>
        {meta && <span className="hud-value hud-muted shrink-0 text-[10px]">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

export type GhostKind = "tiles" | "rows" | "bars" | "pills" | "cards" | "chain" | "timeline" | "graph" | "bus" | "faders" | "console";

export function Ghost({ kind }: { kind: GhostKind }) {
  const bar = "rounded-sm bg-white/[0.05]";
  const box = "rounded-md border border-dashed border-white/10";
  switch (kind) {
    case "tiles":
      return (
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${box} p-2`}>
              <div className={`${bar} h-1.5 w-8`} />
              <div className={`${bar} mt-2 h-3 w-10`} />
            </div>
          ))}
        </div>
      );
    case "bars":
      return (
        <div className="space-y-1.5">
          {[92, 74, 55, 38].map((w) => (
            <div key={w} className="flex items-center gap-2">
              <div className={`${bar} h-1.5 w-8 shrink-0`} />
              <div className={`${bar} h-1.5`} style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      );
    case "faders":
      return (
        <div className="flex items-end justify-around gap-2">
          {[70, 45, 85, 30].map((h, i) => (
            <div key={i} className={`${box} w-4`} style={{ height: 14 + h * 0.5 }} />
          ))}
        </div>
      );
    case "pills":
      return (
        <div className="flex flex-wrap gap-1.5">
          {[26, 36, 22, 30].map((w, i) => (
            <div key={i} className={`${box} h-5`} style={{ width: w * 2 }} />
          ))}
        </div>
      );
    case "cards":
      return (
        <div className="grid grid-cols-2 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${box} p-2`}>
              <div className={`${bar} h-2 w-10`} />
              <div className={`${bar} mt-2 h-1 w-full`} />
            </div>
          ))}
        </div>
      );
    case "chain":
      return (
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <React.Fragment key={i}>
              <div className="h-6 w-10 shrink-0 rounded-md border border-dashed border-white/15" />
              {i < 3 && <div className="h-px flex-1 border-t border-dashed border-white/12" />}
            </React.Fragment>
          ))}
        </div>
      );
    case "timeline":
      return (
        <div className="space-y-1.5">
          {[
            [0, 40],
            [20, 55],
            [45, 45],
          ].map(([x, w], i) => (
            <div key={i} className="relative h-3">
              <div className={`${box} absolute inset-y-0 h-3`} style={{ left: `${x}%`, width: `${w}%` }} />
            </div>
          ))}
        </div>
      );
    case "graph":
      return (
        <svg viewBox="0 0 220 70" className="block w-full" aria-hidden>
          {[
            [24, 35],
            [110, 14],
            [110, 56],
            [196, 35],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="9" fill="none" stroke="rgba(255,255,255,0.14)" strokeDasharray="3 3" />
          ))}
          <path d="M33 33 L101 16 M33 37 L101 54 M119 16 L187 33 M119 54 L187 37" stroke="rgba(255,255,255,0.1)" strokeDasharray="3 4" fill="none" />
        </svg>
      );
    case "bus":
      return (
        <svg viewBox="0 0 220 80" className="block w-full" aria-hidden>
          <circle cx="30" cy="40" r="12" fill="none" stroke="rgba(255,255,255,0.16)" strokeDasharray="3 3" />
          {[14, 40, 66].map((y) => (
            <g key={y}>
              <path d={`M44 40 C 90 40, 100 ${y}, 150 ${y}`} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 4" fill="none" />
              <rect x="150" y={y - 8} width="58" height="16" rx="5" fill="none" stroke="rgba(255,255,255,0.14)" strokeDasharray="3 3" />
            </g>
          ))}
        </svg>
      );
    case "console":
      return (
        <div className="space-y-1.5">
          {[70, 45, 85, 30].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`${bar} h-1.5 w-2 shrink-0`} />
              <div className={`${bar} h-1.5`} style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      );
    default:
      return (
        <div className="space-y-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`${bar} h-1.5 w-5 shrink-0`} />
              <div className={`${bar} h-1.5 flex-1`} />
              <div className={`${bar} h-1.5 w-8 shrink-0`} />
            </div>
          ))}
        </div>
      );
  }
}

export function LockedPanel({ id, title, kind, lesson, clause, spot, className = "" }: { id: string; title: string; kind: GhostKind; lesson: number; clause: string; spot: boolean; className?: string }) {
  return (
    <section data-panel={id} data-locked="" className={`mb-3 break-inside-avoid rounded-[10px] border border-dashed px-3 py-2.5 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"} ${className}`}>
      <header className="mb-2.5 flex min-w-0 items-center gap-2">
        <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
        <h3 className="hud-label min-w-0 flex-1 truncate">{title}</h3>
        <span className="hud-label shrink-0 text-white/30">L{lesson}</span>
      </header>
      <Ghost kind={kind} />
      <p className="mt-2.5 truncate font-mono text-[10px] text-white/40">
        {spot ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
        {clause}
      </p>
    </section>
  );
}

/** Unlocked, but there is no build yet (the learner has not pressed Run on this page). */
export function WaitingPanel({ id, title, kind, lesson, className = "" }: { id: string; title: string; kind: GhostKind; lesson: number; className?: string }) {
  return (
    <section data-panel={id} data-waiting="" className={`mb-3 break-inside-avoid rounded-[10px] border border-white/10 bg-white/[0.02] px-3 py-2.5 ${className}`}>
      <header className="mb-2.5 flex min-w-0 items-center gap-2">
        <Play className="h-3 w-3 shrink-0 text-[#c5ee8a]/70" aria-hidden />
        <h3 className="hud-label min-w-0 flex-1 truncate">{title}</h3>
        <span className="hud-label shrink-0 text-white/30">L{lesson}</span>
      </header>
      <Ghost kind={kind} />
      <p className="mt-2.5 truncate font-mono text-[10px] text-white/40">Working. Press Run to build and fill it in.</p>
    </section>
  );
}

// ───────────────────────── small parts ─────────────────────────

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="hud-log hud-muted py-1 text-[11px]">{children}</p>;
}

export function Tile({ label, value, tone = "plain", unit }: { label: string; value: React.ReactNode; tone?: "plain" | "accent" | "warning" | "danger"; unit?: string }) {
  const color = tone === "accent" ? "hud-accent" : tone === "warning" ? "hud-warning" : tone === "danger" ? "hud-danger" : "";
  return (
    <div className="min-w-0 rounded-md bg-white/[0.04] px-2.5 py-2">
      <dt className="hud-label truncate">{label}</dt>
      <dd className={`hud-value mt-0.5 truncate text-[15px] leading-tight tabular-nums ${value === "—" ? "text-white/30" : color}`}>
        {value}
        {unit && value !== "—" && <span className="hud-muted ml-1 text-[10px]">{unit}</span>}
      </dd>
    </div>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-6 shrink-0 rounded-full border px-2.5 text-[10px] font-medium transition-colors ${
        active ? "border-transparent bg-[#c5ee8a] text-[#0a0a0a]" : "border-white/12 bg-white/[0.04] text-white/70 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

/** A small round lamp: lime when on, red when bad, grey otherwise. */
export function Lamp({ on, bad, size = 8 }: { on?: boolean; bad?: boolean; size?: number }) {
  const color = bad ? C.red : on ? C.lime : "rgba(255,255,255,0.25)";
  return <span aria-hidden className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: color, boxShadow: on || bad ? `0 0 ${size}px ${color}66` : undefined }} />;
}

export const dash = "—";

// ───────────────────────── console ─────────────────────────

function ErrorBlock({ error }: { error: BuildError }) {
  const compile = error.type === "CompileError";
  const diags = compile ? parseDiagnostics(error.message) : [];
  const advice = compile ? diags.map((d) => adviceFor(d.code)).find((a) => a !== undefined) : runtimeAdvice(error.message);
  const lines = compile ? [] : error.message.split("\n").filter((l) => l.trim().length > 0);
  return (
    <div role="alert" className="mb-2 rounded-md border border-[#f87171]/40 bg-[#2a0f0f]/70 px-2.5 py-2">
      <div className="mb-1.5 flex min-w-0 items-center gap-2">
        <AlertTriangle className="hud-danger h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="hud-title hud-danger min-w-0 flex-1 truncate">{compile ? "Build failed" : "The program crashed"}</span>
        {error.line !== null && <span className="hud-tag hud-danger shrink-0 border-[#f87171]/40">line {error.line}</span>}
      </div>
      {compile ? (
        <ul className="space-y-1">
          {diags.map((d, i) => (
            <li key={i} className="flex min-w-0 items-baseline gap-2 font-mono text-[11px] leading-snug text-[#fecaca]">
              {d.where && <span className="shrink-0 rounded bg-[#f87171]/15 px-1 text-[10px] text-[#fca5a5]">L{d.where}</span>}
              {d.code && <span className="shrink-0 text-[10px] text-[#fca5a5]/80">{d.code}</span>}
              <span className="min-w-0 break-words">{d.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-[#fecaca]">{lines.join("\n")}</pre>
      )}
      {advice && <p className="mt-1.5 border-t border-white/10 pt-1.5 text-[11px] leading-snug text-white/70">{advice}</p>}
      <p className="hud-muted mt-1 text-[10px]">Fix it in the editor and press Run again.</p>
    </div>
  );
}

function safeJson(v: unknown): string {
  try {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s;
  } catch {
    return String(v);
  }
}

export function ConsolePanel({
  stdout,
  built,
  error,
  keys,
  live,
  interactive,
  focus,
  flash,
  locked,
  className = "",
}: {
  stdout: string;
  built: boolean;
  error: BuildError | null;
  /** key -> value pairs the program sent with Desk.Show */
  keys: [string, unknown][];
  live: boolean;
  interactive: boolean;
  focus: boolean;
  flash: boolean;
  /** Console not unlocked yet: only the build result is shown */
  locked: boolean;
  className?: string;
}) {
  const [tab, setTab] = useState<"output" | "data">("output");
  const lines = stdout.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  const compileFailed = error?.type === "CompileError";
  const status = !built ? "Idle" : error ? (compileFailed ? "Build failed" : "Crashed") : "Build OK";
  const statusTone = !built ? "text-white/45" : error ? "hud-danger border-[#f87171]/40" : "hud-accent";

  return (
    <section data-panel="fl-console" className={`hud-panel mb-3 break-inside-avoid px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""} ${className}`}>
      <header className="mb-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="shrink-0 text-[#c5ee8a]">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" x2="20" y1="19" y2="19" />
          </svg>
        </span>
        <h3 className="hud-title min-w-0 flex-1 truncate">Desk console</h3>
        <span className={`hud-tag shrink-0 ${statusTone}`}>{status}</span>
      </header>

      {error && <ErrorBlock error={error} />}

      {locked ? (
        <div>
          <Ghost kind="console" />
          <p className="mt-2.5 truncate font-mono text-[10px] text-white/40">
            {focus ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
            Console.WriteLine(…)
          </p>
        </div>
      ) : (
        <>
          <div className="mb-1.5 flex gap-1.5" role="tablist" aria-label="Console view">
            <Chip active={tab === "output"} onClick={() => setTab("output")}>
              Output{lines.length > 0 ? ` · ${lines.length}` : ""}
            </Chip>
            <Chip active={tab === "data"} onClick={() => setTab("data")}>
              Scene data{keys.length > 0 ? ` · ${keys.length}` : ""}
            </Chip>
          </div>
          {tab === "output" ? (
            <div className={`hud-log rounded-md bg-black/40 px-2 py-1.5 ${interactive ? "max-h-56 overflow-auto" : "max-h-40 overflow-hidden"}`} role="log" aria-label="Program output">
              {!built ? (
                <p className="hud-muted">Press Run to build and run your program (3 to 5 seconds).</p>
              ) : lines.length === 0 ? (
                <p className="hud-muted">{error ? "Nothing was printed before the problem." : "The program ran but printed nothing."}</p>
              ) : (
                lines.map((l, i) => (
                  <div key={i} className="hud-log-line whitespace-pre-wrap break-words">
                    {l === "" ? " " : l}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className={`rounded-md bg-black/40 px-2 py-1.5 font-mono text-[10.5px] leading-[1.5] ${interactive ? "max-h-56 overflow-auto" : "max-h-40 overflow-hidden"}`}>
              {keys.length === 0 ? (
                <p className="hud-muted">{live ? "No values yet. Send one with Desk.Show(\"name\", value);" : "Run your program to see what it sent to the board."}</p>
              ) : (
                <dl className="space-y-0.5">
                  {keys.map(([k, v]) => (
                    <div key={k} className="flex min-w-0 gap-2">
                      <dt className="shrink-0 text-white/45">{k}</dt>
                      <dd className="hud-accent min-w-0 flex-1 truncate" title={safeJson(v)}>
                        {safeJson(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

"use client";

import React, { useState } from "react";
import { AlertTriangle, Lock, Play } from "lucide-react";
import {
  adviceFor,
  fmtNum,
  kgText,
  parseDiagnostics,
  runtimeAdvice,
  type BuildError,
  type EntryRow,
  type Hub,
} from "./data";

/**
 * The HUD cards of the sorting floor. Each one draws only what the learner's program printed,
 * tolerates missing or odd values, and never throws. Lime is reserved for values the learner's
 * code made; amber is caution, red is failure, everything else is neutral grey.
 */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const dash = "—";
const show = (v: number | undefined, f: (n: number) => string = fmtNum) => (v === undefined ? dash : f(v));

// ───────────────────────── frames ─────────────────────────

export function Frame({
  id,
  title,
  icon,
  meta,
  focus,
  flash,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  meta?: React.ReactNode;
  focus?: boolean;
  flash?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section data-panel={id} className={`hud-panel mb-3 break-inside-avoid px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""}`}>
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#c5ee8a]">{icon}</span>
        <h3 className="hud-title min-w-0 flex-1 truncate">{title}</h3>
        {meta && <span className="hud-value hud-muted shrink-0 text-[10px]">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

export type GhostKind = "tiles" | "rows" | "bars" | "chips" | "label" | "cards" | "console" | "lines";

function Ghost({ kind }: { kind: GhostKind }) {
  const bar = "rounded-sm bg-white/[0.05]";
  const box = "rounded-md border border-dashed border-white/10";
  switch (kind) {
    case "tiles":
      return (
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
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
    case "chips":
      return (
        <div className="flex flex-wrap gap-1.5">
          {[28, 40, 24, 36, 30, 22].map((w, i) => (
            <div key={i} className={`${box} h-5`} style={{ width: w + 14 }} />
          ))}
        </div>
      );
    case "label":
      return (
        <div className={`${box} p-2`}>
          <div className={`${bar} h-4 w-24`} />
          <div className={`${bar} mt-2 h-1.5 w-32`} />
          <div className="mt-2.5 flex h-5 items-stretch gap-[2px]">
            {Array.from({ length: 28 }, (_, i) => (
              <div key={i} className={bar} style={{ width: 1 + (i % 3) }} />
            ))}
          </div>
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
    case "lines":
      return (
        <div className="space-y-1.5">
          {[88, 62, 74].map((w, i) => (
            <div key={i} className={`${bar} h-2`} style={{ width: `${w}%` }} />
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

export function LockedPanel({ id, title, kind, lesson, clause, spot }: { id: string; title: string; kind: GhostKind; lesson: number; clause: string; spot: boolean }) {
  return (
    <section
      data-panel={id}
      data-locked=""
      className={`mb-3 break-inside-avoid rounded-[10px] border border-dashed px-3 py-2.5 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}
    >
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
export function WaitingPanel({ id, title, kind, lesson }: { id: string; title: string; kind: GhostKind; lesson: number }) {
  return (
    <section data-panel={id} data-waiting="" className="mb-3 break-inside-avoid rounded-[10px] border border-white/10 bg-white/[0.02] px-3 py-2.5">
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

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="hud-log hud-muted py-1 text-[11px]">{children}</p>;
}

type Tone = "plain" | "accent" | "warning" | "danger";
const toneClass = (t: Tone) => (t === "accent" ? "hud-accent" : t === "warning" ? "hud-warning" : t === "danger" ? "hud-danger" : "");

function Tile({ label, value, tone = "plain", unit }: { label: string; value: React.ReactNode; tone?: Tone; unit?: string }) {
  return (
    <div className="min-w-0 rounded-md bg-white/[0.04] px-2.5 py-2">
      <dt className="hud-label break-words">{label}</dt>
      <dd className={`hud-value mt-0.5 break-words text-[15px] leading-tight tabular-nums ${value === dash ? "text-white/30" : toneClass(tone)}`}>
        {value}
        {unit && value !== dash && <span className="hud-muted ml-1 text-[10px]">{unit}</span>}
      </dd>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

/** A small read-only pill. */
function Pill({ children, tone = "plain", title }: { children: React.ReactNode; tone?: Tone | "mute"; title?: string }) {
  const cls =
    tone === "accent"
      ? "border-[#c5ee8a]/50 bg-[#c5ee8a]/10 text-[#e0f6c1]"
      : tone === "warning"
        ? "border-[#fbbf24]/45 bg-[#fbbf24]/10 text-[#fde68a]"
        : tone === "danger"
          ? "border-[#f87171]/45 bg-[#f87171]/10 text-[#fecaca]"
          : tone === "mute"
            ? "border-white/10 text-white/40"
            : "border-white/15 bg-white/[0.04] text-white/80";
  return (
    <span title={title} className={`inline-flex h-5 max-w-full items-center rounded-full border px-2 font-mono text-[10px] ${cls}`}>
      <span className="truncate">{children}</span>
    </span>
  );
}

function Lamp({ on, label, bad }: { on: boolean | undefined; label: string; bad?: boolean }) {
  const color = on === undefined ? "bg-white/25" : on ? (bad ? "bg-[#f87171]" : "bg-[#c5ee8a]") : "bg-white/25";
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-[10.5px] text-white/75">
      <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}

function BarRow({ label, value, max, text, tone = "accent" }: { label: string; value: number; max: number; text?: string; tone?: Tone }) {
  const pct = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="w-[5.75rem] shrink-0 break-words font-mono text-[10.5px] text-white/60" title={label}>{label}</span>
      <div className="hud-bar h-2 min-w-0 flex-1">
        <span style={{ width: `${pct}%`, background: tone === "warning" ? "#fbbf24" : tone === "danger" ? "#f87171" : undefined }} />
      </div>
      <span className="hud-value min-w-8 shrink-0 whitespace-nowrap text-right text-[10.5px]">{text ?? fmtNum(value)}</span>
    </div>
  );
}

// ───────────────────────── 1: console ─────────────────────────

function ErrorBlock({ error }: { error: BuildError }) {
  const compile = error.type === "CompileError";
  const diags = compile ? parseDiagnostics(error.message) : [];
  const advice = compile ? diags.map((d) => adviceFor(d.text)).find((a) => a !== undefined) : runtimeAdvice(error.message);
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

function TerminalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
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
}: {
  stdout: string;
  built: boolean;
  error: BuildError | null;
  /** key -> value pairs the program sent with scene() */
  keys: [string, unknown][];
  live: boolean;
  interactive: boolean;
  focus: boolean;
  flash: boolean;
  /** Console not unlocked yet: only the build result is shown */
  locked: boolean;
}) {
  const [tab, setTab] = useState<"output" | "data">("output");
  const lines = stdout.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  const compileFailed = error?.type === "CompileError";
  const status = !built ? "Idle" : error ? (compileFailed ? "Build failed" : "Crashed") : "Build OK";
  const statusTone = !built ? "text-white/45" : error ? "hud-danger border-[#f87171]/40" : "hud-accent";

  return (
    <section data-panel="go-console" className={`hud-panel mb-3 break-inside-avoid px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""}`}>
      <header className="mb-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="shrink-0 text-[#c5ee8a]">
          <TerminalIcon />
        </span>
        <h3 className="hud-title min-w-0 flex-1 truncate">Control console</h3>
        <span className={`hud-tag shrink-0 ${statusTone}`}>{status}</span>
      </header>

      {error && <ErrorBlock error={error} />}

      {locked ? (
        <div>
          <Ghost kind="console" />
          <p className="mt-2.5 truncate font-mono text-[10px] text-white/40">
            {focus ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
            fmt.Println(…)
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
                <p className="hud-muted">Press Run to build and run your program.</p>
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
                <p className="hud-muted">{live ? "No values yet. Send one with scene(\"name\", value)" : "Run your program to see what it sent to the floor."}</p>
              ) : (
                <dl className="space-y-0.5">
                  {keys.map(([k, v]) => (
                    <div key={k} className="flex min-w-0 gap-2">
                      <dt className="shrink-0 text-white/45">{k}</dt>
                      <dd className="hud-accent min-w-0 flex-1 break-all" title={safeJson(v)}>
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

// ───────────────────────── 2: hub plate ─────────────────────────

export function Plate({ d }: { d: Hub["plate"] }) {
  const base = [d.hubName, d.shift, d.beltSpeed, d.open, d.regionCodes, d.kinds].every((v) => v === undefined);
  if (base) return <Empty>Nothing yet. Declare hubName, shift, beltSpeed and open, then send them with scene().</Empty>;
  const codes = d.regionCodes ? Object.entries(d.regionCodes).sort((a, b) => a[1] - b[1]) : [];
  const kinds = d.kinds ? Object.entries(d.kinds) : [];
  return (
    <div>
      <div className="flex min-w-0 items-center gap-2">
        <span className="hud-value hud-accent min-w-0 flex-1 break-words text-[15px] leading-tight">{d.hubName?.trim() ? d.hubName : "Unnamed hub"}</span>
        {d.shift !== undefined && <span className="hud-tag shrink-0">Shift {d.shift}</span>}
        <Lamp on={d.open} label={d.open === undefined ? "?" : d.open ? "Open" : "Closed"} bad={d.open === false} />
      </div>
      <dl className="mt-2.5 grid grid-cols-3 gap-1.5">
        <Tile label="Belt" value={show(d.beltSpeed)} unit="m/s" tone="accent" />
        <Tile label="Max parcel" value={show(d.maxGrams, (n) => `${fmtNum(n / 1000)}`)} unit="kg" tone="accent" />
        <Tile label="Regions" value={show(d.regionCount)} tone="accent" />
      </dl>
      {kinds.length > 0 && (
        <div className="mt-2.5">
          <p className="hud-label mb-1">Types</p>
          <div className="flex flex-wrap gap-1">
            {kinds.map(([k, t]) => (
              <Pill key={k} tone="mute" title={`${k} is a ${t}`}>
                {k} <span className="text-[#c5ee8a]/90">{t}</span>
              </Pill>
            ))}
          </div>
        </div>
      )}
      {(d.processed !== undefined || d.rejected !== undefined || d.note !== undefined || d.jammed !== undefined) && (
        <div className="mt-2.5 rounded-md border border-white/[0.08] px-2.5 py-1.5">
          <p className="hud-label mb-1">Counters and flags (start at their zero value)</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[11px]">
            <span className="text-white/45">processed</span>
            <span className="tabular-nums">{d.processed ?? dash}</span>
            <span className="text-white/45">rejected</span>
            <span className="tabular-nums">{d.rejected ?? dash}</span>
            <span className="text-white/45">note</span>
            <span>{d.note === undefined ? dash : `"${d.note}"`}</span>
            <span className="text-white/45">jammed</span>
            <span>{d.jammed === undefined ? dash : String(d.jammed)}</span>
          </div>
        </div>
      )}
      {codes.length > 0 && (
        <div className="mt-2.5">
          <p className="hud-label mb-1">iota regions</p>
          <div className="flex flex-wrap gap-1">
            {codes.map(([k, v]) => (
              <Pill key={k} tone="accent">
                {k} = {v}
              </Pill>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 3: loading bay ─────────────────────────

function MiniVan({ fill }: { fill: number }) {
  return (
    <div className="relative h-9 w-5 shrink-0 overflow-hidden rounded-[4px] border border-white/15 bg-white/[0.03]" title={`${Math.round(fill * 100)}% full`}>
      <div className="absolute inset-x-0 bottom-2.5 bg-[#c5ee8a]/60" style={{ height: `${fill * 22}px` }} />
      <div className="absolute inset-x-0.5 bottom-0.5 h-2 rounded-[2px] bg-white/20" />
    </div>
  );
}

export function Bay({ d }: { d: Hub["bay"] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Send bayParcels, vanSize, vansNeeded and lastLoad.</Empty>;
  const n = clamp(d.vansNeeded ?? 0, 0, 14);
  const size = d.vanSize && d.vanSize > 0 ? d.vanSize : 1;
  const wrapped = d.tiny !== undefined && d.tiny < 0;
  return (
    <div>
      {n > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {Array.from({ length: n }, (_, i) => (
            <MiniVan key={i} fill={i === n - 1 && d.lastLoad !== undefined ? clamp(d.lastLoad / size, 0, 1) : 1} />
          ))}
        </div>
      )}
      <dl className="grid grid-cols-3 gap-1.5">
        <Tile label="Parcels" value={show(d.bayParcels)} />
        <Tile label="Per van" value={show(d.vanSize)} />
        <Tile label="Vans" value={show(d.vansNeeded)} tone="accent" />
        <Tile label="Last van" value={show(d.lastLoad)} tone="accent" />
        <Tile label="Average" value={show(d.avgKg)} unit="kg" tone="accent" />
        <Tile label="Fee" value={d.feeText ?? dash} tone="accent" />
      </dl>
      {(d.tiny !== undefined || d.floatSum !== undefined) && (
        <div className="mt-2 rounded-md border border-white/[0.08] px-2.5 py-1.5">
          <p className="hud-label mb-1">Number traps</p>
          <div className="space-y-0.5 font-mono text-[11px]">
            <p className="flex min-w-0 justify-between gap-2">
              <span className="text-white/45">int8 127 + 1</span>
              <span className={`tabular-nums ${wrapped ? "hud-warning" : ""}`}>{show(d.tiny)}</span>
            </p>
            <p className="flex min-w-0 flex-wrap justify-between gap-x-2">
              <span className="text-white/45">0.1 + 0.2</span>
              <span className="whitespace-nowrap tabular-nums hud-warning">{d.floatSum === undefined ? dash : String(d.floatSum)}</span>
            </p>
          </div>
          {wrapped && <p className="hud-muted mt-1 text-[10px]">A small integer wrapped around, silently.</p>}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 4: label scanner ─────────────────────────

function Barcode({ text }: { text: string }) {
  const bars: number[] = [];
  for (let i = 0; i < Math.min(text.length, 12); i++) {
    const c = text.charCodeAt(i);
    for (let b = 0; b < 4; b++) bars.push(1 + ((c >> b) & 3));
  }
  return (
    <div className="flex h-7 items-stretch gap-[2px] overflow-hidden" aria-hidden>
      {bars.map((w, i) => (
        <span key={i} className={i % 2 === 0 ? "bg-white/80" : "bg-transparent"} style={{ width: w }} />
      ))}
    </div>
  );
}

export function Scanner({ d }: { d: Hub["scanner"] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Read the label from stdin and send parcelID, region and grams.</Empty>;
  return (
    <div>
      <div className="rounded-md border border-white/12 bg-white/[0.03] p-2.5">
        <div className="flex min-w-0 items-baseline justify-between gap-2">
          <span className="hud-value hud-accent min-w-0 break-all text-[20px] leading-none tracking-wide">{d.parcelID ?? dash}</span>
          <span className="hud-label shrink-0">{d.grams === undefined ? dash : kgText(d.grams)}</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="hud-label">Region</span>
          <Pill tone="accent">{d.region ?? dash}</Pill>
          {d.grams !== undefined && <Pill>{fmtNum(d.grams)} g</Pill>}
        </div>
        <div className="mt-2.5 border-t border-dashed border-white/15 pt-2.5">{d.parcelID ? <Barcode text={d.parcelID} /> : <div className="h-7 rounded-sm bg-white/[0.05]" />}</div>
      </div>
      {d.badText !== undefined && (
        <div className="mt-2 rounded-md border border-[#fbbf24]/35 bg-[#fbbf24]/[0.06] px-2.5 py-1.5">
          <p className="hud-label mb-0.5">Second label</p>
          <p className="break-words font-mono text-[11px]">
            <span className="text-white/80">&quot;{d.badText}&quot;</span> <span className="text-white/35">→</span> <span className="hud-warning">not a whole number</span>
          </p>
          {d.badError && <p className="mt-0.5 break-words font-mono text-[10px] text-white/50">{d.badError}</p>}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 5: sorting gate ─────────────────────────

export function Gate({ d }: { d: Hub["gate"] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Decide class, handling and chute, then send them.</Empty>;
  const bad = d.class === "Invalid" || d.class === "Overweight";
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border ${d.chute && d.chute !== "reject" ? "border-[#c5ee8a]/50 bg-[#c5ee8a]/10" : "border-[#f87171]/40 bg-[#f87171]/10"}`}>
          <span className={`hud-value text-[22px] ${d.chute && d.chute !== "reject" ? "hud-accent" : "hud-danger"}`}>{d.chute && d.chute !== "reject" ? d.chute : "×"}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Pill tone={bad ? "danger" : "accent"}>{d.class ?? dash}</Pill>
            {d.lane && <Pill>{d.lane}</Pill>}
          </div>
          <p className="hud-muted mt-1 text-[10.5px]">{d.chute === "reject" ? "No chute for this region" : d.chute ? `Chute ${d.chute}` : "chute unknown"}</p>
        </div>
        <Lamp on={d.accepted} label={d.accepted === undefined ? "?" : d.accepted ? "Accepted" : "Refused"} bad={d.accepted === false} />
      </div>
      {d.handling && (
        <p className="mt-2.5 rounded-md bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/80">
          <span className="hud-label mr-2">Handling</span>
          {d.handling}
        </p>
      )}
    </div>
  );
}

// ───────────────────────── 6: intake belt ─────────────────────────

export function BeltCard({ d }: { d: Hub["belt"] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Loop over the manifest and send processed, unreadable and totalGrams.</Empty>;
  const processed = d.processed ?? 0;
  const bad = d.unreadable ?? 0;
  return (
    <div>
      {d.processed !== undefined && (
        <div className="mb-2.5 flex h-3 w-full gap-[2px]" aria-label={`${processed} lines, ${bad} unreadable`}>
          {Array.from({ length: Math.min(processed, 24) }, (_, i) => (
            <span key={i} className={`flex-1 rounded-[2px] ${i >= Math.min(processed, 24) - Math.min(bad, 24) ? "bg-[#fbbf24]/70" : "bg-[#c5ee8a]/70"}`} />
          ))}
        </div>
      )}
      <dl className="grid grid-cols-3 gap-1.5">
        <Tile label="Lines" value={show(d.processed)} tone="accent" />
        <Tile label="Unreadable" value={show(d.unreadable)} tone={bad > 0 ? "warning" : "accent"} />
        <Tile label="Total" value={show(d.totalGrams, (n) => fmtNum(n / 1000, 1))} unit="kg" tone="accent" />
        <Tile label="Heaviest" value={show(d.heaviest, (n) => fmtNum(n / 1000, 1))} unit="kg" tone="accent" />
        <Tile label="Digits in ID" value={show(d.digits)} />
        <Tile label="Ramp steps" value={show(d.rampSteps)} />
      </dl>
    </div>
  );
}

// ───────────────────────── 7: parcel queue ─────────────────────────

export function Queue({ d }: { d: Hub["queue"] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Split the manifest into rows and send queue and weights.</Empty>;
  const ids = d.queue ?? [];
  const w = d.weights ?? [];
  const maxW = Math.max(1, ...w);
  const caps = d.capSteps ?? [];
  const maxCap = Math.max(1, ...caps);
  return (
    <div>
      {ids.length > 0 && (
        <div className="space-y-1">
          {ids.slice(0, 8).map((id, i) => (
            <BarRow key={`${id}-${i}`} label={id} value={w[i] ?? 0} max={maxW} text={w[i] === undefined ? dash : fmtNum(w[i] / 1000, 1)} tone={(w[i] ?? 0) > 25000 ? "danger" : "accent"} />
          ))}
          {ids.length > 8 && <p className="hud-muted text-[10px]">+ {ids.length - 8} more in the queue</p>}
        </div>
      )}
      {caps.length > 0 && (
        <div className="mt-2.5">
          <p className="hud-label mb-1">cap() after each append</p>
          <div className="flex h-8 items-end gap-[3px]" aria-label={`capacity steps ${caps.join(", ")}`}>
            {caps.slice(0, 24).map((c, i) => (
              <span key={i} className="flex-1 rounded-t-[2px] bg-[#c5ee8a]/65" style={{ height: `${Math.max(12, (c / maxCap) * 100)}%` }} title={`cap ${c}`} />
            ))}
          </div>
        </div>
      )}
      {(d.chuteLabels || d.backupFirst !== undefined) && (
        <div className="mt-2.5 rounded-md border border-white/[0.08] px-2.5 py-1.5">
          <p className="hud-label mb-1">Arrays copy, slices share</p>
          <p className="flex flex-wrap items-center gap-1 font-mono text-[11px]">
            <span className="text-white/45">chuteLabels</span>
            {(d.chuteLabels ?? []).map((l, i) => (
              <Pill key={i} tone="accent">
                {l}
              </Pill>
            ))}
          </p>
          {d.backupFirst !== undefined && (
            <p className="mt-1 font-mono text-[11px]">
              <span className="text-white/45">copy[0] = </span>
              <span className="hud-warning">&quot;{d.backupFirst}&quot;</span>
              <span className="text-white/45"> · original[0] is still &quot;{d.chuteLabels?.[0] ?? "A"}&quot;</span>
            </p>
          )}
        </div>
      )}
      {(d.leaked !== undefined || d.untouched !== undefined) && (
        <div className="mt-2 rounded-md border border-[#fbbf24]/30 bg-[#fbbf24]/[0.05] px-2.5 py-1.5 font-mono text-[11px]">
          <p>
            <span className="text-white/45">append via sub-slice → original[3] = </span>
            <span className="hud-warning">{show(d.leaked)}</span>
          </p>
          <p>
            <span className="text-white/45">capped with s[:3:3] → original[3] = </span>
            <span className="hud-accent">{show(d.untouched)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 8: chute tally ─────────────────────────

export function Chutes({ d }: { d: Hub["chutes"] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Count parcels per region in a map and send tally.</Empty>;
  const names = d.sortedNames ?? Object.keys(d.tally ?? {}).sort();
  const max = Math.max(1, ...names.map((n) => d.tally?.[n] ?? 0));
  const unknown = d.unknown ? Object.entries(d.unknown) : [];
  return (
    <div>
      <div className="space-y-1">
        {names.map((n) => (
          <BarRow key={n} label={n} value={d.tally?.[n] ?? 0} max={max} text={`${d.tally?.[n] ?? 0}${d.gramsBy?.[n] !== undefined ? ` · ${fmtNum(d.gramsBy[n] / 1000, 1)}kg` : ""}`} />
        ))}
        {names.length === 0 && <Empty>The tally map is empty.</Empty>}
      </div>
      {unknown.length > 0 && (
        <div className="mt-2.5">
          <p className="hud-label mb-1">No chute for these</p>
          <div className="flex flex-wrap gap-1">
            {unknown.map(([k, v]) => (
              <Pill key={k} tone="warning">
                {k} × {v}
              </Pill>
            ))}
          </div>
        </div>
      )}
      {(d.missing !== undefined || d.known !== undefined) && (
        <p className="mt-2 rounded-md bg-white/[0.04] px-2.5 py-1.5 font-mono text-[10.5px] text-white/70">
          tally[&quot;atlantis&quot;] → <span className="text-white">{show(d.missing)}</span>, ok = <span className={d.known ? "hud-accent" : "hud-warning"}>{d.known === undefined ? dash : String(d.known)}</span>
        </p>
      )}
    </div>
  );
}

// ───────────────────────── 9: weigh station ─────────────────────────

export function Weigh({ d }: { d: Hub["weigh"] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Write summarize() and classify(), then send the batch numbers.</Empty>;
  const classes = d.classCounts ? Object.entries(d.classCounts) : [];
  const order = ["Envelope", "Small", "Standard", "Freight", "Overweight"];
  const rank = (k: string) => (order.indexOf(k) < 0 ? 99 : order.indexOf(k));
  classes.sort((a, b) => rank(a[0]) - rank(b[0]));
  const max = Math.max(1, ...classes.map(([, v]) => v));
  return (
    <div>
      <dl className="grid grid-cols-3 gap-1.5">
        <Tile label="Parcels" value={show(d.batchCount)} tone="accent" />
        <Tile label="Weight" value={show(d.batchKg)} unit="kg" tone="accent" />
        <Tile label="Heaviest" value={show(d.batchHeaviest, (n) => fmtNum(n / 1000, 1))} unit="kg" tone="accent" />
      </dl>
      {classes.length > 0 && (
        <div className="mt-2.5 space-y-1">
          {classes.map(([k, v]) => (
            <BarRow key={k} label={k} value={v} max={max} tone={k === "Overweight" || k === "Invalid" ? "danger" : "accent"} />
          ))}
        </div>
      )}
      {(d.firstOK !== undefined || d.badOK !== undefined) && (
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
          <Lamp on={d.firstOK} label="parseRow(good row) ok" />
          <Lamp on={d.badOK === undefined ? undefined : !d.badOK} label="parseRow(bad row) refused" />
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 10: reject bin ─────────────────────────

const reasonTone = (r: string): Tone => (r === "overweight" ? "danger" : r === "malformed" ? "warning" : r === "bad-weight" ? "warning" : "danger");

export function Rejects({ d }: { d: Hub["rejects"] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Return errors from screen() and send rejects and reasons.</Empty>;
  const rows = d.rejects ?? [];
  const reasons = d.reasons ? Object.entries(d.reasons) : [];
  return (
    <div>
      <dl className="grid grid-cols-2 gap-1.5">
        <Tile label="Rejected" value={show(d.rejected ?? (d.rejects ? d.rejects.length : undefined))} tone="danger" />
        <Tile label="Passed" value={show(d.passed)} tone="accent" />
      </dl>
      {rows.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {rows.map((r, i) => (
            <li key={`${r.id}-${i}`} className="rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="hud-value min-w-0 flex-1 truncate text-[11px]">{r.id}</span>
                <Pill tone={reasonTone(r.reason)}>{r.reason}</Pill>
              </div>
              {r.message && <p className="mt-0.5 break-words font-mono text-[10px] leading-snug text-white/50">{r.message}</p>}
            </li>
          ))}
        </ul>
      )}
      {reasons.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {reasons.map(([k, v]) => (
            <Pill key={k} tone="mute">
              {k} × {v}
            </Pill>
          ))}
        </div>
      )}
      {(d.sameDirect !== undefined || d.sameIs !== undefined) && (
        <div className="mt-2.5 rounded-md border border-white/[0.08] px-2.5 py-1.5 font-mono text-[10.5px]">
          <p className="flex justify-between gap-2">
            <span className="text-white/45">err == ErrOverweight</span>
            <span className={d.sameDirect ? "hud-accent" : "hud-warning"}>{d.sameDirect === undefined ? dash : String(d.sameDirect)}</span>
          </p>
          <p className="flex justify-between gap-2">
            <span className="text-white/45">errors.Is(err, ErrOverweight)</span>
            <span className={d.sameIs ? "hud-accent" : "hud-warning"}>{d.sameIs === undefined ? dash : String(d.sameIs)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 11: courier vans ─────────────────────────

export function Vans({ d }: { d: Hub["vans"] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Define type Van and send vans, parcels and overflow.</Empty>;
  const vans = d.vans ?? [];
  return (
    <div>
      <div className="space-y-2">
        {vans.map((v, i) => {
          const pct = v.limit > 0 ? clamp((v.loaded / v.limit) * 100, 0, 100) : 0;
          return (
            <div key={`${v.name}-${i}`}>
              <div className="mb-0.5 flex min-w-0 items-baseline justify-between gap-2">
                <span className="hud-value min-w-0 break-words text-[11px]">
                  {v.name} <span className="text-white/40">· {v.region || dash}</span>
                </span>
                <span className="hud-value shrink-0 text-[10.5px]">
                  {fmtNum(v.loaded / 1000, 1)}/{fmtNum(v.limit / 1000, 1)} kg
                </span>
              </div>
              <div className="hud-bar h-2">
                <span style={{ width: `${pct}%`, background: pct >= 95 ? "#fbbf24" : undefined }} />
              </div>
              {v.parcels.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {v.parcels.map((p) => (
                    <Pill key={p} tone="mute">
                      {p}
                    </Pill>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {vans.length === 0 && <Empty>No vans in the fleet yet.</Empty>}
      </div>
      {d.overflow !== undefined && (
        <div className="mt-2.5 rounded-md border border-[#fbbf24]/30 bg-[#fbbf24]/[0.05] px-2.5 py-1.5">
          <p className="hud-label mb-1">Overflow tray</p>
          {d.overflow.length === 0 ? (
            <p className="hud-muted text-[10.5px]">Everything fit.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {d.overflow.map((id) => (
                <Pill key={id} tone="warning">
                  {id}
                </Pill>
              ))}
            </div>
          )}
        </div>
      )}
      {(d.trialLoaded !== undefined || d.trialLoadedPtr !== undefined) && (
        <div className="mt-2 rounded-md border border-white/[0.08] px-2.5 py-1.5 font-mono text-[10.5px]">
          <p className="flex justify-between gap-2">
            <span className="text-white/45">value receiver → Loaded</span>
            <span className="hud-warning">{show(d.trialLoaded)}</span>
          </p>
          <p className="flex justify-between gap-2">
            <span className="text-white/45">pointer receiver → Loaded</span>
            <span className="hud-accent">{show(d.trialLoadedPtr)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 12: routing board ─────────────────────────

const laneTone = (l: string): Tone => (l === "express" ? "accent" : l === "freight" ? "warning" : "plain");

export function Routers({ d }: { d: Hub["routers"] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Write a Router interface and send routes.</Empty>;
  const routes = d.routes ?? [];
  return (
    <div>
      {d.regionNames && d.regionNames.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {d.regionNames.map((n, i) => (
            <Pill key={n} tone="accent">
              {i} {n}
            </Pill>
          ))}
        </div>
      )}
      {routes.length > 0 && (
        <div className="overflow-hidden rounded-md border border-white/[0.08]">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 bg-white/[0.04] px-2 py-1">
            <span className="hud-label">Parcel</span>
            <span className="hud-label">RegionRouter</span>
            <span className="hud-label">WeightRouter</span>
          </div>
          {routes.slice(0, 12).map((r, i) => (
            <div key={`${r.id}-${i}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 border-t border-white/[0.06] px-2 py-1">
              <span className="hud-value min-w-0 truncate text-[10.5px]">{r.id}</span>
              <span className="hud-value hud-accent w-12 text-center text-[11px]">{r.chute}</span>
              <Pill tone={laneTone(r.lane)}>{r.lane || dash}</Pill>
            </div>
          ))}
        </div>
      )}
      {routes.length > 12 && <p className="hud-muted mt-1 text-[10px]">+ {routes.length - 12} more routes</p>}
    </div>
  );
}

// ───────────────────────── 13: sorting racks ─────────────────────────

function Rack({ title, ids, tone }: { title: string; ids: string[] | undefined; tone?: Tone }) {
  if (!ids) return null;
  return (
    <div>
      <p className="hud-label mb-1">{title}</p>
      <ol className="flex flex-wrap gap-1">
        {ids.map((id, i) => (
          <li key={`${id}-${i}`} className="inline-flex h-5 items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] pl-1.5 pr-2 font-mono text-[10px] text-white/80">
            <span className={`tabular-nums ${tone === "warning" ? "hud-warning" : "text-white/35"}`}>{i + 1}</span>
            {id.replace(/^PK-/, "")}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Sorter({ d }: { d: Hub["sorter"] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Sort a copy of the parcels with sort.Slice and send the orders.</Empty>;
  return (
    <div className="space-y-2.5">
      <Rack title="Heaviest first" ids={d.byWeight} />
      <Rack title="By region, then weight" ids={d.byRegion} />
      {d.tags && (
        <div>
          <p className="hud-label mb-1">Slot tags from a closure</p>
          <div className="flex flex-wrap gap-1">
            {d.tags.map((t) => (
              <Pill key={t} tone="accent">
                {t}
              </Pill>
            ))}
          </div>
        </div>
      )}
      {d.bigIDs && (
        <div>
          <p className="hud-label mb-1">Over the limit (captured variable)</p>
          <div className="flex flex-wrap gap-1">
            {d.bigIDs.map((t) => (
              <Pill key={t} tone="warning">
                {t}
              </Pill>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 14: safety interlock ─────────────────────────

export function Safety({ d }: { d: Hub["safety"] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Use defer and recover, then send closeSteps and caught.</Empty>;
  return (
    <div>
      {d.closeSteps && (
        <div>
          <p className="hud-label mb-1">Shutdown order</p>
          <ol className="space-y-1">
            {d.closeSteps.map((s, i) => (
              <li key={`${s}-${i}`} className="flex items-center gap-2 text-[11px] text-white/80">
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#c5ee8a]/15 font-mono text-[9px] text-[#c5ee8a]">{i + 1}</span>
                <span className="min-w-0 break-words">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {d.caught && (
        <div className="mt-2.5">
          <p className="hud-label mb-1">Panics caught by recover</p>
          {d.caught.length === 0 ? (
            <p className="hud-muted text-[10.5px]">Nothing needed catching.</p>
          ) : (
            <ul className="space-y-1.5">
              {d.caught.map((m, i) => (
                <li key={`${m}-${i}`} className="rounded-md border border-[#fbbf24]/30 bg-[#fbbf24]/[0.05] px-2 py-1.5 font-mono text-[10.5px] leading-snug text-white/75">
                  {m}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 15: manifest ─────────────────────────

function tint(json: string): React.ReactNode[] {
  return json.split("\n").map((line, i) => {
    const m = /^(\s*)("[^"]+")(: )?(.*)$/.exec(line);
    if (!m) return <div key={i}>{line}</div>;
    const [, indent, key, colon, rest] = m;
    return (
      <div key={i} className="whitespace-pre">
        {indent}
        {colon ? <span className="text-white/45">{key}</span> : <span className="hud-accent">{key}</span>}
        {colon}
        <span className="hud-accent">{rest}</span>
      </div>
    );
  });
}

export function ManifestCard({ d, entries }: { d: Hub["manifest"]; entries?: EntryRow[] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Tag a struct, marshal it and send manifest.</Empty>;
  let pretty = "";
  try {
    pretty = d.manifest === undefined ? "" : (JSON.stringify(d.manifest, null, 2) ?? "");
  } catch {
    pretty = "";
  }
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {d.jsonBytes !== undefined && <Pill tone="accent">{fmtNum(d.jsonBytes)} bytes</Pill>}
        {entries && <Pill>{entries.length} entries</Pill>}
        <Lamp on={d.roundTrip} label={d.roundTrip === undefined ? "round trip ?" : d.roundTrip ? "round trip ok" : "round trip failed"} bad={d.roundTrip === false} />
      </div>
      {pretty && <div className="max-h-48 overflow-auto rounded-md bg-black/40 px-2 py-1.5 font-mono text-[10.5px] leading-[1.5] text-white/75">{tint(pretty)}</div>}
      {d.compact && <p className="mt-2 break-all rounded-md bg-white/[0.04] px-2.5 py-1.5 font-mono text-[10px] text-white/70">{d.compact}</p>}
    </div>
  );
}

// ───────────────────────── 16: shift report ─────────────────────────

export function ShiftCard({ d, allLive }: { d: Hub["shift"]; allLive: boolean }) {
  const r = d.report;
  if (!r && d.balanced === undefined) return <Empty>Nothing yet. Build the Report and send report.</Empty>;
  const chutes = r?.perChute ? Object.entries(r.perChute).sort() : [];
  const max = Math.max(1, ...chutes.map(([, v]) => v));
  return (
    <div>
      <dl className="grid grid-cols-3 gap-1.5">
        <Tile label="Sorted" value={show(r?.sorted)} tone="accent" />
        <Tile label="Rejected" value={show(r?.rejected)} tone={(r?.rejected ?? 0) > 0 ? "danger" : "accent"} />
        <Tile label="Overflow" value={show(r?.overflow)} tone={(r?.overflow ?? 0) > 0 ? "warning" : "accent"} />
        <Tile label="Revenue" value={r?.revenue ?? dash} tone="accent" />
        <Tile label="Heaviest" value={r?.heaviest ?? dash} />
        <Tile label="Shift" value={show(r?.shift)} />
      </dl>
      {chutes.length > 0 && (
        <div className="mt-2.5 space-y-1">
          {chutes.map(([k, v]) => (
            <BarRow key={k} label={`Chute ${k}`} value={v} max={max} text={String(v)} />
          ))}
        </div>
      )}
      {r?.reasons && Object.keys(r.reasons).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {Object.entries(r.reasons).map(([k, v]) => (
            <Pill key={k} tone="mute">
              {k} × {v}
            </Pill>
          ))}
        </div>
      )}
      {d.balanced !== undefined && (
        <p className={`mt-2.5 rounded-md border px-2.5 py-1.5 text-[11px] ${d.balanced ? "border-[#c5ee8a]/40 bg-[#c5ee8a]/10 text-[#e0f6c1]" : "border-[#f87171]/40 bg-[#f87171]/10 text-[#fecaca]"}`}>
          {d.balanced ? "Balanced: every manifest line is accounted for." : "Not balanced: some manifest lines are unaccounted for."}
        </p>
      )}
      {allLive && <p className="hud-accent mt-2 text-[11px]">All systems live. Shift closed.</p>}
    </div>
  );
}

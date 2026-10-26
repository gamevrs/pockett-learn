"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Bot, CircleHelp, Lock, OctagonAlert, Play, RotateCcw, ScanBarcode, Truck } from "lucide-react";
import {
  adviceFor,
  fmtMoney,
  fmtNum,
  parseDiagnostics,
  parseFloor,
  plural,
  runtimeAdvice,
  type BuildError,
  type Depot,
  type FleetRobot,
  type Incident,
  type ParcelRow,
} from "./data";

/**
 * The panels of the depot board. Each one draws only what the learner's program printed, tolerates
 * missing or odd values, and never throws. Lime is reserved for values the learner's code made;
 * amber is caution, red is failure, everything else is neutral grey.
 */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

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

export type GhostKind = "tiles" | "rows" | "bars" | "grid" | "slots" | "pills" | "label" | "cards" | "columns" | "console";

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
    case "grid":
      return (
        <div className="mx-auto grid max-w-[14rem] grid-cols-8 gap-0.5">
          {Array.from({ length: 40 }, (_, i) => {
            const x = i % 8;
            const y = Math.floor(i / 8);
            const ring = x === 0 || x === 7 || y === 0 || y === 4;
            return <div key={i} className={`aspect-square rounded-[2px] ${ring ? "border border-dashed border-white/20" : "bg-white/[0.04]"}`} />;
          })}
        </div>
      );
    case "slots":
      return (
        <div className="grid grid-cols-6 gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`${box} h-9`} />
          ))}
        </div>
      );
    case "pills":
      return (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-1.5">
              {[0, 1, 2].map((j) => (
                <div key={j} className={`${box} h-5 flex-1`} />
              ))}
            </div>
          ))}
        </div>
      );
    case "label":
      return (
        <div className={`${box} p-2`}>
          <div className={`${bar} h-4 w-24`} />
          <div className={`${bar} mt-2 h-1.5 w-32`} />
          <div className={`${bar} mt-1.5 h-1.5 w-20`} />
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
    case "columns":
      return (
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className={`${bar} h-1.5 w-8`} />
              <div className={`${box} h-7`} />
              {i % 2 === 0 && <div className={`${box} h-7`} />}
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

function Tile({ label, value, tone = "plain", unit }: { label: string; value: React.ReactNode; tone?: "plain" | "accent" | "warning" | "danger"; unit?: string }) {
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

const dash = "—";
const show = (v: number | undefined, f: (n: number) => string = fmtNum) => (v === undefined ? dash : f(v));

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
  /** key -> value pairs the program sent with Depot.Show */
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
    <section data-panel="cs-console" className={`hud-panel mb-3 break-inside-avoid px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""}`}>
      <header className="mb-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="shrink-0 text-[#c5ee8a]">
          <TerminalIcon />
        </span>
        <h3 className="hud-title min-w-0 flex-1 truncate">Depot console</h3>
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
                <p className="hud-muted">Press Run to build and run your program (2 to 4 seconds).</p>
              ) : lines.length === 0 ? (
                <p className="hud-muted">{error ? "Nothing was printed before the problem." : "The program ran but printed nothing."}</p>
              ) : (
                lines.map((l, i) => (
                  <div key={i} className="hud-log-line whitespace-pre-wrap break-words">
                    {l === "" ? " " : l}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className={`rounded-md bg-black/40 px-2 py-1.5 font-mono text-[10.5px] leading-[1.5] ${interactive ? "max-h-56 overflow-auto" : "max-h-40 overflow-hidden"}`}>
              {keys.length === 0 ? (
                <p className="hud-muted">
                  {live ? "No values yet. Send one with Depot.Show(\"name\", value);" : "Run your program to see what it sent to the board."}
                </p>
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

// ───────────────────────── lesson 2: robot card ─────────────────────────

export function RobotCard({ d }: { d: Depot["robot"] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Send robotName, battery, speed... with Depot.Show.</Empty>;
  const max = d.maxBattery && d.maxBattery > 0 ? d.maxBattery : 100;
  const pct = d.battery === undefined ? 0 : clamp((d.battery / max) * 100, 0, 100);
  const low = d.battery !== undefined && pct < 20;
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
          <Bot className="h-6 w-6 text-[#c5ee8a]" aria-hidden />
          <span
            className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ring-2 ring-[#0a0a0a] ${d.online === true ? "bg-[#c5ee8a]" : d.online === false ? "bg-[#f87171]" : "bg-white/30"}`}
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="hud-value hud-accent min-w-0 truncate text-[15px]">{d.name?.trim() ? d.name : "Unnamed"}</span>
            {d.grade && <span className="hud-tag shrink-0">Grade {d.grade.slice(0, 1)}</span>}
          </div>
          <p className="hud-muted text-[10px]">{d.online === undefined ? "status unknown" : d.online ? "Online" : "Offline"}</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <span className="hud-label">Battery</span>
          <span className={`hud-value text-[11px] ${low ? "hud-warning" : ""}`}>
            {d.battery === undefined ? dash : `${fmtNum(d.battery)}/${fmtNum(max)}`}
          </span>
        </div>
        <div className={`hud-bar h-2 ${low ? "" : ""}`}>
          <span style={{ width: `${pct}%`, background: low ? "#fbbf24" : undefined }} />
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-1.5">
        <Tile label="Speed" value={show(d.speed)} unit="m/s" tone="accent" />
        <Tile label="Cycles" value={show(d.cycles)} />
        <Tile label="Max" value={show(d.maxBattery)} />
      </dl>
    </div>
  );
}

// ───────────────────────── lesson 3: dispatch calculator ─────────────────────────

export function Dispatch({ d }: { d: Depot["dispatch"] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Send trips, leftover, avgKg and fee.</Empty>;
  const wrapped = d.wrapped !== undefined && d.wrapped < 0;
  return (
    <div>
      <dl className="grid grid-cols-3 gap-1.5">
        <Tile label="Parcels" value={show(d.parcels)} />
        <Tile label="Crate" value={show(d.crateSize)} />
        <Tile label="Trips" value={show(d.trips)} tone="accent" />
        <Tile label="Left over" value={show(d.leftover)} tone="accent" />
        <Tile label="Average" value={show(d.avgKg)} unit="kg" tone="accent" />
        <Tile label="Fee" value={show(d.fee, fmtMoney)} tone="accent" />
      </dl>
      {(d.wrapped !== undefined || d.safe !== undefined) && (
        <div className="mt-2 rounded-md border border-white/[0.08] px-2.5 py-1.5">
          <p className="hud-label mb-1">Overflow trap</p>
          <div className="space-y-0.5 font-mono text-[11px]">
            <p className="flex min-w-0 justify-between gap-2">
              <span className="text-white/45">int wrapped</span>
              <span className={`min-w-0 truncate tabular-nums ${wrapped ? "hud-warning" : ""}`}>{show(d.wrapped, (n) => n.toLocaleString("en-US"))}</span>
            </p>
            <p className="flex min-w-0 justify-between gap-2">
              <span className="text-white/45">long safe</span>
              <span className="hud-accent min-w-0 truncate tabular-nums">{show(d.safe, (n) => n.toLocaleString("en-US"))}</span>
            </p>
          </div>
          {wrapped && <p className="hud-muted mt-1 text-[10px]">The int went past its maximum and wrapped around.</p>}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 4: shipping label ─────────────────────────

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

export function Label({ d }: { d: Depot["label"] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Read the input and send customer, destination, weightKg and code.</Empty>;
  return (
    <div className="rounded-md border border-white/12 bg-white/[0.03] p-2.5">
      <div className="flex min-w-0 items-baseline justify-between gap-2">
        <span className="hud-value hud-accent min-w-0 truncate text-[20px] leading-none tracking-wide">{d.code ?? dash}</span>
        <span className="hud-label shrink-0">{d.weightKg === undefined ? dash : `${fmtNum(d.weightKg)} kg`}</span>
      </div>
      <dl className="mt-2.5 space-y-1.5">
        <div className="min-w-0">
          <dt className="hud-label">Customer</dt>
          <dd className="hud-value truncate text-[12px]" title={d.customer}>
            {d.customer ?? dash}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="hud-label">Deliver to</dt>
          <dd className="hud-value truncate text-[12px]" title={d.destination}>
            {d.destination ?? dash}
          </dd>
        </div>
      </dl>
      <div className="mt-2.5 border-t border-dashed border-white/15 pt-2.5">{d.code ? <Barcode text={d.code} /> : <div className="h-7 rounded-sm bg-white/[0.05]" />}</div>
      {d.extraText !== undefined && (
        <p className={`mt-2 truncate text-[10.5px] ${d.extraOk === false ? "hud-warning" : "hud-muted"}`}>
          {d.extraOk === false ? `Extra weight "${d.extraText}" is not a number: ignored` : d.extraOk === true ? `Extra weight "${d.extraText}" accepted` : `Extra: "${d.extraText}"`}
        </p>
      )}
    </div>
  );
}

// ───────────────────────── lesson 5: service rules ─────────────────────────

function Choice({ label, options, value }: { label: string; options: string[]; value: string | undefined }) {
  const all = value !== undefined && !options.includes(value) ? [...options, value] : options;
  return (
    <div>
      <p className="hud-label mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {all.map((o) => {
          const on = o === value;
          return (
            <span
              key={o}
              aria-current={on ? "true" : undefined}
              className={`inline-flex h-6 min-w-0 items-center rounded-full border px-2.5 text-[10.5px] ${
                on ? "border-[#c5ee8a]/60 bg-[#c5ee8a]/15 font-medium text-[#e0f6c1]" : "border-white/10 text-white/35"
              }`}
            >
              <span className="truncate">{o}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function Rules({ d }: { d: Depot["rules"] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Send tier, shiftName, chargeState, canDeliver and hours.</Empty>;
  return (
    <div className="space-y-2.5">
      <Choice label="Parcel tier" options={["Light", "Standard", "Heavy"]} value={d.tier} />
      <Choice label="Shift" options={["Morning", "Evening", "Night"]} value={d.shiftName} />
      <Choice label="Robot charge" options={["Charge now", "Low", "Ready"]} value={d.chargeState} />
      <Choice label="Opening hours" options={["Closed", "Half day", "Full day"]} value={d.hours} />
      <div>
        <p className="hud-label mb-1">Delivery</p>
        {d.canDeliver === undefined ? (
          <span className="hud-muted text-[11px]">{dash}</span>
        ) : (
          <span className={`hud-tag ${d.canDeliver ? "hud-accent border-[#c5ee8a]/40" : "hud-warning border-[#fbbf24]/40"}`}>
            {d.canDeliver ? "Cleared for delivery" : "Hold at the dock"}
          </span>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── lesson 6: patrol ─────────────────────────

function PatrolMap({ d }: { d: Depot["patrol"] }) {
  const grid = parseFloor(d.floorMap);
  const [step, setStep] = useState(0);
  const [fast, setFast] = useState(false);
  const [paused, setPaused] = useState(false);
  const laneLength = grid?.lane.length ?? 0;

  useEffect(() => {
    if (laneLength < 2 || paused) return;
    const t = setInterval(() => setStep((s) => (s + 1) % laneLength), fast ? 110 : 240);
    return () => clearInterval(t);
  }, [laneLength, fast, paused]);

  const replay = () => {
    setStep(0);
    setPaused(false);
  };

  const cell = grid && laneLength > 0 ? grid.lane[step % laneLength] : null;
  const trail = new Map<string, number>();
  if (grid && laneLength > 0) {
    for (let k = 0; k < Math.min(6, laneLength); k++) {
      const c = grid.lane[(step - k + laneLength * 6) % laneLength];
      trail.set(`${c.x},${c.y}`, k);
    }
  }
  return (
    <div>
      {grid ? (
        <>
          <div className="relative mx-auto" style={{ maxWidth: grid.width * 30 }} role="img" aria-label={`Floor map, ${grid.width} by ${grid.height}, ${plural(laneLength, "lane cell")}`}>
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${grid.width}, minmax(0, 1fr))` }}>
              {grid.rows.flatMap((row, y) =>
                Array.from({ length: grid.width }, (_, x) => {
                  const ch = row[x] ?? ".";
                  const lane = ch !== "." && ch !== " ";
                  const k = trail.get(`${x},${y}`);
                  return (
                    <span
                      key={`${x},${y}`}
                      className={`aspect-square rounded-[3px] ${lane ? "border border-[#c5ee8a]/25 bg-[#c5ee8a]/[0.12]" : "bg-white/[0.045]"}`}
                      style={k !== undefined ? { background: `rgba(197, 238, 138, ${0.45 - k * 0.06})` } : undefined}
                    />
                  );
                }),
              )}
            </div>
            {cell && (
              <span
                aria-hidden
                className="pointer-events-none absolute grid place-items-center transition-[left,top] duration-200 ease-linear"
                style={{ left: `${((cell.x + 0.5) / grid.width) * 100}%`, top: `${((cell.y + 0.5) / grid.height) * 100}%`, width: `${100 / grid.width}%`, height: `${100 / grid.height}%`, transform: "translate(-50%, -50%)" }}
              >
                <span className="block h-[70%] w-[70%] rounded-full bg-[#c5ee8a] shadow-[0_0_10px_2px_rgba(197,238,138,0.55)]" />
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={replay} className="inline-flex h-6 items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] px-2.5 text-[10px] font-medium text-white/80 hover:bg-white/10">
              <RotateCcw className="h-3 w-3" aria-hidden /> Replay
            </button>
            <Chip active={fast} onClick={() => setFast((f) => !f)}>
              Fast
            </Chip>
            <Chip active={paused} onClick={() => setPaused((p) => !p)}>
              {paused ? "Paused" : "Pause"}
            </Chip>
            <span className="hud-label ml-auto">
              <span className="hud-value hud-accent">{laneLength}</span> lane cells
            </span>
          </div>
        </>
      ) : (
        <Empty>No floorMap yet. Build it with nested loops and send it with Depot.Show.</Empty>
      )}
      <dl className="mt-2 grid grid-cols-3 gap-1.5">
        <Tile label="Meters" value={show(d.meters)} tone="accent" />
        <Tile label="Laps" value={show(d.lapsOnCharge)} tone="accent" />
        <Tile label="Docks" value={show(d.docksVisited)} tone="accent" />
      </dl>
    </div>
  );
}

export function Patrol({ d, generation }: { d: Depot["patrol"]; generation: number }) {
  // a fresh run restarts the walk
  return <PatrolMap key={`${generation}:${d.floorMap ?? ""}`} d={d} />;
}

// ───────────────────────── lesson 7: shelves ─────────────────────────

export function Shelves({ d }: { d: Depot["shelves"] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Send slots, queue and weights.</Empty>;
  const weights = d.weights ?? [];
  const max = Math.max(1, ...weights);
  const slots = d.slots ?? [];
  return (
    <div className="space-y-3">
      <div>
        <p className="hud-label mb-1">Shelf slots{d.filled !== undefined ? ` · ${d.filled} filled` : ""}</p>
        {slots.length === 0 ? (
          <Empty>No slots array yet.</Empty>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(3.4rem,1fr))] gap-1.5">
            {slots.slice(0, 24).map((s, i) => (
              <li
                key={i}
                className={`flex h-10 min-w-0 flex-col justify-between rounded-md px-1.5 py-1 ${s ? "border border-[#c5ee8a]/35 bg-[#c5ee8a]/10" : "border border-dashed border-white/15"}`}
                title={s ?? "empty (null)"}
              >
                <span className="hud-label text-[8.5px]">{i}</span>
                <span className={`truncate text-[10.5px] leading-none ${s ? "hud-accent" : "text-white/30"}`}>{s ?? "null"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="hud-label mb-1">Loading queue{d.queue ? ` · ${d.queue.length}` : ""}</p>
        {!d.queue ? (
          <Empty>No queue list yet.</Empty>
        ) : d.queue.length === 0 ? (
          <Empty>The queue is empty.</Empty>
        ) : (
          <ol className="flex flex-wrap items-center gap-x-1 gap-y-1">
            {d.queue.slice(0, 16).map((q, i) => (
              <li key={`${q}:${i}`} className="flex items-center gap-1">
                {i > 0 && <span className="text-white/25" aria-hidden>→</span>}
                <span className="hud-tag hud-accent max-w-[7rem] truncate">{q}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
      {weights.length > 0 && (
        <div>
          <p className="hud-label mb-1">
            Weights{d.heaviest !== undefined ? ` · heaviest ${fmtNum(d.heaviest)} kg` : ""}
            {d.totalWeight !== undefined ? ` · total ${fmtNum(d.totalWeight)} kg` : ""}
          </p>
          <ul className="flex h-[3.4rem] items-end gap-1.5">
            {weights.slice(0, 20).map((w, i) => {
              const top = w === max;
              return (
                <li key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5">
                  <span className={`hud-value text-[9.5px] ${top ? "hud-accent" : "text-white/55"}`}>{fmtNum(w)}</span>
                  <span className={`w-full rounded-t-sm ${top ? "bg-[#c5ee8a]" : "bg-[#c8c8c8]/70"}`} style={{ height: Math.max(4, Math.round((w / max) * 36)) }} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 8: stock bins ─────────────────────────

export function Stock({ d }: { d: Depot["stock"] }) {
  const [sort, setSort] = useState<"name" | "count">("name");
  if (!d.stock) return <Empty>Nothing yet. Send your dictionary with Depot.Show(&quot;stock&quot;, stock).</Empty>;
  const entries = Object.entries(d.stock);
  if (entries.length === 0) return <Empty>The dictionary is empty.</Empty>;
  const sorted = [...entries].sort((a, b) => (sort === "name" ? a[0].localeCompare(b[0]) : b[1] - a[1] || a[0].localeCompare(b[0])));
  const max = Math.max(1, ...entries.map(([, n]) => n));
  const low = new Set(d.lowStock ?? entries.filter(([, n]) => n < 6).map(([k]) => k));
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <span className="hud-label mr-auto">{plural(entries.length, "SKU")}</span>
        <Chip active={sort === "name"} onClick={() => setSort("name")}>
          A to Z
        </Chip>
        <Chip active={sort === "count"} onClick={() => setSort("count")}>
          Most stock
        </Chip>
      </div>
      <ul className="space-y-1.5">
        {sorted.slice(0, 24).map(([sku, n]) => {
          const isLow = low.has(sku);
          const out = n <= 0;
          return (
            <li key={sku} className="grid grid-cols-[4.5rem_minmax(0,1fr)_2rem_3rem] items-center gap-2">
              <span className="hud-value truncate text-[11px]" title={sku}>
                {sku}
              </span>
              <div className="hud-bar h-1.5">
                <span style={{ width: `${Math.max(n > 0 ? 3 : 0, (n / max) * 100)}%`, background: out ? "#f87171" : isLow ? "#fbbf24" : undefined }} />
              </div>
              <span className={`hud-value text-right text-[11px] tabular-nums ${out ? "hud-danger" : isLow ? "hud-warning" : "hud-accent"}`}>{fmtNum(n)}</span>
              <span className={`hud-label text-right text-[9px] ${out ? "hud-danger" : "hud-warning"}`}>{out ? "OUT" : isLow ? "LOW" : ""}</span>
            </li>
          );
        })}
      </ul>
      {entries.length > 24 && <p className="hud-label mt-1.5 text-white/35">+{entries.length - 24} more</p>}
    </div>
  );
}

// ───────────────────────── lesson 9: route planner ─────────────────────────

interface Leg {
  from: string;
  to: string;
  meters: number;
  minutes: number;
}

function parseLeg(text: string): Leg | null {
  const m = /^(.+?)\s*(?:->|→)\s*(.+?)\s*\|\s*(-?[\d.]+)\s*m\s*\|\s*(-?[\d.]+)\s*min/.exec(text);
  if (!m) return null;
  const meters = Number(m[3]);
  const minutes = Number(m[4]);
  return Number.isFinite(meters) && Number.isFinite(minutes) ? { from: m[1], to: m[2], meters, minutes } : null;
}

export function Routes({ d }: { d: Depot["routes"] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Send legs, totalMeters and totalMinutes.</Empty>;
  const parsed = (d.legs ?? []).map((t) => ({ text: t, leg: parseLeg(t) }));
  const max = Math.max(1, ...parsed.map((p) => p.leg?.meters ?? 0));
  const saved = d.totalMinutes !== undefined && d.fastMinutes !== undefined ? d.totalMinutes - d.fastMinutes : undefined;
  return (
    <div>
      {parsed.length === 0 ? (
        <Empty>No legs yet. Build string[] legs and send it.</Empty>
      ) : (
        <ol className="space-y-1.5">
          {parsed.slice(0, 12).map(({ text, leg }, i) =>
            leg ? (
              <li key={i} className="min-w-0">
                <div className="flex min-w-0 items-baseline gap-1.5 text-[11px]">
                  <span className="hud-value hud-muted w-4 shrink-0 text-[10px]">{i + 1}</span>
                  <span className="hud-value min-w-0 flex-1 truncate">
                    {leg.from} <span className="text-white/35">→</span> {leg.to}
                  </span>
                  <span className="hud-value hud-accent shrink-0 tabular-nums">{fmtNum(leg.minutes, 1)} min</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 pl-[1.375rem]">
                  <div className="hud-bar hud-bar-neutral h-1 flex-1">
                    <span style={{ width: `${(leg.meters / max) * 100}%` }} />
                  </div>
                  <span className="hud-value hud-muted w-12 shrink-0 whitespace-nowrap text-right text-[10px] tabular-nums">{fmtNum(leg.meters)} m</span>
                </div>
              </li>
            ) : (
              <li key={i} className="hud-log hud-muted truncate text-[11px]" title={text}>
                {text}
              </li>
            ),
          )}
        </ol>
      )}
      <dl className="mt-2.5 grid grid-cols-3 gap-1.5">
        <Tile label="Distance" value={show(d.totalMeters)} unit="m" tone="accent" />
        <Tile label="Walking" value={show(d.totalMinutes, (n) => fmtNum(n, 1))} unit="min" tone="accent" />
        <Tile label="Fast pace" value={show(d.fastMinutes, (n) => fmtNum(n, 1))} unit="min" tone="accent" />
      </dl>
      {saved !== undefined && saved > 0 && <p className="hud-muted mt-1.5 text-[10.5px]">A faster pace saves {fmtNum(saved, 1)} min on the route.</p>}
    </div>
  );
}

// ───────────────────────── lesson 10: parcel scanner ─────────────────────────

export function Scanner({ d }: { d: Depot["scanner"] }) {
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Nothing yet. Send scans, unclaimed and noteLength.</Empty>;
  const scans = d.scans ?? [];
  return (
    <div>
      {scans.length === 0 ? (
        <Empty>No scans yet. Build a List&lt;string&gt; scans and send it.</Empty>
      ) : (
        <ul className="space-y-1">
          {scans.slice(0, 16).map((s, i) => {
            const at = s.indexOf(":");
            const code = at >= 0 ? s.slice(0, at).trim() : s;
            const owner = at >= 0 ? s.slice(at + 1).trim() : "";
            const miss = owner === "" || /^(unclaimed|none|null|unknown)$/i.test(owner);
            return (
              <li key={i} className="grid grid-cols-[1rem_4.5rem_minmax(0,1fr)] items-center gap-2 border-t border-white/[0.06] py-1 first:border-t-0">
                <ScanBarcode className={`h-3.5 w-3.5 ${miss ? "text-[#fbbf24]" : "text-[#c5ee8a]"}`} aria-hidden />
                <span className="hud-value truncate text-[11px]">{code}</span>
                <span className={`flex min-w-0 items-center gap-1 text-[11px] ${miss ? "hud-warning" : "hud-accent"}`}>
                  {miss && <CircleHelp className="h-3 w-3 shrink-0" aria-hidden />}
                  <span className="truncate">{miss ? "unclaimed" : owner}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <dl className="mt-2 grid grid-cols-2 gap-1.5">
        <Tile label="Unclaimed" value={show(d.unclaimed)} tone={d.unclaimed ? "warning" : "accent"} />
        <Tile label="Note length" value={show(d.noteLength)} unit="chars" />
      </dl>
    </div>
  );
}

// ───────────────────────── lesson 11: fleet ─────────────────────────

function RobotTile({ r }: { r: FleetRobot }) {
  const pct = clamp(r.battery, 0, 100);
  return (
    <li className={`min-w-0 rounded-md border px-2.5 py-2 ${r.needsCharge ? "border-[#fbbf24]/35 bg-[#fbbf24]/[0.05]" : "border-white/[0.08] bg-white/[0.03]"}`}>
      <div className="flex min-w-0 items-center gap-1.5">
        <Truck className={`h-3.5 w-3.5 shrink-0 ${r.needsCharge ? "text-[#fbbf24]" : "text-[#c5ee8a]"}`} aria-hidden />
        <span className="hud-value min-w-0 flex-1 truncate text-[12px]">{r.name}</span>
        <span className={`hud-value shrink-0 text-[11px] tabular-nums ${r.needsCharge ? "hud-warning" : "hud-accent"}`}>{fmtNum(r.battery)}%</span>
      </div>
      <div className="hud-bar mt-1.5 h-1.5">
        <span style={{ width: `${pct}%`, background: r.needsCharge ? "#fbbf24" : undefined }} />
      </div>
      <p className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[10px]">
        <span className="hud-muted tabular-nums">{fmtNum(r.meters)} m driven</span>
        {r.needsCharge && <span className="hud-warning font-semibold uppercase tracking-wide">needs charge</span>}
      </p>
    </li>
  );
}

export function Fleet({ d }: { d: Depot["fleet"] }) {
  if (!d.fleet) return <Empty>Nothing yet. Make Robot objects and send the list with Depot.Show(&quot;fleet&quot;, fleet).</Empty>;
  if (d.fleet.length === 0) return <Empty>The fleet list is empty.</Empty>;
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-1.5">
      {d.fleet.slice(0, 16).map((r, i) => (
        <RobotTile key={`${r.name}:${i}`} r={r} />
      ))}
    </ul>
  );
}

// ───────────────────────── lesson 12: parcel board ─────────────────────────

const STATUS_ORDER = ["Waiting", "Loaded", "Delivered", "Lost"];

export function Parcels({ d }: { d: Depot["parcels"] }) {
  const [filter, setFilter] = useState<string | null>(null);
  if (!d.list) return <Empty>Nothing yet. Make Parcel records and send parcelList.</Empty>;
  const list: ParcelRow[] = d.list;
  const statuses = [...STATUS_ORDER, ...new Set(list.map((p) => p.status).filter((s) => !STATUS_ORDER.includes(s)))];
  const count = (s: string) => d.statusCounts?.[s] ?? list.filter((p) => p.status === s).length;
  const activeFilter = filter && statuses.includes(filter) ? filter : null;
  const shown = activeFilter ? [activeFilter] : statuses.filter((s) => s !== "Lost" || count(s) > 0 || list.some((p) => p.status === s));
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
        <Chip active={activeFilter === null} onClick={() => setFilter(null)}>
          All · {list.length}
        </Chip>
        {statuses.map((s) => (
          <Chip key={s} active={activeFilter === s} onClick={() => setFilter(activeFilter === s ? null : s)}>
            {s} · {count(s)}
          </Chip>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
        {shown.map((s) => {
          const items = list.filter((p) => p.status === s);
          return (
            <section key={s} aria-label={s} className="min-w-0">
              <h4 className="hud-label mb-1 flex items-center justify-between border-b border-white/10 pb-1">
                <span className="truncate">{s}</span>
                <span className="hud-value shrink-0">{items.length}</span>
              </h4>
              {items.length === 0 ? (
                <p className="rounded-md border border-dashed border-white/10 px-2 py-2 text-center text-[10px] text-white/30">none</p>
              ) : (
                <ul className="space-y-1">
                  {items.slice(0, 12).map((p, i) => (
                    <li key={`${p.id}:${i}`} className={`min-w-0 rounded-md px-2 py-1 ${s === "Delivered" ? "border border-[#c5ee8a]/30 bg-[#c5ee8a]/[0.07]" : s === "Lost" ? "border border-[#f87171]/30 bg-[#f87171]/[0.06]" : "bg-white/[0.045]"}`}>
                      <p className="hud-value truncate text-[11px]">{p.id}</p>
                      <p className="hud-muted truncate text-[10px]">
                        {p.destination || "?"}
                        {p.kg !== undefined ? ` · ${fmtNum(p.kg, 1)} kg` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      {d.sameValues !== undefined && (
        <p className="hud-muted mt-2 text-[10.5px]">
          Two records with equal values: <span className={d.sameValues ? "hud-accent" : "hud-warning"}>{d.sameValues ? "equal (==)" : "not equal"}</span>
        </p>
      )}
    </div>
  );
}

// ───────────────────────── lesson 13: safety log ─────────────────────────

function incidentTone(kind: string): { color: string; border: string } {
  if (/overweight|crash|error|fail/i.test(kind)) return { color: "hud-danger", border: "border-[#f87171]/30" };
  return { color: "hud-warning", border: "border-[#fbbf24]/30" };
}

export function Safety({ d }: { d: Depot["safety"] }) {
  if (!d.incidents && d.loaded === undefined) return <Empty>Nothing yet. Catch exceptions, log Incidents and send them.</Empty>;
  const incidents: Incident[] = d.incidents ?? [];
  return (
    <div>
      {incidents.length === 0 ? (
        <p className="flex items-center gap-2 rounded-md bg-white/[0.04] px-2.5 py-2 text-[11px] text-white/70">
          <span className="h-2 w-2 rounded-full bg-[#c5ee8a]" aria-hidden /> All clear: no incidents logged.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {incidents.slice(-8).map((inc, i) => {
            const tone = incidentTone(inc.kind);
            return (
              <li key={i} className={`flex min-w-0 gap-2 rounded-md border bg-white/[0.03] px-2 py-1.5 ${tone.border}`}>
                {/overweight/i.test(inc.kind) ? (
                  <OctagonAlert className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tone.color}`} aria-hidden />
                ) : (
                  <AlertTriangle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tone.color}`} aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`hud-label ${tone.color}`}>{inc.kind}</p>
                  <p className="break-words text-[11px] leading-snug text-white/80">{inc.message}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <dl className="mt-2 grid grid-cols-2 gap-1.5">
        <Tile label="Incidents" value={String(incidents.length)} tone={incidents.length ? "warning" : "accent"} />
        <Tile label="Loaded safely" value={show(d.loaded)} tone="accent" />
      </dl>
      {incidents.length > 8 && <p className="hud-label mt-1.5 text-white/35">showing the last 8 of {incidents.length}</p>}
    </div>
  );
}

// ───────────────────────── lesson 14: shift report ─────────────────────────

export function Shift({ d, allLive }: { d: Depot["shift"]; allLive: boolean }) {
  const r = d.report;
  if (!r) return <Empty>Nothing yet. Run the shift and send report.</Empty>;
  const total = (r.delivered ?? 0) + (r.rejected ?? 0);
  const eff = total > 0 ? clamp(((r.delivered ?? 0) / total) * 100, 0, 100) : 0;
  const R = 22;
  const C = 2 * Math.PI * R;
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="relative h-[60px] w-[60px] shrink-0">
          <svg viewBox="0 0 60 60" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="30" cy="30" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
            <circle cx="30" cy="30" r={R} fill="none" stroke="#c5ee8a" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(eff / 100) * C} ${C}`} />
          </svg>
          <span className="hud-value absolute inset-0 grid place-items-center text-[13px]">{total > 0 ? `${Math.round(eff)}%` : dash}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="hud-label">Depot efficiency</p>
          <p className="hud-muted text-[10.5px] leading-snug">{total > 0 ? `${r.delivered ?? 0} of ${total} orders delivered` : "No orders processed"}</p>
        </div>
      </div>
      <dl className="mt-2.5 grid grid-cols-2 gap-1.5">
        <Tile label="Delivered" value={show(r.delivered)} tone="accent" />
        <Tile label="Rejected" value={show(r.rejected)} tone={r.rejected ? "warning" : "plain"} />
        <Tile label="Revenue" value={show(r.revenue, fmtMoney)} tone="accent" />
        <Tile label="Busiest stop" value={r.busiestStop ?? dash} tone="accent" />
      </dl>
      {allLive && (
        <p className="mt-2 flex items-center gap-2 rounded-md border border-[#c5ee8a]/30 bg-[#c5ee8a]/[0.08] px-2.5 py-1.5 text-[11px] text-[#e0f6c1]">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[#c5ee8a]" aria-hidden /> All 14 systems online. Cinder Street Depot is open.
        </p>
      )}
    </div>
  );
}


"use client";

import React, { useState } from "react";
import { ArrowRight, Check, Lock, Play, TriangleAlert, X } from "lucide-react";
import {
  explainError,
  fmtNum,
  outputLines,
  plural,
  type BuildError,
  type DiagramKind,
  type DroneCard,
  type SampleCard,
  type Station,
} from "./data";
import { ROOM_ICONS } from "./diagram";

/**
 * The module readouts and the console / compiler panels of Halcyon Reef Station. Each readout draws
 * only what the learner's program sent, tolerates missing or odd values, and never throws. Lime is
 * reserved for values the learner's code made; copper is the station's hull trim; amber is caution,
 * red is failure, everything else is neutral.
 */

const ConsoleIcon = ROOM_ICONS["rs-console"];
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const dash = "—";
const show = (v: number | undefined, f: (n: number) => string = fmtNum) => (v === undefined ? dash : f(v));

// ───────────────────────── frames and primitives ─────────────────────────

export function Frame({
  id,
  title,
  meta,
  focus,
  flash,
  children,
}: {
  id: string;
  title: string;
  meta?: React.ReactNode;
  focus?: boolean;
  flash?: boolean;
  children: React.ReactNode;
}) {
  const Icon = ROOM_ICONS[id];
  return (
    <section data-panel={id} className={`hud-panel mb-3 break-inside-avoid px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""}`}>
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#c5ee8a]">{Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}</span>
        <h3 className="hud-title min-w-0 flex-1 truncate">{title}</h3>
        {meta && <span className="hud-value hud-muted shrink-0 text-[10px]">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

export function LockedPanel({ id, title, lesson, clause, spot }: { id: string; title: string; lesson: number; clause: string; spot: boolean }) {
  return (
    <section
      data-panel={id}
      data-locked=""
      className={`mb-3 break-inside-avoid rounded-[10px] border border-dashed px-3 py-2.5 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}
    >
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
        <h3 className="hud-label min-w-0 flex-1 truncate">{title}</h3>
        <span className="hud-label shrink-0 text-white/30">L{lesson}</span>
      </header>
      <div className="space-y-1.5">
        {[70, 48, 62].map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-1.5 w-5 shrink-0 rounded-sm bg-white/[0.05]" />
            <div className="h-1.5 rounded-sm bg-white/[0.05]" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
      <p className="mt-2.5 truncate font-mono text-[10px] text-white/40">
        {spot ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
        {clause}
      </p>
    </section>
  );
}

/** Unlocked, but there is no build yet (the learner has not pressed Run on this page). */
export function WaitingPanel({ id, title, lesson }: { id: string; title: string; lesson: number }) {
  return (
    <section data-panel={id} data-waiting="" className="mb-3 break-inside-avoid rounded-[10px] border border-white/10 bg-white/[0.02] px-3 py-2.5">
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <Play className="h-3 w-3 shrink-0 text-[#c5ee8a]/70" aria-hidden />
        <h3 className="hud-label min-w-0 flex-1 truncate">{title}</h3>
        <span className="hud-label shrink-0 text-white/30">L{lesson}</span>
      </header>
      <p className="truncate font-mono text-[10px] text-white/40">Working. Press Run to build and fill it in.</p>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="hud-log hud-muted py-1 text-[11px]">{children}</p>;
}

type Tone = "plain" | "accent" | "warning" | "danger";

function Tile({ label, value, tone = "plain", unit }: { label: string; value: React.ReactNode; tone?: Tone; unit?: string }) {
  const color = tone === "accent" ? "hud-accent" : tone === "warning" ? "hud-warning" : tone === "danger" ? "hud-danger" : "";
  return (
    <div className="min-w-0 rounded-md bg-white/[0.04] px-2.5 py-2">
      <dt className="hud-label truncate">{label}</dt>
      <dd className={`hud-value mt-0.5 truncate text-[14px] leading-tight tabular-nums ${value === dash ? "text-white/30" : color}`}>
        {value}
        {unit && value !== dash && <span className="hud-muted ml-1 text-[10px]">{unit}</span>}
      </dd>
    </div>
  );
}

function Pill({ tone = "plain", children }: { tone?: Tone; children: React.ReactNode }) {
  const c =
    tone === "accent"
      ? "border-[#c5ee8a]/40 text-[#d3f3a4]"
      : tone === "warning"
        ? "border-[#fbbf24]/40 text-[#fbbf24]"
        : tone === "danger"
          ? "border-[#f87171]/40 text-[#f87171]"
          : "border-white/12 text-white/70";
  return <span className={`inline-flex h-5 shrink-0 items-center rounded-full border bg-black/20 px-2 font-mono text-[10px] ${c}`}>{children}</span>;
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

function Bar({ value, max = 100, tone = "accent" }: { value: number; max?: number; tone?: Tone }) {
  const pct = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
  const fill = tone === "danger" ? "#f87171" : tone === "warning" ? "#fbbf24" : tone === "plain" ? "#c8c8c8" : "#c5ee8a";
  return (
    <div className="hud-bar">
      <span style={{ width: `${pct}%`, background: fill }} />
    </div>
  );
}

// ───────────────────────── compiler and panic messages ─────────────────────────

function ErrorDiagram({ kind }: { kind: DiagramKind }) {
  const t = { fill: "rgba(255,255,255,0.7)", fontSize: 9, fontFamily: "var(--font-mono), monospace" } as const;
  const box = { fill: "rgba(255,255,255,0.05)", stroke: "rgba(255,255,255,0.22)", rx: 5 } as const;
  return (
    <svg viewBox="0 0 320 74" className="my-2 h-[74px] w-full" role="img" aria-label={`${kind} diagram`}>
      {kind === "move" && (
        <g>
          <rect x="6" y="8" width="96" height="26" {...box} strokeDasharray="3 3" />
          <text x="54" y="25" textAnchor="middle" {...t} opacity=".55">first owner</text>
          <path d="M104 21 H190" stroke="#c5ee8a" strokeWidth="1.6" markerEnd="url(#rs-arrow)" />
          <text x="147" y="14" textAnchor="middle" {...t} fill="#c5ee8a">value moves</text>
          <rect x="192" y="8" width="122" height="26" {...box} stroke="#c5ee8a" />
          <text x="253" y="25" textAnchor="middle" {...t} fill="#d3f3a4">new owner</text>
          <path d="M54 36 C54 62 100 62 128 56" fill="none" stroke="#f87171" strokeWidth="1.6" strokeDasharray="4 3" />
          <text x="136" y="59" {...t} fill="#f87171">used here: no longer valid</text>
          <defs>
            <marker id="rs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0 0 L8 4 L0 8 Z" fill="#c5ee8a" />
            </marker>
          </defs>
        </g>
      )}
      {kind === "borrow" && (
        <g>
          <text x="6" y="16" {...t}>reader  &amp;</text>
          <rect x="70" y="8" width="170" height="12" rx="6" fill="rgba(197,238,138,0.55)" />
          <text x="6" y="46" {...t}>writer  &amp;mut</text>
          <rect x="140" y="38" width="170" height="12" rx="6" fill="rgba(240,160,112,0.65)" />
          <rect x="140" y="4" width="100" height="50" rx="4" fill="rgba(248,113,113,0.16)" stroke="#f87171" strokeDasharray="3 3" />
          <text x="190" y="68" textAnchor="middle" {...t} fill="#f87171">overlap: not allowed</text>
        </g>
      )}
      {kind === "types" && (
        <g>
          <rect x="14" y="10" width="112" height="30" {...box} stroke="#c5ee8a" />
          <text x="70" y="29" textAnchor="middle" {...t} fill="#d3f3a4">expected: one type</text>
          <text x="160" y="31" textAnchor="middle" {...t} fontSize={14} fill="#f87171">≠</text>
          <rect x="194" y="10" width="112" height="30" {...box} stroke="#f87171" />
          <text x="250" y="29" textAnchor="middle" {...t} fill="#fecaca">found: another</text>
          <text x="160" y="62" textAnchor="middle" {...t}>convert on purpose: as, to_string(), Some(..)</text>
        </g>
      )}
      {kind === "match" && (
        <g>
          {["A", "B", "C"].map((l, i) => (
            <g key={l}>
              <rect x={10 + i * 70} y="12" width="62" height="26" {...box} stroke="#c5ee8a" />
              <text x={41 + i * 70} y="29" textAnchor="middle" {...t} fill="#d3f3a4">arm {l}</text>
            </g>
          ))}
          <rect x="220" y="12" width="62" height="26" {...box} stroke="#f87171" strokeDasharray="3 3" />
          <text x="251" y="29" textAnchor="middle" {...t} fill="#f87171">no arm</text>
          <text x="150" y="62" textAnchor="middle" {...t}>every possible value needs an arm</text>
        </g>
      )}
      {kind === "scope" && (
        <g>
          <rect x="8" y="6" width="170" height="40" {...box} />
          <text x="16" y="19" {...t} opacity=".55">{"{ scope }"}</text>
          <rect x="22" y="24" width="64" height="16" rx="4" fill="rgba(197,238,138,0.25)" stroke="#c5ee8a" />
          <text x="54" y="35" textAnchor="middle" {...t} fill="#d3f3a4">value</text>
          <text x="186" y="29" {...t} fill="#f87171">dropped here</text>
          <path d="M86 32 C140 66 220 66 262 52" fill="none" stroke="#f87171" strokeWidth="1.6" strokeDasharray="4 3" />
          <text x="214" y="70" textAnchor="middle" {...t} fill="#f87171">reference outlives it</text>
        </g>
      )}
    </svg>
  );
}

/** The failure of a build or a run, explained: the rustc code, the message, the line, what it means and the usual fixes. */
export function CompilerPanel({ error }: { error: BuildError }) {
  const info = explainError(error);
  const compile = info.kind === "compile";
  const lines = error.message.split("\n").filter((l) => l.trim().length > 0);
  const headline = compile ? "Build failed" : info.kind === "panic" ? "The program panicked" : "The program stopped";
  const indexUrl = /^E\d{4}$/.test(info.code) ? `https://doc.rust-lang.org/error_codes/${info.code}.html` : null;
  return (
    <section role="alert" data-panel="rs-compiler" className="mb-3 break-inside-avoid overflow-hidden rounded-[10px] border border-[#f87171]/45 bg-[#1d0c0c]/85">
      <header className="flex min-w-0 items-center gap-2 border-b border-[#f87171]/25 bg-[#f87171]/10 px-3 py-2">
        <TriangleAlert className="hud-danger h-3.5 w-3.5 shrink-0" aria-hidden />
        <h3 className="hud-title hud-danger min-w-0 flex-1 truncate">{headline}</h3>
        {info.code && info.code !== "Panic" && <span className="hud-tag hud-danger shrink-0 border-[#f87171]/40 font-mono">{info.code}</span>}
        {error.line !== null && <span className="hud-tag hud-danger shrink-0 border-[#f87171]/40 font-mono">main.rs:{error.line}</span>}
      </header>
      <div className="px-3 py-2.5">
        <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-words rounded-md bg-black/45 px-2.5 py-2 font-mono text-[11px] leading-snug text-[#fecaca]">
          <span className="text-[#f87171]">{compile ? (info.code ? `error[${info.code}]` : "error") : "panic"}</span>
          <span className="text-white/50">: </span>
          {lines.join("\n") || "(no message)"}
          {error.line !== null && <span className="block text-white/45">{`  --> main.rs:${error.line}`}</span>}
        </pre>
        <p className="mt-2 text-[12px] font-semibold leading-snug text-[#f4f4f4]">{info.headline}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/70">{info.meaning}</p>
        {info.diagram && <ErrorDiagram kind={info.diagram} />}
        <ul className="mt-1.5 space-y-1">
          {info.fixes.map((f, i) => (
            <li key={i} className="flex min-w-0 items-start gap-1.5 text-[11px] leading-snug text-white/80">
              <ArrowRight className="mt-[2px] h-3 w-3 shrink-0 text-[#f0a070]" aria-hidden />
              <span className="min-w-0 break-words">{f}</span>
            </li>
          ))}
        </ul>
        <p className="hud-muted mt-2 flex flex-wrap items-center gap-x-3 text-[10px]">
          <span>Fix it in the editor and press Run again.</span>
          {indexUrl && (
            <a href={indexUrl} target="_blank" rel="noopener noreferrer" className="text-[#f0a070] underline-offset-2 hover:underline">
              {info.code} in the Rust error index
            </a>
          )}
        </p>
      </div>
    </section>
  );
}

// ───────────────────────── console ─────────────────────────

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
  keys: [string, unknown][];
  live: boolean;
  interactive: boolean;
  focus: boolean;
  flash: boolean;
  locked: boolean;
}) {
  const [tab, setTab] = useState<"output" | "data">("output");
  const lines = outputLines(stdout);
  const panicked = error?.type === "Panic";
  const status = !built ? "Idle" : error ? (panicked ? "Panicked" : "Build failed") : "Build OK";
  const statusTone = !built ? "text-white/45" : error ? "hud-danger border-[#f87171]/40" : "hud-accent";

  return (
    <section data-panel="rs-console" className={`hud-panel mb-3 break-inside-avoid px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""}`}>
      <header className="mb-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="shrink-0 text-[#c5ee8a]">
          <ConsoleIcon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <h3 className="hud-title min-w-0 flex-1 truncate">Control room console</h3>
        <span className={`hud-tag shrink-0 ${statusTone}`}>{status}</span>
      </header>

      {locked ? (
        <div>
          <div className="space-y-1.5">
            {[70, 45, 85, 30].map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-1.5 w-2 shrink-0 rounded-sm bg-white/[0.05]" />
                <div className="h-1.5 rounded-sm bg-white/[0.05]" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
          <p className="mt-2.5 truncate font-mono text-[10px] text-white/40">
            {focus ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
            println!(…)
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
                <p className="hud-muted">Press Run to build and run your program (2 to 6 seconds).</p>
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
                <p className="hud-muted">{live ? "No values yet. Send one with scene(\"name\", value);" : "Run your program to see what it sent to the station."}</p>
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

function safeJson(v: unknown): string {
  try {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s;
  } catch {
    return String(v);
  }
}

// ───────────────────────── readouts: chapter 1 ─────────────────────────

export function OxygenPlant({ s }: { s: Station }) {
  const d = s.oxygen;
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Send the spec sheet with scene(&quot;crew&quot;, crew); and friends.</Empty>;
  const pct = d.oxygenPct;
  const r = 30;
  const c = 2 * Math.PI * r;
  const frac = pct === undefined ? 0 : clamp(pct, 0, 100) / 100;
  const tone = pct === undefined ? "#c8c8c8" : pct < 20 ? "#f87171" : pct < 50 ? "#fbbf24" : "#c5ee8a";
  return (
    <div>
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 80 80" className="h-[78px] w-[78px] shrink-0" role="img" aria-label={`Oxygen ${pct ?? "unknown"} percent`}>
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={tone} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * frac} ${c}`} transform="rotate(-90 40 40)" />
          <text x="40" y="39" textAnchor="middle" fill="#f4f4f4" fontSize="15" fontWeight="600" fontFamily="var(--font-mono), monospace">{pct === undefined ? dash : fmtNum(pct, 1)}</text>
          <text x="40" y="52" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8">% O₂</text>
        </svg>
        <dl className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
          <Tile label="Station" value={d.station ?? dash} />
          <Tile label="Crew" value={show(d.crew)} />
          <Tile label="Depth" value={show(d.depthM)} unit="m" />
          <Tile label="Pumps" value={d.pumpsOnline === undefined ? dash : d.pumpsOnline ? "online" : "off"} tone={d.pumpsOnline ? "accent" : "warning"} />
        </dl>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {d.hatch !== undefined && <Pill>hatch {d.hatch}</Pill>}
        {d.tanks !== undefined && <Pill>{plural(d.tanks, "tank")}</Pill>}
        {d.wrappedLevel !== undefined && <Pill tone="warning">u8 250 + 10 wraps to {d.wrappedLevel}</Pill>}
        {d.cappedLevel !== undefined && <Pill tone="accent">or caps at {d.cappedLevel}</Pill>}
      </div>
    </div>
  );
}

export function PressureGauge({ s }: { s: Station }) {
  const d = s.pressure;
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Compute the pressure and send it with scene(&quot;pressureBar&quot;, pressure_bar);</Empty>;
  const bar = d.pressureBar;
  const angle = -180 + (bar === undefined ? 0 : clamp(bar, 0, 10) / 10) * 180;
  const cx = 70;
  const cy = 64;
  const rad = 50;
  const xy = (deg: number, rr: number): [number, number] => [cx + rr * Math.cos((deg * Math.PI) / 180), cy + rr * Math.sin((deg * Math.PI) / 180)];
  const pt = (deg: number, rr: number) => xy(deg, rr).join(" ");
  return (
    <div>
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 140 84" className="h-[84px] w-[140px] shrink-0" role="img" aria-label={`Pressure ${bar ?? "unknown"} bar`}>
          <path d={`M ${pt(-180, rad)} A ${rad} ${rad} 0 0 1 ${pt(0, rad)}`} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" strokeLinecap="round" />
          {bar !== undefined && <path d={`M ${pt(-180, rad)} A ${rad} ${rad} 0 0 1 ${pt(angle, rad)}`} fill="none" stroke="#c5ee8a" strokeWidth="8" strokeLinecap="round" />}
          {Array.from({ length: 11 }, (_, i) => {
            const a = -180 + i * 18;
            const [x1, y1] = xy(a, rad + 7);
            const [x2, y2] = xy(a, rad + (i % 5 === 0 ? 12 : 10));
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.35)" strokeWidth="1" />;
          })}
          <line x1={cx} y1={cy} x2={cx + (rad - 10) * Math.cos((angle * Math.PI) / 180)} y2={cy + (rad - 10) * Math.sin((angle * Math.PI) / 180)} stroke="#f0a070" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="4" fill="#f0a070" />
          <text x={cx} y={cy + 17} textAnchor="middle" fill="#f4f4f4" fontSize="13" fontWeight="600" fontFamily="var(--font-mono), monospace">{bar === undefined ? dash : `${fmtNum(bar, 2)} bar`}</text>
        </svg>
        <dl className="grid min-w-0 flex-1 grid-cols-1 gap-1.5">
          <Tile label="Dive time" value={d.hours === undefined && d.minutes === undefined ? dash : `${d.hours ?? 0} h ${d.minutes ?? 0} min`} />
          <Tile label="Air per diver" value={show(d.litresEach, (n) => fmtNum(n, 1))} unit="L" />
        </dl>
      </div>
      {(d.cutOff !== undefined || d.wrappedByte !== undefined || d.negativeWrap !== undefined) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {d.cutOff !== undefined && <Pill>3.99 as i32 = {d.cutOff}</Pill>}
          {d.wrappedByte !== undefined && <Pill tone="warning">300 as u8 = {d.wrappedByte}</Pill>}
          {d.negativeWrap !== undefined && <Pill tone="warning">-1 as u32 = {d.negativeWrap.toLocaleString("en-US")}</Pill>}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── readouts: chapter 2 ─────────────────────────

export function AirlockDesk({ s }: { s: Station }) {
  const d = s.airlock;
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Read the dive request and send it with scene(&quot;diver&quot;, &amp;diver);</Empty>;
  const badRejected = d.badText !== undefined && d.bonusDepth === 0 && !/^\s*-?\d+\s*$/.test(d.badText);
  return (
    <div className="rounded-md border border-dashed border-white/15 bg-white/[0.03] px-2.5 py-2">
      <div className="flex items-center justify-between">
        <span className="hud-label">Dive request</span>
        <Pill tone="accent">parsed</Pill>
      </div>
      <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 font-mono text-[11px]">
        <dt className="text-white/45">diver</dt>
        <dd className="hud-accent truncate">{d.diver ?? dash}</dd>
        <dt className="text-white/45">site</dt>
        <dd className="truncate text-[#f4f4f4]">{d.site ?? dash}</dd>
        <dt className="text-white/45">depth</dt>
        <dd className="text-[#f4f4f4]">{d.plannedDepth === undefined ? dash : `${d.plannedDepth} m`}</dd>
        {d.badText !== undefined && (
          <>
            <dt className="text-white/45">bonus</dt>
            <dd className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className={badRejected ? "text-white/45 line-through" : "text-[#f4f4f4]"}>&quot;{d.badText}&quot;</span>
              {badRejected ? (
                <span className="hud-danger inline-flex items-center gap-1 text-[10px]">
                  <X className="h-3 w-3" aria-hidden /> not a whole number, used {d.bonusDepth}
                </span>
              ) : (
                <span className="hud-accent inline-flex items-center gap-1 text-[10px]">
                  <Check className="h-3 w-3" aria-hidden /> {d.bonusDepth}
                </span>
              )}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}

function Lamp({ label, value, tone }: { label: string; value: string | undefined; tone: Tone }) {
  const color = tone === "accent" ? "#c5ee8a" : tone === "warning" ? "#fbbf24" : tone === "danger" ? "#f87171" : "#7dd3d8";
  return (
    <div className="min-w-0 rounded-md bg-white/[0.04] px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: value === undefined ? "#555" : color, boxShadow: value === undefined ? "none" : `0 0 8px ${color}` }} />
        <span className="hud-label truncate">{label}</span>
      </div>
      <div className={`hud-value mt-0.5 truncate text-[13px] ${value === undefined ? "text-white/30" : ""}`}>{value ?? dash}</div>
    </div>
  );
}

export function AlarmBoard({ s }: { s: Station }) {
  const d = s.alarms;
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Decide with if and match, then send zone, o2Status, watch and verdict.</Empty>;
  const zoneTone: Tone = d.zone === "deep" ? "warning" : d.zone === "mid-water" ? "accent" : "plain";
  const o2Tone: Tone = d.o2Status === "OK" ? "accent" : d.o2Status === "LOW" ? "warning" : d.o2Status === undefined ? "plain" : "danger";
  const go = d.verdict === "GO" || d.cleared === true;
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        <Lamp label="Zone" value={d.zone} tone={zoneTone} />
        <Lamp label="Oxygen" value={d.o2Status} tone={o2Tone} />
        <Lamp label="Watch" value={d.watch} tone="plain" />
      </div>
      {(d.verdict !== undefined || d.cleared !== undefined) && (
        <div
          className={`mt-2 flex items-center justify-between rounded-md border px-3 py-2 ${
            go ? "border-[#c5ee8a]/40 bg-[#c5ee8a]/10" : "border-[#f87171]/40 bg-[#f87171]/10"
          }`}
        >
          <span className="hud-label">Dive status</span>
          <span className={`font-mono text-[18px] font-semibold tracking-wide ${go ? "hud-accent" : "hud-danger"}`}>{d.verdict ?? (go ? "GO" : "NO-GO")}</span>
        </div>
      )}
    </div>
  );
}

export function BallastPumps({ s }: { s: Station }) {
  const d = s.pumps;
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Loop, count and send markersPassed, fullAfter and the leak position.</Empty>;
  const markers = d.markersPassed !== undefined ? clamp(Math.floor(d.markersPassed), 0, 12) : 0;
  const cells = 12;
  const checked = d.checked ?? 0;
  const leakIndex = d.leakRow !== undefined && d.leakSeal !== undefined && d.leakRow > 0 && d.leakSeal > 0 ? (d.leakRow - 1) * 4 + (d.leakSeal - 1) : -1;
  const cycles = d.fullAfter !== undefined ? clamp(Math.floor(d.fullAfter), 0, 14) : 0;
  return (
    <div className="space-y-2.5">
      {d.markersPassed !== undefined && (
        <div>
          <div className="hud-label mb-1">Descent shaft · {plural(d.markersPassed, "marker")} passed</div>
          <div className="flex items-center gap-1">
            {Array.from({ length: markers }, (_, i) => (
              <span key={i} className="flex flex-col items-center gap-0.5">
                <span className="h-2 w-2 rounded-full bg-[#c5ee8a]" />
                <span className="font-mono text-[9px] text-white/45">{(i + 1) * 10}</span>
              </span>
            ))}
            {markers === 0 && <span className="hud-muted text-[10px]">none yet</span>}
          </div>
        </div>
      )}
      {d.reservePct !== undefined && (
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="hud-label">Oxygen burn</span>
            <span className="hud-value text-[11px]">
              {d.hoursToReserve !== undefined ? `${d.hoursToReserve} h to ` : ""}
              {fmtNum(d.reservePct, 1)}% reserve
            </span>
          </div>
          <Bar value={d.reservePct} tone={d.reservePct < 20 ? "danger" : d.reservePct < 50 ? "warning" : "accent"} />
        </div>
      )}
      {d.fullAfter !== undefined && (
        <div>
          <div className="hud-label mb-1">Ballast tank · full after {plural(d.fullAfter, "cycle")}</div>
          <div className="flex gap-[3px]">
            {Array.from({ length: Math.max(cycles, 1) }, (_, i) => (
              <span key={i} className="h-3 flex-1 rounded-[2px] bg-[#7dd3d8]/70" style={{ opacity: 0.35 + (0.65 * (i + 1)) / Math.max(cycles, 1) }} />
            ))}
          </div>
        </div>
      )}
      {d.leakRow !== undefined && (
        <div>
          <div className="hud-label mb-1">
            Hull seals · leak at row {d.leakRow}, seal {d.leakSeal ?? dash}
            {d.checked !== undefined ? ` · ${plural(checked, "check")}` : ""}
          </div>
          <div className="grid max-w-[11rem] grid-cols-4 gap-1">
            {Array.from({ length: cells }, (_, i) => {
              const leak = i === leakIndex;
              const done = i < checked;
              return (
                <span
                  key={i}
                  className={`flex h-5 items-center justify-center rounded-[3px] border text-[9px] ${
                    leak ? "border-[#f87171]/70 bg-[#f87171]/25 text-[#fecaca]" : done ? "border-[#c5ee8a]/30 bg-[#c5ee8a]/10 text-[#c5ee8a]/70" : "border-white/10 bg-white/[0.03] text-white/25"
                  }`}
                >
                  {leak ? "!" : done ? "✓" : ""}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function SensorArray({ s }: { s: Station }) {
  const d = s.sensors;
  const readings = d.readings ?? [];
  if (readings.length === 0 && d.beacon === undefined) return <Empty>Store the readings in an array and send them with scene(&quot;readings&quot;, readings);</Empty>;
  const lo = d.lowest ?? (readings.length ? Math.min(...readings) : 0);
  const hi = d.highest ?? (readings.length ? Math.max(...readings) : 1);
  const floor = lo - Math.max(2, (hi - lo) * 0.6);
  const span = Math.max(1, hi - floor);
  const avgY = d.average !== undefined ? clamp(((d.average - floor) / span) * 100, 0, 100) : null;
  return (
    <div>
      {readings.length > 0 && (
        <div className="relative flex h-16 items-end gap-1.5 border-b border-white/10 pb-0.5">
          {readings.slice(0, 24).map((v, i) => {
            const h = clamp(((v - floor) / span) * 100, 6, 100);
            const tone = v === hi ? "bg-[#c5ee8a]" : v === lo ? "bg-[#fbbf24]" : "bg-white/35";
            return (
              <div key={i} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${v} m`}>
                <span className="mb-0.5 text-center font-mono text-[9px] text-white/55">{v}</span>
                <div className={`w-full rounded-t-[3px] ${tone}`} style={{ height: `${h * 0.7}%` }} />
              </div>
            );
          })}
          {avgY !== null && <span className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[#f0a070]/70" style={{ bottom: `${avgY * 0.7}%` }} />}
        </div>
      )}
      <dl className="mt-2 grid grid-cols-3 gap-1.5">
        <Tile label="Highest" value={show(d.highest)} unit="m" tone="accent" />
        <Tile label="Lowest" value={show(d.lowest)} unit="m" tone="warning" />
        <Tile label="Average" value={show(d.average, (n) => fmtNum(n, 2))} unit="m" />
      </dl>
      {d.beacon && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="hud-label">Beacon</span>
          {["E", "N", "m down"].map((label, i) => (
            <Pill key={label}>
              {show(d.beacon?.[i])} {label}
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── readouts: chapter 3 ─────────────────────────

export function DiveLog({ s }: { s: Station }) {
  const d = s.divelog;
  const log = d.diveLog ?? [];
  if (log.length === 0 && d.diveCount === undefined) return <Empty>Build the Vec of dives and send it with scene(&quot;diveLog&quot;, &amp;dive_log);</Empty>;
  const max = Math.max(1, ...log);
  const deepest = d.deepest ?? (log.length ? Math.max(...log) : undefined);
  return (
    <div>
      <div className="space-y-1">
        {log.slice(0, 12).map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-4 shrink-0 text-right font-mono text-[9px] text-white/35">{i + 1}</span>
            <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-[3px] bg-white/[0.05]">
              <div className="h-full rounded-[3px]" style={{ width: `${(v / max) * 100}%`, background: v === deepest ? "#c5ee8a" : "rgba(125,211,216,0.6)" }} />
            </div>
            <span className="w-9 shrink-0 text-right font-mono text-[10px] text-white/70">{v} m</span>
          </div>
        ))}
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-1.5">
        <Tile label="Dives" value={log.length ? log.length : show(d.diveCount)} />
        <Tile label="Deepest" value={show(deepest)} unit="m" tone="accent" />
        <Tile label="Shallowest" value={show(d.shallowest)} unit="m" />
      </dl>
    </div>
  );
}

export function SampleVault({ s }: { s: Station }) {
  const d = s.vault;
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Move a label into the vault and send sealedChars and stamped.</Empty>;
  const longest = Math.max(1, d.originalLen ?? 0, d.extendedLen ?? 0);
  return (
    <div className="space-y-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {d.sealedChars !== undefined && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-white/20 px-2 py-1 font-mono text-[10px] text-white/55">
            label moved in <ArrowRight className="h-3 w-3 text-[#f0a070]" aria-hidden /> vault ({d.sealedChars} bytes)
          </span>
        )}
        {d.stamped !== undefined && <span className="hud-accent min-w-0 truncate rounded-md border border-[#c5ee8a]/35 bg-[#c5ee8a]/10 px-2 py-1 font-mono text-[11px]">{d.stamped}</span>}
      </div>
      {(d.originalLen !== undefined || d.extendedLen !== undefined) && (
        <div className="space-y-1">
          <div className="hud-label">clone() makes an independent copy</div>
          {[
            ["original", d.originalLen, "#7dd3d8"],
            ["clone + 1", d.extendedLen, "#f0a070"],
          ].map(([label, n, color]) => (
            <div key={label as string} className="flex items-center gap-2">
              <span className="w-16 shrink-0 font-mono text-[10px] text-white/50">{label as string}</span>
              <div className="flex min-w-0 flex-1 gap-[2px]">
                {Array.from({ length: Math.min(Number(n ?? 0), 14) }, (_, i) => (
                  <span key={i} className="h-2.5 flex-1 rounded-[2px]" style={{ background: color as string, maxWidth: `${100 / Math.max(longest, 1)}%` }} />
                ))}
              </div>
              <span className="w-4 shrink-0 text-right font-mono text-[10px] text-white/70">{n === undefined ? dash : String(n)}</span>
            </div>
          ))}
        </div>
      )}
      {d.copiedDepth !== undefined && <Pill>Copy type: {d.copiedDepth} and {d.copiedDepth} both usable</Pill>}
    </div>
  );
}

export function TetherLine({ s }: { s: Station }) {
  const d = s.tether;
  const log = s.divelog.diveLog ?? [];
  const o2 = s.oxygen.oxygenPct;
  if (d.avgBefore === undefined && d.avgAfter === undefined) return <Empty>Borrow instead of moving: send avgBefore and avgAfter.</Empty>;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Tile label="Average before" value={show(d.avgBefore, (n) => fmtNum(n, 2))} unit="m" />
        <ArrowRight className="h-4 w-4 shrink-0 text-[#f0a070]" aria-hidden />
        <Tile label="After &mut push" value={show(d.avgAfter, (n) => fmtNum(n, 2))} unit="m" tone="accent" />
      </div>
      {log.length > 0 && <div className="hud-label">log now holds {plural(log.length, "dive")}: {log.join(", ")}</div>}
      {o2 !== undefined && (
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="hud-label">Oxygen after top_up(&amp;mut level)</span>
            <span className="hud-value text-[11px]">{fmtNum(o2, 1)}%</span>
          </div>
          <Bar value={o2} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
        <span className="rounded-md bg-[#c5ee8a]/10 px-2 py-1 text-[#d3f3a4]">&amp;T : many readers</span>
        <span className="rounded-md bg-[#f0a070]/12 px-2 py-1 text-[#f0a070]">&amp;mut T : one writer</span>
      </div>
    </div>
  );
}

export function RadioMast({ s }: { s: Station }) {
  const d = s.radio;
  if (Object.values(d).every((v) => v === undefined)) return <Empty>Slice and search the message, then send sender and wordCount.</Empty>;
  const message = d.message ?? "";
  const sender = d.sender ?? "";
  const rest = sender && message.startsWith(sender) ? message.slice(sender.length) : message;
  const bytes = d.readingBytes;
  const chars = d.readingChars;
  const widest = Math.max(1, bytes ?? 0, chars ?? 0);
  return (
    <div className="space-y-2.5">
      {d.message !== undefined && (
        <p className="rounded-md bg-black/35 px-2.5 py-2 font-mono text-[11px] leading-snug text-white/85">
          {sender && message.startsWith(sender) && <span className="hud-accent font-semibold">{sender}</span>}
          {rest}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {d.wordCount !== undefined && <Pill>{plural(d.wordCount, "word")}</Pill>}
        {d.allClear !== undefined && <Pill tone={d.allClear ? "accent" : "warning"}>{d.allClear ? "all clear" : "not clear"}</Pill>}
      </div>
      {d.shout !== undefined && <p className="truncate font-mono text-[10.5px] text-[#f0a070]" title={d.shout}>{d.shout}</p>}
      {(bytes !== undefined || chars !== undefined) && (
        <div className="space-y-1">
          <div className="hud-label">&quot;18°C&quot; in UTF-8</div>
          {[
            ["bytes", bytes, "#f0a070"],
            ["chars", chars, "#7dd3d8"],
          ].map(([label, n, color]) => (
            <div key={label as string} className="flex items-center gap-2">
              <span className="w-10 shrink-0 font-mono text-[10px] text-white/50">{label as string}</span>
              <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-[3px] bg-white/[0.05]">
                <div className="h-full rounded-[3px]" style={{ width: `${((Number(n ?? 0)) / widest) * 100}%`, background: color as string }} />
              </div>
              <span className="w-4 shrink-0 text-right font-mono text-[10px] text-white/70">{n === undefined ? dash : String(n)}</span>
            </div>
          ))}
        </div>
      )}
      {d.summary !== undefined && <p className="hud-accent truncate font-mono text-[11px]" title={d.summary}>{d.summary}</p>}
    </div>
  );
}

// ───────────────────────── readouts: chapter 4 ─────────────────────────

function DroneTile({ d }: { d: DroneCard }) {
  const low = d.battery < 20;
  return (
    <div className={`min-w-0 rounded-md border px-2.5 py-2 ${d.needsCharge || low ? "border-[#fbbf24]/35 bg-[#fbbf24]/[0.06]" : "border-white/10 bg-white/[0.04]"}`}>
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${d.active ? "bg-[#c5ee8a]" : "bg-white/30"}`} aria-hidden />
        <span className="hud-title min-w-0 flex-1 truncate">{d.name}</span>
        {(d.needsCharge || low) && <span className="hud-warning shrink-0 text-[9px] font-semibold uppercase tracking-wide">charge</span>}
      </div>
      <div className="mt-1.5">
        <Bar value={d.battery} tone={low ? "danger" : d.battery < 50 ? "warning" : "accent"} />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-white/60">
        <span>{d.battery}%</span>
        <span>{d.depthM} m</span>
      </div>
    </div>
  );
}

export function DroneBay({ s }: { s: Station }) {
  const fleet = s.drones.fleet ?? [];
  if (fleet.length === 0) return <Empty>Build Drone structs and send their cards with scene(&quot;fleet&quot;, vec![...]);</Empty>;
  return (
    <div className="grid grid-cols-2 gap-1.5 @sm:grid-cols-3">
      {fleet.slice(0, 9).map((d, i) => (
        <DroneTile key={`${d.name}:${i}`} d={d} />
      ))}
    </div>
  );
}

export function MissionOrders({ s }: { s: Station }) {
  const d = s.orders;
  const commands = d.commands ?? [];
  if (commands.length === 0 && d.pipHealth === undefined) return <Empty>Model commands as an enum and send them with scene(&quot;commands&quot;, &amp;sent);</Empty>;
  const healthTone: Tone = d.pipHealth === "Critical" ? "danger" : d.pipHealth === "Low" ? "warning" : "accent";
  return (
    <div className="space-y-2">
      <ol className="space-y-1">
        {commands.slice(0, 8).map((c, i) => (
          <li key={i} className="flex min-w-0 items-baseline gap-2">
            <span className="w-3 shrink-0 text-right font-mono text-[9px] text-white/35">{i + 1}</span>
            <code className="shrink-0 rounded bg-[#f0a070]/12 px-1.5 py-0.5 font-mono text-[10px] text-[#f0a070]">{c}</code>
            {d.reports?.[i] && <span className="min-w-0 truncate text-[10.5px] text-white/60">{d.reports[i]}</span>}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-1.5">
        {d.mantaBattery !== undefined && <Pill>Manta {d.mantaBattery}%</Pill>}
        {d.pipHealth !== undefined && <Pill tone={healthTone}>Pip health: {d.pipHealth}</Pill>}
      </div>
    </div>
  );
}

function SampleRow({ r }: { r: SampleCard }) {
  return (
    <tr className="border-t border-white/5">
      <td className="py-1 pr-2 font-mono text-[10px] text-white/45">{r.id ?? dash}</td>
      <td className="max-w-0 truncate py-1 pr-2 text-[11px] text-[#f4f4f4]">{r.name}</td>
      <td className="py-1 pr-2 text-right font-mono text-[10px] text-white/70">{r.depthM === undefined ? dash : `${r.depthM} m`}</td>
      <td className={`py-1 text-right font-mono text-[10px] ${r.weightG === undefined ? "hud-warning" : "hud-accent"}`}>{r.weightG === undefined ? "None" : `${r.weightG} g`}</td>
    </tr>
  );
}

export function SampleCatalogue({ s }: { s: Station }) {
  const d = s.catalogue;
  const rows = d.catalogue ?? [];
  if (rows.length === 0) return <Empty>List the samples and send them with scene(&quot;catalogue&quot;, cards);</Empty>;
  return (
    <div>
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="hud-label text-left">
            <th className="w-9 pb-1 font-medium">id</th>
            <th className="pb-1 font-medium">sample</th>
            <th className="w-12 pb-1 text-right font-medium">depth</th>
            <th className="w-14 pb-1 text-right font-medium">weight</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 8).map((r, i) => (
            <SampleRow key={`${r.id}:${i}`} r={r} />
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {d.totalWeightG !== undefined && <Pill tone="accent">weighed {d.totalWeightG} g</Pill>}
        {d.unweighed !== undefined && <Pill tone={d.unweighed > 0 ? "warning" : "plain"}>{d.unweighed} not weighed (None)</Pill>}
      </div>
    </div>
  );
}

export function IntakeDesk({ s }: { s: Station }) {
  const d = s.intake;
  const ok = d.intake ?? [];
  const bad = d.problems ?? [];
  if (ok.length === 0 && bad.length === 0) return <Empty>Parse each line into a Result and send intake and problems.</Empty>;
  return (
    <div className="space-y-1">
      {ok.slice(0, 6).map((r, i) => (
        <div key={`ok${i}`} className="flex min-w-0 items-center gap-2 text-[11px]">
          <Check className="h-3 w-3 shrink-0 text-[#c5ee8a]" aria-hidden />
          <span className="min-w-0 truncate text-[#f4f4f4]">
            #{r.id ?? dash} {r.name}
          </span>
          <span className="ml-auto shrink-0 font-mono text-[10px] text-white/50">{r.weightG === undefined ? "" : `${r.weightG} g`}</span>
        </div>
      ))}
      {bad.slice(0, 6).map((p, i) => (
        <div key={`bad${i}`} className="flex min-w-0 items-start gap-2 text-[10.5px]">
          <X className="mt-[1px] h-3 w-3 shrink-0 text-[#f87171]" aria-hidden />
          <span className="min-w-0 break-words font-mono text-[#fecaca]">{p}</span>
        </div>
      ))}
      <div className="flex gap-1.5 pt-1">
        <Pill tone="accent">{ok.length} accepted</Pill>
        <Pill tone={bad.length ? "danger" : "plain"}>{bad.length} rejected</Pill>
      </div>
    </div>
  );
}

export function StationReport({ s, allLive }: { s: Station; allLive: boolean }) {
  const r = s.report.report;
  const zones = s.report.zoneCounts;
  const needs = s.report.needsCharge;
  if (!r && !zones && !needs) return <Empty>Pull it all together and send the report with scene(&quot;report&quot;, Json::new()...);</Empty>;
  const order = ["shallow", "mid-water", "deep"];
  const zoneKeys = zones ? [...order.filter((k) => k in zones), ...Object.keys(zones).filter((k) => !order.includes(k))] : [];
  const zoneMax = Math.max(1, ...zoneKeys.map((k) => zones?.[k] ?? 0));
  return (
    <div className="space-y-2.5">
      {allLive && (
        <div className="hud-accent flex items-center gap-2 rounded-md border border-[#c5ee8a]/35 bg-[#c5ee8a]/10 px-2.5 py-1.5 text-[11px] font-semibold">
          <Check className="h-3.5 w-3.5" aria-hidden /> Every module of Halcyon is live
        </div>
      )}
      {r && (
        <dl className="grid grid-cols-3 gap-1.5">
          <Tile label="Dives" value={show(r.dives)} />
          <Tile label="Deepest" value={show(r.deepest)} unit="m" tone="accent" />
          <Tile label="Mean depth" value={show(r.meanDepth, (n) => fmtNum(n, 1))} unit="m" />
          <Tile label="Samples" value={show(r.samples)} />
          <Tile label="Weighed" value={show(r.weighedG)} unit="g" />
          <Tile label="Deep zone" value={show(r.deepSamples)} />
        </dl>
      )}
      {zones && zoneKeys.length > 0 && (
        <div className="space-y-1">
          <div className="hud-label">Samples per depth zone</div>
          {zoneKeys.map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-16 shrink-0 font-mono text-[10px] text-white/55">{k}</span>
              <div className="min-w-0 flex-1">
                <Bar value={zones[k] ?? 0} max={zoneMax} tone={k === "deep" ? "warning" : "accent"} />
              </div>
              <span className="w-3 shrink-0 text-right font-mono text-[10px] text-white/70">{zones[k]}</span>
            </div>
          ))}
        </div>
      )}
      {needs && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="hud-label">Drones to charge</span>
          {needs.length === 0 ? <Pill tone="accent">none</Pill> : needs.map((n) => <Pill key={n} tone="warning">{n}</Pill>)}
        </div>
      )}
    </div>
  );
}

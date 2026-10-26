"use client";

import React from "react";
import { Lock, Play } from "lucide-react";
import { clamp } from "./data";

/**
 * Shared building blocks of the Helios-1 board: panel frames, the dashed ghosts shown for
 * systems that are still locked, stat tiles and a few tiny helpers.
 */

export const CSS = `
@keyframes rc-needle { from { transform: rotate(var(--rc-from, -120deg)); } to { transform: rotate(var(--rc-to, -120deg)); } }
.rc-needle { transform-origin: 0 0; animation: rc-needle 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
@keyframes rc-flow { to { stroke-dashoffset: -14; } }
.rc-flow { stroke-dasharray: 6 8; animation: rc-flow linear infinite; }
@keyframes rc-spin { to { transform: rotate(360deg); } }
.rc-spin { transform-origin: 0 0; animation: rc-spin linear infinite; }
@keyframes rc-plasma { 0%, 100% { opacity: 0.18; } 50% { opacity: 0.4; } }
.rc-plasma { animation: rc-plasma 4.2s ease-in-out infinite; }
@keyframes rc-orbit { to { stroke-dashoffset: -120; } }
.rc-orbit { stroke-dasharray: 22 18; animation: rc-orbit 9s linear infinite; }
@keyframes rc-shimmer { 0%, 100% { opacity: 0.78; } 50% { opacity: 1; } }
.rc-shimmer { animation: rc-shimmer 3.4s ease-in-out infinite; animation-delay: calc(var(--i, 0) * 0.17s); }
@keyframes rc-scan { from { transform: translateX(-100%); opacity: 0.85; } to { transform: translateX(100%); opacity: 0; } }
.rc-scan { animation: rc-scan 1.2s ease-out both; }
@keyframes rc-blink { 50% { opacity: 0.4; } }
.rc-blink { animation: rc-blink 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .rc-needle, .rc-flow, .rc-spin, .rc-plasma, .rc-orbit, .rc-shimmer, .rc-scan, .rc-blink { animation: none !important; }
  .rc-needle { transform: rotate(var(--rc-to, -120deg)); }
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
    <section data-panel={id} className={`hud-panel flex min-w-0 flex-col px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""} ${className}`}>
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#c5ee8a]">{icon}</span>
        <h3 className="hud-title min-w-0 flex-1 truncate">{title}</h3>
        {meta && <span className="hud-value hud-muted shrink-0 text-[10px]">{meta}</span>}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

export type GhostKind = "tiles" | "rows" | "bars" | "pills" | "cards" | "columns" | "console" | "dial" | "rodgrid" | "loops" | "chain" | "tubes" | "chart" | "log";

export function Ghost({ kind }: { kind: GhostKind }) {
  const bar = "rounded-sm bg-white/[0.05]";
  const box = "rounded-md border border-dashed border-white/10";
  switch (kind) {
    case "dial":
      return (
        <svg viewBox="0 0 300 150" className="mx-auto block w-full max-w-[20rem]" aria-hidden>
          <path d="M 52 122 A 100 100 0 1 1 248 122" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="10" strokeLinecap="round" strokeDasharray="2 7" />
          <circle cx="150" cy="104" r="6" fill="rgba(255,255,255,0.12)" />
          <rect x="108" y="124" width="84" height="12" rx="4" fill="rgba(255,255,255,0.05)" />
        </svg>
      );
    case "rodgrid":
      return (
        <div className="mx-auto grid max-w-[18rem] grid-cols-6 gap-1.5">
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} className={`${box} h-9`} />
          ))}
        </div>
      );
    case "loops":
      return (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-4 w-4 shrink-0 rounded-full border border-dashed border-white/15" />
              <div className="h-6 flex-1 rounded-full border border-dashed border-white/12" />
            </div>
          ))}
        </div>
      );
    case "chain":
      return (
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <React.Fragment key={i}>
              <div className="h-5 w-5 shrink-0 rounded-full border border-dashed border-white/15" />
              {i < 4 && <div className="h-px flex-1 border-t border-dashed border-white/12" />}
            </React.Fragment>
          ))}
        </div>
      );
    case "tubes":
      return (
        <div className="flex items-start justify-around gap-2">
          {[40, 70, 25, 90].map((h, i) => (
            <div key={i} className={`${box} w-4`} style={{ height: 24 + h * 0.5 }} />
          ))}
        </div>
      );
    case "chart":
      return (
        <div className="flex h-14 items-end gap-1.5">
          {[18, 28, 38, 50, 62, 72, 84].map((h, i) => (
            <div key={i} className={`${bar} flex-1`} style={{ height: `${h}%` }} />
          ))}
        </div>
      );
    case "log":
      return (
        <div className="space-y-1.5">
          {[88, 64, 78, 52, 70].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`${bar} h-1.5 w-6 shrink-0`} />
              <div className={`${bar} h-1.5`} style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      );
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
    case "pills":
      return (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-1.5">
              {[0, 1, 2].map((j) => (
                <div key={j} className={`${box} h-5 flex-1`} />
              ))}
            </div>
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
    case "columns":
      return (
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className={`${bar} h-1.5 w-8`} />
              <div className={`${box} h-7`} />
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

export function LockedPanel({ id, title, kind, lesson, clause, spot, className = "" }: { id: string; title: string; kind: GhostKind; lesson: number; clause: string; spot: boolean; className?: string }) {
  return (
    <section
      data-panel={id}
      data-locked=""
      className={`min-w-0 rounded-[10px] border border-dashed px-3 py-2.5 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"} ${className}`}
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
export function WaitingPanel({ id, title, kind, lesson, className = "" }: { id: string; title: string; kind: GhostKind; lesson: number; className?: string }) {
  return (
    <section data-panel={id} data-waiting="" className={`min-w-0 rounded-[10px] border border-white/10 bg-white/[0.02] px-3 py-2.5 ${className}`}>
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

export type Tone = "plain" | "accent" | "warning" | "danger";
const toneClass = (t: Tone) => (t === "accent" ? "hud-accent" : t === "warning" ? "hud-warning" : t === "danger" ? "hud-danger" : "");

export function Tile({ label, value, tone = "plain", unit }: { label: string; value: React.ReactNode; tone?: Tone; unit?: string }) {
  return (
    <div className="min-w-0 rounded-md bg-white/[0.04] px-2.5 py-2">
      <dt className="hud-label truncate">{label}</dt>
      <dd className={`hud-value mt-0.5 truncate text-[15px] leading-tight tabular-nums ${value === "—" ? "text-white/30" : toneClass(tone)}`}>
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

/** A little status lamp: lime when good, red when bad, grey when unknown. */
export function Lamp({ on, bad = false, size = 8 }: { on: boolean | undefined; bad?: boolean; size?: number }) {
  const color = on === undefined ? "bg-white/25" : on ? (bad ? "bg-[#f87171]" : "bg-[#c5ee8a]") : "bg-white/20";
  const glow = on ? (bad ? "shadow-[0_0_8px_1px_rgba(248,113,113,0.55)]" : "shadow-[0_0_8px_1px_rgba(197,238,138,0.5)]") : "";
  return <span aria-hidden className={`inline-block shrink-0 rounded-full ${color} ${glow}`} style={{ width: size, height: size }} />;
}

/** Thin horizontal gauge with optional threshold ticks (as fractions of the full scale). */
export function Meter({ value, max, color, ticks = [] }: { value: number | undefined; max: number; color: string; ticks?: number[] }) {
  const pct = value === undefined || max <= 0 ? 0 : clamp((value / max) * 100, 0, 100);
  return (
    <div className="relative">
      <div className="hud-bar h-1.5">
        <span style={{ width: `${pct}%`, background: color }} />
      </div>
      {ticks.map((t) => (
        <span key={t} aria-hidden className="absolute top-[-2px] h-[10px] w-px bg-white/35" style={{ left: `${clamp(t * 100, 0, 100)}%` }} />
      ))}
    </div>
  );
}

export const dash = "—";

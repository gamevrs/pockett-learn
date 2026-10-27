"use client";

import React from "react";
import { Lock, Play } from "lucide-react";
import { FeatureIcon } from "@/components/ui/icons";

/**
 * Shared building blocks of the Corvid Peak board: panel frames, the dashed ghosts shown for
 * panels that are still locked, small tiles / pills / bars. Colour rules: lime = a value the
 * learner's code made, blue = borrowed (points into the buffer), amber = caution / conversion,
 * red = failure, everything else neutral grey.
 */

export const C = {
  lime: "#c5ee8a",
  limeSoft: "#d3f3a4",
  blue: "#8aa4ff",
  blueSoft: "#b3c3ff",
  amber: "#fbbf24",
  red: "#f87171",
  violet: "#c4a8ff",
  cream: "#fff1c2",
} as const;

export const CSS = `
@keyframes cp-twinkle { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
.cp-twinkle { animation: cp-twinkle 3.6s ease-in-out infinite; animation-delay: calc(var(--i, 0) * 0.37s); }
@keyframes cp-sweep { from { left: -12%; opacity: 0; } 15% { opacity: 1; } to { left: 100%; opacity: 0; } }
.cp-sweep { animation: cp-sweep 2.4s ease-out both; }
@keyframes cp-flow { to { stroke-dashoffset: -16; } }
.cp-flow { stroke-dasharray: 5 6; animation: cp-flow 1.6s linear infinite; }
@keyframes cp-pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.9; } }
.cp-pulse { animation: cp-pulse 2.2s ease-in-out infinite; }
@keyframes cp-beam { from { transform: translateX(0); } to { transform: translateX(var(--cp-dist, 100px)); } }
.cp-beam { animation: cp-beam 3.2s ease-in-out infinite alternate; }
@media (prefers-reduced-motion: reduce) {
  .cp-twinkle, .cp-sweep, .cp-flow, .cp-pulse, .cp-beam { animation: none !important; }
}
`;

// ───────────────────────── frames ─────────────────────────

export function Frame({
  id,
  title,
  meta,
  focus,
  flash,
  className = "",
  children,
}: {
  id: string;
  title: string;
  meta?: React.ReactNode;
  focus?: boolean;
  flash?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section data-panel={id} className={`hud-panel min-w-0 px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""} ${className}`}>
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#c5ee8a]">
          <FeatureIcon id={id} className="h-3.5 w-3.5" />
        </span>
        <h3 className="hud-title min-w-0 flex-1 truncate">{title}</h3>
        {meta && <span className="hud-value shrink-0 text-[10px] text-white/60">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

export type GhostKind = "text" | "scopes" | "pipeline" | "tree" | "cards" | "funnel" | "rows" | "stages" | "tiles" | "ruler" | "table" | "ranking" | "tests" | "strip" | "report" | "chart";

export function Ghost({ kind }: { kind: GhostKind }) {
  const bar = "rounded-sm bg-white/[0.06]";
  const box = "rounded-md border border-dashed border-white/12";
  switch (kind) {
    case "text":
      return (
        <div className="space-y-1.5">
          {[92, 70, 84, 58].map((w, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`${bar} h-1.5`} style={{ width: `${w * 0.55}%` }} />
              <div className="h-1.5 rounded-sm bg-[#8aa4ff]/15" style={{ width: `${(100 - w) * 0.6 + 8}%` }} />
            </div>
          ))}
        </div>
      );
    case "scopes":
      return (
        <div className="space-y-1.5">
          <div className={`${bar} h-2 w-full`} />
          <div className="h-2 w-[80%] rounded-sm bg-[#8aa4ff]/12" />
          <div className="ml-[30%] h-2 w-[40%] rounded-sm border border-dashed border-white/15" />
        </div>
      );
    case "pipeline":
      return (
        <div className="flex items-center gap-1.5">
          <div className={`${box} h-9 flex-[2]`} />
          <div className="h-px w-3 border-t border-dashed border-white/20" />
          <div className={`${box} h-9 flex-[2]`} />
          <div className="h-px w-3 border-t border-dashed border-white/20" />
          <div className={`${box} h-9 flex-[3]`} />
        </div>
      );
    case "tree":
      return (
        <div className="space-y-1.5">
          {[0, 1, 2, 2].map((d, i) => (
            <div key={i} className="flex items-center gap-1.5" style={{ paddingLeft: d * 14 }}>
              <div className="h-2.5 w-2.5 shrink-0 rounded-sm border border-dashed border-white/20" />
              <div className={`${bar} h-1.5`} style={{ width: `${46 - d * 8}%` }} />
            </div>
          ))}
        </div>
      );
    case "cards":
      return (
        <div className="grid grid-cols-2 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${box} p-2`}>
              <div className={`${bar} h-2 w-12`} />
              <div className={`${bar} mt-2 h-1 w-full`} />
            </div>
          ))}
        </div>
      );
    case "funnel":
      return (
        <svg viewBox="0 0 300 70" className="block w-full" aria-hidden>
          <path d="M10 8 C90 8 90 35 150 35 M10 35 C90 35 90 35 150 35 M10 62 C90 62 90 35 150 35 M150 35 C210 35 210 14 290 14 M150 35 C210 35 210 56 290 56" fill="none" stroke="rgba(255,255,255,0.14)" strokeDasharray="3 4" />
          <rect x="140" y="22" width="20" height="26" rx="4" fill="none" stroke="rgba(255,255,255,0.18)" strokeDasharray="3 3" />
        </svg>
      );
    case "rows":
      return (
        <div className="space-y-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`${bar} h-1.5 w-4 shrink-0`} />
              <div className={`${bar} h-1.5 flex-1`} />
              <div className={`${box} h-3.5 w-7 shrink-0`} />
            </div>
          ))}
        </div>
      );
    case "stages":
      return (
        <div className="space-y-1.5">
          {[100, 80, 62, 38, 22].map((w) => (
            <div key={w} className="mx-auto h-3 rounded-sm border border-dashed border-white/12" style={{ width: `${w}%` }} />
          ))}
        </div>
      );
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
    case "ruler":
      return (
        <svg viewBox="0 0 300 40" className="block w-full" aria-hidden>
          <path d="M6 28 H294" stroke="rgba(255,255,255,0.18)" />
          {Array.from({ length: 25 }, (_, i) => (
            <path key={i} d={`M${6 + i * 12} 28 v${i % 6 === 0 ? 8 : 4}`} stroke="rgba(255,255,255,0.2)" />
          ))}
          <circle cx="102" cy="14" r="3" fill="none" stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" />
          <circle cx="150" cy="10" r="3" fill="none" stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" />
        </svg>
      );
    case "table":
      return (
        <div className="space-y-1">
          {[88, 72, 80, 64].map((w, i) => (
            <div key={i} className={`${bar} h-2`} style={{ width: `${w}%` }} />
          ))}
        </div>
      );
    case "ranking":
      return (
        <div className="space-y-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`${bar} h-1.5 w-3 shrink-0`} />
              <div className={`${bar} h-1.5 w-16 shrink-0`} />
              <div className="h-1.5 rounded-full bg-white/[0.05]" style={{ width: `${70 - i * 14}%` }} />
            </div>
          ))}
        </div>
      );
    case "tests":
      return (
        <div className="space-y-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`${bar} h-1.5 w-5 shrink-0`} />
              <div className={`${bar} h-1.5 flex-1`} />
              <div className={`${box} h-3 w-6 shrink-0`} />
            </div>
          ))}
        </div>
      );
    case "strip":
      return (
        <div className="space-y-[3px]">
          {[80, 40, 60, 90, 70, 55, 85, 35].map((w, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`${bar} h-1 w-3 shrink-0`} />
              <div className={`${bar} h-1`} style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      );
    case "report":
      return (
        <div className="space-y-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between gap-6">
              <div className={`${bar} h-1.5 w-16`} />
              <div className={`${bar} h-1.5 w-10`} />
            </div>
          ))}
          <div className="flex items-end gap-1 pt-1">
            {[12, 22, 8, 28, 16, 10].map((h, i) => (
              <div key={i} className={`${bar} w-4`} style={{ height: h }} />
            ))}
          </div>
        </div>
      );
    default:
      return (
        <div className="space-y-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${bar} h-1.5 w-full`} />
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
        <Lock className="h-3 w-3 shrink-0 text-white/55" aria-hidden />
        <h3 className="hud-label min-w-0 flex-1 truncate !text-white/60">{title}</h3>
        <span className="hud-label shrink-0 !text-white/55">L{lesson}</span>
      </header>
      <Ghost kind={kind} />
      <p className="mt-2.5 truncate font-mono text-[10px] text-white/55">
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
        <Play className="h-3 w-3 shrink-0 text-[#c5ee8a]/80" aria-hidden />
        <h3 className="hud-label min-w-0 flex-1 truncate !text-white/70">{title}</h3>
        <span className="hud-label shrink-0 !text-white/55">L{lesson}</span>
      </header>
      <Ghost kind={kind} />
      <p className="mt-2.5 truncate font-mono text-[10px] text-white/60">Unlocked. Press Run to build and fill it in.</p>
    </section>
  );
}

// ───────────────────────── small parts ─────────────────────────

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="hud-log py-1 text-[11px] !text-white/60">{children}</p>;
}

export type Tone = "plain" | "accent" | "warning" | "danger" | "blue";

const TONE_TEXT: Record<Tone, string> = {
  plain: "text-[#f4f4f4]",
  accent: "text-[#d3f3a4]",
  warning: "text-[#fbbf24]",
  danger: "text-[#f87171]",
  blue: "text-[#b3c3ff]",
};

export function Tile({ label, value, tone = "plain", unit }: { label: string; value: React.ReactNode; tone?: Tone; unit?: string }) {
  const missing = value === undefined || value === null || value === "—";
  return (
    <div className="min-w-0 rounded-md bg-white/[0.04] px-2.5 py-2">
      <dt className="hud-label truncate !text-white/60">{label}</dt>
      <dd className={`hud-value mt-0.5 truncate text-[13px] leading-tight tabular-nums ${missing ? "text-white/50" : TONE_TEXT[tone]}`}>
        {missing ? "—" : value}
        {unit && !missing && <span className="ml-1 text-[10px] text-white/60">{unit}</span>}
      </dd>
    </div>
  );
}

export function Pill({ tone = "plain", children, title }: { tone?: Tone; children: React.ReactNode; title?: string }) {
  const c =
    tone === "accent"
      ? "border-[#c5ee8a]/45 text-[#d3f3a4]"
      : tone === "warning"
        ? "border-[#fbbf24]/45 text-[#fbbf24]"
        : tone === "danger"
          ? "border-[#f87171]/45 text-[#f87171]"
          : tone === "blue"
            ? "border-[#8aa4ff]/50 text-[#b3c3ff]"
            : "border-white/15 text-white/75";
  return (
    <span title={title} className={`inline-flex h-5 shrink-0 items-center rounded-full border bg-black/25 px-2 font-mono text-[10px] ${c}`}>
      {children}
    </span>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-6 shrink-0 rounded-full border px-2.5 text-[10px] font-medium transition-colors ${
        active ? "border-transparent bg-[#c5ee8a] text-[#0a0a0a]" : "border-white/15 bg-white/[0.04] text-white/75 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

export function Meter({ value, max = 100, tone = "accent" }: { value: number; max?: number; tone?: Tone }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const fill = tone === "danger" ? C.red : tone === "warning" ? C.amber : tone === "blue" ? C.blue : tone === "plain" ? "#c8c8c8" : C.lime;
  return (
    <div className="hud-bar">
      <span style={{ width: `${pct}%`, background: fill }} />
    </div>
  );
}

/** A monospace token sitting in a text line. */
export function Mono({ children, tone = "plain" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`font-mono ${TONE_TEXT[tone]}`}>{children}</span>;
}

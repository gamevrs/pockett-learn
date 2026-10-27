"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clamp, type Badge } from "./data";

/**
 * Small shared parts of the Provenance Lab board: its colour language, the badges for who owns what,
 * and the photo stepper every panel uses to walk through the photos that matter to it.
 *
 * Colour: neutral greys for structure, lime for values and owners your code produced, a cool blue-grey
 * for borrowed views, amber for caution (raw or lost), red for failures (freed, leaked, dangling).
 */

export const COL = {
  owner: "#c5ee8a",
  ownerSoft: "rgba(197,238,138,0.14)",
  borrowed: "#8fb3c9",
  borrowedSoft: "rgba(143,179,201,0.14)",
  raw: "#fbbf24",
  rawSoft: "rgba(251,191,36,0.13)",
  bad: "#f87171",
  badSoft: "rgba(248,113,113,0.13)",
  ink: "#f4f4f4",
  dim: "rgba(255,255,255,0.55)",
  faint: "rgba(255,255,255,0.32)",
  line: "rgba(255,255,255,0.10)",
} as const;

export const CSS = `
@keyframes pv-pop { 0% { transform: scale(0.96); opacity: 0.4; } 100% { transform: scale(1); opacity: 1; } }
.pv-pop { animation: pv-pop 0.35s ease-out both; }
@keyframes pv-draw { from { stroke-dashoffset: var(--pv-len, 80); } to { stroke-dashoffset: 0; } }
.pv-draw { stroke-dasharray: var(--pv-len, 80); animation: pv-draw 0.6s ease-out both; }
@keyframes pv-flash { 0%, 100% { box-shadow: 0 0 0 0 rgba(248,113,113,0); } 50% { box-shadow: 0 0 0 3px rgba(248,113,113,0.35); } }
.pv-flash { animation: pv-flash 1.4s ease-in-out 2; }
@keyframes pv-scan { from { transform: translateX(-100%); opacity: 0.85; } to { transform: translateX(100%); opacity: 0; } }
.pv-scan { animation: pv-scan 1.2s ease-out both; }
.pv-scroll::-webkit-scrollbar { height: 6px; width: 6px; }
.pv-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 999px; }
@media (prefers-reduced-motion: reduce) { .pv-pop, .pv-draw, .pv-flash, .pv-scan { animation: none !important; } }
`;

const BADGE_STYLE: Record<Badge | "moved-from" | "empty" | "lost" | "freed" | "leaked" | "two owners" | "const", { color: string; bg: string; label: string }> = {
  unique: { color: COL.owner, bg: COL.ownerSoft, label: "unique" },
  owner: { color: COL.owner, bg: COL.ownerSoft, label: "owner" },
  container: { color: COL.owner, bg: COL.ownerSoft, label: "container" },
  borrowed: { color: COL.borrowed, bg: COL.borrowedSoft, label: "borrowed" },
  raw: { color: COL.raw, bg: COL.rawSoft, label: "raw" },
  "moved-from": { color: COL.raw, bg: COL.rawSoft, label: "moved-from" },
  empty: { color: COL.dim, bg: "rgba(255,255,255,0.07)", label: "empty" },
  lost: { color: COL.dim, bg: "rgba(255,255,255,0.07)", label: "no slip here" },
  freed: { color: COL.bad, bg: COL.badSoft, label: "freed" },
  leaked: { color: COL.bad, bg: COL.badSoft, label: "never returned" },
  "two owners": { color: COL.bad, bg: COL.badSoft, label: "two owners" },
  const: { color: COL.borrowed, bg: COL.borrowedSoft, label: "const" },
};

export type BadgeName = keyof typeof BADGE_STYLE;

export function Pill({ kind, label }: { kind: BadgeName; label?: string }) {
  const s = BADGE_STYLE[kind];
  return (
    <span className="inline-flex h-[17px] shrink-0 items-center rounded-full px-1.5 text-[9.5px] font-semibold leading-none tracking-[0.02em]" style={{ color: s.color, background: s.bg, boxShadow: `inset 0 0 0 1px ${s.color}33` }}>
      {label ?? s.label}
    </span>
  );
}

/** A big counter with a label. */
export function Stat({ label, value, tone = "plain", sub }: { label: string; value: React.ReactNode; tone?: "plain" | "accent" | "bad" | "warn"; sub?: string }) {
  const color = tone === "accent" ? COL.owner : tone === "bad" ? COL.bad : tone === "warn" ? COL.raw : COL.ink;
  return (
    <div className="min-w-0 rounded-md bg-white/[0.04] px-2.5 py-2">
      <div className="hud-label truncate">{label}</div>
      <div className="hud-value mt-0.5 truncate text-[17px] leading-tight tabular-nums" style={{ color }}>
        {value}
      </div>
      {sub && <div className="hud-muted mt-0.5 truncate text-[10px]">{sub}</div>}
    </div>
  );
}

/**
 * Walks through a list of photo indices. `pick` is null while following the newest photo. Remount the
 * component (key it by the program generation) to go back to following the newest after a new run.
 */
export function useStepper(candidates: number[], home?: number) {
  const [pick, setPick] = React.useState<number | null>(null);
  const count = candidates.length;
  const start = home === undefined ? count - 1 : clamp(home, 0, Math.max(0, count - 1));
  const pos = count === 0 ? -1 : pick === null ? start : clamp(pick, 0, count - 1);
  return {
    count,
    pos,
    current: pos >= 0 ? candidates[pos] : -1,
    prev: () => setPick(Math.max(0, pos - 1)),
    next: () => setPick(Math.min(count - 1, pos + 1)),
    go: (i: number) => setPick(clamp(i, 0, Math.max(0, count - 1))),
    latest: pos === count - 1,
  };
}

export function Stepper({ step, caption }: { step: ReturnType<typeof useStepper>; caption: string }) {
  if (step.count === 0) return null;
  return (
    <div className="mb-2 flex min-w-0 items-center gap-1.5">
      <button type="button" aria-label="Previous photo" onClick={step.prev} disabled={step.pos <= 0} className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.04] text-white/70 transition-colors hover:bg-white/10 disabled:opacity-30">
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button type="button" aria-label="Next photo" onClick={step.next} disabled={step.latest} className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.04] text-white/70 transition-colors hover:bg-white/10 disabled:opacity-30">
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span className="hud-value shrink-0 text-[10px] text-white/45">
        {step.pos + 1}/{step.count}
      </span>
      <span className="hud-label min-w-0 flex-1 truncate !normal-case !tracking-normal !text-[11px] !text-white/75" title={caption}>
        {caption}
      </span>
      {step.count > 5 && (
        <input type="range" aria-label="Photo" min={0} max={step.count - 1} value={step.pos} onChange={(e) => step.go(Number(e.target.value))} className="h-1 w-20 shrink-0 cursor-pointer accent-[#c5ee8a]" />
      )}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="hud-log hud-muted py-1 text-[11px]">{children}</p>;
}

export function Mono({ children, className = "", title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <span className={`font-mono text-[10.5px] ${className}`} title={title}>
      {children}
    </span>
  );
}

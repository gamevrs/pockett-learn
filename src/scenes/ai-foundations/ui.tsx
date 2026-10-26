"use client";

/**
 * Shared building blocks for the Orchard Vision scene: panel frames (alive and locked), notes, chips,
 * gauges and the little chart helpers the panels use. Colour follows the Pockett Stage system: neutral
 * greys for structure, lime for what the learner's code produced, the three fruit hues for classes,
 * amber and red for caution.
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  Crosshair,
  Grid3x3,
  LayoutGrid,
  Lock,
  Scale,
  ScanLine,
  SlidersHorizontal,
  SlidersVertical,
  Sparkles,
  Split,
  Sprout,
  Tag,
  TrendingDown,
  TrendingUp,
  Vote,
  Workflow,
  ChartColumn,
  type LucideIcon,
} from "lucide-react";
import { BAD, LIME } from "./data.ts";

export interface PanelDef {
  id: string;
  title: string;
  lesson: number;
  clause: string;
  icon: LucideIcon;
  ghost: "bars" | "grid" | "gauge" | "chart" | "matrix";
}

export const PANELS: PanelDef[] = [
  { id: "oa-belt", title: "Sorting belt", lesson: 1, clause: "features(row) · label(row)", icon: ScanLine, ghost: "bars" },
  { id: "oa-stats", title: "Fruit statistics", lesson: 2, clause: "mean() · std() · describe()", icon: ChartColumn, ghost: "bars" },
  { id: "oa-matrix", title: "Feature matrix", lesson: 3, clause: "np.array(...) · X.mean(axis=0)", icon: Grid3x3, ghost: "grid" },
  { id: "oa-scale", title: "Normaliser", lesson: 4, clause: "(X - mean) / std", icon: SlidersHorizontal, ghost: "bars" },
  { id: "oa-neighbour", title: "Nearest neighbour", lesson: 5, clause: "distance() · argmin()", icon: Crosshair, ghost: "chart" },
  { id: "oa-knn", title: "Voting regions", lesson: 6, clause: "k nearest · majority()", icon: Vote, ghost: "chart" },
  { id: "oa-split", title: "Train / test split", lesson: 7, clause: "split_indices() · accuracy()", icon: Split, ghost: "gauge" },
  { id: "oa-confusion", title: "Confusion matrix", lesson: 8, clause: "precision() · recall()", icon: LayoutGrid, ghost: "matrix" },
  { id: "oa-line", title: "Price line", lesson: 9, clause: "w * x + b · mse()", icon: TrendingUp, ghost: "chart" },
  { id: "oa-descent", title: "Gradient descent", lesson: 10, clause: "train_line(lr, epochs)", icon: TrendingDown, ghost: "chart" },
  { id: "oa-price", title: "Price model", lesson: 11, clause: "Zb @ weights", icon: Tag, ghost: "chart" },
  { id: "oa-ripeness", title: "Ripeness model", lesson: 12, clause: "sigmoid() · log_loss()", icon: Sprout, ghost: "chart" },
  { id: "oa-threshold", title: "Decision threshold", lesson: 13, clause: "prob >= threshold", icon: SlidersVertical, ghost: "chart" },
  { id: "oa-fit", title: "Under- and overfitting", lesson: 14, clause: "fit_curve over k", icon: Scale, ghost: "chart" },
  { id: "oa-features", title: "Feature lab", lesson: 15, clause: "engineer(features)", icon: Sparkles, ghost: "bars" },
  { id: "oa-sorter", title: "Auto-sorter", lesson: 16, clause: "sort_fruit(features)", icon: Workflow, ghost: "gauge" },
];
export const PANEL = Object.fromEntries(PANELS.map((p) => [p.id, p])) as Record<string, PanelDef>;

// ───────────────────────── frames ─────────────────────────

export function PanelFrame({
  id,
  meta,
  focus,
  flash,
  children,
  className = "",
}: {
  id: string;
  meta?: React.ReactNode;
  focus?: boolean;
  flash?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const def = PANEL[id];
  const Icon = def?.icon ?? Grid3x3;
  return (
    <section data-panel={id} className={`hud-panel min-w-0 px-3 py-2.5 ${focus ? "border-[#c5ee8a]/40" : ""} ${flash ? "pop-in" : ""} ${className}`}>
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#c5ee8a]">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <h3 className="hud-title min-w-0 flex-1 truncate">{def?.title ?? id}</h3>
        {meta && <span className="hud-value hud-muted shrink-0 text-[10px]">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

function Ghost({ kind }: { kind: PanelDef["ghost"] }) {
  const bar = "rounded-sm bg-white/[0.05]";
  if (kind === "gauge")
    return (
      <div className="grid place-items-center py-1">
        <div className="h-12 w-24 rounded-t-full border border-b-0 border-dashed border-white/10" />
      </div>
    );
  if (kind === "grid" || kind === "matrix") {
    const n = kind === "matrix" ? 3 : 4;
    return (
      <div className="mx-auto grid w-3/4 gap-1" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {Array.from({ length: n * 3 }).map((_, i) => (
          <div key={i} className={`${bar} h-3`} />
        ))}
      </div>
    );
  }
  if (kind === "chart")
    return (
      <div className="relative h-16 rounded-md border border-dashed border-white/10">
        <svg viewBox="0 0 100 40" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
          <path d="M4 34 C 30 30, 50 12, 96 6" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    );
  return (
    <div className="space-y-1.5">
      {[88, 70, 54].map((w) => (
        <div key={w} className="flex items-center gap-2">
          <div className={`${bar} h-1.5 w-8 shrink-0`} />
          <div className={`${bar} h-1.5`} style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}

export function LockedPanel({ id, spot, className = "" }: { id: string; spot: boolean; className?: string }) {
  const def = PANEL[id];
  return (
    <section data-panel={id} data-locked="" className={`min-w-0 rounded-[10px] border border-dashed px-3 py-2.5 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"} ${className}`}>
      <header className="mb-2.5 flex min-w-0 items-center gap-2">
        <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
        <h3 className="hud-label min-w-0 flex-1 truncate">{def.title}</h3>
        <span className="hud-label shrink-0 text-white/30">L{def.lesson}</span>
      </header>
      <Ghost kind={def.ghost} />
      <p className="mt-2.5 truncate font-mono text-[10px] text-white/40">
        {spot ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
        {def.clause}
      </p>
    </section>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return <p className="hud-log hud-muted py-1 text-[11px]">{children}</p>;
}

/** Shown when a panel is unlocked but the function or variable it needs is missing from the file. */
export function NeedsHook({ name }: { name: string }) {
  return (
    <Note>
      Waiting for <span className="hud-warning">{name}</span> in your file. Run again once it is defined.
    </Note>
  );
}

export function Chip({ children, tone = "muted", title }: { children: React.ReactNode; tone?: "muted" | "lime" | "danger" | "warn"; title?: string }) {
  const cls =
    tone === "lime"
      ? "border-[#c5ee8a]/40 text-[#d3f3a4]"
      : tone === "danger"
        ? "border-[#f87171]/40 text-[#f87171]"
        : tone === "warn"
          ? "border-[#fbbf24]/40 text-[#fbbf24]"
          : "border-white/10 text-white/50";
  return (
    <span title={title} className={`inline-flex h-[18px] shrink-0 items-center rounded-full border px-1.5 font-mono text-[9.5px] font-medium uppercase tracking-wide ${cls}`}>
      {children}
    </span>
  );
}

export function Dot({ color, ring }: { color: string; ring?: boolean }) {
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={ring ? { border: `1.5px solid ${color}` } : { background: color }} aria-hidden />;
}

// ───────────────────────── gauges and bars ─────────────────────────

/** False while the lab is scrolled out of view or its route is hidden: timers inside panels pause. */
export const ActiveContext = createContext(true);
export const useActive = () => useContext(ActiveContext);

/** Becomes true one frame after mount, so CSS transitions can play from the empty state. */
export function useEntered() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return on;
}

export function Gauge({ value, label, sub, color = LIME, marker }: { value: number; label: string; sub?: string; color?: string; marker?: number }) {
  const on = useEntered();
  const v = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const arc = "M 8 52 A 42 42 0 0 1 92 52";
  const markerAngle = marker === undefined ? null : Math.PI * (1 - Math.min(1, Math.max(0, marker)));
  return (
    <div className="min-w-0 text-center">
      <svg viewBox="0 0 100 62" className="mx-auto block w-full max-w-[150px]" role="img" aria-label={`${label} ${(v * 100).toFixed(0)} percent`}>
        <path d={arc} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="7" strokeLinecap="round" />
        <path d={arc} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" pathLength={100} strokeDasharray="100" strokeDashoffset={on ? 100 - v * 100 : 100} style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.2,.8,.2,1)" }} />
        {markerAngle !== null && (
          <line
            x1={50 + 36 * Math.cos(markerAngle)}
            y1={52 - 36 * Math.sin(markerAngle)}
            x2={50 + 48 * Math.cos(markerAngle)}
            y2={52 - 48 * Math.sin(markerAngle)}
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        )}
        <text x="50" y="49" textAnchor="middle" className="hud-value" fill="#f4f4f4" fontSize="17" fontWeight="600">
          {(v * 100).toFixed(0)}
          <tspan fontSize="9" fill="rgba(255,255,255,0.5)">
            %
          </tspan>
        </text>
      </svg>
      <p className="hud-label -mt-0.5">{label}</p>
      {sub && <p className="hud-value hud-muted text-[10px]">{sub}</p>}
    </div>
  );
}

export function Meter({ value, color = LIME, height = 5 }: { value: number; color?: string; height?: number }) {
  const on = useEntered();
  const v = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <div className="overflow-hidden rounded-full bg-white/10" style={{ height }}>
      <div className="h-full rounded-full" style={{ width: on ? `${v * 100}%` : 0, background: color, transition: "width 0.8s cubic-bezier(.2,.8,.2,1)" }} />
    </div>
  );
}

// ───────────────────────── chart helpers ─────────────────────────

export interface Scale {
  (v: number): number;
  lo: number;
  hi: number;
}
export function scale(lo: number, hi: number, a: number, b: number): Scale {
  const span = hi - lo || 1;
  const fn = ((v: number) => a + ((v - lo) / span) * (b - a)) as Scale;
  fn.lo = lo;
  fn.hi = hi;
  return fn;
}

export function pathOf(points: [number, number][]): string {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
}

export const GRID = "rgba(255,255,255,0.07)";
export const AXIS_TEXT = "rgba(255,255,255,0.4)";

export function Axis({ x0, x1, y0, y1, xTicks, yTicks, sx, sy, fx = (v: number) => String(v), fy = (v: number) => String(v) }: {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  xTicks: number[];
  yTicks: number[];
  sx: Scale;
  sy: Scale;
  fx?: (v: number) => string;
  fy?: (v: number) => string;
}) {
  return (
    <g fontSize="8" fontFamily="var(--font-mono)" fill={AXIS_TEXT}>
      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line x1={x0} x2={x1} y1={sy(t)} y2={sy(t)} stroke={GRID} />
          <text x={x0 - 4} y={sy(t) + 3} textAnchor="end">
            {fy(t)}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <g key={`x${t}`}>
          <line x1={sx(t)} x2={sx(t)} y1={y0} y2={y1} stroke={GRID} />
          <text x={sx(t)} y={y1 + 10} textAnchor="middle">
            {fx(t)}
          </text>
        </g>
      ))}
    </g>
  );
}

export const money = (v: number) => `$${v.toFixed(2)}`;
export const signed = (v: number, d = 2) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(d)}`;
export { BAD };

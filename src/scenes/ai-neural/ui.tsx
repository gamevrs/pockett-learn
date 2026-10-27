"use client";

/**
 * Shared building blocks for the Glyph Greenhouse scene: panel frames (alive and locked), notes,
 * chips, meters, a pixel-grid canvas and a small multi-series line chart. Colour follows the Pockett
 * Stage system: neutral greys for structure, lime for what the learner's code produced, violet for
 * the opposite sign, amber and red for caution.
 */
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  Activity,
  Binary,
  CloudSun,
  Layers,
  LayoutGrid,
  Link2,
  Lock,
  Microscope,
  Network,
  PenLine,
  Shuffle,
  Sprout,
  Timer,
  Scissors,
  Shapes,
  ChartColumn,
  TrendingDown,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { BAD, LIME, NEG, POS } from "./data.ts";

export interface PanelDef {
  id: string;
  title: string;
  lesson: number;
  clause: string;
  icon: LucideIcon;
  ghost: "bars" | "grid" | "chart" | "matrix" | "net";
}

export const PANELS: PanelDef[] = [
  { id: "gn-glyphs", title: "Glyph bed", lesson: 1, clause: "make_glyphs() · split_glyphs()", icon: LayoutGrid, ghost: "grid" },
  { id: "gn-neuron", title: "One neuron", lesson: 2, clause: "neuron_sum() · fire_rates()", icon: Sprout, ghost: "bars" },
  { id: "gn-activations", title: "Activation lab", lesson: 3, clause: "relu() · sigmoid() · xor_net()", icon: Activity, ghost: "chart" },
  { id: "gn-network", title: "The network", lesson: 4, clause: "forward(X, params)", icon: Network, ghost: "net" },
  { id: "gn-softmax", title: "Softmax & loss", lesson: 5, clause: "softmax() · cross_entropy()", icon: ChartColumn, ghost: "bars" },
  { id: "gn-init", title: "Seed weights", lesson: 6, clause: "init_params(scheme)", icon: Shuffle, ghost: "grid" },
  { id: "gn-chain", title: "Chain rule graph", lesson: 7, clause: "chain_terms() · train_neuron()", icon: Link2, ghost: "chart" },
  { id: "gn-grads", title: "Gradient flow", lesson: 8, clause: "loss_and_grads(params, X, y)", icon: Waves, ghost: "bars" },
  { id: "gn-check", title: "Gradient check", lesson: 9, clause: "gradient_check()", icon: Microscope, ghost: "bars" },
  { id: "gn-training", title: "Growth curves", lesson: 10, clause: "train_full() · accuracy()", icon: TrendingDown, ghost: "chart" },
  { id: "gn-batches", title: "Batch sizes", lesson: 11, clause: "train_batches(batch_size)", icon: Layers, ghost: "bars" },
  { id: "gn-confusion", title: "Confusion matrix", lesson: 12, clause: "confusion_matrix()", icon: Binary, ghost: "matrix" },
  { id: "gn-overfit", title: "Overfitting gap", lesson: 13, clause: "train_decayed(lam)", icon: Scissors, ghost: "chart" },
  { id: "gn-schedule", title: "Learning-rate seasons", lesson: 14, clause: "step_decay() · momentum_step()", icon: CloudSun, ghost: "chart" },
  { id: "gn-validation", title: "Early stopping", lesson: 15, clause: "train_stopping()", icon: Timer, ghost: "chart" },
  { id: "gn-pad", title: "Draw pad", lesson: 16, clause: "predict(pixels)", icon: PenLine, ghost: "grid" },
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
  title,
}: {
  id: string;
  meta?: React.ReactNode;
  focus?: boolean;
  flash?: boolean;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const def = PANEL[id];
  const Icon = def?.icon ?? Shapes;
  return (
    <section data-panel={id} className={`hud-panel min-w-0 px-3 py-2.5 ${focus ? "border-[#c5ee8a]/40" : ""} ${flash ? "pop-in" : ""} ${className}`}>
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#c5ee8a]">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <h3 className="hud-title min-w-0 flex-1 truncate">{title ?? def?.title ?? id}</h3>
        {meta && <span className="hud-value shrink-0 text-[10px] text-white/60">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

function Ghost({ kind }: { kind: PanelDef["ghost"] }) {
  const bar = "rounded-sm bg-white/[0.06]";
  if (kind === "grid" || kind === "matrix") {
    const n = kind === "matrix" ? 5 : 6;
    return (
      <div className="mx-auto grid w-3/4 gap-1" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {Array.from({ length: n * 2 }).map((_, i) => (
          <div key={i} className={`${bar} h-3`} />
        ))}
      </div>
    );
  }
  if (kind === "chart" || kind === "net")
    return (
      <div className="relative h-14 rounded-md border border-dashed border-white/10">
        <svg viewBox="0 0 100 40" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
          <path d="M4 34 C 30 30, 50 12, 96 6" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
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
        <Lock className="h-3 w-3 shrink-0 text-white/50" aria-hidden />
        <h3 className="hud-label min-w-0 flex-1 truncate !text-white/60">{def.title}</h3>
        <span className="hud-label shrink-0 !text-white/50">L{def.lesson}</span>
      </header>
      <Ghost kind={def.ghost} />
      <p className="mt-2.5 truncate font-mono text-[10px] text-white/55">
        {spot ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
        {def.clause}
      </p>
    </section>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return <p className="hud-log py-1 text-[11px] !text-white/70">{children}</p>;
}

/** Shown when a panel is unlocked but the variable or function it needs is missing from the file. */
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
          : "border-white/15 text-white/65";
  return (
    <span title={title} className={`inline-flex h-[18px] shrink-0 items-center rounded-full border px-1.5 font-mono text-[9.5px] font-medium uppercase tracking-wide ${cls}`}>
      {children}
    </span>
  );
}

export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`hud-label !text-white/60 ${className}`}>{children}</span>;
}

// ───────────────────────── activity ─────────────────────────

/** False while the stage is scrolled out of view or its route is hidden: timers inside panels pause. */
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

export function Meter({ value, color = LIME, height = 5 }: { value: number; color?: string; height?: number }) {
  const on = useEntered();
  const v = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <div className="overflow-hidden rounded-full bg-white/10" style={{ height }}>
      <div className="h-full rounded-full" style={{ width: on ? `${v * 100}%` : 0, background: color, transition: "width 0.8s cubic-bezier(.2,.8,.2,1)" }} />
    </div>
  );
}

// ───────────────────────── pixel grids ─────────────────────────

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hexRgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BASE: [number, number, number] = [22, 22, 22];

/** A 10 x 10 picture on a canvas. "ink" shows pixels 0-1 as light on dark; "diverge" shows signed weights (lime positive, violet negative). */
export function PixelGrid({
  values,
  mode = "ink",
  max,
  label,
  className = "",
  size = 10,
}: {
  values: number[];
  mode?: "ink" | "diverge";
  max?: number;
  label: string;
  className?: string;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const img = ctx.createImageData(size, size);
    const m = max ?? Math.max(1e-9, ...values.map((v) => Math.abs(v)));
    const pos = hexRgb(POS);
    const neg = hexRgb(NEG);
    for (let i = 0; i < size * size; i++) {
      const v = Number.isFinite(values[i]) ? values[i] : 0;
      let r: number, g: number, b: number;
      if (mode === "ink") {
        const t = Math.min(1, Math.max(0, v));
        r = lerp(BASE[0], 244, t);
        g = lerp(BASE[1], 244, t);
        b = lerp(BASE[2], 244, t);
      } else {
        const t = Math.min(1, Math.abs(v) / m);
        const c = v >= 0 ? pos : neg;
        r = lerp(BASE[0], c[0], t);
        g = lerp(BASE[1], c[1], t);
        b = lerp(BASE[2], c[2], t);
      }
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [values, mode, max, size]);
  return <canvas ref={ref} width={size} height={size} role="img" aria-label={label} className={`block aspect-square w-full rounded-[3px] [image-rendering:pixelated] ${className}`} />;
}

// ───────────────────────── charts ─────────────────────────

export interface Series {
  values: number[];
  color: string;
  dash?: string;
  width?: number;
  label?: string;
}

export function pathOf(points: [number, number][]): string {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
}

const W = 240;
const AXIS_TEXT = "rgba(255,255,255,0.6)";
const GRID = "rgba(255,255,255,0.08)";

/** A small multi-series line chart with a labelled y axis, optional vertical markers and an optional epoch cursor. */
export function LineChart({
  series,
  height = 96,
  yMin,
  yMax,
  yTicks = 3,
  yFmt = (v: number) => v.toFixed(2),
  xFrom = 0,
  markers = [],
  cursor,
  xLabel,
  xCount,
  xEnds,
  ariaLabel,
}: {
  /** Fix the number of x positions (so a partly revealed series keeps a stable axis). */
  xCount?: number;
  /** Text for the two ends of the x axis, when they are not epoch numbers. */
  xEnds?: [string, string];
  series: Series[];
  height?: number;
  yMin?: number;
  yMax?: number;
  yTicks?: number;
  yFmt?: (v: number) => string;
  xFrom?: number;
  markers?: { x: number; label: string; color: string }[];
  cursor?: number;
  xLabel?: string;
  ariaLabel: string;
}) {
  const all = series.flatMap((s) => s.values).filter(Number.isFinite);
  if (all.length < 1) return null;
  const lo = yMin ?? Math.min(...all);
  const hi = yMax ?? Math.max(...all);
  const span = hi - lo || 1;
  const n = Math.max(xCount ?? 0, ...series.map((s) => s.values.length));
  if (n < 2) return null;
  const L = 30;
  const R = 6;
  const T = 6;
  const B = xLabel ? 18 : 12;
  const H = height;
  const sx = (i: number) => L + (n <= 1 ? 0 : (i / (n - 1)) * (W - L - R));
  const sy = (v: number) => H - B - ((v - lo) / span) * (H - B - T);
  const ticks = Array.from({ length: yTicks }, (_, i) => lo + (span * i) / (yTicks - 1));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={ariaLabel}>
      <g fontSize="8" fontFamily="var(--font-mono)" fill={AXIS_TEXT}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} stroke={GRID} />
            <text x={L - 3} y={sy(t) + 3} textAnchor="end">
              {yFmt(t)}
            </text>
          </g>
        ))}
        <text x={L} y={H - (xLabel ? 6 : 1)} textAnchor="start">
          {xEnds ? xEnds[0] : xFrom}
        </text>
        <text x={W - R} y={H - (xLabel ? 6 : 1)} textAnchor="end">
          {xEnds ? xEnds[1] : xFrom + n - 1}
        </text>
        {xLabel && (
          <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle">
            {xLabel}
          </text>
        )}
      </g>
      {markers.map((m) => (
        <g key={m.label}>
          <line x1={sx(m.x)} x2={sx(m.x)} y1={T} y2={H - B} stroke={m.color} strokeDasharray="3 3" strokeWidth="1" />
          <text x={sx(m.x) + 3} y={T + 8} fontSize="8" fontFamily="var(--font-mono)" fill={m.color}>
            {m.label}
          </text>
        </g>
      ))}
      {series.map((s, k) => (
        <path
          key={k}
          d={pathOf(s.values.map((v, i) => [sx(i), sy(Math.min(hi, Math.max(lo, v)))] as [number, number]))}
          fill="none"
          stroke={s.color}
          strokeWidth={s.width ?? 1.6}
          strokeDasharray={s.dash}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {cursor !== undefined && cursor >= 0 && cursor < n && (
        <g>
          <line x1={sx(cursor)} x2={sx(cursor)} y1={T} y2={H - B} stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
          {series.map((s, k) =>
            Number.isFinite(s.values[cursor]) ? <circle key={k} cx={sx(cursor)} cy={sy(Math.min(hi, Math.max(lo, s.values[cursor])))} r="2.6" fill={s.color} /> : null,
          )}
        </g>
      )}
    </svg>
  );
}

export function Legend({ items }: { items: { color: string; label: string; dash?: boolean }[] }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 font-mono text-[10px] text-white/70">
          <svg width="14" height="6" aria-hidden>
            <line x1="0" x2="14" y1="3" y2="3" stroke={it.color} strokeWidth="2" strokeDasharray={it.dash ? "3 2" : undefined} />
          </svg>
          {it.label}
        </span>
      ))}
    </div>
  );
}

/** A row of tab-like toggle buttons. */
export function Toggle<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={o.id === value}
          onClick={() => onChange(o.id)}
          className={`h-6 rounded-full border px-2.5 font-mono text-[10px] font-medium transition-colors ${o.id === value ? "border-transparent bg-[#c5ee8a] text-[#0a0a0a]" : "border-white/15 bg-white/[0.03] text-white/75 hover:bg-white/10"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "lime" | "danger" | "warn" }) {
  const color = tone === "lime" ? "#d3f3a4" : tone === "danger" ? BAD : tone === "warn" ? "#fbbf24" : "#f4f4f4";
  return (
    <div className="min-w-0">
      <div className="hud-label truncate !text-white/60">{label}</div>
      <div className="hud-value truncate text-[13px] leading-tight" style={{ color }}>
        {value}
      </div>
    </div>
  );
}


"use client";

import React, { useId, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, fmt, Slider } from "./ui";

/**
 * Growth chart: drag n and watch how many steps each growth rate needs. Curves can carry a
 * constant factor (e.g. "100n" vs "n²") to show that constants lose to growth in the end.
 */
export type GrowthFn = "1" | "log" | "n" | "nlogn" | "n2" | "2n";

export interface GrowthCurve {
  id: string;
  /** Legend label. Default: the Big-O name, e.g. "O(n²)". */
  label?: string;
  f: GrowthFn;
  /** Constant factor, e.g. 100 for "100n". Default 1. */
  k?: number;
}

export interface GrowthProps {
  curves?: GrowthCurve[];
  /** Largest n on the slider and the x axis. Default 64. */
  max?: number;
  initial?: number;
  /** Top of the y axis (steps). Default 4 × max. Curves above it run off the chart. */
  yMax?: number;
  /** Also show how long each would take at one step per microsecond. */
  showTime?: boolean;
  /** Extra n values offered as chips, beyond the chart (e.g. 1000, 1000000). */
  presets?: number[];
}

export interface GrowthState {
  n: number;
  counts: Record<string, number>;
}

const BIG_O: Record<GrowthFn, string> = { "1": "O(1)", log: "O(log n)", n: "O(n)", nlogn: "O(n log n)", n2: "O(n²)", "2n": "O(2ⁿ)" };
const DEFAULT: GrowthCurve[] = (["1", "log", "n", "nlogn", "n2"] as GrowthFn[]).map((f) => ({ id: f, f }));
/** Distinct, theme-safe series colours (no purple). The first is the brand lime. */
const COLORS = ["var(--brand)", "#0ea5e9", "#f59e0b", "#f43f5e", "var(--ink-2)", "#14b8a6"];

function steps(f: GrowthFn, n: number): number {
  const lg = n <= 1 ? 0 : Math.log2(n);
  switch (f) {
    case "1":
      return 1;
    case "log":
      return lg;
    case "n":
      return n;
    case "nlogn":
      return n * lg;
    case "n2":
      return n * n;
    case "2n":
      return 2 ** n;
  }
}
const countOf = (c: GrowthCurve, n: number) => (c.k ?? 1) * steps(c.f, n);

function duration(us: number): string {
  if (!Number.isFinite(us)) return "forever";
  if (us < 1000) return `${fmt(us)} µs`;
  if (us < 1e6) return `${(us / 1000).toFixed(us < 1e4 ? 1 : 0)} ms`;
  const s = us / 1e6;
  if (s < 120) return `${s.toFixed(s < 10 ? 1 : 0)} s`;
  if (s < 7200) return `${Math.round(s / 60)} min`;
  if (s < 172800) return `${Math.round(s / 3600)} h`;
  if (s < 3.15e7 * 2) return `${Math.round(s / 86400)} days`;
  return `${fmt(s / 3.15e7)} years`;
}

const W = 440;
const H = 210;
const PAD = { l: 38, r: 12, t: 10, b: 22 };

export function Growth({ props, onChange, revealed }: WidgetProps<GrowthProps>) {
  const curves = props.curves ?? DEFAULT;
  const max = props.max ?? 64;
  const [n, setN] = useState(props.initial ?? Math.max(1, Math.round(max / 4)));
  const yMax = props.yMax ?? 4 * max;
  const clipId = `dsa-growth-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const counts = Object.fromEntries(curves.map((c) => [c.id, countOf(c, n)]));

  const set = (v: number) => {
    setN(v);
    onChange?.({ n: v, counts: Object.fromEntries(curves.map((c) => [c.id, countOf(c, v)])) } satisfies GrowthState);
  };

  const x = (v: number) => PAD.l + ((v - 1) / Math.max(1, max - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (Math.min(v, yMax * 1.04) / yMax) * (H - PAD.t - PAD.b);
  const samples = Array.from({ length: 81 }, (_, i) => 1 + ((max - 1) * i) / 80);
  const cheapest = Math.min(...curves.map((c) => counts[c.id]));

  return (
    <div className="w-full min-w-0">
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Steps for each growth rate, up to n = ${max}`}>
          <defs>
            <clipPath id={clipId}>
              <rect x={PAD.l} y={PAD.t - 2} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b + 2} />
            </clipPath>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(yMax * t)} y2={y(yMax * t)} stroke="var(--line)" strokeWidth={1} />
              <text x={PAD.l - 5} y={y(yMax * t) + 3} textAnchor="end" fontSize={10} fill="var(--ink-3)" fontFamily="var(--font-mono)">
                {fmt(yMax * t)}
              </text>
            </g>
          ))}
          <text x={PAD.l} y={H - 6} fontSize={10} fill="var(--ink-3)" fontFamily="var(--font-mono)">
            1
          </text>
          <text x={W - PAD.r} y={H - 6} textAnchor="end" fontSize={10} fill="var(--ink-3)" fontFamily="var(--font-mono)">
            n = {max}
          </text>
          <g clipPath={`url(#${clipId})`}>
            {curves.map((c, ci) => (
              <polyline
                key={c.id}
                points={samples.map((s) => `${x(s).toFixed(1)},${y(countOf(c, s)).toFixed(1)}`).join(" ")}
                fill="none"
                stroke={COLORS[ci % COLORS.length]}
                strokeWidth={2.2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
          </g>
          <line x1={x(Math.min(n, max))} x2={x(Math.min(n, max))} y1={PAD.t} y2={H - PAD.b} stroke="var(--ink-3)" strokeDasharray="3 3" strokeWidth={1} />
          {curves.map((c, ci) =>
            counts[c.id] <= yMax * 1.04 && n <= max ? (
              <circle key={c.id} cx={x(n)} cy={y(counts[c.id])} r={3.6} fill={COLORS[ci % COLORS.length]} stroke="var(--surface)" strokeWidth={1.5} />
            ) : null,
          )}
        </svg>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-ink">
          n = <span className="inline-block min-w-[2.5ch]">{n > max ? fmt(n) : n}</span>
        </span>
        <Slider value={Math.min(n, max)} min={1} max={max} onChange={set} label="Input size n" disabled={revealed} />
      </div>
      {props.presets && props.presets.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ink-3">Bigger:</span>
          {props.presets.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => set(v)}
              disabled={revealed}
              aria-pressed={n === v}
              className={`min-h-10 rounded-full border px-3 font-mono text-[0.8rem] tabular-nums transition-colors ${n === v ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink hover:bg-surface-2"}`}
            >
              n = {fmt(v)}
            </button>
          ))}
        </div>
      )}

      <Caption className="mt-3">Steps at n = {fmt(n)}{n > max ? " (off the chart to the right)" : ""}</Caption>
      <div className="grid gap-1.5">
        {curves.map((c, ci) => {
          const v = counts[c.id];
          const off = v > yMax * 1.04 && n <= max;
          return (
            <div key={c.id} className={`flex min-h-10 items-center gap-2.5 rounded-lg border px-3 py-1.5 ${curves.length > 1 && v === cheapest ? "border-[var(--brand)]/50 bg-tint" : "border-line bg-surface"}`}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[ci % COLORS.length] }} aria-hidden />
              <span className="min-w-0 flex-1 truncate font-mono text-[0.8rem] text-ink-2">{c.label ?? BIG_O[c.f]}</span>
              {off && <span className="hidden text-[0.7rem] text-ink-3 min-[400px]:inline">off the chart</span>}
              <span className="text-right font-mono text-sm font-semibold tabular-nums text-ink">{fmt(v)}</span>
              {props.showTime && <span className="w-[5.5rem] text-right font-mono text-[0.75rem] tabular-nums text-ink-3">{duration(v)}</span>}
            </div>
          );
        })}
      </div>
      {props.showTime && <p className="mt-2 text-center text-[0.7rem] text-ink-3">Time assumes one step per microsecond (a million steps a second).</p>}
    </div>
  );
}

export function checkGrowth(state: unknown, goal: Record<string, unknown>) {
  const s = state as GrowthState | undefined;
  if (!s) return false;
  if (typeof goal.n === "number" && s.n !== goal.n) return false;
  if (typeof goal.nMin === "number" && s.n < goal.nMin) return false;
  if (typeof goal.nMax === "number" && s.n > goal.nMax) return false;
  if (typeof goal.cheaper === "string") {
    const a = s.counts[goal.cheaper];
    const others = typeof goal.than === "string" ? [s.counts[goal.than]] : Object.entries(s.counts).filter(([k]) => k !== goal.cheaper).map(([, v]) => v);
    if (a === undefined || others.some((o) => o === undefined || a >= o)) return false;
  }
  return true;
}

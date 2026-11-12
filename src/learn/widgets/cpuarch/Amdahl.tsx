"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Slider } from "../ai/ui";
import { Note, Readout } from "../computer/ui";
import { amdahl } from "./sim";

export interface AmdahlProps {
  /** Starting parallel share, percent. */
  parallel?: number;
  cores?: number;
  /** Highest core count on the slider. Default 64. */
  maxCores?: number;
  /** Lock the parallel share (only the cores move). */
  lockParallel?: boolean;
}

export interface AmdahlState {
  parallel: number;
  cores: number;
  speedup: number;
  limit: number;
}

/** Amdahl's law: speedup = 1 / ((1 − p) + p / n). Drag the parallel share and the core count. */
export function Amdahl({ props, onChange }: WidgetProps<AmdahlProps>) {
  const maxCores = props.maxCores ?? 64;
  const [pct, setPct] = useState(props.parallel ?? 90);
  const [cores, setCores] = useState(props.cores ?? 8);

  const make = (pc: number, n: number): AmdahlState => ({ parallel: pc, cores: n, speedup: amdahl(pc / 100, n), limit: pc >= 100 ? Infinity : 1 / (1 - pc / 100) });
  const st = make(pct, cores);
  const update = (pc: number, n: number) => {
    setPct(pc);
    setCores(n);
    onChange?.(make(pc, n));
  };

  const W = 360;
  const H = 210;
  const L = 44;
  const B = 34;
  const T = 12;
  const R = 10;
  const yMax = Math.max(4, Math.min(maxCores, Math.ceil(Math.max(st.speedup * 1.3, Math.min(st.limit, maxCores)) / 4) * 4));
  const x = (n: number) => L + ((n - 1) / (maxCores - 1)) * (W - L - R);
  const y = (v: number) => H - B - ((v - 1) / (yMax - 1)) * (H - B - T);
  const pts = Array.from({ length: maxCores }, (_, i) => `${x(i + 1).toFixed(1)},${y(amdahl(pct / 100, i + 1)).toFixed(1)}`).join(" ");
  const limY = Number.isFinite(st.limit) && st.limit <= yMax ? y(st.limit) : null;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Speedup curve. With ${pct} percent parallel code and ${cores} cores the speedup is ${st.speedup.toFixed(1)} times. The most it can ever reach is ${Number.isFinite(st.limit) ? st.limit.toFixed(0) : "unlimited"} times.`}>
        <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="var(--line-strong)" />
        <line x1={L} y1={T} x2={L} y2={H - B} stroke="var(--line-strong)" />
        {/* ideal: n times faster */}
        <polyline points={`${x(1)},${y(1)} ${x(yMax)},${y(yMax)}`} fill="none" stroke="var(--ink-3)" strokeDasharray="4 4" />
        {limY !== null && <line x1={L} y1={limY} x2={W - R} y2={limY} stroke="var(--ink-2)" strokeDasharray="2 3" />}
        <polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth={2.5} />
        <circle cx={x(cores)} cy={y(st.speedup)} r={6} fill="var(--brand)" stroke="var(--surface)" strokeWidth={2} />
        <text x={L - 6} y={H - B + 5} textAnchor="end" fontSize={14} fill="var(--ink-2)">
          1×
        </text>
        <text x={L - 6} y={T + 10} textAnchor="end" fontSize={14} fill="var(--ink-2)">
          {yMax}×
        </text>
        <text x={L} y={H - 10} fontSize={14} fill="var(--ink-2)">
          1
        </text>
        <text x={W - R} y={H - 10} textAnchor="end" fontSize={14} fill="var(--ink-2)">
          {maxCores} cores
        </text>
        {limY !== null && (
          <text x={W - R - 2} y={limY - 5} textAnchor="end" fontSize={14} fill="var(--ink)">
            limit {st.limit.toFixed(0)}×
          </text>
        )}
      </svg>
      <p className="text-center text-xs text-ink-3">Solid: speedup with your settings · dashed diagonal: the dream (n cores = n× faster)</p>
      <div className="mt-2 grid gap-x-4 sm:grid-cols-2">
        <Slider label="Share of the work that can run in parallel" value={pct} min={50} max={99} disabled={props.lockParallel} onChange={(v) => update(v, cores)} format={(v) => `${v}%`} />
        <Slider label="Cores" value={cores} min={1} max={maxCores} onChange={(v) => update(pct, v)} />
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="Speedup" value={`${st.speedup.toFixed(2)}×`} accent />
        <Readout label="Of the dream" value={`${Math.round((st.speedup / cores) * 100)}%`} />
        <Readout label="Hard limit" value={Number.isFinite(st.limit) ? `${st.limit.toFixed(0)}×` : "none"} />
      </div>
      <div className="mt-3">
        <Note>The serial part ({100 - pct}% of the original time) does not shrink however many cores you add, so it sets the ceiling.</Note>
      </div>
    </div>
  );
}

/** goal: { minSpeedup, maxSpeedup, parallel, cores, maxCores }. */
export function checkAmdahl(state: unknown, goal: Record<string, unknown>) {
  const s = state as AmdahlState | undefined;
  if (!s) return false;
  if (typeof goal.minSpeedup === "number" && s.speedup < goal.minSpeedup) return false;
  if (typeof goal.maxSpeedup === "number" && s.speedup > goal.maxSpeedup) return false;
  if (typeof goal.parallel === "number" && s.parallel !== goal.parallel) return false;
  if (typeof goal.minParallel === "number" && s.parallel < goal.minParallel) return false;
  if (typeof goal.cores === "number" && s.cores !== goal.cores) return false;
  if (typeof goal.maxCores === "number" && s.cores > goal.maxCores) return false;
  return true;
}

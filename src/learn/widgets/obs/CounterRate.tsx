"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Note, Readout, Segmented, useReport } from "./kit";

/**
 * A counter of orders placed, sampled every 10 seconds. A counter only ever goes up, except when
 * the process restarts: then it begins again at zero. Three views of the same samples: the raw
 * counter, a naive "this sample minus the last" (which goes negative at the restart), and a rate
 * that understands resets.
 */

type View = "raw" | "naive" | "rate";

// orders handled in each 10 s window; the process restarts after window 6
const WINDOWS = [28, 31, 30, 33, 29, 32, 30, 34, 31, 29, 32, 30];
const RESTART_AFTER = 6;

function samples(): number[] {
  const out: number[] = [0];
  let value = 0;
  WINDOWS.forEach((w, i) => {
    if (i === RESTART_AFTER) value = 0; // new process, new counter
    value += w;
    out.push(value);
  });
  return out;
}
const S = samples();

/** per-second change between samples, optionally treating a drop as a reset */
function perSecond(handleReset: boolean): number[] {
  return S.slice(1).map((v, i) => {
    const prev = S[i];
    const delta = v >= prev ? v - prev : handleReset ? v : v - prev;
    return delta / 10;
  });
}

export interface CounterState {
  view: View;
}

export function CounterRate({ props, onChange, revealed }: WidgetProps<{ view?: View }>) {
  const [view, setView] = useState<View>(props.view ?? "raw");
  useReport(onChange, { view } satisfies CounterState, view);

  const series = view === "raw" ? S : perSecond(view === "rate");
  const W = 360;
  const H = 170;
  const left = 38;
  const top = 12;
  const bottom = 22;
  const loV = view === "naive" ? -18 : 0;
  const hiV = view === "raw" ? 220 : 6;
  const x = (i: number, n: number) => left + (i / (n - 1)) * (W - left - 8);
  const y = (v: number) => top + (1 - (v - loV) / (hiV - loV)) * (H - top - bottom);
  const pts = series.map((v, i) => `${x(i, series.length)},${y(v)}`).join(" ");
  const ticks = view === "raw" ? [0, 100, 200] : view === "naive" ? [-15, 0, 5] : [0, 3, 6];
  const restartX = view === "raw" ? x(RESTART_AFTER + 1, series.length) : x(RESTART_AFTER, series.length);
  const avg = perSecond(true).reduce((a, b) => a + b, 0) / WINDOWS.length;
  const naiveAvg = perSecond(false).reduce((a, b) => a + b, 0) / WINDOWS.length;

  return (
    <div className="w-full max-w-2xl">
      <div className="flex justify-center">
        <Segmented
          label="How to read the counter"
          value={view}
          disabled={revealed}
          onChange={setView}
          options={[
            { id: "raw", label: "Raw counter" },
            { id: "naive", label: "Naive difference" },
            { id: "rate", label: "Rate (reset-aware)" },
          ]}
        />
      </div>
      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <p className="px-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
          {view === "raw" ? "orders_total (since the process started)" : view === "naive" ? "this sample minus the last, per second" : "orders per second"}
        </p>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Chart of ${view} view of the orders counter, with a process restart in the middle`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={left} x2={W - 6} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--line-strong)" : "var(--line)"} />
              <text x={left - 5} y={y(t) + 3} textAnchor="end" fontSize={9} fill="var(--ink-3)" fontFamily="var(--font-mono, monospace)">
                {t}
              </text>
            </g>
          ))}
          <line x1={restartX} x2={restartX} y1={top} y2={H - bottom} stroke="var(--bad)" strokeDasharray="3 3" />
          <text x={restartX + 4} y={top + 9} fontSize={9} fill="var(--bad)">
            process restarts
          </text>
          <polyline points={pts} fill="none" stroke={view === "naive" ? "var(--bad)" : "var(--brand)"} strokeWidth={2} strokeLinejoin="round" />
          {series.map((v, i) => (
            <circle key={i} cx={x(i, series.length)} cy={y(v)} r={2.4} fill={view === "naive" ? "var(--bad)" : "var(--brand)"} />
          ))}
          <text x={left} y={H - 5} fontSize={9} fill="var(--ink-3)">
            0s
          </text>
          <text x={W - 6} y={H - 5} fontSize={9} fill="var(--ink-3)" textAnchor="end">
            120s
          </text>
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2" aria-live="polite">
        <Readout label={view === "naive" ? "Average of the naive series" : "Real average rate"} value={`${(view === "naive" ? naiveAvg : avg).toFixed(2)} /s`} accent={view !== "naive"} />
      </div>
      <Note tone={view === "naive" ? "bad" : "neutral"} className="mt-2">
        {view === "raw"
          ? "The raw total climbs steadily, then falls back to zero when the server restarts. The number itself is hard to use: what you care about is how fast it grows."
          : view === "naive"
            ? "Subtracting the previous sample works until the restart, where the counter dropped by 153. That one sample claims the shop un-placed about 15 orders a second, and drags every average down."
            : "A reset-aware rate treats a drop as “started again from zero”, so the new value is the growth. The restart is invisible and the real pace, about 3 orders a second, shows through."}
      </Note>
    </div>
  );
}

/** goal: { view: "rate" } */
export function checkCounterRate(state: unknown, goal: Record<string, unknown>) {
  const s = state as CounterState | undefined;
  if (!s) return false;
  return typeof goal.view === "string" && s.view === goal.view;
}

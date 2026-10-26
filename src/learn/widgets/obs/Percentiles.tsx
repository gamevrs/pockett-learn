"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Slider, noise, useReport } from "./kit";

/**
 * 200 request latencies as a histogram on a log scale, with the mean and the 50th, 95th and 99th
 * percentiles marked. Most requests are quick; add a few very slow ones and watch which numbers
 * notice. A second slider asks how many backend calls one page makes, to show how a 1-in-100
 * slow call becomes a common experience.
 */

const N = 200;
const MIN = 50;
const MAX = 6000;
const BINS = 26;

export function latencies(slow: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < N - slow; i++) out.push(Math.round(70 + 330 * Math.pow(noise(7, i), 3)));
  for (let i = 0; i < slow; i++) out.push(Math.round(3500 + 1200 * noise(11, i)));
  return out.sort((a, b) => a - b);
}

/** nearest-rank percentile of a sorted list */
export function pct(sorted: number[], p: number): number {
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

export interface PercentilesProps {
  slow?: number;
  /** Show the "calls per page" slider. */
  fanout?: boolean;
  calls?: number;
}

export interface PercentilesState {
  slow: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  calls: number;
  pageHit: number;
}

export function Percentiles({ props, onChange, revealed }: WidgetProps<PercentilesProps>) {
  const [slow, setSlow] = useState(props.slow ?? 0);
  const [calls, setCalls] = useState(props.calls ?? 20);
  const data = latencies(slow);
  const mean = Math.round(data.reduce((a, b) => a + b, 0) / data.length);
  const p50 = pct(data, 50);
  const p95 = pct(data, 95);
  const p99 = pct(data, 99);
  const pageHit = Math.round((1 - Math.pow(0.99, calls)) * 100);
  useReport(onChange, { slow, mean, p50, p95, p99, calls, pageHit } satisfies PercentilesState, `${slow}|${calls}`);

  const W = 360;
  const H = 190;
  const left = 8;
  const right = 8;
  const top = 22;
  const bottom = 28;
  const lx = (ms: number) => left + ((Math.log(Math.max(ms, MIN)) - Math.log(MIN)) / (Math.log(MAX) - Math.log(MIN))) * (W - left - right);
  const counts = Array.from({ length: BINS }, () => 0);
  for (const v of data) {
    const b = Math.min(BINS - 1, Math.floor(((Math.log(Math.max(v, MIN)) - Math.log(MIN)) / (Math.log(MAX) - Math.log(MIN))) * BINS));
    counts[b]++;
  }
  const peak = Math.max(...counts);
  const bw = (W - left - right) / BINS;
  const bh = (c: number) => (c / peak) * (H - top - bottom);
  const marks = [
    { id: "p50", label: "p50", v: p50, color: "var(--ink)", dash: "" },
    { id: "p95", label: "p95", v: p95, color: "var(--ink-2)", dash: "" },
    { id: "p99", label: "p99", v: p99, color: "var(--bad)", dash: "" },
    { id: "mean", label: "mean", v: mean, color: "#f59e0b", dash: "4 3" },
  ];

  return (
    <div className="w-full max-w-2xl">
      <div className="grid gap-x-4 min-[560px]:grid-cols-2">
        <Slider label="Very slow requests (out of 200)" value={slow} min={0} max={10} format={(v) => `${v}`} onChange={setSlow} disabled={revealed} />
        {props.fanout && <Slider label="Backend calls one page makes" value={calls} min={1} max={60} format={(v) => `${v}`} onChange={setCalls} disabled={revealed} />}
      </div>

      <div className="mt-2 rounded-xl border border-line bg-surface p-2">
        <Caption className="px-1">Requests by how long they took (log scale, ms)</Caption>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Histogram of 200 request latencies. Mean ${mean} ms, p50 ${p50}, p95 ${p95}, p99 ${p99}.`}>
          {counts.map((c, i) => (
            <rect key={i} x={left + i * bw + 0.8} y={H - bottom - bh(c)} width={bw - 1.6} height={Math.max(bh(c), c > 0 ? 1.5 : 0)} rx={1.5} fill="var(--primary)" opacity={0.9} />
          ))}
          <line x1={left} x2={W - right} y1={H - bottom} y2={H - bottom} stroke="var(--line-strong)" />
          {[100, 300, 1000, 3000].map((t) => (
            <g key={t}>
              <line x1={lx(t)} x2={lx(t)} y1={H - bottom} y2={H - bottom + 4} stroke="var(--line-strong)" />
              <text x={lx(t)} y={H - bottom + 14} textAnchor="middle" fontSize={9} fill="var(--ink-3)" fontFamily="var(--font-mono, monospace)">
                {t >= 1000 ? `${t / 1000}s` : `${t}`}
              </text>
            </g>
          ))}
          {marks.map((m) => (
            <g key={m.id}>
              <line x1={lx(m.v)} x2={lx(m.v)} y1={top - 4} y2={H - bottom} stroke={m.color} strokeWidth={m.id === "p99" ? 2 : 1.5} strokeDasharray={m.dash} />
            </g>
          ))}
        </svg>
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 pb-1 text-[11px] text-ink-3">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-ink" /> p50</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-ink-2" /> p95</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-[var(--bad)]" /> p99</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-[repeating-linear-gradient(90deg,#f59e0b_0_4px,transparent_4px_7px)]" /> mean</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" aria-live="polite">
        <Readout label="mean" value={`${mean} ms`} />
        <Readout label="p50" value={`${p50} ms`} />
        <Readout label="p95" value={`${p95} ms`} />
        <Readout label="p99" value={`${p99} ms`} accent={p99 > 1000} />
        {props.fanout && <Readout label={`Pages hit by a p99-slow call (${calls} calls)`} value={`${pageHit}%`} />}
      </div>
      <Note className="mt-2">
        {slow === 0
          ? "With no outliers the average, the median and the high percentiles all tell the same calm story."
          : `With only ${slow} slow requests out of 200 (${slow / 2}% of traffic), the mean moves to ${mean} ms and the median hardly moves. The people stuck in the tail only show up at p99: ${p99} ms.`}
        {props.fanout && ` A page that makes ${calls} calls meets at least one call at the p99 level ${pageHit}% of the time.`}
      </Note>
    </div>
  );
}

/** goal: { minP99, maxMean } */
export function checkPercentiles(state: unknown, goal: Record<string, unknown>) {
  const s = state as PercentilesState | undefined;
  if (!s) return false;
  if (typeof goal.minP99 === "number" && s.p99 < goal.minP99) return false;
  if (typeof goal.maxMean === "number" && s.mean > goal.maxMean) return false;
  if (typeof goal.maxP99 === "number" && s.p99 > goal.maxP99) return false;
  if (typeof goal.calls === "number" && s.calls !== goal.calls) return false;
  if (typeof goal.minPageHit === "number" && s.pageHit < goal.minPageHit) return false;
  return ["minP99", "maxMean", "maxP99", "calls", "minPageHit"].some((k) => k in goal);
}

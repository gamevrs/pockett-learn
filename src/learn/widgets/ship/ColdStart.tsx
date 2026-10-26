"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Note, Readout, Segmented, Slider, useReport } from "./kit";

/**
 * Eighteen requests hit a serverless function over two minutes: a burst, a trickle, a long quiet
 * gap, a bigger burst, then two stragglers. An instance handles one request at a time, is kept
 * warm for a while after its last request, and a request that finds no free warm instance waits
 * for a new one to start (a cold start). Bars show each request's wait (amber) plus its real work
 * (lime).
 */

type Runtime = "tiny" | "node" | "heavy";
const RUNTIMES: Record<Runtime, { label: string; baseMs: number; perMb: number }> = {
  tiny: { label: "Tiny binary", baseMs: 40, perMb: 2 },
  node: { label: "Typical Node app", baseMs: 180, perMb: 4 },
  heavy: { label: "Heavy framework", baseMs: 1400, perMb: 6 },
};
const HANDLER_MS = 120;
const ARRIVALS = [0, 0.2, 0.4, 3, 5, 7, 9, 11, 13, 15, 75, 75.1, 75.2, 75.3, 75.4, 75.5, 100, 118];

interface Req {
  t: number;
  cold: boolean;
  init: number;
  total: number;
}

export function simulateCold(runtime: Runtime, packageMb: number, idleSecs: number, minWarm: number): Req[] {
  const init = Math.round(RUNTIMES[runtime].baseMs + RUNTIMES[runtime].perMb * packageMb);
  const pool: { freeAt: number; last: number; pinned: boolean }[] = Array.from({ length: minWarm }, () => ({ freeAt: -1e9, last: -1e9, pinned: true }));
  return ARRIVALS.map((t) => {
    const warm = pool.find((p) => p.freeAt <= t && (p.pinned || t - p.last <= idleSecs));
    if (warm) {
      warm.freeAt = t + HANDLER_MS / 1000;
      warm.last = warm.freeAt;
      return { t, cold: false, init: 0, total: HANDLER_MS };
    }
    const total = init + HANDLER_MS;
    pool.push({ freeAt: t + total / 1000, last: t + total / 1000, pinned: false });
    return { t, cold: true, init, total };
  });
}

export interface ColdStartProps {
  runtime?: Runtime;
  packageMb?: number;
  idle?: number;
  minWarm?: number;
  lock?: ("runtime" | "packageMb" | "idle" | "minWarm")[];
}

export interface ColdStartState {
  runtime: Runtime;
  packageMb: number;
  minWarm: number;
  cold: number;
  worst: number;
  p50: number;
}

export function ColdStart({ props, onChange, revealed }: WidgetProps<ColdStartProps>) {
  const [runtime, setRuntime] = useState<Runtime>(props.runtime ?? "node");
  const [packageMb, setPackageMb] = useState(props.packageMb ?? 60);
  const [idle, setIdle] = useState(props.idle ?? 30);
  const [minWarm, setMinWarm] = useState(props.minWarm ?? 0);
  const reqs = simulateCold(runtime, packageMb, idle, minWarm);
  const cold = reqs.filter((r) => r.cold).length;
  const sorted = reqs.map((r) => r.total).sort((a, b) => a - b);
  const worst = sorted[sorted.length - 1];
  const p50 = sorted[Math.ceil(sorted.length / 2) - 1];
  const locked = (k: NonNullable<ColdStartProps["lock"]>[number]) => revealed || Boolean(props.lock?.includes(k));
  useReport(onChange, { runtime, packageMb, minWarm, cold, worst, p50 } satisfies ColdStartState, `${runtime}|${packageMb}|${idle}|${minWarm}`);

  // chart
  const W = 360;
  const H = 176;
  const left = 34;
  const top = 10;
  const bottom = 34;
  const plotH = H - top - bottom;
  const niceMax = (v: number) => {
    const steps = [150, 300, 600, 1000, 1500, 2000, 3000, 4000, 6000];
    return steps.find((s) => s >= v) ?? Math.ceil(v / 1000) * 1000;
  };
  const yMax = niceMax(worst);
  const bw = (W - left - 6) / reqs.length;
  const y = (ms: number) => top + plotH - (ms / yMax) * plotH;
  const labelAt = reqs.map((r, i) => (i === 0 || r.t - reqs[i - 1].t > 5 ? i : -1)).filter((i) => i >= 0);

  return (
    <div className="w-full max-w-2xl">
      <div className="flex justify-center">
        <Segmented
          label="What kind of app is in the function"
          value={runtime}
          disabled={locked("runtime")}
          onChange={setRuntime}
          options={(Object.keys(RUNTIMES) as Runtime[]).map((id) => ({ id, label: RUNTIMES[id].label }))}
        />
      </div>
      <div className="mt-2 grid gap-x-4 min-[560px]:grid-cols-3">
        <Slider label="Package size" value={packageMb} min={5} max={250} step={5} format={(v) => `${v} MB`} onChange={setPackageMb} disabled={locked("packageMb")} />
        <Slider label="Kept warm after use" value={idle} min={10} max={60} step={5} format={(v) => `${v}s`} onChange={setIdle} disabled={locked("idle")} />
        <Slider label="Always-warm instances" value={minWarm} min={0} max={6} format={(v) => `${v}`} onChange={setMinWarm} disabled={locked("minWarm")} />
      </div>

      <div className="mt-2 rounded-xl border border-line bg-surface p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Latency of 18 requests: ${cold} cold starts, worst ${worst} milliseconds`}>
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={left} x2={W - 4} y1={y(yMax * f)} y2={y(yMax * f)} stroke="var(--line)" strokeWidth={1} />
              <text x={left - 4} y={y(yMax * f) + 3} textAnchor="end" fontSize={9} fill="var(--ink-3)" fontFamily="var(--font-mono, monospace)">
                {Math.round(yMax * f)}
              </text>
            </g>
          ))}
          {reqs.map((r, i) => {
            const x = left + i * bw + 1.5;
            const w = Math.max(bw - 3, 3);
            return (
              <g key={i}>
                <rect x={x} y={y(HANDLER_MS)} width={w} height={Math.max(top + plotH - y(HANDLER_MS), 1)} rx={1.5} fill="var(--primary)" />
                {r.cold && <rect x={x} y={y(r.total)} width={w} height={Math.max(y(HANDLER_MS) - y(r.total), 1)} rx={1.5} fill="#f59e0b" />}
                {labelAt.includes(i) && (
                  <text x={x} y={H - bottom + 12 + (labelAt.indexOf(i) % 2) * 11} fontSize={9} fill="var(--ink-3)" fontFamily="var(--font-mono, monospace)">
                    {Math.round(r.t)}s
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <p className="px-1 text-[11px] text-ink-3">Each bar is one request, left to right in order of arrival (labels: seconds since the start). Height is milliseconds.</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 pb-1 pt-1 text-[11px] text-ink-3">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-primary" /> your handler ({HANDLER_MS} ms)</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#f59e0b]" /> waiting for a cold start</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" aria-live="polite">
        <Readout label="Cold starts" value={`${cold} of ${reqs.length}`} accent={cold === 0} />
        <Readout label="Median request" value={`${p50} ms`} />
        <Readout label="Slowest request" value={`${worst} ms`} />
      </div>
      <Note className="mt-2">
        {cold === 0
          ? "Every request found a warm instance, so nobody waited for anything to start."
          : `${cold} requests found no free warm instance and waited ${Math.round(RUNTIMES[runtime].baseMs + RUNTIMES[runtime].perMb * packageMb)} ms for one to start. A burst of simultaneous requests needs many instances at once, and each new one starts cold. The quiet gap in the middle lets every instance go cold.`}
      </Note>
    </div>
  );
}

/** goal: { maxWorst, maxCold } */
export function checkColdStart(state: unknown, goal: Record<string, unknown>) {
  const s = state as ColdStartState | undefined;
  if (!s) return false;
  if (typeof goal.maxWorst === "number" && s.worst > goal.maxWorst) return false;
  if (typeof goal.maxCold === "number" && s.cold > goal.maxCold) return false;
  if (typeof goal.runtime === "string" && s.runtime !== goal.runtime) return false;
  return ["maxWorst", "maxCold", "runtime"].some((k) => k in goal);
}

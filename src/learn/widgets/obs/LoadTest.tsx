"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Segmented, Slider, useReport } from "./kit";

/**
 * A load test, drawn as the curve it always produces. Each instance can serve 70 requests a
 * second. While there is spare capacity latency is flat; as utilisation climbs, requests start to
 * queue and latency bends upward faster and faster (the "knee"); past 100% the queue never drains
 * and requests fail. Slide the offered load and change the instance count, and keep p95 under the
 * 500 ms target.
 */

const PER_INSTANCE = 70;
const BASE_MS = 60;
const SLO_MS = 500;

export function p95At(load: number, capacity: number): number {
  const rho = load / capacity;
  if (rho >= 1) return 5000;
  return Math.min(5000, Math.round((2 * BASE_MS) / (1 - Math.min(0.985, rho))));
}
/** mean time in the system, for Little's law */
export function meanMsAt(load: number, capacity: number): number {
  const rho = load / capacity;
  if (rho >= 1) return 5000;
  return Math.round(BASE_MS / (1 - Math.min(0.985, rho)));
}

export interface LoadTestProps {
  load?: number;
  instances?: number;
  lockInstances?: boolean;
}

export interface LoadTestState {
  load: number;
  instances: number;
  p95: number;
  errPct: number;
  withinSlo: boolean;
  inFlight: number;
}

export function LoadTest({ props, onChange, revealed }: WidgetProps<LoadTestProps>) {
  const [load, setLoad] = useState(props.load ?? 60);
  const [instances, setInstances] = useState(props.instances ?? 1);
  const cap = instances * PER_INSTANCE;
  const util = load / cap;
  const p95 = p95At(load, cap);
  const errPct = load > cap ? Math.round(((load - cap) / load) * 100) : 0;
  const withinSlo = p95 <= SLO_MS && errPct === 0;
  const inFlight = Math.round(((load * meanMsAt(load, cap)) / 1000) * 10) / 10;
  const safe = Math.floor(cap * (1 - (2 * BASE_MS) / SLO_MS));
  useReport(onChange, { load, instances, p95, errPct, withinSlo, inFlight } satisfies LoadTestState, `${load}|${instances}`);

  const W = 360;
  const H = 170;
  const left = 36;
  const top = 10;
  const bottom = 22;
  const xMax = 300;
  const yMax = 2000;
  const x = (v: number) => left + (Math.min(v, xMax) / xMax) * (W - left - 8);
  const y = (ms: number) => top + (1 - Math.min(ms, yMax) / yMax) * (H - top - bottom);
  const curve: string[] = [];
  for (let l = 0; l <= xMax; l += 4) curve.push(`${x(l)},${y(p95At(l, cap))}`);

  return (
    <div className="w-full max-w-2xl">
      <div className="grid gap-x-4 min-[560px]:grid-cols-[1.4fr_1fr] min-[560px]:items-end">
        <Slider label="Offered load (requests per second)" value={load} min={10} max={280} step={10} format={(v) => `${v}/s`} onChange={setLoad} disabled={revealed} />
        <div>
          <p className="text-xs text-ink-3">Instances (70 requests/s each)</p>
          <Segmented
            label="Instances"
            value={instances}
            disabled={revealed || props.lockInstances}
            onChange={setInstances}
            className="mt-1"
            options={[1, 2, 3, 4].map((n) => ({ id: n, label: String(n) }))}
          />
        </div>
      </div>

      <div className="mt-2 rounded-xl border border-line bg-surface p-2">
        <Caption className="px-1">p95 latency as load grows (ms)</Caption>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`At ${load} requests per second on ${instances} instances, p95 latency is ${p95} milliseconds`}>
          <rect x={left} y={y(SLO_MS)} width={W - left - 8} height={H - bottom - y(SLO_MS)} fill="var(--primary)" opacity={0.12} />
          {[0, 500, 1000, 2000].map((t) => (
            <g key={t}>
              <line x1={left} x2={W - 8} y1={y(t)} y2={y(t)} stroke={t === SLO_MS ? "var(--brand)" : "var(--line)"} strokeDasharray={t === SLO_MS ? "4 3" : ""} />
              <text x={left - 5} y={y(t) + 3} textAnchor="end" fontSize={9} fill="var(--ink-3)" fontFamily="var(--font-mono, monospace)">
                {t}
              </text>
            </g>
          ))}
          <text x={W - 10} y={y(SLO_MS) - 3} textAnchor="end" fontSize={8.5} fill="var(--brand)">
            target 500 ms
          </text>
          <line x1={x(cap)} x2={x(cap)} y1={top} y2={H - bottom} stroke="var(--bad)" strokeDasharray="3 3" />
          <text x={Math.min(x(cap) + 3, W - 70)} y={top + 9} fontSize={8.5} fill="var(--bad)">
            100% busy
          </text>
          <polyline points={curve.join(" ")} fill="none" stroke="var(--ink-2)" strokeWidth={1.6} strokeLinejoin="round" />
          <circle cx={x(load)} cy={y(p95)} r={5} fill={withinSlo ? "var(--primary)" : "var(--bad)"} stroke="var(--ink)" strokeWidth={1.4} />
          {[0, 100, 200, 300].map((t) => (
            <text key={t} x={x(t)} y={H - 6} fontSize={9} fill="var(--ink-3)" textAnchor={t === 0 ? "start" : t === 300 ? "end" : "middle"} fontFamily="var(--font-mono, monospace)">
              {t}/s
            </text>
          ))}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" aria-live="polite">
        <Readout label="Busy" value={`${Math.min(100, Math.round(util * 100))}%`} />
        <Readout label="p95" value={p95 >= 5000 ? "5 s+" : `${p95} ms`} accent={withinSlo} />
        <Readout label="Failed" value={`${errPct}%`} />
        <Readout label="In flight at once" value={util >= 1 ? "grows without limit" : inFlight} />
        <Readout label="Safe up to" value={`${safe}/s`} />
      </div>
      <Note tone={withinSlo ? "good" : "bad"} className="mt-2">
        {errPct > 0
          ? `Offered load is above what ${instances} instance${instances === 1 ? "" : "s"} can serve, so the queue grows without limit and ${errPct}% of requests fail.`
          : withinSlo
            ? `${Math.round(util * 100)}% busy is comfortable: there is room to absorb a spike before the knee.`
            : `Not failing yet, but at ${Math.round(util * 100)}% busy every request waits behind others. The knee of the curve comes well before 100%, which is why you plan for headroom.`}
      </Note>
    </div>
  );
}

/** goal: { withinSlo: true, minLoad: 200 } */
export function checkLoadTest(state: unknown, goal: Record<string, unknown>) {
  const s = state as LoadTestState | undefined;
  if (!s) return false;
  if (goal.withinSlo === true && !s.withinSlo) return false;
  if (typeof goal.minLoad === "number" && s.load < goal.minLoad) return false;
  if (typeof goal.minInstances === "number" && s.instances < goal.minInstances) return false;
  if (typeof goal.maxInstances === "number" && s.instances > goal.maxInstances) return false;
  return ["withinSlo", "minLoad", "minInstances", "maxInstances"].some((k) => k in goal);
}

"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Slider, fmt } from "../dsa/ui";
import { Choice } from "./ui";

/**
 * A database with 8 cores serving 12 seconds of traffic. Every request needs one query of a given
 * length. Three ways to connect:
 *   pool        the app keeps N connections open and requests wait their turn for one
 *   direct      serverless: every request opens its own connection (30 ms of extra work for the
 *               handshake and login) and the server refuses connections past 100
 *   pooler      serverless, but a small pool in front of the database shares N connections
 * Queries running at once share the 8 cores; waiting more than 3 seconds counts as a timeout.
 */

const TICK = 10;
const TICKS = 1200;
const CORES = 8;
const TIMEOUT = 300;
const MAX_CONN = 100;
const CONN_COST = 30;

type Mode = "pool" | "direct" | "pooler";

export interface PoolSim {
  completed: number;
  refused: number;
  timedOut: number;
  p95: number;
  peak: number;
  series: number[];
}

export function simulate(mode: Mode, pool: number, rate: number, queryMs: number, spike: boolean): PoolSim {
  let acc = 0;
  let queue: number[] = [];
  let active: { rem: number; arr: number }[] = [];
  const lat: number[] = [];
  let refused = 0;
  let timedOut = 0;
  let peak = 0;
  const series: number[] = [];
  for (let t = 0; t < TICKS; t++) {
    acc += (rate * TICK * (spike && t >= 400 && t < 700 ? 3 : 1)) / 1000;
    const n = Math.floor(acc);
    acc -= n;
    for (let i = 0; i < n; i++) queue.push(t);
    // give up on anything that has waited too long
    const before = queue.length + active.length;
    queue = queue.filter((a) => t - a <= TIMEOUT);
    active = active.filter((a) => t - a.arr <= TIMEOUT);
    timedOut += before - queue.length - active.length;
    if (mode === "direct") {
      for (const arr of queue) {
        if (active.length >= MAX_CONN) refused += 1;
        else active.push({ rem: queryMs + CONN_COST, arr });
      }
      queue = [];
    } else {
      while (queue.length && active.length < pool) active.push({ rem: queryMs, arr: queue.shift()! });
    }
    peak = Math.max(peak, active.length);
    series.push(active.length + queue.length);
    if (active.length) {
      const share = Math.min(TICK, (CORES * TICK) / active.length);
      const left: typeof active = [];
      for (const a of active) {
        a.rem -= share;
        if (a.rem <= 0) lat.push((t + 1 - a.arr) * TICK);
        else left.push(a);
      }
      active = left;
    }
  }
  lat.sort((a, b) => a - b);
  return { completed: lat.length, refused, timedOut, p95: lat.length ? lat[Math.floor(lat.length * 0.95)] : 0, peak, series };
}

export interface PoolProps {
  mode?: Mode;
  pool?: number;
  rate?: number;
  queryMs?: number;
  spike?: boolean;
  /** Which modes to offer. */
  modes?: Mode[];
}

export interface PoolState {
  mode: Mode;
  pool: number;
  rate: number;
  queryMs: number;
  spike: boolean;
  completed: number;
  failed: number;
  p95: number;
  peak: number;
}

const MODE_LABEL: Record<Mode, string> = { pool: "Pool in the app", direct: "Serverless, no pool", pooler: "Serverless + pooler" };

export function Pool({ props, onChange, revealed }: WidgetProps<PoolProps>) {
  const modes = props.modes ?? (["pool", "direct", "pooler"] as Mode[]);
  const [mode, setMode] = useState<Mode>(props.mode ?? modes[0]);
  const [pool, setPool] = useState(props.pool ?? 10);
  const [rate, setRate] = useState(props.rate ?? 200);
  const [queryMs, setQueryMs] = useState(props.queryMs ?? 20);
  const [spike, setSpike] = useState(Boolean(props.spike));

  const sim = simulate(mode, pool, rate, queryMs, spike);
  const failed = sim.refused + sim.timedOut;
  const total = sim.completed + failed;

  const report = (m: Mode, p: number, r: number, q: number, s: boolean) => {
    const x = simulate(m, p, r, q, s);
    onChange?.({ mode: m, pool: p, rate: r, queryMs: q, spike: s, completed: x.completed, failed: x.refused + x.timedOut, p95: x.p95, peak: x.peak } satisfies PoolState);
  };

  // chart: 60 bars, each the busiest of 20 ticks
  const bars = Array.from({ length: 60 }, (_, i) => Math.max(...sim.series.slice(i * 20, i * 20 + 20)));
  const top = Math.max(20, ...bars);
  const direct = mode === "direct";

  return (
    <div className="w-full min-w-0">
      {modes.length > 1 && (
        <div>
          <Choice
            label="How the app connects"
            value={mode}
            disabled={revealed}
            onChange={(m) => {
              setMode(m);
              report(m, pool, rate, queryMs, spike);
            }}
            options={modes.map((m) => ({ id: m, label: MODE_LABEL[m] }))}
          />
        </div>
      )}
      <div className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        <div className={direct ? "opacity-40" : ""}>
          <Caption className="!mb-0">{mode === "pooler" ? "Connections the pooler keeps" : "Pool size"}: {direct ? "—" : pool}</Caption>
          <Slider value={pool} min={1} max={120} disabled={revealed || direct} label="Pool size" onChange={(v) => { setPool(v); report(mode, v, rate, queryMs, spike); }} />
        </div>
        <div>
          <Caption className="!mb-0">Requests per second: {rate}</Caption>
          <Slider value={rate} min={20} max={600} step={10} disabled={revealed} label="Requests per second" onChange={(v) => { setRate(v); report(mode, pool, v, queryMs, spike); }} />
        </div>
        <div>
          <Caption className="!mb-0">Each query takes: {queryMs} ms</Caption>
          <Slider value={queryMs} min={5} max={80} step={5} disabled={revealed} label="Query time in milliseconds" onChange={(v) => { setQueryMs(v); report(mode, pool, rate, v, spike); }} />
        </div>
        <div className="flex items-center">
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" aria-label="Sale opens: triple traffic for 3 seconds" className="h-4 w-4 accent-[var(--brand)]" checked={spike} disabled={revealed} onChange={(e) => { setSpike(e.target.checked); report(mode, pool, rate, queryMs, e.target.checked); }} />
            Sale opens: ×3 traffic for 3 seconds
          </label>
        </div>
      </div>

      <Caption className="mt-3">Requests in the system, 12 seconds</Caption>
      <div className="flex h-24 items-end gap-px rounded-xl border border-line bg-surface-2 px-1.5 pt-1.5" aria-hidden>
        {bars.map((b, i) => (
          <div key={i} className="flex-1 rounded-t-sm bg-primary" style={{ height: `${Math.max(2, (b / top) * 100)}%`, opacity: (direct ? b >= MAX_CONN : b > pool) ? 1 : 0.55 }} />
        ))}
      </div>
      <p className="mt-1 text-[11px] text-ink-3">Bright bars: more requests than connections, so some are waiting (or being refused). Tallest bar = {fmt(top)}.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Done" value={`${fmt(sim.completed)} of ${fmt(total)}`} />
        <Readout label="Failed" value={fmt(failed)} accent={failed > 0} />
        <Readout label="Slowest 5% took" value={`${fmt(sim.p95)} ms`} />
        <Readout label="Most connections open" value={sim.peak} />
        <Readout label="Their memory" value={`≈ ${sim.peak * 10} MB`} />
      </div>
      <Note tone={failed === 0 ? "good" : "bad"}>
        {failed === 0
          ? `Every request finished. Up to ${sim.peak} ${sim.peak === 1 ? "connection was" : "connections were"} busy; the database only has ${CORES} cores.`
          : sim.refused > 0
            ? `${fmt(sim.refused)} requests were refused outright: the database allows ${MAX_CONN} connections and every request tried to open its own.`
            : `${fmt(sim.timedOut)} requests waited longer than 3 seconds and gave up.`}
      </Note>
    </div>
  );
}

export function checkPool(state: unknown, goal: Record<string, unknown>) {
  const s = state as PoolState | undefined;
  if (!s) return false;
  if (typeof goal.mode === "string" && s.mode !== goal.mode) return false;
  if (typeof goal.failedMax === "number" && s.failed > goal.failedMax) return false;
  if (typeof goal.failedMin === "number" && s.failed < goal.failedMin) return false;
  if (typeof goal.poolMax === "number" && s.pool > goal.poolMax) return false;
  if (typeof goal.poolMin === "number" && s.pool < goal.poolMin) return false;
  if (typeof goal.peakMax === "number" && s.peak > goal.peakMax) return false;
  if (typeof goal.rateMin === "number" && s.rate < goal.rateMin) return false;
  if (goal.spike === true && !s.spike) return false;
  return true;
}

"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Segmented, useReport } from "./kit";

/**
 * The database goes away for 20 seconds. Where a health probe checks the database decides whether
 * that is a degraded minute or a full outage. Sixty percent of requests need the database; the
 * rest (menus served from memory) do not.
 */

type Where = "none" | "readiness" | "liveness";

const HORIZON = 70;
const DB_DOWN_FROM = 15;
const DB_DOWN_TO = 35;
const NEEDS_DB = 0.6;
const RESTART_SECS = 12;
const PROBE_EVERY = 5;
const LIVE_THRESHOLD = 3;

export function simulateDeps(where: Where) {
  const frac: number[] = [];
  let up = true;
  let ready = true;
  let downFor = 0;
  let liveFails = 0;
  let restarts = 0;
  for (let t = 0; t < HORIZON; t++) {
    const dbUp = t < DB_DOWN_FROM || t >= DB_DOWN_TO;
    if (!up) {
      downFor++;
      if (downFor >= RESTART_SECS) {
        up = true;
        ready = true;
        liveFails = 0;
      }
    }
    if (up && t % PROBE_EVERY === 0) {
      if (where === "readiness") ready = dbUp;
      if (where === "liveness") {
        liveFails = dbUp ? 0 : liveFails + 1;
        if (liveFails >= LIVE_THRESHOLD) {
          up = false;
          ready = false;
          downFor = 0;
          restarts++;
        }
      }
    }
    // the fraction of requests that succeed this second (the three pods behave identically)
    frac.push(!up || !ready ? 0 : dbUp ? 1 : 1 - NEEDS_DB);
  }
  const served = frac.reduce((a, b) => a + b, 0) / HORIZON;
  const outage = frac.slice(DB_DOWN_FROM).filter((f) => f < 1);
  const blackout = frac.filter((f) => f === 0).length;
  return { frac, served, restarts, blackout, degraded: outage.length };
}

export interface ProbeDepsState {
  where: Where;
  servedPct: number;
  blackoutSecs: number;
  restarts: number;
}

export function ProbeDeps({ props, onChange, revealed }: WidgetProps<{ where?: Where }>) {
  const [where, setWhere] = useState<Where>(props.where ?? "none");
  const sim = simulateDeps(where);
  const servedPct = Math.round(sim.served * 100);
  useReport(onChange, { where, servedPct, blackoutSecs: sim.blackout, restarts: sim.restarts } satisfies ProbeDepsState, where);

  return (
    <div className="w-full max-w-2xl">
      <div className="flex justify-center">
        <Segmented
          label="Where the pods check the database"
          value={where}
          disabled={revealed}
          onChange={setWhere}
          options={[
            { id: "none", label: "Not in any probe" },
            { id: "readiness", label: "In readiness" },
            { id: "liveness", label: "In liveness" },
          ]}
        />
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <Caption>Share of requests that succeed, second by second (3 pods, one shared database)</Caption>
        <div className="relative mt-2 flex h-16 items-end gap-px overflow-hidden rounded bg-surface-2">
          {sim.frac.map((f, i) => (
            <span key={i} className={`flex-1 rounded-t-[1px] ${f === 1 ? "bg-primary" : f === 0 ? "bg-[var(--bad)]" : "bg-[#f59e0b]"}`} style={{ height: `${Math.max(f * 100, 6)}%` }} />
          ))}
        </div>
        <div className="relative mt-1 h-4 text-[10px] text-ink-3">
          <span className="absolute font-mono" style={{ left: `${(DB_DOWN_FROM / HORIZON) * 100}%` }}>▲ database down</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-3">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-primary" /> everything works</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#f59e0b]" /> only the database-free 40%</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[var(--bad)]" /> nothing works</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" aria-live="polite">
        <Readout label="Requests served" value={`${servedPct}%`} accent />
        <Readout label="Seconds of total blackout" value={sim.blackout} />
        <Readout label="Pod restarts" value={sim.restarts} />
      </div>
      <Note tone={where === "none" ? "good" : "bad"} className="mt-2">
        {where === "none"
          ? "The database is down for 20 seconds. Anything that needs it fails, but the pods stay in rotation and keep serving menus from memory. When the database returns, everything is instantly fine."
          : where === "readiness"
            ? "Every pod's probe fails at once, so all three leave the load balancer. Now even the requests that never needed the database get nothing, and recovery waits for the next probe."
            : "Three failed checks in a row restart every pod at nearly the same moment. Restarting does not fix a database that is down, and the pods then spend twelve seconds booting while nothing is serving."}
      </Note>
    </div>
  );
}

/** goal: { where: "none" } or { minServedPct } */
export function checkProbeDeps(state: unknown, goal: Record<string, unknown>) {
  const s = state as ProbeDepsState | undefined;
  if (!s) return false;
  if (typeof goal.where === "string" && s.where !== goal.where) return false;
  if (typeof goal.minServedPct === "number" && s.servedPct < goal.minServedPct) return false;
  if (typeof goal.maxRestarts === "number" && s.restarts > goal.maxRestarts) return false;
  return ["where", "minServedPct", "maxRestarts"].some((k) => k in goal);
}

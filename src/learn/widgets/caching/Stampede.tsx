"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Slider } from "../dsa/ui";
import { Toggle } from "./ui";
import { STAMPEDE, stampede } from "./sim";

/**
 * 24 popular pages are all cached at second 0 (a deploy just flushed the cache). Each page gets
 * 5 requests a second and takes 2 seconds to rebuild from the database, which handles 15 queries
 * a second comfortably. Each bar is the database queries started in that second. Turn on the
 * protections and watch the spikes shrink.
 */

export interface StampedeProps {
  /** Which protections can be toggled. */
  tools?: ("lock" | "jitter" | "early")[];
  initial?: { lock?: boolean; jitter?: boolean; early?: boolean };
  ttl?: number;
}

export interface StampedeState {
  lock: boolean;
  jitter: boolean;
  early: boolean;
  ttl: number;
  peak: number;
  total: number;
  overSeconds: number;
}

export function Stampede({ props, onChange, revealed }: WidgetProps<StampedeProps>) {
  const tools = props.tools ?? ["lock", "jitter", "early"];
  const [lock, setLock] = useState(props.initial?.lock ?? false);
  const [jitter, setJitter] = useState(props.initial?.jitter ?? false);
  const [early, setEarly] = useState(props.initial?.early ?? false);
  const [ttl, setTtl] = useState(props.ttl ?? 10);

  const sim = stampede(ttl, lock, jitter, early);
  const emit = (l: boolean, j: boolean, e: boolean, t: number) => {
    const x = stampede(t, l, j, e);
    onChange?.({ lock: l, jitter: j, early: e, ttl: t, peak: x.peak, total: x.total, overSeconds: x.overSeconds } satisfies StampedeState);
  };

  const cap = STAMPEDE.capacity;
  const top = Math.max(sim.peak, cap) * 1.08;
  const label: Record<string, string> = { lock: "One rebuilds, the rest wait (lock)", jitter: "Jittered TTL (±30%)", early: "Refresh before expiry" };

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap gap-1.5">
        {tools.includes("lock") && (
          <Toggle on={lock} disabled={revealed} onClick={() => { setLock(!lock); emit(!lock, jitter, early, ttl); }}>
            {label.lock}
          </Toggle>
        )}
        {tools.includes("jitter") && (
          <Toggle on={jitter} disabled={revealed} onClick={() => { setJitter(!jitter); emit(lock, !jitter, early, ttl); }}>
            {label.jitter}
          </Toggle>
        )}
        {tools.includes("early") && (
          <Toggle on={early} disabled={revealed} onClick={() => { setEarly(!early); emit(lock, jitter, !early, ttl); }}>
            {label.early}
          </Toggle>
        )}
      </div>

      <Caption className="mt-3">Time to live</Caption>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <Slider value={ttl} min={5} max={20} disabled={revealed} label="Time to live in seconds" onChange={(v) => { setTtl(v); emit(lock, jitter, early, v); }} />
        </div>
        <span className="w-14 shrink-0 text-right font-mono text-lg font-semibold tabular-nums text-ink">{ttl} s</span>
      </div>

      <Caption className="mt-3">Database queries started each second</Caption>
      <div className="relative h-36 rounded-xl border border-line bg-surface px-1.5 pb-1 pt-2" role="img" aria-label={`Peak ${sim.peak} queries per second; the database copes with ${cap}`}>
        <div className="absolute inset-x-1.5 border-t border-dashed border-[var(--ink-3)]" style={{ bottom: `calc(${(cap / top) * 100}% * 0.86 + 0.25rem)` }}>
          <span className="absolute right-0 -top-4 rounded bg-surface px-1 font-mono text-[10px] text-ink-3">limit {cap}/s</span>
        </div>
        <div className="flex h-full items-end gap-[2px]">
          {sim.queries.map((q, s) => (
            <span
              key={s}
              title={`second ${s}: ${q} queries`}
              className={`min-w-0 flex-1 rounded-t-[3px] ${q > cap ? "bg-[var(--bad)]" : "bg-primary"}`}
              style={{ height: `${Math.max(q > 0 ? 2 : 0, (q / top) * 86)}%` }}
            />
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-3">
        <span>0 s</span>
        <span>{STAMPEDE.seconds} s</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Busiest second" value={`${sim.peak} queries`} accent={sim.peak > cap} />
        <Readout label="Seconds over the limit" value={sim.overSeconds} />
        <Readout label="Queries in total" value={sim.total} />
      </div>
      <Note tone={sim.peak <= cap ? "good" : "bad"}>
        {sim.peak <= cap
          ? `The busiest second stays at ${sim.peak}, under the database's limit of ${cap}. The expiries no longer line up.`
          : sim.total > 300
            ? `${sim.peak} queries in one second for ${cap} of capacity. Every request that found the entry empty ran the same query.`
            : `Only ${sim.total} queries in total, but ${sim.peak} land in the same second: all the entries expire together.`}
      </Note>
    </div>
  );
}

export function checkStampede(state: unknown, goal: Record<string, unknown>) {
  const s = state as StampedeState | undefined;
  if (!s) return false;
  if (typeof goal.peakMax === "number" && !(s.peak <= goal.peakMax)) return false;
  if (typeof goal.totalMax === "number" && !(s.total <= goal.totalMax)) return false;
  if (typeof goal.lock === "boolean" && s.lock !== goal.lock) return false;
  if (typeof goal.jitter === "boolean" && s.jitter !== goal.jitter) return false;
  if (typeof goal.early === "boolean" && s.early !== goal.early) return false;
  if (typeof goal.overMin === "number" && !(s.overSeconds >= goal.overMin)) return false;
  return true;
}

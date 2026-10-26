"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Slider } from "../dsa/ui";
import { Choice } from "./ui";

/**
 * A minute of a recipe app. A recipe is edited at a few moments; readers arrive every two
 * seconds and use a cache-aside cache with a time to live. Each cell is one read: filled green
 * is a fresh hit, red is a hit on an out-of-date copy, outlined is a miss that went to the
 * database. "Sliding" restarts the clock on every hit.
 */

export interface TtlProps {
  /** Seconds at which the recipe is edited. */
  changes?: number[];
  initial?: number;
  /** Offer the absolute / sliding switch. */
  sliding?: boolean;
}

export interface TtlRead {
  t: number;
  kind: "hit" | "stale" | "miss";
}

export function simulate(ttl: number, sliding: boolean, changes: number[]) {
  const version = (t: number) => 1 + changes.filter((c) => c <= t).length;
  let cache: { ver: number; expires: number } | null = null;
  const reads: TtlRead[] = [];
  for (let t = 1; t < 60; t += 2) {
    if (cache && t < cache.expires) {
      reads.push({ t, kind: cache.ver === version(t) ? "hit" : "stale" });
      if (sliding) cache.expires = t + ttl;
    } else {
      cache = { ver: version(t), expires: t + ttl };
      reads.push({ t, kind: "miss" });
    }
  }
  const stale = reads.filter((r) => r.kind === "stale").length;
  const misses = reads.filter((r) => r.kind === "miss").length;
  return { reads, stale, dbReads: misses, hits: reads.length - misses };
}

export interface TtlState {
  ttl: number;
  sliding: boolean;
  stale: number;
  dbReads: number;
  hits: number;
}

export function Ttl({ props, onChange, revealed }: WidgetProps<TtlProps>) {
  const changes = props.changes ?? [14, 31, 47];
  const [ttl, setTtl] = useState(props.initial ?? 20);
  const [sliding, setSliding] = useState(false);
  const sim = simulate(ttl, sliding, changes);

  const emit = (t: number, s: boolean) => {
    const x = simulate(t, s, changes);
    onChange?.({ ttl: t, sliding: s, stale: x.stale, dbReads: x.dbReads, hits: x.hits } satisfies TtlState);
  };

  return (
    <div className="w-full min-w-0">
      {props.sliding && (
        <div className="mb-3">
          <Choice
            label="Expiry style"
            value={sliding ? "sliding" : "absolute"}
            disabled={revealed}
            onChange={(v) => {
              setSliding(v === "sliding");
              emit(ttl, v === "sliding");
            }}
            options={[
              { id: "absolute", label: "Absolute: dies at a fixed time" },
              { id: "sliding", label: "Sliding: each hit renews it" },
            ]}
          />
        </div>
      )}
      <Caption>Time to live</Caption>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <Slider
            value={ttl}
            min={0}
            max={60}
            disabled={revealed}
            label="Time to live in seconds"
            onChange={(v) => {
              setTtl(v);
              emit(v, sliding);
            }}
          />
        </div>
        <span className="w-14 shrink-0 text-right font-mono text-lg font-semibold tabular-nums text-ink">{ttl} s</span>
      </div>

      <div className="mt-3">
        <div className="flex gap-[3px]" role="img" aria-label="One cell per read over a minute">
          {sim.reads.map((r) => (
            <span
              key={r.t}
              title={`t = ${r.t} s · ${r.kind === "hit" ? "fresh hit" : r.kind === "stale" ? "stale hit" : "miss: read the database"}`}
              className={`h-9 min-w-0 flex-1 rounded-[4px] border ${
                r.kind === "hit" ? "border-transparent bg-primary" : r.kind === "stale" ? "border-transparent bg-[var(--bad)]" : "border-[var(--line-strong)] bg-surface"
              }`}
            />
          ))}
        </div>
        <div className="relative mt-1 h-9">
          {changes.map((c) => (
            <span key={c} className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${(c / 60) * 100}%` }}>
              <span className="mx-auto block h-2 w-px bg-ink-3" />
              <span className="whitespace-nowrap rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-2">edit · {c}s</span>
            </span>
          ))}
        </div>
        <div className="flex justify-between font-mono text-[10px] text-ink-3">
          <span>0 s</span>
          <span>60 s</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Database reads" value={`${sim.dbReads} of 30`} />
        <Readout label="Stale reads" value={sim.stale} accent={sim.stale > 0} />
        <Readout label="Hits" value={sim.hits} />
      </div>
      <Note tone={sim.stale === 0 ? "good" : "plain"}>
        {ttl === 0
          ? "TTL 0 means nothing is ever kept: every read goes to the database. Safe, and no help at all."
          : sim.stale === 0
            ? `No reader saw an old recipe, and the database was read ${sim.dbReads} times instead of 30.`
            : `${sim.stale} ${sim.stale === 1 ? "read" : "reads"} showed a recipe that had already been edited. A reader can be behind by up to ${ttl} s.`}
      </Note>
    </div>
  );
}

export function checkTtl(state: unknown, goal: Record<string, unknown>) {
  const s = state as TtlState | undefined;
  if (!s) return false;
  if (typeof goal.staleMax === "number" && !(s.stale <= goal.staleMax)) return false;
  if (typeof goal.dbReadsMax === "number" && !(s.dbReads <= goal.dbReadsMax)) return false;
  if (typeof goal.staleMin === "number" && !(s.stale >= goal.staleMin)) return false;
  if (typeof goal.sliding === "boolean" && s.sliding !== goal.sliding) return false;
  if (typeof goal.ttlMin === "number" && !(s.ttl >= goal.ttlMin)) return false;
  return true;
}

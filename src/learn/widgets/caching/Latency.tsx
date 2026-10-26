"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Slider } from "../dsa/ui";
import { dur } from "./ui";

/**
 * Two views of why caches exist.
 *  ladder:  how long common operations take, on a log scale, and what they would feel like if one
 *           nanosecond lasted one second.
 *  average: the average time of a read as the hit rate moves, for a given hit and miss time.
 */

const LEVELS = [
  { id: "l1", name: "Read from the CPU's own cache", ns: 1 },
  { id: "ram", name: "Read from main memory", ns: 100 },
  { id: "ssd", name: "Random read from an SSD", ns: 100_000 },
  { id: "dc", name: "Round trip inside one data center", ns: 500_000 },
  { id: "db", name: "A database query over the network", ns: 2_000_000 },
  { id: "ocean", name: "Round trip across an ocean", ns: 150_000_000 },
];
const MAX_LOG = Math.log10(150_000_000);

export interface LatencyProps {
  mode?: "ladder" | "average";
  /** average mode: time of a hit and of a miss, in milliseconds. */
  hitMs?: number;
  missMs?: number;
  initial?: number;
}

export interface LatencyState {
  mode: "ladder" | "average";
  hit: number;
  avgMs: number;
  speedup: number;
  picked?: string;
}

export function Latency({ props, onChange, revealed }: WidgetProps<LatencyProps>) {
  const mode = props.mode ?? "ladder";
  const hitMs = props.hitMs ?? 1;
  const missMs = props.missMs ?? 40;
  const [hit, setHit] = useState(props.initial ?? 50);
  const [picked, setPicked] = useState<string | undefined>(undefined);

  const avg = (h: number) => (h / 100) * hitMs + (1 - h / 100) * missMs;
  const emit = (h: number, p: string | undefined) => onChange?.({ mode, hit: h, avgMs: avg(h), speedup: missMs / avg(h), picked: p } satisfies LatencyState);

  if (mode === "ladder") {
    const sel = LEVELS.find((l) => l.id === picked);
    return (
      <div className="w-full min-w-0">
        <Caption>How long it takes · tap a row to see it at human speed</Caption>
        <div className="space-y-1.5">
          {LEVELS.map((l) => {
            const on = picked === l.id;
            const w = 4 + (Math.log10(l.ns) / MAX_LOG) * 96;
            return (
              <button
                key={l.id}
                type="button"
                disabled={revealed}
                onClick={() => {
                  setPicked(l.id);
                  emit(hit, l.id);
                }}
                aria-pressed={on}
                className={`block w-full rounded-xl border px-3 py-2 text-left transition-colors ${on ? "border-[var(--brand)] bg-tint" : "border-line bg-surface hover:border-[var(--line-strong)]"}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-ink">{l.name}</span>
                  <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-ink">{dur(l.ns / 1e6)}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-surface-2">
                  <div className={`h-full rounded-full ${on ? "bg-primary" : "bg-[var(--ink-3)]/55"}`} style={{ width: `${w}%` }} />
                </div>
              </button>
            );
          })}
        </div>
        <Note tone={sel ? "good" : "plain"}>
          {sel ? (
            <span>
              Slow the world down so <strong>1 nanosecond lasts 1 second</strong>: <strong>{sel.name.toLowerCase()}</strong> would take <strong>{dur(sel.ns * 1000)}</strong>.
            </span>
          ) : (
            <span>The bars are on a log scale: each step to the right is a different order of magnitude.</span>
          )}
        </Note>
      </div>
    );
  }

  const a = avg(hit);
  const hitW = Math.max(2, (hit / 100) * 100);
  return (
    <div className="w-full min-w-0">
      <Caption>Hit rate</Caption>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <Slider
            value={hit}
            min={0}
            max={100}
            step={1}
            disabled={revealed}
            label="Hit rate in percent"
            onChange={(v) => {
              setHit(v);
              emit(v, picked);
            }}
          />
        </div>
        <span className="w-14 shrink-0 text-right font-mono text-lg font-semibold tabular-nums text-ink">{hit}%</span>
      </div>
      <div className="mt-3 flex h-8 overflow-hidden rounded-lg border border-line text-[11px] font-medium">
        <div className="grid place-items-center bg-primary text-primary-ink" style={{ width: `${hitW}%` }}>
          {hit >= 12 ? `hit · ${dur(hitMs)}` : ""}
        </div>
        <div className="grid flex-1 place-items-center bg-surface-2 text-ink-3">{hit <= 88 ? `miss · ${dur(missMs)}` : ""}</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Average read" value={dur(a)} accent />
        <Readout label="Versus no cache" value={`${(missMs / a).toFixed(1)}× faster`} />
      </div>
      <Note>
        <span>
          average = {hit}% × {dur(hitMs)} + {100 - hit}% × {dur(missMs)} = <strong>{dur(a)}</strong>
        </span>
      </Note>
    </div>
  );
}

export function checkLatency(state: unknown, goal: Record<string, unknown>) {
  const s = state as LatencyState | undefined;
  if (!s) return false;
  if (typeof goal.avgMax === "number" && !(s.avgMs <= goal.avgMax)) return false;
  if (typeof goal.avgMin === "number" && !(s.avgMs >= goal.avgMin)) return false;
  if (typeof goal.hitMin === "number" && !(s.hit >= goal.hitMin)) return false;
  if (typeof goal.hitMax === "number" && !(s.hit <= goal.hitMax)) return false;
  if (typeof goal.picked === "string" && s.picked !== goal.picked) return false;
  return true;
}

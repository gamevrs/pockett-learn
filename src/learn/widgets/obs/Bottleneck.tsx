"use client";

import React, { useState } from "react";
import { Crosshair } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Slider, useReport } from "./kit";

/**
 * A web service under rising load. The top panel is the RED view of what users get (Rate, Errors,
 * Duration). The table is the USE view of each resource behind it (Utilization, Saturation,
 * Errors). Push the load up until users suffer, then use the table to find the one resource that
 * is the limit, and mark it.
 */

export interface Resource {
  id: string;
  name: string;
  /** Requests per second it can sustain. */
  cap: number;
}

const DEFAULT_RESOURCES: Resource[] = [
  { id: "cpu", name: "Web workers (CPU)", cap: 380 },
  { id: "db", name: "Database connection pool", cap: 150 },
  { id: "disk", name: "Log disk throughput", cap: 520 },
  { id: "net", name: "Outbound network", cap: 700 },
];

export interface BottleneckProps {
  resources?: Resource[];
  load?: number;
}

export interface BottleneckState {
  load: number;
  selected: string | null;
  limit: string;
  correct: boolean;
}

export function Bottleneck({ props, onChange, revealed, status }: WidgetProps<BottleneckProps>) {
  const resources = props.resources ?? DEFAULT_RESOURCES;
  const [load, setLoad] = useState(props.load ?? 80);
  const [selected, setSelected] = useState<string | null>(null);
  const limit = resources.reduce((a, b) => (b.cap < a.cap ? b : a)).id;

  const rows = resources.map((r) => ({
    ...r,
    util: Math.min(1, load / r.cap),
    queued: Math.round(Math.max(0, load - r.cap) * 1.5),
    errs: Math.round(Math.max(0, load - r.cap * 1.1)),
  }));
  const worstUtil = Math.max(...rows.map((r) => r.util));
  const worstCap = Math.min(...resources.map((r) => r.cap));
  const dropPct = load > worstCap ? Math.round(((load - worstCap) / load) * 100) : 0;
  const p95 = load > worstCap ? 5000 : Math.min(5000, Math.round(90 / (1 - Math.min(0.97, worstUtil))));
  useReport(onChange, { load, selected, limit, correct: selected === limit } satisfies BottleneckState, `${load}|${selected}`);

  const bad = dropPct > 0 || p95 > 800;
  return (
    <div className="w-full max-w-2xl">
      <div className="max-w-md">
        <Slider label="Incoming requests per second" value={load} min={20} max={420} step={10} format={(v) => `${v}/s`} onChange={setLoad} disabled={revealed} />
      </div>

      <div className="mt-2 rounded-xl border border-line bg-surface-2 p-3">
        <Caption>What users get (RED)</Caption>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-surface px-2 py-2">
            <p className="text-[11px] text-ink-3">Rate</p>
            <p className="font-mono text-base font-bold tabular-nums text-ink">{load}/s</p>
          </div>
          <div className={`rounded-lg px-2 py-2 ${dropPct > 0 ? "bg-[var(--bad)]/15" : "bg-surface"}`}>
            <p className="text-[11px] text-ink-3">Errors</p>
            <p className={`font-mono text-base font-bold tabular-nums ${dropPct > 0 ? "text-bad" : "text-ink"}`}>{dropPct}%</p>
          </div>
          <div className={`rounded-lg px-2 py-2 ${p95 > 800 ? "bg-[var(--bad)]/15" : "bg-surface"}`}>
            <p className="text-[11px] text-ink-3">Duration p95</p>
            <p className={`font-mono text-base font-bold tabular-nums ${p95 > 800 ? "text-bad" : "text-ink"}`}>{p95 >= 5000 ? "5 s+" : `${p95} ms`}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <Caption>What each resource is doing (USE)</Caption>
        <div className="mt-2 grid gap-2">
          {rows.map((r) => {
            const hot = r.util >= 1;
            const isLimit = revealed && status === "revealed" && r.id === limit;
            return (
              <div key={r.id} className={`rounded-lg border p-2.5 ${selected === r.id ? "border-[var(--brand)] bg-tint" : isLimit ? "border-[var(--brand)] bg-tint" : "border-line bg-surface"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-ink">{r.name}</span>
                  <button
                    type="button"
                    disabled={revealed}
                    onClick={() => setSelected(selected === r.id ? null : r.id)}
                    aria-pressed={selected === r.id}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium transition-colors disabled:cursor-default ${selected === r.id ? "border-transparent bg-primary text-primary-ink" : "border-line text-ink-2 hover:text-ink"}`}
                  >
                    <Crosshair className="h-3.5 w-3.5" /> {selected === r.id ? "Marked as the limit" : "This is the limit"}
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="w-[4.5rem] shrink-0 text-[11px] text-ink-3">Utilization</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className={`h-full rounded-full transition-all duration-300 ${hot ? "bg-[var(--bad)]" : r.util > 0.75 ? "bg-[#f59e0b]" : "bg-primary"}`} style={{ width: `${Math.round(r.util * 100)}%` }} />
                  </div>
                  <span className="w-10 shrink-0 text-right font-mono text-[12px] tabular-nums text-ink">{Math.round(r.util * 100)}%</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-0.5 text-[12px] text-ink-3">
                  <span>
                    Saturation (waiting): <span className={`font-mono font-semibold ${r.queued > 0 ? "text-bad" : "text-ink-2"}`}>{r.queued}</span>
                  </span>
                  <span>
                    Errors/s: <span className={`font-mono font-semibold ${r.errs > 0 ? "text-bad" : "text-ink-2"}`}>{r.errs}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Note tone={bad ? "bad" : "neutral"} className="mt-2" >
        {bad
          ? "Users are hurting, and RED can't say why. Look down the USE table for the resource at 100% with work piling up behind it."
          : "Nothing is wrong at this load. Raise it until the user-facing numbers turn red, then find the resource behind them."}
      </Note>
    </div>
  );
}

/** goal: { limit: true, minLoad } (marked the right resource after pushing load past it) */
export function checkBottleneck(state: unknown, goal: Record<string, unknown>) {
  const s = state as BottleneckState | undefined;
  if (!s) return false;
  if (goal.correct === true && !s.correct) return false;
  if (typeof goal.minLoad === "number" && s.load < goal.minLoad) return false;
  return ["correct", "minLoad"].some((k) => k in goal);
}

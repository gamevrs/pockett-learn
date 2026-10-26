"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Slider, fmt } from "../dsa/ui";
import { Choice } from "./ui";

/**
 * How a planner picks a join. We join the refunded orders (A rows, after the filter) to a
 * million tickets that have an index on order_id. Three strategies, each with a cost in made-up
 * "units" (a random page read costs 25 times a row read in a sequential scan):
 *   nested loop: for each order, seek the ticket index          25 × A
 *   hash join:   read every ticket once, probe a hash of orders   1,000,000 + 1.5 × A
 *   merge join:  both sides in order, sort the orders if needed   1,000,000 + A (+ A·log2 A)
 * The planner doesn't know A: it has an *estimate* from statistics. It picks the cheapest plan
 * for the estimate. If the statistics are stale, the estimate is wrong, and so can be the plan.
 */

const M = 1_000_000;
type Strategy = "nested" | "hash" | "merge";
const NAMES: Record<Strategy, string> = { nested: "Nested loop", hash: "Hash join", merge: "Merge join" };
const STALE_ESTIMATE = 12;

export function costOf(s: Strategy, a: number, sorted: boolean): number {
  if (s === "nested") return 25 * a;
  if (s === "hash") return M + 1.5 * a;
  return M + a + (sorted ? 0 : a * Math.log2(Math.max(2, a)));
}

export interface PlanProps {
  /** Start with stale statistics. */
  stale?: boolean;
  /** Starting value of the slider (rows after the filter). */
  actual?: number;
  /** Hide the stale-statistics switch. */
  fixedStats?: boolean;
}

export interface PlanState {
  actual: number;
  estimate: number;
  stale: boolean;
  sorted: boolean;
  pick: Strategy;
  best: Strategy;
  /** Cost of the planner's pick divided by the cost of the best plan, at the real row count. */
  slowdown: number;
}

function choose(est: number, sorted: boolean): Strategy {
  return (["nested", "hash", "merge"] as Strategy[]).reduce((a, b) => (costOf(b, est, sorted) < costOf(a, est, sorted) ? b : a));
}

export function summarise(actual: number, stale: boolean, sorted: boolean): PlanState {
  const estimate = stale ? STALE_ESTIMATE : actual;
  const pick = choose(estimate, sorted);
  const best = choose(actual, sorted);
  return { actual, estimate, stale, sorted, pick, best, slowdown: costOf(pick, actual, sorted) / costOf(best, actual, sorted) };
}

const times = (n: number) => (n >= 100 ? `×${fmt(n)}` : `×${n.toFixed(1)}`);

function Line({ depth, op, est, actual, extra }: { depth: number; op: string; est?: number; actual?: number; extra?: string }) {
  const off = est !== undefined && actual !== undefined && Math.max(est, actual) / Math.max(1, Math.min(est, actual)) >= 10;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-0.5" style={{ paddingLeft: `${depth * 18}px` }}>
      <span className="text-ink-3">{depth > 0 ? "└" : "▸"}</span>
      <span className="font-mono text-[12.5px] font-medium text-ink">{op}</span>
      {extra && <span className="text-[11.5px] text-ink-3">{extra}</span>}
      {est !== undefined && actual !== undefined && (
        <span className="font-mono text-[11.5px] tabular-nums text-ink-3">
          est <span className="text-ink-2">{fmt(est)}</span> · actual <span className={off ? "font-semibold text-bad" : "text-ink-2"}>{fmt(actual)}</span>
          {off && <span className="ml-1 rounded bg-[var(--bad)]/15 px-1 text-bad">{times(Math.max(est, actual) / Math.max(1, Math.min(est, actual)))} off</span>}
        </span>
      )}
    </div>
  );
}

export function Plan({ props, onChange, revealed }: WidgetProps<PlanProps>) {
  const [exp10, setExp10] = useState(Math.round(Math.log10(props.actual ?? 20) * 10));
  const [stale, setStale] = useState(Boolean(props.stale));
  const [sorted, setSorted] = useState(false);
  const actual = Math.round(10 ** (exp10 / 10));
  const st = summarise(actual, stale, sorted);

  const set = (e: number, s: boolean, so: boolean) => {
    onChange?.(summarise(Math.round(10 ** (e / 10)), s, so));
  };

  return (
    <div className="w-full min-w-0">
      <Caption>Orders with status = &apos;refund&apos; (the real number)</Caption>
      <Slider
        value={exp10}
        min={10}
        max={55}
        label="Rows that pass the filter"
        disabled={revealed}
        onChange={(v) => {
          setExp10(v);
          set(v, stale, sorted);
        }}
      />
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <Readout label="Actual rows" value={fmt(actual)} />
        <Readout label="Planner thinks" value={fmt(st.estimate)} accent={stale} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {!props.fixedStats && (
          <Choice
            label="Statistics"
            value={stale ? "stale" : "fresh"}
            disabled={revealed}
            onChange={(v) => {
              setStale(v === "stale");
              set(exp10, v === "stale", sorted);
            }}
            options={[{ id: "fresh", label: "Fresh statistics" }, { id: "stale", label: "Stale statistics" }]}
          />
        )}
        <Choice
          label="Orders arrive"
          value={sorted ? "sorted" : "unsorted"}
          disabled={revealed}
          onChange={(v) => {
            setSorted(v === "sorted");
            set(exp10, stale, v === "sorted");
          }}
          options={[{ id: "unsorted", label: "Unsorted" }, { id: "sorted", label: "Sorted by order_id" }]}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-line bg-surface-2 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">
          <span>Strategy</span>
          <span className="text-right">cost at estimate</span>
          <span className="text-right">cost at actual</span>
        </div>
        {(["nested", "hash", "merge"] as Strategy[]).map((s) => (
          <div key={s} className={`grid grid-cols-[1fr_auto_auto] items-center gap-x-3 border-b border-line px-3 py-2 text-sm last:border-b-0 ${s === st.pick ? "bg-tint" : "bg-surface"}`}>
            <span className="flex flex-wrap items-center gap-1.5 text-ink">
              {NAMES[s]}
              {s === st.pick && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-ink">planner picks</span>}
              {s === st.best && s !== st.pick && <span className="rounded-full border border-[var(--brand)] px-2 py-0.5 text-[10px] font-semibold text-brand">would have been fastest</span>}
            </span>
            <span className="text-right font-mono text-[12.5px] tabular-nums text-ink-2">{fmt(costOf(s, st.estimate, sorted))}</span>
            <span className={`text-right font-mono text-[12.5px] tabular-nums ${s === st.best ? "font-semibold text-ink" : "text-ink-2"}`}>{fmt(costOf(s, actual, sorted))}</span>
          </div>
        ))}
      </div>

      <Caption className="mt-4">The plan it runs</Caption>
      <div className="rounded-xl border border-line bg-surface px-3 py-2">
        {st.pick === "nested" && (
          <>
            <Line depth={0} op="Nested Loop" est={st.estimate} actual={actual} />
            <Line depth={1} op="Scan orders" extra="WHERE status = 'refund'" est={st.estimate} actual={actual} />
            <Line depth={1} op="Index seek tickets" extra="order_id = ?, once per order" est={st.estimate} actual={actual} />
          </>
        )}
        {st.pick === "hash" && (
          <>
            <Line depth={0} op="Hash Join" est={st.estimate} actual={actual} />
            <Line depth={1} op="Scan orders" extra="WHERE status = 'refund', build the hash" est={st.estimate} actual={actual} />
            <Line depth={1} op="Scan tickets" extra="every row, probe the hash" est={M} actual={M} />
          </>
        )}
        {st.pick === "merge" && (
          <>
            <Line depth={0} op="Merge Join" est={st.estimate} actual={actual} />
            {!sorted && <Line depth={1} op="Sort orders" extra="by order_id" est={st.estimate} actual={actual} />}
            <Line depth={sorted ? 1 : 2} op="Scan orders" extra="WHERE status = 'refund'" est={st.estimate} actual={actual} />
            <Line depth={1} op="Index scan tickets" extra="in order_id order" est={M} actual={M} />
          </>
        )}
      </div>

      <Note tone={st.slowdown > 1.05 ? "bad" : "good"}>
        {st.slowdown > 1.05
          ? `Based on its estimate the planner chose ${NAMES[st.pick].toLowerCase()}, but ${NAMES[st.best].toLowerCase()} is ${times(st.slowdown)} cheaper for the real ${fmt(actual)} rows.`
          : `${NAMES[st.pick]} is the cheapest plan for ${fmt(actual)} rows, and the planner picked it.`}
      </Note>
    </div>
  );
}

export function checkPlan(state: unknown, goal: Record<string, unknown>) {
  const s = state as PlanState | undefined;
  if (!s) return false;
  if (typeof goal.stale === "boolean" && s.stale !== goal.stale) return false;
  if (typeof goal.pick === "string" && s.pick !== goal.pick) return false;
  if (typeof goal.best === "string" && s.best !== goal.best) return false;
  if (typeof goal.slowdownMin === "number" && s.slowdown < goal.slowdownMin) return false;
  if (typeof goal.slowdownMax === "number" && s.slowdown > goal.slowdownMax) return false;
  if (typeof goal.actualMin === "number" && s.actual < goal.actualMin) return false;
  return true;
}

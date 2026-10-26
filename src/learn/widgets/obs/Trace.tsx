"use client";

import React, { useState } from "react";
import { Link2Off } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Toggle, useReport } from "./kit";

/**
 * A waterfall for one "place order" request in a food-delivery app, passing through five
 * services. Tap a span to see its own (self) time; the slowest hop is the one with the most time
 * of its own. Switching on parallel calls shortens the trace; switching off context propagation
 * breaks it into disconnected pieces.
 */

export interface Span {
  id: string;
  name: string;
  service: string;
  parent: string | null;
  start: number;
  dur: number;
  depth: number;
}

export function buildSpans(parallel: boolean): Span[] {
  const inv = { start: 20, dur: 100 };
  const price = parallel ? { start: 20, dur: 90 } : { start: inv.start + inv.dur + 4, dur: 90 };
  const pay0 = Math.max(inv.start + inv.dur, price.start + price.dur) + 5;
  const pay = { start: pay0, dur: 370 };
  const provider = { start: pay.start + 12, dur: 340 };
  const insert = { start: pay.start + pay.dur + 5, dur: 20 };
  const order = { start: 8, dur: insert.start + insert.dur + 5 - 8 };
  const gw = { start: 0, dur: order.start + order.dur + 10 };
  return [
    { id: "gw", name: "POST /orders", service: "gateway", parent: null, start: gw.start, dur: gw.dur, depth: 0 },
    { id: "order", name: "create_order", service: "order-svc", parent: "gw", start: order.start, dur: order.dur, depth: 1 },
    { id: "inv", name: "reserve_stock", service: "inventory-svc", parent: "order", start: inv.start, dur: inv.dur, depth: 2 },
    { id: "price", name: "quote_price", service: "pricing-svc", parent: "order", start: price.start, dur: price.dur, depth: 2 },
    { id: "pay", name: "charge", service: "payments-svc", parent: "order", start: pay.start, dur: pay.dur, depth: 2 },
    { id: "provider", name: "POST provider /v1/charge", service: "payments-svc", parent: "pay", start: provider.start, dur: provider.dur, depth: 3 },
    { id: "insert", name: "INSERT orders", service: "order-svc", parent: "order", start: insert.start, dur: insert.dur, depth: 2 },
  ];
}

/** self time = duration minus the time covered by direct children (union of their intervals) */
export function selfTime(spans: Span[], id: string): number {
  const s = spans.find((x) => x.id === id)!;
  const kids = spans.filter((x) => x.parent === id).sort((a, b) => a.start - b.start);
  let covered = 0;
  let edge = -Infinity;
  for (const k of kids) {
    const a = Math.max(k.start, edge);
    const b = k.start + k.dur;
    if (b > a) covered += b - a;
    edge = Math.max(edge, b);
  }
  return Math.max(0, s.dur - covered);
}

export interface TraceProps {
  parallel?: boolean;
  propagate?: boolean;
  /** Hide the toggles the lesson doesn't use. */
  toggles?: ("parallel" | "propagate")[];
}

export interface TraceState {
  selected: string | null;
  slowest: string;
  parallel: boolean;
  propagate: boolean;
  total: number;
}

export function Trace({ props, onChange, revealed, status }: WidgetProps<TraceProps>) {
  const [parallel, setParallel] = useState(props.parallel ?? false);
  const [propagate, setPropagate] = useState(props.propagate ?? true);
  const [selected, setSelected] = useState<string | null>(null);
  const spans = buildSpans(parallel);
  const total = spans[0].dur;
  const slowest = spans.reduce((a, b) => (selfTime(spans, b.id) > selfTime(spans, a.id) ? b : a)).id;
  const toggles = props.toggles ?? ["parallel", "propagate"];
  // without propagation the services after the order service cannot see the trace id
  const orphan = (s: Span) => !propagate && !["gw", "order", "insert"].includes(s.id);
  const connected = spans.filter((s) => !orphan(s));
  const lost = spans.filter(orphan);
  useReport(onChange, { selected, slowest, parallel, propagate, total } satisfies TraceState, `${selected}|${parallel}|${propagate}`);

  const info = spans.find((s) => s.id === selected);
  const scale = Math.max(total, 1);

  const row = (s: Span, faded?: boolean) => (
    <button
      key={s.id}
      type="button"
      disabled={revealed}
      onClick={() => setSelected(selected === s.id ? null : s.id)}
      aria-pressed={selected === s.id}
      className={`grid min-h-9 w-full grid-cols-[minmax(7rem,11rem)_1fr] items-center gap-2 rounded-lg px-1.5 text-left transition-colors disabled:cursor-default ${selected === s.id ? "bg-tint ring-1 ring-[var(--brand)]/50" : "hover:bg-surface-2"} ${faded ? "opacity-80" : ""}`}
    >
      <span className="min-w-0" style={{ paddingLeft: `${(faded ? 0 : s.depth) * 0.7}rem` }}>
        <span className="block truncate text-[12px] font-medium text-ink">{s.name}</span>
        <span className="block truncate font-mono text-[10px] text-ink-3">{s.service} · {s.dur}ms</span>
      </span>
      <span className="relative h-4 rounded bg-surface-2">
        <span
          className={`absolute inset-y-0 rounded ${status === "revealed" && s.id === slowest ? "bg-[#f59e0b] ring-2 ring-[var(--brand)]" : selected === s.id ? "bg-[#f59e0b]" : "bg-primary"}`}
          style={{ left: `${((faded ? 0 : s.start) / scale) * 100}%`, width: `${Math.max((s.dur / scale) * 100, 1.2)}%` }}
        />
      </span>
    </button>
  );

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {toggles.includes("parallel") && (
          <Toggle on={parallel} onClick={() => setParallel(!parallel)} disabled={revealed}>
            Call stock and pricing in parallel
          </Toggle>
        )}
        {toggles.includes("propagate") && (
          <Toggle on={propagate} onClick={() => setPropagate(!propagate)} disabled={revealed}>
            Pass the trace id along
          </Toggle>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <Caption>trace 7c2f19e0 · tap a span</Caption>
          <Readout label="total" value={`${total} ms`} accent />
        </div>
        <div className="mt-1.5 grid gap-0.5">{connected.map((s) => row(s))}</div>
        {lost.length > 0 && (
          <div className="mt-3 rounded-lg border border-dashed border-[var(--bad)]/60 p-2">
            <p className="flex items-center gap-1.5 px-1 text-[11.5px] font-medium text-bad">
              <Link2Off className="h-3.5 w-3.5" /> Orphans: these services started new, unrelated traces because they never received the trace id
            </p>
            <div className="mt-1 grid gap-0.5">{lost.map((s) => row(s, true))}</div>
          </div>
        )}
      </div>

      <Note className="mt-2" tone={info ? "accent" : "neutral"}>
        {info ? (
          <>
            <span className="font-mono text-[12px] font-semibold">{info.name}</span> in {info.service}: <strong>{info.dur} ms</strong> in total, <strong>{selfTime(spans, info.id)} ms</strong> of it its own (not waiting on a child span).
            {info.id === slowest && " This is the most self time in the trace: the slow hop."}
          </>
        ) : (
          "Tap a span. Its total includes everything it waited for; its self time is what is left after removing its children."
        )}
      </Note>
    </div>
  );
}

/** goal: { selected: "provider" } (tapped the slowest hop), { parallel: true, maxTotal } or { propagate: true } */
export function checkTrace(state: unknown, goal: Record<string, unknown>) {
  const s = state as TraceState | undefined;
  if (!s) return false;
  if (goal.slowest === true && s.selected !== s.slowest) return false;
  if (typeof goal.selected === "string" && s.selected !== goal.selected) return false;
  if (typeof goal.parallel === "boolean" && s.parallel !== goal.parallel) return false;
  if (typeof goal.propagate === "boolean" && s.propagate !== goal.propagate) return false;
  if (typeof goal.maxTotal === "number" && s.total > goal.maxTotal) return false;
  return ["slowest", "selected", "parallel", "propagate", "maxTotal"].some((k) => k in goal);
}

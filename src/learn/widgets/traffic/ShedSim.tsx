"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Pill, Readout, Slider, useInitialReport } from "../reliability/ui";
import { SHED, simShed, type Cls, type ShedPolicy } from "./sim";

/**
 * A shop's API is hit by 18 requests a second but can only do 10: 2 checkouts, 8 page views and
 * 8 from price-scraping bots. Callers give up if they wait longer than a second. Choose what the
 * server does about the excess and see who still gets served.
 */

const POLICIES: { id: ShedPolicy; label: string; blurb: string }[] = [
  { id: "fifo", label: "First come, first served", blurb: "One fair line. When it is full the newest arrivals are turned away. Everyone waits in the same queue, whoever they are." },
  { id: "newest", label: "Newest first", blurb: "When overloaded, serve the most recent request first. Old requests (whose callers have probably left) are the ones that wait." },
  { id: "priority", label: "Priority", blurb: "Checkout before browsing before bots. When the queue is full, the least important requests are dropped first." },
];

const CLASSES: { id: Cls; label: string }[] = [
  { id: "checkout", label: "Checkout" },
  { id: "browse", label: "Browsing" },
  { id: "bots", label: "Scraper bots" },
];

export interface ShedState {
  policy: ShedPolicy;
  capacity: number;
  checkout: number;
  browse: number;
  bots: number;
  goodput: number;
}

export function ShedSim({ props, onChange }: WidgetProps<{ policy?: ShedPolicy; capacity?: number }>) {
  const [policy, setPolicy] = useState<ShedPolicy>(props.policy ?? "fifo");
  const [capacity, setCapacity] = useState(props.capacity ?? SHED.capacity);
  const r = simShed(policy, capacity);
  const info = POLICIES.find((p) => p.id === policy) ?? POLICIES[0];
  const load = SHED.rates.checkout + SHED.rates.browse + SHED.rates.bots;

  const emit = (p: ShedPolicy, c: number) => {
    const x = simShed(p, c);
    onChange?.({ policy: p, capacity: c, checkout: x.rate.checkout, browse: x.rate.browse, bots: x.rate.bots, goodput: x.goodput } satisfies ShedState);
  };

  useInitialReport(() => emit(policy, capacity));

  return (
    <div className="w-full max-w-2xl">
      <Caption>Arriving each second: {SHED.rates.checkout} checkout · {SHED.rates.browse} browsing · {SHED.rates.bots} bots = {load}</Caption>
      <Slider
        className="mt-2"
        label="The server can finish (per second)"
        value={capacity}
        min={6}
        max={20}
        onChange={(v) => {
          setCapacity(v);
          emit(policy, v);
        }}
      />
      <Caption className="mt-3">When there is too much work…</Caption>
      <div className="mt-2 flex flex-wrap gap-2">
        {POLICIES.map((p) => (
          <Pill
            key={p.id}
            on={policy === p.id}
            onClick={() => {
              setPolicy(p.id);
              emit(p.id, capacity);
            }}
          >
            {p.label}
          </Pill>
        ))}
      </div>
      <p className="mt-2 text-sm text-ink-2">{info.blurb}</p>

      <div className="mt-3 space-y-2 rounded-xl border border-line bg-surface p-3">
        {CLASSES.map((c) => {
          const v = r.rate[c.id];
          return (
            <div key={c.id}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-ink">{c.label}</span>
                <span className="font-mono tabular-nums text-ink">{Math.round(v * 100)}% served</span>
              </div>
              <div className="mt-1 h-3.5 overflow-hidden rounded-full bg-surface-2 ring-1 ring-[var(--line)]">
                <div className={`h-full rounded-full ${c.id === "checkout" ? "bg-[var(--brand)]" : c.id === "browse" ? "bg-[var(--brand)]/70" : "bg-[var(--brand)]/45"}`} style={{ width: `${Math.max(v * 100, v > 0 ? 1.5 : 0)}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Useful work done" value={`${Math.round(r.goodput * 100)}%`} />
        <Readout label="Turned away at the door" value={r.refused} />
        <Readout label="Served too late" value={r.stale} accent={r.stale === 0} />
      </div>
      <div className="mt-3" aria-live="polite">
        {policy === "fifo" && r.stale > 100 ? (
          <Note tone="bad">The queue is full of requests that have already waited longer than their callers will. The server works flat out on answers nobody reads: capacity is spent, yet almost nothing useful is delivered.</Note>
        ) : policy === "priority" && r.rate.checkout >= 0.99 ? (
          <Note tone="good">Checkouts are untouched. The work that matters most is served first, and the bots absorb the loss.</Note>
        ) : policy === "newest" ? (
          <Note>Fresh requests get answered, so waste drops, but the important checkouts are served no better than the bots. The server doesn&apos;t know who is who.</Note>
        ) : r.goodput >= 0.99 ? (
          <Note tone="good">There is enough capacity for everybody, so there is nothing to shed.</Note>
        ) : null}
      </div>
    </div>
  );
}

export function checkShed(state: unknown, goal: Record<string, unknown>) {
  const st = state as ShedState | undefined;
  if (!st) return false;
  if (goal.policy !== undefined && st.policy !== goal.policy) return false;
  if (typeof goal.minCheckout === "number" && st.checkout < goal.minCheckout) return false;
  if (typeof goal.maxCapacity === "number" && st.capacity > goal.maxCapacity) return false;
  if (typeof goal.minGoodput === "number" && st.goodput < goal.minGoodput) return false;
  return true;
}

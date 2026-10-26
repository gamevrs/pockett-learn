"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Bars, Caption, Note, Pill, Readout, Slider, useInitialReport } from "../reliability/ui";
import { arrivals, QUEUE, r1, simQueue, type QueuePolicy, type Traffic } from "./sim";

/**
 * A queue between a producer and a consumer, over one minute. Pick how fast work arrives, how fast
 * the consumer handles it, and what the queue does when it fills: grow without limit, make the
 * producer wait (backpressure), turn the newest arrivals away, or throw the oldest away.
 */

const TRAFFIC: { id: Traffic; label: string }[] = [
  { id: "steady", label: "Steady 8/s" },
  { id: "burst", label: "A 5-second burst" },
  { id: "overload", label: "Constant overload 14/s" },
];

const POLICIES: { id: QueuePolicy; label: string; blurb: string }[] = [
  { id: "unbounded", label: "Unbounded", blurb: "The queue grows as long as it needs to. Nothing is refused, and nothing is fast." },
  { id: "block", label: "Block the producer", blurb: "When the queue is full the producer must wait: it is held back until there is room. This is backpressure." },
  { id: "dropnew", label: "Refuse new work", blurb: "When the queue is full, new arrivals are rejected on the spot. The producer is told and can react." },
  { id: "dropold", label: "Drop the oldest", blurb: "When the queue is full, the oldest waiting item is thrown away to make room for the newest." },
];

export interface QueueState {
  traffic: Traffic;
  service: number;
  policy: QueuePolicy;
  bound: number;
  peak: number;
  maxWait: number;
  dropped: number;
  heldPeak: number;
}

export function QueueSim({ props, onChange }: WidgetProps<{ traffic?: Traffic; service?: number; policy?: QueuePolicy; policies?: QueuePolicy[]; bound?: number }>) {
  const [traffic, setTraffic] = useState<Traffic>(props.traffic ?? "burst");
  const [service, setService] = useState(props.service ?? 10);
  const policies = POLICIES.filter((p) => !props.policies || props.policies.includes(p.id));
  const [policy, setPolicy] = useState<QueuePolicy>(props.policy ?? policies[0].id);
  const [bound, setBound] = useState(props.bound ?? 30);
  const r = simQueue(traffic, service, policy, bound);
  const info = POLICIES.find((p) => p.id === policy) ?? POLICIES[0];

  const emit = (t: Traffic, s: number, p: QueuePolicy, b: number) => {
    const x = simQueue(t, s, p, b);
    onChange?.({ traffic: t, service: s, policy: p, bound: b, peak: x.peak, maxWait: r1(x.maxWait), dropped: x.dropped, heldPeak: x.heldPeak } satisfies QueueState);
  };

  useInitialReport(() => emit(traffic, service, policy, bound));

  const arrivalsBars = Array.from({ length: QUEUE.seconds }, (_, t) => arrivals(traffic, t));
  const top = Math.max(r.peak, bound * (policy === "unbounded" ? 0 : 1), 20);

  return (
    <div className="w-full max-w-2xl">
      <Caption>Work arriving</Caption>
      <div className="mt-2 flex flex-wrap gap-2">
        {TRAFFIC.map((t) => (
          <Pill
            key={t.id}
            on={traffic === t.id}
            onClick={() => {
              setTraffic(t.id);
              emit(t.id, service, policy, bound);
            }}
          >
            {t.label}
          </Pill>
        ))}
      </div>
      <div className="mt-3 grid gap-3 min-[520px]:grid-cols-2">
        <Slider
          label="Consumer handles (per second)"
          value={service}
          min={4}
          max={20}
          onChange={(v) => {
            setService(v);
            emit(traffic, v, policy, bound);
          }}
        />
        {policy !== "unbounded" && (
          <Slider
            label="Queue holds at most"
            value={bound}
            min={10}
            max={60}
            step={5}
            onChange={(v) => {
              setBound(v);
              emit(traffic, service, policy, v);
            }}
          />
        )}
      </div>

      {policies.length > 1 && (
        <>
          <Caption className="mt-4">When the queue is full…</Caption>
          <div className="mt-2 flex flex-wrap gap-2">
            {policies.map((p) => (
              <Pill
                key={p.id}
                on={policy === p.id}
                onClick={() => {
                  setPolicy(p.id);
                  emit(traffic, service, p.id, bound);
                }}
              >
                {p.label}
              </Pill>
            ))}
          </div>
          <p className="mt-2 text-sm text-ink-2">{info.blurb}</p>
        </>
      )}

      <Caption className="mt-4">Arrivals per second</Caption>
      <div className="mt-1">
        <Bars values={arrivalsBars} max={40} limit={service} limitLabel={`consumer ${service}/s`} tone={(v) => (v > service ? "warn" : "muted")} height={64} label="Arrivals per second" />
      </div>
      <Caption className="mt-3">Items waiting in the queue</Caption>
      <div className="mt-1">
        <Bars
          values={r.depth}
          max={top}
          limit={policy === "unbounded" ? undefined : bound}
          limitLabel={policy === "unbounded" ? undefined : `limit ${bound}`}
          tone={(v) => (policy !== "unbounded" && v >= bound ? "bad" : v > 0 ? "ok" : "muted")}
          height={104}
          label="Queue depth per second"
          axis={[["0 s", 0.03], ["30 s", 0.5], ["60 s", 0.96]]}
        />
      </div>
      {policy === "block" && (
        <>
          <Caption className="mt-3">Work held back at the producer</Caption>
          <div className="mt-1">
            <Bars values={r.held} max={Math.max(40, r.heldPeak)} tone={() => "warn"} height={58} label="Work held at the producer" />
          </div>
        </>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Deepest queue" value={r.peak} accent={policy !== "unbounded" || r.peak < 40} />
        <Readout label="Longest wait" value={`${r1(r.maxWait)} s`} accent={r.maxWait <= 3} />
        {policy !== "unbounded" && policy !== "block" && <Readout label="Thrown away" value={r.dropped} accent={r.dropped === 0} />}
        {policy === "block" && <Readout label="Producer held back" value={r.heldPeak} />}
      </div>
      <div className="mt-3" aria-live="polite">
        {policy === "unbounded" && r.depth[QUEUE.seconds - 1] > 60 ? (
          <Note tone="bad">Work arrives faster than it leaves, so the queue just keeps growing. Items at the back wait {r1(r.depth[QUEUE.seconds - 1] / service)} s and rising; memory grows with them. A queue cannot fix more work than the consumer can do.</Note>
        ) : policy === "unbounded" && r.peak > 30 ? (
          <Note>The burst piles up and then drains at {service} per second. The queue turned a spike into a delay: the longest wait was {r1(r.maxWait)} s.</Note>
        ) : policy === "unbounded" ? (
          <Note tone="good">The consumer keeps up, so the queue stays almost empty.</Note>
        ) : policy === "block" ? (
          <Note>Nothing is lost and the queue stays small; the cost moves to the producer, which has to wait. {r.heldPeak > 0 ? `Up to ${r.heldPeak} items were held back at once.` : "Here the producer never had to wait."}</Note>
        ) : r.dropped > 0 ? (
          <Note tone="bad">{r.dropped} items were thrown away. {policy === "dropnew" ? "The producer can see the refusals and slow down or retry later." : "The ones kept are the freshest, but the oldest are gone silently."}</Note>
        ) : (
          <Note tone="good">The queue never filled, so nothing was thrown away.</Note>
        )}
      </div>
    </div>
  );
}

export function checkQueue(state: unknown, goal: Record<string, unknown>) {
  const st = state as QueueState | undefined;
  if (!st) return false;
  if (goal.policy !== undefined && st.policy !== goal.policy) return false;
  if (goal.traffic !== undefined && st.traffic !== goal.traffic) return false;
  if (typeof goal.maxPeak === "number" && st.peak > goal.maxPeak) return false;
  if (typeof goal.maxWait === "number" && st.maxWait > goal.maxWait) return false;
  if (typeof goal.maxDropped === "number" && st.dropped > goal.maxDropped) return false;
  if (typeof goal.minService === "number" && st.service < goal.minService) return false;
  return true;
}

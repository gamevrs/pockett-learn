"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Bars, Caption, Note, Pill, Readout, Slider, useInitialReport } from "./ui";
import { simStorm, STORM, type StormPolicy } from "./sim";

/**
 * A stadium ticket sale opens and the whole crowd arrives inside one second. The ticket service
 * absorbs 80 attempts a second; those that fail retry by the chosen policy. The chart is attempts
 * per second against the service's capacity.
 */

const POLICIES: { id: StormPolicy; label: string }[] = [
  { id: "none", label: "No retry" },
  { id: "now", label: "Retry at once" },
  { id: "fixed", label: "Fixed 2 s" },
  { id: "exp", label: "Exponential" },
  { id: "jitter", label: "Exponential + jitter" },
];

export interface StormState {
  policy: StormPolicy;
  clients: number;
  lost: number;
  attempts: number;
  retryPeak: number;
}

export function Storm({ props, onChange }: WidgetProps<{ policy?: StormPolicy; clients?: number; policies?: StormPolicy[] }>) {
  const [policy, setPolicy] = useState<StormPolicy>(props.policy ?? "fixed");
  const [clients, setClients] = useState(props.clients ?? 200);
  const r = simStorm(clients, policy);
  const list = POLICIES.filter((p) => !props.policies || props.policies.includes(p.id));

  const report = (p: StormPolicy, c: number) => {
    const x = simStorm(c, p);
    onChange?.({ policy: p, clients: c, lost: x.lost, attempts: x.attempts, retryPeak: x.retryPeak } satisfies StormState);
  };

  useInitialReport(() => report(policy, clients));

  return (
    <div className="w-full max-w-2xl">
      <Caption>When a request fails, the client…</Caption>
      <div className="mt-2 flex flex-wrap gap-2">
        {list.map((p) => (
          <Pill
            key={p.id}
            on={policy === p.id}
            onClick={() => {
              setPolicy(p.id);
              report(p.id, clients);
            }}
          >
            {p.label}
          </Pill>
        ))}
      </div>
      <Slider
        className="mt-3"
        label="Fans arriving in the first second"
        value={clients}
        min={100}
        max={300}
        step={20}
        onChange={(v) => {
          setClients(v);
          report(policy, v);
        }}
      />

      <p className="mb-1 mt-3 text-xs text-ink-2">Attempts per second hitting the ticket service (36 s):</p>
      <Bars
        values={r.load}
        max={Math.max(320, r.peak)}
        limit={STORM.cap * 2}
        limitLabel="capacity 80/s"
        tone={(v, i) => (v > STORM.cap * 2 ? (r.collapsed[i] ? "bad" : "warn") : "ok")}
        height={130}
        label="Attempts per second"
        axis={[
          ["0 s", 0.02],
          ["10 s", 10 / 36],
          ["20 s", 20 / 36],
          ["30 s", 30 / 36],
        ]}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Attempts per fan" value={(r.attempts / r.total).toFixed(1)} />
        <Readout label="Retry peak" value={`${r.retryPeak}/s`} accent={r.retryPeak <= STORM.cap * 2} />
        <Readout label="Gave up" value={r.lost} accent={r.lost === 0} />
        <Readout label="Last fan in at" value={r.lost > 0 ? "never" : `${r.finishedAt.toFixed(1)} s`} />
      </div>
      <div className="mt-3" aria-live="polite">
        {policy === "now" ? (
          <Note tone="bad">Instant retries burn all {STORM.maxAttempts} attempts within a second while the service is still buried. It sees {r.peak} attempts a second and thrashes.</Note>
        ) : policy === "none" ? (
          <Note>No retries: whoever the service could not take in the first second is simply lost.</Note>
        ) : r.retryPeak > STORM.cap * 2 ? (
          <Note tone="bad">Everyone who failed together waits the same time and comes back together. The service sees repeating spikes of up to {r.retryPeak} a second against a capacity of 80.</Note>
        ) : (
          <Note tone="good">Random waits spread the retries out, so the service sees about its capacity at any moment and everyone gets through{r.lost === 0 ? "" : ", almost"}.</Note>
        )}
      </div>
    </div>
  );
}

export function checkStorm(state: unknown, goal: Record<string, unknown>) {
  const st = state as StormState | undefined;
  if (!st) return false;
  if (goal.policy !== undefined && st.policy !== goal.policy) return false;
  if (typeof goal.maxLost === "number" && st.lost > goal.maxLost) return false;
  if (typeof goal.maxRetryPeak === "number" && st.retryPeak > goal.maxRetryPeak) return false;
  if (typeof goal.minClients === "number" && st.clients < goal.minClients) return false;
  return true;
}

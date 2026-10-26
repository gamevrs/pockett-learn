"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Slider, useInitialReport } from "../reliability/ui";
import { r1 } from "./sim";

/**
 * Little's law as a picture. Things arrive at a rate λ and each stays W; the number inside the
 * system at any moment is L = λ × W. A fixed set of slots (bikes, workers) shows when that number
 * outgrows what you own.
 */

interface Scenario {
  title: string;
  thing: string;
  holder: string;
  rateLabel: string;
  rateUnit: string;
  rate: [number, number, number, number];
  timeLabel: string;
  timeUnit: string;
  time: [number, number, number, number];
  capacity: number;
  cols: number;
  overflow: string;
}

const SCENARIOS: Record<string, Scenario> = {
  bikes: {
    title: "City bike-share station network",
    thing: "rider",
    holder: "bikes out on the road",
    rateLabel: "Rentals starting",
    rateUnit: "per minute",
    rate: [1, 12, 1, 3],
    timeLabel: "Average trip",
    timeUnit: "min",
    time: [2, 30, 1, 10],
    capacity: 40,
    cols: 10,
    overflow: "riders find the docks empty",
  },
  server: {
    title: "A web server with a pool of workers",
    thing: "request",
    holder: "requests in flight",
    rateLabel: "Requests arriving",
    rateUnit: "per second",
    rate: [10, 400, 10, 100],
    timeLabel: "Time to handle one",
    timeUnit: "s",
    time: [0.05, 1, 0.05, 0.2],
    capacity: 40,
    cols: 10,
    overflow: "requests wait or get refused",
  },
};

export interface LittlesState {
  rate: number;
  time: number;
  load: number;
  capacity: number;
  overloaded: boolean;
}

export function Littles({ props, onChange }: WidgetProps<{ scenario?: "bikes" | "server"; rate?: number; time?: number; capacity?: number }>) {
  const sc = SCENARIOS[props.scenario ?? "bikes"];
  const capacity = props.capacity ?? sc.capacity;
  const [rate, setRate] = useState(props.rate ?? sc.rate[3]);
  const [time, setTime] = useState(props.time ?? sc.time[3]);
  const load = rate * time;
  const filled = Math.min(capacity, Math.round(load));
  const over = Math.max(0, Math.round(load) - capacity);

  const report = (r: number, t: number) => onChange?.({ rate: r, time: t, load: r1(r * t), capacity, overloaded: r * t > capacity } satisfies LittlesState);

  useInitialReport(() => report(rate, time));

  return (
    <div className="w-full max-w-2xl">
      <Caption>{sc.title}</Caption>
      <div className="mt-2 grid gap-3 min-[520px]:grid-cols-2">
        <Slider
          label={`${sc.rateLabel} (${sc.rateUnit})`}
          value={rate}
          min={sc.rate[0]}
          max={sc.rate[1]}
          step={sc.rate[2]}
          onChange={(v) => {
            setRate(v);
            report(v, time);
          }}
        />
        <Slider
          label={`${sc.timeLabel} (${sc.timeUnit})`}
          value={time}
          min={sc.time[0]}
          max={sc.time[1]}
          step={sc.time[2]}
          format={(v) => String(r1(v))}
          onChange={(v) => {
            setTime(v);
            report(rate, v);
          }}
        />
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <p className="text-center font-mono text-sm text-ink">
          L = λ × W = {rate} × {r1(time)} = <span className="font-semibold">{r1(load)}</span>
        </p>
        <div className="mx-auto mt-2 grid max-w-md gap-1" style={{ gridTemplateColumns: `repeat(${sc.cols}, minmax(0, 1fr))` }} role="img" aria-label={`${filled} of ${capacity} slots in use`}>
          {Array.from({ length: capacity }, (_, i) => (
            <span key={i} className={`aspect-square rounded-[4px] border ${i < filled ? "border-[var(--brand)] bg-primary" : "border-dashed border-[var(--line-strong)]"}`} />
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-ink-2">
          {capacity} {sc.holder === "bikes out on the road" ? "bikes in the fleet" : "workers in the pool"}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label={sc.holder} value={r1(load)} accent={load <= capacity} />
        <Readout label="You own" value={capacity} />
        <Readout label="Busy" value={`${Math.round((load / capacity) * 100)}%`} />
      </div>
      <div className="mt-3" aria-live="polite">
        {over > 0 ? (
          <Note tone="bad">
            About {over} {sc.overflow}: you need {Math.round(load)} but own {capacity}. More arrivals or longer stays both push it up.
          </Note>
        ) : (
          <Note tone="good">It fits: {Math.round(load)} of {capacity} are in use at any moment, on average.</Note>
        )}
      </div>
    </div>
  );
}

export function checkLittles(state: unknown, goal: Record<string, unknown>) {
  const st = state as LittlesState | undefined;
  if (!st) return false;
  if (typeof goal.overloaded === "boolean" && st.overloaded !== goal.overloaded) return false;
  if (typeof goal.minLoad === "number" && st.load < goal.minLoad) return false;
  if (typeof goal.maxLoad === "number" && st.load > goal.maxLoad) return false;
  if (typeof goal.minRate === "number" && st.rate < goal.minRate) return false;
  return true;
}

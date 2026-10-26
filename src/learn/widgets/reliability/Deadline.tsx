"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Note, Readout, Segmented, Slider, useInitialReport } from "./ui";
import { num, simDeadline, USER_PATIENCE } from "./sim";

/**
 * One checkout request travels Gateway -> Orders -> Inventory -> Warehouse. The shopper gives up
 * after 4 seconds. With per-call timeouts every service waits on its own clock and the callee never
 * hears the caller left; with a deadline, one absolute time travels with the request.
 */

const SPAN = 9;
const at = (s: number) => `${Math.min(100, (s / SPAN) * 100)}%`;

type Mode = "percall" | "deadline";

export interface DeadlineState {
  mode: Mode;
  latency: number;
  wasted: number;
  answered: boolean;
}

export function Deadline({ props, onChange }: WidgetProps<{ mode?: Mode; latency?: number; lockMode?: boolean }>) {
  const [mode, setMode] = useState<Mode>(props.mode ?? "percall");
  const [latency, setLatency] = useState(props.latency ?? 6);
  const [perCall, setPerCall] = useState(5);
  const r = simDeadline(mode, latency, perCall);

  const report = (m: Mode, l: number, p: number) => {
    const x = simDeadline(m, l, p);
    onChange?.({ mode: m, latency: l, wasted: Math.round(x.wasted * 10) / 10, answered: x.answered } satisfies DeadlineState);
  };

  useInitialReport(() => report(mode, latency, perCall));

  return (
    <div className="w-full max-w-2xl">
      {!props.lockMode && (
        <Segmented
          label="How timeouts are set"
          value={mode}
          options={[
            { id: "percall", label: "Per-call timeouts" },
            { id: "deadline", label: "One deadline" },
          ]}
          onChange={(m) => {
            setMode(m);
            report(m, latency, perCall);
          }}
        />
      )}
      <div className="mt-3 grid gap-3 min-[520px]:grid-cols-2">
        <Slider
          label="Warehouse takes"
          value={latency}
          min={0.2}
          max={8}
          step={0.1}
          format={(v) => `${num(v)} s`}
          onChange={(v) => {
            setLatency(v);
            report(mode, v, perCall);
          }}
        />
        {mode === "percall" && (
          <Slider
            label="Each service's own timeout"
            value={perCall}
            min={1}
            max={6}
            step={0.5}
            format={(v) => `${num(v)} s`}
            onChange={(v) => {
              setPerCall(v);
              report(mode, latency, v);
            }}
          />
        )}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <div className="relative">
          <div className="space-y-1.5">
            {r.spans.map((s) => {
              const okEnd = Math.min(s.end, USER_PATIENCE);
              return (
                <div key={s.name} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-xs text-ink-2">{s.name}</span>
                  <div className="relative h-5 flex-1 rounded bg-surface-2">
                    <div className="absolute inset-y-0 rounded-l bg-[var(--brand)]/80" style={{ left: at(s.start), width: `calc(${at(okEnd)} - ${at(s.start)})` }} />
                    {s.end > USER_PATIENCE && <div className="absolute inset-y-0 rounded-r bg-[var(--bad)]" style={{ left: at(USER_PATIENCE), width: `calc(${at(s.end)} - ${at(USER_PATIENCE)})` }} />}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 left-[5.5rem]">
            <div className="absolute -top-1 bottom-0 border-l-2 border-dashed border-ink" style={{ left: at(USER_PATIENCE) }} />
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-ink-3">
          <span className="w-20 shrink-0" />
          <span className="flex flex-1 justify-between">
            <span>0 s</span>
            <span>{SPAN} s</span>
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-2">
          Dashed line: the shopper gives up at {USER_PATIENCE} s. <span className="text-[var(--bad)]">Red</span> is work still running after that.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Shopper waited" value={`${num(r.waited)} s`} />
        <Readout label="Result" value={r.answered ? "answered" : "gave up"} accent={r.answered} />
        <Readout label="Wasted work" value={`${num(r.wasted)} s`} accent={r.wasted === 0} />
      </div>
      <div className="mt-3" aria-live="polite">
        {r.wasted > 0 ? (
          <Note tone="bad">The shopper is long gone, but the services keep working for a result nobody will read. Each one is holding a worker, a connection and probably a lock.</Note>
        ) : r.answered ? (
          <Note tone="good">Fast enough: everyone finishes inside the shopper&apos;s patience.</Note>
        ) : (
          <Note tone="good">The deadline reaches every hop, so all four stop together at {USER_PATIENCE} s. Nothing runs for a user who left.</Note>
        )}
      </div>
    </div>
  );
}

export function checkDeadline(state: unknown, goal: Record<string, unknown>) {
  const st = state as DeadlineState | undefined;
  if (!st) return false;
  if (goal.mode !== undefined && st.mode !== goal.mode) return false;
  if (typeof goal.minLatency === "number" && st.latency < goal.minLatency) return false;
  if (typeof goal.maxWasted === "number" && st.wasted > goal.maxWasted) return false;
  if (typeof goal.minWasted === "number" && st.wasted < goal.minWasted) return false;
  if (typeof goal.answered === "boolean" && st.answered !== goal.answered) return false;
  return true;
}

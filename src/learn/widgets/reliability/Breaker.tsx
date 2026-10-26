"use client";

import React, { useState } from "react";
import { Ban, CheckCircle2, Info, Pause, Play, RotateCcw, XCircle } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Pill, Readout, Slider, useInitialReport, useTicker } from "./ui";
import { breakerSend, breakerTick, newBreaker, type Breaker as BreakerModel, type BreakerState } from "./sim";

/**
 * A circuit breaker you can trip. The app calls a dependency through the breaker; flip the
 * dependency between healthy and failing, send requests and let the clock run, and watch the breaker
 * move between closed, open and half-open.
 */

export interface BreakerProps {
  threshold?: number;
  cooldown?: number;
  /** Hide the threshold and cool-down sliders. */
  fixed?: boolean;
}

export interface BreakerWidgetState {
  state: BreakerState;
  everOpened: boolean;
  recovered: boolean;
  blocked: number;
  reached: number;
}

const NODES: { id: BreakerState; label: string; x: number; y: number }[] = [
  { id: "closed", label: "Closed", x: 62, y: 30 },
  { id: "open", label: "Open", x: 338, y: 30 },
  { id: "half", label: "Half-open", x: 200, y: 112 },
];

export function Breaker({ props, onChange }: WidgetProps<BreakerProps>) {
  const [threshold, setThreshold] = useState(props.threshold ?? 3);
  const [cooldown, setCooldown] = useState(props.cooldown ?? 4);
  const [b, setB] = useState<BreakerModel>(() => newBreaker(props.threshold ?? 3, props.cooldown ?? 4));
  const [auto, setAuto] = useState(false);

  const commit = (n: BreakerModel) => {
    setB(n);
    onChange?.({ state: n.state, everOpened: n.everOpened, recovered: n.recovered, blocked: n.blocked, reached: n.reached } satisfies BreakerWidgetState);
  };
  const send = () => commit(breakerSend(b));
  const wait = () => commit(breakerTick(b));
  // auto mode: one second passes and one request is made
  useInitialReport(() => commit(b));
  useTicker(auto, 900, () => commit(breakerSend(breakerTick(b))));

  const reset = () => {
    setAuto(false);
    commit(newBreaker(threshold, cooldown));
  };
  const left = Math.max(0, b.cooldown - (b.now - b.openedAt));

  return (
    <div className="w-full max-w-2xl">
      <div className="rounded-xl border border-line bg-surface p-2">
        <svg viewBox="0 0 400 152" className="mx-auto w-full max-w-[480px]" role="img" aria-label={`Circuit breaker state machine. Current state: ${b.state === "half" ? "half-open" : b.state}.`}>
          <defs>
            <marker id="brk-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="var(--ink-3)" />
            </marker>
          </defs>
          <g stroke="var(--ink-3)" strokeWidth="1.5" fill="none" markerEnd="url(#brk-arrow)">
            <line x1="112" y1="30" x2="286" y2="30" />
            <line x1="316" y1="50" x2="246" y2="94" />
            <line x1="154" y1="94" x2="84" y2="50" />
            <path d="M250 124 Q384 140 366 50" />
          </g>
          <g fill="var(--ink-2)" fontSize="11" fontFamily="var(--font-mono), monospace">
            <text x="199" y="21" textAnchor="middle">{threshold} failures in a row</text>
            <text x="284" y="78" textAnchor="start">cooled down</text>
            <text x="106" y="80" textAnchor="end">test call ok</text>
            <text x="300" y="146" textAnchor="middle">test call fails</text>
          </g>
          {NODES.map((n) => {
            const on = b.state === n.id;
            return (
              <g key={n.id}>
                <rect x={n.x - 46} y={n.y - 18} width="92" height="36" rx="18" fill={on ? "var(--primary)" : "var(--surface-2)"} stroke={on ? "var(--brand)" : "var(--line-strong)"} strokeWidth={on ? 2 : 1} />
                <text x={n.x} y={n.y + 4.5} textAnchor="middle" fontSize="12.5" fontWeight="600" fill={on ? "var(--primary-ink)" : "var(--ink)"}>
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Pill on onClick={send}>
          Send request
        </Pill>
        <Pill onClick={wait}>Wait 1 s</Pill>
        <Pill on={!b.up} onClick={() => commit({ ...b, up: !b.up })} label="Toggle dependency health">
          Dependency: {b.up ? "healthy" : "failing"}
        </Pill>
        <Pill on={auto} onClick={() => setAuto(!auto)} label="Run automatically">
          {auto ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} Auto
        </Pill>
        <Pill onClick={reset} label="Reset">
          <RotateCcw className="h-4 w-4" />
        </Pill>
      </div>

      {!props.fixed && (
        <div className="mt-3 grid gap-3 min-[520px]:grid-cols-2">
          <Slider
            label="Failures in a row to trip"
            value={threshold}
            min={2}
            max={6}
            onChange={(v) => {
              setThreshold(v);
              commit(newBreaker(v, cooldown));
              setAuto(false);
            }}
          />
          <Slider
            label="Cool-down before a test call"
            value={cooldown}
            min={2}
            max={10}
            format={(v) => `${v} s`}
            onChange={(v) => {
              setCooldown(v);
              commit(newBreaker(threshold, v));
              setAuto(false);
            }}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Clock" value={`${b.now} s`} />
        <Readout label="Failures in a row" value={`${b.failures}/${b.threshold}`} accent={b.state === "closed" && b.failures === 0} />
        {b.state === "open" && <Readout label="Test call in" value={`${left} s`} accent />}
        <Readout label="Calls that reached it" value={b.reached} />
        <Readout label="Refused at once" value={b.blocked} />
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-2.5">
        <Caption>Log</Caption>
        <ul className="mt-1 min-h-[7.5rem] space-y-1 text-[13px]" aria-live="polite">
          {b.log.length === 0 && <li className="text-ink-3">Nothing yet. Send a request, then make the dependency fail.</li>}
          {b.log.map((l) => (
            <li key={l.id} className="flex items-start gap-2 text-ink-2">
              {l.kind === "ok" || l.kind === "probe-ok" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" />
              ) : l.kind === "blocked" ? (
                <Ban className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
              ) : l.kind === "note" ? (
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--bad)]" />
              )}
              <span className="min-w-0 font-mono text-[12px] text-ink">{l.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function checkBreaker(state: unknown, goal: Record<string, unknown>) {
  const st = state as BreakerWidgetState | undefined;
  if (!st) return false;
  if (goal.state !== undefined && st.state !== goal.state) return false;
  if (typeof goal.everOpened === "boolean" && st.everOpened !== goal.everOpened) return false;
  if (typeof goal.recovered === "boolean" && st.recovered !== goal.recovered) return false;
  if (typeof goal.minBlocked === "number" && st.blocked < goal.minBlocked) return false;
  return true;
}

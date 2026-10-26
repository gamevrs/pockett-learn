"use client";

import React, { useState } from "react";
import { Dices } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Pill, Readout, Slider, useInitialReport } from "./ui";
import { backoffCeiling, backoffDelay, rng, type Backoff as Strategy } from "./sim";

/**
 * How long to wait between retries. Pick a strategy, a base delay, a cap and a number of attempts:
 * each row shows the longest wait that strategy allows after that failure (pale bar) and the one it
 * actually drew this time (solid bar). Jitter strategies draw a different number every roll.
 */

const LABEL: Record<Strategy, string> = { fixed: "Fixed", exp: "Exponential", full: "Full jitter", equal: "Equal jitter" };

export interface BackoffProps {
  strategies?: Strategy[];
  strategy?: Strategy;
  base?: number;
  cap?: number;
  attempts?: number;
  /** Hide the sliders the lesson doesn't need. */
  fixedControls?: boolean;
}

export interface BackoffState {
  strategy: Strategy;
  base: number;
  cap: number;
  attempts: number;
  maxWait: number;
  worstTotal: number;
}

const fmt = (ms: number) => (ms >= 1000 ? `${Math.round(ms / 100) / 10} s` : `${Math.round(ms)} ms`);

export function Backoff({ props, onChange }: WidgetProps<BackoffProps>) {
  const strategies = props.strategies ?? (["fixed", "exp", "full", "equal"] as Strategy[]);
  const [strategy, setStrategy] = useState<Strategy>(props.strategy ?? strategies[0]);
  const [base, setBase] = useState(props.base ?? 500);
  const [cap, setCap] = useState(props.cap ?? 8000);
  const [attempts, setAttempts] = useState(props.attempts ?? 6);
  const [seed, setSeed] = useState(3);

  const roll = rng(seed);
  const rows = Array.from({ length: attempts }, (_, i) => {
    const k = i + 1;
    const ceil = backoffCeiling(strategy, k, base, cap);
    return { k, ceil, wait: backoffDelay(strategy, k, base, cap, roll()) };
  });
  const scale = Math.max(...rows.map((r) => r.ceil), 1);
  const total = rows.reduce((a, r) => a + r.wait, 0);
  const worst = rows.reduce((a, r) => a + r.ceil, 0);
  const jittery = strategy === "full" || strategy === "equal";

  const report = (s: Strategy, b: number, c: number, n: number) => {
    const ceils = Array.from({ length: n }, (_, i) => backoffCeiling(s, i + 1, b, c));
    onChange?.({ strategy: s, base: b, cap: c, attempts: n, maxWait: Math.max(...ceils), worstTotal: ceils.reduce((a, x) => a + x, 0) } satisfies BackoffState);
  };

  useInitialReport(() => report(strategy, base, cap, attempts));

  return (
    <div className="w-full max-w-2xl">
      <Caption>Strategy</Caption>
      <div className="mt-2 flex flex-wrap gap-2">
        {strategies.map((s) => (
          <Pill
            key={s}
            on={strategy === s}
            onClick={() => {
              setStrategy(s);
              report(s, base, cap, attempts);
            }}
          >
            {LABEL[s]}
          </Pill>
        ))}
      </div>

      {!props.fixedControls && (
        <div className="mt-3 grid gap-3 min-[560px]:grid-cols-3">
          <Slider
            label="Base delay"
            value={base}
            min={100}
            max={2000}
            step={100}
            format={fmt}
            onChange={(v) => {
              setBase(v);
              report(strategy, v, cap, attempts);
            }}
          />
          <Slider
            label="Cap"
            value={cap}
            min={1000}
            max={30000}
            step={1000}
            format={fmt}
            onChange={(v) => {
              setCap(v);
              report(strategy, base, v, attempts);
            }}
          />
          <Slider
            label="Attempts"
            value={attempts}
            min={2}
            max={8}
            onChange={(v) => {
              setAttempts(v);
              report(strategy, base, cap, v);
            }}
          />
        </div>
      )}

      <div className="mt-3 space-y-1.5 rounded-xl border border-line bg-surface p-3">
        {rows.map((r) => (
          <div key={r.k} className="flex items-center gap-2">
            <span className="w-16 shrink-0 font-mono text-[11px] text-ink-3">fail #{r.k}</span>
            <div className="relative h-5 flex-1 rounded bg-surface-2">
              <div className="absolute inset-y-0 left-0 rounded bg-[var(--brand)]/25" style={{ width: `${(r.ceil / scale) * 100}%` }} />
              <div className="absolute inset-y-0 left-0 rounded bg-[var(--brand)]" style={{ width: `${Math.max(1.5, (r.wait / scale) * 100)}%` }} />
            </div>
            <span className="w-[4.6rem] shrink-0 text-right font-mono text-[11px] tabular-nums text-ink">{fmt(r.wait)}</span>
          </div>
        ))}
        <p className="pt-1 text-xs text-ink-2">
          {jittery ? "Pale bar: the longest wait allowed. Solid bar: the wait drawn this roll." : "Each wait is exactly the bar's length."} Waits are before the next try.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Readout label="This run waits" value={fmt(total)} accent />
        <Readout label="Worst case" value={fmt(worst)} />
        {jittery && (
          <button type="button" onClick={() => {
              setSeed(seed + 1);
              report(strategy, base, cap, attempts);
            }} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-medium text-ink hover:bg-surface-2">
            <Dices className="h-4 w-4" /> Roll again
          </button>
        )}
      </div>
    </div>
  );
}

export function checkBackoff(state: unknown, goal: Record<string, unknown>) {
  const st = state as BackoffState | undefined;
  if (!st) return false;
  if (goal.strategy !== undefined && st.strategy !== goal.strategy) return false;
  if (typeof goal.maxWait === "number" && st.maxWait > goal.maxWait) return false;
  if (typeof goal.minAttempts === "number" && st.attempts < goal.minAttempts) return false;
  if (typeof goal.maxWorstTotal === "number" && st.worstTotal > goal.maxWorstTotal) return false;
  return true;
}

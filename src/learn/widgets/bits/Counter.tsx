"use client";

import React, { useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { clamp, popcount, Readout, toHex } from "./shared";

export interface CounterProps {
  /** Number of bits (1–12). Default 8. */
  count?: number;
  /** Starting value. Default 0. */
  initial?: number;
  /** Show the place value under each bit. Default true. */
  showPlaces?: boolean;
  /** Show the decimal readout. Default true. */
  showDecimal?: boolean;
  showHex?: boolean;
  /** Show the −1 button. Default true. */
  allowDown?: boolean;
  label?: string;
  /** Read-only display. */
  locked?: boolean;
}

export interface CounterState {
  value: number;
  /** True if the last press wrapped round (overflow / underflow). */
  wrapped: boolean;
  presses: number;
}

interface LastStep {
  /** Bits that changed on the last press. */
  mask: number;
  dir: 1 | -1;
  wrapped: boolean;
  /** Increments on every press so changed bits re-run their animation. */
  n: number;
}

/** A binary counter: press +1 / −1 and watch the carries ripple from right to left. */
export function Counter({ props, onChange, revealed }: WidgetProps<CounterProps>) {
  const count = clamp(props.count ?? 8, 1, 12);
  const size = 2 ** count;
  const [value, setValue] = useState(() => clamp(props.initial ?? 0, 0, size - 1));
  const [last, setLast] = useState<LastStep | null>(null);
  const locked = Boolean(props.locked || revealed);

  const press = (dir: 1 | -1) => {
    if (locked) return;
    const raw = value + dir;
    const wrapped = raw >= size || raw < 0;
    const next = (raw + size) % size;
    const n = (last?.n ?? 0) + 1;
    setValue(next);
    setLast({ mask: value ^ next, dir, wrapped, n });
    onChange?.({ value: next, wrapped, presses: n } satisfies CounterState);
  };

  const reset = () => {
    const start = clamp(props.initial ?? 0, 0, size - 1);
    setValue(start);
    setLast(null);
    onChange?.({ value: start, wrapped: false, presses: 0 } satisfies CounterState);
  };

  const bits = Array.from({ length: count }, (_, i) => count - 1 - i);
  const flipped = last ? popcount(last.mask) : 0;

  let message = "Press +1 and watch which bits change.";
  if (last) {
    if (last.wrapped && last.dir === 1) message = "Overflow: every bit carried, and the last carry fell off the end. Back to 0.";
    else if (last.wrapped) message = "Underflow: there was nothing left to borrow from, so it wrapped round to the top.";
    else if (last.dir === 1) message = flipped === 1 ? "The rightmost bit was 0, so it simply turned on." : `1 + 1 = 10: ${flipped - 1} ${flipped - 1 === 1 ? "bit" : "bits"} rolled over to 0 and passed a carry left.`;
    else message = flipped === 1 ? "The rightmost bit was 1, so it simply turned off." : `Borrow: ${flipped - 1} ${flipped - 1 === 1 ? "bit" : "bits"} flipped to 1 while borrowing from the left.`;
  }

  return (
    <div className="w-full">
      {props.label && <p className="mb-3 text-center text-xs font-medium text-ink-3">{props.label}</p>}
      <div className="flex justify-center gap-1 sm:gap-1.5" aria-label={`Bits: ${value.toString(2).padStart(count, "0")}`}>
        {bits.map((bit, i) => {
          const on = Boolean(value & (1 << bit));
          const changed = last ? Boolean(last.mask & (1 << bit)) : false;
          // ripple: the rightmost changed bit flips first, the carry travels left
          const delay = (count - 1 - i) * 55;
          return (
            <div key={bit} className="flex min-w-0 flex-1 flex-col items-center gap-1.5" style={{ maxWidth: count <= 4 ? 76 : 52 }}>
              <span
                key={changed ? `${bit}-${last?.n}` : bit}
                className={`grid aspect-[3/4] min-h-11 w-full place-items-center rounded-lg border font-mono text-lg font-semibold transition-colors sm:text-xl ${
                  on ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface-2 text-ink-3"
                } ${changed ? "ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-[var(--surface)] [animation:pop-in_0.3s_ease-out_both]" : ""}`}
                style={changed ? { animationDelay: `${delay}ms` } : undefined}
              >
                {on ? 1 : 0}
              </span>
              {(props.showPlaces ?? true) && <span className="font-mono text-[10px] tabular-nums text-ink-3 sm:text-xs">{2 ** bit}</span>}
            </div>
          );
        })}
      </div>

      <p className="mt-4 min-h-10 text-center text-sm text-ink-2" aria-live="polite">
        {message}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {(props.allowDown ?? true) && (
          <button type="button" className="btn !h-11 !px-5 font-mono" onClick={() => press(-1)} disabled={locked} aria-label="Subtract one">
            <Minus className="h-4 w-4" /> 1
          </button>
        )}
        <button type="button" className="btn btn-primary !h-11 !px-6 font-mono" onClick={() => press(1)} disabled={locked} aria-label="Add one">
          <Plus className="h-4 w-4" /> 1
        </button>
        <button type="button" className="btn btn-ghost !h-11 !w-11 !p-0" onClick={reset} disabled={locked} aria-label="Reset" title="Reset">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {((props.showDecimal ?? true) || props.showHex) && (
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
          {(props.showDecimal ?? true) && <Readout label="Decimal" value={value} />}
          {props.showHex && <Readout label="Hex" value={`0x${toHex(value, Math.ceil(count / 4))}`} />}
        </div>
      )}
    </div>
  );
}

/** goal: { value } and optionally { wrapped: true } (the learner caused an overflow). */
export function checkCounter(state: unknown, goal: Record<string, unknown>) {
  const s = state as CounterState | undefined;
  if (!s) return false;
  if (typeof goal.value === "number" && s.value !== goal.value) return false;
  if (goal.wrapped === true && !s.wrapped) return false;
  return typeof goal.value === "number" || goal.wrapped === true;
}

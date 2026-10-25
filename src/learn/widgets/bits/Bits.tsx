"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";

export interface BitsProps {
  /** Number of bits (1–16). Default 8. */
  count?: number;
  /** Starting value. */
  initial?: number;
  /** Show 128 64 32 … under each bit. Default true. */
  showPlaces?: boolean;
  showDecimal?: boolean;
  showHex?: boolean;
  /** Show the ASCII character for the value (8 bits). */
  showChar?: boolean;
  /** Read-only display. */
  locked?: boolean;
  /** Optional caption above the row, e.g. "One byte". */
  label?: string;
}

export interface BitsState {
  value: number;
}

const printable = (v: number) => (v === 32 ? "space" : v > 32 && v < 127 ? String.fromCharCode(v) : "—");

/** A row of bits you can flip; shows what number (hex, character) they spell. */
export function Bits({ props, onChange, revealed }: WidgetProps<BitsProps>) {
  const count = Math.min(16, Math.max(1, props.count ?? 8));
  const max = 2 ** count - 1;
  const [value, setValue] = useState(() => Math.min(max, Math.max(0, props.initial ?? 0)));
  const locked = props.locked || revealed;

  const flip = (bit: number) => {
    if (locked) return;
    const next = value ^ (1 << bit);
    setValue(next);
    onChange?.({ value: next } satisfies BitsState);
  };

  const bits = Array.from({ length: count }, (_, i) => count - 1 - i);
  return (
    <div className="w-full">
      {props.label && <p className="mb-3 text-center text-xs font-medium text-ink-3">{props.label}</p>}
      <div className="flex justify-center gap-1 sm:gap-1.5">
        {bits.map((bit) => {
          const on = Boolean(value & (1 << bit));
          return (
            <div key={bit} className="flex min-w-0 flex-1 flex-col items-center gap-1.5" style={{ maxWidth: count <= 4 ? 76 : 52 }}>
              <button
                type="button"
                onClick={() => flip(bit)}
                disabled={locked}
                aria-label={`Bit worth ${2 ** bit}: ${on ? "1" : "0"}`}
                aria-pressed={on}
                className={`grid aspect-[3/4] w-full place-items-center rounded-lg border font-mono text-lg font-semibold transition-colors sm:text-xl ${
                  on ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface-2 text-ink-3"
                } ${locked ? "cursor-default" : "hover:border-[var(--line-strong)]"}`}
              >
                {on ? 1 : 0}
              </button>
              {(props.showPlaces ?? true) && <span className="font-mono text-[10px] tabular-nums text-ink-3 sm:text-xs">{2 ** bit}</span>}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
        {(props.showDecimal ?? true) && <Readout label="Decimal" value={String(value)} />}
        {props.showHex && <Readout label="Hex" value={`0x${value.toString(16).toUpperCase().padStart(Math.ceil(count / 4), "0")}`} />}
        {props.showChar && count === 8 && <Readout label="Character" value={printable(value)} />}
      </div>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-2 rounded-full border border-line bg-surface px-3 py-1">
      <span className="text-xs text-ink-3">{label}</span>
      <span className="font-mono font-semibold tabular-nums">{value}</span>
    </span>
  );
}

export function checkBits(state: unknown, goal: Record<string, unknown>) {
  return typeof goal.value === "number" && (state as BitsState | undefined)?.value === goal.value;
}

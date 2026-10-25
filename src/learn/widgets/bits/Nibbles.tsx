"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { clamp, Readout, toBin, toHex } from "./shared";

export interface NibblesProps {
  /** 4 (one nibble, one hex digit) or 8 (a byte, two hex digits). Default 8. */
  bits?: 4 | 8;
  initial?: number;
  /** Show the hex digit under each nibble. Default true. */
  showHex?: boolean;
  /** Show the decimal value (and, for a byte, the 16 × high + low sum). Default false. */
  showDecimal?: boolean;
  /** Show the 0–F lookup table with the current digits highlighted. Default false. */
  showTable?: boolean;
  label?: string;
  locked?: boolean;
}

export interface NibblesState {
  value: number;
}

const HEX = "0123456789ABCDEF".split("");

/** Bits grouped into nibbles of four; each nibble is exactly one hex digit. */
export function Nibbles({ props, onChange, revealed }: WidgetProps<NibblesProps>) {
  const width = props.bits === 4 ? 4 : 8;
  const max = 2 ** width - 1;
  const [value, setValue] = useState(() => clamp(props.initial ?? 0, 0, max));
  const locked = Boolean(props.locked || revealed);
  const showHex = (props.showHex ?? true) || Boolean(revealed);

  const flip = (bit: number) => {
    if (locked) return;
    const next = value ^ (1 << bit);
    setValue(next);
    onChange?.({ value: next } satisfies NibblesState);
  };

  const nibbles = width === 8 ? [1, 0] : [0];
  const hi = (value >> 4) & 0xf;
  const lo = value & 0xf;
  const active = new Set(width === 8 ? [hi, lo] : [lo]);

  return (
    <div className="w-full">
      {props.label && <p className="mb-3 text-center text-xs font-medium text-ink-3">{props.label}</p>}
      <div className="flex justify-center gap-2 sm:gap-4">
        {nibbles.map((n) => {
          const digit = (value >> (n * 4)) & 0xf;
          return (
            <div key={n} className="flex min-w-0 flex-1 flex-col items-center rounded-2xl border border-line bg-surface-2 p-2 sm:p-3" style={{ maxWidth: 240 }}>
              <span className="mb-2 text-[10px] font-medium uppercase tracking-wider text-ink-3 sm:text-xs">
                {width === 8 ? (n === 1 ? "High nibble" : "Low nibble") : "Nibble"}
              </span>
              <div className="flex w-full justify-center gap-1 sm:gap-1.5">
                {[3, 2, 1, 0].map((local) => {
                  const bit = n * 4 + local;
                  const on = Boolean(value & (1 << bit));
                  return (
                    <div key={bit} className="flex min-w-0 flex-1 flex-col items-center gap-1" style={{ maxWidth: 52 }}>
                      <button
                        type="button"
                        onClick={() => flip(bit)}
                        disabled={locked}
                        aria-label={`Bit worth ${2 ** local} in the ${n === 1 ? "high" : "low"} nibble: ${on ? "1" : "0"}`}
                        aria-pressed={on}
                        className={`grid aspect-[3/4] min-h-11 w-full place-items-center rounded-lg border font-mono text-lg font-semibold transition-colors ${
                          on ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink-3"
                        } ${locked ? "cursor-default" : "hover:border-[var(--line-strong)]"}`}
                      >
                        {on ? 1 : 0}
                      </button>
                      <span className="font-mono text-[10px] tabular-nums text-ink-3 sm:text-xs">{2 ** local}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface font-mono text-2xl font-semibold text-ink" aria-label={`Hex digit ${showHex ? HEX[digit] : "hidden"}`}>
                {showHex ? HEX[digit] : "?"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
        <Readout label="Binary" value={width === 8 ? `${toBin(hi, 4)} ${toBin(lo, 4)}` : toBin(lo, 4)} />
        {showHex && <Readout label="Hex" value={`0x${toHex(value, width / 4)}`} strong />}
        {props.showDecimal && <Readout label="Decimal" value={width === 8 ? `${hi} × 16 + ${lo} = ${value}` : value} />}
      </div>

      {props.showTable && (
        <div className="mx-auto mt-5 grid max-w-md grid-cols-4 gap-1.5 sm:grid-cols-8">
          {HEX.map((h, i) => {
            const on = showHex && active.has(i);
            return (
              <div key={h} className={`flex flex-col items-center rounded-lg border px-1 py-1.5 transition-colors ${on ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface"}`}>
                <span className={`font-mono text-sm font-semibold ${on ? "" : "text-ink"}`}>{h}</span>
                <span className={`font-mono text-[10px] ${on ? "opacity-70" : "text-ink-3"}`}>{toBin(i, 4)}</span>
                <span className={`text-[10px] tabular-nums ${on ? "opacity-70" : "text-ink-3"}`}>{i}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function checkNibbles(state: unknown, goal: Record<string, unknown>) {
  return typeof goal.value === "number" && (state as NibblesState | undefined)?.value === goal.value;
}

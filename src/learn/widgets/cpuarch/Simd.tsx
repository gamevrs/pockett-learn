"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Slider } from "../ai/ui";
import { Btn, Caption, Note, Readout } from "../computer/ui";
import { simdRun } from "./sim";

export interface SimdProps {
  /** Starting number of array elements (4 to 40). */
  n?: number;
  /** Lane choices (32-bit numbers per vector). Default 1, 4, 8, 16. */
  lanes?: number[];
  /** Start with this many lanes. */
  initialLanes?: number;
}

export interface SimdState {
  n: number;
  lanes: number;
  vectorPasses: number;
  tail: number;
  scalarInstr: number;
  simdInstr: number;
  speedup: number;
}

const WIDTH_NAME: Record<number, string> = { 1: "scalar", 4: "128-bit (SSE or NEON)", 8: "256-bit (AVX2)", 16: "512-bit (AVX-512)" };

/** c[i] = a[i] + b[i] over n numbers: one number at a time versus 4, 8 or 16 at a time, plus the leftover tail. */
export function Simd({ props, onChange }: WidgetProps<SimdProps>) {
  const options = props.lanes ?? [1, 4, 8, 16];
  const [n, setN] = useState(props.n ?? 21);
  const [lanes, setLanes] = useState(props.initialLanes ?? options[0]);

  const r = simdRun(n, lanes);
  const report = (nn: number, l: number) => {
    const x = simdRun(nn, l);
    onChange?.({ n: nn, lanes: l, ...x } satisfies SimdState);
  };

  const vecCells = lanes === 1 ? 0 : r.vectorPasses * lanes;
  return (
    <div className="w-full">
      <Caption className="mb-1">Numbers per instruction (32-bit each)</Caption>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Lanes">
        {options.map((l) => (
          <Btn
            key={l}
            on={l === lanes}
            onClick={() => {
              setLanes(l);
              report(n, l);
            }}
          >
            {l === 1 ? "1 (scalar)" : `${l} lanes`}
          </Btn>
        ))}
      </div>
      <p className="mt-1 text-xs text-ink-3">{WIDTH_NAME[lanes] ?? `${lanes * 32}-bit`}. Real vector widths are examples; they differ by chip.</p>
      <Slider
        className="mt-2"
        label="Array length"
        value={n}
        min={4}
        max={40}
        onChange={(v) => {
          setN(v);
          report(v, lanes);
        }}
      />

      <div className="mt-2 rounded-xl border border-line bg-surface-2 p-2.5">
        <Caption className="mb-1.5">The array, grouped by instruction</Caption>
        <div className="flex flex-wrap gap-1" role="img" aria-label={`${n} numbers: ${r.vectorPasses} vector passes of ${lanes} and ${r.tail} left over`}>
          {Array.from({ length: n }, (_, i) => {
            const inVec = lanes > 1 && i < vecCells;
            const groupStart = lanes > 1 && inVec && i % lanes === 0;
            const shade = inVec ? (Math.floor(i / lanes) % 2 === 0 ? "bg-tint" : "bg-surface") : "bg-surface";
            return (
              <span
                key={i}
                className={`grid h-7 w-7 place-items-center rounded-md border font-mono text-[11px] ${shade} ${inVec ? "border-[var(--brand)] text-ink" : lanes > 1 ? "border-dashed border-[var(--line-strong)] text-ink-2" : "border-line text-ink-2"} ${groupStart ? "ml-1.5" : ""}`}
              >
                {i}
              </span>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-ink-3">
          {lanes === 1 ? "Every number gets its own instruction." : `Solid boxes go ${lanes} at a time. Dashed boxes are the tail: ${r.tail} left over that do not fill a vector.`}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Passes" value={lanes === 1 ? n : `${r.vectorPasses} vector + ${r.tail} scalar`} />
        <Readout label="Instructions" value={`${r.simdInstr} (was ${r.scalarInstr})`} accent />
        <Readout label="Speedup" value={`${r.speedup.toFixed(1)}×`} accent />
      </div>
      <div className="mt-3">
        <Note>Toy count: each pass is 2 loads, 1 add, 1 store and 2 loop-bookkeeping instructions. Real loops also wait on memory, so measured speedups are usually lower.</Note>
      </div>
    </div>
  );
}

/** goal: { lanes, n, minSpeedup, tail }. */
export function checkSimd(state: unknown, goal: Record<string, unknown>) {
  const s = state as SimdState | undefined;
  if (!s) return false;
  if (typeof goal.lanes === "number" && s.lanes !== goal.lanes) return false;
  if (typeof goal.n === "number" && s.n !== goal.n) return false;
  if (typeof goal.tail === "number" && s.tail !== goal.tail) return false;
  if (typeof goal.minSpeedup === "number" && s.speedup < goal.minSpeedup) return false;
  return true;
}

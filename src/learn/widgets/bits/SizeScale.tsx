"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Segmented } from "./shared";

export type SizeUnit = "bit" | "byte" | "KB" | "MB" | "GB" | "TB";
type Base = 1000 | 1024;

export interface SizeScaleProps {
  /** Which multiplier to start with. Default 1000. */
  base?: Base;
  /** Let the learner switch between 1000s (KB) and 1024s (KiB). Default false. */
  showToggle?: boolean;
  /** Rung selected at the start. Default "byte". */
  initial?: SizeUnit;
  /** Show only these rungs (in order). Default all. */
  units?: SizeUnit[];
  locked?: boolean;
}

export interface SizeScaleState {
  unit: SizeUnit;
  base: Base;
}

interface Rung {
  unit: SizeUnit;
  binary: string;
  name: string;
  binaryName: string;
  /** Power of the base (bytes = base^power); the bit is special. */
  power: number;
  example: string;
}

const RUNGS: Rung[] = [
  { unit: "bit", binary: "bit", name: "bit", binaryName: "bit", power: -1, example: "One on/off switch: yes or no." },
  { unit: "byte", binary: "byte", name: "byte", binaryName: "byte", power: 0, example: "One plain letter, like A." },
  { unit: "KB", binary: "KiB", name: "kilobyte", binaryName: "kibibyte", power: 1, example: "A paragraph of plain text." },
  { unit: "MB", binary: "MiB", name: "megabyte", binaryName: "mebibyte", power: 2, example: "About a minute of MP3 music." },
  { unit: "GB", binary: "GiB", name: "gigabyte", binaryName: "gibibyte", power: 3, example: "Roughly 30 minutes of HD video." },
  { unit: "TB", binary: "TiB", name: "terabyte", binaryName: "tebibyte", power: 4, example: "A typical laptop drive." },
];

const fmt = (n: number) => n.toLocaleString("en-US");

/** The size ladder: bit → byte → KB → MB → GB → TB, in 1000s or 1024s. */
export function SizeScale({ props, onChange, revealed }: WidgetProps<SizeScaleProps>) {
  const [unit, setUnit] = useState<SizeUnit>(props.initial ?? "byte");
  const [base, setBase] = useState<Base>(props.base ?? 1000);
  const locked = Boolean(props.locked || revealed);
  const rungs = props.units ? RUNGS.filter((r) => props.units!.includes(r.unit)) : RUNGS;

  const pick = (u: SizeUnit) => {
    if (locked) return;
    setUnit(u);
    onChange?.({ unit: u, base } satisfies SizeScaleState);
  };
  const pickBase = (b: Base) => {
    if (locked) return;
    setBase(b);
    onChange?.({ unit, base: b } satisfies SizeScaleState);
  };

  return (
    <div className="w-full">
      {props.showToggle && (
        <div className="mb-4 flex justify-center">
          <Segmented
            label="Multiplier"
            value={base}
            onChange={pickBase}
            disabled={locked}
            options={[
              { value: 1000, label: "×1000 (KB, MB)" },
              { value: 1024, label: "×1024 (KiB, MiB)" },
            ]}
          />
        </div>
      )}
      <ol className="mx-auto grid max-w-md gap-0">
        {rungs.map((r, i) => {
          const on = r.unit === unit;
          const label = base === 1024 ? r.binary : r.unit;
          const bytes = r.power >= 0 ? base ** r.power : null;
          const step = i > 0 ? (r.power === 0 ? "× 8" : `× ${fmt(base)}`) : null;
          const diff = r.power >= 1 ? ((1024 / 1000) ** r.power - 1) * 100 : 0;
          return (
            <li key={r.unit}>
              {step && (
                <div className="flex h-6 items-center pl-[1.94rem]" aria-hidden>
                  <span className="h-full w-px bg-[var(--line-strong)]" />
                  <span className="ml-3 font-mono text-[11px] text-ink-3">{step}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => pick(r.unit)}
                disabled={locked}
                aria-pressed={on}
                className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-colors ${
                  on ? "border-[var(--brand)] bg-tint" : "border-line bg-surface hover:border-[var(--line-strong)]"
                } disabled:cursor-default`}
              >
                <span
                  className={`grid h-9 min-w-[2.6rem] shrink-0 place-items-center rounded-lg px-1.5 font-mono text-[0.8rem] font-semibold ${
                    on ? "bg-primary text-primary-ink" : "bg-surface-2 text-ink"
                  }`}
                >
                  {label}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">
                    1 {base === 1024 ? r.binaryName : r.name}
                    {bytes !== null && r.power > 0 && <span className="font-normal text-ink-3"> = {fmt(bytes)} bytes</span>}
                    {r.power === 0 && <span className="font-normal text-ink-3"> = 8 bits</span>}
                  </span>
                  {on && (
                    <span className="pop-in mt-0.5 block text-xs text-ink-2">
                      {r.example}
                      {base === 1024 && diff > 0 && <span className="text-ink-3"> {diff.toFixed(1)}% more bytes than 1 {r.unit}.</span>}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** goal: { unit } and optionally { base }. */
export function checkSizeScale(state: unknown, goal: Record<string, unknown>) {
  const s = state as SizeScaleState | undefined;
  if (!s || typeof goal.unit !== "string") return false;
  return s.unit === goal.unit && (goal.base === undefined || s.base === goal.base);
}

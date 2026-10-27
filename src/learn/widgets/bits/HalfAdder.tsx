"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { GateShape } from "./LogicGate";

export interface HalfAdderProps {
  /** Draw the adder as a closed box (just inputs and outputs). Default false. */
  hideGates?: boolean;
  /** Show the four-row addition table. Default true. */
  showTable?: boolean;
  initial?: { a?: 0 | 1; b?: 0 | 1 };
  locked?: boolean;
}

export interface HalfAdderState {
  a: 0 | 1;
  b: 0 | 1;
  sum: 0 | 1;
  carry: 0 | 1;
}

type Bit = 0 | 1;
const ROWS: [Bit, Bit][] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];
const WORDS = ["zero", "one", "two"];

const wire = (on: boolean) => (on ? "stroke-[var(--brand)]" : "stroke-[var(--line-strong)]");

/** Adds two bits: XOR gives the sum bit, AND gives the carry. */
export function HalfAdder({ props, onChange, revealed }: WidgetProps<HalfAdderProps>) {
  const [a, setA] = useState<Bit>(props.initial?.a ?? 0);
  const [b, setB] = useState<Bit>(props.initial?.b ?? 0);
  const locked = Boolean(props.locked || revealed);
  const sum = (a ^ b) as Bit;
  const carry = (a & b) as Bit;
  const hide = Boolean(props.hideGates);

  const toggle = (which: "a" | "b") => {
    if (locked) return;
    const na: Bit = which === "a" ? (a ? 0 : 1) : a;
    const nb: Bit = which === "b" ? (b ? 0 : 1) : b;
    setA(na);
    setB(nb);
    onChange?.({ a: na, b: nb, sum: (na ^ nb) as Bit, carry: (na & nb) as Bit } satisfies HalfAdderState);
  };

  const inputs = [
    { key: "a" as const, y: 33, v: a },
    { key: "b" as const, y: 187, v: b },
  ];
  const outputs = [
    { key: "Sum", y: 55, v: sum },
    { key: "Carry", y: 165, v: carry },
  ];

  return (
    <div className="mx-auto w-full max-w-md">
      <svg viewBox="0 0 300 222" className="mx-auto block w-full max-w-[340px]" role="group" aria-label={hide ? "Adder box" : "Half adder: an XOR gate and an AND gate"}>
        {/* A feeds the top input of both gates, B the bottom input of both */}
        <path d="M52 33 H104 M64 33 V143 H100" className={wire(a === 1)} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M52 187 H100 M80 187 V77 H104" className={wire(b === 1)} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx={64} cy={33} r={5} className={a ? "fill-[var(--brand)]" : "fill-[var(--line-strong)]"} />
        <circle cx={80} cy={187} r={5} className={b ? "fill-[var(--brand)]" : "fill-[var(--line-strong)]"} />
        <path d="M172 55 H240" className={wire(sum === 1)} strokeWidth={4} strokeLinecap="round" fill="none" />
        <path d="M168 165 H240" className={wire(carry === 1)} strokeWidth={4} strokeLinecap="round" fill="none" />

        {hide ? (
          <g>
            <rect x={92} y={8} width={100} height={206} rx={16} className="fill-[var(--surface-2)] stroke-[var(--ink-2)]" strokeWidth={2.5} />
            <text x={142} y={104} textAnchor="middle" className="fill-[var(--ink)] font-display text-[34px]">
              ?
            </text>
            <text x={142} y={132} textAnchor="middle" className="fill-[var(--ink-3)] text-[11px] font-medium">
              adds A + B
            </text>
          </g>
        ) : (
          <>
            <GateShape gate="XOR" x={100} y={55} />
            <GateShape gate="AND" x={100} y={165} />
          </>
        )}

        {inputs.map((inp) => (
          <g
            key={inp.key}
            role="button"
            tabIndex={locked ? -1 : 0}
            aria-label={`Input ${inp.key.toUpperCase()}: ${inp.v}`}
            aria-pressed={inp.v === 1}
            aria-disabled={locked}
            onClick={() => toggle(inp.key)}
            onKeyDown={(e) => {
              if (!locked && e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                toggle(inp.key);
              }
            }}
            className={locked ? "" : "cursor-pointer outline-none [&:focus-visible>rect]:stroke-[var(--brand)]"}
          >
            <rect x={4} y={inp.y - 24} width={48} height={48} rx={10} className={inp.v ? "fill-[var(--primary)] stroke-transparent" : "fill-[var(--surface)] stroke-[var(--line-strong)]"} strokeWidth={2} />
            <text x={28} y={inp.y - 8} textAnchor="middle" className={`text-[10px] font-semibold ${inp.v ? "fill-[var(--primary-ink)] opacity-70" : "fill-[var(--ink-3)]"}`}>
              {inp.key.toUpperCase()}
            </text>
            <text x={28} y={inp.y + 15} textAnchor="middle" className={`font-mono text-[18px] font-semibold ${inp.v ? "fill-[var(--primary-ink)]" : "fill-[var(--ink)]"}`}>
              {inp.v}
            </text>
          </g>
        ))}

        {outputs.map((o) => (
          <g key={o.key}>
            <circle cx={266} cy={o.y} r={22} className={o.v ? "fill-[var(--primary)] stroke-transparent" : "fill-[var(--surface)] stroke-[var(--line-strong)]"} strokeWidth={2} />
            <text x={266} y={o.y + 6} textAnchor="middle" className={`font-mono text-[17px] font-semibold ${o.v ? "fill-[var(--primary-ink)]" : "fill-[var(--ink)]"}`}>
              {o.v}
            </text>
            <text x={266} y={o.y + 38} textAnchor="middle" className="fill-[var(--ink-3)] text-[10px] font-medium uppercase">
              {o.key}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-3 flex items-baseline justify-center gap-2 font-mono text-2xl font-semibold tabular-nums text-ink" aria-live="polite">
        <span>{a}</span>
        <span className="text-ink-3">+</span>
        <span>{b}</span>
        <span className="text-ink-3">=</span>
        <span className="inline-flex items-baseline">
          <span className={carry ? "text-[var(--brand)]" : "text-ink-3"}>{carry}</span>
          <span>{sum}</span>
        </span>
        <span className="font-sans text-sm font-normal text-ink-3">({WORDS[a + b]})</span>
      </div>
      <p className="mt-1 text-center text-xs text-ink-3">
        left digit = <span className="text-ink-2">carry</span>, right digit = <span className="text-ink-2">sum</span>
      </p>

      {(props.showTable ?? true) && (
        <table className="mx-auto mt-4 min-w-[15rem] border-separate border-spacing-y-1 text-center font-mono text-sm [&_td]:px-4 [&_th]:px-4">
          <thead>
            <tr className="text-xs text-ink-3">
              <th className="font-medium">A</th>
              <th className="font-medium">B</th>
              <th className="font-medium">Carry</th>
              <th className="font-medium">Sum</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([ra, rb]) => {
              const current = ra === a && rb === b;
              return (
                <tr key={`${ra}${rb}`} className={current ? "[&>td]:bg-tint [&>td:first-child]:shadow-[inset_3px_0_0_var(--brand)]" : "[&>td]:bg-surface-2"}>
                  <td className="h-9 rounded-l-lg text-ink-2">{ra}</td>
                  <td className="h-9 text-ink-2">{rb}</td>
                  <td className="h-9 font-semibold text-ink">{ra & rb}</td>
                  <td className="h-9 rounded-r-lg font-semibold text-ink">{ra ^ rb}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** goal: any of { sum, carry, a, b }; all given ones must match. */
export function checkHalfAdder(state: unknown, goal: Record<string, unknown>) {
  const s = state as HalfAdderState | undefined;
  if (!s) return false;
  const keys = (["sum", "carry", "a", "b"] as const).filter((k) => typeof goal[k] === "number");
  return keys.length > 0 && keys.every((k) => s[k] === goal[k]);
}

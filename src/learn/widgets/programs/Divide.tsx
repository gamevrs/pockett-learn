"use client";

import React, { useState } from "react";
import { Lock } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Stepper } from "./values";

export interface DivideProps {
  /** Number of things to share out (0–40). */
  a: number;
  /** Group size (1–10). */
  b: number;
  /** Let the learner change a and b. Default true. */
  editable?: boolean;
  /** Hide the / // % readouts until the step's question is answered. */
  hideResults?: boolean;
}

export interface DivideState {
  a: number;
  b: number;
}

/** Shares a things into groups of b: the full groups are a // b, the leftovers are a % b. */
export function Divide({ props, onChange, revealed }: WidgetProps<DivideProps>) {
  const [a, setA] = useState(Math.min(40, Math.max(0, props.a)));
  const [b, setB] = useState(Math.min(10, Math.max(1, props.b)));
  const editable = (props.editable ?? true) && !revealed;
  const hide = props.hideResults && !revealed;
  const q = Math.floor(a / b);
  const r = a % b;

  const update = (na: number, nb: number) => {
    setA(na);
    setB(nb);
    onChange?.({ a: na, b: nb } satisfies DivideState);
  };

  const groups = Array.from({ length: q }, (_, g) => g);
  const fmt = (x: number) => (Number.isInteger(x) ? `${x}.0` : String(Math.round(x * 1000) / 1000));

  return (
    <div className="w-full min-w-0">
      {editable && (
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
          <Stepper label="a" value={a} min={0} max={40} onChange={(v) => update(v, b)} />
          <Stepper label="b" value={b} min={1} max={10} onChange={(v) => update(a, v)} />
        </div>
      )}
      <p className="mb-3 text-center text-sm text-ink-2">
        <span className="font-mono font-semibold text-ink">{a}</span> things in groups of <span className="font-mono font-semibold text-ink">{b}</span>
      </p>
      <div className="flex flex-wrap justify-center gap-2" aria-hidden>
        {groups.map((g) => (
          <span key={g} className="flex flex-wrap gap-1 rounded-lg border border-line bg-surface-2 p-1.5" style={{ maxWidth: `${Math.min(b, 5) * 1.25 + 0.9}rem` }}>
            {Array.from({ length: b }, (_, k) => (
              <span key={k} className="h-4 w-4 rounded-full bg-ink-3/70" />
            ))}
          </span>
        ))}
        {r > 0 && (
          <span className="flex flex-wrap gap-1 rounded-lg border-2 border-dashed border-[var(--brand)] p-1.5" style={{ maxWidth: `${Math.min(b, 5) * 1.25 + 1}rem` }}>
            {Array.from({ length: r }, (_, k) => (
              <span key={k} className="h-4 w-4 rounded-full bg-primary" />
            ))}
          </span>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-ink-3">
        Grey: full groups · <span className="text-brand">lime: left over</span>
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 font-mono">
        {[
          { label: `${a} / ${b}`, value: fmt(a / b), sub: "divide" },
          { label: `${a} // ${b}`, value: String(q), sub: "full groups" },
          { label: `${a} % ${b}`, value: String(r), sub: "left over" },
        ].map((c) => (
          <div key={c.sub} className="min-w-0 rounded-xl border border-line bg-surface p-2 text-center">
            <p className="truncate text-xs text-ink-2">{c.label}</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{hide ? <Lock className="mx-auto my-1 h-4 w-4 text-ink-3" aria-label="hidden" /> : c.value}</p>
            <p className="font-sans text-[0.65rem] text-ink-3">{c.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function checkDivide(state: unknown, goal: Record<string, unknown>) {
  const s = state as DivideState | undefined;
  if (!s) return false;
  if (typeof goal.quotient === "number" && Math.floor(s.a / s.b) !== goal.quotient) return false;
  if (typeof goal.remainder === "number" && s.a % s.b !== goal.remainder) return false;
  if (typeof goal.a === "number" && s.a !== goal.a) return false;
  if (typeof goal.b === "number" && s.b !== goal.b) return false;
  return true;
}

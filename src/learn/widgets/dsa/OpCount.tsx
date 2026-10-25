"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, CodePane, fmt, Stepper } from "./ui";

/**
 * Count how many times the marked line runs for an input of size n. Each run is drawn as a dot,
 * so a single loop makes a row, nested loops make a square, and a halving loop makes a short chain.
 */
export type OpShape = "constant" | "single" | "two" | "nested" | "triangle" | "halving";

export interface OpCountProps {
  shape: OpShape;
  /** Override the code shown. Line `mark` (0-based) is the one being counted. */
  code?: string;
  mark?: number;
  initial?: number;
  /** Largest n (default 10; 1024 for "halving", which steps by doubling). */
  max?: number;
  /** Predict mode: hide the count and the dots until the step is answered. */
  hideCount?: boolean;
}

export interface OpCountState {
  n: number;
  count: number;
}

const CODE: Record<OpShape, { code: string; mark: number }> = {
  constant: { code: "def first(items):\n    return items[0]", mark: 1 },
  single: { code: "total = 0\nfor x in items:\n    total = total + x", mark: 2 },
  two: { code: "for x in items:\n    print(x)\nfor x in items:\n    print(x * 2)", mark: -1 },
  nested: { code: "for a in items:\n    for b in items:\n        compare(a, b)", mark: 2 },
  triangle: { code: "for i in range(n):\n    for j in range(i + 1, n):\n        compare(items[i], items[j])", mark: 2 },
  halving: { code: "steps = 0\nwhile n > 1:\n    n = n // 2\n    steps = steps + 1", mark: 2 },
};

export function countFor(shape: OpShape, n: number): number {
  switch (shape) {
    case "constant":
      return 1;
    case "single":
      return n;
    case "two":
      return 2 * n;
    case "nested":
      return n * n;
    case "triangle":
      return (n * (n - 1)) / 2;
    case "halving": {
      let c = 0;
      for (let v = n; v > 1; v = Math.floor(v / 2)) c++;
      return c;
    }
  }
}

export function OpCount({ props, onChange, revealed }: WidgetProps<OpCountProps>) {
  const shape = props.shape;
  const halving = shape === "halving";
  const max = props.max ?? (halving ? 1024 : 10);
  const [n, setN] = useState(props.initial ?? (halving ? 16 : 4));
  const count = countFor(shape, n);
  const hidden = props.hideCount && !revealed;
  const tpl = CODE[shape];
  const code = props.code ?? tpl.code;
  const mark = props.mark ?? tpl.mark;
  const marks = shape === "two" && props.mark === undefined ? [1, 3] : [mark];

  const set = (v: number) => {
    setN(v);
    onChange?.({ n: v, count: countFor(shape, v) } satisfies OpCountState);
  };
  const dec = () => set(halving ? Math.max(1, n / 2) : Math.max(1, n - 1));
  const inc = () => set(halving ? Math.min(max, n * 2) : Math.min(max, n + 1));

  return (
    <div className="w-full min-w-0">
      <CodePane code={code} highlight={marks} title={halving ? `n = ${n}` : `items holds n = ${n} things`} />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Stepper label="n" value={n} onDec={dec} onInc={inc} canDec={n > 1} canInc={n < max} disabled={hidden} />
        <div className="text-right">
          <p className="text-[0.7rem] text-ink-3">The marked {marks.length > 1 ? "lines run" : "line runs"}</p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-ink" aria-live="polite">
            {hidden ? "?" : fmt(count)} <span className="font-sans text-sm font-normal text-ink-3">{count === 1 && !hidden ? "time" : "times"}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 min-h-[4.5rem] rounded-xl border border-line bg-surface-2 p-3">
        <Caption>{hidden ? "Each run will light a dot" : "One dot per run"}</Caption>
        {hidden ? (
          <p className="py-2 text-center text-sm text-ink-3">Work it out first, then check.</p>
        ) : (
          <Dots key={`${shape}-${n}`} shape={shape} n={n} />
        )}
      </div>
    </div>
  );
}

function Dot({ on = true, delay = 0 }: { on?: boolean; delay?: number }) {
  return (
    <span
      className={`block h-3.5 w-3.5 rounded-full sm:h-4 sm:w-4 ${on ? "pop-in bg-primary" : "border border-line bg-surface"}`}
      style={on ? { animationDelay: `${delay}ms` } : undefined}
      aria-hidden
    />
  );
}

function Dots({ shape, n }: { shape: OpShape; n: number }) {
  if (shape === "halving") {
    const chain: number[] = [n];
    let v = n;
    while (v > 1) {
      v = Math.floor(v / 2);
      chain.push(v);
    }
    return (
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-sm">
        {chain.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-ink-3">→</span>}
            <span className={`pop-in rounded-md px-2 py-1 tabular-nums ${i > 0 ? "bg-primary font-semibold text-primary-ink" : "border border-line bg-surface text-ink"}`} style={{ animationDelay: `${i * 60}ms` }}>
              {c}
            </span>
          </React.Fragment>
        ))}
        {chain.length === 1 && <span className="text-xs text-ink-3">n is already 1: the loop never runs.</span>}
      </div>
    );
  }
  if (shape === "nested" || shape === "triangle") {
    return (
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${n}, auto)` }} role="img" aria-label={`${countFor(shape, n)} dots`}>
        {Array.from({ length: n * n }, (_, k) => {
          const i = Math.floor(k / n);
          const j = k % n;
          const on = shape === "nested" || j > i;
          return <Dot key={k} on={on} delay={k * (500 / (n * n))} />;
        })}
      </div>
    );
  }
  const rows = shape === "two" ? 2 : 1;
  const per = shape === "constant" ? 1 : n;
  return (
    <div className="grid gap-1.5">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex flex-wrap gap-1">
          {Array.from({ length: per }, (_, k) => (
            <Dot key={k} delay={(r * per + k) * 40} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function checkOpCount(state: unknown, goal: Record<string, unknown>) {
  const s = state as OpCountState | undefined;
  if (!s) return false;
  if (typeof goal.n === "number" && s.n !== goal.n) return false;
  if (typeof goal.count === "number" && s.count !== goal.count) return false;
  return typeof goal.n === "number" || typeof goal.count === "number";
}

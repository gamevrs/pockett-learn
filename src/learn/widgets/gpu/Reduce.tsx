"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { reduceRun, type ReduceMethod } from "./sim";
import { Caption, Note, Readout, Seg, ORANGE } from "./ui";

export interface ReduceProps {
  /** How the threads add (default "plain"). */
  method?: ReduceMethod;
  /** Number of threads: 8, 16 or 32 (default 8). */
  n?: number;
  /** Hide the controls: show the starting method only. */
  fixed?: boolean;
}

export interface ReduceState {
  method: ReduceMethod;
  n: number;
  result: number;
  expected: number;
  correct: boolean;
  /** One-at-a-time updates (atomicAdd), rounds (tree) or 1 (plain). */
  steps: number;
}

const BRAND_TINT = "color-mix(in srgb, var(--brand) 24%, transparent)";
const ORANGE_TINT = `color-mix(in srgb, ${ORANGE} 34%, transparent)`;

type Tone = "plain" | "brand" | "orange";

function Cells({ values, tone, lastTone }: { values: number[]; tone?: Tone; lastTone?: Tone }) {
  const bg = (t: Tone | undefined) => (t === "brand" ? BRAND_TINT : t === "orange" ? ORANGE_TINT : undefined);
  return (
    <div className="grid grid-cols-8 gap-1">
      {values.map((v, i) => {
        const t = i === values.length - 1 && lastTone ? lastTone : tone;
        return (
          <span
            key={i}
            className={`flex min-h-8 min-w-0 items-center justify-center rounded-md border px-0.5 font-mono text-xs tabular-nums text-ink ${t && t !== "plain" ? "border-[var(--line-strong)]" : "border-line bg-surface"}`}
            style={{ background: bg(t) }}
          >
            {v}
          </span>
        );
      })}
    </div>
  );
}

const METHODS: { value: ReduceMethod; label: string }[] = [
  { value: "plain", label: "sum += x[i]" },
  { value: "atomic", label: "atomicAdd" },
  { value: "tree", label: "Tree in shared memory" },
];

/** Many threads add their numbers into one total: a plain += races, atomicAdd is correct but serial, a tree is correct and takes log2(n) rounds. */
export function Reduce({ props, onChange }: WidgetProps<ReduceProps>) {
  const [method, setMethod] = useState<ReduceMethod>(props.method ?? "plain");
  const [n, setN] = useState(props.n ?? 8);

  const r = reduceRun(method, n);

  const upd = (m: ReduceMethod, k: number) => {
    setMethod(m);
    setN(k);
    const x = reduceRun(m, k);
    onChange?.({ method: m, n: k, result: x.result, expected: x.expected, correct: x.correct, steps: x.steps } satisfies ReduceState);
  };

  return (
    <div className="w-full" data-widget>
      {!props.fixed && (
        <div className="mb-3 space-y-3">
          <div>
            <Caption className="mb-1">How the threads add</Caption>
            <Seg label="How the threads add" value={method} onChange={(v) => upd(v, n)} options={METHODS} className="max-w-full" />
          </div>
          <div>
            <Caption className="mb-1">Threads</Caption>
            <Seg label="Threads" value={n} onChange={(v) => upd(method, v)} options={[8, 16, 32].map((v) => ({ value: v, label: String(v) }))} />
          </div>
        </div>
      )}

      <p className="mb-2 text-xs text-ink-2">
        Thread <i>i</i> holds the number <i>i</i> + 1, so the right total is <b className="text-ink">{r.expected}</b>.
      </p>

      <div className="space-y-2 rounded-xl border border-line bg-surface p-2">
        {method === "plain" && (
          <>
            <p className="text-xs text-ink-2">Step 1: all {n} threads read sum = 0</p>
            <p className="text-xs text-ink-3">Then each writes 0 + x[i]. The last write wins:</p>
            <Cells values={r.values} lastTone="orange" />
            <p className="inline-block rounded-md border border-[var(--line-strong)] px-2 py-1 font-mono text-[13px] font-semibold text-ink" style={{ background: ORANGE_TINT }}>
              sum = {r.result}
            </p>
            <p className="text-xs text-ink-2">{r.lost} updates lost</p>
          </>
        )}
        {method === "atomic" && (
          <>
            <p className="text-xs text-ink-2">Running total after each of the {n} one-at-a-time updates:</p>
            <Cells values={r.trace[0]} lastTone="brand" />
          </>
        )}
        {method === "tree" &&
          r.trace.map((row, k) => {
            const last = k === r.trace.length - 1;
            return (
              <div key={k} className="space-y-1">
                <p className="text-xs text-ink-2">{k === 0 ? "Start" : `Round ${k}: ${row.length === 1 ? "1 thread adds the last pair" : `${row.length} threads add pairs`}`}</p>
                <Cells values={row} lastTone={last ? "brand" : undefined} />
              </div>
            );
          })}
      </div>

      <div className="mt-3">
        <Note tone={method === "plain" ? "accent" : "plain"}>
          {method === "plain" ? (
            <>
              <b>A race.</b> Every thread read 0 before anyone wrote, so each write overwrote the others. On real hardware the timing varies, so the wrong answer changes from run to run.
            </>
          ) : method === "atomic" ? (
            <>
              <b>Correct, but one at a time.</b> atomicAdd makes each read-add-write indivisible, so no update is lost, but {n} updates to one address take {n} steps.
            </>
          ) : (
            <>
              <b>Correct in {r.steps} rounds.</b> Each round halves the number of partial sums: log2 {n} = {r.steps}.
            </>
          )}
        </Note>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Result" value={r.result} accent={!r.correct} />
        <Readout label="Right total" value={r.expected} />
        <Readout label="Steps" value={r.steps} />
      </div>
      <p className="mt-2 text-xs text-ink-3">A toy: real timings vary, and real atomics on one address are served one after another by the memory system.</p>
    </div>
  );
}

/** goal: { method?: "plain" | "atomic" | "tree", n?: number, correct?: boolean, maxSteps?: number }. method and n match exactly. */
export function checkReduce(state: unknown, goal: Record<string, unknown>) {
  const s = state as ReduceState | undefined;
  if (!s) return false;
  if (typeof goal.method === "string" && s.method !== goal.method) return false;
  if (typeof goal.n === "number" && s.n !== goal.n) return false;
  if (typeof goal.correct === "boolean" && s.correct !== goal.correct) return false;
  if (typeof goal.maxSteps === "number" && s.steps > goal.maxSteps) return false;
  return true;
}

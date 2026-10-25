"use client";

import React, { useState } from "react";
import { ChevronRight, FastForward, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { CodeBlock } from "@/components/ui/Prose";
import { CODE_SURFACE, PanelLabel, Stepper, VarBox } from "./values";

type Param = "start" | "stop" | "step";

export interface LoopProps {
  /** Loop variable name. Default "i". */
  varName?: string;
  start?: number;
  stop: number;
  step?: number;
  /** Which range() arguments the learner can change. */
  editable?: Param[];
  /** Optional running total: `name = init` before the loop, `name = name <op> i` inside. */
  acc?: { name: string; init: number; op: "+" | "*" };
  /** Optional body line shown instead of the accumulator line, e.g. "print(i)". */
  body?: string;
  /** Write range(stop) when start is 0 and step is 1. Default true. */
  short?: boolean;
}

export interface LoopState {
  values: number[];
  count: number;
  /** Final accumulator value after the whole loop. */
  acc: number | null;
  start: number;
  stop: number;
  step: number;
}

const MAX_TILES = 30;

function rangeValues(start: number, stop: number, step: number): number[] {
  const out: number[] = [];
  if (step === 0) return out;
  for (let v = start; step > 0 ? v < stop : v > stop; v += step) {
    out.push(v);
    if (out.length > MAX_TILES) break;
  }
  return out;
}

/** A for-range loop drawn as one tile per iteration, with a counter and an optional running total. */
export function Loop({ props, onChange, revealed }: WidgetProps<LoopProps>) {
  const name = props.varName ?? "i";
  const [start, setStart] = useState(props.start ?? 0);
  const [stop, setStop] = useState(props.stop);
  const [step, setStep] = useState(props.step ?? 1);
  const [done, setDone] = useState(0); // iterations completed
  const editable = new Set(revealed ? [] : (props.editable ?? []));

  const values = rangeValues(start, stop, step);
  const tooMany = values.length > MAX_TILES;
  const shown = values.slice(0, MAX_TILES);
  const accAfter = (k: number) => {
    if (!props.acc) return null;
    let a = props.acc.init;
    for (const v of values.slice(0, k)) a = props.acc.op === "+" ? a + v : a * v;
    return a;
  };

  const set = (p: Param, v: number) => {
    const ns = p === "start" ? v : start;
    const nt = p === "stop" ? v : stop;
    const nst = p === "step" ? (v === 0 ? (step > 0 ? -1 : 1) : v) : step; // skip step 0
    setStart(ns);
    setStop(nt);
    setStep(nst);
    setDone(0);
    const vals = rangeValues(ns, nt, nst);
    let a: number | null = null;
    if (props.acc) {
      a = props.acc.init;
      for (const x of vals) a = props.acc.op === "+" ? a + x : a * x;
    }
    onChange?.({ values: vals, count: vals.length, acc: a, start: ns, stop: nt, step: nst } satisfies LoopState);
  };

  const shortForm = (props.short ?? true) && start === 0 && step === 1 && !props.editable?.includes("start");
  const args = shortForm ? `${stop}` : step === 1 && !props.editable?.includes("step") ? `${start}, ${stop}` : `${start}, ${stop}, ${step}`;
  const code = [
    ...(props.acc ? [`${props.acc.name} = ${props.acc.init}`] : []),
    `for ${name} in range(${args}):`,
    `    ${props.body ?? (props.acc ? `${props.acc.name} = ${props.acc.name} ${props.acc.op} ${name}` : `print(${name})`)}`,
  ];
  const finished = done >= values.length;
  const current = done > 0 ? values[done - 1] : null;

  return (
    <div className="w-full min-w-0">
      <pre className={`${CODE_SURFACE} overflow-x-auto px-4 py-3 font-mono text-[0.85rem] leading-relaxed`}>
        <CodeBlock code={code.join("\n")} language="python" />
      </pre>

      {editable.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {(["start", "stop", "step"] as Param[])
            .filter((p) => editable.has(p))
            .map((p) => (
              <Stepper key={p} label={p} value={p === "start" ? start : p === "stop" ? stop : step} min={-20} max={30} onChange={(v) => set(p, v)} />
            ))}
        </div>
      )}

      <div className="mt-4">
        <PanelLabel>
          {values.length === 0 ? "No iterations" : `${tooMany ? `More than ${MAX_TILES}` : values.length} ${values.length === 1 ? "iteration" : "iterations"}`}
        </PanelLabel>
        {values.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--line-strong)] p-3 text-sm text-ink-3">
            range({args}) is empty, so the body never runs.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {shown.map((v, k) => {
              const isCur = k === done - 1;
              const past = k < done - 1;
              return (
                <span
                  key={k}
                  className={`grid h-10 min-w-10 place-items-center rounded-lg border px-1.5 font-mono text-sm font-semibold tabular-nums transition-colors ${
                    isCur ? "border-transparent bg-primary text-primary-ink" : past ? "border-[var(--brand)]/40 bg-tint text-ink" : "border-line bg-surface text-ink-2"
                  }`}
                >
                  {v}
                </span>
              );
            })}
            {tooMany && <span className="grid h-10 place-items-center px-1 text-ink-3">…</span>}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <VarBox name={name} value={current ?? { py: "–" }} changed={done > 0 && !finished} />
        {props.acc && <VarBox name={props.acc.name} value={accAfter(done) ?? 0} changed={done > 0} />}
        <span className="mb-2 ml-1 text-sm text-ink-2" aria-live="polite">
          {done === 0 ? "Not started." : finished ? `Done after ${values.length} ${values.length === 1 ? "pass" : "passes"}.` : `Pass ${done} of ${values.length}.`}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button type="button" className={`btn ${finished ? "" : "btn-primary"} !h-10 flex-1 sm:flex-none sm:!px-5`} onClick={() => setDone((d) => Math.min(values.length, d + 1))} disabled={finished || tooMany}>
          {done === 0 ? "First pass" : "Next pass"} <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" className="btn !h-10" onClick={() => setDone(values.length)} disabled={finished || tooMany}>
          <FastForward className="h-4 w-4" /> <span className="hidden min-[360px]:inline">Run all</span>
        </button>
        <button type="button" className="btn btn-ghost ml-auto !h-10 !w-10 !p-0" onClick={() => setDone(0)} disabled={done === 0} aria-label="Start over" title="Start over">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function checkLoop(state: unknown, goal: Record<string, unknown>) {
  const s = state as LoopState | undefined;
  if (!s) return false;
  if (Array.isArray(goal.values)) return s.values.length === goal.values.length && s.values.every((v, i) => v === (goal.values as number[])[i]);
  if (typeof goal.count === "number") return s.count === goal.count;
  if (typeof goal.acc === "number") return s.acc === goal.acc;
  return false;
}

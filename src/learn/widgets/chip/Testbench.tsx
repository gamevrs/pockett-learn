"use client";

import React, { useMemo, useRef, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Note, Toy } from "../semi/ui";
import { Field, Stepper } from "../computer/ui";
import { compile, formatDiag, simulate, type Design } from "./verilog/index.ts";
import { MODELS, randomVectors, runModel, type ModelDef } from "./verilog/models.ts";

// ───────────── chip-testbench: build test vectors, run them against a DUT and a reference model ─────────────

type Vec = Record<string, number>;

export interface TestbenchProps {
  /** Verilog source of the design under test (shown read-only). Its ports must match the model's names. */
  dut: string;
  /** Reference model: "adder4" | "mux2" | "max2" | "parity4" | "cmp4" | "counter4". */
  model: string;
  /** Override: treat the DUT as clocked (default: whatever the model says). */
  clocked?: boolean;
  title?: string;
  /** Starting test vectors (default: one all-zero vector). */
  initial?: Vec[];
  /** Seed for the "random vectors" button (default 1). */
  seed?: number;
}

export interface TestbenchState {
  vectors: Vec[];
  ran: boolean;
  failures: number;
  passes: number;
}

/** goal: { minFailures?, minVectors?, minPasses?, maxFailures? }. The check needs the tests to have been run. */
export function checkTestbench(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as TestbenchState | undefined;
  if (!s || !s.ran) return false;
  const n = (k: string) => (typeof goal[k] === "number" ? (goal[k] as number) : undefined);
  if (n("minFailures") !== undefined && s.failures < n("minFailures")!) return false;
  if (n("maxFailures") !== undefined && s.failures > n("maxFailures")!) return false;
  if (n("minPasses") !== undefined && s.passes < n("minPasses")!) return false;
  if (n("minVectors") !== undefined && s.vectors.length < n("minVectors")!) return false;
  return true;
}

interface RowResult {
  dut: Record<string, number>;
  want: Record<string, number>;
  pass: boolean;
}

interface Outcome {
  error?: string;
  rows: RowResult[];
}

function portProblem(d: Design, m: ModelDef): string | undefined {
  for (const p of [...m.inputs, ...m.outputs]) {
    const s = d.signals.find((x) => x.name === p.name);
    const dir = m.inputs.includes(p) ? "input" : "output";
    if (!s) return `This design has no port named \`${p.name}\` (the reference model for "${m.label}" needs ${dir} \`${p.name}\`, ${p.width} bit${p.width === 1 ? "" : "s"}).`;
    if (s.kind !== dir) return `\`${p.name}\` should be an ${dir} of this design.`;
    if (s.width !== p.width) return `\`${p.name}\` should be ${p.width} bit${p.width === 1 ? "" : "s"} wide, not ${s.width}.`;
  }
  if (m.clock && !d.signals.some((s) => s.name === m.clock && s.kind === "input")) return `This design needs a clock input called \`${m.clock}\`.`;
  return undefined;
}

function runTests(dutSrc: string, m: ModelDef, vectors: Vec[], clocked: boolean): Outcome {
  const c = compile(dutSrc);
  if (!c.ok) return { error: c.errors.map(formatDiag).join(" "), rows: [] };
  const prob = portProblem(c.design, m);
  if (prob) return { error: prob, rows: [] };
  const r = simulate(c.design, { clock: clocked ? (m.clock ?? c.design.clock) : undefined, steps: vectors });
  if (!r.ok) return { error: r.errors.map(formatDiag).join(" "), rows: [] };
  const want = runModel(m, vectors);
  const rows = vectors.map((_, i) => {
    const dut: Record<string, number> = {};
    let pass = true;
    for (const o of m.outputs) {
      dut[o.name] = r.trace.values[o.name][i];
      if (dut[o.name] !== want[i][o.name]) pass = false;
    }
    return { dut, want: want[i], pass };
  });
  return { rows };
}

const fmtOut = (m: ModelDef, v: Record<string, number>) => m.outputs.map((o) => `${o.name}=${v[o.name]}`).join("  ");

export function Testbench({ props, onChange }: WidgetProps<TestbenchProps>) {
  const model = MODELS[props.model];
  const clocked = props.clocked ?? Boolean(model?.clock);
  const [vectors, setVectors] = useState<Vec[]>(() => props.initial ?? (model ? [Object.fromEntries(model.inputs.map((p) => [p.name, 0]))] : []));
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const presses = useRef(0);

  const lines = useMemo(() => props.dut.split("\n"), [props.dut]);

  if (!model) {
    return (
      <div className="w-full" data-widget>
        <Note>This testbench has no reference model called &ldquo;{props.model}&rdquo;. Available: {Object.keys(MODELS).join(", ")}.</Note>
      </div>
    );
  }

  const report = (vs: Vec[], o: Outcome | null) => {
    const passes = o ? o.rows.filter((r) => r.pass).length : 0;
    const failures = o ? o.rows.length - passes : 0;
    onChange?.({ vectors: vs, ran: Boolean(o && !o.error), failures, passes } satisfies TestbenchState);
  };
  const update = (vs: Vec[]) => {
    setVectors(vs);
    setOutcome(null);
    report(vs, null);
  };
  const setField = (i: number, name: string, v: number) => update(vectors.map((row, k) => (k === i ? { ...row, [name]: v } : row)));
  const zero = () => Object.fromEntries(model.inputs.map((p) => [p.name, 0]));
  const run = () => {
    const o = runTests(props.dut, model, vectors, clocked);
    setOutcome(o);
    report(vectors, o);
  };

  const passes = outcome ? outcome.rows.filter((r) => r.pass).length : 0;
  const failures = outcome ? outcome.rows.length - passes : 0;

  return (
    <div className="w-full" data-widget>
      {props.title && <Caption className="mb-1.5">{props.title}</Caption>}
      <Caption className="mb-1.5">Design under test (read-only)</Caption>
      <div className="max-h-72 overflow-auto rounded-xl border border-line bg-surface-2">
        <div className="flex w-max min-w-full">
          <div aria-hidden className="shrink-0 select-none border-r border-line py-2 pl-2 pr-2 text-right font-mono text-[14px] leading-6 text-ink-3">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <pre className="m-0 flex-1 p-2 font-mono text-[14px] leading-6 text-ink">{props.dut}</pre>
        </div>
      </div>
      <p className="mt-2 text-[0.88rem] leading-snug text-ink-2">
        Reference model: <span className="font-semibold text-ink">{model.label}</span>. {model.blurb}.{" "}
        {clocked ? "Each row is one clock cycle, run in order from reset (all zeros)." : "Each row is one input combination."}
      </p>

      <Caption className="mb-1.5 mt-3">Test vectors</Caption>
      <ol className="flex flex-col gap-2">
        {vectors.map((row, i) => {
          const res = outcome?.rows[i];
          return (
            <li key={i} className={`rounded-xl border p-2.5 ${res ? (res.pass ? "border-[var(--good)]/60" : "border-[var(--bad)]/70") : "border-line"} bg-surface`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[0.82rem] font-semibold text-ink-2">{clocked ? "Cycle" : "Vector"} {i + 1}</span>
                <button
                  type="button"
                  onClick={() => update(vectors.filter((_, k) => k !== i))}
                  aria-label={`Remove vector ${i + 1}`}
                  className="grid h-10 min-w-10 place-items-center rounded-full border border-line px-3 text-sm text-ink-2 hover:bg-surface-2"
                >
                  Remove
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-2">
                {model.inputs.map((p) => (
                  <Field key={p.name} label={`${p.name}${p.width > 1 ? ` (0 to ${2 ** p.width - 1})` : ""}`}>
                    <Stepper label={`${p.name} of vector ${i + 1}`} value={row[p.name] ?? 0} min={0} max={2 ** p.width - 1} onChange={(v) => setField(i, p.name, v)} />
                  </Field>
                ))}
              </div>
              {res && (
                <div className="mt-2 rounded-lg bg-surface-2 px-2.5 py-2 font-mono text-[0.84rem] leading-snug">
                  <p className="text-ink">
                    <span className="text-ink-3">DUT gives </span>
                    {fmtOut(model, res.dut)}
                  </p>
                  <p className="text-ink">
                    <span className="text-ink-3">expected </span>
                    {fmtOut(model, res.want)}
                  </p>
                  <p className={`mt-0.5 font-sans text-[0.9rem] font-bold ${res.pass ? "text-good" : "text-bad"}`}>{res.pass ? "PASS" : "FAIL"}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {vectors.length === 0 && <p className="mt-1 text-sm text-ink-3">No vectors yet: add one.</p>}

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Btn onClick={() => update([...vectors, zero()])} disabled={vectors.length >= 40}>
          Add vector
        </Btn>
        <Btn
          onClick={() => {
            presses.current += 1;
            update([...vectors, ...randomVectors(model, 5, (props.seed ?? 1) * 1000 + presses.current)].slice(0, 40));
          }}
          disabled={vectors.length >= 40}
        >
          Add 5 random
        </Btn>
        <Btn onClick={() => update([])} disabled={vectors.length === 0}>
          Clear
        </Btn>
        <Btn primary onClick={run} disabled={vectors.length === 0}>
          Run tests
        </Btn>
      </div>

      <div className="mt-3">
        {outcome?.error ? (
          <Note>{outcome.error}</Note>
        ) : outcome ? (
          <Note tone={failures ? "accent" : "plain"}>
            {passes} passed, {failures} failed.{" "}
            {failures ? "A failing vector is the test doing its job: it found a place where the design and the reference model disagree." : "Passing means only that these vectors didn't find a bug; the design may still be wrong somewhere you didn't test."}
          </Note>
        ) : (
          <Note>Build some vectors, then press Run tests. Not run yet.</Note>
        )}
      </div>
      <Toy>
        Toy testbench: the simulator is the small Verilog subset (2-state, one module, 32 bits at most) and the reference model is plain code, not Verilog. Real testbenches are written in Verilog or SystemVerilog (or in Python with cocotb) and run in simulators such as Icarus Verilog or Verilator.
      </Toy>
    </div>
  );
}

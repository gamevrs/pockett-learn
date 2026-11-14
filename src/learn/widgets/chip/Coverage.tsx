"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Meter, Note, Readout, Seg, Toy, ORANGE } from "../semi/ui";
import { ALL_BINS, CLASSES, CLASS_HELP, CROSS_BINS, CROSS_HELP, OPS, OP_LABEL, TOTAL_BINS, aluRun, binsOf, directedVector, formalCheck, randomVector, FORMAL_PROPERTY, type FormalResult, type Vec } from "./coverage-model.ts";

export { checkCoverage } from "./coverage-model.ts";

// ───────────── chip-coverage: functional coverage, random vs directed vs formal ─────────────

export interface CoverageProps {
  title?: string;
  /** Seed of the random stream (default 7). The same seed always gives the same vectors. */
  seed?: number;
  /** Start with the bias-toward-corners toggle on (default false). */
  biased?: boolean;
  /** Show the formal panel (default true). */
  formal?: boolean;
}

export interface CoverageState {
  coverage: number;
  testsRun: number;
  directedRuns: number;
  randomRuns: number;
  binsHit: string[];
  formalRun?: boolean;
}

interface Sim {
  hit: string[];
  directed: number;
  random: number;
  last?: { vec: Vec; fresh: string[]; kind: string; count: number };
}

const binLabel = (b: string) => {
  const [op, rest] = b.split(":");
  return `${OP_LABEL[op as keyof typeof OP_LABEL]} ${rest}`;
};
const describe = (v: Vec) => {
  const r = aluRun(v);
  return `${OP_LABEL[v.op]} ${v.a}, ${v.b} → ${r.result}${r.flag ? (v.op === "add" ? " (carry out)" : " (borrow)") : ""}`;
};
const CHECKS = [1, 3, 10, 30, 100, 300, 1000, 3000];

function curve(seed: number, biased: boolean): number[] {
  const hit = new Set<string>();
  const out: number[] = [];
  for (let i = 0; i < CHECKS[CHECKS.length - 1]; i++) {
    for (const b of binsOf(randomVector(seed, i, biased))) hit.add(b);
    if (CHECKS.includes(i + 1)) out.push(hit.size / TOTAL_BINS);
  }
  return out;
}

export function Coverage({ props, onChange, goal, status }: WidgetProps<CoverageProps>) {
  const seed = props.seed ?? 7;
  const [sim, setSim] = useState<Sim>({ hit: [], directed: 0, random: 0 });
  const [biased, setBiased] = useState(props.biased === true);
  const [target, setTarget] = useState<string | null>(null);
  const [bug, setBug] = useState(false);
  const [formalRun, setFormalRun] = useState(false);
  const [formalRes, setFormalRes] = useState<{ bug: boolean; res: FormalResult } | null>(null);

  const hitSet = useMemo(() => new Set(sim.hit), [sim.hit]);
  const coverage = sim.hit.length / TOTAL_BINS;
  const curves = useMemo(() => ({ plain: curve(seed, false), biased: curve(seed, true) }), [seed]);

  const state = useMemo<CoverageState>(
    () => ({ coverage, testsRun: sim.directed + sim.random, directedRuns: sim.directed, randomRuns: sim.random, binsHit: [...sim.hit].sort(), ...(props.formal === false ? {} : { formalRun }) }),
    [coverage, sim, formalRun, props.formal]
  );
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  useEffect(() => {
    cb.current?.(state);
  }, [state]);

  const runVectors = (vecs: Vec[], kind: string, isRandom: boolean) =>
    setSim((s) => {
      const have = new Set(s.hit);
      const fresh: string[] = [];
      for (const v of vecs)
        for (const b of binsOf(v)) {
          if (have.has(b)) continue;
          have.add(b);
          fresh.push(b);
        }
      return {
        hit: [...have],
        directed: s.directed + (isRandom ? 0 : vecs.length),
        random: s.random + (isRandom ? vecs.length : 0),
        last: { vec: vecs[vecs.length - 1], fresh, kind, count: vecs.length },
      };
    });
  const runRandom = (k: number) => {
    const vecs = Array.from({ length: k }, (_, j) => randomVector(seed, sim.random + j, biased));
    runVectors(vecs, `${k} random`, true);
  };
  const dv = target ? directedVector(target) : null;
  const minCov = typeof goal?.minCoverage === "number" ? goal.minCoverage : undefined;

  const bin = (id: string, children: React.ReactNode, className = "") => {
    const hit = hitSet.has(id);
    const on = target === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setTarget(on ? null : id)}
        aria-pressed={on}
        aria-label={`${binLabel(id)}: ${hit ? "hit" : "not hit yet"}${on ? ", selected for a directed test" : ""}`}
        className={`min-h-10 rounded-lg border px-1 text-[0.78rem] font-medium leading-tight ${hit ? "border-[var(--brand)] bg-tint text-ink" : "border-dashed border-[var(--line-strong)] bg-surface text-ink-3"} ${on ? "outline outline-2 outline-offset-1 outline-[var(--brand)]" : ""} ${className}`}
      >
        {hit ? "✓ " : ""}
        {children}
      </button>
    );
  };

  // chart
  const CW = 360;
  const CH = 150;
  const px = (i: number) => 40 + (Math.log10(CHECKS[i]) / Math.log10(3000)) * 300;
  const py = (f: number) => 120 - f * 100;
  const pathOf = (ys: number[]) => ys.map((f, i) => `${i ? "L" : "M"}${px(i).toFixed(1)} ${py(f).toFixed(1)}`).join(" ");

  return (
    <div className="w-full" data-widget>
      {props.title && <Caption className="mb-1.5">{props.title}</Caption>}
      <p className="text-[0.88rem] leading-snug text-ink-2">
        The design under test is an 8-bit ALU with four operations. Each box is a coverage bin: a situation the testbench must have exercised at least once. Tap a box to pick it as the target of a directed test.
      </p>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <div className="grid gap-1" style={{ gridTemplateColumns: "2.6rem repeat(5, minmax(0, 1fr))" }} role="group" aria-label="Coverage bins, operation by operand class">
          <span />
          {CLASSES.map((c) => (
            <span key={c} className="text-center text-[0.7rem] font-medium text-ink-3">
              {c}
            </span>
          ))}
          {OPS.map((o) => (
            <React.Fragment key={o}>
              <span className="flex items-center text-[0.78rem] font-semibold text-ink">{OP_LABEL[o]}</span>
              {CLASSES.map((c) => bin(`${o}:${c}`, hitSet.has(`${o}:${c}`) ? "" : "·"))}
            </React.Fragment>
          ))}
        </div>
        <Caption className="mb-1 mt-3">Corner cases</Caption>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Corner-case bins">
          {CROSS_BINS.map((b) => bin(b, binLabel(b).replace("wrap0", "wraps to 0").replace("carry", "carry out"), "px-2.5"))}
        </div>
        <details className="mt-2">
          <summary className="flex min-h-10 cursor-pointer items-center text-sm font-medium text-ink">What the bins mean</summary>
          <ul className="flex list-disc flex-col gap-1 px-5 pb-1 text-[0.84rem] leading-snug text-ink-2">
            {CLASSES.map((c) => (
              <li key={c}>
                <strong className="text-ink">{c}</strong>: {CLASS_HELP[c]} (the first matching class wins, in the order zero, max, small, large, mid)
              </li>
            ))}
            {CROSS_BINS.map((b) => (
              <li key={b}>
                <strong className="text-ink">{binLabel(b)}</strong>: {CROSS_HELP[b]}
              </li>
            ))}
          </ul>
        </details>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="text-ink-2">Functional coverage</span>
          <span className="font-mono font-semibold tabular-nums text-ink">
            {sim.hit.length} / {TOTAL_BINS} bins = {Math.round(coverage * 100)} %{minCov !== undefined ? ` (target ${Math.round(minCov * 100)} %)` : ""}
          </span>
        </div>
        <Meter frac={coverage} label={`Coverage ${Math.round(coverage * 100)} percent`} />
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="Tests run" value={sim.directed + sim.random} />
        <Readout label="Directed" value={sim.directed} />
        <Readout label="Random" value={sim.random} />
      </div>

      <div className="mt-3 flex flex-col items-center gap-2">
        <Seg
          label="Random test constraints"
          value={biased ? "bias" : "uniform"}
          onChange={(v) => setBiased(v === "bias")}
          options={[
            { value: "uniform", label: "Uniform random" },
            { value: "bias", label: "Bias toward corners" },
          ]}
        />
        <div className="flex flex-wrap justify-center gap-2">
          <Btn primary onClick={() => runRandom(10)}>
            Run 10 random
          </Btn>
          <Btn primary onClick={() => runRandom(100)}>
            Run 100 random
          </Btn>
          <Btn primary onClick={() => runRandom(1000)}>
            Run 1000 random
          </Btn>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Btn disabled={!dv} onClick={() => dv && runVectors([dv], "directed", false)}>
            {dv && target ? `Run directed test: ${describe(dv).split(" →")[0]}` : "Run directed test (pick a bin first)"}
          </Btn>
          <Btn
            onClick={() => {
              setSim({ hit: [], directed: 0, random: 0 });
              setTarget(null);
            }}
          >
            Reset
          </Btn>
        </div>
      </div>

      <div className="mt-3">
        <Note tone={sim.last?.fresh.length ? "accent" : "plain"}>
          {sim.last
            ? `Last: ${sim.last.kind === "directed" ? "directed test" : sim.last.kind + " tests"}${sim.last.count === 1 ? ` (${describe(sim.last.vec)})` : `, the final vector was ${describe(sim.last.vec)}`}. ${
                sim.last.fresh.length ? `New bins: ${sim.last.fresh.map(binLabel).join(", ")}.` : "No new bins: that effort added nothing."
              }`
            : "Nothing run yet. Seeded, so the same buttons always give the same results. A directed test hits exactly the bin you aim at; random tests reach the common bins fast and the rare corners slowly."}
        </Note>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <Caption className="mb-1">Random tests needed: coverage after n random tests (seed {seed})</Caption>
        <svg viewBox={`0 0 ${CW} ${CH}`} className="block h-auto w-full" role="img" aria-label={`Coverage after 1 to 3000 random tests. Uniform random reaches ${Math.round(curves.plain[curves.plain.length - 1] * 100)} percent; biased toward corners reaches ${Math.round(curves.biased[curves.biased.length - 1] * 100)} percent.`}>
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={40} x2={340} y1={py(f)} y2={py(f)} stroke="var(--line)" />
              <text x={34} y={py(f) + 5} textAnchor="end" fontSize={14} fill="var(--ink-3)">
                {f * 100}%
              </text>
            </g>
          ))}
          {[1, 10, 100, 1000].map((v) => {
            const x = 40 + (Math.log10(v) / Math.log10(3000)) * 300;
            return (
              <text key={v} x={x} y={142} textAnchor="middle" fontSize={14} fill="var(--ink-3)">
                {v === 1000 ? "1k" : v}
              </text>
            );
          })}
          <path d={pathOf(curves.plain)} fill="none" stroke={ORANGE} strokeWidth={2.5} strokeLinejoin="round" />
          <path d={pathOf(curves.biased)} fill="none" stroke="var(--brand)" strokeWidth={2.5} strokeLinejoin="round" />
          {CHECKS.map((_, i) => (
            <g key={i}>
              <circle cx={px(i)} cy={py(curves.plain[i])} r={3} fill={ORANGE} />
              <circle cx={px(i)} cy={py(curves.biased[i])} r={3} fill="var(--brand)" />
            </g>
          ))}
          <text x={px(5)} y={py(curves.plain[5]) + 18} fontSize={14} fill="var(--ink)" stroke="var(--surface)" strokeWidth={4} paintOrder="stroke">
            uniform
          </text>
          <text x={px(2)} y={py(curves.biased[2]) - 8} fontSize={14} fill="var(--ink)" stroke="var(--surface)" strokeWidth={4} paintOrder="stroke">
            biased
          </text>
        </svg>
        <p className="text-xs text-ink-3">Fast at first, then flat: each new bin is rarer than the last. Biasing the constraints toward corner values (0, 1, 15, 128, 240, 254, 255 and equal operands) reaches the rare bins far sooner.</p>
      </div>

      {props.formal !== false && (
        <div className="mt-3 rounded-xl border border-line bg-surface p-3">
          <Caption className="mb-1">Formal: proving instead of sampling</Caption>
          <p className="text-[0.86rem] leading-snug text-ink-2">
            A tiny 4-bit saturating adder must never return less than either input: <span className="font-mono text-ink">{FORMAL_PROPERTY}</span>. A formal tool checks this for every possible input, not just the ones a test happened to pick. Here the model is small enough to try all 2<sup>8</sup> = 256 input pairs; real formal tools use SAT/SMT solvers and other proof engines instead of brute force, which lets them handle designs with far more inputs.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Btn
              on={bug}
              onClick={() => {
                setBug((b) => !b);
                setFormalRes(null);
              }}
            >
              {bug ? "Bug injected: saturates at sum > 16" : "Correct: saturates at sum > 15"}
            </Btn>
            <Btn
              primary
              onClick={() => {
                setFormalRes({ bug, res: formalCheck(bug) });
                setFormalRun(true);
              }}
            >
              Run formal check
            </Btn>
          </div>
          <div className="mt-2">
            {formalRes ? (
              formalRes.res.failures === 0 ? (
                <Note tone="accent">Checked all {formalRes.res.checked} of {formalRes.res.checked} input pairs: the property holds for every input. That is a proof, not a lucky run.</Note>
              ) : (
                <Note>
                  Counterexample found: a = {formalRes.res.first!.a}, b = {formalRes.res.first!.b} gives {formalRes.res.first!.out}, which is below an input. {formalRes.res.failures} of {formalRes.res.checked} input pairs fail. A random test finds this only {((formalRes.res.failures / formalRes.res.checked) * 100).toFixed(1)} % of the time per try, so 10 random tests would miss it about {Math.round(Math.pow(1 - formalRes.res.failures / formalRes.res.checked, 10) * 100)} % of the time; the formal run did not miss it.
                </Note>
              )
            ) : (
              <p className="text-center text-sm text-ink-3">Not run yet. Try it with and without the bug.</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-3">
        <Note>
          Industry testbenches usually are not hand-wired like this. UVM (Universal Verification Methodology, a SystemVerilog class library) structures them as generators, drivers, monitors and scoreboards with built-in coverage collection; cocotb is a Python alternative that drives a simulator from Python coroutines.
        </Note>
      </div>
      {status === "revealed" && minCov !== undefined && (
        <p className="mt-2 text-sm text-ink-2">Tip: switch to biased random and press Run 100 random a few times, or aim directed tests at the bins that stay empty.</p>
      )}
      <Toy>
        Toy verification: random vectors come from a small seeded generator, coverage bins are the {ALL_BINS.length} listed above, and the DUT is not simulated at gate level (only its results are shown). Real coverage models count thousands of bins, and closing the last few percent is where most of the effort goes.
      </Toy>
    </div>
  );
}

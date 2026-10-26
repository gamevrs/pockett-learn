"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Segmented, Slider, noise, useReport } from "./kit";

/**
 * Twenty-four pipeline runs on the same, unchanged commit. Every test has a small chance of
 * failing for no reason (a timing race, a busy shared database). Turn the dial and the number of
 * red runs shows how fast tiny flake rates add up across a whole suite, and what retries hide.
 */

export interface FlakyProps {
  tests?: number;
  runs?: number;
  /** Starting flake rate in percent per test per run. */
  rate?: number;
  retries?: number;
  seed?: number;
}

export interface FlakyState {
  rate: number;
  retries: number;
  tests: number;
  red: number;
  runs: number;
  retried: number;
}

const SEED = 31;

export function simulateFlaky(tests: number, runs: number, rate: number, retries: number, seed: number) {
  const cells: { red: boolean; retried: number }[] = [];
  for (let r = 0; r < runs; r++) {
    let red = false;
    let retried = 0;
    for (let t = 0; t < tests; t++) {
      // attempt a fails with probability rate; the test fails the run only if every attempt fails
      let failed = true;
      for (let a = 0; a <= retries; a++) {
        const flake = noise(seed, r, t, a) * 100 < rate;
        if (!flake) {
          failed = false;
          if (a > 0) retried++;
          break;
        }
      }
      if (failed) red = true;
    }
    cells.push({ red, retried });
  }
  return cells;
}

export function Flaky({ props, onChange, revealed }: WidgetProps<FlakyProps>) {
  const tests = props.tests ?? 40;
  const runs = props.runs ?? 24;
  const [rate, setRate] = useState(props.rate ?? 2);
  const [retries, setRetries] = useState(props.retries ?? 0);
  const cells = simulateFlaky(tests, runs, rate, retries, props.seed ?? SEED);
  const red = cells.filter((c) => c.red).length;
  const retried = cells.reduce((n, c) => n + c.retried, 0);
  const expectGreen = Math.pow(1 - Math.pow(rate / 100, retries + 1), tests);
  useReport(onChange, { rate, retries, tests, red, runs, retried } satisfies FlakyState, `${rate}|${retries}`);

  return (
    <div className="w-full max-w-2xl">
      <div className="grid gap-3 min-[520px]:grid-cols-[1fr_auto] min-[520px]:items-end">
        <Slider label={`Chance that any one of the ${tests} tests flakes`} value={rate} min={0} max={5} step={0.5} format={(v) => `${v}%`} onChange={setRate} disabled={revealed} />
        <Segmented
          label="Retries per test"
          value={retries}
          disabled={revealed}
          onChange={setRetries}
          options={[
            { id: 0, label: "No retry" },
            { id: 1, label: "Retry once" },
            { id: 2, label: "Retry twice" },
          ]}
        />
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <Caption>{runs} runs of the same commit (nothing changed between them)</Caption>
        <div className="mt-2 grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(1.75rem, 1fr))" }}>
          {cells.map((c, i) => (
            <span
              key={i}
              title={`run ${i + 1}: ${c.red ? "red" : "green"}`}
              className={`grid h-7 place-items-center rounded-md font-mono text-[10px] ${c.red ? "bg-[var(--bad)] text-white" : "bg-primary text-primary-ink"}`}
            >
              {i + 1}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" aria-live="polite">
        <Readout label="Red runs" value={`${red} of ${runs}`} accent={red > 0} />
        <Readout label="Chance a run is green" value={`${Math.round(expectGreen * 100)}%`} />
        {retries > 0 && <Readout label="Tests that needed a retry" value={retried} />}
      </div>
      <Note className="mt-2">
        {rate === 0
          ? "No flakes, so every run agrees. This is the suite you want."
          : retries === 0
            ? `Each test is right ${100 - rate}% of the time, but all ${tests} must be right at once: (1 - ${rate / 100})^${tests} is about ${Math.round(expectGreen * 100)}%. Small flake rates multiply.`
            : `Retries turn most flakes green, but ${retried} tests only passed on a retry. Those are the real failures hiding behind a green tick: log them and fix the worst ones.`}
      </Note>
    </div>
  );
}

/** goal: { maxRed } and optionally { minRate } so the learner cannot just set the dial to zero. */
export function checkFlaky(state: unknown, goal: Record<string, unknown>) {
  const s = state as FlakyState | undefined;
  if (!s) return false;
  if (typeof goal.maxRed === "number" && s.red > goal.maxRed) return false;
  if (typeof goal.minRed === "number" && s.red < goal.minRed) return false;
  if (typeof goal.minRate === "number" && s.rate < goal.minRate) return false;
  if (typeof goal.retries === "number" && s.retries !== goal.retries) return false;
  return ["maxRed", "minRed", "minRate", "retries"].some((k) => k in goal);
}

"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Slider } from "../ai/ui";
import { Btn, Caption, Note, Readout } from "../computer/ui";
import { patternOutcomes, runPredictor, type PatternId, type PredictorKind } from "./sim";

export interface BranchProps {
  /** Patterns on offer. Default all five. */
  patterns?: PatternId[];
  /** Predictors on offer. Default the four simple ones. */
  predictors?: PredictorKind[];
  penalty?: number;
  /** Show the mispredict-penalty slider. Default true. */
  showPenalty?: boolean;
  initialPattern?: PatternId;
  initialPredictor?: PredictorKind;
}

export interface BranchState {
  pattern: PatternId;
  predictor: PredictorKind;
  misses: number;
  total: number;
  accuracy: number;
  penalty: number;
  wasted: number;
  /** Which (pattern, predictor) pairs the learner has tried, as "pattern:predictor". */
  tried: string[];
}

const PATTERN_LABEL: Record<PatternId, string> = {
  loop: "Loop of 8",
  alternate: "Alternating",
  random: "Coin flips",
  sorted: "Sorted data",
  unsorted: "Shuffled data",
};
const PATTERN_NOTE: Record<PatternId, string> = {
  loop: "A loop that runs 8 times, then starts again: the branch at the bottom is taken 7 times, then not taken once.",
  alternate: "Taken, not taken, taken, not taken, over and over.",
  random: "Each outcome is a fair coin flip. Nobody can guess it.",
  sorted: "if (x >= 128) over bytes in sorted order: a long run of not taken, then a long run of taken.",
  unsorted: "The same if (x >= 128) over the same bytes in shuffled order: taken or not taken at random.",
};
const PRED_LABEL: Record<PredictorKind, string> = {
  "static-not": "Always 'no'",
  "static-taken": "Always 'yes'",
  "one-bit": "Last time (1-bit)",
  "two-bit": "2-bit counter",
  history: "Pattern history",
};
const PRED_NOTE: Record<PredictorKind, string> = {
  "static-not": "Always guesses the branch is not taken.",
  "static-taken": "Always guesses the branch is taken.",
  "one-bit": "Guesses whatever happened the last time.",
  "two-bit": "A counter from 0 to 3 that nudges up when taken and down when not. It guesses taken from 2 up, so one odd outcome does not flip it.",
  history: "Remembers the last 4 outcomes and keeps a 2-bit counter for each pattern of 4. It can learn short repeating patterns.",
};

/** Predictors guessing the outcomes of one branch. Pick a pattern and a predictor, then see the misses and the cycles they waste. */
export function Branch({ props, onChange }: WidgetProps<BranchProps>) {
  const patterns = props.patterns ?? (["loop", "alternate", "random", "sorted", "unsorted"] as PatternId[]);
  const predictors = props.predictors ?? (["static-not", "static-taken", "one-bit", "two-bit"] as PredictorKind[]);
  const [pattern, setPattern] = useState<PatternId>(props.initialPattern ?? patterns[0]);
  const [predictor, setPredictor] = useState<PredictorKind>(props.initialPredictor ?? predictors[0]);
  const [penalty, setPenalty] = useState(props.penalty ?? 15);
  const [tried, setTried] = useState<string[]>([]);

  const outcomes = patternOutcomes(pattern);
  const run = runPredictor(predictor, outcomes);
  const accuracy = run.hits / outcomes.length;

  const report = (pa: PatternId, pr: PredictorKind, pen: number, t: string[]) => {
    const r = runPredictor(pr, patternOutcomes(pa));
    const n = r.preds.length;
    onChange?.({ pattern: pa, predictor: pr, misses: r.misses, total: n, accuracy: r.hits / n, penalty: pen, wasted: r.misses * pen, tried: t } satisfies BranchState);
  };
  const choose = (pa: PatternId, pr: PredictorKind) => {
    const key = `${pa}:${pr}`;
    const t = tried.includes(key) ? tried : [...tried, key];
    setPattern(pa);
    setPredictor(pr);
    setTried(t);
    report(pa, pr, penalty, t);
  };

  return (
    <div className="w-full">
      <Caption className="mb-1">What the branch does</Caption>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Branch pattern">
        {patterns.map((p) => (
          <Btn key={p} on={p === pattern} onClick={() => choose(p, predictor)}>
            {PATTERN_LABEL[p]}
          </Btn>
        ))}
      </div>
      <Caption className="mb-1 mt-3">The predictor</Caption>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Predictor">
        {predictors.map((p) => (
          <Btn key={p} on={p === predictor} onClick={() => choose(pattern, p)}>
            {PRED_LABEL[p]}
          </Btn>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-3">
        {PATTERN_NOTE[pattern]} {PRED_NOTE[predictor]}
      </p>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-2.5">
        <Caption className="mb-1.5">{outcomes.length} branches in a row · T = taken, N = not taken · filled = guessed wrong</Caption>
        <div className="flex flex-wrap gap-1" role="img" aria-label={`${run.misses} wrong guesses out of ${outcomes.length}`}>
          {outcomes.map((o, i) => (
            <span
              key={i}
              className={`grid h-7 w-7 place-items-center rounded-md border font-mono text-[11px] font-semibold ${
                run.correct[i] ? "border-line bg-surface text-ink-2" : "border-transparent bg-primary text-primary-ink"
              }`}
            >
              {o ? "T" : "N"}
            </span>
          ))}
        </div>
      </div>

      {(props.showPenalty ?? true) && (
        <Slider
          className="mt-2"
          label="Cycles lost per wrong guess"
          value={penalty}
          min={5}
          max={25}
          onChange={(v) => {
            setPenalty(v);
            report(pattern, predictor, v, tried);
          }}
          format={(v) => `${v} cycles`}
        />
      )}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="Wrong" value={`${run.misses} of ${outcomes.length}`} />
        <Readout label="Accuracy" value={`${Math.round(accuracy * 100)}%`} accent />
        <Readout label="Cycles wasted" value={run.misses * penalty} accent />
      </div>
      <div className="mt-3">
        <Note>A toy: real predictors are bigger and cleverer. Typical modern cores lose roughly 10 to 20 cycles on a wrong guess.</Note>
      </div>
    </div>
  );
}

/** goal: { pattern, predictor, maxMisses, minMisses, maxAccuracy, minAccuracy, triedAtLeast }. */
export function checkBranch(state: unknown, goal: Record<string, unknown>) {
  const s = state as BranchState | undefined;
  if (!s) return false;
  if (typeof goal.pattern === "string" && s.pattern !== goal.pattern) return false;
  if (typeof goal.predictor === "string" && s.predictor !== goal.predictor) return false;
  if (typeof goal.maxMisses === "number" && s.misses > goal.maxMisses) return false;
  if (typeof goal.minMisses === "number" && s.misses < goal.minMisses) return false;
  if (typeof goal.triedAtLeast === "number" && s.tried.length < goal.triedAtLeast) return false;
  return true;
}

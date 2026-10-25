"use client";

import React, { useState } from "react";
import { Crosshair, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Note, Readout } from "./ui";

/**
 * Face-down number cards. The learner turns cards over one at a time and every turn is counted
 * as one "look", which is the step we count instead of seconds.
 *
 * - mode "max": find the largest card. A "best so far" box tracks the running maximum, and
 *   "That's the largest" stops early (and is wrong if an unseen card was bigger).
 * - mode "find": find `target`. With `sorted` cards each look also rules out one side (the
 *   cards that can't hold the target dim), and an optional helper looks in the middle of what's left.
 */
export interface CardsProps {
  values: number[];
  mode?: "max" | "find";
  target?: number;
  /** Cards are in ascending order: looks rule out a side. Default: detected from values. */
  sorted?: boolean;
  /** Show a "Look in the middle" button (binary search helper). */
  helper?: boolean;
}

export interface CardsState {
  looks: number;
  done: boolean;
  /** max: the answer given was the real maximum; find: the target was turned over. */
  correct: boolean;
  found: boolean;
}

const isAscending = (v: number[]) => v.every((x, i) => i === 0 || v[i - 1] <= x);

export function Cards({ props, onChange, revealed, status }: WidgetProps<CardsProps>) {
  const values = props.values;
  const mode = props.mode ?? "max";
  const sorted = props.sorted ?? (mode === "find" && isAscending(values));
  const [open, setOpen] = useState<number[]>([]); // indexes in the order they were turned
  const [answered, setAnswered] = useState<null | { correct: boolean }>(null);

  const max = Math.max(...values);
  const seen = open.map((i) => values[i]);
  const best = seen.length ? Math.max(...seen) : null;
  const found = mode === "find" && open.some((i) => values[i] === props.target);

  // sorted "find": the window of cards that could still hold the target
  let lo = 0;
  let hi = values.length - 1;
  if (sorted && mode === "find" && props.target !== undefined) {
    for (const i of open) {
      if (values[i] < props.target) lo = Math.max(lo, i + 1);
      else if (values[i] > props.target) hi = Math.min(hi, i - 1);
    }
  }
  const exhausted = mode === "find" && (sorted ? lo > hi : open.length === values.length);
  const done = mode === "max" ? answered !== null || open.length === values.length : found || exhausted;
  const correct = mode === "max" ? (answered ? answered.correct : open.length === values.length) : found;
  const locked = revealed || done;

  const report = (o: number[], a: null | { correct: boolean }) => {
    const sv = o.map((i) => values[i]);
    const isFound = mode === "find" && o.some((i) => values[i] === props.target);
    let l = 0;
    let h = values.length - 1;
    if (sorted && mode === "find" && props.target !== undefined) {
      for (const i of o) {
        if (values[i] < props.target) l = Math.max(l, i + 1);
        else if (values[i] > props.target) h = Math.min(h, i - 1);
      }
    }
    const isDone = mode === "max" ? a !== null || o.length === values.length : isFound || (sorted ? l > h : o.length === values.length);
    const isCorrect = mode === "max" ? (a ? a.correct : o.length === values.length && Math.max(...sv) === max) : isFound;
    onChange?.({ looks: o.length, done: isDone, correct: isCorrect, found: isFound } satisfies CardsState);
  };

  const flip = (i: number) => {
    if (locked || open.includes(i)) return;
    const next = [...open, i];
    setOpen(next);
    report(next, answered);
  };
  const answerNow = () => {
    if (locked || best === null) return;
    const a = { correct: best === max };
    setAnswered(a);
    report(open, a);
  };
  const middle = () => {
    if (locked) return;
    const m = Math.floor((lo + hi) / 2);
    flip(m);
  };
  const reset = () => {
    setOpen([]);
    setAnswered(null);
    onChange?.(undefined);
  };

  const many = values.length > 10;
  const showAll = status === "revealed" || (revealed && status !== "correct") || (mode === "max" && answered !== null && !answered.correct);
  const lastOpened = open[open.length - 1];
  const ruledOut = (i: number) => sorted && mode === "find" && !open.includes(i) && (i < lo || i > hi);

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {mode === "find" && <Readout label="Find" value={props.target} accent />}
          <Readout label="Looks" value={open.length} />
          {mode === "max" && <Readout label="Best so far" value={best ?? "–"} accent={best !== null} />}
        </div>
        <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" onClick={reset} disabled={open.length === 0 || revealed} aria-label="Start over" title="Start over">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div
        className={`mt-4 ${many ? "grid grid-cols-5 gap-1.5 sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))] sm:gap-1" : "flex flex-wrap justify-center gap-1.5 sm:gap-2"}`}
        style={many ? ({ "--cols": values.length } as React.CSSProperties) : undefined}
      >
        {values.map((v, i) => {
          const isOpen = open.includes(i);
          const face = isOpen || showAll;
          const out = ruledOut(i);
          const hit = isOpen && mode === "find" && v === props.target;
          const isBest = mode === "max" && isOpen && v === best;
          const missedMax = showAll && !isOpen && mode === "max" && v === max;
          return (
            <div key={i} className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => flip(i)}
                disabled={locked || isOpen}
                aria-label={face ? `Card ${i}: ${v}` : `Turn over card ${i}`}
                className={`grid h-14 place-items-center rounded-lg border font-mono text-sm font-semibold tabular-nums transition-all sm:h-16 ${many ? "w-full" : "w-10 min-[400px]:w-11 sm:w-12 sm:text-base"} ${
                  hit
                    ? "border-transparent bg-primary text-primary-ink"
                    : isBest
                      ? "border-[var(--brand)] bg-tint text-ink"
                      : missedMax
                        ? "border-[var(--bad)] bg-[var(--bad)]/[0.08] text-ink"
                        : face
                          ? `${isOpen ? "border-line" : "border-dashed border-[var(--line-strong)]"} bg-surface ${out || !isOpen ? "text-ink-3" : "text-ink"} ${out ? "opacity-50" : ""}`
                          : out
                            ? "border-dashed border-line bg-surface-2/40 text-ink-3/50"
                            : "border-[var(--line-strong)] bg-surface-2 text-ink-3 hover:border-[var(--brand)] hover:bg-tint"
                } ${i === lastOpened ? "pop-in" : ""} disabled:cursor-default`}
              >
                {face ? v : out ? "×" : "?"}
              </button>
              <span className="mt-1 font-mono text-[0.65rem] tabular-nums text-ink-3">{i}</span>
            </div>
          );
        })}
      </div>

      {(mode === "max" || props.helper) && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {mode === "max" && (
            <button type="button" className="btn btn-primary !h-10" onClick={answerNow} disabled={locked || best === null}>
              {best === null ? "That's the largest" : `${best} is the largest`}
            </button>
          )}
          {props.helper && mode === "find" && (
            <button type="button" className="btn !h-10" onClick={middle} disabled={locked}>
              <Crosshair className="h-4 w-4" /> Look in the middle
            </button>
          )}
        </div>
      )}

      <Note tone={done ? (correct ? "good" : "bad") : "plain"}>
        {mode === "max"
          ? answered
            ? answered.correct
              ? `Right, ${best} is the largest, after ${open.length} looks. (Lucky: you couldn't be sure without seeing the rest.)`
              : `Not quite: ${max} was hiding in a card you never turned over.`
            : open.length === values.length
              ? `Every card seen in ${open.length} looks, so ${max} is certainly the largest.`
              : open.length === 0
                ? "Tap a card to turn it over."
                : `${values.length - open.length} cards still face down. Any of them could be bigger.`
          : found
            ? `Found ${props.target} in ${open.length} ${open.length === 1 ? "look" : "looks"}.`
            : exhausted
              ? `${props.target} isn't here: every card that could hold it has been ruled out (${open.length} looks).`
              : open.length === 0
                ? sorted
                  ? "The cards are in order. Tap one to turn it over."
                  : "Tap a card to turn it over."
                : sorted && lastOpened !== undefined
                  ? values[lastOpened] < (props.target ?? 0)
                    ? `${values[lastOpened]} is too small, so every card to its left is too small too.`
                    : `${values[lastOpened]} is too big, so every card to its right is too big too.`
                  : `Not yet. ${values.length - open.length} cards left.`}
      </Note>
    </div>
  );
}

export function checkCards(state: unknown, goal: Record<string, unknown>) {
  const s = state as CardsState | undefined;
  if (!s) return false;
  if (typeof goal.maxLooks === "number" && s.looks > goal.maxLooks) return false;
  if (goal.correct === true && !s.correct) return false;
  if (goal.found === true && !s.found) return false;
  if (goal.found === false && !(s.done && !s.found)) return false;
  return s.done;
}

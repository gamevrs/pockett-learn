"use client";

import React, { useState } from "react";
import { ArrowDown, ArrowUp, Check, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Readout } from "./ui";

/**
 * Guess the number from 1 to `max`; every wrong guess answers "higher" or "lower". A bar shows
 * which numbers are still possible. Without a fixed `secret` the number is never lucky: each
 * answer keeps the larger part of what's left possible (always consistent with the replies so far),
 * so the guess count shows the worst case for the learner's strategy.
 */
export interface GuessProps {
  max?: number;
  secret?: number;
  /** Shown as the target, e.g. 7 ("in at most 7 guesses"). */
  maxGuesses?: number;
}

export interface GuessState {
  guesses: number;
  found: boolean;
}

interface Turn {
  g: number;
  reply: "higher" | "lower" | "found";
}

export function Guess({ props, onChange, revealed }: WidgetProps<GuessProps>) {
  const max = props.max ?? 100;
  const [lo, setLo] = useState(1);
  const [hi, setHi] = useState(max);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const found = turns.some((t) => t.reply === "found");
  const over = props.maxGuesses !== undefined && turns.length >= props.maxGuesses && !found;

  const guess = () => {
    const g = Math.round(Number(text));
    if (revealed || found || !Number.isFinite(g) || g < 1 || g > max) return;
    let reply: Turn["reply"];
    let nlo = lo;
    let nhi = hi;
    if (props.secret !== undefined) {
      reply = g === props.secret ? "found" : g < props.secret ? "higher" : "lower";
    } else if (g < lo) reply = "higher";
    else if (g > hi) reply = "lower";
    else if (lo === hi) reply = "found";
    else reply = hi - g >= g - lo ? "higher" : "lower";
    if (reply === "higher") nlo = Math.max(lo, g + 1);
    if (reply === "lower") nhi = Math.min(hi, g - 1);
    if (reply === "found") {
      nlo = g;
      nhi = g;
    }
    const t = [...turns, { g, reply }];
    setTurns(t);
    setLo(nlo);
    setHi(nhi);
    setText("");
    onChange?.({ guesses: t.length, found: reply === "found" } satisfies GuessState);
  };
  const reset = () => {
    setLo(1);
    setHi(max);
    setTurns([]);
    setText("");
    onChange?.(undefined);
  };

  const pct = (v: number) => ((v - 1) / max) * 100;
  const left = hi - lo + 1;
  const mid = Math.floor((lo + hi) / 2);

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <Readout label="Guesses" value={props.maxGuesses ? `${turns.length} / ${props.maxGuesses}` : turns.length} accent />
        <Readout label="Still possible" value={found ? 1 : left} />
        <button type="button" className="btn btn-ghost ml-auto !h-10 !w-10 !p-0" onClick={reset} disabled={revealed || turns.length === 0} aria-label="Start over" title="Start over">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4">
        <div className="relative h-10 overflow-hidden rounded-lg border border-line bg-surface-2">
          <div className="absolute inset-y-0 rounded-md bg-primary/30 ring-2 ring-inset ring-[var(--brand)] transition-all duration-300" style={{ left: `${pct(lo)}%`, width: `${((hi - lo + 1) / max) * 100}%` }} />
          {turns.map((t, i) => (
            <span key={i} className={`absolute inset-y-1 w-0.5 rounded ${t.reply === "found" ? "bg-[var(--brand)]" : "bg-ink-3"}`} style={{ left: `calc(${pct(t.g) + 50 / max}% - 1px)` }} aria-hidden />
          ))}
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2 font-mono text-[0.65rem] text-ink-3">
          <span>1</span>
          <span className="text-sm font-semibold tabular-nums text-ink">{found ? `It was ${lo}!` : lo === hi ? `It must be ${lo}` : `${lo} … ${hi}`}</span>
          <span>{max}</span>
        </div>
      </div>

      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          guess();
        }}
      >
        <input
          className="input !h-11 min-w-0 flex-1 font-mono text-base placeholder:font-sans placeholder:text-sm"
          inputMode="numeric"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, "").slice(0, String(max).length))}
          placeholder={found ? "Got it" : `a number from 1 to ${max}`}
          disabled={revealed || found}
          aria-label="Your guess"
        />
        <button type="submit" className="btn btn-primary !h-11 !px-5" disabled={revealed || found || !text}>
          Guess
        </button>
      </form>
      {revealed && !found && <p className="mt-2 text-xs text-ink-3">Binary search would guess {mid} next: the middle of what&apos;s left.</p>}

      <div className="mt-3 flex min-h-10 flex-wrap gap-1.5" aria-live="polite">
        {turns.length === 0 && <p className="text-sm text-ink-3">I&apos;m thinking of a number from 1 to {max}. Each guess tells you higher or lower.</p>}
        {turns.map((t, i) => (
          <span
            key={i}
            className={`pop-in inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-sm tabular-nums ${t.reply === "found" ? "border-transparent bg-primary font-semibold text-primary-ink" : "border-line bg-surface text-ink"}`}
          >
            {t.g}
            {t.reply === "higher" ? <ArrowUp className="h-3.5 w-3.5 text-ink-3" aria-label="higher" /> : t.reply === "lower" ? <ArrowDown className="h-3.5 w-3.5 text-ink-3" aria-label="lower" /> : <Check className="h-3.5 w-3.5" aria-label="found" />}
          </span>
        ))}
      </div>
      {over && <p className="mt-2 text-sm text-ink-2">That&apos;s {turns.length} guesses already. Start over and try guessing the middle of what&apos;s left each time.</p>}
    </div>
  );
}

export function checkGuess(state: unknown, goal: Record<string, unknown>) {
  const s = state as GuessState | undefined;
  if (!s) return false;
  if (goal.found === true && !s.found) return false;
  if (typeof goal.maxGuesses === "number" && s.guesses > goal.maxGuesses) return false;
  return true;
}

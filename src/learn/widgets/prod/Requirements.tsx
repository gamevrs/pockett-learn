"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { isMeasurable } from "./logic";
import { Caption, Note, Readout, Toy } from "./ui";

export interface RequirementsProps {
  /** Show the free-text tester under the wishes. Default true. */
  tester?: boolean;
}

export interface RequirementsState {
  picked: number;
  good: number;
  total: number;
  allGood: boolean;
}

interface Wish {
  wish: string;
  options: string[];
}

const WISHES: Wish[] = [
  {
    wish: "\"It should last a long time on a battery.\"",
    options: ["Battery life should be good.", "Runs at least 12 months on one coin cell, reporting every 15 minutes.", "Uses very little power."],
  },
  {
    wish: "\"It should be small.\"",
    options: ["Compact design.", "Smaller than a phone.", "Fits in a 60 × 40 mm case."],
  },
  {
    wish: "\"It should be cheap.\"",
    options: ["Parts cost under $9 at 1,000 units.", "Low cost.", "Cheaper than the competition."],
  },
  {
    wish: "\"Setup should be easy.\"",
    options: ["User friendly setup.", "Setup is simple.", "Pairs with the phone app in under 60 seconds, with no more than 3 taps."],
  },
  {
    wish: "\"It should work in the garden.\"",
    options: ["Robust and weatherproof.", "Handles outdoor conditions.", "Keeps working from 0 to 40 °C."],
  },
];

/** Turn vague wishes into measurable requirements: pick a rewrite for each wish and a simple keyword rule flags the ones nobody could test. */
export function Requirements({ props, onChange }: WidgetProps<RequirementsProps>) {
  const [picks, setPicks] = useState<(number | null)[]>(WISHES.map(() => null));
  const [own, setOwn] = useState("Lasts about a year");
  const showTester = props.tester ?? true;

  const stateOf = (p: (number | null)[]): RequirementsState => {
    const picked = p.filter((x) => x !== null).length;
    const good = p.filter((x, i) => x !== null && isMeasurable(WISHES[i].options[x as number]).ok).length;
    return { picked, good, total: WISHES.length, allGood: good === WISHES.length };
  };
  const st = stateOf(picks);

  const pick = (i: number, k: number) => {
    const next = picks.slice();
    next[i] = k;
    setPicks(next);
    onChange?.(stateOf(next));
  };

  const verdict = isMeasurable(own);

  return (
    <div className="w-full" data-widget>
      <div className="space-y-4">
        {WISHES.map((w, i) => (
          <div key={w.wish}>
            <p className="text-[0.9rem] font-medium text-ink">{w.wish}</p>
            <div role="radiogroup" aria-label={`Rewrite for ${w.wish}`} className="mt-1.5 grid gap-1.5">
              {w.options.map((o, k) => {
                const on = picks[i] === k;
                const v = isMeasurable(o);
                return (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => pick(i, k)}
                    className={`min-h-10 rounded-xl border px-3 py-2 text-left text-[0.86rem] leading-snug transition-colors ${
                      on ? (v.ok ? "border-[var(--good)] bg-tint text-ink" : "border-[var(--bad)] bg-tint text-ink") : "border-line bg-surface text-ink-2 hover:bg-surface-2"
                    }`}
                  >
                    {o}
                    {on && (
                      <span className={`mt-1 block text-xs ${v.ok ? "text-[var(--good)]" : "text-[var(--bad)]"}`}>
                        {v.ok ? "Measurable. " : "Not measurable. "}
                        <span className="text-ink-3">{v.reason}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Readout label="Chosen" value={`${st.picked} / ${st.total}`} />
        <Readout label="Measurable" value={`${st.good} / ${st.total}`} accent />
      </div>

      {showTester && (
        <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3">
          <Caption>Try your own requirement</Caption>
          <label className="mt-1.5 block">
            <span className="sr-only">Requirement text</span>
            <input
              type="text"
              value={own}
              onChange={(e) => setOwn(e.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-[0.9rem] text-ink"
              maxLength={120}
            />
          </label>
          <p className={`mt-2 text-[0.86rem] ${verdict.ok ? "text-[var(--good)]" : "text-[var(--bad)]"}`} aria-live="polite">
            <strong>{verdict.ok ? "Looks measurable." : "Not measurable yet."}</strong> <span className="text-ink-2">{verdict.reason}</span>
          </p>
        </div>
      )}

      <div className="mt-3">
        <Note>The real test of a requirement: could two people check it independently and agree on pass or fail?</Note>
      </div>
      <Toy>The checker is a crude keyword rule (a number plus a unit or count word), not a real review. It can be fooled, and good requirements still need a person to read them.</Toy>
    </div>
  );
}

/** goal: { allGood: true } or { minGood }. */
export function checkRequirements(state: unknown, goal: Record<string, unknown>) {
  const s = state as RequirementsState | undefined;
  if (!s) return false;
  if (goal.allGood === true && !s.allGood) return false;
  if (typeof goal.minGood === "number" && s.good < goal.minGood) return false;
  return true;
}

"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Caption, Note, Toy } from "./ui";

export interface RiskProps {
  /** Start order (ids). Default is a fixed, unsorted order. */
  order?: string[];
}

export interface RiskState {
  order: string[];
  /** ordered by likelihood × impact, highest first */
  correct: boolean;
}

interface RiskItem {
  id: string;
  text: string;
  likelihood: number;
  impact: number;
}

const RISKS: RiskItem[] = [
  { id: "case", text: "People may not like the colour of the case", likelihood: 5, impact: 1 },
  { id: "ble", text: "Pairing may fail on some older phones", likelihood: 3, impact: 3 },
  { id: "power", text: "The coin cell may not supply the radio bursts in the cold", likelihood: 4, impact: 5 },
  { id: "light", text: "The case window may dim the light sensor too much", likelihood: 3, impact: 2 },
  { id: "moist", text: "Moisture readings may drift with soil type and salt", likelihood: 4, impact: 4 },
  { id: "layout", text: "A small mistake in the first board layout", likelihood: 2, impact: 2 },
];

const score = (r: RiskItem) => r.likelihood * r.impact;
const sortedIds = RISKS.slice().sort((a, b) => score(b) - score(a)).map((r) => r.id);
const START = ["case", "ble", "light", "layout", "moist", "power"];

/** Rank Sprout's risks by likelihood × impact, riskiest first: that is what to prove first. */
export function Risk({ props, onChange, status }: WidgetProps<RiskProps>) {
  const [order, setOrder] = useState<string[]>(props.order ?? START);
  const show = status === "correct" || status === "revealed";

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const next = order.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    onChange?.({ order: next, correct: next.join() === sortedIds.join() } satisfies RiskState);
  };

  const byId = (id: string) => RISKS.find((r) => r.id === id)!;

  return (
    <div className="w-full" data-widget>
      <Caption>Riskiest first, at the top</Caption>
      <ol className="mt-2 space-y-1.5">
        {order.map((id, i) => {
          const r = byId(id);
          return (
            <li key={id} className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-xs font-semibold text-ink-2" aria-hidden>
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 text-[0.86rem] leading-snug text-ink">
                {r.text}
                <span className="mt-0.5 block text-xs text-ink-3">
                  Likelihood {r.likelihood}/5 · Cost if found late {r.impact}/5{show ? ` · score ${score(r)}` : ""}
                </span>
              </span>
              <span className="flex shrink-0 flex-col gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move up: ${r.text}`} className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-ink hover:bg-surface-2 disabled:opacity-35">
                  <ArrowUp className="h-4 w-4" aria-hidden />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label={`Move down: ${r.text}`} className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-ink hover:bg-surface-2 disabled:opacity-35">
                  <ArrowDown className="h-4 w-4" aria-hidden />
                </button>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-3">
        <Note>Rank by likelihood × cost if found late. A risk that is both likely and expensive to discover late goes first.</Note>
      </div>
      <Toy>The 1 to 5 ratings are the author&apos;s judgement for this made-up product. On a real project the team argues them out, and they change as you learn.</Toy>
    </div>
  );
}

/** goal: { correct: true }. */
export function checkRisk(state: unknown, goal: Record<string, unknown>) {
  const s = state as RiskState | undefined;
  if (!s) return false;
  if (goal.correct === true) return s.correct;
  if (typeof goal.first === "string") return s.order[0] === goal.first;
  return true;
}

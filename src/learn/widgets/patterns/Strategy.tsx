"use client";

import React, { useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, CodePane, money, Pill } from "./ui";

/**
 * Strategy: one Checkout (the context) whose code never changes, and swappable shipping
 * strategies. Tap a strategy chip: the plugged-in class and the price change, the context
 * code stays identical.
 */

const STRATEGIES = {
  standard: { label: "Standard", cost: (kg: number) => 5 + 1 * kg, code: "class Standard:\n    def cost(self, kg):\n        return 5 + 1 * kg" },
  express: { label: "Express", cost: (kg: number) => 12 + 2 * kg, code: "class Express:\n    def cost(self, kg):\n        return 12 + 2 * kg" },
  pickup: { label: "Pickup", cost: () => 0, code: "class Pickup:\n    def cost(self, kg):\n        return 0" },
  flat: { label: "Flat rate", cost: () => 7, code: "class FlatRate:\n    def cost(self, kg):\n        return 7" },
} as const;
type StrategyId = keyof typeof STRATEGIES;

const CONTEXT = `class Checkout:
    def __init__(self, strategy):
        self.strategy = strategy

    def shipping(self, kg):
        return self.strategy.cost(kg)`;

export interface StrategyProps {
  /** Which strategies to offer (default all four). */
  strategies?: StrategyId[];
  initial?: StrategyId;
  /** Parcel weight in kg (default 3). */
  weight?: number;
  /** Let the learner change the weight. */
  adjustable?: boolean;
}

export interface StrategyState {
  strategy: StrategyId;
  weight: number;
  cost: number;
}

export function Strategy({ props, onChange, revealed }: WidgetProps<StrategyProps>) {
  const ids = (props.strategies ?? (Object.keys(STRATEGIES) as StrategyId[])).filter((s) => s in STRATEGIES);
  const [strategy, setStrategy] = useState<StrategyId>(props.initial ?? ids[0]);
  const [weight, setWeight] = useState(props.weight ?? 3);
  const s = STRATEGIES[strategy];
  const cost = s.cost(weight);

  const report = (st: StrategyId, kg: number) => onChange?.({ strategy: st, weight: kg, cost: STRATEGIES[st].cost(kg) } satisfies StrategyState);
  const choose = (id: StrategyId) => {
    if (revealed) return;
    setStrategy(id);
    report(id, weight);
  };
  const changeWeight = (d: number) => {
    const kg = Math.min(20, Math.max(1, weight + d));
    setWeight(kg);
    report(strategy, kg);
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Caption>Parcel</Caption>
          {props.adjustable ? (
            <span className="inline-flex items-center rounded-full border border-line bg-surface">
              <button type="button" aria-label="Lighter" onClick={() => changeWeight(-1)} disabled={revealed || weight <= 1} className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-surface-2 disabled:opacity-40">
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[3.2rem] text-center font-mono text-sm font-semibold tabular-nums">{weight} kg</span>
              <button type="button" aria-label="Heavier" onClick={() => changeWeight(1)} disabled={revealed || weight >= 20} className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-surface-2 disabled:opacity-40">
                <Plus className="h-4 w-4" />
              </button>
            </span>
          ) : (
            <span className="rounded-full border border-line bg-surface px-3 py-1 font-mono text-sm font-semibold">{weight} kg</span>
          )}
        </div>
      </div>

      <Caption className="mt-4">Plug in a strategy</Caption>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Shipping strategy">
        {ids.map((id) => (
          <Pill key={id} on={strategy === id} onClick={() => choose(id)} disabled={revealed && strategy !== id}>
            {STRATEGIES[id].label}
          </Pill>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1.25fr_1fr]">
        <CodePane title="checkout.py · the context" badge={<span className="text-[#c5ee8a]">0 edits</span>} code={CONTEXT} highlight={[5]} />
        <div key={strategy} className="pop-in min-w-0">
          <CodePane title="the strategy it holds" code={s.code} highlight={[2]} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-4 py-3">
        <code className="font-mono text-[13px] text-ink-2">
          Checkout({s.code.split("\n")[0].slice(6, -1)}()).shipping({weight})
        </code>
        <span key={`${strategy}-${weight}`} className="pop-in font-mono text-lg font-semibold tabular-nums text-ink">
          {money(cost)}
        </span>
      </div>
    </div>
  );
}

export function checkStrategy(state: unknown, goal: Record<string, unknown>) {
  const st = state as StrategyState | undefined;
  if (!st) return false;
  if (typeof goal.cost === "number" && Math.abs(st.cost - goal.cost) > 0.001) return false;
  if (typeof goal.strategy === "string" && st.strategy !== goal.strategy) return false;
  return typeof goal.cost === "number" || typeof goal.strategy === "string";
}

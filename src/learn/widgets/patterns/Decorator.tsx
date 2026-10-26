"use client";

import React, { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, money } from "./ui";

/**
 * Decorator: wrap a plain parcel in label options. Each wrapper holds the parcel inside it and adds to
 * cost() and description(). Stack, reorder and remove layers; watch the price compose.
 */

const ADDONS = {
  wrap: { label: "Bubble wrap", cls: "BubbleWrap", desc: "bubble wrap", apply: (c: number) => c + 50, rule: "+ $0.50" },
  track: { label: "Tracking", cls: "Tracking", desc: "tracking", apply: (c: number) => c + 70, rule: "+ $0.70" },
  insure: { label: "Insurance", cls: "Insurance", desc: "insurance", apply: (c: number) => c + 90, rule: "+ $0.90" },
  sign: { label: "Signature", cls: "Signature", desc: "signature", apply: (c: number) => c + 60, rule: "+ $0.60" },
  half: { label: "Half price", cls: "HalfPrice", desc: "half price", apply: (c: number) => Math.round(c / 2), rule: "× ½" },
} as const;
type AddonId = keyof typeof ADDONS;
const BASE_CENTS = 200;
const MAX_LAYERS = 5;

export interface DecoratorProps {
  addons?: AddonId[];
  /** Starting layers, innermost first. */
  initial?: AddonId[];
}

export interface DecoratorState {
  /** Innermost first. */
  layers: AddonId[];
  cost: number;
  description: string;
}

interface Layer {
  key: number;
  id: AddonId;
}

function compute(layers: AddonId[]) {
  let cents = BASE_CENTS;
  const steps: { label: string; rule: string; cents: number }[] = [{ label: "Parcel", rule: "", cents }];
  let description = "Parcel";
  for (const id of layers) {
    const a = ADDONS[id];
    cents = a.apply(cents);
    description += id === "half" ? " (half price)" : `, ${a.desc}`;
    steps.push({ label: a.cls, rule: a.rule, cents });
  }
  return { cost: cents / 100, description, steps };
}

export function Decorator({ props, onChange, revealed }: WidgetProps<DecoratorProps>) {
  const palette = (props.addons ?? (Object.keys(ADDONS) as AddonId[])).filter((a) => a in ADDONS);
  const [layers, setLayers] = useState<Layer[]>(() => (props.initial ?? []).map((id, i) => ({ key: i + 1, id })));
  const [nextKey, setNextKey] = useState((props.initial?.length ?? 0) + 1);
  const [selected, setSelected] = useState<number | null>(null);
  const ids = layers.map((l) => l.id);
  const { cost, description, steps } = compute(ids);

  const commit = (next: Layer[]) => {
    setLayers(next);
    const r = compute(next.map((l) => l.id));
    onChange?.({ layers: next.map((l) => l.id), cost: r.cost, description: r.description } satisfies DecoratorState);
  };
  const add = (id: AddonId) => {
    if (revealed || layers.length >= MAX_LAYERS) return;
    commit([...layers, { key: nextKey, id }]);
    setSelected(nextKey);
    setNextKey(nextKey + 1);
  };
  const selIndex = layers.findIndex((l) => l.key === selected);
  const move = (d: 1 | -1) => {
    const to = selIndex + d;
    if (selIndex < 0 || to < 0 || to >= layers.length) return;
    const next = layers.slice();
    [next[selIndex], next[to]] = [next[to], next[selIndex]];
    commit(next);
  };
  const remove = () => {
    if (selIndex < 0) return;
    commit(layers.filter((l) => l.key !== selected));
    setSelected(null);
  };

  const expr = ids.reduce((inner, id) => `${ADDONS[id].cls}(${inner})`, "Parcel()");

  // outermost first, each box nested inside the previous one
  const renderFrom = (i: number): React.ReactNode => {
    if (i < 0) {
      return (
        <div className="rounded-lg border border-[var(--line-strong)] bg-surface px-3 py-2.5 text-center">
          <p className="text-sm font-semibold text-ink">Parcel</p>
          <p className="font-mono text-[11px] text-ink-2">cost() = $2.00</p>
        </div>
      );
    }
    const l = layers[i];
    const a = ADDONS[l.id];
    const on = l.key === selected;
    return (
      <div key={l.key} className={`pop-in rounded-xl border p-1.5 transition-colors ${on ? "border-ink bg-tint ring-1 ring-ink" : "border-[var(--brand)]/50 bg-tint/50"}`}>
        <button
          type="button"
          onClick={() => !revealed && setSelected(on ? null : l.key)}
          disabled={revealed}
          aria-pressed={on}
          className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-2 text-left disabled:cursor-default"
        >
          <span className="min-w-0 truncate text-sm font-semibold text-ink">{a.cls}</span>
          <span className="shrink-0 font-mono text-[11px] text-ink-2">inner {a.rule}</span>
        </button>
        {renderFrom(i - 1)}
      </div>
    );
  };

  return (
    <div className="w-full">
      <Caption>Wrap it in</Caption>
      <div className="mt-2 flex flex-wrap gap-2">
        {palette.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => add(id)}
            disabled={revealed || layers.length >= MAX_LAYERS}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm text-ink hover:border-[var(--line-strong)] hover:bg-surface-2 disabled:opacity-45"
          >
            <Plus className="h-3.5 w-3.5 text-ink-3" />
            {ADDONS[id].label}
            <span className="font-mono text-[11px] text-ink-3">{ADDONS[id].rule.replace("+ ", "+")}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1.1fr_1fr]">
        <div className="min-w-0">
          <Caption>The label, outside in</Caption>
          <div className="mt-2">{renderFrom(layers.length - 1)}</div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {selIndex >= 0 && !revealed ? (
              <>
                <button type="button" onClick={() => move(1)} disabled={selIndex === layers.length - 1} className="btn !h-10 !px-3" aria-label="Move this layer outwards">
                  <ArrowUp className="h-4 w-4" /> Out
                </button>
                <button type="button" onClick={() => move(-1)} disabled={selIndex === 0} className="btn !h-10 !px-3" aria-label="Move this layer inwards">
                  <ArrowDown className="h-4 w-4" /> In
                </button>
                <button type="button" onClick={remove} className="btn !h-10 !px-3" aria-label="Remove this layer">
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              </>
            ) : (
              <p className="text-xs text-ink-3">{layers.length ? "Tap a layer to move or remove it." : "Add a layer above."}</p>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <Caption>cost(), calculated inside out</Caption>
          <ol className="mt-2 grid gap-1 font-mono text-[12px]">
            {steps.map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-md bg-surface-2 px-2.5 py-1.5">
                <span className="min-w-0 truncate text-ink-2">
                  <span className="text-ink">{s.label}</span> {s.rule}
                </span>
                <span className="tabular-nums text-ink">{money(s.cents / 100)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3">
        <p className="overflow-x-auto whitespace-nowrap font-mono text-[12px] text-ink-2">{expr}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
          <p className="min-w-0 text-sm text-ink">{description}</p>
          <p key={cost} className="pop-in font-mono text-xl font-semibold tabular-nums text-ink">
            {money(cost)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function checkDecorator(state: unknown, goal: Record<string, unknown>) {
  const st = state as DecoratorState | undefined;
  if (!st) return false;
  let any = false;
  if (typeof goal.cost === "number") {
    any = true;
    if (Math.abs(st.cost - goal.cost) > 0.005) return false;
  }
  if (Array.isArray(goal.layers)) {
    any = true;
    if (goal.layers.length !== st.layers.length || goal.layers.some((l, i) => l !== st.layers[i])) return false;
  }
  if (typeof goal.minLayers === "number") {
    any = true;
    if (st.layers.length < goal.minLayers) return false;
  }
  if (Array.isArray(goal.uses)) {
    any = true;
    if (!goal.uses.every((u) => st.layers.includes(u as AddonId))) return false;
  }
  return any;
}

"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { formatVal, type Val } from "./values";

export interface ListIndexProps {
  /** Variable name shown in the readout, e.g. "fruits". */
  name?: string;
  /** List mode: the items. */
  items?: Val[];
  /** Dictionary mode: key → value pairs (used instead of items). */
  entries?: [Val, Val][];
  /** Show 0, 1, 2… under the items. Default true. */
  showIndexes?: boolean;
  /** Show -1, -2… too. Default false. */
  showNegative?: boolean;
  /** Pick mode: the tap is the answer, so the readout stays hidden until the question is answered. */
  pick?: boolean;
}

export interface ListIndexState {
  /** List mode: index tapped (0-based). */
  index: number | null;
  /** Dictionary mode: key tapped. */
  key: Val | null;
  /** Number of items, so negative goals (e.g. index -1) can be checked. */
  length: number;
}

/** A list as a row of numbered slots (or a dictionary as key → value rows): tap to look one up. */
export function ListIndex({ props, onChange, revealed }: WidgetProps<ListIndexProps>) {
  const name = props.name ?? (props.entries ? "d" : "items");
  const [sel, setSel] = useState<number | null>(null);
  const hideReadout = props.pick && !revealed;
  const tap = (i: number) => {
    if (props.pick && revealed) return;
    setSel(i);
    onChange?.(
      props.entries
        ? ({ index: null, key: props.entries[i][0], length: props.entries.length } satisfies ListIndexState)
        : ({ index: i, key: null, length: props.items?.length ?? 0 } satisfies ListIndexState),
    );
  };

  if (props.entries) {
    const entries = props.entries;
    return (
      <div className="w-full min-w-0">
        <p className="mb-3 font-mono text-sm text-ink-2">
          {name} = {"{"} … {"}"} <span className="font-sans text-xs text-ink-3">· {entries.length} keys</span>
        </p>
        <div className="grid gap-2">
          {entries.map(([k, v], i) => {
            const on = sel === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => tap(i)}
                aria-pressed={on}
                className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-left font-mono transition-colors ${on ? "border-[var(--brand)] bg-tint" : "border-line bg-surface hover:border-[var(--line-strong)]"}`}
              >
                <span className={`rounded-md px-2 py-1 text-sm font-semibold ${on ? "bg-primary text-primary-ink" : "bg-surface-2 text-ink"}`}>{formatVal(k)}</span>
                <span className="text-ink-3" aria-hidden>
                  →
                </span>
                <span className="text-sm text-ink">{hideReadout ? "?" : formatVal(v)}</span>
              </button>
            );
          })}
        </div>
        <Readout>
          {sel === null ? (
            <span className="text-ink-3">Tap a key to look it up.</span>
          ) : hideReadout ? (
            <span className="text-ink-3">Picked {formatVal(entries[sel][0])}.</span>
          ) : (
            <>
              <span className="text-ink-2">
                {name}[{formatVal(entries[sel][0])}]
              </span>
              <span className="text-ink-3">→</span>
              <span className="font-semibold text-ink">{formatVal(entries[sel][1])}</span>
            </>
          )}
        </Readout>
      </div>
    );
  }

  const items = props.items ?? [];
  const n = items.length;
  const showIdx = props.showIndexes ?? true;
  return (
    <div className="w-full min-w-0">
      <p className="mb-3 font-mono text-sm text-ink-2">
        {name} <span className="font-sans text-xs text-ink-3">· len({name}) = {n}</span>
      </p>
      <div className="overflow-x-auto pb-1">
        <div className="mx-auto grid w-full max-w-lg" style={{ gridTemplateColumns: `repeat(${n}, minmax(${n > 5 ? "3rem" : "0"}, 1fr))` }}>
          {items.map((v, i) => {
            const on = sel === i;
            return (
              <div key={i} className={`flex flex-col items-stretch ${i > 0 ? "-ml-px" : ""}`}>
                <button
                  type="button"
                  onClick={() => tap(i)}
                  aria-pressed={on}
                  aria-label={showIdx ? `Item at index ${i}` : `Item ${formatVal(v)}`}
                  className={`flex h-14 min-w-0 items-center justify-center border px-0.5 font-mono text-[0.68rem] font-medium min-[400px]:px-1 min-[400px]:text-[0.8rem] transition-colors sm:text-sm ${i === 0 ? "rounded-l-xl" : ""} ${i === n - 1 ? "rounded-r-xl" : ""} ${
                    on ? "relative z-10 border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink hover:bg-surface-2"
                  }`}
                >
                  <span className="truncate">{formatVal(v)}</span>
                </button>
                {showIdx && <span className={`mt-1.5 text-center font-mono text-xs tabular-nums ${on ? "font-semibold text-ink" : "text-ink-3"}`}>{i}</span>}
                {props.showNegative && <span className={`text-center font-mono text-xs tabular-nums ${on ? "font-semibold text-brand" : "text-ink-3/80"}`}>{i - n}</span>}
              </div>
            );
          })}
        </div>
      </div>
      {(showIdx || props.showNegative) && (
        <p className="mt-1 text-center text-[0.65rem] text-ink-3">
          {showIdx && "index"}
          {showIdx && props.showNegative && " · "}
          {props.showNegative && "negative index"}
        </p>
      )}
      <Readout>
        {sel === null ? (
          <span className="text-ink-3">Tap an item.</span>
        ) : hideReadout ? (
          <span className="text-ink-3">Picked {formatVal(items[sel])}.</span>
        ) : (
          <>
            <span className="text-ink-2">
              {name}[{sel}]
            </span>
            {props.showNegative && (
              <span className="text-ink-3">
                or {name}[{sel - n}]
              </span>
            )}
            <span className="text-ink-3">→</span>
            <span className="font-semibold text-ink">{formatVal(items[sel])}</span>
          </>
        )}
      </Readout>
    </div>
  );
}

function Readout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex min-h-12 flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-xl bg-surface-2 px-3 py-2 font-mono text-sm" aria-live="polite">
      {children}
    </div>
  );
}

export function checkListIndex(state: unknown, goal: Record<string, unknown>) {
  const s = state as ListIndexState | undefined;
  if (!s) return false;
  if (typeof goal.index === "number") {
    if (s.index === null) return false;
    return s.index === (goal.index < 0 ? s.length + goal.index : goal.index);
  }
  if ("key" in goal) return JSON.stringify(s.key) === JSON.stringify(goal.key);
  return false;
}

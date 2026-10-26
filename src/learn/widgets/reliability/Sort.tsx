"use client";

import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, useInitialReport } from "./ui";

/**
 * Sort things into buckets. Each row is something to classify (an error code, a message, a
 * request); the learner taps the bucket it belongs in. A right answer locks the row and says why;
 * a wrong one counts as a mistake.
 */

export interface SortProps {
  buckets: { id: string; label: string }[];
  items: { id: string; text: string; bucket: string; why: string; mono?: boolean }[];
  prompt?: string;
}

export interface SortState {
  placed: number;
  total: number;
  mistakes: number;
  done: boolean;
}

export function Sort({ props, onChange, revealed, status }: WidgetProps<SortProps>) {
  const { buckets, items } = props;
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [mistakes, setMistakes] = useState(0);
  const [wrong, setWrong] = useState<{ id: string; bucket: string } | null>(null);
  const count = Object.keys(placed).length;
  const done = count >= items.length;
  useInitialReport(() => onChange?.({ placed: 0, total: items.length, mistakes: 0, done: false } satisfies SortState));

  const choose = (id: string, bucket: string, answer: string) => {
    if (revealed || placed[id]) return;
    if (bucket !== answer) {
      setWrong({ id, bucket });
      setMistakes(mistakes + 1);
      onChange?.({ placed: count, total: items.length, mistakes: mistakes + 1, done: false } satisfies SortState);
      return;
    }
    setWrong(null);
    setPlaced({ ...placed, [id]: bucket });
    onChange?.({ placed: count + 1, total: items.length, mistakes, done: count + 1 >= items.length } satisfies SortState);
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Caption>{props.prompt ?? "Tap the bucket each one belongs in"}</Caption>
        <div className="flex gap-2">
          <Readout label="Sorted" value={`${count}/${items.length}`} accent={done} />
          <Readout label="Misses" value={mistakes} />
        </div>
      </div>
      <ul className="mt-2 space-y-2">
        {items.map((it) => {
          const got = placed[it.id];
          const showAnswer = status === "revealed" && !got;
          return (
            <li key={it.id} className={`rounded-xl border p-2.5 ${got ? "border-[var(--brand)]/45 bg-tint" : "border-line bg-surface"}`}>
              <div className="flex items-start gap-2">
                {got && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" />}
                <p className={`min-w-0 flex-1 text-sm text-ink ${it.mono ? "font-mono text-[13px]" : ""}`}>{it.text}</p>
              </div>
              {got ? (
                <p className="mt-1.5 text-xs text-ink-2">
                  <span className="font-semibold text-ink">{buckets.find((b) => b.id === got)?.label}.</span> {it.why}
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {buckets.map((b) => {
                    const bad = wrong?.id === it.id && wrong.bucket === b.id;
                    const hint = showAnswer && it.bucket === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        disabled={revealed}
                        onClick={() => choose(it.id, b.id, it.bucket)}
                        className={`min-h-10 rounded-full border px-3 text-sm font-medium transition-colors disabled:cursor-default ${
                          bad ? "border-[var(--bad)] bg-[var(--bad)]/10 text-ink" : hint ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface-2 text-ink hover:border-[var(--line-strong)]"
                        }`}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {wrong?.id === it.id && !got && <p className="mt-1.5 text-xs text-[var(--bad)]">Not that one. Think about what would happen next.</p>}
            </li>
          );
        })}
      </ul>
      {done && (
        <Note tone="good" className="mt-3">
          All sorted{mistakes === 0 ? " with no misses" : ` with ${mistakes} ${mistakes === 1 ? "miss" : "misses"}`}.
        </Note>
      )}
    </div>
  );
}

export function checkSort(state: unknown, goal: Record<string, unknown>) {
  const st = state as SortState | undefined;
  if (!st) return false;
  if (goal.done === true && !st.done) return false;
  if (typeof goal.maxMistakes === "number" && st.mistakes > goal.maxMistakes) return false;
  return true;
}

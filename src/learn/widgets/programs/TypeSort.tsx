"use client";

import React, { useState } from "react";
import { Check, X } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";

export interface TypeSortProps {
  /** Values as they'd be typed in code, with the right type for each. */
  items: { code: string; type: string }[];
  /** Type buttons to offer. Default int, float, str, bool. */
  types?: string[];
}

export interface TypeSortState {
  answers: (string | null)[];
  allCorrect: boolean;
}

const HINT: Record<string, string> = { int: "whole number", float: "decimal", str: "text", bool: "True / False" };

/** Label each value with its type. */
export function TypeSort({ props, onChange, revealed }: WidgetProps<TypeSortProps>) {
  const items = props.items ?? [];
  const types = props.types ?? ["int", "float", "str", "bool"];
  const [answers, setAnswers] = useState<(string | null)[]>(() => items.map(() => null));

  const choose = (i: number, t: string) => {
    if (revealed) return;
    const next = answers.slice();
    next[i] = t;
    setAnswers(next);
    onChange?.({ answers: next, allCorrect: next.every((a, k) => a === items[k].type) } satisfies TypeSortState);
  };

  return (
    <div className="w-full min-w-0">
      <div className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ink-3">
        {types.map((t) => (
          <span key={t}>
            <span className="font-mono font-semibold text-ink-2">{t}</span> {HINT[t] ? `= ${HINT[t]}` : ""}
          </span>
        ))}
      </div>
      <ul className="grid gap-2">
        {items.map((item, i) => {
          const a = answers[i];
          const right = a === item.type;
          return (
            <li
              key={i}
              className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 ${
                revealed ? (right ? "border-[var(--brand)]/50 bg-tint" : "border-bad/40 bg-bad/[0.05]") : "border-line bg-surface"
              }`}
            >
              <code className="min-w-[5rem] flex-1 truncate font-mono text-[0.95rem] font-semibold text-ink">{item.code}</code>
              <span className="flex shrink-0 gap-1" role="radiogroup" aria-label={`Type of ${item.code}`}>
                {types.map((t) => {
                  const on = a === t;
                  const isAnswer = revealed && t === item.type;
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => choose(i, t)}
                      disabled={revealed}
                      className={`grid h-10 min-w-[2.9rem] place-items-center rounded-lg border px-1.5 font-mono text-xs font-semibold transition-colors ${
                        on
                          ? revealed && !right
                            ? "border-bad/60 bg-bad/10 text-bad"
                            : "border-transparent bg-primary text-primary-ink"
                          : isAnswer
                            ? "border-[var(--brand)] text-brand"
                            : "border-line bg-surface-2 text-ink-2 hover:border-[var(--line-strong)]"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </span>
              {revealed && (right ? <Check className="h-4 w-4 shrink-0 text-brand" aria-label="Right" /> : <X className="h-4 w-4 shrink-0 text-bad" aria-label="Wrong" />)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function checkTypeSort(state: unknown, goal: Record<string, unknown>) {
  const s = state as TypeSortState | undefined;
  return Boolean(goal.allCorrect) && Boolean(s?.allCorrect);
}

"use client";

import React, { useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Prose } from "@/components/ui/Prose";
import { Caption, Code } from "./shared";

export interface SpotItem {
  /** Python snippet to classify. */
  code?: string;
  /** Or a sentence to classify. */
  text?: string;
  /** The correct option (exact text from `options`). */
  answer: string;
  /** Why it's that one, shown once picked. */
  why: string;
  /** Feedback for specific wrong picks (option → message). */
  hints?: Record<string, string>;
}

export interface SpotProps {
  items: SpotItem[];
  /** Default: the four pillars. */
  options?: string[];
  /** Feedback for a wrong pick of an option, used when the item has no specific hint. */
  optionHints?: Record<string, string>;
  /** Caption above each snippet. Default "Which pillar is this?". */
  prompt?: string;
}

export interface SpotState {
  solved: number;
  total: number;
  /** Wrong picks so far. */
  misses: number;
}

const PROSE = "!text-[0.85rem] [&_p]:!m-0";
const PILLARS = ["Encapsulation", "Abstraction", "Inheritance", "Polymorphism"];
const PILLAR_HINTS: Record<string, string> = {
  Encapsulation: "Encapsulation is an object guarding its own data so outsiders must go through its methods. Is something being protected here?",
  Abstraction: "Abstraction is a simple interface that hides how the work gets done. Is hiding complexity the main idea here?",
  Inheritance: "Inheritance needs a class built on a parent, like class B(A). Is one class extending another the main idea?",
  Polymorphism: "Polymorphism is one call that does different things depending on which object receives it. Is the same call going to different kinds of objects?",
};

/** Classify snippets one by one; wrong picks explain the misconception, right picks say why. */
export function SpotThePillar({ props, onChange, revealed }: WidgetProps<SpotProps>) {
  const options = props.options ?? PILLARS;
  const hints = props.optionHints ?? (props.options ? {} : PILLAR_HINTS);
  const items = props.items;
  const [at, setAt] = useState(0);
  const [picks, setPicks] = useState<string[][]>(() => items.map(() => []));
  const solvedAt = (i: number) => picks[i].includes(items[i].answer);
  const solved = items.filter((_, i) => solvedAt(i)).length;
  const item = items[at];
  const mine = picks[at];
  const done = solvedAt(at);
  const lastWrong = !done && mine.length > 0 ? mine[mine.length - 1] : null;

  const pick = (opt: string) => {
    if (done || mine.includes(opt) || revealed) return;
    const next = picks.map((p, i) => (i === at ? [...p, opt] : p));
    setPicks(next);
    const nSolved = items.filter((it, i) => next[i].includes(it.answer)).length;
    const misses = next.reduce((n, p, i) => n + p.filter((o) => o !== items[i].answer).length, 0);
    onChange?.({ solved: nSolved, total: items.length, misses } satisfies SpotState);
  };
  const later = items.findIndex((_, i) => i > at && !solvedAt(i));
  const nextUnsolved = later >= 0 ? later : items.findIndex((_, i) => !solvedAt(i));

  return (
    <div className="w-full text-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex gap-1.5" role="tablist" aria-label="Items">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === at}
              aria-label={`Item ${i + 1}${solvedAt(i) ? ", solved" : ""}`}
              onClick={() => setAt(i)}
              className="grid h-10 w-8 place-items-center"
            >
              <span className={`block h-2 w-full rounded-full transition-colors ${solvedAt(i) ? "bg-primary" : i === at ? "bg-ink-3" : "bg-surface-2 ring-1 ring-[var(--line)]"}`} />
            </button>
          ))}
        </div>
        <span className="text-xs tabular-nums text-ink-3">
          {solved} of {items.length} right
        </span>
      </div>

      <Caption>
        {at + 1} / {items.length} · {props.prompt ?? "Which pillar is this?"}
      </Caption>
      <div key={at} className="pop-in">
        {item.code && <Code code={item.code} />}
        {item.text && <p className="rounded-xl border border-line bg-surface-2 p-3.5 text-[0.95rem] leading-relaxed">{item.text}</p>}

        <div className="mt-3 grid grid-cols-2 gap-2">
          {options.map((opt) => {
            const right = done && opt === item.answer;
            const wrong = mine.includes(opt) && opt !== item.answer;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => pick(opt)}
                disabled={done || wrong || revealed}
                className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-center text-[0.85rem] font-medium transition-colors ${
                  right ? "border-transparent bg-primary text-primary-ink" : wrong ? "border-bad/50 bg-bad/[0.06] text-ink-3 line-through" : "border-line bg-surface hover:border-[var(--line-strong)]"
                } ${done && !right ? "opacity-50" : ""}`}
              >
                {right && <Check className="h-4 w-4 shrink-0" strokeWidth={3} />}
                {wrong && <X className="h-4 w-4 shrink-0 text-bad" strokeWidth={3} />}
                {opt}
              </button>
            );
          })}
        </div>

        {lastWrong && (
          <div key={lastWrong} className="pop-in mt-3 rounded-xl border border-bad/30 bg-bad/[0.05] p-3">
            <Prose source={`**Not ${lastWrong}.** ${item.hints?.[lastWrong] ?? hints[lastWrong] ?? "Look again at what the code is mainly about."}`} className={PROSE} />
          </div>
        )}
        {done && (
          <div className="pop-in mt-3 rounded-xl border border-[var(--brand)]/40 bg-tint p-3 text-[0.85rem]">
            <Prose source={`**${item.answer}.** ${item.why}`} className={PROSE} />
            {nextUnsolved < 0 && !revealed && <p className="mt-2 font-medium">All {items.length} right. Now press Check.</p>}
            {nextUnsolved >= 0 && (
              <button type="button" onClick={() => setAt(nextUnsolved)} className="btn mt-2.5 !h-10">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function checkSpot(state: unknown, goal: Record<string, unknown>) {
  const s = state as SpotState | undefined;
  if (!s) return false;
  const need = typeof goal.solved === "number" ? goal.solved : s.total;
  return s.solved >= need;
}

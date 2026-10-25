"use client";

import React from "react";
import { ArrowDown, ArrowUp, Check } from "lucide-react";
import type { Question } from "@/learn/types";
import { InlineProse } from "@/components/ui/Prose";

export type Answer = number[] | string | string[] | null;

/** Deterministic shuffle (no hydration mismatch, same order on every visit). */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  // never start already solved
  if (out.length > 1 && out.every((v, i) => v === items[i])) [out[0], out[1]] = [out[1], out[0]];
  return out;
}

export function initialAnswer(q: Question, seed: string): Answer {
  if (q.type === "order") return seededShuffle(q.items, seed);
  if (q.type === "choice") return [];
  if (q.type === "number" || q.type === "text") return "";
  return null;
}

export function hasAnswer(q: Question, a: Answer): boolean {
  if (q.type === "choice") return Array.isArray(a) && a.length > 0;
  if (q.type === "number" || q.type === "text") return typeof a === "string" && a.trim() !== "";
  return true;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function isCorrect(q: Question, a: Answer): boolean {
  switch (q.type) {
    case "choice": {
      const want = Array.isArray(q.answer) ? [...q.answer].sort() : [q.answer];
      const got = Array.isArray(a) ? [...(a as number[])].sort() : [];
      return want.length === got.length && want.every((v, i) => v === got[i]);
    }
    case "number": {
      const n = Number(String(a ?? "").replace(/[,_\s]/g, ""));
      return Number.isFinite(n) && Math.abs(n - q.answer) <= (q.tolerance ?? 0);
    }
    case "text":
      return typeof a === "string" && q.answer.some((x) => norm(x) === norm(a));
    case "order":
      return Array.isArray(a) && a.every((v, i) => v === q.items[i]);
    default:
      return false;
  }
}

/** The correct answer in words, for "Show answer". */
export function answerText(q: Question): string {
  switch (q.type) {
    case "choice":
      return (Array.isArray(q.answer) ? q.answer : [q.answer]).map((i) => q.options[i]).join(", ");
    case "number":
      return `${q.answer}${q.unit ? ` ${q.unit}` : ""}`;
    case "text":
      return q.answer[0];
    case "order":
      return q.items.join(" → ");
    default:
      return "";
  }
}

export function QuestionInput({
  question,
  answer,
  onAnswer,
  locked,
  status,
}: {
  question: Question;
  answer: Answer;
  onAnswer: (a: Answer) => void;
  locked: boolean;
  status: "idle" | "correct" | "wrong" | "revealed";
}) {
  if (question.type === "choice") {
    const multi = Array.isArray(question.answer);
    const picked = (answer as number[]) ?? [];
    const correct = Array.isArray(question.answer) ? question.answer : [question.answer];
    return (
      <div className="grid gap-2">
        {multi && <p className="text-xs text-ink-3">Select all that apply.</p>}
        {question.options.map((opt, i) => {
          const on = picked.includes(i);
          const showRight = (status === "correct" || status === "revealed") && correct.includes(i);
          const showWrong = status === "wrong" && on;
          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => onAnswer(multi ? (on ? picked.filter((x) => x !== i) : [...picked, i]) : [i])}
              className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-left text-[0.95rem] transition-colors ${
                showRight
                  ? "border-[var(--brand)] bg-tint"
                  : showWrong
                    ? "border-bad/60 bg-bad/[0.06]"
                    : on
                      ? "border-ink bg-surface"
                      : "border-line bg-surface hover:border-[var(--line-strong)]"
              }`}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center border ${multi ? "rounded-md" : "rounded-full"} ${
                  on || showRight ? "border-transparent bg-ink text-bg" : "border-[var(--line-strong)]"
                }`}
              >
                {(on || showRight) && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0 [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em]">
                <InlineProse text={opt} />
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "number" || question.type === "text") {
    return (
      <div className="flex items-center gap-3">
        <input
          className="input !h-12 max-w-xs !rounded-xl !text-lg font-mono"
          inputMode={question.type === "number" ? "decimal" : "text"}
          autoComplete="off"
          spellCheck={false}
          placeholder={question.type === "text" ? (question.placeholder ?? "Your answer") : "Your answer"}
          value={(answer as string) ?? ""}
          disabled={locked}
          onChange={(e) => onAnswer(e.target.value)}
          aria-label="Your answer"
        />
        {question.type === "number" && question.unit && <span className="text-ink-2">{question.unit}</span>}
      </div>
    );
  }

  if (question.type === "order") {
    const items = (answer as string[]) ?? question.items;
    const move = (from: number, to: number) => {
      if (to < 0 || to >= items.length) return;
      const next = items.slice();
      [next[from], next[to]] = [next[to], next[from]];
      onAnswer(next);
    };
    return (
      <ol className="grid gap-2">
        {items.map((item, i) => (
          <li key={item} className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-xs text-ink-2">{i + 1}</span>
            <span className="min-w-0 flex-1 text-[0.95rem] [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em]">
              <InlineProse text={item} />
            </span>
            {!locked && (
              <span className="flex shrink-0 gap-1">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move "${item}" up`} className="grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2 disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} aria-label={`Move "${item}" down`} className="grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2 disabled:opacity-30">
                  <ArrowDown className="h-4 w-4" />
                </button>
              </span>
            )}
          </li>
        ))}
      </ol>
    );
  }

  return question.prompt ? <p className="text-sm text-ink-2">{question.prompt}</p> : null;
}

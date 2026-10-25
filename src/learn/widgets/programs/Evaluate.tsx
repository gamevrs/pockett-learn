"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";

export interface EvalStage {
  /** The whole expression at this stage, e.g. "2 + 3 * 4". */
  expr: string;
  /** The part that gets worked out next (first occurrence is highlighted), e.g. "3 * 4". */
  focus?: string;
  /** Why this part goes first. */
  note?: string;
}

export interface EvaluateProps {
  /** From the original expression down to its value. The last stage is the result. */
  stages: EvalStage[];
  /** Type of the final value, shown as a tag, e.g. "int" or "bool". */
  resultType?: string;
  /** Predict mode: locked until the step's question is answered. */
  predict?: boolean;
  label?: string;
}

export interface EvaluateState {
  stage: number;
  atEnd: boolean;
}

function Highlighted({ expr, focus, active }: { expr: string; focus?: string; active: boolean }) {
  const at = focus ? expr.indexOf(focus) : -1;
  if (!active || at < 0 || !focus) return <>{expr}</>;
  return (
    <>
      {expr.slice(0, at)}
      <span className="rounded-md bg-tint px-1 text-ink shadow-[inset_0_-2px_0_var(--brand)]">{focus}</span>
      {expr.slice(at + focus.length)}
    </>
  );
}

/** Works an expression out one piece at a time, the way Python does. */
export function Evaluate({ props, onChange, revealed }: WidgetProps<EvaluateProps>) {
  const stages = props.stages ?? [];
  const last = Math.max(0, stages.length - 1);
  const [stage, setStage] = useState(0);
  const locked = props.predict && !revealed;
  const go = (s: number) => {
    if (locked) return;
    const n = Math.min(last, Math.max(0, s));
    setStage(n);
    onChange?.({ stage: n, atEnd: n === last } satisfies EvaluateState);
  };
  const cur = stages[stage];
  if (!cur) return null;

  return (
    <div className="w-full min-w-0">
      {props.label && <p className="mb-3 text-center text-xs font-medium text-ink-3">{props.label}</p>}
      <ol className="grid gap-1.5 font-mono">
        {stages.slice(0, stage + 1).map((s, i) => {
          const isCur = i === stage;
          const isResult = i === last && isCur;
          return (
            <li key={i} className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2 transition-colors ${isCur ? "border border-line bg-surface-2" : "text-ink-3"}`}>
              <span className="w-5 shrink-0 text-right text-sm text-ink-3" aria-hidden>
                {i === 0 ? "" : "="}
              </span>
              <span className={`min-w-0 break-words ${isCur ? "text-lg font-semibold text-ink sm:text-xl" : "text-base"}`}>
                <Highlighted expr={s.expr} focus={s.focus} active={isCur && !locked} />
              </span>
              {isResult && stages.length > 1 && (
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 font-sans text-xs font-semibold text-primary-ink">
                  result{props.resultType ? ` · ${props.resultType}` : ""}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className={`mt-3 text-sm leading-snug text-ink-2 ${locked ? "" : "min-h-[2.5rem]"}`} aria-live="polite">
        {locked ? (
          <span className="inline-flex items-center gap-1.5 text-ink-3">
            <Lock className="h-3.5 w-3.5" /> Work it out first, then step through to check.
          </span>
        ) : (
          (cur.note ?? (stage === last ? "Nothing left to work out: this is the value." : cur.focus ? `Next, Python works out ${cur.focus}.` : ""))
        )}
      </p>
      {!locked && (
        <div className="mt-1 flex items-center gap-2">
          <button type="button" className="btn !h-10 !w-10 !p-0" onClick={() => go(stage - 1)} disabled={stage === 0} aria-label="Previous step">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" className={`btn ${stage === last ? "" : "btn-primary"} !h-10 min-w-0 flex-1 sm:flex-none sm:!px-6`} onClick={() => go(stage + 1)} disabled={stage === last}>
            <span className="truncate">{stage === last ? "Done" : cur.focus ? `Work out ${cur.focus}` : "Next"}</span>
            {stage !== last && <ChevronRight className="h-4 w-4 shrink-0" />}
          </button>
          <span className="ml-auto font-mono text-xs tabular-nums text-ink-3">
            {stage}/{last}
          </span>
        </div>
      )}
    </div>
  );
}

export function checkEvaluate(state: unknown, goal: Record<string, unknown>) {
  const s = state as EvaluateState | undefined;
  if (!s) return false;
  if (typeof goal.stage === "number") return s.stage === goal.stage;
  return Boolean(goal.atEnd) && s.atEnd;
}

"use client";

import React, { useState } from "react";
import { Check, Minus, TriangleAlert, X } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Meter, Note, Segmented } from "./ui";

/**
 * A regression set for a clinic's booking assistant: eight questions with known answers, run
 * against four settings of a RAG system. Each question is scored on three separate things
 * (did retrieval find the right passage, is the answer supported by what was retrieved, is it up
 * to date), so you can see an average improve while one particular question quietly breaks.
 */

interface Q {
  id: string;
  text: string;
  /** the answer exists in the corpus */
  inCorpus: boolean;
  /** a code or exact term the keyword half must catch */
  needsKeyword?: boolean;
  /** the answer sits across two small chunks */
  split?: boolean;
  /** the answer is one short fact that a big chunk drowns */
  tiny?: boolean;
  /** the source changed since last month's index */
  updated?: boolean;
}

const QS: Q[] = [
  { id: "q1", text: "What time does the clinic open on Saturdays?", inCorpus: true, updated: true },
  { id: "q2", text: "Which appointment type is code VAC-2?", inCorpus: true, needsKeyword: true },
  { id: "q3", text: "Can a grandparent come to a child's appointment?", inCorpus: true },
  { id: "q4", text: "How do I cancel, and how late can I do it?", inCorpus: true, split: true },
  { id: "q5", text: "What does a dental X-ray cost?", inCorpus: false },
  { id: "q6", text: "Do you take card payments?", inCorpus: true, tiny: true },
  { id: "q7", text: "Is parking free for patients?", inCorpus: true, updated: true },
  { id: "q8", text: "How long is the late-arrival grace period?", inCorpus: true },
];

export interface Config {
  index: "old" | "fresh";
  search: "vector" | "hybrid";
  chunks: "small" | "large";
  prompt: "loose" | "cite";
}

type Outcome = "correct" | "wrong" | "declined";

interface Result {
  retrieved: boolean | null; // null = nothing to retrieve
  faithful: boolean;
  fresh: boolean | null; // null = not a changing fact
  outcome: Outcome;
  note: string;
}

export function evaluate(q: Q, c: Config): Result {
  const found = q.inCorpus && !(q.needsKeyword && c.search === "vector") && !(q.split && c.chunks === "small") && !(q.tiny && c.chunks === "large");
  const retrieved = q.inCorpus ? found : null;
  if (!found) {
    if (c.prompt === "loose") return { retrieved, faithful: false, fresh: q.updated ? false : null, outcome: "wrong", note: q.inCorpus ? "nothing relevant retrieved, so the model invented an answer" : "not in the handbook, so the model invented a price" };
    return { retrieved, faithful: true, fresh: q.updated ? false : null, outcome: q.inCorpus ? "declined" : "correct", note: q.inCorpus ? 'said "I don\'t know" (honest, but unhelpful)' : 'correctly said "I don\'t know"' };
  }
  const fresh = q.updated ? c.index === "fresh" : null;
  return { retrieved, faithful: true, fresh, outcome: fresh === false ? "wrong" : "correct", note: fresh === false ? "answered faithfully from an out-of-date page" : "answered from the right passage" };
}

const BASE: Config = { index: "old", search: "vector", chunks: "small", prompt: "loose" };
const baseResults = QS.map((q) => evaluate(q, BASE));

function metrics(c: Config) {
  const rs = QS.map((q) => evaluate(q, c));
  const withGold = rs.filter((r) => r.retrieved !== null);
  const changing = rs.filter((r) => r.fresh !== null);
  return {
    rs,
    recall: withGold.filter((r) => r.retrieved).length / withGold.length,
    faithful: rs.filter((r) => r.faithful).length / rs.length,
    fresh: changing.filter((r) => r.fresh).length / changing.length,
    correct: rs.filter((r) => r.outcome === "correct").length,
    regressions: rs.filter((r, i) => baseResults[i].outcome === "correct" && r.outcome !== "correct").length,
  };
}

export interface RagEvalProps {
  /** Starting configuration. */
  config?: Partial<Config>;
}

export interface RagEvalState extends Config {
  recall: number;
  faithful: number;
  fresh: number;
  correct: number;
  regressions: number;
}

export function RagEval({ props, onChange, revealed }: WidgetProps<RagEvalProps>) {
  const [cfg, setCfg] = useState<Config>({ ...BASE, ...props.config });
  const m = metrics(cfg);

  const upd = (patch: Partial<Config>) => {
    if (revealed) return;
    const next = { ...cfg, ...patch };
    setCfg(next);
    const mm = metrics(next);
    onChange?.({ ...next, recall: mm.recall, faithful: mm.faithful, fresh: mm.fresh, correct: mm.correct, regressions: mm.regressions } satisfies RagEvalState);
  };

  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const tick = (v: boolean | null) =>
    v === null ? <Minus className="h-4 w-4 text-ink-3" aria-label="not applicable" /> : v ? <Check className="h-4 w-4 text-good" aria-label="pass" /> : <X className="h-4 w-4 text-bad" aria-label="fail" />;

  return (
    <div className="w-full max-w-2xl">
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            ["Index", "index", [["old", "Last month's"], ["fresh", "Rebuilt today"]]],
            ["Search", "search", [["vector", "Vector only"], ["hybrid", "Hybrid"]]],
            ["Chunks", "chunks", [["small", "Small"], ["large", "Large"]]],
            ["Prompt", "prompt", [["loose", "Loose"], ["cite", "Cite or decline"]]],
          ] as const
        ).map(([label, key, opts]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs text-ink-3">{label}</span>
            <Segmented
              label={label}
              value={cfg[key] as string}
              disabled={revealed}
              options={opts.map(([id, l]) => ({ id, label: l }))}
              onChange={(v) => upd({ [key]: v } as Partial<Config>)}
              className="min-w-0 flex-1"
            />
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {(
          [
            ["Retrieval recall", m.recall],
            ["Faithfulness", m.faithful],
            ["Freshness", m.fresh],
          ] as const
        ).map(([label, v]) => (
          <div key={label} className="rounded-lg border border-line bg-surface p-2">
            <p className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3">{label}</p>
            <p className="font-mono text-lg font-semibold tabular-nums text-ink">{pct(v)}</p>
            <Meter frac={v} tone={v >= 0.99 ? "brand" : v >= 0.7 ? "warn" : "bad"} label={`${label} ${pct(v)}`} />
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-2">
        <div className="px-1.5 pb-1.5">
          <Caption className="!mb-0">
            Regression set: {m.correct} of {QS.length} answered correctly
          </Caption>
          <p className="text-[11px] text-ink-3">Three ticks per question, left to right: right passage found · answer supported · answer current. A dash means it does not apply.</p>
        </div>
        <ul className="grid gap-1">
          {QS.map((q, i) => {
            const r = m.rs[i];
            const regressed = baseResults[i].outcome === "correct" && r.outcome !== "correct";
            const fixed = baseResults[i].outcome !== "correct" && r.outcome === "correct";
            return (
              <li key={q.id} className={`rounded-lg border bg-surface px-2.5 py-1.5 ${regressed ? "border-[var(--bad)]/60" : "border-line"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-[13px] leading-snug text-ink">
                    <span className="font-mono text-[11px] text-ink-3">{q.id.toUpperCase()}</span> {q.text}
                  </p>
                  <span className="flex shrink-0 items-center gap-2.5 pt-0.5">
                    {tick(r.retrieved)}
                    {tick(r.faithful)}
                    {tick(r.fresh)}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] leading-snug text-ink-2">
                  <span className={`font-semibold ${r.outcome === "correct" ? "text-good" : r.outcome === "declined" ? "text-ink" : "text-bad"}`}>{r.outcome === "correct" ? "Correct" : r.outcome === "declined" ? "Declined" : "Wrong"}</span>: {r.note}
                  {regressed && (
                    <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--bad)]/15 px-1.5 align-middle text-[11px] font-semibold text-ink">
                      <TriangleAlert className="h-3 w-3 text-bad" /> regressed
                    </span>
                  )}
                  {fixed && <span className="ml-1.5 rounded-full bg-[var(--brand)]/25 px-1.5 align-middle text-[11px] font-semibold text-ink">fixed</span>}
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      <Note tone={m.regressions > 0 ? "bad" : "neutral"} className="mt-3">
        {m.regressions > 0
          ? `${m.regressions} question${m.regressions === 1 ? "" : "s"} that passed in the starting setup now fail. An average can go up while a customer's question breaks; only a per-question set shows it.`
          : "Compared with the starting setup (last month's index, vector only, small chunks, loose prompt), nothing that used to pass has broken."}
      </Note>
    </div>
  );
}

export function checkRagEval(state: unknown, goal: Record<string, unknown>) {
  const st = state as RagEvalState | undefined;
  if (!st) return false;
  if (typeof goal.minRecall === "number" && st.recall < goal.minRecall - 1e-9) return false;
  if (typeof goal.minFaithful === "number" && st.faithful < goal.minFaithful - 1e-9) return false;
  if (typeof goal.minFresh === "number" && st.fresh < goal.minFresh - 1e-9) return false;
  if (typeof goal.chunks === "string" && st.chunks !== goal.chunks) return false;
  if (typeof goal.search === "string" && st.search !== goal.search) return false;
  if (typeof goal.minRegressions === "number" && st.regressions < goal.minRegressions) return false;
  return true;
}

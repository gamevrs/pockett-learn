"use client";

import React, { useState } from "react";
import { Bot, Database, FileText, RotateCcw, Sigma, StepForward, User } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Note, Readout, Segmented } from "./ui";

/**
 * Retrieval-augmented generation end to end, for a school library assistant. A student asks a
 * question the model could only answer by knowing *this* library's rules. Step through: embed the
 * question, search the handbook index, assemble a prompt, let the model answer. Switch retrieval
 * off to watch it confidently invent a policy, or change how many passages are retrieved (k).
 */

interface Passage {
  id: string;
  title: string;
  text: string;
  score: number;
  tokens: number;
}

const PASSAGES: Passage[] = [
  { id: "renewals", title: "Renewals", text: "A loan may be renewed twice, for 14 days each time, unless another reader has reserved the book.", score: 0.91, tokens: 24 },
  { id: "reservations", title: "Reservations", text: "A returned reserved book is held at the front desk for 3 days for the reader who asked for it.", score: 0.78, tokens: 24 },
  { id: "loans", title: "Loans", text: "Students may borrow up to 5 books at once, for 21 days.", score: 0.62, tokens: 16 },
  { id: "fees", title: "Late fees", text: "Late fees are 10p a day, capped at £3 per book.", score: 0.55, tokens: 14 },
  { id: "reference", title: "Reference shelf", text: "Reference works can be read in the library but never leave the building.", score: 0.31, tokens: 17 },
  { id: "cards", title: "Library cards", text: "A lost card is replaced for £1.", score: 0.22, tokens: 10 },
];
const QUESTION = "Can I renew a book that someone else has reserved?";
const SYSTEM = "You are the school library assistant. Answer only from the passages. Cite them. If they do not say, say you don't know.";
const SYSTEM_TOKENS = 28;
const QUESTION_TOKENS = 12;

type Outcome = "invented" | "thin" | "complete" | "noisy";

interface Ev {
  lane: "student" | "embed" | "index" | "prompt" | "model";
  title: string;
  body: string;
  /** monospace body */
  mono?: boolean;
  tone?: "good" | "bad";
}

function plan(retrieval: boolean, k: number) {
  const picked = PASSAGES.slice(0, k);
  const tokens = SYSTEM_TOKENS + QUESTION_TOKENS + (retrieval ? picked.reduce((s, p) => s + p.tokens, 0) : 0);
  const outcome: Outcome = !retrieval ? "invented" : k === 1 ? "thin" : k === 3 ? "complete" : "noisy";
  const evs: Ev[] = [{ lane: "student", title: "Question", body: QUESTION }];
  if (retrieval) {
    evs.push({ lane: "embed", title: "Turn the question into numbers", body: "embed(question) → [0.12, −0.40, 0.07, 0.31, …] (768 numbers that stand for what the question is about)", mono: true });
    evs.push({
      lane: "index",
      title: `Search the handbook index for the ${k} nearest passage${k === 1 ? "" : "s"}`,
      body: picked.map((p) => `${p.score.toFixed(2)}  ${p.title}`).join("\n") + (k < PASSAGES.length ? `\n(${PASSAGES.length - k} more passages scored lower and were left out)` : ""),
      mono: true,
    });
  }
  evs.push({
    lane: "prompt",
    title: "Assemble the prompt",
    body: [`SYSTEM: ${SYSTEM}`, ...(retrieval ? picked.map((p, i) => `[${i + 1}] ${p.title}: ${p.text}`) : ["(no passages)"]), `QUESTION: ${QUESTION}`].join("\n") + `\n\nabout ${tokens} tokens`,
    mono: true,
  });
  const answer: Record<Outcome, Ev> = {
    invented: { lane: "model", title: "Answer, from memory alone", body: "Yes! Library books can be renewed three times for 21 days each, even if reserved.", tone: "bad" },
    thin: { lane: "model", title: "Answer, grounded in 1 passage", body: "No. A book someone else has reserved can't be renewed [1]. Please return it.", tone: "good" },
    complete: { lane: "model", title: "Answer, grounded in 3 passages", body: "No: a reserved book can't be renewed [1]. Return it and it will be held at the front desk for the reader who reserved it for 3 days [2].", tone: "good" },
    noisy: { lane: "model", title: "Answer, grounded (with extra reading)", body: "No: a reserved book can't be renewed [1]. Return it and it will be held for the reader who reserved it for 3 days [2].", tone: "good" },
  };
  evs.push(answer[outcome]);
  return { evs, outcome, tokens };
}

const LANES = {
  student: { label: "Student", Icon: User },
  embed: { label: "Embedding model", Icon: Sigma },
  index: { label: "Vector index", Icon: Database },
  prompt: { label: "Prompt builder", Icon: FileText },
  model: { label: "Language model", Icon: Bot },
} as const;

export interface RagProps {
  /** Show the retrieval on/off switch (default true). */
  retrievalToggle?: boolean;
  /** Show the k switch (default true). */
  kToggle?: boolean;
  k?: number;
}

export interface RagState {
  retrieval: boolean;
  k: number;
  finished: boolean;
  outcome: Outcome;
  tokens: number;
}

export function RagPipeline({ props, onChange, revealed }: WidgetProps<RagProps>) {
  const [retrieval, setRetrieval] = useState(true);
  const [k, setK] = useState(props.k ?? 3);
  const [shown, setShown] = useState(0);

  const { evs, outcome, tokens } = plan(retrieval, k);
  const finished = shown >= evs.length;

  const report = (r: boolean, kk: number, s: number) => {
    const p = plan(r, kk);
    onChange?.({ retrieval: r, k: kk, finished: s >= p.evs.length, outcome: p.outcome, tokens: p.tokens } satisfies RagState);
  };
  const setR = (r: boolean) => {
    if (revealed) return;
    setRetrieval(r);
    setShown(0);
    report(r, k, 0);
  };
  const setKk = (kk: number) => {
    if (revealed) return;
    setK(kk);
    setShown(0);
    report(retrieval, kk, 0);
  };
  const next = () => {
    if (revealed || finished) return;
    setShown(shown + 1);
    report(retrieval, k, shown + 1);
  };
  const reset = () => {
    setShown(0);
    report(retrieval, k, 0);
  };

  const vis = evs.slice(0, shown);
  const needed = retrieval ? PASSAGES.slice(0, k).filter((p) => p.id === "renewals" || p.id === "reservations").length : 0;

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {(props.retrievalToggle ?? true) && (
          <Segmented
            label="Retrieval"
            value={retrieval ? "on" : "off"}
            disabled={revealed}
            options={[
              { id: "on", label: "With retrieval" },
              { id: "off", label: "Model alone" },
            ]}
            onChange={(v) => setR(v === "on")}
          />
        )}
        {(props.kToggle ?? true) && retrieval && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-3">Passages (k)</span>
            <Segmented label="Passages retrieved" value={k} disabled={revealed} options={[1, 3, 5].map((v) => ({ id: v, label: String(v) }))} onChange={setKk} />
          </div>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
        <ol className="grid gap-1.5">
          {vis.length === 0 && <li className="py-3 text-sm text-ink-3">Press Next to send the student&apos;s question down the pipeline.</li>}
          {vis.map((ev, i) => {
            const { label, Icon } = { label: LANES[ev.lane].label, Icon: LANES[ev.lane].Icon };
            return (
              <li key={`${retrieval}-${k}-${i}`} className={`rounded-lg border bg-surface px-3 py-2 ${i === vis.length - 1 ? "pop-in" : ""} ${ev.tone === "bad" ? "border-[var(--bad)]/50" : ev.tone === "good" ? "border-[var(--brand)]/50" : "border-line"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip inline-flex items-center gap-1">
                    <Icon className="h-3 w-3" />
                    {label}
                  </span>
                  <span className="text-sm font-semibold text-ink">{ev.title}</span>
                </div>
                <p className={`mt-1 whitespace-pre-wrap break-words text-[12.5px] leading-snug text-ink-2 ${ev.mono ? "font-mono text-[12px]" : ""}`}>{ev.body}</p>
              </li>
            );
          })}
        </ol>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary !h-10" onClick={next} disabled={revealed || finished}>
            <StepForward className="h-4 w-4" /> Next
          </button>
          <button type="button" className="btn !h-10" onClick={reset} disabled={revealed || shown === 0}>
            <RotateCcw className="h-4 w-4" /> Replay
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Prompt size" value={`about ${tokens} tokens`} />
        <Readout label="Needed passages found" value={retrieval ? `${needed} of 2` : "none"} accent={needed === 2} />
      </div>
      {finished && (
        <Note tone={outcome === "invented" ? "bad" : "good"} className="pop-in mt-2">
          {outcome === "invented"
            ? "Fluent, confident and wrong. The model has never seen this library's rules, so it filled the gap with a plausible-sounding policy."
            : outcome === "thin"
              ? "Correct, but thin: with only one passage the answer cannot mention the 3-day hold."
              : outcome === "complete"
                ? "Correct and complete: both passages the answer needs were retrieved, and the prompt stayed small."
                : "Correct, but the prompt is almost twice as big as it needs to be: you paid for passages that did not matter."}
        </Note>
      )}
      <p className="mt-2 text-center text-[11px] text-ink-3">Scores are cosine similarities from an imaginary embedding model. Token counts are estimates.</p>
    </div>
  );
}

export function checkRagPipeline(state: unknown, goal: Record<string, unknown>) {
  const st = state as RagState | undefined;
  if (!st) return false;
  if (typeof goal.retrieval === "boolean" && st.retrieval !== goal.retrieval) return false;
  if (goal.finished === true && !st.finished) return false;
  if (typeof goal.outcome === "string" && st.outcome !== goal.outcome) return false;
  if (typeof goal.k === "number" && st.k !== goal.k) return false;
  return true;
}

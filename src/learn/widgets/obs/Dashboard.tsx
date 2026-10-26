"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, useReport } from "./kit";

/**
 * Build the on-call dashboard for a checkout service. At 3 a.m. the engineer has five questions.
 * Panels cost attention, so pick at most six that between them answer all five questions; a
 * wall of every available graph answers none of them quickly.
 */

interface Panel {
  id: string;
  title: string;
  shows: string;
  answers: string[];
}

export const QUESTIONS: { id: string; text: string }[] = [
  { id: "hurt", text: "Are users being hurt right now?" },
  { id: "volume", text: "How much traffic is this?" },
  { id: "changed", text: "Did something just change?" },
  { id: "where", text: "Which part is failing?" },
  { id: "room", text: "Are we about to run out of room?" },
];

export const PANELS: Panel[] = [
  { id: "err", title: "Error rate, all checkouts", shows: "share of requests that fail", answers: ["hurt"] },
  { id: "p95", title: "Checkout latency p95", shows: "how slow the slow end is", answers: ["hurt"] },
  { id: "rate", title: "Requests per second", shows: "traffic, with yesterday overlaid", answers: ["volume"] },
  { id: "marks", title: "Deploy and flag markers", shows: "vertical lines on the graphs when something shipped", answers: ["changed"] },
  { id: "by", title: "Errors by route and region", shows: "which slice the failures are in", answers: ["where", "hurt"] },
  { id: "db", title: "Database connections in use / max", shows: "how close the pool is to full", answers: ["room"] },
  { id: "queue", title: "Order-worker queue depth", shows: "work waiting to be processed", answers: ["room"] },
  { id: "cpu", title: "CPU of each of 40 hosts", shows: "forty small graphs", answers: [] },
  { id: "logs", title: "Log lines per second", shows: "how chatty the app is", answers: [] },
  { id: "uptime", title: "Uptime for the last five years", shows: "a number with many nines", answers: [] },
  { id: "mem", title: "Memory of every pod", shows: "a coloured grid of pods", answers: [] },
];

export interface DashboardState {
  selected: string[];
  answered: string[];
  count: number;
  all: boolean;
}

export function Dashboard({ props, onChange, revealed }: WidgetProps<{ max?: number }>) {
  const max = props.max ?? 6;
  const [selected, setSelected] = useState<string[]>([]);
  const answered = QUESTIONS.filter((q) => selected.some((id) => PANELS.find((p) => p.id === id)?.answers.includes(q.id))).map((q) => q.id);
  const all = answered.length === QUESTIONS.length;
  useReport(onChange, { selected, answered, count: selected.length, all } satisfies DashboardState, selected.join(","));

  const toggle = (id: string) => {
    if (revealed) return;
    if (selected.includes(id)) setSelected(selected.filter((s) => s !== id));
    else if (selected.length < max) setSelected([...selected, id]);
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="rounded-xl border border-line bg-surface-2 p-3">
        <Caption>The five questions at 3 a.m.</Caption>
        <ul className="mt-2 grid gap-1">
          {QUESTIONS.map((q) => {
            const ok = answered.includes(q.id);
            return (
              <li key={q.id} className="flex items-center gap-2 text-[13px]">
                {ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-good" /> : <Circle className="h-4 w-4 shrink-0 text-ink-3" />}
                <span className={ok ? "text-ink" : "text-ink-2"}>{q.text}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Caption>Panels available (choose up to {max})</Caption>
        <Readout label="chosen" value={`${selected.length} / ${max}`} accent={all} />
      </div>
      <div className="mt-2 grid gap-2 min-[560px]:grid-cols-2">
        {PANELS.map((p) => {
          const on = selected.includes(p.id);
          const full = !on && selected.length >= max;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              disabled={revealed || full}
              aria-pressed={on}
              className={`min-h-[3.5rem] rounded-xl border p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${on ? "border-[var(--brand)] bg-tint" : "border-line bg-surface hover:bg-surface-2"}`}
            >
              <span className="block text-[13px] font-semibold text-ink">{p.title}</span>
              <span className="block text-[11.5px] text-ink-3">{p.shows}</span>
            </button>
          );
        })}
      </div>

      <Note tone={all ? "good" : "neutral"} className="mt-2" >
        {all
          ? `All five questions answered with ${selected.length} panels. Anyone woken at 3 a.m. can read this top to bottom in half a minute.`
          : `Still unanswered: ${QUESTIONS.filter((q) => !answered.includes(q.id)).map((q) => q.text.replace(/\?$/, "").toLowerCase()).join("; ") || "none"}.`}
      </Note>
    </div>
  );
}

/** goal: { all: true, maxPanels: 6 } */
export function checkDashboard(state: unknown, goal: Record<string, unknown>) {
  const s = state as DashboardState | undefined;
  if (!s) return false;
  if (goal.all === true && !s.all) return false;
  if (typeof goal.maxPanels === "number" && s.count > goal.maxPanels) return false;
  return ["all", "maxPanels"].some((k) => k in goal);
}

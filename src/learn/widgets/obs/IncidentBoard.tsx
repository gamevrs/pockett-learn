"use client";

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, useReport } from "./kit";

/**
 * Sort the actions from one incident into the four jobs of incident response: detect, mitigate,
 * communicate and learn. Tap an action, then tap the phase it belongs to; tap a placed action to
 * send it back.
 */

type Phase = "detect" | "mitigate" | "communicate" | "learn";

const PHASES: { id: Phase; label: string; hint: string }[] = [
  { id: "detect", label: "Detect", hint: "find out something is wrong" },
  { id: "mitigate", label: "Mitigate", hint: "stop the harm, now" },
  { id: "communicate", label: "Communicate", hint: "keep people informed" },
  { id: "learn", label: "Learn", hint: "make it less likely, later" },
];

export interface Item {
  id: string;
  text: string;
  phase: Phase;
}

const ITEMS: Item[] = [
  { id: "a", text: "A burn-rate alert pages the on-call engineer", phase: "detect" },
  { id: "b", text: "Post on the status page: some checkouts are failing, we are on it", phase: "communicate" },
  { id: "c", text: "Roll back the 14:00 release", phase: "mitigate" },
  { id: "d", text: "A customer tweets that they cannot pay", phase: "detect" },
  { id: "e", text: "Hold a blameless review a few days later", phase: "learn" },
  { id: "f", text: "Give support a short script for customers who ask", phase: "communicate" },
  { id: "g", text: "Switch payments over to the backup provider", phase: "mitigate" },
  { id: "h", text: "Add an alert that would have fired ten minutes sooner", phase: "learn" },
];

export interface IncidentState {
  placed: Record<string, Phase>;
  correct: number;
  total: number;
  all: boolean;
}

export function IncidentBoard({ props, onChange, revealed, status }: WidgetProps<{ items?: Item[] }>) {
  const items = props.items ?? ITEMS;
  const [placed, setPlaced] = useState<Record<string, Phase>>({});
  const [held, setHeld] = useState<string | null>(null);
  const correct = items.filter((i) => placed[i.id] === i.phase).length;
  const all = correct === items.length;
  useReport(onChange, { placed, correct, total: items.length, all } satisfies IncidentState, JSON.stringify(placed));

  const place = (phase: Phase) => {
    if (revealed || !held) return;
    setPlaced({ ...placed, [held]: phase });
    setHeld(null);
  };
  const back = (id: string) => {
    if (revealed) return;
    const next = { ...placed };
    delete next[id];
    setPlaced(next);
  };
  const pool = items.filter((i) => !placed[i.id]);
  const mark = (i: Item) => (status === "wrong" || status === "revealed") && placed[i.id] !== i.phase;

  return (
    <div className="w-full max-w-2xl">
      <div className="rounded-xl border border-line bg-surface-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <Caption>{pool.length ? "Tap an action, then a phase" : "All placed"}</Caption>
          <button type="button" className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-xs text-ink-3 hover:text-ink disabled:opacity-40" onClick={() => { setPlaced({}); setHeld(null); }} disabled={revealed || Object.keys(placed).length === 0}>
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
        <div className="mt-2 grid gap-1.5">
          {pool.map((i) => (
            <button
              key={i.id}
              type="button"
              disabled={revealed}
              onClick={() => setHeld(held === i.id ? null : i.id)}
              aria-pressed={held === i.id}
              className={`min-h-10 rounded-lg border px-3 py-1.5 text-left text-[13px] transition-colors ${held === i.id ? "border-[var(--brand)] bg-tint text-ink ring-1 ring-[var(--brand)]/50" : "border-line bg-surface text-ink hover:bg-surface-2"}`}
            >
              {i.text}
            </button>
          ))}
          {pool.length === 0 && <p className="py-2 text-sm text-ink-3">Nothing left to sort.</p>}
        </div>
      </div>

      <div className="mt-3 grid gap-2 min-[560px]:grid-cols-2">
        {PHASES.map((p) => (
          <div key={p.id} className="rounded-xl border border-line bg-surface p-2.5">
            <button
              type="button"
              onClick={() => place(p.id)}
              disabled={revealed || !held}
              className={`flex min-h-10 w-full items-baseline justify-between gap-2 rounded-lg px-2 text-left transition-colors ${held ? "bg-tint ring-1 ring-[var(--brand)]/50 hover:ring-2" : ""} disabled:cursor-default`}
            >
              <span className="text-sm font-semibold text-ink">{p.label}</span>
              <span className="text-[11px] text-ink-3">{p.hint}</span>
            </button>
            <div className="mt-1.5 grid gap-1">
              {items
                .filter((i) => placed[i.id] === p.id)
                .map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => back(i.id)}
                    disabled={revealed}
                    className={`min-h-9 rounded-lg border px-2.5 py-1 text-left text-[12.5px] text-ink ${mark(i) ? "border-[var(--bad)] bg-[var(--bad)]/[0.07]" : "border-line bg-surface-2"}`}
                  >
                    {i.text}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" aria-live="polite">
        <Readout label="Placed" value={`${Object.keys(placed).length} of ${items.length}`} />
        {Object.keys(placed).length === items.length && <Readout label="In the right phase" value={`${correct} of ${items.length}`} accent={all} />}
      </div>
      {status === "wrong" && !all && <Note tone="bad" className="mt-2">Red outlines are in the wrong phase. Tap one to send it back, then place it again.</Note>}
    </div>
  );
}

/** goal: { all: true } */
export function checkIncidentBoard(state: unknown, goal: Record<string, unknown>) {
  const s = state as IncidentState | undefined;
  if (!s) return false;
  if (goal.all === true) return s.all;
  return false;
}

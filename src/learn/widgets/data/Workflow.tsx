"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout } from "../dsa/ui";
import { Choice } from "./ui";

/**
 * Fulfilling a ticket order takes four steps: charge the card, reserve the seats, e-mail the
 * tickets, mark the order done. Two ways to run them:
 *   queue      one message "fulfil order 42"; a worker runs all four steps; if it dies or fails, the
 *              message comes back and the *whole* job starts again (up to 3 tries, then a dead-letter queue)
 *   workflow   the engine saves each finished step; after a crash it resumes at the step that was
 *              running, and when a step fails for good it runs the undo steps (refund) for those done
 * Break something and compare what happened to the customer.
 */

type Mode = "queue" | "workflow";
type StepId = "charge" | "reserve" | "email" | "done";
const STEPS: { id: StepId; label: string }[] = [
  { id: "charge", label: "Charge the card" },
  { id: "reserve", label: "Reserve the seats" },
  { id: "email", label: "E-mail the tickets" },
  { id: "done", label: "Mark the order done" },
];

interface Event {
  text: string;
  tone: "plain" | "bad" | "good" | "undo";
}

interface Outcome {
  events: Event[];
  charges: number;
  refunds: number;
  seats: number;
  emails: number;
  status: "ok" | "double-charge" | "stuck-paid" | "refunded";
  statusText: string;
}

export function simulate(mode: Mode, idempotent: boolean, crashAt: StepId | "none", soldOut: boolean): Outcome {
  const ev: Event[] = [];
  const o = { charges: 0, refunds: 0, seats: 0, emails: 0 };
  const done = new Set<StepId>(); // effects that really happened (for idempotency keys)
  let crashed = false;

  /** Runs one step. Returns "ok", "crash" (worker died after the effect) or "fail" (permanent failure). */
  const doStep = (id: StepId): "ok" | "crash" | "fail" => {
    const label = STEPS.find((s) => s.id === id)!.label;
    if (id === "reserve" && soldOut) {
      ev.push({ text: `${label}: the seats were sold out in the meantime. This will never succeed.`, tone: "bad" });
      return "fail";
    }
    if (idempotent && done.has(id)) {
      ev.push({ text: `${label}: already done (the idempotency key matches), skipped.`, tone: "plain" });
    } else {
      done.add(id);
      if (id === "charge") o.charges += 1;
      if (id === "reserve") o.seats += 1;
      if (id === "email") o.emails += 1;
      ev.push({ text: label, tone: "plain" });
    }
    if (crashAt === id && !crashed) {
      crashed = true;
      ev.push({ text: "The worker process is killed right after this step, before it can report back.", tone: "bad" });
      return "crash";
    }
    return "ok";
  };

  if (mode === "queue") {
    let attempt = 0;
    let finished = false;
    while (attempt < 3 && !finished) {
      attempt += 1;
      ev.push({ text: attempt === 1 ? "Message delivered to a worker." : `The queue redelivers the message (try ${attempt} of 3). The worker starts from the top.`, tone: attempt === 1 ? "plain" : "undo" });
      finished = true;
      for (const s of STEPS) {
        const r = doStep(s.id);
        if (r !== "ok") {
          finished = false;
          break;
        }
      }
    }
    if (!finished) ev.push({ text: "3 tries used up. The message moves to the dead-letter queue for a human to look at.", tone: "bad" });
    const status: Outcome["status"] = !finished ? "stuck-paid" : o.charges > 1 ? "double-charge" : "ok";
    const statusText =
      status === "stuck-paid"
        ? `The customer was charged ${o.charges}× and has no tickets. Nothing refunds them automatically.`
        : status === "double-charge"
          ? "The order completed, but the card was charged twice: the retry re-ran a step that had already happened."
          : "Completed once, with every effect happening once.";
    return { events: ev, ...o, status, statusText };
  }

  // workflow engine: durable history, resume at the interrupted step, compensate on permanent failure
  ev.push({ text: "Workflow started. Every finished step is saved in its history.", tone: "plain" });
  const completed: StepId[] = [];
  for (const s of STEPS) {
    let r = doStep(s.id);
    if (r === "crash") {
      ev.push({ text: "A new worker picks the workflow up, reads the history, and resumes at this step (not at the start).", tone: "undo" });
      r = doStep(s.id);
    }
    if (r === "fail") {
      for (const c of [...completed].reverse()) {
        if (c === "charge") {
          o.refunds += 1;
          ev.push({ text: "Compensation: refund the card charge.", tone: "undo" });
        }
      }
      ev.push({ text: "Workflow ends as failed, cleanly: the customer is told the seats are gone and has their money back.", tone: "good" });
      return { events: ev, ...o, status: "refunded", statusText: `Charged ${o.charges}×, refunded ${o.refunds}×: the customer is whole again, with no human involved.` };
    }
    completed.push(s.id);
  }
  ev.push({ text: "All four steps recorded. Workflow completed.", tone: "good" });
  const status: Outcome["status"] = o.charges > 1 ? "double-charge" : "ok";
  return {
    events: ev,
    ...o,
    status,
    statusText:
      status === "double-charge"
        ? "Only the interrupted step ran twice, but that step was the charge. Without an idempotency key, resuming isn't enough."
        : crashAt !== "none"
          ? "The crash cost one extra attempt of a single step, and nothing else was repeated."
          : "Completed once, with every effect happening once.",
  };
}

export interface WorkflowProps {
  mode?: Mode;
  fixedMode?: boolean;
}

export interface WorkflowState {
  mode: Mode;
  idempotent: boolean;
  crashAt: string;
  soldOut: boolean;
  charges: number;
  refunds: number;
  status: Outcome["status"];
  touched: boolean;
}

export function Workflow({ props, onChange, revealed }: WidgetProps<WorkflowProps>) {
  const [mode, setMode] = useState<Mode>(props.mode ?? "queue");
  const [idem, setIdem] = useState(false);
  const [crashAt, setCrashAt] = useState<StepId | "none">("none");
  const [soldOut, setSoldOut] = useState(false);
  const out = simulate(mode, idem, crashAt, soldOut);

  const emit = (m: Mode, i: boolean, c: StepId | "none", s: boolean) => {
    const x = simulate(m, i, c, s);
    onChange?.({ mode: m, idempotent: i, crashAt: c, soldOut: s, charges: x.charges, refunds: x.refunds, status: x.status, touched: true } satisfies WorkflowState);
  };

  return (
    <div className="w-full min-w-0">
      {!props.fixedMode && (
        <Choice label="How the steps are run" value={mode} disabled={revealed} onChange={(m) => { setMode(m); emit(m, idem, crashAt, soldOut); }} options={[{ id: "queue", label: "Queue + retries" }, { id: "workflow", label: "Durable workflow" }]} />
      )}
      <Caption className="mt-4">Break something</Caption>
      <div className="flex flex-wrap gap-1.5">
        <Choice
          label="Kill the worker after"
          value={crashAt}
          disabled={revealed}
          onChange={(v) => {
            setCrashAt(v);
            emit(mode, idem, v, soldOut);
          }}
          options={[
            { id: "none", label: "No crash" },
            { id: "charge", label: "Kill after charge" },
            { id: "reserve", label: "Kill after reserve" },
            { id: "email", label: "Kill after e-mail" },
          ]}
        />
        <button type="button" aria-pressed={soldOut} disabled={revealed} onClick={() => { setSoldOut(!soldOut); emit(mode, idem, crashAt, !soldOut); }}
          className={`min-h-10 rounded-full border px-3.5 text-sm transition-colors disabled:cursor-default ${soldOut ? "border-[var(--bad)]/60 bg-[var(--bad)]/15 font-medium text-bad" : "border-line bg-surface text-ink hover:border-[var(--line-strong)]"}`}>
          Seats sell out first
        </button>
        <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-sm text-ink-2">
          <input type="checkbox" aria-label="Idempotency keys on every step" className="h-4 w-4 accent-[var(--brand)]" checked={idem} disabled={revealed} onChange={(e) => { setIdem(e.target.checked); emit(mode, e.target.checked, crashAt, soldOut); }} />
          Idempotency keys on every step
        </label>
      </div>

      <ol className="mt-4 grid gap-1 rounded-xl border border-line bg-surface-2 p-2.5 text-[0.82rem]">
        {out.events.map((e, i) => (
          <li key={i} className={`flex gap-2 ${e.tone === "bad" ? "text-bad" : e.tone === "good" ? "text-brand" : e.tone === "undo" ? "font-medium text-ink" : "text-ink-2"}`}>
            <span className="w-4 shrink-0 text-right font-mono text-[11px] text-ink-3">{i + 1}</span>
            <span>{e.text}</span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Card charges" value={out.charges} accent={out.charges > 1} />
        <Readout label="Refunds" value={out.refunds} />
        <Readout label="Seat holds" value={out.seats} />
        <Readout label="Ticket e-mails" value={out.emails} accent={out.emails > 1} />
      </div>
      <Note tone={out.status === "ok" || out.status === "refunded" ? "good" : "bad"}>{out.statusText}</Note>
    </div>
  );
}

export function checkWorkflow(state: unknown, goal: Record<string, unknown>) {
  const s = state as WorkflowState | undefined;
  if (!s) return false;
  if (typeof goal.mode === "string" && s.mode !== goal.mode) return false;
  if (typeof goal.status === "string" && s.status !== goal.status) return false;
  if (typeof goal.soldOut === "boolean" && s.soldOut !== goal.soldOut) return false;
  if (typeof goal.idempotent === "boolean" && s.idempotent !== goal.idempotent) return false;
  if (typeof goal.chargesMax === "number" && s.charges > goal.chargesMax) return false;
  if (typeof goal.crash === "boolean" && (s.crashAt !== "none") !== goal.crash) return false;
  return true;
}

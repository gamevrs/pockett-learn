"use client";

import React, { useState } from "react";
import { CheckCircle2, CircleSlash, Clock, XCircle } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Segmented, fmtSecs, useReport } from "./kit";

/**
 * A CI pipeline drawn as a timeline. Pick which stage is broken and how the stages are laid out
 * (as written, cheapest first, or in parallel) and see how long the developer waits to hear
 * "your change is broken". Stages after the failure never run; stages running alongside it are
 * cancelled.
 */

export interface PipeStage {
  id: string;
  name: string;
  secs: number;
  /** Stage ids that must finish first. */
  needs?: string[];
}

const DEFAULT_STAGES: PipeStage[] = [
  { id: "build", name: "Build the image", secs: 60 },
  { id: "integration", name: "Integration tests", secs: 150, needs: ["build"] },
  { id: "e2e", name: "End-to-end tests", secs: 240, needs: ["build"] },
  { id: "unit", name: "Unit tests", secs: 40 },
  { id: "lint", name: "Lint and type check", secs: 8 },
];

type Layout = "written" | "cheap" | "parallel";
type Outcome = "pass" | "fail" | "skipped" | "cancelled";

interface Slot {
  stage: PipeStage;
  start: number;
  end: number;
  outcome: Outcome;
}

/** Lay the stages out in time. A stage that fails ends the run at its end time. */
export function schedule(stages: PipeStage[], layout: Layout, broken: string | null): { slots: Slot[]; feedback: number; total: number } {
  const byId = new Map(stages.map((s) => [s.id, s]));
  const slots: Slot[] = [];
  if (layout === "parallel") {
    // each stage starts as soon as everything it needs has finished
    const end = new Map<string, number>();
    const place = (s: PipeStage): number => {
      const known = end.get(s.id);
      if (known !== undefined) return known;
      const start = Math.max(0, ...(s.needs ?? []).map((n) => place(byId.get(n)!)));
      end.set(s.id, start + s.secs);
      slots.push({ stage: s, start, end: start + s.secs, outcome: "pass" });
      return start + s.secs;
    };
    stages.forEach(place);
  } else {
    const order = layout === "cheap" ? [...stages].sort((a, b) => a.secs - b.secs) : stages;
    let at = 0;
    for (const s of order) {
      slots.push({ stage: s, start: at, end: at + s.secs, outcome: "pass" });
      at += s.secs;
    }
  }
  const total = Math.max(...slots.map((s) => s.end));
  const bad = slots.find((s) => s.stage.id === broken);
  if (!bad) return { slots, feedback: total, total };
  const stop = bad.end;
  for (const s of slots) {
    if (s === bad) s.outcome = "fail";
    else if (s.start >= stop) s.outcome = "skipped";
    else if (s.end > stop) s.outcome = "cancelled";
  }
  return { slots, feedback: stop, total };
}

export interface PipelineProps {
  stages?: PipeStage[];
  layout?: Layout;
  broken?: string | null;
  /** Hide the controls the lesson does not want the learner to touch. */
  lockLayout?: boolean;
  lockBroken?: boolean;
}

export interface PipelineState {
  layout: Layout;
  broken: string | null;
  feedback: number;
  total: number;
}

export function Pipeline({ props, onChange, revealed }: WidgetProps<PipelineProps>) {
  const stages = props.stages ?? DEFAULT_STAGES;
  const [layout, setLayout] = useState<Layout>(props.layout ?? "written");
  const [broken, setBroken] = useState<string | null>(props.broken === undefined ? "lint" : props.broken);
  const { slots, feedback, total } = schedule(stages, layout, broken);
  const scale = Math.max(...slots.map((s) => s.end), 1);
  useReport(onChange, { layout, broken, feedback, total } satisfies PipelineState, `${layout}|${broken}`);

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {!props.lockLayout && (
          <Segmented
            label="Pipeline layout"
            value={layout}
            disabled={revealed}
            onChange={setLayout}
            options={[
              { id: "written", label: "As written" },
              { id: "cheap", label: "Cheapest first" },
              { id: "parallel", label: "In parallel" },
            ]}
          />
        )}
      </div>

      {!props.lockBroken && (
        <div className="mt-3">
          <Caption>Which stage does this commit break?</Caption>
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Broken stage">
            {[{ id: null as string | null, name: "None: all green" }, ...stages.map((s) => ({ id: s.id as string | null, name: s.name }))].map((o) => (
              <button
                key={String(o.id)}
                type="button"
                role="radio"
                aria-checked={broken === o.id}
                disabled={revealed}
                onClick={() => setBroken(o.id)}
                className={`min-h-10 rounded-full border px-3 text-[13px] font-medium transition-colors disabled:cursor-default ${
                  broken === o.id ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink-2 hover:border-[var(--line-strong)] hover:text-ink"
                }`}
              >
                {o.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <div className="grid gap-1.5">
          {slots.map((s) => (
            <div key={s.stage.id} className="grid grid-cols-[minmax(5.5rem,8.5rem)_1fr] items-center gap-2 min-[480px]:grid-cols-[10rem_1fr]">
              <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink">
                {s.outcome === "pass" ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-good" /> : s.outcome === "fail" ? <XCircle className="h-3.5 w-3.5 shrink-0 text-bad" /> : <CircleSlash className="h-3.5 w-3.5 shrink-0 text-ink-3" />}
                <span className={`truncate ${s.outcome === "skipped" ? "text-ink-3 line-through" : ""}`}>{s.stage.name}</span>
              </span>
              <div className="relative h-6 rounded-md bg-surface-2">
                {s.outcome !== "skipped" && (
                  <div
                    className={`absolute inset-y-0 flex items-center rounded-md px-1.5 font-mono text-[10.5px] ${
                      s.outcome === "pass" ? "bg-primary text-primary-ink" : s.outcome === "fail" ? "bg-[var(--bad)] text-white" : "bg-[repeating-linear-gradient(135deg,rgba(138,138,138,0.4)_0_3px,transparent_3px_6px)] text-ink-2 ring-1 ring-inset ring-[var(--line-strong)]"
                    }`}
                    style={{ left: `${(s.start / scale) * 100}%`, width: `${Math.max(((s.outcome === "cancelled" ? Math.min(s.end, feedback) - s.start : s.end - s.start) / scale) * 100, 3)}%` }}
                  >
                    <span className="truncate">{fmtSecs(s.stage.secs)}</span>
                  </div>
                )}
                {s.outcome === "skipped" && <span className="absolute inset-0 grid place-items-center text-[10.5px] text-ink-3">never runs</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] text-ink-3">
          <span>0</span>
          <span>{fmtSecs(scale)}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" aria-live="polite">
        <Readout label={broken ? "Developer hears “broken” after" : "Everything is green after"} value={fmtSecs(feedback)} accent />
        {broken && total > feedback && <Readout label="a full run would take" value={fmtSecs(total)} />}
      </div>
      <Note className="mt-2">
        <span className="flex items-start gap-2">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
          {broken
            ? `The ${stages.find((s) => s.id === broken)?.name.toLowerCase()} stage fails. Stages that haven't started are skipped and the ones still running are cancelled, so the answer arrives as soon as the failing stage ends.`
            : "With no failure, the run takes as long as the stages need. Layout only matters when something is broken, and for the total when stages overlap."}
        </span>
      </Note>
    </div>
  );
}

/** goal: { maxFeedback: seconds, broken?: id, layout? } */
export function checkPipeline(state: unknown, goal: Record<string, unknown>) {
  const s = state as PipelineState | undefined;
  if (!s) return false;
  if (typeof goal.maxFeedback === "number" && s.feedback > goal.maxFeedback) return false;
  if (typeof goal.minFeedback === "number" && s.feedback < goal.minFeedback) return false;
  if (typeof goal.maxTotal === "number" && s.total > goal.maxTotal) return false;
  if (goal.broken !== undefined && s.broken !== goal.broken) return false;
  if (typeof goal.layout === "string" && s.layout !== goal.layout) return false;
  return ["maxFeedback", "minFeedback", "maxTotal", "broken", "layout"].some((k) => k in goal);
}

"use client";

import React, { useState } from "react";
import { Skull } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Segmented, Slider, useReport } from "./kit";

/**
 * A deploy sends SIGTERM to a server that is halfway through six requests. The learner picks what
 * the program does with the signal (die at once, ignore it, or drain) and how long the platform
 * waits before it sends SIGKILL, then reads the outcome request by request.
 */

type Mode = "exit" | "ignore" | "drain";
type Status = "ok" | "cut" | "refused" | "rerouted";

interface Row {
  label: string;
  start: number;
  /** When the bar stops being drawn (finish, or the moment it was cut). */
  until: number;
  status: Status;
}

export interface ShutdownProps {
  /** Seconds of work left on each request that is in flight when SIGTERM arrives. */
  inflight?: number[];
  /** Seconds after SIGTERM when new requests keep arriving (they last 3s each). */
  arrivals?: number[];
  mode?: Mode;
  grace?: number;
  lockMode?: boolean;
}

export interface ShutdownState {
  mode: Mode;
  grace: number;
  completed: number;
  cut: number;
  refused: number;
  killed: boolean;
  exitAt: number;
  clean: boolean;
}

const DEFAULT_INFLIGHT = [2, 3, 5, 7, 11, 16];
const DEFAULT_ARRIVALS = [3, 6, 9, 12];
const NEW_LEN = 3;
const CLEANUP = 1;

export function runShutdown(inflight: number[], arrivals: number[], mode: Mode, grace: number) {
  const rows: Row[] = [];
  inflight.forEach((rem, i) => {
    const label = `#${i + 1} (${rem}s left)`;
    if (mode === "exit") rows.push({ label, start: 0, until: 0, status: "cut" });
    else if (rem <= grace) rows.push({ label, start: 0, until: rem, status: "ok" });
    else rows.push({ label, start: 0, until: grace, status: "cut" });
  });
  arrivals.forEach((at) => {
    const label = `new @${at}s`;
    if (mode === "drain") rows.push({ label, start: at, until: at, status: "rerouted" });
    else if (mode === "exit") rows.push({ label, start: at, until: at, status: "refused" });
    else if (at >= grace) rows.push({ label, start: at, until: at, status: "refused" });
    else if (at + NEW_LEN <= grace) rows.push({ label, start: at, until: at + NEW_LEN, status: "ok" });
    else rows.push({ label, start: at, until: grace, status: "cut" });
  });
  const cut = rows.filter((r) => r.status === "cut").length;
  const refused = rows.filter((r) => r.status === "refused").length;
  const completed = rows.filter((r) => r.status === "ok").length;
  let exitAt: number;
  let killed: boolean;
  if (mode === "exit") {
    exitAt = 0;
    killed = false;
  } else if (mode === "ignore") {
    exitAt = grace;
    killed = true;
  } else {
    const drained = Math.max(0, ...rows.filter((r) => r.status === "ok").map((r) => r.until));
    const fits = cut === 0 && drained + CLEANUP <= grace;
    exitAt = fits ? drained + CLEANUP : grace;
    killed = !fits;
  }
  return { rows, cut, refused, completed, exitAt, killed, clean: mode === "drain" && cut === 0 && !killed };
}

const MODES: { id: Mode; label: string }[] = [
  { id: "exit", label: "Die at once" },
  { id: "ignore", label: "Ignore it" },
  { id: "drain", label: "Drain, then exit" },
];

export function Shutdown({ props, onChange, revealed }: WidgetProps<ShutdownProps>) {
  const inflight = props.inflight ?? DEFAULT_INFLIGHT;
  const arrivals = props.arrivals ?? DEFAULT_ARRIVALS;
  const [mode, setMode] = useState<Mode>(props.mode ?? "exit");
  const [grace, setGrace] = useState(props.grace ?? 10);
  const out = runShutdown(inflight, arrivals, mode, grace);
  const span = Math.max(grace + 4, Math.max(...inflight) + 4, 20);
  const pct = (t: number) => `${Math.min(100, (t / span) * 100)}%`;
  useReport(onChange, { mode, grace, completed: out.completed, cut: out.cut, refused: out.refused, killed: out.killed, exitAt: out.exitAt, clean: out.clean } satisfies ShutdownState, `${mode}|${grace}`);

  const LABEL = "6.75rem";
  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-end justify-center gap-x-4 gap-y-1">
        {!props.lockMode && <Segmented label="What the program does with SIGTERM" value={mode} disabled={revealed} onChange={setMode} options={MODES} />}
      </div>
      <div className="mt-2 max-w-sm">
        <Slider label="Grace period before SIGKILL" value={grace} min={5} max={30} step={1} format={(v) => `${v}s`} onChange={setGrace} disabled={revealed || mode === "exit"} />
      </div>

      <div className="mt-2 rounded-xl border border-line bg-surface p-3">
        <Caption>Seconds after SIGTERM</Caption>
        <div className="relative mt-2">
          {/* markers drawn over the bar tracks */}
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10" style={{ left: `calc(${LABEL} + 0.5rem)` }}>
            <div className="absolute inset-y-0 w-px bg-ink-3" style={{ left: "0%" }} />
            {mode !== "exit" && (
              <div className="absolute inset-y-0 w-0.5 bg-[var(--bad)]" style={{ left: pct(grace) }}>
                <span className="absolute -top-0.5 left-1 flex items-center gap-0.5 whitespace-nowrap rounded bg-[var(--bad)] px-1 font-mono text-[9.5px] font-bold text-white">
                  <Skull className="h-2.5 w-2.5" /> KILL
                </span>
              </div>
            )}
            {mode !== "ignore" && !(out.killed && mode === "drain") && (
              <div className="absolute inset-y-0 w-px border-l border-dashed border-ink" style={{ left: pct(out.exitAt) }}>
                <span className="absolute bottom-0 left-1 whitespace-nowrap rounded bg-surface px-1 font-mono text-[9.5px] font-semibold text-ink ring-1 ring-[var(--line-strong)]">exit</span>
              </div>
            )}
          </div>
          <div className="grid gap-1.5 pt-3">
            {out.rows.map((r) => (
              <div key={r.label} className="flex items-center gap-2">
                <span className="shrink-0 truncate font-mono text-[11px] text-ink-2" style={{ width: LABEL }}>
                  {r.label}
                </span>
                <div className="relative h-5 flex-1 rounded bg-surface-2">
                  {r.status === "ok" && <div className="absolute inset-y-0 rounded bg-primary" style={{ left: pct(r.start), width: pct(r.until - r.start) }} />}
                  {r.status === "cut" && (
                    <>
                      <div className="absolute inset-y-0 rounded-l bg-[var(--bad)]/70" style={{ left: pct(r.start), width: pct(Math.max(r.until - r.start, 0.5)) }} />
                      <span className="absolute -translate-x-1/2 text-[11px] font-bold leading-5 text-bad" style={{ left: pct(r.until) }}>✕</span>
                    </>
                  )}
                  {r.status === "refused" && <span className="absolute -translate-x-1/2 text-[11px] font-bold leading-5 text-bad" style={{ left: pct(r.start) }}>✕</span>}
                  {r.status === "rerouted" && <span className="absolute whitespace-nowrap pl-1 text-[10.5px] leading-5 text-ink-3" style={{ left: pct(r.start) }}>→ sent to another pod</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" aria-live="polite">
        <Readout label="Finished" value={out.completed} accent={out.clean} />
        <Readout label="Cut off" value={out.cut} />
        {out.refused > 0 && <Readout label="Refused" value={out.refused} />}
        <Readout label="Process ended" value={`${out.exitAt}s${out.killed ? " (SIGKILL)" : ""}`} />
      </div>
      <Note tone={out.clean ? "good" : out.cut + out.refused > 0 ? "bad" : "neutral"} className="mt-2">
        {mode === "exit"
          ? "The default reaction to SIGTERM is to end the process immediately, so every request in flight is dropped and every request sent here afterwards is refused."
          : mode === "ignore"
            ? "The program never reacts, so it keeps accepting new work all the way to the grace deadline. Then SIGKILL cuts off whatever is still running, however fresh it is."
            : out.clean
              ? `It stopped taking new work, finished all ${out.completed} requests, closed its connections and exited at ${out.exitAt}s, before the deadline.`
              : out.cut > 0
                ? `${out.cut} request${out.cut === 1 ? " was" : "s were"} still running when the grace period ended, so SIGKILL cut ${out.cut === 1 ? "it" : "them"} off. The grace period is shorter than your slowest request.`
                : `Every request finished, but the deadline hit before the program had closed its connections. Give cleanup room inside the grace period.`}
      </Note>
    </div>
  );
}

/** goal: { clean: true } or { maxCut: 0, mode: "ignore" } */
export function checkShutdown(state: unknown, goal: Record<string, unknown>) {
  const s = state as ShutdownState | undefined;
  if (!s) return false;
  if (typeof goal.clean === "boolean" && s.clean !== goal.clean) return false;
  if (typeof goal.maxCut === "number" && s.cut > goal.maxCut) return false;
  if (typeof goal.minCut === "number" && s.cut < goal.minCut) return false;
  if (typeof goal.mode === "string" && s.mode !== goal.mode) return false;
  if (typeof goal.maxGrace === "number" && s.grace > goal.maxGrace) return false;
  return ["clean", "maxCut", "minCut", "mode", "maxGrace"].some((k) => k in goal);
}

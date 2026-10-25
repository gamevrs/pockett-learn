"use client";

import React, { useMemo, useState } from "react";
import { Cpu, FastForward, HardDrive, RotateCcw, StepForward } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";

export interface SchedProc {
  name: string;
  /** Ticks of CPU time it needs in total. */
  work: number;
  /** Tick it starts at (default 0). */
  arrive?: number;
  /** After running `after` ticks it waits `for` ticks for the disk (once). */
  io?: { after: number; for: number };
}

export interface SchedulerProps {
  procs?: SchedProc[];
  /** Time slice in ticks, or "all" (run each process until it finishes or waits). Default 2. */
  quantum?: number | "all";
  /** Slice options to offer as a switch. Default: none (fixed). */
  quanta?: (number | "all")[];
}

export interface SchedulerState {
  t: number;
  total: number;
  quantum: number | "all";
  done: string[];
  finishedAt: Record<string, number>;
  switches: number;
}

type PState = "new" | "ready" | "running" | "waiting" | "done";
interface Frame {
  running: string | null;
  states: Record<string, PState>;
  queue: string[];
  waiting: { name: string; left: number }[];
  note: string;
  switched: boolean;
  finished: string[];
}

const DEFAULT_PROCS: SchedProc[] = [
  { name: "editor", work: 3 },
  { name: "music", work: 4, io: { after: 2, for: 2 } },
  { name: "download", work: 5 },
];

/** Round-robin scheduling, tick by tick. Each frame says who used the CPU during that tick. */
export function simulate(procs: SchedProc[], quantum: number | "all"): Frame[] {
  const rem: Record<string, number> = {};
  const ran: Record<string, number> = {};
  const blockedOnce = new Set<string>();
  const done = new Set<string>();
  for (const p of procs) {
    rem[p.name] = p.work;
    ran[p.name] = 0;
  }
  const queue: string[] = [];
  let waiting: { name: string; left: number }[] = [];
  let cur: string | null = null;
  let slice = 0;
  let prev: string | null = null;
  const frames: Frame[] = [];
  const q = quantum === "all" ? Infinity : Math.max(1, quantum);
  for (let t = 0; t < 120 && done.size < procs.length; t++) {
    const notes: string[] = [];
    for (const p of procs) if ((p.arrive ?? 0) === t) queue.push(p.name);
    if (cur && slice >= q) {
      if (queue.length) {
        notes.push(`${cur}'s time slice is up, so it goes to the back of the queue.`);
        queue.push(cur);
        cur = null;
      } else {
        notes.push(`Nobody else is ready, so ${cur} gets another slice.`);
        slice = 0;
      }
    }
    if (!cur && queue.length) {
      cur = queue.shift() ?? null;
      slice = 0;
    }
    const switched = cur !== null && prev !== null && cur !== prev;
    if (cur && cur !== prev) notes.push(`${cur} gets the CPU.`);
    if (!cur) notes.push("Nothing is ready: the CPU sits idle.");
    const states: Record<string, PState> = {};
    for (const p of procs) {
      const n = p.name;
      states[n] = done.has(n) ? "done" : n === cur ? "running" : queue.includes(n) ? "ready" : waiting.some((w) => w.name === n) ? "waiting" : "new";
    }
    const frame: Frame = { running: cur, states, queue: [...queue], waiting: waiting.map((w) => ({ ...w })), note: "", switched, finished: [] };
    // run one tick
    if (cur) {
      rem[cur]--;
      ran[cur]++;
      slice++;
    }
    const woke: string[] = [];
    waiting = waiting.map((w) => ({ ...w, left: w.left - 1 })).filter((w) => {
      if (w.left > 0) return true;
      woke.push(w.name);
      return false;
    });
    if (cur) {
      const p = procs.find((x) => x.name === cur);
      if (rem[cur] <= 0) {
        done.add(cur);
        frame.finished.push(cur);
        notes.push(`${cur} finishes.`);
        cur = null;
      } else if (p?.io && !blockedOnce.has(cur) && ran[cur] === p.io.after) {
        blockedOnce.add(cur);
        waiting.push({ name: cur, left: p.io.for });
        notes.push(`${cur} asks for the disk and waits; the CPU moves on.`);
        cur = null;
      }
    }
    for (const w of woke) {
      queue.push(w);
      notes.push(`The disk answers: ${w} is ready again.`);
    }
    prev = frame.running;
    if (!notes.length && frame.running) notes.push(`${frame.running} keeps the CPU: its time slice isn't used up yet.`);
    frame.note = notes.join(" ");
    frames.push(frame);
  }
  return frames;
}

const label = (q: number | "all") => (q === "all" ? "Run to finish" : `${q} tick${q === 1 ? "" : "s"}`);

/** Processes taking turns on one CPU in time slices: running, ready (in the queue) and waiting (for the disk). */
export function Scheduler({ props, onChange, revealed }: WidgetProps<SchedulerProps>) {
  const procs = props.procs ?? DEFAULT_PROCS;
  const [quantum, setQuantum] = useState<number | "all">(props.quantum ?? 2);
  const [t, setT] = useState(0);
  const frames = useMemo(() => simulate(procs, quantum), [procs, quantum]);
  const total = frames.length;

  const stateAt = (tt: number, q: number | "all"): SchedulerState => {
    const fr = q === quantum ? frames : simulate(procs, q);
    const finishedAt: Record<string, number> = {};
    fr.slice(0, tt).forEach((f, i) => f.finished.forEach((n) => (finishedAt[n] = i + 1)));
    return {
      t: tt,
      total: fr.length,
      quantum: q,
      done: Object.keys(finishedAt),
      finishedAt,
      switches: fr.slice(0, tt).filter((f) => f.switched).length,
    };
  };
  const go = (tt: number) => {
    setT(tt);
    onChange?.(stateAt(tt, quantum));
  };
  const pickQuantum = (q: number | "all") => {
    setQuantum(q);
    setT(0);
    onChange?.(stateAt(0, q));
  };

  const last = t > 0 ? frames[t - 1] : null;
  const next = t < total ? frames[t] : null;
  const shownQueue = last ? last.queue : next ? [...(next.running ? [next.running] : []), ...next.queue] : [];
  const finishedAt: Record<string, number> = {};
  frames.slice(0, t).forEach((f, i) => f.finished.forEach((n) => (finishedAt[n] = i + 1)));
  const switches = frames.slice(0, t).filter((f) => f.switched).length;
  const options = props.quanta ?? [];

  return (
    <div className="w-full min-w-0">
      {options.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-ink-3">Time slice</span>
          <div role="radiogroup" aria-label="Time slice" className="inline-flex rounded-full border border-line bg-surface-2 p-0.5">
            {options.map((o) => (
              <button
                key={String(o)}
                type="button"
                role="radio"
                aria-checked={o === quantum}
                disabled={revealed}
                onClick={() => pickQuantum(o)}
                className={`min-h-10 rounded-full px-3.5 text-xs font-medium transition-colors sm:text-[0.8rem] ${o === quantum ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)]" : "text-ink-3 hover:text-ink"}`}
              >
                {label(o)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CPU, queue, waiting */}
      <div className="grid gap-2 sm:grid-cols-[1fr_1.3fr_1fr]">
        <div className={`rounded-xl border p-3 ${last?.running ? "border-[var(--brand)]/50 bg-tint" : "border-line bg-surface-2"}`}>
          <p className="flex items-center gap-1.5 text-xs font-medium text-ink-3">
            <Cpu className="h-3.5 w-3.5" aria-hidden /> CPU {t > 0 && <span className="font-mono">· tick {t}</span>}
          </p>
          <p className="mt-1.5 font-mono text-base font-semibold text-ink">{last ? last.running ?? "idle" : "not started"}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <p className="text-xs font-medium text-ink-3">Ready queue (next in line first)</p>
          <div className="mt-1.5 flex min-h-7 flex-wrap gap-1">
            {shownQueue.length ? (
              shownQueue.map((n, i) => (
                <span key={n} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[12px] text-ink">
                  <span className="text-[10px] text-ink-3">{i + 1}</span>
                  {n}
                </span>
              ))
            ) : (
              <span className="text-xs text-ink-3">empty</span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-ink-3">
            <HardDrive className="h-3.5 w-3.5" aria-hidden /> Waiting for the disk
          </p>
          <div className="mt-1.5 flex min-h-7 flex-wrap gap-1">
            {last && last.waiting.length > 0 ? (
              last.waiting.map((w) => (
                <span key={w.name} className="rounded-full border border-[#38bdf8]/40 bg-[#38bdf8]/10 px-2 py-0.5 font-mono text-[12px] text-ink">
                  {w.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-ink-3">nobody</span>
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 min-h-10 text-center text-sm text-ink-2" aria-live="polite">
        {t === 0 ? "Press Step to give the CPU to the first process in the queue." : last?.note}
        {t === total && t > 0 && <span className="font-medium text-ink"> All done after {total} ticks, with {switches} switch{switches === 1 ? "" : "es"} between processes.</span>}
      </p>

      {/* timeline */}
      <div className="mt-2 overflow-x-auto rounded-xl border border-line bg-surface p-2.5">
        <div className="grid min-w-[16rem] gap-1" style={{ gridTemplateColumns: `4.75rem repeat(${total}, minmax(0.6rem, 1fr)) 2.75rem` }}>
          <span />
          {frames.map((_, i) => (
            <span key={i} className={`text-center font-mono text-[9.5px] tabular-nums ${i === t - 1 ? "font-bold text-brand" : i < t ? "text-ink-2" : "text-ink-3/60"}`}>
              {i + 1}
            </span>
          ))}
          <span className="text-right text-[9.5px] text-ink-3">done</span>
          {procs.map((p) => (
            <React.Fragment key={p.name}>
              <span className="truncate font-mono text-[12px] leading-6 text-ink">{p.name}</span>
              {frames.map((f, i) => {
                const st = i < t ? f.states[p.name] : null;
                const cls =
                  st === "running"
                    ? "bg-primary"
                    : st === "ready"
                      ? "bg-surface-2 ring-1 ring-inset ring-[var(--line-strong)]"
                      : st === "waiting"
                        ? "bg-[repeating-linear-gradient(135deg,rgba(56,189,248,0.45)_0_3px,transparent_3px_6px)] ring-1 ring-inset ring-[#38bdf8]/40"
                        : i >= t
                          ? "bg-surface-2/60"
                          : "";
                return <span key={i} className={`h-6 rounded-[4px] ${cls}`} title={st ? `tick ${i + 1}: ${st}` : undefined} />;
              })}
              <span className="text-right font-mono text-[12px] leading-6 tabular-nums text-ink-2">{finishedAt[p.name] ?? ""}</span>
            </React.Fragment>
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-ink-3">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-primary" /> running</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-surface-2 ring-1 ring-inset ring-[var(--line-strong)]" /> ready, waiting its turn</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-[repeating-linear-gradient(135deg,rgba(56,189,248,0.45)_0_3px,transparent_3px_6px)] ring-1 ring-inset ring-[#38bdf8]/40" /> waiting for the disk</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button type="button" className="btn btn-primary !h-11 !px-5" onClick={() => go(Math.min(total, t + 1))} disabled={t >= total || revealed}>
          <StepForward className="h-4 w-4" /> Step
        </button>
        <button type="button" className="btn !h-11" onClick={() => go(total)} disabled={t >= total || revealed}>
          <FastForward className="h-4 w-4" /> To the end
        </button>
        <button type="button" className="btn btn-ghost !h-11 !w-11 !p-0" onClick={() => go(0)} disabled={t === 0 || revealed} aria-label="Reset" title="Reset">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** goal: { allDone: true }, { done: ["editor"] }, { quantum: 1 | "all" }, { t: 4 }. */
export function checkScheduler(state: unknown, goal: Record<string, unknown>) {
  const s = state as SchedulerState | undefined;
  if (!s) return false;
  if (goal.allDone === true && s.t < s.total) return false;
  if (Array.isArray(goal.done) && !goal.done.every((n) => s.done.includes(n as string))) return false;
  if (goal.quantum !== undefined && s.quantum !== goal.quantum) return false;
  if (typeof goal.t === "number" && s.t !== goal.t) return false;
  return ["allDone", "done", "quantum", "t"].some((k) => k in goal);
}

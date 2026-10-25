"use client";

import React, { useState } from "react";
import { FileCode, Play, Plus, X } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";

export interface ProcsProps {
  /** Program files on disk that can be started. Default: editor and music. */
  programs?: string[];
  /** Most processes at once. Default 6. */
  max?: number;
  /** Show the per-process counter (to show each process has its own memory). Default true. */
  counter?: boolean;
}

interface P {
  pid: number;
  prog: string;
  count: number;
}

export interface ProcsState {
  running: number;
  byProgram: Record<string, number>;
  /** Some program has two processes whose counters differ. */
  separate: boolean;
}

const GAPS = [3, 5, 2, 7, 4, 6, 3, 8];

/** One program file, many running processes: start them, see their PIDs, poke their private memory, quit them. */
export function Procs({ props, onChange }: WidgetProps<ProcsProps>) {
  const programs = props.programs ?? ["editor", "music"];
  const max = props.max ?? 6;
  const counter = props.counter ?? true;
  const [procs, setProcs] = useState<P[]>([]);
  const [nextPid, setNextPid] = useState({ pid: 4102, i: 0 });

  const report = (list: P[]) => {
    const byProgram: Record<string, number> = {};
    for (const p of list) byProgram[p.prog] = (byProgram[p.prog] ?? 0) + 1;
    const separate = programs.some((prog) => new Set(list.filter((p) => p.prog === prog).map((p) => p.count)).size > 1);
    onChange?.({ running: list.length, byProgram, separate } satisfies ProcsState);
  };
  const update = (list: P[]) => {
    setProcs(list);
    report(list);
  };

  const start = (prog: string) => {
    if (procs.length >= max) return;
    update([...procs, { pid: nextPid.pid, prog, count: 0 }]);
    setNextPid({ pid: nextPid.pid + GAPS[nextPid.i % GAPS.length], i: nextPid.i + 1 });
  };

  return (
    <div className="w-full min-w-0">
      <p className="text-xs font-medium text-ink-3">On the disk: program files</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {programs.map((prog) => (
          <div key={prog} className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 py-1.5 pl-3 pr-1.5">
            <FileCode className="h-4 w-4 text-ink-3" aria-hidden />
            <span className="font-mono text-sm text-ink">/usr/bin/{prog}</span>
            <button type="button" className="btn btn-primary !h-10 !px-3.5" onClick={() => start(prog)} disabled={procs.length >= max} aria-label={`Run ${prog}`}>
              <Play className="h-3.5 w-3.5" fill="currentColor" /> Run
            </button>
          </div>
        ))}
      </div>

      <p className="mt-5 flex items-baseline justify-between text-xs font-medium text-ink-3">
        <span>In memory: running processes</span>
        <span className="font-mono tabular-nums">
          {programs.length} program{programs.length === 1 ? "" : "s"} · {procs.length} process{procs.length === 1 ? "" : "es"}
        </span>
      </p>
      <div className="mt-2 grid min-h-24 gap-2 sm:grid-cols-2">
        {procs.length === 0 && (
          <p className="grid place-items-center rounded-xl border border-dashed border-line p-4 text-center text-sm text-ink-3 sm:col-span-2">Nothing running yet. Press Run.</p>
        )}
        {procs.map((p) => (
          <div key={p.pid} className="rounded-xl border border-line bg-surface p-3 [animation:pop-in_0.25s_ease-out_both]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-ink">{p.prog}</span>
              <span className="rounded-full bg-tint px-2 py-0.5 font-mono text-[11px] text-ink">PID {p.pid}</span>
              <button
                type="button"
                className="ml-auto grid h-10 w-10 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"
                onClick={() => update(procs.filter((q) => q.pid !== p.pid))}
                aria-label={`Quit ${p.prog} (PID ${p.pid})`}
                title="Quit"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {counter && (
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-[12.5px] text-ink-2">
                  its memory: <span className="text-ink">clicks = {p.count}</span>
                </span>
                <button
                  type="button"
                  className="btn !h-10 ml-auto !px-3 font-mono"
                  onClick={() => update(procs.map((q) => (q.pid === p.pid ? { ...q, count: q.count + 1 } : q)))}
                  aria-label={`Add one to ${p.prog} ${p.pid}`}
                >
                  <Plus className="h-3.5 w-3.5" /> 1
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** goal: { byProgram: { editor: 2 } } (exact counts), { running: 3 }, { separate: true }. */
export function checkProcs(state: unknown, goal: Record<string, unknown>) {
  const s = state as ProcsState | undefined;
  if (!s) return false;
  if (goal.byProgram && Object.entries(goal.byProgram as Record<string, number>).some(([k, v]) => (s.byProgram[k] ?? 0) !== v)) return false;
  if (typeof goal.running === "number" && s.running !== goal.running) return false;
  if (goal.separate === true && !s.separate) return false;
  return ["byProgram", "running", "separate"].some((k) => k in goal);
}

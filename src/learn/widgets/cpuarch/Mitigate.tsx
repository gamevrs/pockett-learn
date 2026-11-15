"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout } from "../computer/ui";
import { MITIGATIONS, THREATS, mitigationRun, type MitigationId, type ThreatId, type WorkloadId } from "./isa";

export interface MitigateProps {
  /** Which machine the costs are for. Fixed per step. Default "server". */
  workload?: WorkloadId;
  /** Threats this machine must be protected against (shown as "required"). Default all but cross-thread. */
  required?: ThreatId[];
}

export interface MitigateState {
  on: MitigationId[];
  closed: ThreatId[];
  overhead: number;
}

const WORKLOAD: Record<WorkloadId, string> = {
  server: "A web server that makes many system calls",
  compute: "A number-crunching job that rarely enters the kernel",
};

/** Pick mitigations for speculative-execution leaks and see which leaks they close and what they cost (toy numbers). */
export function Mitigate({ props, onChange }: WidgetProps<MitigateProps>) {
  const workload = props.workload ?? "server";
  const required = props.required ?? (["meltdown", "spectre-v1", "spectre-v2"] as ThreatId[]);
  const [on, setOn] = useState<MitigationId[]>([]);
  const r = mitigationRun(on, workload);
  const toggle = (id: MitigationId) => {
    const next = on.includes(id) ? on.filter((x) => x !== id) : [...on, id];
    setOn(next);
    const x = mitigationRun(next, workload);
    onChange?.({ on: x.on, closed: x.closed, overhead: x.overhead } satisfies MitigateState);
  };

  return (
    <div className="w-full">
      <p className="text-sm text-ink-2">
        Machine: <b className="text-ink">{WORKLOAD[workload]}</b>
      </p>
      <Caption className="mb-1 mt-3">Mitigations</Caption>
      <div className="flex flex-col gap-1.5">
        {MITIGATIONS.map((m) => {
          const pressed = on.includes(m.id);
          const idle = pressed && m.needs && !on.includes(m.needs);
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={pressed}
              onClick={() => toggle(m.id)}
              className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                pressed ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink hover:bg-surface-2"
              }`}
            >
              <span className="min-w-0 break-words">{m.label}</span>
              <span className="shrink-0 font-mono text-xs">{idle ? "needs KPTI" : pressed ? "on" : "off"}</span>
            </button>
          );
        })}
      </div>
      <Caption className="mb-1 mt-3">Leaks</Caption>
      <ul className="flex flex-col gap-1 text-sm">
        {THREATS.map((t) => {
          const closed = r.closed.includes(t.id);
          const need = required.includes(t.id);
          return (
            <li key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface-2 px-3 py-1.5">
              <span className="min-w-0 break-words text-ink">
                {t.label}
                {need && <span className="text-ink-3"> · required</span>}
              </span>
              <span className={`shrink-0 font-mono text-xs font-semibold ${closed ? "text-ink" : "text-ink-3"}`}>{closed ? "closed" : "open"}</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Slowdown" value={`${r.overhead}%`} accent />
        <Readout label="Required leaks closed" value={`${required.filter((t) => r.closed.includes(t)).length} of ${required.length}`} />
      </div>
      <div className="mt-3">
        <Note>Toy costs with a realistic shape, not measurements. Real overheads depend on the chip, its microcode, the kernel and the workload, and newer chips fix some of these leaks in hardware.</Note>
      </div>
    </div>
  );
}

/** goal: { closes: ThreatId[], maxOverhead: number }. */
export function checkMitigate(state: unknown, goal: Record<string, unknown>) {
  const s = state as MitigateState | undefined;
  if (!s) return false;
  if (Array.isArray(goal.closes) && !goal.closes.every((t) => s.closed.includes(t as ThreatId))) return false;
  if (typeof goal.maxOverhead === "number" && s.overhead > goal.maxOverhead) return false;
  return true;
}

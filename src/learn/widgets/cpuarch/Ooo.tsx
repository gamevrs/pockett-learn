"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Note, Readout, Seg } from "../computer/ui";
import { CycleGrid } from "./CycleGrid";
import { scheduleIssue, type OooIns } from "./sim";

export interface OooProps {
  /** The code: each instruction has a latency (cycles to produce its result) and the earlier instructions it needs. */
  program: OooIns[];
  /** Widths on offer. Default 1, 2, 4. */
  widths?: number[];
  /** Let the learner switch between in-order and out-of-order. Default true. */
  chooseOrder?: boolean;
  /** Start out of order? Default false. */
  outOfOrder?: boolean;
}

export interface OooState {
  width: number;
  outOfOrder: boolean;
  total: number;
  ipc: number;
}

/** A tiny instruction scheduler: how many cycles does this code take at issue width 1, 2 or 4, in order or out of order? */
export function Ooo({ props, onChange }: WidgetProps<OooProps>) {
  const widths = props.widths ?? [1, 2, 4];
  const [width, setWidth] = useState(widths[0]);
  const [ooo, setOoo] = useState(Boolean(props.outOfOrder));
  const choose = props.chooseOrder ?? true;
  const ins = props.program;

  const r = scheduleIssue(ins, width, ooo);
  const report = (w: number, o: boolean) => {
    const x = scheduleIssue(ins, w, o);
    onChange?.({ width: w, outOfOrder: o, total: x.total, ipc: ins.length / x.total } satisfies OooState);
  };
  const cols = r.total;

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-3">
        <Seg
          label="Issue width"
          value={width}
          onChange={(w) => {
            setWidth(w);
            report(w, ooo);
          }}
          options={widths.map((w) => ({ value: w, label: w === 1 ? "1 at a time" : `${w} at a time` }))}
        />
        {choose && (
          <Seg
            label="Order"
            value={ooo ? "ooo" : "in"}
            onChange={(v) => {
              setOoo(v === "ooo");
              report(width, v === "ooo");
            }}
            options={[
              { value: "in", label: "In order" },
              { value: "ooo", label: "Out of order" },
            ]}
          />
        )}
      </div>

      <CycleGrid
        label="Schedule, instructions by cycle"
        cols={cols}
        rows={ins.map((x, i) => ({
          label: x.text,
          sub: x.deps.length ? `needs ${x.deps.map((d) => ins[d].text.split(" ")[0]).join(", ")}` : "needs nothing",
          cells: Array.from({ length: cols }, (_, c) => {
            const cyc = c + 1;
            const running = cyc >= r.issue[i] && cyc < r.done[i];
            const first = cyc === r.issue[i];
            return {
              long: running ? (first ? "go" : "…") : "",
              short: running ? (first ? "g" : "·") : "",
              cls: running ? (first ? "border-transparent bg-primary text-primary-ink" : "border-line bg-tint text-ink") : "border-transparent",
            };
          }),
        }))}
      />
      <p className="mt-1 text-xs text-ink-3">&quot;go&quot; (g) is the cycle an instruction starts; &quot;…&quot; (·) is it still working. Rows are in program order.</p>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Total cycles" value={r.total} accent />
        <Readout label="Instructions per cycle" value={(ins.length / r.total).toFixed(2)} />
      </div>
      <div className="mt-3">
        <Note>
          {ooo
            ? "Out of order: the CPU looks ahead and starts any instruction whose inputs are ready, even if an earlier one is still waiting."
            : "In order: an instruction cannot start until every instruction before it has started, so one slow instruction holds up all the rest."}
        </Note>
      </div>
    </div>
  );
}

/** goal: { maxCycles, width, outOfOrder }. */
export function checkOoo(state: unknown, goal: Record<string, unknown>) {
  const s = state as OooState | undefined;
  if (!s) return false;
  if (typeof goal.maxCycles === "number" && s.total > goal.maxCycles) return false;
  if (typeof goal.minCycles === "number" && s.total < goal.minCycles) return false;
  if (typeof goal.width === "number" && s.width !== goal.width) return false;
  if (typeof goal.outOfOrder === "boolean" && s.outOfOrder !== goal.outOfOrder) return false;
  return true;
}

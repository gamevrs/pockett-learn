"use client";

import React, { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Seg } from "../computer/ui";
import { canSwap, idealCycles, schedulePipeline, STAGES, unpipelinedCycles, type Cell, type PipeIns } from "./sim";

export interface PipelineProps {
  /** The instructions. kind is alu / load / store / branch; dst and src are register numbers. */
  program: PipeIns[];
  /** Offer the "one at a time / pipelined" switch. Default false (always pipelined). */
  overlap?: boolean;
  /** Offer the forwarding switch: true = shown (starts off), "on" = shown and starts on, false = hidden and off. */
  forwarding?: boolean | "on";
  /** Fetching waits after each branch until its outcome is known. */
  branchStall?: boolean;
  /** Let the learner swap neighbouring instructions that do not depend on each other. */
  reorder?: boolean;
}

export interface PipelineState {
  total: number;
  ideal: number;
  stallCycles: number;
  bubbles: number;
  forwarding: boolean;
  pipelined: boolean;
  order: string[];
}

const cellCls = (c: Cell | null) =>
  !c
    ? "border-transparent"
    : c.stall
      ? "border-dashed border-[var(--line-strong)] bg-surface text-ink-3"
      : c.label === "EX"
        ? "border-transparent bg-primary text-primary-ink"
        : "border-line bg-tint text-ink";

/** Instructions down the side, cycles across the top: watch a 5-stage pipeline overlap work, stall and use forwarding. */
export function Pipeline({ props, onChange }: WidgetProps<PipelineProps>) {
  const [ins, setIns] = useState<PipeIns[]>(props.program);
  const [fwd, setFwd] = useState(props.forwarding === "on");
  const [pipelined, setPipelined] = useState(true);
  const showFwd = props.forwarding === true || props.forwarding === "on";

  const compute = (list: PipeIns[], f: boolean, p: boolean) => {
    if (!p) {
      const rows: (Cell | null)[][] = list.map((_, i) =>
        Array.from({ length: unpipelinedCycles(list.length) }, (_x, c) => (c >= i * 5 && c < i * 5 + 5 ? { label: STAGES[c - i * 5] } : null)),
      );
      return { rows, total: unpipelinedCycles(list.length), stalls: list.map(() => 0), branchBubbles: 0 };
    }
    return schedulePipeline(list, { forwarding: f, branchStall: props.branchStall });
  };
  const res = compute(ins, fwd, pipelined);
  const report = (list: PipeIns[], f: boolean, p: boolean) => {
    const r = compute(list, f, p);
    onChange?.({
      total: r.total,
      ideal: idealCycles(list.length),
      stallCycles: r.stalls.reduce((a, b) => a + b, 0),
      bubbles: r.branchBubbles,
      forwarding: f,
      pipelined: p,
      order: list.map((x) => x.text),
    } satisfies PipelineState);
  };

  const swap = (i: number) => {
    const next = ins.slice();
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    setIns(next);
    report(next, fwd, pipelined);
  };
  const stallSum = res.stalls.reduce((a, b) => a + b, 0);
  const cols = res.total;

  return (
    <div className="w-full">
      {(props.overlap || showFwd) && (
        <div className="mb-3 flex flex-wrap items-center justify-center gap-3">
          {props.overlap && (
            <Seg
              label="Execution style"
              value={pipelined ? "pipe" : "one"}
              onChange={(v) => {
                setPipelined(v === "pipe");
                report(ins, fwd, v === "pipe");
              }}
              options={[
                { value: "one", label: "One at a time" },
                { value: "pipe", label: "Pipelined" },
              ]}
            />
          )}
          {showFwd && pipelined && (
            <Seg
              label="Forwarding"
              value={fwd ? "on" : "off"}
              onChange={(v) => {
                setFwd(v === "on");
                report(ins, v === "on", pipelined);
              }}
              options={[
                { value: "off", label: "Forwarding off" },
                { value: "on", label: "Forwarding on" },
              ]}
            />
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-line bg-surface-2 p-2" tabIndex={0} aria-label="Pipeline diagram, instructions by cycle">
        <table className="border-separate border-spacing-x-0.5 border-spacing-y-1 font-mono text-[11px]" style={{ minWidth: `${6.6 + cols * 2.5}rem` }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface-2 pr-1 text-left font-medium text-ink-3">
                <Caption>Cycle</Caption>
              </th>
              {Array.from({ length: cols }, (_, c) => (
                <th key={c} className="w-10 min-w-10 text-center font-medium text-ink-3">
                  {c + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ins.map((x, i) => (
              <tr key={`${x.text}-${i}`}>
                <td className="sticky left-0 z-10 bg-surface-2 pr-1">
                  <div className="flex items-center gap-1">
                    <span className="w-[5.4rem] shrink-0 truncate text-[12px] text-ink" title={x.text}>
                      {x.text}
                    </span>
                    {props.reorder && (
                      <span className="flex gap-0.5">
                        <button
                          type="button"
                          className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface text-ink-2 disabled:opacity-30"
                          disabled={i === 0 || !canSwap(ins, i - 1)}
                          onClick={() => swap(i - 1)}
                          aria-label={`Move ${x.text} up`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface text-ink-2 disabled:opacity-30"
                          disabled={i === ins.length - 1 || !canSwap(ins, i)}
                          onClick={() => swap(i)}
                          aria-label={`Move ${x.text} down`}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </span>
                    )}
                  </div>
                </td>
                {res.rows[i].map((c, k) => (
                  <td key={k} className={`h-10 w-10 min-w-10 rounded-md border text-center ${cellCls(c)}`}>
                    {c ? (c.stall ? "wait" : c.label) : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-ink-3">IF fetch · ID decode · EX execute · MEM memory · WB write back</p>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Total cycles" value={res.total} accent />
        <Readout label="Ideal" value={pipelined ? idealCycles(ins.length) : unpipelinedCycles(ins.length)} />
        {pipelined && <Readout label="Stall cycles" value={stallSum + res.branchBubbles} />}
      </div>
      {props.reorder && (
        <div className="mt-3">
          <Note>Arrows swap neighbours only when it is safe: an instruction may not jump over one it depends on.</Note>
        </div>
      )}
    </div>
  );
}

/** goal: { maxCycles } (finish in at most this many), { forwarding: true }, { pipelined: true }, { minCycles }. */
export function checkPipeline(state: unknown, goal: Record<string, unknown>) {
  const s = state as PipelineState | undefined;
  if (!s) return false;
  if (typeof goal.maxCycles === "number" && s.total > goal.maxCycles) return false;
  if (typeof goal.minCycles === "number" && s.total < goal.minCycles) return false;
  if (typeof goal.forwarding === "boolean" && s.forwarding !== goal.forwarding) return false;
  if (typeof goal.pipelined === "boolean" && s.pipelined !== goal.pipelined) return false;
  return true;
}

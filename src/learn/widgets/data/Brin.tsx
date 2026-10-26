"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Slider } from "../dsa/ui";
import { Choice } from "./ui";

/**
 * A block-range index (BRIN) stores only the smallest and largest value of each block of rows.
 * A query can skip every block whose range can't overlap what it wants. That's tiny and cheap, but
 * only works when the table's physical order follows the column: logs and sensor readings that
 * are appended in time order, not rows that were inserted in random order.
 */

const BLOCKS = 12;
const PER = 5;
const ROWS = BLOCKS * PER;
/** Hours since midnight on day 1; one scan event every 2 hours for 5 days. */
const ts = (pos: number, sorted: boolean) => (sorted ? pos : (pos * 37) % ROWS) * 2;

export interface BrinState {
  sorted: boolean;
  from: number;
  blocksRead: number;
  total: number;
}

function layout(sorted: boolean) {
  return Array.from({ length: BLOCKS }, (_, b) => {
    const values = Array.from({ length: PER }, (_, i) => ts(b * PER + i, sorted));
    return { b, values, min: Math.min(...values), max: Math.max(...values) };
  });
}

export function Brin({ onChange, revealed }: WidgetProps) {
  const [sorted, setSorted] = useState(true);
  const [from, setFrom] = useState(40);
  const to = from + 11;
  const blocks = layout(sorted);
  const read = (s: boolean, f: number) => layout(s).filter((x) => x.min <= f + 11 && x.max >= f).length;
  const report = (s: boolean, f: number) => onChange?.({ sorted: s, from: f, blocksRead: read(s, f), total: BLOCKS } satisfies BrinState);
  const hits = blocks.filter((x) => x.min <= to && x.max >= from);
  const matching = blocks.flatMap((x) => x.values).filter((v) => v >= from && v <= to).length;

  return (
    <div className="w-full min-w-0">
      <Choice
        label="How rows were stored"
        value={sorted ? "sorted" : "shuffled"}
        disabled={revealed}
        onChange={(v) => {
          setSorted(v === "sorted");
          report(v === "sorted", from);
        }}
        options={[{ id: "sorted", label: "Appended in time order" }, { id: "shuffled", label: "Stored in random order" }]}
      />
      <Caption className="mt-4">Query: events between hour {from} and hour {to}</Caption>
      <Slider
        value={from}
        min={0}
        max={108}
        step={2}
        label="Start hour of the query window"
        disabled={revealed}
        onChange={(v) => {
          setFrom(v);
          report(sorted, v);
        }}
      />
      <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {blocks.map((x) => {
          const on = x.min <= to && x.max >= from;
          return (
            <div key={x.b} className={`rounded-lg border px-2 py-1.5 transition-colors ${on ? "border-[var(--brand)] bg-tint" : "border-line bg-surface opacity-60"}`}>
              <div className="flex items-baseline justify-between">
                <span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">block {x.b + 1}</span>
                <span className={`text-[10px] font-medium ${on ? "text-brand" : "text-ink-3"}`}>{on ? "read" : "skipped"}</span>
              </div>
              <p className="mt-0.5 font-mono text-[12px] tabular-nums text-ink">
                {x.min}–{x.max}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Blocks read" value={`${hits.length} of ${BLOCKS}`} accent />
        <Readout label="Matching rows" value={matching} />
      </div>
      <Note tone={hits.length <= 3 ? "good" : "bad"}>
        {sorted
          ? "Rows arrived in time order, so each block covers a tight range of hours and most blocks can be ruled out by looking at two numbers."
          : "Every block now holds a mixture of early and late events, so every block's range overlaps almost any window. The index can skip almost nothing."}
      </Note>
    </div>
  );
}

export function checkBrin(state: unknown, goal: Record<string, unknown>) {
  const s = state as BrinState | undefined;
  if (!s) return false;
  if (typeof goal.sorted === "boolean" && s.sorted !== goal.sorted) return false;
  if (typeof goal.blocksMax === "number" && s.blocksRead > goal.blocksMax) return false;
  if (typeof goal.blocksMin === "number" && s.blocksRead < goal.blocksMin) return false;
  return true;
}

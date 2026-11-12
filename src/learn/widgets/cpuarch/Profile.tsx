"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Note, Readout } from "../computer/ui";

/* ───────────────────────────── performance counters ───────────────────────────── */

export interface Scenario {
  id: string;
  title: string;
  /** What the program does, one line. */
  what: string;
  cycles: number;
  instructions: number;
  branches: number;
  branchMisses: number;
  cacheMisses: number;
}

export interface CountersProps {
  scenarios?: Scenario[];
  /** Show the derived numbers (IPC, miss rates) under the counters. Default true. */
  derived?: boolean;
  /** Add a "this is the slow one" button for the learner to mark one program. */
  pick?: boolean;
}

export const DEFAULT_SCENARIOS: Scenario[] = [
  { id: "sum", title: "Sum an array in order", what: "A loop that adds up 100 million numbers stored one after another.", cycles: 1_200_000_000, instructions: 3_000_000_000, branches: 300_000_000, branchMisses: 100_000, cacheMisses: 2_000_000 },
  { id: "list", title: "Walk a scattered list", what: "Follow pointers through 10 million list nodes spread all over memory.", cycles: 4_000_000_000, instructions: 800_000_000, branches: 160_000_000, branchMisses: 400_000, cacheMisses: 40_000_000 },
  { id: "count", title: "Count big values in shuffled data", what: "if (x >= 128) count++ over 240 million random bytes.", cycles: 2_400_000_000, instructions: 2_400_000_000, branches: 480_000_000, branchMisses: 120_000_000, cacheMisses: 3_000_000 },
];

export interface CountersState {
  viewed: string[];
  picked: string | null;
}

const fmt = (n: number) => n.toLocaleString("en-US");

export const derive = (s: Scenario) => ({
  ipc: s.instructions / s.cycles,
  missRate: s.branchMisses / s.branches,
  cachePerK: (s.cacheMisses / s.instructions) * 1000,
});

/** A perf-stat-style counter printout for a few made-up programs. Read the counters and decide where the cycles go. */
export function Counters({ props, onChange }: WidgetProps<CountersProps>) {
  const scenarios = props.scenarios ?? DEFAULT_SCENARIOS;
  const showDerived = props.derived ?? true;
  const [cur, setCur] = useState(0);
  const [viewed, setViewed] = useState<string[]>([scenarios[0].id]);
  const [picked, setPicked] = useState<string | null>(null);
  const s = scenarios[cur];
  const d = derive(s);

  const emit = (v: string[], p: string | null) => onChange?.({ viewed: v, picked: p } satisfies CountersState);
  const view = (i: number) => {
    const v = viewed.includes(scenarios[i].id) ? viewed : [...viewed, scenarios[i].id];
    setCur(i);
    setViewed(v);
    emit(v, picked);
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Program">
        {scenarios.map((x, i) => (
          <Btn key={x.id} on={i === cur} onClick={() => view(i)}>
            {x.title}
          </Btn>
        ))}
      </div>
      <p className="mt-2 text-sm text-ink-2">{s.what}</p>

      <div className="mt-2 rounded-xl border border-[var(--line-strong)] bg-[#16181d] p-3 font-mono text-[12.5px] leading-relaxed text-[#e6e8ec]" role="group" aria-label="Counter printout">
        <p className="text-[#9aa3b2]">Counters for: {s.title.toLowerCase()}</p>
        {(
          [
            [s.cycles, "cycles", null],
            [s.instructions, "instructions", `${d.ipc.toFixed(2)} insn per cycle`],
            [s.branches, "branches", null],
            [s.branchMisses, "branch-misses", `${(d.missRate * 100).toFixed(2)}% of branches`],
            [s.cacheMisses, "cache-misses", `${d.cachePerK.toFixed(1)} per 1000 instr`],
          ] as [number, string, string | null][]
        ).map(([n, name, note]) => (
          <div key={name} className="mt-0.5">
            <div className="flex items-baseline gap-2">
              <span className="min-w-[6.6rem] text-right tabular-nums">{fmt(n)}</span>
              <span className="min-w-0 break-words">{name}</span>
            </div>
            {showDerived && note && <div className="pl-[7.4rem] text-[#9aa3b2]"># {note}</div>}
          </div>
        ))}
      </div>

      {showDerived && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Readout label="IPC" value={d.ipc.toFixed(2)} accent />
          <Readout label="Branch miss" value={`${(d.missRate * 100).toFixed(2)}%`} />
          <Readout label="Cache misses / 1k instr" value={d.cachePerK.toFixed(1)} />
        </div>
      )}
      {props.pick && (
        <div className="mt-3">
          <Caption className="mb-1">Your call</Caption>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Pick the program">
            {scenarios.map((x) => (
              <Btn
                key={x.id}
                on={picked === x.id}
                onClick={() => {
                  setPicked(x.id);
                  emit(viewed, x.id);
                }}
              >
                Pick: {x.title}
              </Btn>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3">
        <Note>These numbers are made up for teaching, in the style of Linux perf stat. Real runs on your machine will differ.</Note>
      </div>
    </div>
  );
}

/** goal: { picked: "list" } and/or { viewedAll: true }. */
export function checkCounters(state: unknown, goal: Record<string, unknown>) {
  const s = state as CountersState | undefined;
  if (!s) return false;
  if (typeof goal.picked === "string" && s.picked !== goal.picked) return false;
  if (typeof goal.viewedAtLeast === "number" && s.viewed.length < goal.viewedAtLeast) return false;
  return true;
}

/* ───────────────────────────── flame graph ───────────────────────────── */

export interface FlameNode {
  name: string;
  /** Share of all samples (percent) that landed in this function or anything it called. */
  total: number;
  children?: FlameNode[];
}

export interface FlameProps {
  tree?: FlameNode;
  /** Hide the self/total readout until the learner has picked something. Default false. */
  title?: string;
}

export const DEFAULT_TREE: FlameNode = {
  name: "main",
  total: 100,
  children: [
    { name: "load", total: 20 },
    {
      name: "crunch",
      total: 60,
      children: [
        { name: "parse", total: 20 },
        { name: "hash", total: 40, children: [{ name: "sha", total: 30 }] },
      ],
    },
    { name: "save", total: 20 },
  ],
};

interface Laid {
  node: FlameNode;
  depth: number;
  left: number;
  self: number;
}

function layout(node: FlameNode, depth: number, left: number, out: Laid[]) {
  const kids = node.children ?? [];
  const self = node.total - kids.reduce((a, k) => a + k.total, 0);
  out.push({ node, depth, left, self });
  let l = left;
  for (const k of kids) {
    layout(k, depth + 1, l, out);
    l += k.total;
  }
}

export interface FlameState {
  selected: string | null;
  self: number | null;
  total: number | null;
}

/** A sampling-profiler flame graph. Width is the share of samples; height is how deep the call stack was. Click a block. */
export function Flame({ props, onChange }: WidgetProps<FlameProps>) {
  const tree = props.tree ?? DEFAULT_TREE;
  const [sel, setSel] = useState<string | null>(null);
  const laid: Laid[] = [];
  layout(tree, 0, 0, laid);
  const maxDepth = Math.max(...laid.map((l) => l.depth));
  const chosen = laid.find((l) => l.node.name === sel) ?? null;

  const pick = (l: Laid) => {
    setSel(l.node.name);
    onChange?.({ selected: l.node.name, self: l.self, total: l.node.total } satisfies FlameState);
  };

  return (
    <div className="w-full">
      <div className="rounded-xl border border-line bg-surface-2 p-2" role="group" aria-label="Flame graph. Each block is a function. Wider means more samples.">
        <div className="relative" style={{ height: `${(maxDepth + 1) * 44}px` }}>
          {laid.map((l) => (
            <button
              key={l.node.name}
              type="button"
              onClick={() => pick(l)}
              title={`${l.node.name}: ${l.node.total}% total, ${l.self}% own time`}
              aria-label={`${l.node.name}, ${l.node.total} percent of samples including callees`}
              aria-pressed={sel === l.node.name}
              className={`absolute h-10 overflow-hidden rounded-md border px-0.5 text-left font-mono text-[12px] font-medium transition-colors ${
                sel === l.node.name ? "border-transparent bg-primary text-primary-ink" : "border-[var(--line-strong)] bg-tint text-ink hover:bg-surface"
              }`}
              style={{ left: `calc(${l.left}% + 1px)`, width: `calc(${l.node.total}% - 2px)`, bottom: `${l.depth * 44}px` }}
            >
              <span className="block truncate">{l.node.name}</span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-center text-xs text-ink-3">{props.title ?? "Bottom: the first function. Each block above it is a function it called. Width = share of samples."}</p>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Picked" value={chosen ? chosen.node.name : "none yet"} />
        <Readout label="Total (with callees)" value={chosen ? `${chosen.node.total}%` : "-"} />
        <Readout label="Self (own code)" value={chosen ? `${chosen.self}%` : "-"} accent />
      </div>
      <div className="mt-3">
        <Note>{chosen ? `${chosen.node.name} appeared in ${chosen.node.total}% of the samples. Only ${chosen.self}% of the samples were inside its own code; the rest were in functions it called.` : "Tap a block to see its total and self share."}</Note>
      </div>
    </div>
  );
}

/** goal: { selected: "sha" }. */
export function checkFlame(state: unknown, goal: Record<string, unknown>) {
  const s = state as FlameState | undefined;
  if (!s) return false;
  if (typeof goal.selected === "string" && s.selected !== goal.selected) return false;
  return true;
}

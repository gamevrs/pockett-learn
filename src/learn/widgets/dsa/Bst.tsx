"use client";

import React, { useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Readout, Segmented } from "./ui";

/**
 * A binary search tree drawn as it grows. Insert values (smaller goes left, bigger goes right) and
 * watch the shape; search for a value and the path from the root lights up with a step number on
 * each node visited. Inserting in sorted order makes the tree a long, list-like chain.
 */
export interface BstProps {
  /** Values already in the tree, inserted in this order. */
  initial?: number[];
  /** Chips to insert (each one once). */
  values?: number[];
  /** Chips to search for (default: everything in the tree). */
  searchValues?: number[];
  /** Which modes to offer. Default ["insert"]. */
  modes?: ("insert" | "search")[];
  /** Offer a number field too. */
  allowCustom?: boolean;
}

export interface BstState {
  values: number[];
  count: number;
  /** Number of levels: a lone root is 1. */
  levels: number;
  last: { mode: "insert" | "search"; value: number; path: number[]; found: boolean } | null;
}

interface TNode {
  v: number;
  left?: TNode;
  right?: TNode;
}

function build(values: number[]): TNode | undefined {
  let root: TNode | undefined;
  for (const v of values) {
    if (!root) {
      root = { v };
      continue;
    }
    let cur = root;
    for (;;) {
      if (v === cur.v) break;
      if (v < cur.v) {
        if (!cur.left) {
          cur.left = { v };
          break;
        }
        cur = cur.left;
      } else {
        if (!cur.right) {
          cur.right = { v };
          break;
        }
        cur = cur.right;
      }
    }
  }
  return root;
}

const levelsOf = (t?: TNode): number => (t ? 1 + Math.max(levelsOf(t.left), levelsOf(t.right)) : 0);

/** Path of values compared when looking for v (ends at v if found, or at the last node tried). */
function pathTo(root: TNode | undefined, v: number): { path: number[]; found: boolean } {
  const path: number[] = [];
  let cur = root;
  while (cur) {
    path.push(cur.v);
    if (v === cur.v) return { path, found: true };
    cur = v < cur.v ? cur.left : cur.right;
  }
  return { path, found: false };
}

/** x by in-order position, y by depth. */
function layout(root: TNode | undefined) {
  const pos = new Map<number, { x: number; y: number }>();
  const edges: [number, number][] = [];
  let rank = 0;
  const walk = (t: TNode | undefined, depth: number) => {
    if (!t) return;
    walk(t.left, depth + 1);
    pos.set(t.v, { x: rank++, y: depth });
    walk(t.right, depth + 1);
    if (t.left) edges.push([t.v, t.left.v]);
    if (t.right) edges.push([t.v, t.right.v]);
  };
  walk(root, 0);
  return { pos, edges, count: rank };
}

function snapshot(values: number[], last: BstState["last"]): BstState {
  const t = build(values);
  return { values, count: new Set(values).size, levels: levelsOf(t), last };
}

export function Bst({ props, onChange, revealed }: WidgetProps<BstProps>) {
  const modes = props.modes ?? ["insert"];
  const [values, setValues] = useState<number[]>(props.initial ?? []);
  const [mode, setMode] = useState<"insert" | "search">(modes[0]);
  const [last, setLast] = useState<BstState["last"]>(null);
  const [text, setText] = useState("");

  const root = build(values);
  const levels = levelsOf(root);

  const act = (v: number) => {
    if (revealed || !Number.isFinite(v)) return;
    if (mode === "insert") {
      if (values.includes(v) || new Set(values).size >= 15) return;
      const vs = [...values, v];
      const { path } = pathTo(build(values), v); // nodes compared on the way down
      const l = { mode: "insert" as const, value: v, path: [...path, v], found: false };
      setValues(vs);
      setLast(l);
      onChange?.(snapshot(vs, l));
    } else {
      const { path, found } = pathTo(root, v);
      const l = { mode: "search" as const, value: v, path, found };
      setLast(l);
      onChange?.(snapshot(values, l));
    }
    setText("");
  };
  const reset = () => {
    setValues(props.initial ?? []);
    setLast(null);
    onChange?.(undefined);
  };

  const { pos, edges, count } = layout(root);
  const SP = 40;
  const W = Math.max(300, count * SP + 20);
  const LV = 54;
  const H = Math.max(1, levels) * LV + 10;
  const px = (r: number) => (W - count * SP) / 2 + r * SP + SP / 2;
  const py = (d: number) => 26 + d * LV;
  const pathIdx = new Map((last?.path ?? []).map((v, i) => [v, i + 1]));
  const chips = mode === "insert" ? (props.values ?? []) : (props.searchValues ?? [...values].sort((a, b) => a - b));

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {modes.length > 1 ? (
          <Segmented label="Mode" value={mode} onChange={setMode} disabled={revealed} options={modes.map((m) => ({ id: m, label: m === "insert" ? "Insert" : "Search" }))} />
        ) : (
          <Caption className="!mb-0">{mode === "insert" ? "Tap a number to insert it" : "Tap a number to search for it"}</Caption>
        )}
        <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" onClick={reset} disabled={revealed || (!last && values.length === (props.initial ?? []).length)} aria-label="Start over" title="Start over">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {chips.map((v) => {
          const used = mode === "insert" && values.includes(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => act(v)}
              disabled={revealed || used}
              className={`inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-full border px-3 font-mono text-sm font-semibold tabular-nums transition-colors disabled:cursor-default ${
                used ? "border-dashed border-line text-ink-3" : "border-line bg-surface text-ink hover:border-[var(--brand)] hover:bg-tint"
              }`}
            >
              {mode === "search" && <Search className="h-3.5 w-3.5 text-ink-3" />}
              {v}
            </button>
          );
        })}
        {props.allowCustom && (
          <form
            className="flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) act(Number(text));
            }}
          >
            <input className="input !h-10 !w-20 font-mono" inputMode="numeric" value={text} onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))} placeholder="0–999" disabled={revealed} aria-label="Number" />
            <button type="submit" className="btn btn-primary !h-10" disabled={revealed || !text}>
              {mode === "insert" ? "Insert" : "Find"}
            </button>
          </form>
        )}
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface-2">
        {root ? (
          <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full" style={{ maxWidth: W * 1.1, minWidth: Math.min(W, count * 26) }} role="img" aria-label={`Tree with ${count} nodes and ${levels} levels`}>
            {edges.map(([a, b]) => {
              const pa = pos.get(a)!;
              const pb = pos.get(b)!;
              const on = pathIdx.has(a) && pathIdx.has(b);
              return <line key={`${a}-${b}`} x1={px(pa.x)} y1={py(pa.y)} x2={px(pb.x)} y2={py(pb.y)} stroke={on ? "var(--brand)" : "var(--line-strong)"} strokeWidth={on ? 3 : 1.6} />;
            })}
            {[...pos.entries()].map(([v, p]) => {
              const step = pathIdx.get(v);
              const target = last && v === last.value && (last.mode === "insert" || last.found);
              return (
                <g key={v} className={target ? "pop-in" : ""} style={{ transformOrigin: `${px(p.x)}px ${py(p.y)}px` }}>
                  <circle cx={px(p.x)} cy={py(p.y)} r={16} fill={target ? "var(--primary)" : step ? "var(--tint)" : "var(--surface)"} stroke={step ? "var(--brand)" : "var(--line-strong)"} strokeWidth={step ? 2 : 1.4} />
                  <text x={px(p.x)} y={py(p.y) + 4.2} textAnchor="middle" fontSize={12} fontWeight={600} fontFamily="var(--font-mono)" fill={target ? "var(--primary-ink)" : "var(--ink)"}>
                    {v}
                  </text>
                  {step && !(target && last?.mode === "insert") && (
                    <text x={px(p.x) + 15} y={py(p.y) - 12} textAnchor="middle" fontSize={9} fontWeight={700} fontFamily="var(--font-mono)" fill="var(--brand)">
                      {step}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        ) : (
          <p className="px-3 py-8 text-center text-sm text-ink-3">Empty tree. The first value inserted becomes the root.</p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Readout label="Nodes" value={count} />
        <Readout label="Levels" value={levels} accent />
        {last && (
          <span className="text-sm text-ink-2" aria-live="polite">
            {last.mode === "insert"
              ? last.path.length > 1
                ? `${last.value}: compared with ${last.path.slice(0, -1).join(", ")}, then placed.`
                : `${last.value} is the root.`
              : last.found
                ? `Found ${last.value} after ${last.path.length} ${last.path.length === 1 ? "comparison" : "comparisons"}.`
                : `${last.value} isn't in the tree: ${last.path.length} ${last.path.length === 1 ? "comparison" : "comparisons"}, then a dead end.`}
          </span>
        )}
      </div>
    </div>
  );
}

export function checkBst(state: unknown, goal: Record<string, unknown>) {
  const s = state as BstState | undefined;
  if (!s) return false;
  if (typeof goal.count === "number" && s.count !== goal.count) return false;
  if (typeof goal.levels === "number" && s.levels !== goal.levels) return false;
  if (typeof goal.levelsMax === "number" && s.levels > goal.levelsMax) return false;
  if (Array.isArray(goal.has) && !goal.has.every((v) => s.values.includes(Number(v)))) return false;
  if (typeof goal.searched === "number" && !(s.last?.mode === "search" && s.last.value === goal.searched)) return false;
  return true;
}

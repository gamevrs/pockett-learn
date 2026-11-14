"use client";

import React, { useState } from "react";
import { RotateCcw, Undo2 } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { COLS, OPS, TASKS, isOpen, meetsTask, runRecipe, type Layer, type OpId, type TaskId, type Wafer } from "./fabsim";
import { Btn, Note, Readout, Toy, BLUE } from "./ui";

// ───────────────────────────── semi-fab: the process loop, step by step ─────────────────────────────

export interface FabProps {
  /** A target to build; none = free play. */
  task?: TaskId;
  /** Only offer these steps (in this order). */
  ops?: OpId[];
}

export interface FabState {
  task?: TaskId;
  recipe: OpId[];
  done: boolean;
  mistakes: number;
}

const AMBER = "#d9a21b";
const COPPER = "#c4703a";
const FILL: Record<Layer, string> = { ox: BLUE, res: AMBER, resx: AMBER, metal: COPPER };
const NAME: Record<Layer, string> = { ox: "oxide", res: "resist", resx: "exposed resist", metal: "copper" };

function Section({ wafer, small, showMask }: { wafer: Wafer; small?: boolean; showMask?: boolean }) {
  const cw = small ? 14 : 26;
  const uh = small ? 10 : 18;
  const x0 = small ? 6 : 24;
  const width = x0 * 2 + COLS * cw;
  const top = showMask ? 52 : 12;
  const maxH = Math.max(4, ...wafer.cols.map((c) => c.length));
  const base = top + maxH * uh;
  const subH = small ? 20 : 40;
  const height = base + subH + (small ? 4 : 8);
  const describe = wafer.cols
    .map((c, i) => `column ${i + 1}: ${c.length ? c.map((l) => NAME[l]).join(" under ") : "bare silicon"}${wafer.doped[i] ? ", doped" : ""}`)
    .join("; ");
  const pid = small ? "hatch-s" : "hatch";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`block h-auto ${small ? "w-full max-w-[13rem]" : "w-full"} rounded-xl border border-line bg-surface`} role="img" aria-label={`${small ? "Target" : "Wafer"} cross-section. ${describe}.`}>
      <defs>
        <pattern id={pid} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill={AMBER} />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--surface)" strokeWidth="2.5" />
        </pattern>
      </defs>
      {showMask && (
        <g>
          <rect x={x0} y={12} width={OPEN_X(0, cw, x0) - x0} height={12} fill="var(--ink)" />
          <rect x={OPEN_X(1, cw, x0)} y={12} width={x0 + COLS * cw - OPEN_X(1, cw, x0)} height={12} fill="var(--ink)" />
          <text x={x0} y={44} fontSize={14} fill="var(--ink-2)">
            mask (opening in the middle)
          </text>
        </g>
      )}
      {/* substrate */}
      <rect x={x0} y={base} width={COLS * cw} height={subH} fill="var(--surface-2)" stroke="var(--line-strong)" />
      {wafer.doped.map((d, i) => (d ? <rect key={i} x={x0 + i * cw} y={base} width={cw} height={subH * 0.45} fill="var(--brand)" opacity={0.75} /> : null))}
      {!small && (
        <text x={x0 + COLS * cw - 6} y={base + subH - 8} textAnchor="end" fontSize={14} fill="var(--ink-2)">
          silicon
        </text>
      )}
      {wafer.cols.map((c, i) =>
        c.map((l, k) => (
          <rect
            key={`${i}-${k}`}
            x={x0 + i * cw}
            y={base - (k + 1) * uh}
            width={cw}
            height={uh}
            fill={l === "resx" ? `url(#${pid})` : FILL[l]}
            opacity={l === "ox" ? 0.8 : 1}
            stroke="var(--surface)"
            strokeWidth={0.6}
          />
        )),
      )}
    </svg>
  );
}

/** x of the left (0) or right (1) edge of the mask opening. */
const OPEN_X = (edge: 0 | 1, cw: number, x0: number) => {
  let first = 0;
  while (!isOpen(first)) first++;
  let last = COLS - 1;
  while (!isOpen(last)) last--;
  return edge === 0 ? x0 + first * cw : x0 + (last + 1) * cw;
};

function Legend() {
  const items: { label: string; fill: string; hatch?: boolean }[] = [
    { label: "oxide", fill: BLUE },
    { label: "resist", fill: AMBER },
    { label: "exposed resist", fill: AMBER, hatch: true },
    { label: "copper", fill: COPPER },
    { label: "doped silicon", fill: "var(--brand)" },
  ];
  return (
    <ul className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[12.5px] text-ink-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-3 w-3 rounded-sm" style={{ background: i.hatch ? `repeating-linear-gradient(45deg, ${i.fill} 0 3px, var(--surface) 3px 5px)` : i.fill }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export function Fab({ props, onChange }: WidgetProps<FabProps>) {
  const [recipe, setRecipe] = useState<OpId[]>([]);
  const { wafer, results } = runRecipe(recipe);
  const last = results[results.length - 1];
  const task = props.task;
  const done = task ? meetsTask(wafer, task) : false;
  const mistakes = results.filter((r) => r.mistake).length;
  const ops = props.ops ? OPS.filter((o) => props.ops!.includes(o.id)) : OPS;

  const update = (r: OpId[]) => {
    setRecipe(r);
    const res = runRecipe(r);
    onChange?.({ task, recipe: r, done: task ? meetsTask(res.wafer, task) : false, mistakes: res.results.filter((x) => x.mistake).length } satisfies FabState);
  };
  const label = (id: OpId) => OPS.find((o) => o.id === id)!.label;

  return (
    <div className="w-full" data-widget>
      {task && (
        <div className="mb-3 grid items-center gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-semibold text-ink">{TASKS[task].title}</p>
            <p className="text-[13px] leading-snug text-ink-2">{TASKS[task].goal}</p>
          </div>
          <div className="flex flex-col items-center">
            <p className="mb-1 text-xs text-ink-3">Target</p>
            <Section wafer={TASKS[task].target} small />
          </div>
        </div>
      )}
      <Section wafer={wafer} showMask />
      <Legend />

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ops.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => update([...recipe, o.id])}
            disabled={recipe.length >= 14}
            title={o.what}
            className="min-h-10 rounded-xl border border-line bg-surface px-2 text-sm font-medium text-ink transition-colors hover:border-[var(--line-strong)] hover:bg-surface-2 disabled:opacity-45"
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex min-h-8 flex-wrap items-center gap-1.5" aria-label="Recipe so far">
        <span className="text-xs text-ink-3">Recipe:</span>
        {recipe.length === 0 && <span className="text-xs text-ink-3">no steps yet</span>}
        {recipe.map((op, i) => (
          <span key={i} className={`chip font-mono text-[12px] ${results[i].mistake ? "text-bad" : ""}`} style={results[i].mistake ? { borderColor: "var(--bad)" } : undefined}>
            {i + 1}. {label(op)}
          </span>
        ))}
      </div>

      <div className="mt-3">
        <Note tone={done ? "accent" : "plain"}>
          {done
            ? `Target reached in ${recipe.length} steps${mistakes ? ` (with ${mistakes} wasted or harmful step${mistakes > 1 ? "s" : ""})` : ""}. ${last?.note ?? ""}`
            : last
              ? `${last.mistake ? "Problem: " : ""}${last.note}`
              : `A bare silicon wafer, cut through. Each button is one fab step: ${ops.map((o) => `${o.label.toLowerCase()} (${o.what})`).join("; ")}.`}
        </Note>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {task && <Readout label="Target" value={done ? "reached" : "not yet"} accent={done} />}
        <Btn onClick={() => update(recipe.slice(0, -1))} disabled={!recipe.length}>
          <Undo2 className="h-4 w-4" aria-hidden /> Undo
        </Btn>
        <Btn onClick={() => update([])} disabled={!recipe.length}>
          <RotateCcw className="h-4 w-4" aria-hidden /> New wafer
        </Btn>
      </div>
      <Toy>
        Toy cross-section: every film one unit thick, a perfectly directional etch that stops on silicon, positive resist (light makes it dissolvable), one mask. A real chip repeats loops like this dozens of times, with cleaning and inspection between almost every step.
      </Toy>
    </div>
  );
}

/** goal: { task, maxSteps, maxMistakes } — the wafer must meet the widget's task. */
export function checkFab(state: unknown, goal: Record<string, unknown>) {
  const s = state as FabState | undefined;
  if (!s || !s.done) return false;
  if (typeof goal.task === "string" && s.task !== goal.task) return false;
  if (typeof goal.maxSteps === "number" && s.recipe.length > goal.maxSteps) return false;
  if (typeof goal.maxMistakes === "number" && s.mistakes > goal.maxMistakes) return false;
  return true;
}

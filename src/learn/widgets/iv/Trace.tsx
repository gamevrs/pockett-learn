"use client";

import React, { useEffect, useId, useState } from "react";
import { Check, ChevronLeft, ChevronRight, RotateCcw, Target } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { InlineProse } from "@/components/ui/Prose";
import { Caption, CodePane } from "../dsa/ui";
import { checkTrace, pickTarget, resolveFrames, type CellTone, type ResolvedFrame, type TraceProps, type TraceStack, type TraceState, type TreeNode } from "./model";

export { checkTrace };

/**
 * A generic step-through for interview algorithms: an array with pointers and a shaded window, a grid, a tree, a
 * graph, stacks and queues, a variables table and pseudo-code, all driven by frames in the lesson data (see
 * model.ts). Back / Next (or ← →) move between frames. A frame with a `pick` stops the trace until the learner
 * taps the right cell or node ("predict the next step"); wrong taps are explained inline and can be retried.
 */
export function Trace({ props, onChange, status, revealed }: WidgetProps<TraceProps>) {
  const frames = resolveFrames(props.frames ?? []);
  const last = Math.max(0, frames.length - 1);
  const [at, setAt] = useState(0);
  const [seen, setSeen] = useState(0);
  // frames whose pick was answered correctly, and the last wrong tap per frame (for the red mark)
  const [solved, setSolved] = useState<Record<number, true>>({});
  const [miss, setMiss] = useState<Record<number, string | number>>({});
  const [choice, setChoice] = useState<number | string | undefined>(undefined);
  const gaveUp = status === "revealed";
  const pickFrames = frames.map((f, i) => (f.pick ? i : -1)).filter((i) => i >= 0);

  const frame = frames[Math.min(at, last)];
  const target = frame ? pickTarget(frame) : null;
  const waiting = Boolean(frame?.pick) && !solved[at] && !gaveUp && !revealed;

  const report = (next: { at: number; seen: number; solved: Record<number, true>; choice?: number | string }) => {
    const answered = pickFrames.filter((i) => next.solved[i]).length;
    onChange?.({
      frame: next.at,
      seenAll: next.seen >= last,
      picked: answered === pickFrames.length,
      answered,
      picks: pickFrames.length,
      ...(next.choice !== undefined ? { choice: next.choice } : {}),
    } satisfies TraceState);
  };

  const go = (to: number) => {
    const t = Math.max(0, Math.min(last, to));
    if (t > at && waiting) return;
    const s = Math.max(seen, t);
    setAt(t);
    setSeen(s);
    report({ at: t, seen: s, solved, choice });
  };
  const reset = () => {
    setAt(0);
    setMiss({});
    report({ at: 0, seen, solved, choice });
  };
  const tap = (value: number | string) => {
    if (!frame?.pick || solved[at] || gaveUp) return;
    setChoice(value);
    if (String(value) === String(frame.pick.answer)) {
      const s = { ...solved, [at]: true as const };
      setSolved(s);
      report({ at, seen, solved: s, choice: value });
    } else {
      setMiss({ ...miss, [at]: value });
      report({ at, seen, solved, choice: value });
    }
  };

  // a one-frame trace is seen as soon as it is shown
  useEffect(() => {
    if (last === 0 && pickFrames.length === 0) onChange?.({ frame: 0, seenAll: true, picked: true, answered: 0, picks: 0 } satisfies TraceState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ← and → step through the trace, unless the learner is typing somewhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable='true'], .monaco-editor, [role='slider'], [role='radiogroup']")) return;
      e.preventDefault();
      go(e.key === "ArrowLeft" ? at - 1 : at + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!frame) return <p className="text-sm text-ink-3">This trace has no frames.</p>;

  const answer = frame.pick?.answer;
  const hasVars = Boolean(frame.vars && Object.keys(frame.vars).length);
  const hasCode = Boolean(frame.code?.length);
  const showAnswer = Boolean(frame.pick) && (solved[at] || gaveUp);
  const wrong = miss[at];
  const pickable = (kind: string) => waiting && target === kind;
  const mark = (kind: string, value: number | string): "right" | "wrong" | null => {
    if (target !== kind || !frame.pick) return null;
    if (showAnswer && String(value) === String(answer)) return "right";
    if (!solved[at] && wrong !== undefined && String(value) === String(wrong)) return "wrong";
    return null;
  };

  return (
    <div className="w-full min-w-0">
      {(props.title || props.ask) && (
        <div className="mb-3">
          {props.title && <p className="font-semibold text-ink">{props.title}</p>}
          {props.ask && (
            <p className="mt-0.5 text-sm text-ink-2">
              <InlineProse text={props.ask.prompt} />
            </p>
          )}
        </div>
      )}

      {frame.pick && (
        <div
          className={`mb-3 flex min-h-11 items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${
            solved[at] ? "border-[var(--good)]/40 bg-[var(--good)]/[0.07]" : "border-[var(--brand)]/50 bg-tint"
          }`}
          aria-live="polite"
        >
          {solved[at] ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-good" /> : <Target className="mt-0.5 h-4 w-4 shrink-0 text-brand" />}
          <span className="min-w-0 text-ink">
            <InlineProse text={frame.pick.prompt} />
            <span className="block text-xs text-ink-3">
              {solved[at]
                ? "Right. Press Next to see it happen."
                : gaveUp
                  ? `The answer is marked: ${describe(target, answer)}.`
                  : wrong !== undefined
                    ? `Not ${describe(target, wrong)}. Look at the note${frame.code?.length ? " and the highlighted line" : ""}, then tap again.`
                    : `Tap the ${target === "array" ? "cell" : target === "grid" ? "square" : "node"} to answer; Next unlocks once you get it.`}
            </span>
          </span>
        </div>
      )}

      <div className="grid gap-3">
        {frame.array && <ArrayView frame={frame} pickable={pickable("array")} mark={(i) => mark("array", i)} onPick={tap} />}
        {frame.grid && <GridView frame={frame} pickable={pickable("grid")} mark={(k) => mark("grid", k)} onPick={tap} />}
        {frame.tree && frame.tree.nodes.length > 0 && <TreeView frame={frame} pickable={pickable("tree")} mark={(id) => mark("tree", id)} onPick={tap} />}
        {frame.graph && frame.graph.nodes.length > 0 && <GraphView frame={frame} pickable={pickable("graph")} mark={(id) => mark("graph", id)} onPick={tap} />}
      </div>

      {/* the note and the controls sit right under the picture, so a phone shows both without scrolling */}
      <div className="mt-3 flex min-h-11 items-start gap-2 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink-2" aria-live="polite">
        <span>
          <InlineProse text={frame.note} />
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button type="button" className="btn !h-10 !px-3" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Previous step">
          <ChevronLeft className="h-4 w-4" /> <span className="hidden min-[380px]:inline">Back</span>
        </button>
        <span className="min-w-[4.5rem] text-center font-mono text-sm tabular-nums text-ink-2" aria-live="polite">
          {at + 1} / {frames.length}
        </span>
        <button
          type="button"
          className={`btn ${at < last && !waiting ? "btn-primary" : ""} !h-10 flex-1 sm:flex-none sm:!px-5`}
          onClick={() => go(at + 1)}
          disabled={at >= last || waiting}
          title={waiting ? "Answer the question above first" : undefined}
        >
          {at >= last ? "End" : "Next"} <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" className="btn btn-ghost ml-auto !h-10 !w-10 !p-0" onClick={reset} disabled={at === 0} aria-label="Back to the start" title="Back to the start">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {(Boolean(frame.stacks?.length) || hasVars || hasCode) && (
        <div className="mt-3 flex flex-wrap items-start gap-3">
          {frame.stacks?.map((st, i) => <StackView key={`${st.label}-${i}`} stack={st} />)}
          {hasVars && <VarsView vars={frame.vars!} />}
          {hasCode && <CodePane className="min-w-0 basis-full lg:basis-[24rem] lg:flex-[2_1_24rem]" code={frame.code!.join("\n")} highlight={frame.line ? [frame.line - 1] : []} />}
        </div>
      )}
    </div>
  );
}

function describe(target: string | null, v: number | string | undefined) {
  if (v === undefined) return "";
  if (target === "array") return `index ${v}`;
  if (target === "grid") return `square (${v})`;
  return String(v);
}

const fmtCell = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "boolean" ? (v ? "true" : "false") : String(v));

/** Classes for a cell or node by its state; the pick marks win. */
function tone(on: { active?: boolean; done?: boolean; path?: boolean; wall?: boolean; mark?: "right" | "wrong" | null }) {
  if (on.mark === "right") return "border-[var(--good)] bg-[var(--good)]/15 text-ink";
  if (on.mark === "wrong") return "border-[var(--bad)] bg-[var(--bad)]/10 text-ink";
  if (on.wall) return "border-transparent bg-ink text-bg";
  if (on.active) return "border-transparent bg-primary text-primary-ink font-semibold";
  if (on.path) return "border-[var(--brand)] bg-brand-soft text-ink";
  if (on.done) return "border-line bg-surface-2 text-ink-3";
  return "border-line bg-surface text-ink";
}

function ArrayView({ frame, pickable, mark, onPick }: { frame: ResolvedFrame; pickable: boolean; mark: (i: number) => "right" | "wrong" | null; onPick: (i: number) => void }) {
  const arr = frame.array ?? [];
  const hi = new Set(frame.highlight ?? []);
  const done = new Set(frame.done ?? []);
  const [r0, r1] = frame.range ?? [-1, -2];
  // pointers grouped by index; -1 and arr.length sit just outside the array
  const at = new Map<number, string[]>();
  for (const [name, i] of Object.entries(frame.pointers ?? {})) at.set(i, [...(at.get(i) ?? []), name]);
  const lo = at.has(-1) ? -1 : 0;
  const hiEnd = at.has(arr.length) ? arr.length : arr.length - 1;
  const slots: number[] = [];
  for (let i = lo; i <= hiEnd; i++) slots.push(i);
  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-flex min-w-full gap-1" role="list" aria-label="Array">
        {slots.map((i) => {
          const inside = i >= 0 && i < arr.length;
          const inRange = i >= r0 && i <= r1;
          const m = inside ? mark(i) : null;
          const cls = tone({ active: hi.has(i), done: done.has(i), mark: m });
          const body = (
            <span className={`grid h-10 min-w-10 place-items-center rounded-lg border px-1.5 font-mono text-sm tabular-nums motion-safe:transition-colors ${inside ? cls : "border-dashed border-line text-ink-3"}`}>
              {inside ? fmtCell(arr[i]) : ""}
            </span>
          );
          return (
            <div key={i} role="listitem" className={`flex min-w-10 flex-col items-stretch rounded-lg px-0.5 pt-0.5 ${inRange ? "bg-brand-soft" : ""}`}>
              <span className="mb-0.5 text-center font-mono text-[0.65rem] text-ink-3">{inside ? i : ""}</span>
              {inside && pickable ? (
                <button type="button" onClick={() => onPick(i)} className="rounded-lg ring-2 ring-[var(--brand)]/40 ring-offset-1 ring-offset-[var(--surface)]" aria-label={`Pick index ${i}, value ${fmtCell(arr[i]) || "empty"}`} data-answer>
                  {body}
                </button>
              ) : (
                body
              )}
              <span className="mt-1 flex min-h-5 flex-col items-center text-[0.7rem] font-semibold leading-tight text-brand">
                {(at.get(i) ?? []).map((name) => (
                  <span key={name} className="whitespace-nowrap">
                    ↑{name}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GridView({ frame, pickable, mark, onPick }: { frame: ResolvedFrame; pickable: boolean; mark: (k: string) => "right" | "wrong" | null; onPick: (k: string) => void }) {
  const grid = frame.grid ?? [];
  const cols = Math.max(1, ...grid.map((r) => r.length));
  const tones = new Map<string, CellTone>();
  for (const c of frame.cells ?? []) tones.set(`${c.r},${c.c}`, c.tone);
  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid w-max gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 2.5rem)` }} role="grid" aria-label="Grid">
        {grid.map((row, r) =>
          row.map((v, c) => {
            const k = `${r},${c}`;
            const t = tones.get(k);
            const cls = `grid h-10 w-10 place-items-center rounded-md border font-mono text-sm tabular-nums motion-safe:transition-colors ${tone({ active: t === "active", done: t === "done", path: t === "path", wall: t === "wall", mark: mark(k) })}`;
            return pickable ? (
              <button key={k} type="button" role="gridcell" className={`${cls} ring-2 ring-[var(--brand)]/30`} onClick={() => onPick(k)} aria-label={`Pick row ${r}, column ${c}`} data-answer>
                {fmtCell(v)}
              </button>
            ) : (
              <span key={k} role="gridcell" className={cls}>
                {fmtCell(v)}
              </span>
            );
          }),
        )}
      </div>
    </div>
  );
}

/**
 * Lay a tree out: binary trees (children carry a side) in order, so a lone right child sits to the right; n-ary
 * trees leaf by leaf with each parent centred over its children. Returns column (x) and depth (y) per node.
 */
function layoutTree(nodes: TreeNode[]) {
  const ids = new Set(nodes.map((n) => n.id));
  const kids = new Map<string, TreeNode[]>();
  for (const n of nodes) if (n.parent && ids.has(n.parent)) kids.set(n.parent, [...(kids.get(n.parent) ?? []), n]);
  const roots = nodes.filter((n) => !n.parent || !ids.has(n.parent));
  const binary = nodes.some((n) => n.side);
  const pos = new Map<string, { x: number; y: number }>();
  let col = 0;
  const seen = new Set<string>();
  const place = (n: TreeNode, depth: number) => {
    if (seen.has(n.id)) return; // a cycle in bad data: draw each node once
    seen.add(n.id);
    const ch = kids.get(n.id) ?? [];
    if (binary) {
      const left = ch.find((c) => c.side === "L");
      const right = ch.find((c) => c.side !== "L" && c !== left);
      if (left) place(left, depth + 1);
      pos.set(n.id, { x: col++, y: depth });
      if (right) place(right, depth + 1);
      return;
    }
    if (ch.length === 0) {
      pos.set(n.id, { x: col++, y: depth });
      return;
    }
    for (const c of ch) place(c, depth + 1);
    const xs = ch.map((c) => pos.get(c.id)?.x ?? 0);
    pos.set(n.id, { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: depth });
  };
  for (const r of roots) place(r, 0);
  const width = Math.max(1, col);
  const depth = Math.max(0, ...[...pos.values()].map((p) => p.y)) + 1;
  return { pos, width, depth, kids };
}

function TreeView({ frame, pickable, mark, onPick }: { frame: ResolvedFrame; pickable: boolean; mark: (id: string) => "right" | "wrong" | null; onPick: (id: string) => void }) {
  const tree = frame.tree!;
  const { pos, width, depth } = layoutTree(tree.nodes);
  const active = new Set(tree.active ?? []);
  const done = new Set(tree.done ?? []);
  const U = 12; // one column / one level in viewBox units
  const W = width * U;
  const H = depth * U * 1.15 + 2;
  const X = (x: number) => x * U + U / 2;
  const Y = (y: number) => y * U * 1.15 + U / 2 + 1;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto" style={{ width: "100%", minWidth: width * 40, maxWidth: width * 72, maxHeight: depth * 90 }} role="img" aria-label="Tree">
        {tree.nodes.map((n) => {
          const p = pos.get(n.id);
          const q = n.parent ? pos.get(n.parent) : undefined;
          if (!p || !q) return null;
          const lit = (active.has(n.id) || done.has(n.id)) && (active.has(n.parent!) || done.has(n.parent!));
          return <line key={`e-${n.id}`} x1={X(q.x)} y1={Y(q.y)} x2={X(p.x)} y2={Y(p.y)} stroke={lit ? "var(--brand)" : "var(--line-strong)"} strokeWidth={lit ? 0.9 : 0.6} />;
        })}
        {tree.nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          return (
            <SvgNode
              key={n.id}
              x={X(p.x)}
              y={Y(p.y)}
              r={4.4}
              label={n.label}
              state={{ active: active.has(n.id), done: done.has(n.id), mark: mark(n.id) }}
              pickable={pickable}
              onPick={() => onPick(n.id)}
              name={`node ${n.label}`}
            />
          );
        })}
      </svg>
    </div>
  );
}

/** One circle with a label, used by the tree and the graph. */
function SvgNode({
  x,
  y,
  r,
  label,
  state,
  pickable,
  onPick,
  name,
}: {
  x: number;
  y: number;
  r: number;
  label: string;
  state: { active?: boolean; done?: boolean; mark?: "right" | "wrong" | null };
  pickable: boolean;
  onPick: () => void;
  name: string;
}) {
  const fill = state.mark === "right" ? "var(--good)" : state.mark === "wrong" ? "var(--bad)" : state.active ? "var(--primary)" : state.done ? "var(--surface-2)" : "var(--surface)";
  const stroke = state.mark ? "transparent" : state.active ? "var(--brand)" : pickable ? "var(--brand)" : "var(--line-strong)";
  const ink = state.mark ? "var(--bg)" : state.active ? "var(--primary-ink)" : state.done ? "var(--ink-3)" : "var(--ink)";
  const size = label.length > 3 ? 2.6 : label.length > 2 ? 3 : 3.6;
  const g = (
    <>
      <circle cx={x} cy={y} r={r * 1.55} fill="transparent" />
      <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth={pickable ? 0.8 : 0.55} strokeDasharray={pickable && !state.mark ? "1.4 0.9" : undefined} className="motion-safe:transition-colors" />
      <text x={x} y={y + size * 0.36} textAnchor="middle" fontSize={size} fontWeight={700} fontFamily="var(--font-mono)" fill={ink}>
        {label}
      </text>
    </>
  );
  if (!pickable) return <g>{g}</g>;
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`Pick ${name}`}
      className="cursor-pointer outline-none"
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        }
      }}
      data-answer
    >
      {g}
    </g>
  );
}

const GY = 0.62;

function GraphView({ frame, pickable, mark, onPick }: { frame: ResolvedFrame; pickable: boolean; mark: (id: string) => "right" | "wrong" | null; onPick: (id: string) => void }) {
  const g = frame.graph!;
  const uid = useId().replace(/:/g, "");
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const active = new Set(g.active ?? []);
  const done = new Set(g.done ?? []);
  const lit = new Set((g.activeEdges ?? []).map(([a, b]) => (g.directed ? `${a}>${b}` : [a, b].sort().join("|"))));
  const R = 4.6;
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface-2">
      <svg viewBox={`0 0 100 ${100 * GY}`} className="mx-auto block h-auto w-full max-w-[34rem]" role="img" aria-label="Graph">
        <defs>
          {["n", "a"].map((k) => (
            <marker key={k} id={`${uid}-${k}`} viewBox="0 0 6 6" refX="5.4" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M0,0 L6,3 L0,6 z" fill={k === "a" ? "var(--brand)" : "var(--line-strong)"} />
            </marker>
          ))}
        </defs>
        {g.edges.map(([a, b, w], i) => {
          const na = byId.get(a);
          const nb = byId.get(b);
          if (!na || !nb) return null;
          const on = lit.has(g.directed ? `${a}>${b}` : [a, b].sort().join("|"));
          const x1 = na.x;
          const y1 = na.y * GY;
          const x2 = nb.x;
          const y2 = nb.y * GY;
          const len = Math.hypot(x2 - x1, y2 - y1) || 1;
          // directed edges stop at the circle's edge so the arrowhead shows
          const cut = g.directed ? R + 0.6 : 0;
          const ex = x2 - ((x2 - x1) / len) * cut;
          const ey = y2 - ((y2 - y1) / len) * cut;
          return (
            <g key={`${a}-${b}-${i}`}>
              <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={on ? "var(--brand)" : "var(--line-strong)"} strokeWidth={on ? 1.2 : 0.6} strokeLinecap="round" markerEnd={g.directed ? `url(#${uid}-${on ? "a" : "n"})` : undefined} />
              {w !== undefined && w !== null && (
                <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 1.2} textAnchor="middle" fontSize={3} fontWeight={700} fontFamily="var(--font-mono)" fill={on ? "var(--brand)" : "var(--ink-2)"} paintOrder="stroke" stroke="var(--surface-2)" strokeWidth={1.2}>
                  {w}
                </text>
              )}
            </g>
          );
        })}
        {g.nodes.map((n) => (
          <SvgNode
            key={n.id}
            x={n.x}
            y={n.y * GY}
            r={R}
            label={n.id}
            state={{ active: active.has(n.id), done: done.has(n.id), mark: mark(n.id) }}
            pickable={pickable}
            onPick={() => onPick(n.id)}
            name={`node ${n.id}`}
          />
        ))}
      </svg>
    </div>
  );
}

function StackView({ stack }: { stack: TraceStack }) {
  const kind = stack.kind ?? "stack";
  const items = kind === "stack" ? [...stack.items].reverse() : stack.items;
  return (
    <div className="min-w-[7rem] rounded-xl border border-line bg-surface p-2.5">
      <Caption className="!mb-1.5">
        {stack.label}
        {stack.label.toLowerCase() !== kind && <span className="font-normal normal-case tracking-normal"> ({kind})</span>}
      </Caption>
      {items.length === 0 ? (
        <p className="font-mono text-xs text-ink-3">empty</p>
      ) : kind === "stack" ? (
        <ol className="grid gap-1">
          {items.map((v, i) => (
            <li key={i} className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1 font-mono text-sm ${i === 0 ? "border-[var(--brand)]/50 bg-tint" : "border-line bg-surface-2"}`}>
              <span>{fmtCell(v)}</span>
              {i === 0 && <span className="font-sans text-[0.65rem] text-ink-3">top</span>}
            </li>
          ))}
        </ol>
      ) : (
        <ol className="flex flex-wrap gap-1">
          {items.map((v, i) => (
            <li key={i} className={`rounded-md border px-2 py-1 font-mono text-sm ${i === 0 ? "border-[var(--brand)]/50 bg-tint" : "border-line bg-surface-2"}`}>
              {fmtCell(v)}
            </li>
          ))}
          <li className="self-center px-1 text-[0.65rem] text-ink-3">{kind === "queue" ? "← front" : "← root"}</li>
        </ol>
      )}
    </div>
  );
}

function VarsView({ vars }: { vars: Record<string, string | number | boolean | null> }) {
  return (
    <div className="min-w-[8rem] flex-1 rounded-xl border border-line bg-surface p-2.5 lg:max-w-[16rem]">
      <Caption className="!mb-1.5">Variables</Caption>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 font-mono text-sm">
        {Object.entries(vars).map(([k, v]) => (
          <React.Fragment key={k}>
            <dt className="text-ink-3">{k}</dt>
            <dd className="min-w-0 break-words text-ink">{v === null ? "null" : fmtCell(v)}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
}

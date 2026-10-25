"use client";

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Segmented } from "./ui";

/**
 * The same items stored two ways: an array (cells side by side, addresses 4 apart) and a singly
 * linked list (nodes anywhere in memory, each pointing at the next). Insert, delete or read at the
 * front, middle or end and compare the work each one does.
 *
 * Steps counted: array insert/delete = items shifted + 1, array read = 1 (jump straight to
 * start + index × 4). List = links followed from the head + pointers changed (insert 2, delete 1),
 * list read = links followed + 1.
 */
type Op = "insert" | "delete" | "read";
type At = "front" | "middle" | "end";

export interface ArrayListProps {
  items?: number[];
  show?: "array" | "list" | "both";
  ops?: Op[];
  /** Values inserted, in turn. */
  insertValues?: number[];
  initialOp?: Op;
  initialAt?: At;
}

export interface ArrayListState {
  items: number[];
  last: { op: Op; at: At; arraySteps: number; listSteps: number } | null;
}

interface Node {
  v: number;
  addr: number;
}
interface Last {
  op: Op;
  at: At;
  index: number;
  value: number;
  moved: number[];
  hops: number;
  pointers: number;
  arraySteps: number;
  listSteps: number;
}

const BASE = 100;
const CAP = 8;
/** Where new linked-list nodes land: anywhere free, deliberately out of order. */
const SCATTER = [212, 548, 136, 420, 316, 604, 180, 476, 260, 380, 532, 148, 444, 292, 572, 164];

export function ArrayList({ props, onChange, revealed }: WidgetProps<ArrayListProps>) {
  const show = props.show ?? "both";
  const ops = props.ops ?? ["insert", "delete", "read"];
  const pool = props.insertValues ?? [7, 2, 9, 4, 6, 1, 8, 3];
  const [nodes, setNodes] = useState<Node[]>(() => (props.items ?? [3, 8, 5, 1]).map((v, i) => ({ v, addr: SCATTER[i] })));
  const [nextAddr, setNextAddr] = useState((props.items ?? [3, 8, 5, 1]).length);
  const [nextVal, setNextVal] = useState(0);
  const [op, setOp] = useState<Op>(props.initialOp ?? ops[0]);
  const [at, setAt] = useState<At>(props.initialAt ?? "front");
  const [last, setLast] = useState<Last | null>(null);

  const L = nodes.length;
  const value = pool[nextVal % pool.length];
  const disabled = revealed || (op === "insert" ? L >= CAP : L === 0);
  const indexFor = (o: Op, a: At, len: number) => (a === "front" ? 0 : a === "end" ? (o === "insert" ? len : len - 1) : Math.floor((o === "insert" ? len : len - 1) / 2));

  const run = () => {
    if (disabled) return;
    const i = indexFor(op, at, L);
    let next = nodes;
    let moved: number[] = [];
    let hops = 0;
    let pointers = 0;
    let arraySteps = 1;
    if (op === "insert") {
      next = [...nodes.slice(0, i), { v: value, addr: SCATTER[nextAddr % SCATTER.length] }, ...nodes.slice(i)];
      moved = Array.from({ length: L - i }, (_, k) => i + 1 + k); // new positions of shifted items
      arraySteps = moved.length + 1;
      hops = i === 0 ? 0 : i - 1;
      pointers = 2;
      setNextAddr(nextAddr + 1);
      setNextVal(nextVal + 1);
    } else if (op === "delete") {
      next = [...nodes.slice(0, i), ...nodes.slice(i + 1)];
      moved = Array.from({ length: L - i - 1 }, (_, k) => i + k);
      arraySteps = moved.length + 1;
      hops = i === 0 ? 0 : i - 1;
      pointers = 1;
    } else {
      hops = i;
      pointers = 0;
    }
    const listSteps = op === "read" ? hops + 1 : hops + pointers;
    const l: Last = { op, at, index: i, value: op === "insert" ? value : nodes[i].v, moved, hops, pointers, arraySteps, listSteps };
    setNodes(next);
    setLast(l);
    onChange?.({ items: next.map((n) => n.v), last: { op, at, arraySteps, listSteps } } satisfies ArrayListState);
  };
  const reset = () => {
    const init = props.items ?? [3, 8, 5, 1];
    setNodes(init.map((v, i) => ({ v, addr: SCATTER[i] })));
    setNextAddr(init.length);
    setNextVal(0);
    setLast(null);
    onChange?.(undefined);
  };

  const label = op === "insert" ? `Insert ${value} at the ${at}` : op === "delete" ? `Delete the ${at} item` : `Read the ${at} item`;

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        {ops.length > 1 && <Segmented label="Operation" value={op} onChange={setOp} disabled={revealed} options={ops.map((o) => ({ id: o, label: o[0].toUpperCase() + o.slice(1) }))} />}
        <Segmented
          label="Position"
          value={at}
          onChange={setAt}
          disabled={revealed}
          options={[
            { id: "front", label: "Front" },
            { id: "middle", label: "Middle" },
            { id: "end", label: "End" },
          ]}
        />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button type="button" className="btn btn-primary !h-10 flex-1 sm:flex-none sm:!px-5" onClick={run} disabled={disabled}>
          {label}
        </button>
        <button type="button" className="btn btn-ghost ml-auto !h-10 !w-10 !p-0" onClick={reset} disabled={revealed || !last} aria-label="Start over" title="Start over">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
      {op === "insert" && L >= CAP && <p className="mt-2 text-xs text-ink-3">Full: delete something first.</p>}

      {show !== "list" && <ArrayPanel nodes={nodes} last={last} />}
      {show !== "array" && <ListPanel nodes={nodes} last={last} />}

      {show === "both" && last && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-center" aria-live="polite">
          {(["array", "list"] as const).map((k) => {
            const mine = k === "array" ? last.arraySteps : last.listSteps;
            const other = k === "array" ? last.listSteps : last.arraySteps;
            const win = mine < other;
            return (
              <div key={k} className={`rounded-xl border px-3 py-2 ${win ? "border-[var(--brand)]/60 bg-tint" : "border-line bg-surface-2"}`}>
                <p className="text-[0.7rem] text-ink-3">{k === "array" ? "Array" : "Linked list"}</p>
                <p className="font-mono text-lg font-semibold tabular-nums text-ink">
                  {mine} <span className="text-xs font-normal text-ink-3">{mine === 1 ? "step" : "steps"}</span>
                </p>
                <p className="text-[0.7rem] font-medium text-ink-2">{win ? "less work" : mine === other ? "tie" : " "}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ArrayPanel({ nodes, last }: { nodes: Node[]; last: Last | null }) {
  const moved = new Set(last?.moved ?? []);
  return (
    <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
        <Caption className="!mb-0">Array · side by side</Caption>
        {last && <span className="text-xs text-ink-2">{arrayText(last)}</span>}
      </div>
      <div className="mt-3 overflow-x-auto pb-1">
        <div className="grid min-w-[18rem] grid-cols-8">
          {Array.from({ length: CAP }, (_, i) => {
            const n = nodes[i];
            const isNew = last?.op === "insert" && i === last.index;
            const isRead = last?.op === "read" && i === last.index;
            const isMoved = moved.has(i);
            return (
              <div key={i} className={`flex flex-col items-stretch ${i > 0 ? "-ml-px" : ""}`}>
                <span
                  className={`relative flex h-11 items-center justify-center border font-mono text-sm font-semibold tabular-nums ${i === 0 ? "rounded-l-lg" : ""} ${i === CAP - 1 ? "rounded-r-lg" : ""} ${
                    !n
                      ? "border-dashed border-line bg-transparent text-ink-3"
                      : isNew || isRead
                        ? "z-10 border-transparent bg-primary text-primary-ink"
                        : isMoved
                          ? "z-10 border-[var(--brand)] bg-tint text-ink"
                          : "border-line bg-surface text-ink"
                  } ${isNew || isMoved || isRead ? "pop-in" : ""}`}
                >
                  {n ? n.v : ""}
                  {isMoved && <span className="absolute right-1 top-0.5 text-[0.6rem] font-normal text-brand">{last?.op === "insert" ? "→" : "←"}</span>}
                </span>
                <span className="mt-1 text-center font-mono text-[0.6rem] tabular-nums text-ink-3">{BASE + 4 * i}</span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-1 text-[0.68rem] text-ink-3">Addresses go up by 4: item i lives at {BASE} + i × 4.</p>
    </div>
  );
}

function arrayText(l: Last) {
  if (l.op === "read") return `jumped to ${BASE} + ${l.index} × 4 = ${BASE + 4 * l.index}: 1 step`;
  const m = l.moved.length;
  return `${m === 0 ? "nothing moved" : `moved ${m} ${m === 1 ? "item" : "items"}`} + 1 = ${l.arraySteps} ${l.arraySteps === 1 ? "step" : "steps"}`;
}

function listText(l: Last) {
  if (l.op === "read") return `followed ${l.hops} ${l.hops === 1 ? "link" : "links"} + read 1 = ${l.listSteps} ${l.listSteps === 1 ? "step" : "steps"}`;
  return `followed ${l.hops} ${l.hops === 1 ? "link" : "links"} + changed ${l.pointers} ${l.pointers === 1 ? "pointer" : "pointers"} = ${l.listSteps} steps`;
}

function ListPanel({ nodes, last }: { nodes: Node[]; last: Last | null }) {
  // nodes passed on the way (0..i-1) and the arrows that were re-pointed (arrow k leads into node k)
  const passedUpTo = last ? last.index : 0;
  const changed = new Set<number>(!last || last.op === "read" ? [] : last.op === "insert" ? [last.index, last.index + 1] : [last.index]);
  return (
    <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
        <Caption className="!mb-0">Linked list · anywhere in memory</Caption>
        {last && <span className="text-xs text-ink-2">{listText(last)}</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-y-3">
        <span className={`mr-1 mt-3 rounded-md px-1.5 py-0.5 font-mono text-[0.7rem] font-semibold ${changed.has(0) ? "bg-primary text-primary-ink" : "bg-surface text-ink-2"}`}>head</span>
        {nodes.map((n, i) => {
          const isNew = last?.op === "insert" && i === last.index;
          const isRead = last?.op === "read" && i === last.index;
          const passed = Boolean(last) && i < passedUpTo;
          const arrowIn = changed.has(i);
          return (
            <React.Fragment key={`${n.addr}-${i}`}>
              <Arrow on={arrowIn} />
              <span className="flex flex-col items-center">
                <span className="font-mono text-[0.6rem] tabular-nums text-ink-3">@{n.addr}</span>
                <span
                  className={`flex h-10 items-stretch overflow-hidden rounded-lg border font-mono text-sm ${
                    isNew || isRead ? "pop-in border-transparent bg-primary text-primary-ink" : passed ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink"
                  }`}
                >
                  <span className="flex min-w-8 items-center justify-center px-1.5 font-semibold tabular-nums">{n.v}</span>
                  <span className={`flex items-center border-l px-1 text-[0.6rem] ${isNew || isRead ? "border-black/15" : "border-line text-ink-3"}`}>{nodes[i + 1] ? nodes[i + 1].addr : "–"}</span>
                </span>
              </span>
            </React.Fragment>
          );
        })}
        <Arrow on={changed.has(nodes.length)} />
        <span className="mt-3 font-mono text-[0.7rem] text-ink-3">None</span>
      </div>
      <p className="mt-2 text-[0.68rem] text-ink-3">Each node stores its value and the address of the next node. To reach item i, start at head and follow i links.</p>
    </div>
  );
}

function Arrow({ on }: { on?: boolean }) {
  return (
    <span className={`mx-0.5 inline-flex items-center pt-3 font-mono text-sm ${on ? "font-bold text-brand" : "text-ink-3"}`} aria-hidden>
      →
    </span>
  );
}

export function checkArrayList(state: unknown, goal: Record<string, unknown>) {
  const s = state as ArrayListState | undefined;
  if (!s) return false;
  if (Array.isArray(goal.items) && !(goal.items.length === s.items.length && goal.items.every((v, i) => v === s.items[i]))) return false;
  if (goal.op !== undefined && s.last?.op !== goal.op) return false;
  if (goal.at !== undefined && s.last?.at !== goal.at) return false;
  if (goal.cheaper === "list" && !(s.last && s.last.listSteps < s.last.arraySteps)) return false;
  if (goal.cheaper === "array" && !(s.last && s.last.arraySteps < s.last.listSteps)) return false;
  return Boolean(s.last);
}

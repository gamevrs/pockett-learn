"use client";

import React, { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, CODE_SURFACE } from "./ui";
import { CodeBlock } from "@/components/ui/Prose";

/**
 * A stack (add and remove at the top: last in, first out) or a queue (add at the back, remove
 * from the front: first in, first out). Items to add come from `incoming`, in order; removed items
 * collect in an output list, so the order they come out is easy to compare.
 */
export interface StackQueueProps {
  kind: "stack" | "queue";
  /** What gets added next, in order. */
  incoming: string[];
  initial?: string[];
  /** Python variable name shown in the code line. */
  varName?: string;
  addLabel?: string;
  removeLabel?: string;
  /** Heading over the removed items, e.g. "Undone" or "Printed". */
  outLabel?: string;
}

export interface StackQueueState {
  items: string[];
  removed: string[];
}

export function StackQueue({ props, onChange, revealed }: WidgetProps<StackQueueProps>) {
  const stack = props.kind === "stack";
  const name = props.varName ?? (stack ? "stack" : "queue");
  const [items, setItems] = useState<string[]>(props.initial ?? []);
  const [next, setNext] = useState(0);
  const [removed, setRemoved] = useState<string[]>([]);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ kind: "add" | "remove"; n: number }>({ kind: "add", n: 0 });

  const incoming = props.incoming[next];
  const report = (it: string[], rm: string[]) => onChange?.({ items: it, removed: rm } satisfies StackQueueState);

  const add = () => {
    if (revealed || incoming === undefined) return;
    const it = [...items, incoming];
    setItems(it);
    setNext(next + 1);
    setLastCode(`${name}.append(${JSON.stringify(incoming)})`);
    setFlash({ kind: "add", n: flash.n + 1 });
    report(it, removed);
  };
  const remove = () => {
    if (revealed || items.length === 0) return;
    const out = stack ? items[items.length - 1] : items[0];
    const it = stack ? items.slice(0, -1) : items.slice(1);
    const rm = [...removed, out];
    setItems(it);
    setRemoved(rm);
    setLastCode(`${stack ? `${name}.pop()` : `${name}.popleft()`}   # → ${JSON.stringify(out)}`);
    setFlash({ kind: "remove", n: flash.n + 1 });
    report(it, rm);
  };
  const reset = () => {
    setItems(props.initial ?? []);
    setNext(0);
    setRemoved([]);
    setLastCode(null);
    onChange?.(undefined);
  };

  const addLabel = props.addLabel ?? (stack ? "Push" : "Enqueue");
  const removeLabel = props.removeLabel ?? (stack ? "Pop" : "Dequeue");

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary !h-10 w-full min-w-0 sm:w-auto" onClick={add} disabled={revealed || incoming === undefined}>
          <ArrowDownToLine className="h-4 w-4 shrink-0" />
          <span className="truncate">{incoming === undefined ? "Nothing left to add" : `${addLabel}: ${incoming}`}</span>
        </button>
        <button type="button" className="btn !h-10 flex-1 sm:flex-none" onClick={remove} disabled={revealed || items.length === 0}>
          <ArrowUpFromLine className="h-4 w-4" /> {removeLabel}
        </button>
        <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" onClick={reset} disabled={revealed || (next === 0 && removed.length === 0)} aria-label="Start over" title="Start over">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_11rem]">
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <Caption>{stack ? "Stack · top is the only way in or out" : "Queue · in at the back, out at the front"}</Caption>
          {stack ? (
            <div className="mx-auto flex min-h-[13rem] max-w-[16rem] flex-col-reverse justify-start gap-1.5 rounded-b-xl border-x-2 border-b-2 border-[var(--line-strong)] px-2 pb-2 pt-6">
              {items.map((it, i) => {
                const top = i === items.length - 1;
                return (
                  <div
                    key={`${i}-${it}`}
                    className={`flex min-h-10 items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm ${top ? "border-transparent bg-primary font-semibold text-primary-ink" : "border-line bg-surface text-ink"} ${top && flash.kind === "add" ? "pop-in" : ""}`}
                  >
                    <span className="min-w-0 break-words">{it}</span>
                    {top && <span className="shrink-0 font-mono text-[0.65rem] uppercase tracking-wide opacity-70">top</span>}
                  </div>
                );
              })}
              {items.length === 0 && <p className="my-auto text-center text-xs text-ink-3">empty</p>}
            </div>
          ) : (
            <div className="flex min-h-[4.5rem] items-stretch gap-2">
              <span className="flex w-10 shrink-0 flex-col items-center justify-center text-center text-[0.65rem] font-semibold uppercase leading-tight tracking-wide text-ink-3">
                out
                <br />←
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap content-center items-center gap-1.5 rounded-xl border-y-2 border-[var(--line-strong)] px-1.5 py-2">
                {items.map((it, i) => (
                  <div
                    key={`${i}-${it}-${removed.length}`}
                    className={`flex min-h-10 items-center rounded-lg border px-3 py-1.5 text-sm ${i === 0 ? "border-transparent bg-primary font-semibold text-primary-ink" : "border-line bg-surface text-ink"} ${i === items.length - 1 && flash.kind === "add" ? "pop-in" : ""}`}
                  >
                    {it}
                  </div>
                ))}
                {items.length === 0 && <p className="w-full text-center text-xs text-ink-3">empty</p>}
              </div>
              <span className="flex w-10 shrink-0 flex-col items-center justify-center text-center text-[0.65rem] font-semibold uppercase leading-tight tracking-wide text-ink-3">
                in
                <br />←
              </span>
            </div>
          )}
          {!stack && items.length > 0 && <p className="mt-2 text-center text-[0.68rem] text-ink-3">Front: {items[0]} · back: {items[items.length - 1]}</p>}
        </div>

        <div className="rounded-xl border border-line bg-surface p-3">
          <Caption>{props.outLabel ?? "Came out, in order"}</Caption>
          {removed.length === 0 ? (
            <p className="text-xs text-ink-3">Nothing yet.</p>
          ) : (
            <ol className="grid gap-1">
              {removed.map((r, i) => (
                <li key={i} className={`flex items-center gap-2 text-sm text-ink ${i === removed.length - 1 && flash.kind === "remove" ? "pop-in" : ""}`}>
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-[0.65rem] text-ink-3">{i + 1}</span>
                  <span className="min-w-0 break-words">{r}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className={`mt-3 min-h-10 px-3 py-2 font-mono text-[0.8rem] ${CODE_SURFACE}`} aria-live="polite">
        {lastCode ? <CodeBlock code={lastCode} language="python" /> : <span className="text-white/40"># {stack ? `${name} = []` : `from collections import deque; ${name} = deque()`}</span>}
      </div>
    </div>
  );
}

export function checkStackQueue(state: unknown, goal: Record<string, unknown>) {
  const s = state as StackQueueState | undefined;
  if (!s) return false;
  const eq = (a: unknown, b: string[]) => Array.isArray(a) && a.length === b.length && a.every((v, i) => v === b[i]);
  if (Array.isArray(goal.removed) && !eq(goal.removed, s.removed)) return false;
  if (Array.isArray(goal.items) && !eq(goal.items, s.items)) return false;
  return Array.isArray(goal.removed) || Array.isArray(goal.items);
}
